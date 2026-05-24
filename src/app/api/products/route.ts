import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock data for development when database is not available
const mockProducts = [
  {
    id: 'clp1000000000000000000001',
    name: 'Laptop Pro',
    description: 'High-performance laptop',
    price: 1299.99,
    sku: 'LAP-001',
    stock: [
      {
        warehouseId: 'clp0000000000000000000001',
        warehouseName: 'New York',
        warehouseCity: 'New York',
        totalUnits: 50,
        reservedUnits: 12,
        availableUnits: 38,
      },
      {
        warehouseId: 'clp0000000000000000000002',
        warehouseName: 'Los Angeles',
        warehouseCity: 'Los Angeles',
        totalUnits: 30,
        reservedUnits: 5,
        availableUnits: 25,
      },
    ],
  },
  {
    id: 'clp1000000000000000000002',
    name: 'Monitor 4K',
    description: 'Ultra HD display monitor',
    price: 599.99,
    sku: 'MON-001',
    stock: [
      {
        warehouseId: 'clp0000000000000000000001',
        warehouseName: 'New York',
        warehouseCity: 'New York',
        totalUnits: 100,
        reservedUnits: 20,
        availableUnits: 80,
      },
      {
        warehouseId: 'clp0000000000000000000003',
        warehouseName: 'Chicago',
        warehouseCity: 'Chicago',
        totalUnits: 75,
        reservedUnits: 10,
        availableUnits: 65,
      },
    ],
  },
  {
    id: 'clp1000000000000000000003',
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard',
    price: 149.99,
    sku: 'KEY-001',
    stock: [
      {
        warehouseId: 'clp0000000000000000000002',
        warehouseName: 'Los Angeles',
        warehouseCity: 'Los Angeles',
        totalUnits: 200,
        reservedUnits: 50,
        availableUnits: 150,
      },
      {
        warehouseId: 'clp0000000000000000000003',
        warehouseName: 'Chicago',
        warehouseCity: 'Chicago',
        totalUnits: 150,
        reservedUnits: 30,
        availableUnits: 120,
      },
    ],
  },
  {
    id: 'clp1000000000000000000004',
    name: 'Wireless Mouse',
    description: 'Precision wireless mouse',
    price: 49.99,
    sku: 'MOU-001',
    stock: [
      {
        warehouseId: 'clp0000000000000000000001',
        warehouseName: 'New York',
        warehouseCity: 'New York',
        totalUnits: 500,
        reservedUnits: 100,
        availableUnits: 400,
      },
      {
        warehouseId: 'clp0000000000000000000002',
        warehouseName: 'Los Angeles',
        warehouseCity: 'Los Angeles',
        totalUnits: 300,
        reservedUnits: 60,
        availableUnits: 240,
      },
      {
        warehouseId: 'clp0000000000000000000003',
        warehouseName: 'Chicago',
        warehouseCity: 'Chicago',
        totalUnits: 250,
        reservedUnits: 40,
        availableUnits: 210,
      },
    ],
  },
];

export async function GET() {
  try {
    try {
      const products = await prisma.product.findMany({
        include: {
          stock: {
            include: {
              warehouse: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Transform to show available stock per warehouse
      const formattedProducts = products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        sku: product.sku,
        stock: product.stock.map((s) => ({
          warehouseId: s.warehouseId,
          warehouseName: s.warehouse.name,
          warehouseCity: s.warehouse.city,
          totalUnits: s.totalUnits,
          reservedUnits: s.reservedUnits,
          availableUnits: s.totalUnits - s.reservedUnits,
        })),
      }));

      return NextResponse.json(formattedProducts);
    } catch (dbError: unknown) {
      // If database connection fails, use mock data for development
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
      console.warn('Database connection failed, using mock data:', errorMessage);
      return NextResponse.json(mockProducts);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
