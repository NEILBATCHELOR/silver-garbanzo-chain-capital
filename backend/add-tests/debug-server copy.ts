#!/usr/bin/env tsx

/**
 * Debug server startup step by step
 */

import { config } from 'dotenv'
config()

console.log('🔍 Debug: Loading environment variables...')
console.log('PORT:', process.env.PORT || '3001')
console.log('NODE_ENV:', process.env.NODE_ENV || 'development')

console.log('🔍 Debug: Importing Fastify...')
import Fastify from 'fastify'

console.log('🔍 Debug: Importing database client...')
import { initializeDatabase } from './src/infrastructure/database/client'

console.log('🔍 Debug: Importing logger...')
import { createLogger } from './src/utils/logger'

console.log('🔍 Debug: Creating logger instance...')
const logger = createLogger('DebugServer')

try {
  console.log('🔍 Debug: Creating Fastify instance...')
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname'
        }
      }
    }
  })

  console.log('🔍 Debug: Initializing database...')
  await initializeDatabase()
  console.log('✅ Database initialized successfully')

  console.log('🔍 Debug: Starting server...')
  const PORT = 3001
  await app.listen({ port: PORT, host: '0.0.0.0' })
  
  console.log(`🎉 Debug server running on http://localhost:${PORT}`)
  
  // Keep server running
  process.on('SIGINT', async () => {
    console.log('📴 Shutting down...')
    await app.close()
    process.exit(0)
  })

} catch (error) {
  console.error('❌ Server startup failed:', error)
  console.error('Stack:', error.stack)
  process.exit(1)
}
