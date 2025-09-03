/**
 * Chain Capital Backend - Main Server Entry Point
 * Routes to appropriate server based on environment
 */

import { createLogger } from './utils/logger'

const logger = createLogger('ServerRouter')
const NODE_ENV = process.env.NODE_ENV || 'development'

/**
 * Start the appropriate server based on environment
 */
async function startServer() {
  try {
    logger.info(`🚀 Starting Chain Capital Backend (${NODE_ENV} mode)...`)
    
    switch (NODE_ENV) {
      case 'production':
        logger.info('📊 Loading production server...')
        const { start: startProduction } = await import('./server-production')
        await startProduction()
        break
        
      case 'test':
        logger.info('🧪 Loading test server...')
        const { start: startTest } = await import('./server-test')
        await startTest({
          enableLogs: process.env.ENABLE_TEST_LOGS === 'true',
          enableDatabase: process.env.ENABLE_TEST_DATABASE !== 'false',
          enableAudit: process.env.ENABLE_TEST_AUDIT === 'true',
          mockExternalAPIs: process.env.MOCK_EXTERNAL_APIS !== 'false'
        })
        break
        
      case 'development':
      default:
        logger.info('🔧 Loading development server...')
        const { start: startDevelopment } = await import('./server-development')
        await startDevelopment()
        break
    }
    
  } catch (error) {
    logger.error(error, '❌ Failed to start server:')
    process.exit(1)
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
}

export { startServer }
export default startServer
