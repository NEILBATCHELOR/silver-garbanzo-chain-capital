/**
 * Avalanche C-Chain Mainnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class AvalancheBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 43114,
      chainName: 'Avalanche',
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_AVALANCHE_RPC_URL,
      explorerUrl: 'https://snowtrace.io',
      coingeckoId: 'avalanche-2',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    return [
      { symbol: 'USDC', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
      { symbol: 'USDT', address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6 },
      { symbol: 'DAI', address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', decimals: 18 },
      { symbol: 'WETH.e', address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18 }
    ];
  }
}

export const avalancheBalanceService = new AvalancheBalanceService();
