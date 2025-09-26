/**
 * Base Sepolia Testnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class BaseSepoliaBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 84532,
      chainName: 'Base Sepolia',
      name: 'Base Sepolia',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL,
      explorerUrl: 'https://sepolia.basescan.org',
      coingeckoId: 'ethereum',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    return [
      {
        symbol: 'USDC',
        address: '0x036cbd53842c5426634e7929541ec2318f3dcf7e', // Official Circle USDC on Base Sepolia
        decimals: 6
      }
    ];
  }
}

export const baseSepoliaBalanceService = new BaseSepoliaBalanceService();
