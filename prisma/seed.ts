import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Warehouses
  console.log('Creating warehouses...');
  const nyWarehouse = await prisma.warehouse.upsert({
    where: { name: 'NYC Central' },
    update: {},
    create: {
      name: 'NYC Central',
      city: 'New York',
    },
  });

  const laWarehouse = await prisma.warehouse.upsert({
    where: { name: 'LA Distribution' },
    update: {},
    create: {
      name: 'LA Distribution',
      city: 'Los Angeles',
    },
  });

  const chicagoWarehouse = await prisma.warehouse.upsert({
    where: { name: 'Chicago Hub' },
    update: {},
    create: {
      name: 'Chicago Hub',
      city: 'Chicago',
    },
  });

  console.log(`✅ Created ${3} warehouses`);

  // Create Products
  console.log('Creating products...');
  const laptop = await prisma.product.upsert({
    where: { sku: 'LAPTOP-001' },
    update: {},
    create: {
      name: 'Pro Laptop 15"',
      description: 'High-performance laptop with 16GB RAM',
      price: 1299.99,
      sku: 'LAPTOP-001',
    },
  });

  const phone = await prisma.product.upsert({
    where: { sku: 'PHONE-001' },
    update: {},
    create: {
      name: 'Smartphone X',
      description: 'Latest flagship smartphone',
      price: 899.99,
      sku: 'PHONE-001',
    },
  });

  const tablet = await prisma.product.upsert({
    where: { sku: 'TABLET-001' },
    update: {},
    create: {
      name: 'Tablet Pro',
      description: '12-inch display, powerful processor',
      price: 649.99,
      sku: 'TABLET-001',
    },
  });

  const headphones = await prisma.product.upsert({
    where: { sku: 'HEADPHONES-001' },
    update: {},
    create: {
      name: 'Wireless Headphones',
      description: 'Noise-cancelling, 30-hour battery',
      price: 299.99,
      sku: 'HEADPHONES-001',
    },
  });

  console.log(`✅ Created ${4} products`);

  // Create Stock Records
  console.log('Creating stock records...');

  const stockData = [
    // Laptop stock
    { productId: laptop.id, warehouseId: nyWarehouse.id, total: 50 },
    { productId: laptop.id, warehouseId: laWarehouse.id, total: 30 },
    { productId: laptop.id, warehouseId: chicagoWarehouse.id, total: 25 },

    // Phone stock
    { productId: phone.id, warehouseId: nyWarehouse.id, total: 100 },
    { productId: phone.id, warehouseId: laWarehouse.id, total: 80 },
    { productId: phone.id, warehouseId: chicagoWarehouse.id, total: 60 },

    // Tablet stock
    { productId: tablet.id, warehouseId: nyWarehouse.id, total: 40 },
    { productId: tablet.id, warehouseId: laWarehouse.id, total: 50 },
    { productId: tablet.id, warehouseId: chicagoWarehouse.id, total: 35 },

    // Headphones stock
    { productId: headphones.id, warehouseId: nyWarehouse.id, total: 150 },
    { productId: headphones.id, warehouseId: laWarehouse.id, total: 120 },
    { productId: headphones.id, warehouseId: chicagoWarehouse.id, total: 100 },
  ];

  for (const data of stockData) {
    await prisma.stock.upsert({
      where: {
        productId_warehouseId: {
          productId: data.productId,
          warehouseId: data.warehouseId,
        },
      },
      update: {
        totalUnits: data.total,
      },
      create: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        totalUnits: data.total,
        reservedUnits: 0,
      },
    });
  }

  console.log(`✅ Created ${stockData.length} stock records`);

  console.log('✨ Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
