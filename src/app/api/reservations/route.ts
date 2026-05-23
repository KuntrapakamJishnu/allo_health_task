import { NextRequest, NextResponse } from 'next/server';
import { CreateReservationSchema } from '@/lib/validation';
import { ReservationService } from '@/lib/reservation-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const parsed = CreateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity, idempotencyKey } = parsed.data;

    try {
      const { reservation, isIdempotent } = await ReservationService.createReservation(
        productId,
        warehouseId,
        quantity,
        idempotencyKey
      );

      return NextResponse.json(reservation, {
        status: 201,
        headers: isIdempotent ? { 'X-Idempotent': 'true' } : {},
      });
    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_STOCK') {
        return NextResponse.json(
          {
            error: 'Insufficient stock available',
            code: 'INSUFFICIENT_STOCK',
          },
          { status: 409 }
        );
      }
      if (error.message === 'STOCK_NOT_FOUND') {
        return NextResponse.json(
          {
            error: 'Product or warehouse not found',
            code: 'NOT_FOUND',
          },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}
