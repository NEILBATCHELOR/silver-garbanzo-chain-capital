// Simple debug script to test server startup
console.log('🔍 Starting debug test...')

// Load environment variables
import { config } from 'dotenv'
config()

console.log('✅ dotenv loaded')
console.log('📊 PORT:', process.env.PORT)
console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? 'configured' : 'missing')

// Test basic imports
try {
  console.log('📦 Testing basic imports...')
  
  // Test Fastify import
  const { default: Fastify } = await import('fastify')
  console.log('✅ Fastify imported successfully')
  
  // Test database import
  const { initializeDatabase } = await import('./src/infrastructure/database/client.js')
  console.log('✅ Database client imported successfully')
  
  // Test server import
  const { buildApp } = await import('./src/server-development.ts')
  console.log('✅ Server development imported successfully')
  
  console.log('🎉 All imports successful!')
  
} catch (error) {
  console.error('❌ Import error:', error.message)
  console.error('📍 Stack trace:', error.stack)
}
