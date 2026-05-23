import { NextRequest, NextResponse } from 'next/server';
import { ReservationService } from '@/lib/reservation-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const reservation = await ReservationService.getReservation(id);
    return NextResponse.json(reservation);
  } catch (error: any) {
    if (error.message === 'RESERVATION_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservation' },
      { status: 500 }
    );
  }
}
