#!/usr/bin/env node

/**
 * Copy Contract Artifacts Script
 * 
 * Copies compiled contract artifacts from foundry-contracts/out/
 * to the expected locations in src/components/tokens/services/
 * for the FoundryDeploymentService to use.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the contracts we need to copy
const BASE_CONTRACTS = [
  'BaseERC20Token',
  'BaseERC721Token', 
  'BaseERC1155Token',
  'BaseERC1400Token',
  'BaseERC3525Token',
  'BaseERC4626Token',
  'TokenFactory'
];

// Enhanced contracts (copy if available)
const ENHANCED_CONTRACTS = [
  'EnhancedERC20Token',
  'EnhancedERC721Token',
  'EnhancedERC1155Token', 
  'EnhancedERC1400Token',
  'EnhancedERC3525Token',
  'EnhancedERC4626Token'
];

const ALL_CONTRACTS = [...BASE_CONTRACTS, ...ENHANCED_CONTRACTS];

// Define paths
const FOUNDRY_OUT_DIR = path.join(__dirname, '../foundry-contracts/out');
const DEST_ABI_DIR = path.join(__dirname, '../src/components/tokens/services/abis');
const DEST_BYTECODE_DIR = path.join(__dirname, '../src/components/tokens/services/bytecode');

// Ensure destination directories exist
if (!fs.existsSync(DEST_ABI_DIR)) {
  fs.mkdirSync(DEST_ABI_DIR, { recursive: true });
}
if (!fs.existsSync(DEST_BYTECODE_DIR)) {
  fs.mkdirSync(DEST_BYTECODE_DIR, { recursive: true });
}

console.log('🔄 Copying contract artifacts...\n');

ALL_CONTRACTS.forEach(contractName => {
  try {
    // Path to the compiled contract in foundry output
    const contractDir = path.join(FOUNDRY_OUT_DIR, `${contractName}.sol`);
    const contractFile = path.join(contractDir, `${contractName}.json`);
    
    if (!fs.existsSync(contractFile)) {
      console.log(`⚠️  Contract ${contractName} not found at ${contractFile}`);
      return;
    }
    
    // Read the compiled contract
    const compiledContract = JSON.parse(fs.readFileSync(contractFile, 'utf8'));
    
    // Extract ABI
    const abi = compiledContract.abi;
    if (abi) {
      const abiPath = path.join(DEST_ABI_DIR, `${contractName}.json`);
      fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
      console.log(`✅ Copied ABI: ${contractName}.json`);
    }
    
    // Extract bytecode  
    const bytecode = compiledContract.bytecode?.object || compiledContract.bytecode;
    if (bytecode) {
      const bytecodeData = {
        bytecode: bytecode,
        contractName: contractName,
        compiler: compiledContract.metadata?.compiler || 'foundry'
      };
      const bytecodePath = path.join(DEST_BYTECODE_DIR, `${contractName}.json`);
      fs.writeFileSync(bytecodePath, JSON.stringify(bytecodeData, null, 2));
      console.log(`✅ Copied Bytecode: ${contractName}.json`);
    }
    
  } catch (error) {
    console.error(`❌ Error copying ${contractName}:`, error.message);
  }
});

console.log('\n🎉 Contract artifacts copy completed!');
console.log(`📁 ABIs: ${DEST_ABI_DIR}`);
console.log(`📁 Bytecode: ${DEST_BYTECODE_DIR}`);
