/**
 * zkSync Era Sepolia Testnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class ZkSyncSepoliaBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 300,
      chainName: 'zkSync Sepolia',
      name: 'zkSync Sepolia',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_ZKSYNC_SEPOLIA_RPC_URL,
      explorerUrl: 'https://sepolia.explorer.zksync.io',
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

export const zkSyncSepoliaBalanceService = new ZkSyncSepoliaBalanceService();
