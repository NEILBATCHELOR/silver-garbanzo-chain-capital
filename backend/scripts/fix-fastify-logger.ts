#!/usr/bin/env node

/**
 * Fix Fastify Logger Calls Codemod
 * 
 * Transforms logger.error('message', error) into logger.error({ error }, 'message')
 * to satisfy TypeScript strict typing for Fastify/Pino logger interfaces.
 */

import { promises as fs } from 'fs'
import { join } from 'path'

async function findTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        const subdirFiles = await findTypeScriptFiles(fullPath)
        files.push(...subdirFiles)
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.warn(`Skipping directory ${dir}: ${error}`)
  }
  
  return files
}

function transformLoggerCalls(content: string): { content: string; changes: number } {
  let changes = 0
  
  // Pattern to match logger.error() calls with 2+ arguments
  // Handles: fastify.log.error('message', error), request.log.error('message', error), this.logger.error('message', error)
  const loggerPattern = /(\w+)\.log\.error\(\s*(['"`][^'"`]*['"`]|`[^`]*`)\s*,\s*([^,\)]+)\s*\)/g
  const thisLoggerPattern = /(this\.logger)\.error\(\s*(['"`][^'"`]*['"`]|`[^`]*`)\s*,\s*([^,\)]+)\s*\)/g
  
  // Transform patterns like: fastify.log.error('message', error) -> fastify.log.error({ error }, 'message')
  content = content.replace(loggerPattern, (match, logger, message, errorVar) => {
    changes++
    return `${logger}.log.error({ error: ${errorVar.trim()} }, ${message})`
  })
  
  // Transform patterns like: this.logger.error('message', error) -> this.logger.error({ error }, 'message')
  content = content.replace(thisLoggerPattern, (match, logger, message, errorVar) => {
    changes++
    return `${logger}.error({ error: ${errorVar.trim()} }, ${message})`
  })
  
  return { content, changes }
}

async function processFile(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const { content: newContent, changes } = transformLoggerCalls(content)
    
    if (changes > 0) {
      await fs.writeFile(filePath, newContent, 'utf-8')
      console.log(`✓ Fixed ${changes} logger calls in ${filePath}`)
    }
    
    return changes
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error)
    return 0
  }
}

async function main() {
  const backendSrcPath = join(__dirname, '..', 'src')
  
  console.log('🔧 Starting Fastify logger fix codemod...')
  console.log(`📁 Searching for TypeScript files in: ${backendSrcPath}`)
  
  const tsFiles = await findTypeScriptFiles(backendSrcPath)
  console.log(`📄 Found ${tsFiles.length} TypeScript files`)
  
  let totalChanges = 0
  
  for (const file of tsFiles) {
    const changes = await processFile(file)
    totalChanges += changes
  }
  
  console.log(`\n🎉 Complete! Fixed ${totalChanges} logger calls across ${tsFiles.length} files.`)
  
  if (totalChanges > 0) {
    console.log('\n📋 Next steps:')
    console.log('  1. Run: pnpm -w tsc --noEmit')
    console.log('  2. Review changes and fix any remaining TypeScript errors')
    console.log('  3. Run: pnpm -w eslint backend --fix')
    console.log('  4. Test the backend server')
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { transformLoggerCalls, processFile, findTypeScriptFiles }
