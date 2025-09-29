/**
 * Contract Configuration for Chain Capital
 * Update these addresses after deploying the smart contracts
 */

import { type Address } from 'viem';

// Contract ABIs (minimal for now, expand as needed)
export const POLICY_ENGINE_ABI = [
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'operator', type: 'address' },
      { name: 'operation', type: 'string' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'validateOperation',
    outputs: [
      { name: 'valid', type: 'bool' },
      { name: 'reason', type: 'string' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'operation', type: 'string' },
      { name: 'maxAmount', type: 'uint256' },
      { name: 'dailyLimit', type: 'uint256' },
      { name: 'monthlyLimit', type: 'uint256' },
      { name: 'cooldownPeriod', type: 'uint256' }
    ],
    name: 'registerTokenPolicy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

export const ENHANCED_ERC20_ABI = [
  // Standard ERC20 functions
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Policy-protected operations
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'duration', type: 'uint256' }
    ],
    name: 'lockTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'unlockTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'reason', type: 'string' }
    ],
    name: 'blockAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'unblockAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

// Network configurations
export type NetworkName = 'localhost' | 'sepolia' | 'mainnet';

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: 'http://localhost:8545',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: process.env.VITE_SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    }
  },
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.VITE_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  }
};

// Contract addresses by network
// TODO: Update these after deployment
export const CONTRACT_ADDRESSES: Record<NetworkName, { policyEngine: Address; token: Address }> = {
  localhost: {
    policyEngine: '0x0000000000000000000000000000000000000000' as Address,
    token: '0x0000000000000000000000000000000000000000' as Address
  },
  sepolia: {
    policyEngine: '0x0000000000000000000000000000000000000000' as Address,
    token: '0x0000000000000000000000000000000000000000' as Address
  },
  mainnet: {
    policyEngine: '0x0000000000000000000000000000000000000000' as Address,
    token: '0x0000000000000000000000000000000000000000' as Address
  }
};

// Get current network from environment
export const getCurrentNetwork = (): NetworkName => {
  const network = process.env.VITE_NETWORK as NetworkName;
  return network || 'sepolia';
};

// Helper functions
export const getContractAddress = (contract: 'policyEngine' | 'token'): Address => {
  const network = getCurrentNetwork();
  return CONTRACT_ADDRESSES[network][contract];
};

export const getNetworkConfig = (): NetworkConfig => {
  const network = getCurrentNetwork();
  return NETWORKS[network];
};

// Policy operation types
export type PolicyOperation = 'mint' | 'burn' | 'transfer' | 'lock' | 'unlock' | 'block' | 'unblock';

// Policy configuration interface
export interface PolicyConfig {
  operation: PolicyOperation;
  maxAmount: bigint;
  dailyLimit: bigint;
  monthlyLimit: bigint;
  cooldownPeriod: number; // in seconds
  requiresApproval?: boolean;
  approvalThreshold?: number;
  approvers?: Address[];
}

// Default policy configurations
export const DEFAULT_POLICIES: Record<PolicyOperation, Omit<PolicyConfig, 'operation'>> = {
  mint: {
    maxAmount: BigInt('10000000000000000000000'), // 10,000 tokens
    dailyLimit: BigInt('100000000000000000000000'), // 100,000 tokens
    monthlyLimit: BigInt('1000000000000000000000000'), // 1M tokens
    cooldownPeriod: 60 // 60 seconds
  },
  burn: {
    maxAmount: BigInt('5000000000000000000000'), // 5,000 tokens
    dailyLimit: BigInt('50000000000000000000000'), // 50,000 tokens
    monthlyLimit: BigInt('500000000000000000000000'), // 500K tokens
    cooldownPeriod: 30 // 30 seconds
  },
  transfer: {
    maxAmount: BigInt('1000000000000000000000'), // 1,000 tokens
    dailyLimit: BigInt('10000000000000000000000'), // 10,000 tokens
    monthlyLimit: BigInt('100000000000000000000000'), // 100K tokens
    cooldownPeriod: 10 // 10 seconds
  },
  lock: {
    maxAmount: BigInt('5000000000000000000000'), // 5,000 tokens
    dailyLimit: BigInt('20000000000000000000000'), // 20,000 tokens
    monthlyLimit: BigInt('200000000000000000000000'), // 200K tokens
    cooldownPeriod: 120 // 120 seconds
  },
  unlock: {
    maxAmount: BigInt('0'), // No limit for unlock
    dailyLimit: BigInt('0'),
    monthlyLimit: BigInt('0'),
    cooldownPeriod: 0
  },
  block: {
    maxAmount: BigInt('0'), // Not applicable
    dailyLimit: BigInt('0'),
    monthlyLimit: BigInt('0'),
    cooldownPeriod: 300 // 5 minutes
  },
  unblock: {
    maxAmount: BigInt('0'), // Not applicable
    dailyLimit: BigInt('0'),
    monthlyLimit: BigInt('0'),
    cooldownPeriod: 300 // 5 minutes
  }
};

// Export everything for easy import
export default {
  POLICY_ENGINE_ABI,
  ENHANCED_ERC20_ABI,
  NETWORKS,
  CONTRACT_ADDRESSES,
  DEFAULT_POLICIES,
  getCurrentNetwork,
  getContractAddress,
  getNetworkConfig
};
