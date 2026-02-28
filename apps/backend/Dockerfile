FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Build shared package first
RUN pnpm --filter @taskflow/shared build

# Build backend
RUN pnpm --filter @taskflow/backend build

# Generate Prisma client
RUN pnpm --filter @taskflow/backend db:generate

# ── Production image ──────────────────────────────────────────
FROM node:20-alpine AS production
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/apps/backend/dist ./apps/backend/dist
COPY --from=base /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/backend

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]