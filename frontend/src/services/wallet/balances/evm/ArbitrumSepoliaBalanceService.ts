/**
 * Arbitrum Sepolia Testnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';
import { CHAIN_IDS } from '@/infrastructure/web3/utils/chainIds';

export class ArbitrumSepoliaBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: CHAIN_IDS.arbitrumSepolia,
      chainName: 'Arbitrum Sepolia',
      name: 'Arbitrum Sepolia',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL,
      explorerUrl: 'https://sepolia.arbiscan.io',
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

export const arbitrumSepoliaBalanceService = new ArbitrumSepoliaBalanceService();
