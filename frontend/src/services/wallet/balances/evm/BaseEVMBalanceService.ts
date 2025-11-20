/**
 * Base EVM Balance Service
 * Abstract base class for all EVM-compatible chain balance services
 * Ensures proper RPC provider setup without wallet fallbacks
 */

import { ethers } from 'ethers';
import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

export abstract class BaseEVMBalanceService extends BaseChainBalanceService {
  protected provider: ethers.JsonRpcProvider | null = null;

  /**
   * Get EVM provider - throws error if not configured
   * NEVER falls back to window.ethereum
   */
  protected getProvider(): ethers.JsonRpcProvider {
    // Check if RPC URL is configured
    if (!this.config.rpcUrl || this.config.rpcUrl.trim() === '') {
      throw new Error(`${this.config.chainName} RPC URL not configured in environment variables`);
    }

    // Create provider if not exists
    if (!this.provider) {
      try {
        // Ensure chainId is numeric for EVM chains
        if (typeof this.config.chainId !== 'number') {
          throw new Error(`EVM chains require numeric chainId, got: ${this.config.chainId}`);
        }

        // Create JsonRpcProvider with explicit URL and network config
        // staticNetwork prevents ethers from trying to detect network via wallet
        this.provider = new ethers.JsonRpcProvider(
          this.config.rpcUrl,
          {
            chainId: this.config.chainId,
            name: this.config.chainName
          },
          {
            staticNetwork: true, // Prevents network detection attempts
            batchMaxCount: 1 // Disable batching to avoid wallet prompts
          }
        );

        console.log(`✅ ${this.config.chainName} provider initialized: ${this.getRpcProviderName()}`);
      } catch (error) {
        throw new Error(`Failed to initialize ${this.config.chainName} provider: ${error.message}`);
      }
    }

    return this.provider;
  }

  /**
   * Validate Ethereum-style address
   */
  validateAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Fetch native ETH/token balance
   */
  protected async fetchNativeBalance(address: string): Promise<string> {
    try {
      const provider = this.getProvider();
      const balanceWei = await provider.getBalance(address);
      return ethers.formatEther(balanceWei);
    } catch (error) {
      if (error.message?.includes('not configured')) {
        throw error; // Re-throw configuration errors
      }
      console.error(`Error fetching ${this.config.chainName} balance:`, error);
      throw new Error(`Failed to fetch ${this.config.chainName} balance: ${error.message}`);
    }
  }

  /**
   * Fetch ERC-20 token balances
   */
  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];

    try {
      const provider = this.getProvider();
      const tokenContracts = this.getTokenContracts();

      const erc20ABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
      ];

      for (const tokenConfig of tokenContracts) {
        try {
          const contract = new ethers.Contract(tokenConfig.address, erc20ABI, provider);

          // Add timeout to prevent hanging
          const balancePromise = contract.balanceOf(address);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Token balance timeout')), 3000)
          );

          const balance = await Promise.race([balancePromise, timeoutPromise]) as bigint;

          if (balance > 0n) {
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
          if (!error.message?.includes('timeout')) {
            console.warn(`⚠️ Failed to check ${tokenConfig.symbol}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Token fetch failed for ${this.config.chainName}:`, error.message);
    }

    return tokens;
  }

  /**
   * Get token contracts to check for this chain
   * Override in child classes for chain-specific tokens
   */
  protected getTokenContracts(): Array<{ symbol: string; address: string; decimals: number }> {
    return [];
  }

  /**
   * Clean up provider
   */
  async dispose(): Promise<void> {
    if (this.provider) {
      await this.provider.destroy();
      this.provider = null;
    }
  }
}
