// Load environment variables first
import { config } from 'dotenv'
config()

console.log('🔧 Environment loaded, testing imports...')

try {
  console.log('📦 Testing Fastify import...')
  const { default: Fastify } = await import('fastify')
  console.log('✅ Fastify imported successfully')

  console.log('📦 Testing database client import...')
  const { initializeDatabase } = await import('./src/infrastructure/database/client.js')
  console.log('✅ Database client imported successfully')

  console.log('📦 Testing logger import...')
  const { createLogger } = await import('./src/utils/logger.js')
  console.log('✅ Logger imported successfully')

  console.log('🚀 Starting server test...')
  const app = Fastify({
    logger: true
  })

  app.get('/health', async () => ({ status: 'ok' }))

  const PORT = parseInt(process.env.PORT || '3001', 10)
  const HOST = process.env.HOST || '0.0.0.0'

  console.log(`🌐 Starting on ${HOST}:${PORT}...`)
  await app.listen({ port: PORT, host: HOST })
  
  console.log('✅ Server started successfully!')
  
} catch (error) {
  console.error('❌ Server test failed:', error)
  console.error('Error stack:', error.stack)
  process.exit(1)
}
