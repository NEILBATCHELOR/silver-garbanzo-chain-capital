/**
 * Avalanche Fuji Testnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';

export class AvalancheTestnetBalanceService extends BaseEVMBalanceService {
  constructor() {
    // Use public CORS-friendly RPC as primary, Alchemy as fallback
    const publicRpc = 'https://api.avax-test.network/ext/bc/C/rpc';
    const alchemyRpc = import.meta.env.VITE_AVALANCHE_TESTNET_RPC_URL;
    const rpcUrl = alchemyRpc || publicRpc;

    console.log(`🔧 Avalanche Testnet using RPC: ${rpcUrl}`);

    const config: BalanceServiceConfig = {
      chainId: 43113,
      chainName: 'Avalanche Testnet', // Internal identifier - must match service registry
      name: 'Fuji', // Display name for UI
      symbol: 'AVAX',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: rpcUrl,
      explorerUrl: 'https://testnet.snowtrace.io',
      coingeckoId: 'avalanche-2',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    return [
      {
        symbol: 'USDC',
        address: '0x5425890298aed601595a70AB815c96711a31Bc65',
        decimals: 6
      }
    ];
  }
}

export const avalancheTestnetBalanceService = new AvalancheTestnetBalanceService();
