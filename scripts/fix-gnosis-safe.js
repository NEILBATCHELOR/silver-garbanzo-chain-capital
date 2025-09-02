#!/usr/bin/env node

// GnosisSafeService specific TypeScript fixes
import fs from 'fs';

const filePath = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/wallets/multi-sig/GnosisSafeService.ts';

console.log('🔧 Fixing GnosisSafeService TypeScript errors...');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix remaining error calls with empty arrays
  content = content.replace(
    /this\.error\('([^']+)',\s*\[\]\)/g,
    "this.error('$1', 'GNOSIS_ERROR', 400)"
  );
  
  // Fix undefined config checks - add null checks
  content = content.replace(
    /const config = this\.getGnosisSafeConfig\(blockchain\)[\s\S]*?if \(!config\) \{[\s\S]*?\}/g,
    `const config = this.getGnosisSafeConfig(blockchain)
    if (!config) {
      return this.error('Gnosis Safe not supported on this blockchain', 'BLOCKCHAIN_NOT_SUPPORTED', 400)
    }`
  );
  
  // Fix method calls on potentially undefined objects
  content = content.replace(
    /safeContract\.([a-zA-Z]+)/g,
    'safeContract?.$1'
  );
  
  // Fix type mismatch for string | undefined vs string | null
  content = content.replace(
    /(string \| undefined)/g,
    'string | null'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('   ✅ Fixed GnosisSafeService.ts');
} else {
  console.log('   ❌ GnosisSafeService.ts not found');
}

console.log('✅ GnosisSafeService fixes complete!');
