#!/usr/bin/env tsx

/**
 * Port and Process Checker for Chain Capital Backend
 * Helps identify and resolve port conflicts
 */

import { spawn } from 'child_process'

const PORT = 3001

console.log('🔍 Chain Capital Backend Port Checker\n')

/**
 * Check what's using a specific port
 */
function checkPort(port: number): Promise<string[]> {
  return new Promise((resolve) => {
    const lsof = spawn('lsof', ['-i', `:${port}`])
    let output = ''
    
    lsof.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    lsof.stderr.on('data', () => {
      // Ignore stderr - usually just "no processes found"
    })
    
    lsof.on('close', (code) => {
      if (code === 0 && output.trim()) {
        const lines = output.split('\n').filter(line => line.trim())
        resolve(lines)
      } else {
        resolve([])
      }
    })
    
    lsof.on('error', () => {
      resolve([])
    })
  })
}

/**
 * Kill processes on a port
 */
function killPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const kill = spawn('sh', ['-c', `lsof -ti:${port} | xargs kill`])
    
    kill.on('close', (code) => {
      resolve(code === 0)
    })
    
    kill.on('error', () => {
      resolve(false)
    })
  })
}

async function main() {
  console.log(`📊 Checking port ${PORT}...`)
  
  const processes = await checkPort(PORT)
  
  if (processes.length === 0) {
    console.log(`✅ Port ${PORT} is available`)
    console.log('🚀 You can now start the enhanced server:')
    console.log('   npm run start:enhanced')
  } else {
    console.log(`❌ Port ${PORT} is in use:`)
    console.log('')
    
    processes.forEach((line, index) => {
      if (index === 0) {
        console.log('   ' + line) // Header
      } else if (line.trim()) {
        console.log('   ' + line) // Process info
      }
    })
    
    console.log('')
    console.log('🛠️  Solutions:')
    console.log('   1. Kill processes automatically: npm run kill:port')
    console.log('   2. Kill manually: lsof -ti:3001 | xargs kill')
    console.log('   3. Use different port: PORT=3002 npm run start:enhanced')
    
    // Ask if user wants to kill processes automatically
    console.log('')
    console.log('💀 Kill processes on port 3001? (y/n)')
    
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    
    process.stdin.on('data', async (key) => {
      if (key === 'y' || key === 'Y') {
        console.log('\n🔄 Killing processes on port 3001...')
        const killed = await killPort(PORT)
        
        if (killed) {
          console.log('✅ Processes killed successfully')
          console.log('🚀 Now start the server: npm run start:enhanced')
        } else {
          console.log('❌ Failed to kill processes')
          console.log('   Try manually: lsof -ti:3001 | xargs kill')
        }
        process.exit(0)
      } else if (key === 'n' || key === 'N' || key === '\u0003') {
        console.log('\n👍 No processes killed')
        console.log('🔄 Use: PORT=3002 npm run start:enhanced')
        process.exit(0)
      }
    })
  }
}

main().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
