/**
 * Arbitrum One Mainnet Balance Service
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';
import { CHAIN_IDS } from '@/infrastructure/web3/utils/chainIds';

export class ArbitrumBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: CHAIN_IDS.arbitrumOne,
      chainName: 'Arbitrum',
      name: 'Arbitrum',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_ARBITRUM_RPC_URL,
      explorerUrl: 'https://arbiscan.io',
      coingeckoId: 'ethereum',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  protected getTokenContracts() {
    return [
      { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
      { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
      { symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 }
    ];
  }
}

export const arbitrumBalanceService = new ArbitrumBalanceService();
