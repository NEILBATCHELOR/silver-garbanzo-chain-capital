/**
 * Hoodi Ethereum Testnet Balance Service
 * 
 * Chain ID: 560048
 * RPC: https://rpc.hoodi.ethpandaops.io
 * Explorer: https://light-hoodi.beaconcha.in/
 * 
 * Hoodi is an Ethereum testnet for testing purposes
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class HoodiBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 560048,
      chainName: 'Hoodi',
      name: 'Hoodi Testnet',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_HOODI_RPC_URL || 'https://rpc.hoodi.ethpandaops.io',
      explorerUrl: 'https://light-hoodi.beaconcha.in',
      coingeckoId: 'ethereum',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    // Hoodi is a testnet - common test tokens can be added here when available
    // For now, return empty array as testnets typically don't have many tokens
    return [];
  }
}

export const hoodiBalanceService = new HoodiBalanceService();
