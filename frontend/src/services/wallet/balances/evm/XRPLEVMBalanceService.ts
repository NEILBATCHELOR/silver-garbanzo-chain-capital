/**
 * XRPL-EVM Mainnet Balance Service
 * EVM-compatible sidechain on XRP Ledger
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class XRPLEVMBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 1440002, // XRPL-EVM Mainnet Chain ID
      chainName: 'XRPL-EVM',
      name: 'XRPL EVM Sidechain',
      symbol: 'XRP',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_XRPL_EVM_MAINNET_RPC_URL,
      explorerUrl: import.meta.env.VITE_XRPL_EVM_MAINNET_EXPLORER_URL || 'https://evm-sidechain.xrpl.org',
      coingeckoId: 'ripple',
      timeout: 15000,
      isEVM: true
    };
    super(config);
    
    // Validate that RPC URL is configured
    if (!this.config.rpcUrl) {
      throw new Error('XRPL-EVM Mainnet RPC URL not configured. Please set VITE_XRPL_EVM_MAINNET_RPC_URL in .env');
    }
  }

  /**
   * Get common token contracts on XRPL-EVM Mainnet
   * Note: XRPL-EVM is relatively new, token list may be limited
   */
  protected getTokenContracts() {
    return [
      // Add XRPL-EVM token contracts as they become available
      // { symbol: 'USDC', address: '0x...', decimals: 6 },
      // { symbol: 'USDT', address: '0x...', decimals: 6 },
    ];
  }
}

export const xrplEvmBalanceService = new XRPLEVMBalanceService();
