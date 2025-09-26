/**
 * BSC (Binance Smart Chain) Mainnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class BSCBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 56,
      chainName: 'BSC',
      name: 'BSC',
      symbol: 'BNB',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_BSC_RPC_URL,
      explorerUrl: 'https://bscscan.com',
      coingeckoId: 'binancecoin',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    return [
      { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
      { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
      { symbol: 'DAI', address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', decimals: 18 }
    ];
  }
}

export const bscBalanceService = new BSCBalanceService();
