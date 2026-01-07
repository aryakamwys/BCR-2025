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

  let poolConfig: any = {
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  };

  // Try to get CA certificate from environment variable first (for Railway)
  if (process.env.DATABASE_CA_CERT) {
    poolConfig.ssl.ca = process.env.DATABASE_CA_CERT;
  }
  // Then try to read from file (for local development)
  else {
    const caPath = process.env.PGSQL_ATTR_SSL_CA || 'ca/ca.pem';
    const absoluteCaPath = path.resolve(process.cwd(), caPath);

    if (fs.existsSync(absoluteCaPath)) {
      const ca = fs.readFileSync(absoluteCaPath).toString();
      poolConfig.ssl.ca = ca;
    }
  }

  const pool = new Pool(poolConfig);
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
