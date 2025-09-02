// Minimal server test to check basic functionality (CommonJS version)
const { config } = require('dotenv')
config()

console.log('🔍 Starting minimal server test...')
console.log('📊 PORT:', process.env.PORT || 3001)

// Test basic Fastify setup
async function testBasicServer() {
  try {
    const fastify = require('fastify')
    console.log('✅ Fastify loaded successfully')
    
    const app = fastify({ logger: true })
    
    app.get('/', async (request, reply) => {
      return { hello: 'world', timestamp: new Date().toISOString() }
    })
    
    app.get('/health', async (request, reply) => {
      return { 
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Minimal server is running'
      }
    })
    
    const PORT = parseInt(process.env.PORT || '3001', 10)
    const HOST = process.env.HOST || '0.0.0.0'
    
    console.log(`🚀 Starting server on ${HOST}:${PORT}...`)
    await app.listen({ port: PORT, host: HOST })
    
    console.log('🎉 Server started successfully!')
    console.log(`🌐 Visit: http://${HOST}:${PORT}/`)
    console.log(`🏥 Health: http://${HOST}:${PORT}/health`)
    
  } catch (error) {
    console.error('❌ Server failed to start:', error.message)
    console.error('📍 Stack:', error.stack)
    process.exit(1)
  }
}

testBasicServer()
