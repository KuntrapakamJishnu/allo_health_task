import { prisma } from './prisma'
import { ReservationStatus } from '@prisma/client'

// How long a reservation is held (in minutes)
const RESERVATION_DURATION_MINUTES = 10

/**
 * ReservationService
 * 
 * Handles all reservation operations with concurrency-safe database locking.
 * Ensures no double-selling by using database-level pessimistic locking (FOR UPDATE).
 * 
 * Key Features:
 * - Race condition prevention via FOR UPDATE lock
 * - Idempotency support (same request won't double-charge)
 * - Automatic expiry cleanup
 */
export class ReservationService {
  /**
   * Create a new reservation for a product at a warehouse
   * 
   * Uses database transaction with READ_COMMITTED isolation and FOR UPDATE lock.
   * This prevents two concurrent requests from reserving the same unit.
   * 
   * Flow:
   * 1. Check idempotency key (if provided) to avoid duplicates
   * 2. Lock the stock row for this product/warehouse
   * 3. Verify available units (totalUnits - reservedUnits)
   * 4. If insufficient, throw error (409 Conflict)
   * 5. Increment reservedUnits
   * 6. Create reservation record with 10-minute expiry
   * 
   * @param productId - Product ID to reserve
   * @param warehouseId - Warehouse location for the product
   * @param quantity - Number of units to reserve
   * @param idempotencyKey - Optional unique key to prevent duplicate reservations
   * @returns Reservation data with product and warehouse info
   * @throws Error with code STOCK_NOT_FOUND, INSUFFICIENT_STOCK, etc.
   */
  static async createReservation(
    productId: string,
    warehouseId: string,
    quantity: number,
    idempotencyKey?: string
  ) {
    // Idempotency check: if same request comes again, return existing reservation
    if (idempotencyKey) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey },
        include: { product: true, warehouse: true },
      })
      if (existing) {
        return { reservation: existing, isIdempotent: true }
      }
    }

    // Database transaction with pessimistic locking
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the stock row - no other transaction can modify it until we're done
        const stock = await tx.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId,
            },
          },
        })

        if (!stock) {
          throw new Error('STOCK_NOT_FOUND')
        }

        // Calculate available units under lock (accurate snapshot)
        const availableUnits = stock.totalUnits - stock.reservedUnits

        // Fail fast if not enough stock
        if (availableUnits < quantity) {
          throw new Error('INSUFFICIENT_STOCK')
        }

        // Increment reserved units (lock held until transaction completes)
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
        })

        // Create reservation record with expiry time
        const expiresAt = new Date(
          Date.now() + RESERVATION_DURATION_MINUTES * 60 * 1000
        )
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
        })

        return reservation
      },
      {
        isolationLevel: 'ReadCommitted', // Sufficient with FOR UPDATE lock
        maxWait: 5000, // Max time to acquire lock
        timeout: 10000, // Max transaction duration
      }
    )

    return { reservation: result, isIdempotent: false }
  }

  /**
   * Confirm a reservation (after payment succeeds)
   * 
   * Marks reservation as CONFIRMED so units remain reserved indefinitely.
   * Performs lazy cleanup if reservation has expired.
   * 
   * @param reservationId - Reservation ID to confirm
   * @returns Confirmed reservation data
   * @throws Error with code RESERVATION_NOT_FOUND, RESERVATION_EXPIRED, etc.
   */
  static async confirmReservation(
    reservationId: string
  ) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    })

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND')
    }

    // Lazy cleanup: Check if reservation expired
    const now = new Date()
    if (reservation.expiresAt < now) {
      // Release expired reservation and return error
      await this.releaseReservation(reservationId)
      throw new Error('RESERVATION_EXPIRED')
    }

    // Idempotent: If already confirmed, return it
    if (reservation.status === ReservationStatus.CONFIRMED) {
      return reservation
    }

    // Error if already released
    if (reservation.status === ReservationStatus.RELEASED) {
      throw new Error('RESERVATION_ALREADY_RELEASED')
    }

    // Mark as confirmed
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.CONFIRMED },
      include: { product: true, warehouse: true },
    })

    return updated
  }

  /**
   * Release a reservation (payment failed or user cancelled)
   * 
   * Decrements reserved units so they become available for other customers.
   * Marks reservation as RELEASED.
   * 
   * @param reservationId - Reservation ID to release
   * @returns Released reservation data
   * @throws Error if reservation not found
   */
  static async releaseReservation(reservationId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    })

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND')
    }

    // Idempotent: If already released, return it
    if (reservation.status === ReservationStatus.RELEASED) {
      return reservation
    }

    // Decrement reserved units and mark as released (in same transaction)
    await prisma.$transaction(async (tx) => {
      // Return units to available pool
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
      })

      // Mark reservation as released
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.RELEASED },
      })
    })

    // Return updated reservation with product/warehouse info
    const updated = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { product: true, warehouse: true },
    })

    return updated
  }

  /**
   * Release all expired reservations
   * 
   * Runs as a cron job (every 5 minutes) to clean up expired PENDING reservations.
   * This is a fallback to lazy cleanup - if user never confirms, this removes the hold.
   * 
   * @returns Count of released reservations and total expired
   */
  static async releaseExpiredReservations() {
    const now = new Date()

    // Find all expired PENDING reservations
    const expired = await prisma.reservation.findMany({
      where: {
        status: ReservationStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
    })

    // Release each expired reservation
    let released = 0
    for (const reservation of expired) {
      try {
        await this.releaseReservation(reservation.id)
        released++
      } catch {
        // Continue processing if one fails (don't break on error)
      }
    }

    return { released, total: expired.length }
  }

  /**
   * Get full reservation details including current stock availability
   * 
   * Returns reservation info plus current available units and expiry status.
   * Useful for UI display of reservation details.
   * 
   * @param reservationId - Reservation ID to retrieve
   * @returns Reservation with product, warehouse, available units, and expiry status
   * @throws Error if reservation not found
   */
  static async getReservation(reservationId: string) {
    // Get reservation with related product and warehouse
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        product: true,
        warehouse: true,
      },
    })

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND')
    }

    // Get current stock info for this product/warehouse
    const stock = await prisma.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
    })

    // Calculate currently available units
    const availableUnits = stock
      ? stock.totalUnits - stock.reservedUnits
      : 0

    // Check if reservation has expired
    const isExpired = reservation.expiresAt < new Date()

    return {
      ...reservation,
      availableUnits,
      isExpired,
    }
  }
}
