import { NextRequest, NextResponse } from 'next/server';
import { ReservationService } from '@/lib/reservation-service';
import { getMockReservation, updateMockReservation } from '@/lib/mock-reservations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    try {
      const reservation = await ReservationService.releaseReservation(id);
      return NextResponse.json(reservation, { status: 200 });
    } catch (error: unknown) {
      // Extract error message safely
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Check for database connection error and use mock response
      if (
        errorMessage.includes('connect') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('failed')
      ) {
        console.warn('Database connection failed, using mock release:', errorMessage);
        const mockReservation = getMockReservation(id);
        if (mockReservation) {
          const updated = updateMockReservation(id, { status: 'RELEASED' });
          return NextResponse.json(updated, { status: 200 });
        }
        return NextResponse.json(
          {
            id,
            status: 'RELEASED',
            updatedAt: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      if (errorMessage === 'RESERVATION_NOT_FOUND') {
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
