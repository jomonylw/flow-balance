import { PrismaClient } from '@prisma/client'

// Declare a global variable to cache the PrismaClient instance
// This prevents creating multiple PrismaClient instances during development hot-reloading
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Create and export the singleton PrismaClient
// If it already exists in the global variable, use it
// Otherwise, create a new instance
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // In production, only log errors to keep logs clean
    log:
      process.env.NODE_ENV === 'production'
        ? ['error']
        : ['query', 'info', 'warn', 'error'],
  })

// In non-production environments, assign the created instance to the global variable
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
