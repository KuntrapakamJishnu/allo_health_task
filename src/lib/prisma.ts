// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const getClient = () => {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not set. Using in-memory adapter for development.');
    return new PrismaClient({
      log: ['error'],
    });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ['error'],
  });
};

export const prisma =
  globalForPrisma.prisma ||
  getClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
