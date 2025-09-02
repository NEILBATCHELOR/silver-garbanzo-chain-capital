const fs = require('fs')
const path = require('path')

console.log('🔧 Fixing Solana web3 imports...\n')

const BACKEND_SRC = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src'

// Files that need the Solana import fix (from search results)
const filesToFix = [
  'services/wallets/TransactionService.ts',
  'services/wallets/multi-sig/MultiSigWalletService.ts', 
  'services/wallets/multi-sig/MultiSigSigningService.ts',
  'services/wallets/multi-sig/TransactionProposalService.ts',
  'services/wallets/SigningService.ts',
  'services/wallets/NonceManagerService.ts',
  'services/wallets/FeeEstimationService.ts'
]

function fixSolanaImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let hasChanges = false
    
    // Fix @solana/web3 to @solana/web3.js
    const originalContent = content
    content = content.replace(/@solana\/web3(['"]\s*$)/gm, '@solana/web3.js$1')
    content = content.replace(/from\s+['"`]@solana\/web3['"`]/g, "from '@solana/web3.js'")
    
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
    console.log(`🔄 Processing ${filesToFix.length} files with Solana imports...\n`)
    
    let fixedCount = 0
    
    for (const relativeFilePath of filesToFix) {
      const fullPath = path.join(BACKEND_SRC, relativeFilePath)
      if (fs.existsSync(fullPath)) {
        fixedCount += fixSolanaImports(fullPath)
      } else {
        console.log(`⚠️ File not found: ${relativeFilePath}`)
      }
    }
    
    console.log(`\n🎉 Solana import fix complete!`)
    console.log(`📊 Fixed imports in ${fixedCount} files`)
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

main()
