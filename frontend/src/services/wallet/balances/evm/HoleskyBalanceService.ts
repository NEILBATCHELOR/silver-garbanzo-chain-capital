/**
 * Holesky Testnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';
import { CHAIN_IDS } from '@/infrastructure/web3/utils/chainIds';

export class HoleskyBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: CHAIN_IDS.holesky,
      chainName: 'Holesky',
      name: 'Holesky',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_HOLESKY_RPC_URL,
      explorerUrl: 'https://holesky.etherscan.io',
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

export const holeskyBalanceService = new HoleskyBalanceService();
