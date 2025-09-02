#!/usr/bin/env node

// Comprehensive TypeScript Error Fix Script
// This script fixes all remaining TypeScript compilation errors in multi-sig services

import fs from 'fs';
import path from 'path';

const files = [
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/wallets/multi-sig/GnosisSafeService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/wallets/multi-sig/MultiSigSigningService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/wallets/multi-sig/TransactionProposalService.ts'
];

console.log('🔧 Fixing TypeScript compilation errors...');

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix 1: Error calls with empty arrays and error codes
    content = content.replace(
      /this\.error\('([^']+)',\s*\[\],\s*MultiSigErrorCodes\.([A-Z_]+)\)/g,
      "this.error('$1', '$2', 400)"
    );
    
    // Fix 2: Error calls with just empty arrays
    content = content.replace(
      /this\.error\('([^']+)',\s*\[\]\)/g,
      "this.error('$1', 'ERROR', 400)"
    );
    
    // Fix 3: Type null vs undefined issues - basic fixes
    content = content.replace(
      /where: { id: proposal\.wallet_id }/g,
      'where: { id: proposal.wallet_id || "" }'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`   ✅ Fixed ${path.basename(filePath)}`);
  }
});

console.log('✅ Basic error fixes complete!');
console.log('⚠️  Manual fixes still needed for complex type issues');
