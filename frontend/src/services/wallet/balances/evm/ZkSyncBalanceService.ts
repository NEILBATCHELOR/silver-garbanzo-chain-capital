/**
 * zkSync Era Mainnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class ZkSyncBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 324,
      chainName: 'zkSync Era',
      name: 'zkSync Era',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_ZKSYNC_RPC_URL,
      explorerUrl: 'https://explorer.zksync.io',
      coingeckoId: 'ethereum',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    return [
      { symbol: 'USDC', address: '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4', decimals: 6 }
    ];
  }
}

export const zkSyncBalanceService = new ZkSyncBalanceService();
