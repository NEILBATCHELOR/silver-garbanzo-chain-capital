/**
 * Base Mainnet Balance Service
 * Fetches real balances and token data from Base mainnet
 */

import { ethers } from 'ethers';
import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

export class BaseBalanceService extends BaseChainBalanceService {
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 8453,
      chainName: 'Base',
      name: 'Base',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_BASE_RPC_URL,
      explorerUrl: 'https://basescan.org',
      coingeckoId: 'ethereum',
      timeout: 15000,
      isEVM: true
    };
    super(config);
  }

  validateAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  private getProvider(): ethers.JsonRpcProvider {
    if (!this.provider && this.config.rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl, {
        chainId: this.config.chainId,
        name: this.config.chainName
      });
    }
    return this.provider!;
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('Base RPC provider not configured');
    }

    const balanceWei = await provider.getBalance(address);
    return ethers.formatEther(balanceWei);
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    const provider = this.getProvider();
    if (!provider) return tokens;

    // Common Base ERC-20 tokens
    const tokenContracts = [
      { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      { symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
      { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      { symbol: 'cbETH', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18 },
      { symbol: 'PRIME', address: '0xfA980cEd6895AC314E7dE34Ef1bFAE90a5AdD21b', decimals: 18 },
      { symbol: 'AERO', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals: 18 },
      { symbol: 'BRETT', address: '0x532f27101965dd16442e59d40670faf5ebb142e4', decimals: 18 }
    ];

    const erc20ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)'
    ];

    for (const tokenConfig of tokenContracts) {
      try {
        const contract = new ethers.Contract(tokenConfig.address, erc20ABI, provider);
        
        const balancePromise = contract.balanceOf(address);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Token balance timeout')), 3000)
        );
        
        const balance = await Promise.race([balancePromise, timeoutPromise]) as bigint;
        
        if (balance > 0) {
          const balanceFormatted = ethers.formatUnits(balance, tokenConfig.decimals);
          const numericBalance = parseFloat(balanceFormatted);
          
          if (numericBalance > 0.000001) {
            const tokenPrice = await this.getTokenPrice(tokenConfig.symbol);
            
            tokens.push({
              symbol: tokenConfig.symbol,
              balance: balanceFormatted,
              balanceRaw: balance.toString(),
              valueUsd: numericBalance * tokenPrice,
              decimals: tokenConfig.decimals,
              contractAddress: tokenConfig.address,
              standard: 'ERC-20'
            });

            console.log(`💎 ${tokenConfig.symbol}: ${balanceFormatted} ($${(numericBalance * tokenPrice).toFixed(2)})`);
          }
        }
      } catch (error) {
        if (!error.message.includes('timeout')) {
          console.warn(`⚠️ Failed to check ${tokenConfig.symbol}:`, error.message);
        }
      }
    }

    return tokens;
  }
}

export const baseBalanceService = new BaseBalanceService();
