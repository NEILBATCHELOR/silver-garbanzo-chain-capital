/**
 * Cosmos Hub Balance Service
 * Fetches real balances, IBC tokens, and staking data from Cosmos Hub mainnet
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Cosmos addresses use bech32 format with 'cosmos' prefix
const COSMOS_ADDRESS_REGEX = /^cosmos[a-z0-9]{39,59}$/;

interface CosmosBalance {
  denom: string;
  amount: string;
}

interface CosmosBalanceResponse {
  balances: CosmosBalance[];
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface DelegationResponse {
  delegation_responses: Array<{
    delegation: {
      delegator_address: string;
      validator_address: string;
      shares: string;
    };
    balance: {
      denom: string;
      amount: string;
    };
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface UnbondingResponse {
  unbonding_responses: Array<{
    delegator_address: string;
    validator_address: string;
    entries: Array<{
      creation_height: string;
      completion_time: string;
      initial_balance: string;
      balance: string;
    }>;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface IBCDenomTrace {
  denom_trace: {
    path: string;
    base_denom: string;
  };
}

export class CosmosBalanceService extends BaseChainBalanceService {
  private restUrl: string;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 1, // Cosmos Hub chain ID
      chainName: 'Cosmos Hub',
      name: 'Cosmos Hub',
      symbol: 'ATOM',
      decimals: 6,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_COSMOS_RPC_URL || 'https://rpc.cosmos.network',
      explorerUrl: 'https://www.mintscan.io/cosmos',
      coingeckoId: 'cosmos',
      timeout: 15000,
      isEVM: false
    };
    super(config);
    this.restUrl = import.meta.env.VITE_COSMOS_REST_URL || 'https://rest.cosmos.network';
  }

  validateAddress(address: string): boolean {
    return COSMOS_ADDRESS_REGEX.test(address);
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    try {
      // Use Cosmos REST API to get balance
      const response = await fetch(`${this.restUrl}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=1000`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CosmosBalanceResponse = await response.json();
      
      // Find native ATOM balance
      const atomBalance = data.balances.find(balance => balance.denom === 'uatom');
      if (!atomBalance) {
        return '0.000000';
      }

      // Convert from uatom (10^-6) to ATOM
      const uatom = BigInt(atomBalance.amount);
      const atomAmount = Number(uatom) / Math.pow(10, 6);
      return atomAmount.toFixed(6);
    } catch (error) {
      console.warn(`⚠️ Cosmos balance fetch failed:`, error.message);
      return '0.000000';
    }
  }

  /**
   * Implementation of abstract method from BaseChainBalanceService
   */
  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    return this.fetchAllTokens(address);
  }

  /**
   * Fetch all token balances including IBC tokens
   */
  async fetchAllTokens(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];

    try {
      const response = await fetch(`${this.restUrl}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=1000`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CosmosBalanceResponse = await response.json();

      for (const balance of data.balances) {
        if (balance.denom === 'uatom') {
          // Native ATOM (already handled by fetchNativeBalance)
          continue;
        }

        // Handle IBC tokens
        if (balance.denom.startsWith('ibc/')) {
          const tokenInfo = await this.getIBCTokenInfo(balance.denom);
          if (tokenInfo) {
            const formattedBalance = this.formatAmount(balance.amount, tokenInfo.decimals);
            const tokenPrice = await this.getTokenPrice(tokenInfo.symbol.toLowerCase());
            const valueUsd = parseFloat(formattedBalance) * tokenPrice;
            
            tokens.push({
              symbol: tokenInfo.symbol,
              balance: formattedBalance,
              contractAddress: balance.denom,
              decimals: tokenInfo.decimals,
              valueUsd,
              standard: 'IBC',
              logoUrl: tokenInfo.logoURI
            });
          }
        }
        // Handle other native denoms (if any)
        else {
          const tokenPrice = await this.getTokenPrice(balance.denom);
          const valueUsd = parseFloat(balance.amount) * tokenPrice;
          
          tokens.push({
            symbol: balance.denom.toUpperCase(),
            balance: balance.amount,
            contractAddress: balance.denom,
            decimals: 6,
            valueUsd,
            standard: 'native'
          });
        }
      }

      // Add staking information
      const stakingInfo = await this.fetchStakingInfo(address);
      if (stakingInfo) {
        tokens.push(...stakingInfo);
      }

      return tokens;
    } catch (error) {
      console.error(`Failed to fetch Cosmos tokens for ${address}:`, error);
      return [];
    }
  }

  /**
   * Get IBC token information
   */
  private async getIBCTokenInfo(ibcDenom: string): Promise<{
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
  } | null> {
    try {
      // Query IBC denom trace
      const hash = ibcDenom.replace('ibc/', '');
      const response = await fetch(`${this.restUrl}/ibc/apps/transfer/v1/denom_traces/${hash}`);
      
      if (!response.ok) {
        return null;
      }

      const data: IBCDenomTrace = await response.json();
      
      // Map common IBC tokens
      const tokenMap: { [key: string]: any } = {
        'uosmo': { symbol: 'OSMO', name: 'Osmosis', decimals: 6, logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.png' },
        'ujuno': { symbol: 'JUNO', name: 'Juno', decimals: 6, logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/juno/images/juno.png' },
        'uscrt': { symbol: 'SCRT', name: 'Secret', decimals: 6, logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/secretnetwork/images/scrt.png' },
        'uakt': { symbol: 'AKT', name: 'Akash', decimals: 6, logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/akash/images/akt.png' },
        'uluna': { symbol: 'LUNA', name: 'Terra', decimals: 6, logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/terra2/images/luna.png' },
        'ukava': { symbol: 'KAVA', name: 'Kava', decimals: 6, logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/kava/images/kava.png' },
        'uevmos': { symbol: 'EVMOS', name: 'Evmos', decimals: 18, logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/evmos/images/evmos.png' },
        'ustars': { symbol: 'STARS', name: 'Stargaze', decimals: 6, logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/stargaze/images/stars.png' },
        'uregen': { symbol: 'REGEN', name: 'Regen', decimals: 6, logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/regen/images/regen.png' },
      };

      const baseDenom = data.denom_trace.base_denom;
      return tokenMap[baseDenom] || {
        symbol: baseDenom.replace('u', '').toUpperCase(),
        name: `IBC ${baseDenom}`,
        decimals: 6
      };

    } catch (error) {
      console.warn(`Failed to get IBC token info for ${ibcDenom}:`, error);
      return null;
    }
  }

  /**
   * Fetch staking information
   */
  private async fetchStakingInfo(address: string): Promise<TokenBalance[]> {
    const stakingTokens: TokenBalance[] = [];

    try {
      // Fetch delegations
      const delegationsResponse = await fetch(
        `${this.restUrl}/cosmos/staking/v1beta1/delegations/${address}`
      );

      if (delegationsResponse.ok) {
        const delegations: DelegationResponse = await delegationsResponse.json();
        
        let totalStaked = BigInt(0);
        for (const delegation of delegations.delegation_responses) {
          totalStaked += BigInt(delegation.balance.amount);
        }

        if (totalStaked > 0n) {
          const formattedBalance = this.formatAmount(totalStaked.toString(), 6);
          const atomPrice = await this.getTokenPrice('cosmos');
          const valueUsd = parseFloat(formattedBalance) * atomPrice;
          
          stakingTokens.push({
            symbol: 'Staked ATOM',
            balance: formattedBalance,
            contractAddress: 'staking',
            decimals: 6,
            valueUsd,
            standard: 'other'
          });
        }
      }

      // Fetch unbonding delegations
      const unbondingResponse = await fetch(
        `${this.restUrl}/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`
      );

      if (unbondingResponse.ok) {
        const unbonding: UnbondingResponse = await unbondingResponse.json();
        
        let totalUnbonding = BigInt(0);
        for (const unbondingDelegation of unbonding.unbonding_responses) {
          for (const entry of unbondingDelegation.entries) {
            totalUnbonding += BigInt(entry.balance);
          }
        }

        if (totalUnbonding > 0n) {
          const formattedBalance = this.formatAmount(totalUnbonding.toString(), 6);
          const atomPrice = await this.getTokenPrice('cosmos');
          const valueUsd = parseFloat(formattedBalance) * atomPrice;
          
          stakingTokens.push({
            symbol: 'Unbonding ATOM',
            balance: formattedBalance,
            contractAddress: 'unbonding',
            decimals: 6,
            valueUsd,
            standard: 'other'
          });
        }
      }

      // Fetch rewards
      const rewardsResponse = await fetch(
        `${this.restUrl}/cosmos/distribution/v1beta1/delegators/${address}/rewards`
      );

      if (rewardsResponse.ok) {
        const rewardsData = await rewardsResponse.json();
        const rewards = rewardsData.total;
        
        if (rewards && rewards.length > 0) {
          const atomReward = rewards.find((r: any) => r.denom === 'uatom');
          if (atomReward) {
            // Parse the decimal amount
            const amount = parseFloat(atomReward.amount);
            const atomAmount = amount / Math.pow(10, 6);
            const formattedBalance = atomAmount.toFixed(6);
            const atomPrice = await this.getTokenPrice('cosmos');
            const valueUsd = atomAmount * atomPrice;
            
            stakingTokens.push({
              symbol: 'ATOM Rewards',
              balance: formattedBalance,
              contractAddress: 'rewards',
              decimals: 6,
              valueUsd,
              standard: 'other'
            });
          }
        }
      }

      return stakingTokens;
    } catch (error) {
      console.error(`Failed to fetch staking info for ${address}:`, error);
      return [];
    }
  }

  /**
   * Format amount from smallest unit to display unit
   */
  private formatAmount(amount: string, decimals: number): string {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const remainder = value % divisor;
    const decimal = remainder.toString().padStart(decimals, '0');
    return `${whole}.${decimal}`;
  }

  /**
   * Get detailed balance information with USD values
   */
  async getDetailedBalance(address: string): Promise<{
    native: {
      balance: string;
      usdValue: number | null;
    };
    staked: {
      balance: string;
      usdValue: number | null;
    };
    unbonding: {
      balance: string;
      usdValue: number | null;
    };
    rewards: {
      balance: string;
      usdValue: number | null;
    };
    total: {
      balance: string;
      usdValue: number | null;
    };
  }> {
    const nativeBalance = await this.fetchNativeBalance(address);
    const stakingInfo = await this.fetchStakingInfo(address);
    
    const staked = stakingInfo.find(t => t.symbol === 'Staked ATOM')?.balance || '0';
    const unbonding = stakingInfo.find(t => t.symbol === 'Unbonding ATOM')?.balance || '0';
    const rewards = stakingInfo.find(t => t.symbol === 'ATOM Rewards')?.balance || '0';
    
    const totalAtom = parseFloat(nativeBalance) + 
                      parseFloat(staked) + 
                      parseFloat(unbonding) + 
                      parseFloat(rewards);
    
    // Get USD price
    let atomPrice: number | null = null;
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=cosmos&vs_currencies=usd'
      );
      const data = await response.json();
      atomPrice = data.cosmos?.usd || null;
    } catch {
      // Price fetch failed
    }
    
    return {
      native: {
        balance: nativeBalance,
        usdValue: atomPrice ? parseFloat(nativeBalance) * atomPrice : null
      },
      staked: {
        balance: staked,
        usdValue: atomPrice ? parseFloat(staked) * atomPrice : null
      },
      unbonding: {
        balance: unbonding,
        usdValue: atomPrice ? parseFloat(unbonding) * atomPrice : null
      },
      rewards: {
        balance: rewards,
        usdValue: atomPrice ? parseFloat(rewards) * atomPrice : null
      },
      total: {
        balance: totalAtom.toFixed(6),
        usdValue: atomPrice ? totalAtom * atomPrice : null
      }
    };
  }
}

// Export singleton instance
export const cosmosBalanceService = new CosmosBalanceService();
