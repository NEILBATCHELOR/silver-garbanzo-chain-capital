/**
 * BSC (Binance Smart Chain) Mainnet Balance Service
 * Fetches real balances and token data from BSC mainnet
 */

import { ethers } from 'ethers';
import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

export class BSCBalanceService extends BaseChainBalanceService {
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 56,
      chainName: 'BSC',
      name: 'BSC',
      symbol: 'BNB',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_BSC_RPC_URL,
      explorerUrl: 'https://bscscan.com',
      coingeckoId: 'binancecoin',
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
      throw new Error('BSC RPC provider not configured');
    }

    const balanceWei = await provider.getBalance(address);
    return ethers.formatEther(balanceWei);
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    const provider = this.getProvider();
    if (!provider) return tokens;

    // Common BSC BEP-20 tokens
    const tokenContracts = [
      { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
      { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      { symbol: 'DAI', address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', decimals: 18 },
      { symbol: 'BTCB', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18 },
      { symbol: 'ETH', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18 },
      { symbol: 'CAKE', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18 },
      { symbol: 'ADA', address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', decimals: 18 },
      { symbol: 'DOT', address: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', decimals: 18 }
    ];

    const bep20ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)'
    ];

    for (const tokenConfig of tokenContracts) {
      try {
        const contract = new ethers.Contract(tokenConfig.address, bep20ABI, provider);
        
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
              standard: 'BEP-20'
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

export const bscBalanceService = new BSCBalanceService();
