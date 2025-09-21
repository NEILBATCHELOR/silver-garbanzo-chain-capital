/**
 * Sepolia Testnet Balance Service
 * Fetches balances and token data from Ethereum Sepolia testnet
 */

import { ethers } from 'ethers';
import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

export class SepoliaBalanceService extends BaseChainBalanceService {
  private provider: ethers.JsonRpcProvider | null = null;

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
      coingeckoId: 'ethereum', // Use ETH price for testnet
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
      throw new Error('Sepolia RPC provider not configured');
    }

    const balanceWei = await provider.getBalance(address);
    return ethers.formatEther(balanceWei);
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    const provider = this.getProvider();
    if (!provider) return tokens;

    // Common testnet tokens (if available)
    const testnetTokens = [
      // Note: Add Sepolia testnet token contracts here if known
      // Most testnet tokens are project-specific or temporary
    ];

    const erc20ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)'
    ];

    for (const tokenConfig of testnetTokens) {
      try {
        const contract = new ethers.Contract(tokenConfig.address, erc20ABI, provider);
        
        const balance = await contract.balanceOf(address);
        
        if (balance > 0) {
          const balanceFormatted = ethers.formatUnits(balance, tokenConfig.decimals);
          const numericBalance = parseFloat(balanceFormatted);
          
          if (numericBalance > 0.000001) {
            tokens.push({
              symbol: tokenConfig.symbol,
              balance: balanceFormatted,
              balanceRaw: balance.toString(),
              valueUsd: 0, // Testnet tokens have no USD value
              decimals: tokenConfig.decimals,
              contractAddress: tokenConfig.address,
              standard: 'ERC-20'
            });

            console.log(`🧪 ${tokenConfig.symbol}: ${balanceFormatted} (Testnet)`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to check testnet token ${tokenConfig.symbol}:`, error.message);
      }
    }

    return tokens;
  }

  /**
   * Override price fetching for testnet - use zero value
   */
  protected async getNativeTokenPrice(): Promise<number> {
    // Testnet ETH has no real value, but we can use mainnet price for estimation
    return super.getNativeTokenPrice();
  }
}

export const sepoliaBalanceService = new SepoliaBalanceService();
