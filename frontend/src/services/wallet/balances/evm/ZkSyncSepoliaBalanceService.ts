/**
 * ZkSync Sepolia Testnet Balance Service
 * Fetches real balances and token data from ZkSync Sepolia testnet
 */

import { ethers } from 'ethers';
import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

export class ZkSyncSepoliaBalanceService extends BaseChainBalanceService {
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 300,
      chainName: 'ZkSync Sepolia',
      name: 'ZkSync Sepolia',
      symbol: 'ETH',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_ZKSYNC_SEPOLIA_RPC_URL,
      explorerUrl: 'https://sepolia.explorer.zksync.io',
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
      throw new Error('ZkSync Sepolia RPC provider not configured');
    }

    const balanceWei = await provider.getBalance(address);
    return ethers.formatEther(balanceWei);
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    const provider = this.getProvider();
    if (!provider) return tokens;

    // Common ZkSync Sepolia testnet tokens
    const tokenContracts = [
      { symbol: 'USDC', address: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4', decimals: 6 },
      { symbol: 'DAI', address: '0x4e1e30e92509b84b0A19F52fecc5fe9f37b3fa7B', decimals: 18 },
      { symbol: 'WETH', address: '0x20b28B1e4665FFf290650586ad76E977EAb90c5D', decimals: 18 }
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
            // For testnet, use ETH price for all tokens since testnet tokens have no market value
            const tokenPrice = tokenConfig.symbol === 'USDC' || tokenConfig.symbol === 'DAI' ? 1 : 0;
            
            tokens.push({
              symbol: tokenConfig.symbol,
              balance: balanceFormatted,
              balanceRaw: balance.toString(),
              valueUsd: numericBalance * tokenPrice,
              decimals: tokenConfig.decimals,
              contractAddress: tokenConfig.address,
              standard: 'ERC-20'
            });

            console.log(`💎 ${tokenConfig.symbol}: ${balanceFormatted} (testnet)`);
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

export const zkSyncSepoliaBalanceService = new ZkSyncSepoliaBalanceService();
