# ============================================================================
# iAssetsPro — Enterprise EAM Platform
# Multi-stage production build
# ============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

# Install bun
RUN npm install -g bun@latest

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY . .

# Build
RUN bun run build
RUN rm -rf src/app/.next

# Production image
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat dumb-init
ENV NODE_ENV=production

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next/standalone ./.next/standalone
COPY --from=base /app/public ./public
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package.json ./package.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["dumb-init", "node", "server.js"]
