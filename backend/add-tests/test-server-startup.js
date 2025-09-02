// Simple server startup test
import { createServer } from './src/server.js'

async function testStartup() {
  try {
    console.log('🔄 Testing server startup...')
    
    const server = await createServer()
    console.log('✅ Server created successfully')
    
    await server.listen({ port: 3001, host: '0.0.0.0' })
    console.log('✅ Server listening on http://0.0.0.0:3001')
    console.log('📖 Swagger docs at http://0.0.0.0:3001/docs')
    
    // Test health endpoint
    setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:3001/health')
        const data = await response.json()
        console.log('✅ Health check:', data)
      } catch (error) {
        console.error('❌ Health check failed:', error.message)
      } finally {
        await server.close()
        console.log('🔄 Server closed')
        process.exit(0)
      }
    }, 2000)
    
  } catch (error) {
    console.error('❌ Server startup failed:', error)
    process.exit(1)
  }
}

testStartup()
