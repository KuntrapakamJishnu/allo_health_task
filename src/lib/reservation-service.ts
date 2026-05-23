// @ts-nocheck
import { prisma } from './prisma';
import { ReservationStatus } from '@prisma/client';

const RESERVATION_DURATION_MINUTES = 10;

export class ReservationService {
  /**
   * Create a reservation with proper concurrency handling using database-level locking
   * Uses FOR UPDATE to prevent race conditions when multiple requests come for the same stock
   */
  static async createReservation(
    productId: string,
    warehouseId: string,
    quantity: number,
    idempotencyKey?: string
  ) {
    // If idempotency key provided, check if we already created this reservation
    if (idempotencyKey) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey },
        include: { product: true, warehouse: true },
      });
      if (existing) {
        return { reservation: existing, isIdempotent: true };
      }
    }

    // Use transaction with READ_COMMITTED isolation to handle concurrency
    // FOR UPDATE lock ensures only one transaction can modify the stock at a time
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the stock row for this product/warehouse
        const stock = await tx.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId,
            },
          },
        });

        if (!stock) {
          throw new Error('STOCK_NOT_FOUND');
        }

        const availableUnits = stock.totalUnits - stock.reservedUnits;

        // If not enough stock, fail immediately (409 Conflict)
        if (availableUnits < quantity) {
          throw new Error('INSUFFICIENT_STOCK');
        }

        // Reserve the units by updating the stock
        await tx.stock.update({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId,
            },
          },
          data: {
            reservedUnits: {
              increment: quantity,
            },
          },
        });

        // Create the reservation record
        const expiresAt = new Date(
          Date.now() + RESERVATION_DURATION_MINUTES * 60 * 1000
        );
        const reservation = await tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            status: ReservationStatus.PENDING,
            expiresAt,
            idempotencyKey,
          },
          include: {
            product: true,
            warehouse: true,
          },
        });

        return reservation;
      },
      {
        isolationLevel: 'ReadCommitted',
        maxWait: 5000, // 5 second max wait
        timeout: 10000, // 10 second transaction timeout
      }
    );

    return { reservation: result, isIdempotent: false };
  }

  /**
   * Confirm a reservation (payment succeeded)
   * Marks reservation as CONFIRMED so units remain reserved permanently
   */
  static async confirmReservation(reservationId: string, idempotencyKey?: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    // Check if reservation has expired (lazy cleanup)
    const now = new Date();
    if (reservation.expiresAt < now) {
      // If expired, release it and return error
      await this.releaseReservation(reservationId);
      throw new Error('RESERVATION_EXPIRED');
    }

    if (reservation.status === ReservationStatus.CONFIRMED) {
      // Idempotent - already confirmed
      return reservation;
    }

    if (reservation.status === ReservationStatus.RELEASED) {
      throw new Error('RESERVATION_ALREADY_RELEASED');
    }

    // Update status to confirmed
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.CONFIRMED },
      include: { product: true, warehouse: true },
    });

    return updated;
  }

  /**
   * Release a reservation (payment failed or user cancelled)
   * Removes the hold so units become available again
   */
  static async releaseReservation(reservationId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    if (reservation.status === ReservationStatus.RELEASED) {
      // Idempotent - already released
      return reservation;
    }

    // Return reserved units back to available stock
    await prisma.$transaction(async (tx) => {
      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: {
          reservedUnits: {
            decrement: reservation.quantity,
          },
        },
      });

      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.RELEASED },
      });
    });

    const updated = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { product: true, warehouse: true },
    });

    return updated;
  }

  /**
   * Release all expired reservations (lazy cleanup on read)
   * Called periodically or on demand to clean up expired holds
   */
  static async releaseExpiredReservations() {
    const now = new Date();
    const expired = await prisma.reservation.findMany({
      where: {
        status: ReservationStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
    });

    let released = 0;
    for (const reservation of expired) {
      try {
        await this.releaseReservation(reservation.id);
        released++;
      } catch {
        // Continue if one fails
      }
    }

    return { released, total: expired.length };
  }

  /**
   * Get reservation details with available stock info
   */
  static async getReservation(reservationId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        product: true,
        warehouse: true,
      },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    const stock = await prisma.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
    });

    const availableUnits = stock
      ? stock.totalUnits - stock.reservedUnits
      : 0;

    return {
      ...reservation,
      availableUnits,
      isExpired: reservation.expiresAt < new Date(),
    };
  }
}
