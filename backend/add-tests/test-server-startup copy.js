#!/usr/bin/env node

/**
 * Test server startup directly
 */

console.log('Starting server startup test...')

import('./src/server-development.js').then(async (module) => {
  console.log('Module loaded successfully')
  console.log('Available exports:', Object.keys(module))
  
  try {
    if (module.start) {
      console.log('Calling start function...')
      await module.start()
      console.log('Start function completed')
    } else if (module.default) {
      console.log('Calling default export...')
      await module.default()
      console.log('Default export completed')
    } else {
      console.log('No start function found in exports')
    }
  } catch (error) {
    console.error('Error calling start function:', error)
    console.error('Stack:', error.stack)
  }
}).catch(error => {
  console.error('Error importing module:', error)
  console.error('Stack:', error.stack)
})
