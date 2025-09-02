/**
 * Simple server startup test
 */

import { createLogger } from './src/utils/logger.js'

const logger = createLogger('TestStartup')

console.log('=== Server Startup Debug Test ===')
console.log('process.argv:', process.argv)
console.log('process.argv[1]:', process.argv[1])
console.log('import.meta.url:', import.meta.url)

const expectedUrl = `file://${process.argv[1]}`
console.log('expectedUrl:', expectedUrl)
console.log('Match check:', import.meta.url === expectedUrl)

// Test the server start function
console.log('Attempting to start server...')

try {
  const { start } = await import('./src/server-development.js')
  console.log('Successfully imported start function')
  
  if (typeof start === 'function') {
    console.log('Start function is available, calling it...')
    await start()
    console.log('Start function completed')
  } else {
    console.log('Start is not a function:', typeof start)
  }
} catch (error) {
  console.error('Error importing or starting:', error)
  console.error('Stack:', error.stack)
}
