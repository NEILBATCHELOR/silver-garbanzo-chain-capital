/**
 * Avalanche Testnet (Fuji) Balance Service
 * Fetches real balances and token data from Avalanche Fuji testnet
 */

import { ethers } from 'ethers';
import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

export class AvalancheTestnetBalanceService extends BaseChainBalanceService {
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 43113,
      chainName: 'Avalanche Testnet',
      name: 'Avalanche Testnet', // Alias for chainName
      symbol: 'AVAX',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_AVALANCHE_TESTNET_RPC_URL,
      explorerUrl: 'https://testnet.snowtrace.io',
      coingeckoId: 'avalanche-2',
      timeout: 15000,
      isEVM: true // Avalanche is EVM-compatible
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
      throw new Error('Avalanche Testnet RPC provider not configured');
    }

    const balanceWei = await provider.getBalance(address);
    return ethers.formatEther(balanceWei);
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    const provider = this.getProvider();
    if (!provider) return tokens;

    // Common Avalanche Fuji testnet tokens
    const tokenContracts = [
      { symbol: 'USDC', address: '0x5425890298aed601595a70AB815c96711a31Bc65', decimals: 6 },
      { symbol: 'WAVAX', address: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', decimals: 18 },
      { symbol: 'LINK', address: '0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846', decimals: 18 }
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
            // For testnet, use simplified pricing for common stablecoins
            const tokenPrice = tokenConfig.symbol === 'USDC' ? 1 : 0;
            
            tokens.push({
              symbol: tokenConfig.symbol,
              balance: balanceFormatted,
              balanceRaw: balance.toString(),
              valueUsd: numericBalance * tokenPrice,
              decimals: tokenConfig.decimals,
              contractAddress: tokenConfig.address,
              standard: 'ERC-20'
            });

            console.log(`❄️ ${tokenConfig.symbol}: ${balanceFormatted} (Fuji testnet)`);
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

export const avalancheTestnetBalanceService = new AvalancheTestnetBalanceService();
