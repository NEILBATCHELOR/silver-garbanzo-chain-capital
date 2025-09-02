// Simple test server to debug startup issues - ES Module version
import fastify from 'fastify'

async function start() {
  try {
    console.log('🚀 Starting test server...')
    
    const app = fastify({ logger: true })
    
    // Simple health check route
    app.get('/health', async (request, reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })
    
    const port = Number(process.env.PORT) || 3001
    const host = process.env.HOST || '0.0.0.0'
    
    await app.listen({ port, host })
    
    console.log(`✅ Test server started on http://${host}:${port}`)
    console.log(`🏥 Health check: http://${host}:${port}/health`)
    
  } catch (error) {
    console.error('❌ Test server failed to start:', error)
    process.exit(1)
  }
}

start()
