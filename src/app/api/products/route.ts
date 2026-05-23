import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
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
    const formattedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      sku: product.sku,
      stock: product.stock.map((s: any) => ({
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        warehouseCity: s.warehouse.city,
        totalUnits: s.totalUnits,
        reservedUnits: s.reservedUnits,
        availableUnits: s.totalUnits - s.reservedUnits,
      })),
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
