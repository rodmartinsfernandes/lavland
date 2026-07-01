FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl postgresql-client

COPY package*.json ./
RUN npm ci

COPY . .

ENV DATABASE_URL="postgresql://postgres:postgres@postgres:5432/lavland?schema=public"

RUN npx prisma generate && npm run build

COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
