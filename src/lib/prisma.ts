import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const { Pool } = pg;

// Set Node environment to ignore self-signed certificates
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const caPath = process.env.PGSQL_ATTR_SSL_CA || 'ca/ca.pem';
  const absoluteCaPath = path.resolve(process.cwd(), caPath);

  let poolConfig: any = {
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  };

  if (fs.existsSync(absoluteCaPath)) {
    const ca = fs.readFileSync(absoluteCaPath).toString();
    poolConfig.ssl.ca = ca;
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
