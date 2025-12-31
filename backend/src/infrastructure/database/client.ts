import { PrismaClient } from './generated/index'
import pino from 'pino'

// Create logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' } 
    : undefined
})

// Global Prisma instance
let prisma: PrismaClient | null = null

/**
 * Initialize database connection with Prisma
 * Implements connection pooling and error handling
 */
export async function initializeDatabase(): Promise<PrismaClient> {
  if (prisma) {
    return prisma
  }

  try {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    // Prisma 7: Pass databaseUrl in constructor for direct connection
    prisma = new PrismaClient({
      datasourceUrl: databaseUrl,
      log: [
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
      errorFormat: 'pretty',
    })

    // Test the connection
    await prisma.$connect()
    
    logger.info('✅ Database connection established successfully')
    
    return prisma
  } catch (error) {
    logger.error({ error }, '❌ Failed to initialize database connection')
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get the Prisma client instance
 * Throws error if database hasn't been initialized
 */
export function getDatabase(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return prisma
}

/**
 * Close database connection gracefully
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
    logger.info('Database connection closed')
  }
}

/**
 * Health check for database connectivity
 */
export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
  try {
    const db = getDatabase()
    await db.$queryRaw`SELECT 1`
    return { status: 'healthy', message: 'Database connection is working' }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

// Graceful shutdown handler
process.on('beforeExit', async () => {
  await closeDatabaseConnection()
})

process.on('SIGINT', async () => {
  await closeDatabaseConnection()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeDatabaseConnection()
  process.exit(0)
})
