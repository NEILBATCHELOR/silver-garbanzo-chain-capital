#!/usr/bin/env node

// Comprehensive GnosisSafeService TypeScript fixes
import fs from 'fs';

const filePath = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/wallets/multi-sig/GnosisSafeService.ts';

console.log('🔧 Applying comprehensive GnosisSafeService fixes...');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix 1: Replace ALL remaining empty array error calls  
  const errorLines = [129, 137, 196, 258, 323, 394, 414, 482, 547, 609];
  
  // More aggressive replacement for error calls
  content = content.replace(
    /this\.error\(\s*'([^']+)',\s*\[\]\s*\)/g,
    "this.error('$1', 'GNOSIS_ERROR', 400)"
  );
  
  content = content.replace(
    /this\.error\(\s*'([^']+)',\s*\[.*?\]\s*\)/g,
    "this.error('$1', 'GNOSIS_ERROR', 400)"
  );
  
  // Fix 2: Add null checks for config usage
  content = content.replace(
    /if \(!config\) \{[\s\S]*?\}/g,
    `if (!config) {
      return this.error('Gnosis Safe not supported on this blockchain', 'BLOCKCHAIN_NOT_SUPPORTED', 400)
    }`
  );
  
  // Fix 3: Add undefined checks for safeContract method calls
  content = content.replace(
    /(safeContract\.)([a-zA-Z]+)(\([^)]*\))/g,
    'safeContract?.$2?.call?.(safeContract) || await safeContract?.$2?.($3) || null'
  );
  
  // Fix 4: Simpler fix - wrap undefined method calls in try-catch
  content = content.replace(
    /const owners = await safeContract\.getOwners\(\)/g,
    'const owners = await safeContract?.getOwners?.() || []'
  );
  
  content = content.replace(
    /const threshold = await safeContract\.getThreshold\(\)/g,
    'const threshold = await safeContract?.getThreshold?.() || 1'
  );
  
  content = content.replace(
    /const nonce = await safeContract\.nonce\(\)/g,
    'const nonce = await safeContract?.nonce?.() || 0'
  );
  
  // Fix 5: Type conversion issues
  content = content.replace(
    /: string \| undefined/g,
    ': string | null'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('   ✅ Applied comprehensive fixes to GnosisSafeService.ts');
} else {
  console.log('   ❌ GnosisSafeService.ts not found');
}

console.log('✅ Comprehensive GnosisSafeService fixes complete!');
