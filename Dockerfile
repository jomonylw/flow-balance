# Flow Balance - Personal Finance Management System
# Multi-stage Docker build for production deployment

# Define build platform arguments
ARG BUILDPLATFORM
ARG TARGETPLATFORM

# Stage 1: Dependencies
FROM --platform=$BUILDPLATFORM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile --production=false

# Generate Prisma client (默认使用 SQLite schema)
RUN pnpm db:generate

# Stage 2: Builder
FROM --platform=$BUILDPLATFORM node:18-alpine AS builder
WORKDIR /app

# Accept build arguments for version information
ARG BUILD_DATE
ARG GIT_COMMIT
ARG APP_VERSION

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
# 设置构建时的默认数据库 URL，避免 Prisma 客户端初始化错误
ENV DATABASE_URL="file:/tmp/build.db"
# Pass build arguments as environment variables for Next.js build
ENV NEXT_PUBLIC_BUILD_DATE=${BUILD_DATE}
ENV NEXT_PUBLIC_GIT_COMMIT=${GIT_COMMIT}
ENV NEXT_PUBLIC_APP_VERSION=${APP_VERSION}

# Generate Prisma client (默认使用 SQLite，运行时会根据 DATABASE_URL 动态切换)
RUN pnpm db:generate

# Verify Prisma client location for debugging
RUN echo "Prisma client locations:" && \
    find node_modules -path "*/@prisma/client*" -type d | head -3 || \
    echo "No Prisma client found in expected locations"

# 验证环境变量
RUN echo "Build environment check:" && \
    echo "NODE_ENV: $NODE_ENV" && \
    echo "DATABASE_URL: $DATABASE_URL" && \
    echo "NEXT_TELEMETRY_DISABLED: $NEXT_TELEMETRY_DISABLED"

# 验证 Prisma 客户端可以正常导入
RUN echo "Testing Prisma client import..." && \
    node -e "try { const { PrismaClient } = require('@prisma/client'); console.log('✅ Prisma client import successful'); } catch(e) { console.error('❌ Prisma client import failed:', e.message); process.exit(1); }"

# Build the application
RUN pnpm build

# Stage 3: Runner
FROM --platform=$TARGETPLATFORM node:18-alpine AS runner
WORKDIR /app

# Accept build arguments for version information
ARG BUILD_DATE
ARG GIT_COMMIT
ARG APP_VERSION

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
# Copy package files and scripts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY scripts/docker-entrypoint.sh ./scripts/
COPY healthcheck.js ./

# Install Prisma CLI globally using npm (more reliable than pnpm global)
RUN npm install -g prisma @prisma/client && \
    npm cache clean --force

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
# 标记这是 Docker 环境，用于智能配置检测
ENV DOCKER_CONTAINER=true
# 设置默认的数据库 URL（如果用户没有提供）
ENV DATABASE_URL="file:/app/data/flow-balance.db"
# Set version information from build arguments
ENV NEXT_PUBLIC_BUILD_DATE=${BUILD_DATE}
ENV NEXT_PUBLIC_GIT_COMMIT=${GIT_COMMIT}
ENV NEXT_PUBLIC_APP_VERSION=${APP_VERSION}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Use entrypoint script
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]

# Start the application
CMD ["dumb-init", "node", "server.js"]
