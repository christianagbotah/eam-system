# ============================================================================
# iAssetsPro EAM Platform — Production Multi-Stage Dockerfile
# Built with Bun runtime for optimal performance
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Dependencies
# ---------------------------------------------------------------------------
FROM oven/bun:1 AS deps

WORKDIR /app

# Copy dependency manifests first (leverages Docker layer caching)
COPY package.json bun.lock ./

# Install ALL dependencies (including devDependencies needed for build)
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Build
# ---------------------------------------------------------------------------
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy dependency manifests and node_modules from deps stage
COPY package.json bun.lock ./
COPY --from=deps /app/node_modules ./node_modules

# Copy prisma schema and generate Prisma client
COPY prisma/ ./prisma/
RUN bunx prisma generate

# Copy source code
COPY . .

# Build Next.js standalone output
# build:local runs: prisma generate -> next build -> copy static & public assets
RUN bun run build:local

# ---------------------------------------------------------------------------
# Stage 3: Production Runtime
# ---------------------------------------------------------------------------
FROM oven/bun:1 AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

# Copy standalone Next.js output from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static    ./.next/static
COPY --from=builder /app/public          ./public

# Copy Prisma schema for potential runtime migrations
COPY --from=builder /app/prisma          ./prisma

# Copy necessary runtime Prisma engine files
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/node_modules/@prisma/adapter-mariadb ./node_modules/@prisma/adapter-mariadb
COPY --from=builder /app/node_modules/mariadb ./node_modules/mariadb

# Copy package.json for script references
COPY --from=builder /app/package.json ./package.json

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 3000

# Health check — verify the application is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application with Bun
CMD ["bun", "run", ".next/standalone/server.js"]
