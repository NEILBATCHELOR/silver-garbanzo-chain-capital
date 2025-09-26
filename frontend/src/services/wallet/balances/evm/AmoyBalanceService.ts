/**
 * Amoy (Polygon) Testnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class AmoyBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 80002,
      chainName: 'Amoy',
      name: 'Amoy',
      symbol: 'POL',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_AMOY_RPC_URL,
      explorerUrl: 'https://www.oklink.com/amoy',
      coingeckoId: 'matic-network',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    return [];
  }
}

export const amoyBalanceService = new AmoyBalanceService();
