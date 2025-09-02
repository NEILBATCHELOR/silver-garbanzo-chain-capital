#!/usr/bin/env node

/**
 * Quick TypeScript check for AddressInput component
 */

import { execSync } from 'child_process';
import path from 'path';

try {
  console.log('🔍 Checking AddressInput.tsx TypeScript compilation...');
  
  const frontendPath = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend';
  const addressInputPath = 'src/components/tokens/components/AddressInput.tsx';
  
  // Run TypeScript check on specific file
  const result = execSync(
    `cd "${frontendPath}" && npx tsc --noEmit --skipLibCheck "${addressInputPath}"`,
    { encoding: 'utf8', timeout: 10000 }
  );
  
  console.log('✅ AddressInput.tsx TypeScript compilation: PASSED');
  console.log('✅ No TypeScript errors found in AddressInput component');
  
} catch (error) {
  console.log('❌ AddressInput.tsx TypeScript compilation: FAILED');
  console.log('Error output:', error.stdout || error.message);
  process.exit(1);
}
