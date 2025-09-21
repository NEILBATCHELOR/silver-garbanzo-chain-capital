/**
 * Polygon Amoy Testnet Balance Service
 * Fetches real balances and token data from Polygon Amoy testnet
 */

import { ethers } from 'ethers';
import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

export class AmoyBalanceService extends BaseChainBalanceService {
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 80002,
      chainName: 'Amoy',
      name: 'Amoy', // Alias for chainName
      symbol: 'MATIC',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_AMOY_RPC_URL,
      explorerUrl: 'https://amoy.polygonscan.com',
      coingeckoId: 'matic-network',
      timeout: 15000,
      isEVM: true // Amoy is EVM-compatible (Polygon testnet)
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
      throw new Error('Amoy RPC provider not configured');
    }

    const balanceWei = await provider.getBalance(address);
    return ethers.formatEther(balanceWei);
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    const provider = this.getProvider();
    if (!provider) return tokens;

    // Common Amoy testnet tokens (test tokens)
    const tokenContracts = [
      { symbol: 'USDC', address: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', decimals: 6 },
      { symbol: 'USDT', address: '0xf9f98365566f4d55234f24b99caa1afbe6428d44', decimals: 6 },
      { symbol: 'WETH', address: '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9', decimals: 18 },
      { symbol: 'DAI', address: '0xc8c0b394e58C94cEA61B4Bc4Eb4ba5dFD7b2Ccaf', decimals: 18 }
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

export const amoyBalanceService = new AmoyBalanceService();
