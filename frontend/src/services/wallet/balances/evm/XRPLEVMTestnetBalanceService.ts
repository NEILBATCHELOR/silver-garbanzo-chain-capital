/**
 * XRPL-EVM Testnet Balance Service
 * EVM-compatible testnet sidechain on XRP Ledger
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class XRPLEVMTestnetBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 1440001, // XRPL-EVM Testnet Chain ID
      chainName: 'XRPL-EVM Testnet',
      name: 'XRPL EVM Sidechain Testnet',
      symbol: 'XRP',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_XRPL_EVM_TESTNET_RPC_URL,
      explorerUrl: import.meta.env.VITE_XRPL_EVM_TESTNET_EXPLORER_URL || 'https://evm-sidechain-testnet.xrpl.org',
      coingeckoId: 'ripple',
      timeout: 15000,
      isEVM: true
    };
    super(config);
    
    // Validate that RPC URL is configured
    if (!this.config.rpcUrl) {
      throw new Error('XRPL-EVM Testnet RPC URL not configured. Please set VITE_XRPL_EVM_TESTNET_RPC_URL in .env');
    }
  }

  /**
   * Get common token contracts on XRPL-EVM Testnet
   * Note: XRPL-EVM testnet is for development, token list may vary
   */
  protected getTokenContracts() {
    return [
      // Add XRPL-EVM testnet token contracts as they become available
      // { symbol: 'tUSDC', address: '0x...', decimals: 6 },
      // { symbol: 'tUSDT', address: '0x...', decimals: 6 },
    ];
  }
}

export const xrplEvmTestnetBalanceService = new XRPLEVMTestnetBalanceService();
