/**
 * Base Mainnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class BaseBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 8453,
      chainName: 'Base',
      name: 'Base',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_BASE_RPC_URL,
      explorerUrl: 'https://basescan.org',
      coingeckoId: 'ethereum',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    return [
      { symbol: 'USDbC', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 },
      { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      { symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 }
    ];
  }
}

export const baseBalanceService = new BaseBalanceService();
