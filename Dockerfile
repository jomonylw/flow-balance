# Flow Balance - Personal Finance Management System
# Multi-stage Docker build for production deployment

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile --production=false

# Generate Prisma client
RUN pnpm db:generate

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client (ensure it exists)
RUN pnpm db:generate

# Build the application
RUN pnpm build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Install pnpm and necessary packages
RUN npm install -g pnpm
RUN apk add --no-cache dumb-init netcat-openbsd bash

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# Copy Prisma generated files (create directory if it doesn't exist)
RUN mkdir -p ./node_modules/.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy package.json and scripts
COPY --from=builder /app/package.json ./package.json
COPY scripts/docker-entrypoint.sh ./scripts/
COPY healthcheck.js ./

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Set script permissions
RUN chmod +x ./scripts/docker-entrypoint.sh

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Use entrypoint script
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]

# Start the application
CMD ["dumb-init", "node", "server.js"]
