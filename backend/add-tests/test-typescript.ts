// Minimal TypeScript test
console.log('✅ TypeScript execution test successful')
console.log('Node version:', process.version)
console.log('ENV variables present:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
})

// Test simple import
try {
  console.log('Testing dynamic import of fastify...')
  const fastify = await import('fastify')
  console.log('✅ Fastify import successful')
  
  const app = fastify.default({ logger: false })
  console.log('✅ Fastify instance created')
  
  await app.ready()
  console.log('✅ Fastify ready')
  
} catch (error) {
  console.error('❌ Error with fastify:', error.message)
  console.error('Full error:', error)
}
