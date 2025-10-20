/**
 * Ethereum Mainnet Balance Service
 * Fetches real balances and token data from Ethereum mainnet
 */

import { BaseEVMBalanceService } from './BaseEVMBalanceService';
import type { BalanceServiceConfig } from '../types';
import { CHAIN_IDS } from '@/infrastructure/web3/utils/chainIds';

export class EthereumBalanceService extends BaseEVMBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: CHAIN_IDS.ethereum,
      chainName: 'Ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_MAINNET_RPC_URL,
      explorerUrl: 'https://etherscan.io',
      coingeckoId: 'ethereum',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  /**
   * Common Ethereum ERC-20 tokens to check
   */
  protected getTokenContracts() {
    return [
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
      { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
      { symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
      { symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
      { symbol: 'AAVE', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18 }
    ];
  }
}

export const ethereumBalanceService = new EthereumBalanceService();
