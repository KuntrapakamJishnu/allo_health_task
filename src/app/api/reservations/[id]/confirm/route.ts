import { NextRequest, NextResponse } from 'next/server';
import { ReservationService } from '@/lib/reservation-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const idempotencyKey = body.idempotencyKey;

    try {
      const reservation = await ReservationService.confirmReservation(
        id,
        idempotencyKey
      );
      return NextResponse.json(reservation, { status: 200 });
    } catch (error: any) {
      if (error.message === 'RESERVATION_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Reservation not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      if (error.message === 'RESERVATION_EXPIRED') {
        return NextResponse.json(
          {
            error: 'Reservation has expired',
            code: 'RESERVATION_EXPIRED',
          },
          { status: 410 }
        );
      }
      if (error.message === 'RESERVATION_ALREADY_RELEASED') {
        return NextResponse.json(
          {
            error: 'Reservation has been released',
            code: 'RESERVATION_RELEASED',
          },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error confirming reservation:', error);
    return NextResponse.json(
      { error: 'Failed to confirm reservation' },
      { status: 500 }
    );
  }
}
