import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const mockWarehouses = [
  { id: 'ware1', name: 'New York', city: 'New York' },
  { id: 'ware2', name: 'Los Angeles', city: 'Los Angeles' },
  { id: 'ware3', name: 'Chicago', city: 'Chicago' },
];

export async function GET() {
  try {
    try {
      const warehouses = await prisma.warehouse.findMany({
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(warehouses);
    } catch (dbError: any) {
      // If database connection fails, use mock data for development
      console.warn('Database connection failed, using mock data:', dbError.message);
      return NextResponse.json(mockWarehouses);
    }
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}
