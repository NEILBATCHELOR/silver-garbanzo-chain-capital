/**
 * Simplified server for debugging startup issues
 */

import Fastify, { FastifyInstance } from 'fastify'
// import { initializeDatabase } from './infrastructure/database/client.js'

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || '0.0.0.0'
const NODE_ENV = process.env.NODE_ENV || 'development'

console.log('🚀 Starting Chain Capital Backend (Debug Mode)...')

/**
 * Build simplified Fastify application
 */
async function buildApp(): Promise<FastifyInstance> {
  console.log('🏗️ Building Fastify application...')
  
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

  console.log('✅ Fastify instance created')

  // Test core plugins one by one
  try {
    console.log('🔧 Registering core plugins...')
    
    await app.register(import('@fastify/cors'), {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    })
    console.log('✅ CORS registered')

    await app.register(import('@fastify/sensible'))
    console.log('✅ Sensible registered')

  } catch (error) {
    console.error('❌ Error registering core plugins:', error)
    throw error
  }

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV
    }
  })
  console.log('✅ Health check route registered')

  return app
}

/**
 * Start server
 */
async function start() {
  try {
    console.log('🚀 Starting server...')
    
    // Build Fastify app
    const app = await buildApp()
    console.log('✅ App built successfully')
    
    // Start server
    console.log(`🌐 Starting server on ${HOST}:${PORT}...`)
    await app.listen({ port: PORT, host: HOST })
    
    console.log('🎉 Server started successfully!')
    console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`)
    
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    console.error('Error stack:', error.stack)
    process.exit(1)
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}

export { buildApp, start }
export default start
