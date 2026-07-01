#!/bin/sh
set -e

echo "Aguardando PostgreSQL..."
until pg_isready -h postgres -U postgres -d lavland > /dev/null 2>&1; do
  sleep 1
done

echo "Aplicando migrations..."
npx prisma migrate deploy

echo "Executando seed..."
npx prisma db seed || true

echo "Iniciando API..."
exec node dist/src/main.js
