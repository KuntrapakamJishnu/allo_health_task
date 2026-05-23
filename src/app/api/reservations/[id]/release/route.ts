import { NextRequest, NextResponse } from 'next/server';
import { ReservationService } from '@/lib/reservation-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    try {
      const reservation = await ReservationService.releaseReservation(id);
      return NextResponse.json(reservation, { status: 200 });
    } catch (error: any) {
      if (error.message === 'RESERVATION_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Reservation not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error releasing reservation:', error);
    return NextResponse.json(
      { error: 'Failed to release reservation' },
      { status: 500 }
    );
  }
}
