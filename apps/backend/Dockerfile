# syntax=docker/dockerfile:1.7

# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack (matches the workspace package manager)
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
RUN pnpm install --filter backend... --frozen-lockfile=false

# Copy source + Prisma schema
COPY apps/backend/ apps/backend/
COPY tsconfig.base.json ./

# Generate Prisma Client + compile TypeScript
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter backend run build

# Strip dev deps for the runtime stage
RUN pnpm --filter backend prune --prod

# ---- runner ----
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Run as non-root
RUN addgroup -g 1001 nodejs && adduser -S -G nodejs -u 1001 nestjs
RUN apk add --no-cache openssl curl

COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./package.json

USER nestjs
EXPOSE 3000

# Run pending migrations before booting the server.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
