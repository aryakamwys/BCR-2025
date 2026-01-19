#!/bin/sh
set -e

echo "Running database migrations"
echo "DATABASE_URL: ${DATABASE_URL}"
npx prisma db push --url "${DATABASE_URL}"

echo "Starting server"
exec npx tsx server.ts
