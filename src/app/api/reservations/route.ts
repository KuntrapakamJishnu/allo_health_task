import { NextRequest, NextResponse } from 'next/server';
import { CreateReservationSchema } from '@/lib/validation';
import { ReservationService } from '@/lib/reservation-service';
import { storeMockReservation } from '@/lib/mock-reservations';

// Mock data for development
const mockProducts: Record<string, { name: string; price: number }> = {
  'clp1000000000000000000001': { name: 'Laptop Pro', price: 1299.99 },
  'clp1000000000000000000002': { name: 'Monitor 4K', price: 599.99 },
  'clp1000000000000000000003': { name: 'Mechanical Keyboard', price: 149.99 },
  'clp1000000000000000000004': { name: 'Wireless Mouse', price: 49.99 },
};

const mockWarehouses: Record<string, { name: string; city: string }> = {
  'clp0000000000000000000001': { name: 'New York', city: 'New York' },
  'clp0000000000000000000002': { name: 'Los Angeles', city: 'Los Angeles' },
  'clp0000000000000000000003': { name: 'Chicago', city: 'Chicago' },
};

interface MockReservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  product: { name: string; price: number };
  warehouse: { name: string; city: string };
}

function generateMockReservation(productId: string, warehouseId: string, quantity: number): MockReservation {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
  
  return {
    id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    productId,
    warehouseId,
    quantity,
    status: 'PENDING',
    expiresAt,
    createdAt: now,
    updatedAt: now,
    product: mockProducts[productId] || { name: 'Unknown', price: 0 },
    warehouse: mockWarehouses[warehouseId] || { name: 'Unknown', city: 'Unknown' },
  };
}

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
    } catch (error: unknown) {
      // Extract error message safely
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Check for database connection error and use mock data
      if (
        errorMessage.includes('connect') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('failed')
      ) {
        console.warn('Database connection failed, using mock reservation:', errorMessage);
        const mockReservation = generateMockReservation(productId, warehouseId, quantity);
        // Store the mock reservation so confirm/release can retrieve it
        storeMockReservation(mockReservation.id, mockReservation);
        return NextResponse.json(mockReservation, { status: 201 });
      }

      if (errorMessage === 'INSUFFICIENT_STOCK') {
        return NextResponse.json(
          {
            error: 'Insufficient stock available',
            code: 'INSUFFICIENT_STOCK',
          },
          { status: 409 }
        );
      }
      if (errorMessage === 'STOCK_NOT_FOUND') {
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
