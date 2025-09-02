// Debug startup script for Chain Capital backend
import { config } from 'dotenv'

async function debug() {
  console.log('🔍 Starting debug process...')

  try {
    console.log('1. Loading environment variables...')
    config()
    console.log('✅ Environment variables loaded')

    console.log('2. Testing basic imports...')
    console.log('✅ Basic imports successful')

    console.log('3. Testing Fastify import...')
    const Fastify = await import('fastify')
    console.log('✅ Fastify import successful')

    console.log('4. Testing database client...')
    const { initializeDatabase } = await import('./src/infrastructure/database/client.js')
    console.log('✅ Database client import successful')

    console.log('5. Testing database connection...')
    await initializeDatabase()
    console.log('✅ Database connection successful')

    console.log('6. Testing server creation...')
    const app = Fastify.default({
      logger: true
    })
    console.log('✅ Fastify app created')

    console.log('7. Testing server listen...')
    await app.listen({ port: 3001, host: 'localhost' })
    console.log('🎉 Server started successfully on http://localhost:3001')

    // Keep alive
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...')
      await app.close()
      process.exit(0)
    })

  } catch (error) {
    console.error('❌ Error during startup:', error)
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

debug()
