/**
 * Optimism Sepolia Testnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class OptimismSepoliaBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 11155420,
      chainName: 'Optimism Sepolia',
      name: 'Optimism Sepolia',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_OPTIMISM_SEPOLIA_RPC_URL,
      explorerUrl: 'https://sepolia-optimism.etherscan.io',
      coingeckoId: 'ethereum',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    return [];
  }
}

export const optimismSepoliaBalanceService = new OptimismSepoliaBalanceService();
