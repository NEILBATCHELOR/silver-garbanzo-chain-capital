/**
 * Optimism Mainnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class OptimismBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 10,
      chainName: 'Optimism',
      name: 'Optimism',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_OPTIMISM_RPC_URL,
      explorerUrl: 'https://optimistic.etherscan.io',
      coingeckoId: 'ethereum',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    return [
      { symbol: 'USDC', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      { symbol: 'USDT', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
      { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
      { symbol: 'WBTC', address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', decimals: 8 }
    ];
  }
}

export const optimismBalanceService = new OptimismBalanceService();
