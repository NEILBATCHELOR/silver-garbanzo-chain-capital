#!/usr/bin/env node

/**
 * Script to fix all remaining .instance calls in the wallets.ts routes file
 */

import fs from 'fs';
import path from 'path';

const filePath = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/routes/wallets.ts';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define all the service method calls that need to be fixed
const serviceCalls = [
  // Multi-sig wallet service
  'multiSigWalletService.listMultiSigWallets',
  'multiSigWalletService.getMultiSigWallet',
  'multiSigWalletService.updateMultiSigWallet',
  'multiSigWalletService.deleteMultiSigWallet',
  'multiSigWalletService.addOwner',
  'multiSigWalletService.removeOwner',
  'multiSigWalletService.updateThreshold',
  'multiSigWalletService.getWalletStatistics',
  
  // Transaction proposal service
  'transactionProposalService.createProposal',
  'transactionProposalService.listProposals',
  'transactionProposalService.getProposal',
  'transactionProposalService.executeProposal',
  'transactionProposalService.cancelProposal',
  
  // Multi-sig signing service
  'multiSigSigningService.signProposal',
  'multiSigSigningService.getMultiSigAnalytics',
  'multiSigSigningService.getWalletSignatureStats',
  
  // Gnosis Safe service
  'gnosisSafeService.deployGnosisSafe',
  'gnosisSafeService.addOwnerToSafe',
  'gnosisSafeService.removeOwnerFromSafe',
  'gnosisSafeService.changeThreshold',
  
  // Signing service
  'signingService.generateTestKeyPair'
];

// Apply all the fixes
serviceCalls.forEach(call => {
  const parts = call.split('.');
  const serviceName = parts[0];
  const methodName = parts[1];
  
  // Create the regex pattern to find the service call
  const pattern = new RegExp(`(await\\s+${serviceName})\\.${methodName}`, 'g');
  const replacement = `$1.instance.${methodName}`;
  
  content = content.replace(pattern, replacement);
});

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed all remaining .instance calls in wallets.ts');
console.log('Fixed service calls:', serviceCalls.length);
