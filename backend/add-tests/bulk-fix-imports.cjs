const fs = require('fs')
const path = require('path')

console.log('🔧 Starting bulk import fix...\n')

const BACKEND_SRC = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src'

// Find TypeScript files recursively
function findTsFiles(dir) {
  const files = []
  
  function walkDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory() && 
          entry.name !== 'node_modules' && 
          entry.name !== 'dist' &&
          entry.name !== '.git') {
        walkDir(fullPath)
      } else if (entry.isFile() && 
                 entry.name.endsWith('.ts') && 
                 !entry.name.endsWith('.d.ts')) {
        files.push(fullPath)
      }
    }
  }
  
  walkDir(dir)
  return files
}

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let hasChanges = false
    
    // Pattern 1: from imports
    const fromPattern = /from\s+['"`]([./@][^'"`]*?)\.js['"`]/g
    const originalContent = content
    content = content.replace(fromPattern, "from '$1'")
    
    if (content !== originalContent) {
      hasChanges = true
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Fixed: ${path.relative(BACKEND_SRC, filePath)}`)
      return 1
    }
    
    return 0
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    return 0
  }
}

function main() {
  try {
    console.log(`📁 Scanning ${BACKEND_SRC} for TypeScript files...`)
    const tsFiles = findTsFiles(BACKEND_SRC)
    
    console.log(`📁 Found ${tsFiles.length} TypeScript files`)
    console.log('🔄 Processing files...\n')
    
    let fixedCount = 0
    
    for (const filePath of tsFiles) {
      fixedCount += fixImportsInFile(filePath)
    }
    
    console.log(`\n🎉 Bulk import fix complete!`)
    console.log(`📊 Fixed imports in ${fixedCount} files`)
    console.log(`📈 Total files processed: ${tsFiles.length}`)
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

main()
