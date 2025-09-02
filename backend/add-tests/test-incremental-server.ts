#!/usr/bin/env tsx

// Test server with incremental route loading
import { config } from 'dotenv'
config()

import Fastify from 'fastify'
import { initializeDatabase } from './src/infrastructure/database/client.js'
import { createLogger } from './src/utils/logger.js'

const logger = createLogger('TestServer')
const PORT = 3001

async function buildApp() {
  const app = Fastify({
    logger: {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l'
        }
      }
    }
  })

  // Register basic plugins
  await app.register((await import('@fastify/helmet')).default)
  await app.register((await import('@fastify/cors')).default, {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  })
  await app.register((await import('@fastify/sensible')).default)

  // JWT
  await app.register((await import('@fastify/jwt')).default, {
    secret: process.env.JWT_SECRET || 'dev-secret'
  })

  // Health check
  app.get('/health', async () => ({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  }))

  // Try to load routes one by one
  try {
    logger.info('📦 Loading projects routes...')
    const projectRoutes = await import('./src/routes/projects.js')
    await app.register(projectRoutes.default, { prefix: '/api/v1' })
    logger.info('✅ Projects routes loaded')
  } catch (error) {
    logger.error('❌ Failed to load projects routes:', error)
  }

  try {
    logger.info('📦 Loading investors routes...')
    const investorRoutes = await import('./src/routes/investors.js')
    await app.register(investorRoutes.default, { prefix: '/api/v1' })
    logger.info('✅ Investors routes loaded')
  } catch (error) {
    logger.error('❌ Failed to load investors routes:', error)
  }

  try {
    logger.info('📦 Loading auth routes...')
    const authRoutes = await import('./src/routes/auth/index.js')
    await app.register(authRoutes.default, { prefix: '/api/v1' })
    logger.info('✅ Auth routes loaded')
  } catch (error) {
    logger.error('❌ Failed to load auth routes:', error)
  }

  return app
}

async function start() {
  try {
    logger.info('🚀 Starting test server...')
    
    await initializeDatabase()
    logger.info('✅ Database initialized')

    const app = await buildApp()
    logger.info('✅ App built')

    await app.listen({ port: PORT, host: '0.0.0.0' })
    logger.info(`🎉 Server running on http://0.0.0.0:${PORT}`)
    logger.info(`🏥 Health: http://localhost:${PORT}/health`)

  } catch (error) {
    logger.error('❌ Server failed to start:', error)
    if (error instanceof Error) {
      logger.error('Error message:', error.message)
      logger.error('Error stack:', error.stack)
    }
    logger.error('Error details:', JSON.stringify(error, null, 2))
    process.exit(1)
  }
}

start()
