/**
 * Blockchain Options Utility
 * Centralized blockchain configuration for UI components
 */

import { isSupportedChain, getSupportedChains } from '@/infrastructure/web3/utils/BlockchainValidator';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

/**
 * Blockchain display configuration
 */
export interface BlockchainOption {
  value: SupportedChain;
  label: string;
  testnet: boolean;
  type: 'evm' | 'non-evm';
}

/**
 * All available blockchain options with display labels
 */
export const BLOCKCHAIN_OPTIONS: BlockchainOption[] = [
  // Mainnets
  { value: 'ethereum', label: 'Ethereum Mainnet', testnet: false, type: 'evm' },
  { value: 'polygon', label: 'Polygon', testnet: false, type: 'evm' },
  { value: 'arbitrum', label: 'Arbitrum', testnet: false, type: 'evm' },
  { value: 'optimism', label: 'Optimism', testnet: false, type: 'evm' },
  { value: 'base', label: 'Base', testnet: false, type: 'evm' },
  { value: 'avalanche', label: 'Avalanche', testnet: false, type: 'evm' },
  
  // Testnets
  { value: 'sepolia', label: 'Sepolia (Testnet)', testnet: true, type: 'evm' },
  { value: 'holesky', label: 'Holesky (Testnet)', testnet: true, type: 'evm' },
  { value: 'hoodi', label: 'Hoodi (Testnet)', testnet: true, type: 'evm' },
  
  // Non-EVM chains
  { value: 'bitcoin', label: 'Bitcoin', testnet: false, type: 'non-evm' },
  { value: 'solana', label: 'Solana', testnet: false, type: 'non-evm' },
  { value: 'near', label: 'NEAR', testnet: false, type: 'non-evm' },
  { value: 'ripple', label: 'Ripple (XRP)', testnet: false, type: 'non-evm' },
  { value: 'stellar', label: 'Stellar (XLM)', testnet: false, type: 'non-evm' },
  { value: 'sui', label: 'Sui', testnet: false, type: 'non-evm' },
  { value: 'aptos', label: 'Aptos', testnet: false, type: 'non-evm' },
  { value: 'injective', label: 'Injective', testnet: false, type: 'non-evm' },
];

/**
 * Get EVM-compatible blockchains only
 */
export function getEVMBlockchains(includeTestnets = true): BlockchainOption[] {
  return BLOCKCHAIN_OPTIONS.filter(
    chain => chain.type === 'evm' && (includeTestnets || !chain.testnet)
  );
}

/**
 * Get non-EVM blockchains only
 */
export function getNonEVMBlockchains(): BlockchainOption[] {
  return BLOCKCHAIN_OPTIONS.filter(chain => chain.type === 'non-evm');
}

/**
 * Get mainnets only
 */
export function getMainnetBlockchains(): BlockchainOption[] {
  return BLOCKCHAIN_OPTIONS.filter(chain => !chain.testnet);
}

/**
 * Get testnets only
 */
export function getTestnetBlockchains(): BlockchainOption[] {
  return BLOCKCHAIN_OPTIONS.filter(chain => chain.testnet);
}

/**
 * Get blockchain label by value
 */
export function getBlockchainLabel(value: SupportedChain): string {
  const option = BLOCKCHAIN_OPTIONS.find(opt => opt.value === value);
  return option?.label || value;
}

/**
 * Validate if a blockchain value is supported
 */
export function isSupportedBlockchain(value: string): value is SupportedChain {
  return isSupportedChain(value);
}
