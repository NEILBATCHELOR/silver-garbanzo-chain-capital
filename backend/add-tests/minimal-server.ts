/**
 * Minimal Chain Capital Backend - Development Server
 */

// Load environment variables first
import { config } from 'dotenv'
config()

import Fastify, { FastifyInstance } from 'fastify'

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || '0.0.0.0'
const NODE_ENV = process.env.NODE_ENV || 'development'

console.log('🚀 Starting Chain Capital Backend (Minimal)...')
console.log(`Environment: ${NODE_ENV}`)
console.log(`Port: ${PORT}`)
console.log(`Host: ${HOST}`)

/**
 * Build minimal Fastify application
 */
async function buildApp(): Promise<FastifyInstance> {
  console.log('🏗️ Building minimal Fastify application...')
  
  const app = Fastify({
    logger: {
      level: 'info'
    }
  })

  console.log('✅ Fastify instance created')

  // Register basic CORS
  try {
    await app.register(import('@fastify/cors'), {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    })
    console.log('✅ CORS registered')
  } catch (error) {
    console.error('❌ CORS registration failed:', error)
    throw error
  }

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      uptime: Math.floor(process.uptime())
    }
  })
  console.log('✅ Health check route registered')

  // Simple API route
  app.get('/api/v1/status', async (request, reply) => {
    return {
      service: 'Chain Capital Backend',
      status: 'operational',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  })
  console.log('✅ Status route registered')

  console.log('✅ Minimal app built successfully')
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
    
    // Start server
    console.log(`🌐 Starting server on ${HOST}:${PORT}...`)
    await app.listen({ port: PORT, host: HOST })
    
    // Success messages
    console.log('🎉 Server started successfully!')
    console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`)
    console.log(`📊 Status: http://${HOST}:${PORT}/api/v1/status`)
    
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
