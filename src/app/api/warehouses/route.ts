import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const mockWarehouses = [
  { id: 'clp0000000000000000000001', name: 'New York', city: 'New York' },
  { id: 'clp0000000000000000000002', name: 'Los Angeles', city: 'Los Angeles' },
  { id: 'clp0000000000000000000003', name: 'Chicago', city: 'Chicago' },
];

export async function GET() {
  try {
    try {
      const warehouses = await prisma.warehouse.findMany({
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(warehouses);
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
      // If database connection fails, use mock data for development
      console.warn('Database connection failed, using mock data:', errorMessage);
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
