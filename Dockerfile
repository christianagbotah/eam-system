# ============================================================================
# Multi-stage Dockerfile for Google Cloud Run deployment
# Builds the EAM (iAssetsPro) Next.js application
# ============================================================================

# ---- Stage 1: Install dependencies ----
FROM node:20-slim AS deps
WORKDIR /app

# Copy lock files first for better caching
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install all dependencies (including dev for build)
RUN npm install --legacy-peer-deps

# Generate Prisma Client (needs native binaries for debian-openssl-3.0.x)
RUN npx prisma generate

# ---- Stage 2: Build Next.js ----
FROM deps AS builder
WORKDIR /app

# Copy source code
COPY . .

# Build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js app (standalone output)
RUN npx next build

# Copy runtime-only dependencies into standalone output
# These are not auto-traced by Next.js because they're loaded dynamically by Prisma
RUN cp -r node_modules/.prisma/client .next/standalone/node_modules/.prisma/client && \
    cp -r node_modules/@prisma/adapter-mariadb .next/standalone/node_modules/@prisma/adapter-mariadb && \
    cp -r node_modules/mariadb .next/standalone/node_modules/mariadb && \
    cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# ---- Stage 3: Minimal production image ----
FROM node:20-slim AS runner
WORKDIR /app

# Production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Create non-root user for security (Cloud Run best practice)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder /app/.next/standalone ./

# Copy Cloud Run entry point wrapper
COPY --from=builder /app/entrypoint.js ./

# Set proper ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the Cloud Run port
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "const http = require('http'); const req = http.get('http://localhost:8080/api/route', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1));" || exit 1

# Start the server via our Cloud Run entry point
CMD ["node", "entrypoint.js"]
