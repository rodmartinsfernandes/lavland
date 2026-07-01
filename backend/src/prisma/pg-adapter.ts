import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';

function createPoolConfig(connectionString: string): PoolConfig {
  const requiresSsl =
    process.env.NODE_ENV === 'production' ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('render.com');

  return {
    connectionString,
    ...(requiresSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export function createPrismaPgAdapter(connectionString: string) {
  const pool = new Pool(createPoolConfig(connectionString));
  return new PrismaPg(pool);
}
