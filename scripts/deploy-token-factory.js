#!/usr/bin/env node

/**
 * Deploy TokenFactory Script
 * 
 * Deploys the TokenFactory contract to a specified testnet
 * and updates the FoundryDeploymentService configuration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const NETWORKS = {
  polygonMumbai: {
    name: 'Polygon Mumbai',
    rpcUrl: process.env.VITE_AMOY_RPC_URL,
    chainId: 80002
  },
  sepoliaEth: {
    name: 'Ethereum Sepolia',
    rpcUrl: process.env.VITE_SEPOLIA_RPC_URL,
    chainId: 11155111
  }
};

async function deployTokenFactory(networkKey, privateKey) {
  const network = NETWORKS[networkKey];
  if (!network) {
    throw new Error(`Network ${networkKey} not supported. Available: ${Object.keys(NETWORKS).join(', ')}`);
  }
  
  if (!network.rpcUrl) {
    throw new Error(`RPC URL not configured for ${network.name}. Check your environment variables.`);
  }

  console.log(`🚀 Deploying TokenFactory to ${network.name}...`);
  console.log(`📡 RPC URL: ${network.rpcUrl}`);

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(network.rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`💳 Deployer address: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance === 0n) {
    throw new Error('Insufficient balance. Please fund your deployer wallet.');
  }

  // Load TokenFactory ABI and bytecode
  const abiPath = path.join(__dirname, '../src/components/tokens/services/abis/TokenFactory.json');
  const bytecodePath = path.join(__dirname, '../src/components/tokens/services/bytecode/TokenFactory.json');
  
  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const bytecodeData = JSON.parse(fs.readFileSync(bytecodePath, 'utf8'));
  
  // Create contract factory
  const contractFactory = new ethers.ContractFactory(abi, bytecodeData.bytecode, wallet);
  
  console.log('🔨 Deploying contract...');
  
  // Deploy the contract
  const contract = await contractFactory.deploy();
  const deploymentTx = contract.deploymentTransaction();
  
  console.log(`📄 Transaction hash: ${deploymentTx.hash}`);
  console.log('⏳ Waiting for confirmation...');
  
  const receipt = await deploymentTx.wait();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ TokenFactory deployed successfully!`);
  console.log(`📍 Contract address: ${contractAddress}`);
  console.log(`🧾 Transaction hash: ${receipt.hash}`);
  console.log(`📦 Block number: ${receipt.blockNumber}`);
  
  return {
    address: contractAddress,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    network: networkKey
  };
}

async function updateDeploymentService(deploymentInfo) {
  const servicePath = path.join(__dirname, '../src/components/tokens/services/foundryDeploymentService.ts');
  let serviceContent = fs.readFileSync(servicePath, 'utf8');
  
  // Update the FACTORY_ADDRESSES configuration
  const networkMapping = {
    polygonMumbai: 'polygon.testnet',
    sepoliaEth: 'ethereum.testnet'
  };
  
  const networkPath = networkMapping[deploymentInfo.network];
  if (networkPath) {
    const [blockchain, environment] = networkPath.split('.');
    const addressPattern = new RegExp(`(${blockchain}:\\s*{[^}]*${environment}:\\s*')([^']*)'`, 'g');
    serviceContent = serviceContent.replace(addressPattern, `$1${deploymentInfo.address}'`);
  }
  
  fs.writeFileSync(servicePath, serviceContent);
  console.log(`✅ Updated FoundryDeploymentService with factory address`);
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const networkKey = args[0] || 'polygonMumbai';
    const privateKey = args[1] || process.env.DEPLOY_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('Private key required. Provide as argument or set DEPLOY_PRIVATE_KEY environment variable.');
    }
    
    // Remove 0x prefix if present
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    const deploymentInfo = await deployTokenFactory(networkKey, cleanPrivateKey);
    await updateDeploymentService(deploymentInfo);
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('🔗 Next steps:');
    console.log('1. Verify the contract on the block explorer');
    console.log('2. Test token deployment using your UI');
    console.log('3. Deploy to additional networks as needed');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
