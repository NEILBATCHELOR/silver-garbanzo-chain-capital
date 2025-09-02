#!/usr/bin/env tsx

// Detailed server test to find exact failure point
import { config } from 'dotenv'
config()

console.log('🚀 Starting detailed server test...')
console.log('📋 Environment check passed')

async function testDatabaseConnection() {
  try {
    console.log('🔌 Testing database connection...')
    const { initializeDatabase, checkDatabaseHealth } = await import('./src/infrastructure/database/client.js')
    
    console.log('✅ Database modules imported')
    
    await initializeDatabase()
    console.log('✅ Database initialized')
    
    const health = await checkDatabaseHealth()
    console.log('✅ Database health check:', health)
    
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

async function testServerBuild() {
  try {
    console.log('🏗️ Testing server build...')
    
    const Fastify = (await import('fastify')).default
    console.log('✅ Fastify imported')
    
    const app = Fastify({
      logger: {
        level: 'info'
      }
    })
    
    console.log('✅ Fastify app created')
    
    // Register basic plugin
    await app.register((await import('@fastify/helmet')).default)
    console.log('✅ Helmet registered')
    
    await app.register((await import('@fastify/cors')).default, {
      origin: true,
      credentials: true
    })
    console.log('✅ CORS registered')
    
    // Add health route
    app.get('/health', async () => ({ status: 'ok' }))
    console.log('✅ Health route added')
    
    return app
  } catch (error) {
    console.error('❌ Server build failed:', error)
    throw error
  }
}

async function main() {
  try {
    // Test database first
    const dbSuccess = await testDatabaseConnection()
    if (!dbSuccess) {
      console.log('⚠️ Database connection failed, but continuing...')
    }
    
    // Test server build
    const app = await testServerBuild()
    
    // Try to start server
    console.log('🌐 Starting server on port 3001...')
    await app.listen({ port: 3001, host: '0.0.0.0' })
    
    console.log('🎉 Server started successfully!')
    console.log('🏥 Health check: http://localhost:3001/health')
    
    // Setup graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`📴 Received ${signal}, shutting down...`)
      await app.close()
      process.exit(0)
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    
  } catch (error) {
    console.error('❌ Main process failed:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error)
  process.exit(1)
})

main()
