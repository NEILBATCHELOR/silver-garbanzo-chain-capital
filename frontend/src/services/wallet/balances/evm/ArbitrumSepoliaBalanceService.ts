/**
 * Arbitrum Sepolia Testnet Balance Service
 * Fetches real balances and token data from Arbitrum Sepolia
 */

import { ethers } from 'ethers';
import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

export class ArbitrumSepoliaBalanceService extends BaseChainBalanceService {
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 421614,
      chainName: 'Arbitrum Sepolia',
      name: 'Arbitrum Sepolia', // Alias for chainName
      symbol: 'ETH',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL,
      explorerUrl: 'https://sepolia.arbiscan.io',
      coingeckoId: 'ethereum',
      timeout: 15000,
      isEVM: true // Arbitrum is EVM-compatible
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
      throw new Error('Arbitrum Sepolia RPC provider not configured');
    }

    const balanceWei = await provider.getBalance(address);
    return ethers.formatEther(balanceWei);
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    const provider = this.getProvider();
    if (!provider) return tokens;

    // Common Arbitrum Sepolia testnet tokens
    const tokenContracts = [
      { symbol: 'USDC', address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', decimals: 6 },
      { symbol: 'USDT', address: '0x8Ab1e0C1E9E2b9f9BAA7a8a4A0cd3e2B0825e0F6', decimals: 6 },
      { symbol: 'DAI', address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 18 }
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

export const arbitrumSepoliaBalanceService = new ArbitrumSepoliaBalanceService();
