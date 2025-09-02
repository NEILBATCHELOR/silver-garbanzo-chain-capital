/**
 * Step-by-step server debugging
 */

// Load environment variables first
import { config } from 'dotenv'
config()

console.log('🔧 Step 1: Environment loaded')
console.log('PORT:', process.env.PORT)
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL)

try {
  console.log('🔧 Step 2: Testing basic imports...')
  
  const { default: Fastify } = await import('fastify')
  console.log('✅ Fastify imported')
  
  console.log('🔧 Step 3: Testing database import...')
  const { initializeDatabase } = await import('./src/infrastructure/database/client.js')
  console.log('✅ Database client imported')
  
  console.log('🔧 Step 4: Testing logger import...')
  const { createLogger } = await import('./src/utils/logger.js')
  console.log('✅ Logger imported')
  
  console.log('🔧 Step 5: Testing swagger import...')
  const swaggerConfig = await import('./src/config/swagger.js')
  console.log('✅ Swagger config imported')
  
  console.log('🔧 Step 6: Testing audit middleware import...')
  const auditMiddleware = await import('./src/middleware/audit/audit-middleware.js')
  console.log('✅ Audit middleware imported')
  
  console.log('🔧 Step 7: Testing auth middleware import...')
  const jwtAuth = await import('./src/middleware/auth/jwt-auth.js')
  console.log('✅ JWT auth imported')
  
  console.log('🔧 Step 8: Testing route imports...')
  const projectRoutes = await import('./src/routes/projects.js')
  console.log('✅ Project routes imported')
  
  const investorRoutes = await import('./src/routes/investors.js')
  console.log('✅ Investor routes imported')
  
  const authRoutes = await import('./src/routes/auth/index.js')
  console.log('✅ Auth routes imported')
  
  console.log('🔧 Step 9: Creating Fastify app...')
  const app = Fastify({ logger: true })
  console.log('✅ Fastify app created')
  
  console.log('🔧 Step 10: Starting server...')
  const PORT = parseInt(process.env.PORT || '3001', 10)
  const HOST = process.env.HOST || '0.0.0.0'
  
  await app.listen({ port: PORT, host: HOST })
  console.log('✅ Server started successfully!')
  
} catch (error) {
  console.error('❌ Error during server startup:', error)
  console.error('Stack trace:', error.stack)
  process.exit(1)
}
