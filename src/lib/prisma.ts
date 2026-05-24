/**
 * Prisma Client Configuration
 * 
 * Initializes the Prisma client with proper connection pooling.
 * - Uses @prisma/adapter-pg for PostgreSQL connections
 * - Pools connections via the 'pg' library
 * - Logs only errors (not all queries) to reduce noise
 * - Ensures singleton pattern in development (prevents connection leaks)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = global as typeof globalThis & {
  prisma: PrismaClient | undefined;
};

/**
 * Create or reuse Prisma client with connection pool
 */
const getClient = () => {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not set. Using Prisma without adapter for development.');
    return new PrismaClient({
      log: ['error'],
    });
  }

  // Create connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  // Use PostgreSQL adapter with connection pool
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ['error'],
  });
};

/**
 * Export singleton Prisma instance
 * Reuses connection in development to prevent exhaustion
 */
export const prisma =
  globalForPrisma.prisma ||
  getClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
