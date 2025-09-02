#!/usr/bin/env tsx

// Test different listen configurations to find the issue
import { config } from 'dotenv'
config()

import Fastify from 'fastify'

const logger = console

async function testListenConfigurations() {
  const configurations = [
    { name: 'localhost:3001', options: { port: 3001, host: 'localhost' } },
    { name: '127.0.0.1:3001', options: { port: 3001, host: '127.0.0.1' } },
    { name: '0.0.0.0:3001', options: { port: 3001, host: '0.0.0.0' } },
    { name: 'port only', options: { port: 3001 } },
    { name: 'port 3002', options: { port: 3002, host: '0.0.0.0' } },
    { name: 'minimal', options: 3001 }
  ]

  for (const config of configurations) {
    logger.log(`\n🔍 Testing configuration: ${config.name}`)
    
    try {
      const app = Fastify({ logger: false })
      
      app.get('/health', async () => ({ status: 'ok' }))
      
      logger.log(`⏳ Attempting to listen with options:`, config.options)
      
      const address = await app.listen(config.options as any)
      
      logger.log(`✅ SUCCESS: ${config.name} - ${address}`)
      
      // Test the endpoint
      try {
        const response = await fetch(`http://localhost:${typeof config.options === 'number' ? config.options : config.options.port}/health`)
        if (response.ok) {
          logger.log(`✅ Health endpoint working`)
        } else {
          logger.log(`⚠️ Health endpoint returned ${response.status}`)
        }
      } catch (fetchError) {
        logger.log(`⚠️ Health endpoint test failed:`, fetchError instanceof Error ? fetchError.message : fetchError)
      }
      
      await app.close()
      logger.log(`🛑 Closed successfully`)
      
      return config
      
    } catch (error) {
      logger.log(`❌ FAILED: ${config.name}`)
      logger.log(`Error:`, error instanceof Error ? error.message : error)
      if (error instanceof Error && error.stack) {
        logger.log(`Stack:`, error.stack)
      }
    }
  }
  
  logger.log('\n❌ All configurations failed!')
  return null
}

async function main() {
  logger.log('🚀 Testing different Fastify listen configurations...')
  logger.log('Node version:', process.version)
  logger.log('Platform:', process.platform, process.arch)
  
  const workingConfig = await testListenConfigurations()
  
  if (workingConfig) {
    logger.log('\n🎉 Found working configuration:', workingConfig.name)
    logger.log('Options:', JSON.stringify(workingConfig.options, null, 2))
  } else {
    logger.log('\n💥 No working configuration found - there may be a deeper issue')
  }
}

main().catch(error => {
  logger.error('💥 Main function failed:', error)
  process.exit(1)
})
