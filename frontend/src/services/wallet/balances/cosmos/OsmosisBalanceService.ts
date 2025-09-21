/**
 * Osmosis Balance Service
 * Fetches real balances, liquidity pools, and IBC tokens from Osmosis
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Osmosis addresses use bech32 format with 'osmo' prefix
const OSMOSIS_ADDRESS_REGEX = /^osmo[a-z0-9]{39,59}$/;

interface OsmosisBalance {
  denom: string;
  amount: string;
}

interface OsmosisBalanceResponse {
  balances: OsmosisBalance[];
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface PoolAsset {
  token: {
    denom: string;
    amount: string;
  };
  weight: string;
}

interface LiquidityPool {
  id: string;
  pool_assets: PoolAsset[];
  total_shares: {
    denom: string;
    amount: string;
  };
  total_weight: string;
}

export class OsmosisBalanceService extends BaseChainBalanceService {
  private restUrl: string;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 1, // Osmosis chain ID
      chainName: 'Osmosis',
      name: 'Osmosis',
      symbol: 'OSMO',
      decimals: 6,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_OSMOSIS_RPC_URL || 'https://rpc.osmosis.zone',
      explorerUrl: 'https://www.mintscan.io/osmosis',
      coingeckoId: 'osmosis',
      timeout: 15000,
      isEVM: false
    };
    super(config);
    this.restUrl = import.meta.env.VITE_OSMOSIS_REST_URL || 'https://lcd.osmosis.zone';
  }

  /**
   * Required implementation of abstract method from BaseChainBalanceService
   */
  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    return this.fetchAllTokens(address);
  }

  validateAddress(address: string): boolean {
    return OSMOSIS_ADDRESS_REGEX.test(address);
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    try {
      const response = await fetch(`${this.restUrl}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=1000`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: OsmosisBalanceResponse = await response.json();
      
      // Find native OSMO balance
      const osmoBalance = data.balances.find(balance => balance.denom === 'uosmo');
      if (!osmoBalance) {
        return '0.000000';
      }

      // Convert from uosmo (10^-6) to OSMO
      const uosmo = BigInt(osmoBalance.amount);
      const osmoAmount = Number(uosmo) / Math.pow(10, 6);
      return osmoAmount.toFixed(6);
    } catch (error) {
      console.warn(`⚠️ Osmosis balance fetch failed:`, error.message);
      return '0.000000';
    }
  }

  /**
   * Fetch all token balances including IBC and gamm tokens
   */
  async fetchAllTokens(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];

    try {
      const response = await fetch(`${this.restUrl}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=1000`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: OsmosisBalanceResponse = await response.json();

      for (const balance of data.balances) {
        if (balance.denom === 'uosmo') {
          // Native OSMO (already handled by fetchNativeBalance)
          continue;
        }

        // Handle IBC tokens
        if (balance.denom.startsWith('ibc/')) {
          const tokenInfo = await this.getIBCTokenInfo(balance.denom);
          if (tokenInfo) {
            const tokenPrice = await this.getTokenPrice(tokenInfo.symbol.toLowerCase());
            const balanceNum = parseFloat(this.formatAmount(balance.amount, tokenInfo.decimals));
            
            tokens.push({
              symbol: tokenInfo.symbol,
              balance: this.formatAmount(balance.amount, tokenInfo.decimals),
              contractAddress: balance.denom,
              decimals: tokenInfo.decimals,
              standard: 'IBC',
              logoUrl: tokenInfo.logoURI,
              valueUsd: balanceNum * tokenPrice
            });
          }
        }
        // Handle liquidity pool tokens
        else if (balance.denom.startsWith('gamm/pool/')) {
          const poolId = balance.denom.split('/')[2];
          const poolInfo = await this.getPoolInfo(poolId);
          if (poolInfo) {
            const balanceNum = parseFloat(this.formatAmount(balance.amount, 18));
            
            tokens.push({
              symbol: `GAMM-${poolId}`,
              balance: this.formatAmount(balance.amount, 18),
              contractAddress: balance.denom,
              decimals: 18,
              standard: 'other',
              valueUsd: balanceNum * 0 // Pool tokens don't have direct price feeds
            });
          }
        }
      }

      // Add staking information
      const stakingInfo = await this.fetchStakingInfo(address);
      if (stakingInfo) {
        tokens.push(...stakingInfo);
      }

      return tokens;
    } catch (error) {
      console.error(`Failed to fetch Osmosis tokens for ${address}:`, error);
      return [];
    }
  }

  /**
   * Get IBC token information for Osmosis
   */
  private async getIBCTokenInfo(ibcDenom: string): Promise<{
    symbol: string;
    decimals: number;
    logoURI?: string;
  } | null> {
    // Common IBC tokens on Osmosis
    const tokenMap: { [key: string]: any } = {
      'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2': {
        symbol: 'ATOM',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png'
      },
      'ibc/46B44899322F3CD854D2D46DEEF881958467CDD4B3B10086DA49296BBED94BED': {
        symbol: 'JUNO',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/juno/images/juno.png'
      },
      'ibc/0954E1C28EB7AF5B72D24F3BC2B47BBB2FDF91BDDFD57B74B99E133AED40972A': {
        symbol: 'SCRT',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/secretnetwork/images/scrt.png'
      },
      'ibc/1DCC8A6CB5689018431323953344A9F6CC4D0BFB261E88C9F7777372C10CD076': {
        symbol: 'STARS',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/stargaze/images/stars.png'
      }
    };

    return tokenMap[ibcDenom] || null;
  }

  /**
   * Get liquidity pool information
   */
  private async getPoolInfo(poolId: string): Promise<{
    assets: string[];
  } | null> {
    try {
      const response = await fetch(`${this.restUrl}/osmosis/gamm/v1beta1/pools/${poolId}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const pool: LiquidityPool = data.pool;
      
      // Extract asset symbols from pool
      const assets = pool.pool_assets.map(asset => {
        const denom = asset.token.denom;
        if (denom === 'uosmo') return 'OSMO';
        if (denom === 'uatom') return 'ATOM';
        return denom;
      });

      return { assets };
    } catch (error) {
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
        const delegations = await delegationsResponse.json();
        
        let totalStaked = BigInt(0);
        for (const delegation of delegations.delegation_responses || []) {
          if (delegation.balance.denom === 'uosmo') {
            totalStaked += BigInt(delegation.balance.amount);
          }
        }

        if (totalStaked > 0n) {
          const osmoPrice = await this.getTokenPrice('osmosis');
          const balanceNum = parseFloat(this.formatAmount(totalStaked.toString(), 6));
          
          stakingTokens.push({
            symbol: 'Staked OSMO',
            balance: this.formatAmount(totalStaked.toString(), 6),
            contractAddress: 'staking',
            decimals: 6,
            standard: 'other',
            valueUsd: balanceNum * osmoPrice
          });
        }
      }

      // Fetch unbonding delegations
      const unbondingResponse = await fetch(
        `${this.restUrl}/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`
      );

      if (unbondingResponse.ok) {
        const unbonding = await unbondingResponse.json();
        
        let totalUnbonding = BigInt(0);
        for (const unbondingDelegation of unbonding.unbonding_responses || []) {
          for (const entry of unbondingDelegation.entries || []) {
            totalUnbonding += BigInt(entry.balance);
          }
        }

        if (totalUnbonding > 0n) {
          const osmoPrice = await this.getTokenPrice('osmosis');
          const balanceNum = parseFloat(this.formatAmount(totalUnbonding.toString(), 6));
          
          stakingTokens.push({
            symbol: 'Unbonding OSMO',
            balance: this.formatAmount(totalUnbonding.toString(), 6),
            contractAddress: 'unbonding',
            decimals: 6,
            standard: 'other',
            valueUsd: balanceNum * osmoPrice
          });
        }
      }

      // Fetch superfluid staking (unique to Osmosis)
      const superfluidResponse = await fetch(
        `${this.restUrl}/osmosis/superfluid/v1beta1/superfluid_delegations/${address}`
      );

      if (superfluidResponse.ok) {
        const superfluidData = await superfluidResponse.json();
        const delegations = superfluidData.superfluid_delegation_records || [];
        
        if (delegations.length > 0) {
          let totalSuperfluid = BigInt(0);
          for (const delegation of delegations) {
            totalSuperfluid += BigInt(delegation.delegation_amount?.amount || '0');
          }

          if (totalSuperfluid > 0n) {
            const osmoPrice = await this.getTokenPrice('osmosis');
            const balanceNum = parseFloat(this.formatAmount(totalSuperfluid.toString(), 6));
            
            stakingTokens.push({
              symbol: 'Superfluid OSMO',
              balance: this.formatAmount(totalSuperfluid.toString(), 6),
              contractAddress: 'superfluid',
              decimals: 6,
              standard: 'other',
              valueUsd: balanceNum * osmoPrice
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
}

// Export singleton instance
export const osmosisBalanceService = new OsmosisBalanceService();
