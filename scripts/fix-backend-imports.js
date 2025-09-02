#!/usr/bin/env node

/**
 * Fix Backend Import Extensions Script
 * 
 * This script fixes .js import extensions in TypeScript files
 * to work properly with tsx development mode.
 * 
 * Changes:
 * - Removes .js extensions from relative imports
 * - Keeps .js extensions for third-party packages
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

const BACKEND_SRC_PATH = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src'

// Pattern to match .js imports (but not from node_modules or third-party)
const JS_IMPORT_PATTERN = /from\s+['"`]([./][^'"`]*?)\.js['"`]/g

async function fixImportsInFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8')
    let hasChanges = false
    
    // Replace .js extensions in relative/local imports
    const updatedContent = content.replace(JS_IMPORT_PATTERN, (match, importPath) => {
      // Skip if it's a third-party package (doesn't start with . or /)
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return match
      }
      
      hasChanges = true
      return match.replace('.js', '')
    })
    
    if (hasChanges) {
      writeFileSync(filePath, updatedContent, 'utf8')
      console.log(`✅ Fixed imports in: ${path.relative(BACKEND_SRC_PATH, filePath)}`)
      return 1
    }
    
    return 0
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    return 0
  }
}

async function main() {
  console.log('🔧 Starting Backend Import Extension Fix...\n')
  
  try {
    // Find all TypeScript files in src directory
    const tsFiles = await glob(`${BACKEND_SRC_PATH}/**/*.ts`, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts'
      ]
    })
    
    console.log(`📁 Found ${tsFiles.length} TypeScript files to check\n`)
    
    let totalFixed = 0
    
    // Process each file
    for (const filePath of tsFiles) {
      const fixed = await fixImportsInFile(filePath)
      totalFixed += fixed
    }
    
    console.log(`\n🎉 Import fix complete!`)
    console.log(`📊 Fixed imports in ${totalFixed} files`)
    console.log(`📈 Total files processed: ${tsFiles.length}`)
    
  } catch (error) {
    console.error('❌ Script failed:', error.message)
    process.exit(1)
  }
}

main()
