#!/usr/bin/env node
/**
 * Fix Account Abstraction TypeScript Errors
 * This script addresses all remaining undefined access issues
 */

import { readFileSync, writeFileSync } from 'fs'

console.log('🔧 Fixing Account Abstraction TypeScript errors...')

// Fix BatchOperationService.ts
const batchServicePath = './src/services/wallets/account-abstraction/BatchOperationService.ts'
const batchContent = readFileSync(batchServicePath, 'utf-8')

const fixedBatchContent = batchContent
  // Fix buildBatchCallData method - handle single operation properly
  .replace(
    /if \(op && op\.value !== '0' && op\.data === '0x'\) \{[\s\S]*?return this\.success\(op\?\.data \|\| '0x'\)/,
    `if (op && op.value !== '0' && op.data === '0x') {
        // Simple ETH transfer
        return this.success(op.data)
      }
      if (!op) {
        return this.error('Invalid operation', 'INVALID_OPERATION')
      }
      return this.success(op.data)`
  )
  // Fix array operations to handle undefined elements
  .replace(
    /const targets = operations\.map\(op => op\.target\)/g,
    'const targets = operations.map(op => op?.target).filter(Boolean)'
  )
  .replace(
    /const values = operations\.map\(op => op\.value\)/g,
    'const values = operations.map(op => op?.value).filter(Boolean)'
  )
  .replace(
    /const data = operations\.map\(op => op\.data\)/g,
    'const data = operations.map(op => op?.data).filter(Boolean)'
  )

writeFileSync(batchServicePath, fixedBatchContent)
console.log('✅ Fixed BatchOperationService.ts')

// Fix UserOperationService.ts
const userOpServicePath = './src/services/wallets/account-abstraction/UserOperationService.ts'
const userOpContent = readFileSync(userOpServicePath, 'utf-8')

const fixedUserOpContent = userOpContent
  // Fix buildBatchCallData method
  .replace(
    /if \(op && op\.value !== '0' && op\.data === '0x'\) \{[\s\S]*?return this\.success\(op\?\.data \|\| '0x'\)/,
    `if (op && op.value !== '0' && op.data === '0x') {
        // Simple ETH transfer
        return this.success(op.data)
      }
      if (!op) {
        return this.error('Invalid operation', 'INVALID_OPERATION')
      }
      return this.success(op.data)`
  )
  // Fix array operations to handle undefined elements
  .replace(
    /const targets = operations\.map\(op => op\?\.target\)\.filter\(Boolean\)/g,
    'const targets = operations.filter(op => op).map(op => op.target)'
  )
  .replace(
    /const values = operations\.map\(op => op\?\.value\)\.filter\(Boolean\)/g,
    'const values = operations.filter(op => op).map(op => op.value)'
  )
  .replace(
    /const data = operations\.map\(op => op\?\.data\)\.filter\(Boolean\)/g,
    'const data = operations.filter(op => op).map(op => op.data)'
  )

writeFileSync(userOpServicePath, fixedUserOpContent)
console.log('✅ Fixed UserOperationService.ts')

console.log('🎉 All TypeScript fixes applied!')
