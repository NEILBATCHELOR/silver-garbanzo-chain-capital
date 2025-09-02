#!/usr/bin/env tsx

// Minimal server test to isolate startup issues
import { config } from 'dotenv'
config()

console.log('🚀 Testing minimal server setup...')
console.log('Node version:', process.version)
console.log('Environment variables loaded:')
console.log('- PORT:', process.env.PORT)
console.log('- NODE_ENV:', process.env.NODE_ENV)
console.log('- DATABASE_URL length:', process.env.DATABASE_URL?.length || 0)

try {
  console.log('✅ Basic imports working')
  
  // Test Fastify import
  const Fastify = (await import('fastify')).default
  console.log('✅ Fastify imported successfully')
  
  // Create minimal app
  const app = Fastify({
    logger: {
      level: 'info'
    }
  })
  
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })
  
  console.log('✅ Fastify app created')
  
  const port = parseInt(process.env.PORT || '3001', 10)
  const host = process.env.HOST || '0.0.0.0'
  
  await app.listen({ port, host })
  
  console.log(`🎉 Minimal server started successfully on ${host}:${port}`)
  console.log(`🏥 Health check: http://${host}:${port}/health`)
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📴 Shutting down...')
    await app.close()
    process.exit(0)
  })
  
  process.on('SIGINT', async () => {
    console.log('📴 Shutting down...')
    await app.close()
    process.exit(0)
  })
  
} catch (error) {
  console.error('❌ Error starting minimal server:', error)
  if (error instanceof Error) {
    console.error('Stack:', error.stack)
  }
  process.exit(1)
}
