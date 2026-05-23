import { NextRequest, NextResponse } from 'next/server';
import { ReservationService } from '@/lib/reservation-service';

// This endpoint is called by Vercel Cron to clean up expired reservations
// Configure in vercel.json to run every 5 minutes

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await ReservationService.releaseExpiredReservations();
    return NextResponse.json({
      success: true,
      message: `Released ${result.released} out of ${result.total} expired reservations`,
      ...result,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Failed to release expired reservations' },
      { status: 500 }
    );
  }
}
