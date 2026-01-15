import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const { Pool } = pg;

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Check if this is a local connection (localhost or 127.0.0.1)
  const isLocalConnection = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const poolConfig: pg.PoolConfig = {
    connectionString,
  };

  // Only use SSL for remote connections
  if (!isLocalConnection) {
    const caPath = process.env.PGSQL_ATTR_SSL_CA || 'ca/ca.pem';
    const absoluteCaPath = path.resolve(process.cwd(), caPath);

    poolConfig.ssl = {
      rejectUnauthorized: false,
    };

    if (fs.existsSync(absoluteCaPath)) {
      const ca = fs.readFileSync(absoluteCaPath).toString();
      (poolConfig.ssl as any).ca = ca;
    }
  }

  const pool = new Pool(poolConfig);
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | PrismaClient;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
