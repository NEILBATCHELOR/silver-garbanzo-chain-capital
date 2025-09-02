#!/usr/bin/env node
/**
 * Test TypeScript compilation for specific fixed files
 */

import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filesToTest = [
  'src/config/jwt.ts',
  'src/middleware/auditLogger.ts', 
  'src/middleware/authenticationHandler.ts',
  'src/services/captable/CapTableService.ts'
];

console.log('🔍 Testing TypeScript compilation for fixed files...\n');

let hasErrors = false;

for (const file of filesToTest) {
  try {
    console.log(`✓ Checking ${file}...`);
    execSync(`npx tsc --noEmit ${file}`, { 
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: __dirname 
    });
    console.log(`  ✅ ${file} - No compilation errors\n`);
  } catch (error) {
    console.log(`  ❌ ${file} - Compilation errors:`);
    console.log(error.stderr?.toString() || error.message);
    console.log('');
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log('❌ Some files still have TypeScript compilation errors.');
  process.exit(1);
} else {
  console.log('🎉 All fixed files compile successfully!');
  process.exit(0);
}
