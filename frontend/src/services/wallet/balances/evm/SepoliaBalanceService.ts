/**
 * Sepolia Testnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class SepoliaBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 11155111,
      chainName: 'Sepolia',
      name: 'Sepolia',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL,
      explorerUrl: 'https://sepolia.etherscan.io',
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
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Official Circle USDC on Sepolia
        decimals: 6
      }
    ];
  }
}

export const sepoliaBalanceService = new SepoliaBalanceService();
