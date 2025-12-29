/**
 * RewardsService
 * Backend service for managing rewards distribution and tracking
 * Integrates with on-chain RewardsController for liquidity mining
 */

import { supabase } from '../../infrastructure/database/supabase';

// ============ Types ============

export interface RewardsConfigInput {
    assetAddress: string;
    assetSymbol?: string;
    rewardTokenAddress: string;
    rewardTokenSymbol?: string;
    emissionPerSecond: string;
    distributionEnd: Date;
    distributionStart?: Date;
    transferStrategyAddress?: string;
    transferStrategyType?: 'pull' | 'staked';
    rewardOracleAddress?: string;
    rewardDecimals?: number;
    assetDecimals?: number;
    chainId?: number;
}

export interface UserReward {
    id: string;
    userAddress: string;
    assetAddress: string;
    rewardTokenAddress: string;
    userIndex: string;
    accruedAmount: string;
    claimedAmount: string;
    lastUpdateTimestamp: Date;
    chainId: number;
}

export interface RewardsClaim {
    id: string;
    userAddress: string;
    rewardTokenAddress: string;
    rewardTokenSymbol?: string;
    amount: string;
    amountFormatted?: number;
    toAddress: string;
    claimerAddress?: string;
    transactionHash?: string;
    blockNumber?: number;
    chainId: number;
    claimedAt: Date;
}

export interface ClaimableReward {
    rewardToken: string;
    rewardSymbol?: string;
    accruedAmount: string;
    pendingAmount: string;
    totalClaimable: string;
    valueUsd?: number;
}

export interface RewardsConfig {
    id: string;
    assetAddress: string;
    assetSymbol?: string;
    rewardTokenAddress: string;
    rewardTokenSymbol?: string;
    emissionPerSecond: string;
    distributionEnd: Date;
    distributionStart?: Date;
    transferStrategyAddress?: string;
    transferStrategyType: string;
    rewardOracleAddress?: string;
    currentIndex: string;
    isActive: boolean;
    chainId: number;
}

export interface CommodityEmissionSchedule {
    commodityType: string;
    baseEmission: string;
    seasonalMultiplier: number;
    volatilityBonus: number;
    minEmission: string;
    maxEmission: string;
    effectiveDate: Date;
}

export interface RewardsSnapshot {
    assetAddress: string;
    rewardTokenAddress: string;
    totalDistributed: string;
    totalClaimed: string;
    totalUnclaimed: string;
    uniqueClaimers: number;
    currentEmissionRate: string;
    currentIndex: string;
    snapshotTimestamp: Date;
}

export interface AuthorizedClaimer {
    id: string;
    userAddress: string;
    claimerAddress: string;
    authorizedAt: Date;
    expiresAt?: Date;
    isActive: boolean;
}

export interface UserRewardsSummary {
    userAddress: string;
    totalAccrued: string;
    totalClaimed: string;
    totalPending: string;
    rewards: Array<{
        rewardToken: string;
        rewardSymbol?: string;
        accrued: string;
        claimed: string;
        pending: string;
        valueUsd?: number;
    }>;
}

// ============ Helper Functions ============

function formatBigNumber(value: string, decimals: number = 18): number {
    const num = BigInt(value);
    const divisor = BigInt(10 ** decimals);
    const whole = num / divisor;
    const fraction = num % divisor;
    return Number(whole) + Number(fraction) / Number(divisor);
}

function calculatePendingRewards(
    userBalance: string,
    totalSupply: string,
    currentIndex: string,
    userIndex: string,
    emissionPerSecond: string,
    lastUpdateTimestamp: Date,
    distributionEnd: Date
): string {
    const now = new Date();
    const lastUpdate = new Date(lastUpdateTimestamp);
    const end = new Date(distributionEnd);
    
    const currentTime = Math.min(now.getTime(), end.getTime());
    const timeDelta = Math.max(0, (currentTime - lastUpdate.getTime()) / 1000);
    
    if (timeDelta === 0 || totalSupply === '0') {
        return '0';
    }
    
    // Calculate new index: newIndex = currentIndex + (emission * timeDelta * 1e18 / totalSupply)
    const emission = BigInt(emissionPerSecond);
    const supply = BigInt(totalSupply);
    const balance = BigInt(userBalance);
    const currIdx = BigInt(currentIndex);
    const usrIdx = BigInt(userIndex);
    const precision = BigInt(10 ** 18);
    
    const indexIncrease = (emission * BigInt(Math.floor(timeDelta)) * precision) / supply;
    const newIndex = currIdx + indexIncrease;
    
    // Calculate rewards: rewards = userBalance * (newIndex - userIndex) / precision
    const rewards = (balance * (newIndex - usrIdx)) / precision;
    
    return rewards.toString();
}

// ============ Service Class ============

export class RewardsService {
    private defaultChainId: number;

    constructor(chainId: number = 1) {
        this.defaultChainId = chainId;
    }

    // ============ Configuration Management ============

    async configureRewards(config: RewardsConfigInput): Promise<RewardsConfig> {
        const chainId = config.chainId ?? this.defaultChainId;
        
        const { data, error } = await supabase
            .from('trade_finance_rewards_config')
            .upsert({
                asset_address: config.assetAddress.toLowerCase(),
                asset_symbol: config.assetSymbol,
                reward_token_address: config.rewardTokenAddress.toLowerCase(),
                reward_token_symbol: config.rewardTokenSymbol,
                emission_per_second: config.emissionPerSecond,
                distribution_end: config.distributionEnd.toISOString(),
                distribution_start: config.distributionStart?.toISOString() ?? new Date().toISOString(),
                transfer_strategy_address: config.transferStrategyAddress?.toLowerCase(),
                transfer_strategy_type: config.transferStrategyType ?? 'pull',
                reward_oracle_address: config.rewardOracleAddress?.toLowerCase(),
                reward_decimals: config.rewardDecimals ?? 18,
                asset_decimals: config.assetDecimals ?? 18,
                chain_id: chainId,
                is_active: true,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'asset_address,reward_token_address'
            })
            .select()
            .single();
            
        if (error) throw new Error(`Failed to configure rewards: ${error.message}`);
        return this.mapRewardsConfig(data);
    }

    async getRewardsConfig(assetAddress: string, rewardTokenAddress?: string): Promise<RewardsConfig[]> {
        let query = supabase
            .from('trade_finance_rewards_config')
            .select('*')
            .eq('asset_address', assetAddress.toLowerCase())
            .eq('is_active', true);
            
        if (rewardTokenAddress) {
            query = query.eq('reward_token_address', rewardTokenAddress.toLowerCase());
        }
        
        const { data, error } = await query;
        if (error) throw new Error(`Failed to get rewards config: ${error.message}`);
        return (data || []).map(this.mapRewardsConfig);
    }

    async getAllActiveRewardsConfigs(chainId?: number): Promise<RewardsConfig[]> {
        let query = supabase
            .from('trade_finance_rewards_config')
            .select('*')
            .eq('is_active', true)
            .gt('distribution_end', new Date().toISOString());
            
        if (chainId) {
            query = query.eq('chain_id', chainId);
        }
        
        const { data, error } = await query;
        if (error) throw new Error(`Failed to get active configs: ${error.message}`);
        return (data || []).map(this.mapRewardsConfig);
    }

    async deactivateRewards(assetAddress: string, rewardTokenAddress: string): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_rewards_config')
            .update({
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('asset_address', assetAddress.toLowerCase())
            .eq('reward_token_address', rewardTokenAddress.toLowerCase());
            
        if (error) throw new Error(`Failed to deactivate rewards: ${error.message}`);
    }

    async updateEmissionRate(
        assetAddress: string,
        rewardTokenAddress: string,
        newEmissionPerSecond: string
    ): Promise<RewardsConfig> {
        const { data, error } = await supabase
            .from('trade_finance_rewards_config')
            .update({
                emission_per_second: newEmissionPerSecond,
                updated_at: new Date().toISOString()
            })
            .eq('asset_address', assetAddress.toLowerCase())
            .eq('reward_token_address', rewardTokenAddress.toLowerCase())
            .select()
            .single();
            
        if (error) throw new Error(`Failed to update emission rate: ${error.message}`);
        return this.mapRewardsConfig(data);
    }

    async extendDistribution(
        assetAddress: string,
        rewardTokenAddress: string,
        newDistributionEnd: Date
    ): Promise<RewardsConfig> {
        const { data, error } = await supabase
            .from('trade_finance_rewards_config')
            .update({
                distribution_end: newDistributionEnd.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('asset_address', assetAddress.toLowerCase())
            .eq('reward_token_address', rewardTokenAddress.toLowerCase())
            .select()
            .single();
            
        if (error) throw new Error(`Failed to extend distribution: ${error.message}`);
        return this.mapRewardsConfig(data);
    }

    // ============ User Rewards ============

    async getUserRewards(userAddress: string, chainId?: number): Promise<UserReward[]> {
        let query = supabase
            .from('trade_finance_user_rewards')
            .select('*')
            .eq('user_address', userAddress.toLowerCase());
            
        if (chainId) {
            query = query.eq('chain_id', chainId);
        }
        
        const { data, error } = await query;
        if (error) throw new Error(`Failed to get user rewards: ${error.message}`);
        return (data || []).map(this.mapUserReward);
    }


    async getUserRewardsSummary(userAddress: string): Promise<UserRewardsSummary> {
        const userRewards = await this.getUserRewards(userAddress);
        
        // Get active configs for pending calculation
        const activeConfigs = await this.getAllActiveRewardsConfigs();
        
        // Group by reward token
        const rewardsByToken = new Map<string, {
            symbol?: string;
            accrued: bigint;
            claimed: bigint;
            pending: bigint;
        }>();
        
        for (const reward of userRewards) {
            const existing = rewardsByToken.get(reward.rewardTokenAddress) || {
                symbol: undefined,
                accrued: BigInt(0),
                claimed: BigInt(0),
                pending: BigInt(0)
            };
            
            existing.accrued += BigInt(reward.accruedAmount);
            existing.claimed += BigInt(reward.claimedAmount);
            
            // Find matching config for pending calculation
            const config = activeConfigs.find(
                c => c.assetAddress === reward.assetAddress && 
                     c.rewardTokenAddress === reward.rewardTokenAddress
            );
            
            if (config) {
                existing.symbol = config.rewardTokenSymbol;
            }
            
            rewardsByToken.set(reward.rewardTokenAddress, existing);
        }
        
        const rewards = Array.from(rewardsByToken.entries()).map(([token, data]) => ({
            rewardToken: token,
            rewardSymbol: data.symbol,
            accrued: data.accrued.toString(),
            claimed: data.claimed.toString(),
            pending: data.pending.toString()
        }));
        
        const totalAccrued = rewards.reduce((sum, r) => sum + BigInt(r.accrued), BigInt(0));
        const totalClaimed = rewards.reduce((sum, r) => sum + BigInt(r.claimed), BigInt(0));
        const totalPending = rewards.reduce((sum, r) => sum + BigInt(r.pending), BigInt(0));
        
        return {
            userAddress,
            totalAccrued: totalAccrued.toString(),
            totalClaimed: totalClaimed.toString(),
            totalPending: totalPending.toString(),
            rewards
        };
    }

    async updateUserRewards(
        userAddress: string,
        assetAddress: string,
        rewardTokenAddress: string,
        userIndex: string,
        accruedAmount: string,
        chainId?: number
    ): Promise<UserReward> {
        const { data, error } = await supabase
            .from('trade_finance_user_rewards')
            .upsert({
                user_address: userAddress.toLowerCase(),
                asset_address: assetAddress.toLowerCase(),
                reward_token_address: rewardTokenAddress.toLowerCase(),
                user_index: userIndex,
                accrued_amount: accruedAmount,
                last_update_timestamp: new Date().toISOString(),
                chain_id: chainId ?? this.defaultChainId,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_address,asset_address,reward_token_address'
            })
            .select()
            .single();
            
        if (error) throw new Error(`Failed to update user rewards: ${error.message}`);
        return this.mapUserReward(data);
    }

    // ============ Claims ============

    async recordClaim(
        userAddress: string,
        rewardTokenAddress: string,
        amount: string,
        toAddress: string,
        transactionHash?: string,
        blockNumber?: number,
        claimerAddress?: string,
        rewardTokenSymbol?: string,
        chainId?: number
    ): Promise<RewardsClaim> {
        const decimals = 18; // Default, could be fetched from config
        const { data, error } = await supabase
            .from('trade_finance_rewards_claims')
            .insert({
                user_address: userAddress.toLowerCase(),
                reward_token_address: rewardTokenAddress.toLowerCase(),
                reward_token_symbol: rewardTokenSymbol,
                amount,
                amount_formatted: formatBigNumber(amount, decimals),
                to_address: toAddress.toLowerCase(),
                claimer_address: claimerAddress?.toLowerCase(),
                transaction_hash: transactionHash,
                block_number: blockNumber,
                chain_id: chainId ?? this.defaultChainId,
                claimed_at: new Date().toISOString()
            })
            .select()
            .single();
            
        if (error) throw new Error(`Failed to record claim: ${error.message}`);
        
        // Update user's claimed amount
        await this.incrementClaimedAmount(userAddress, rewardTokenAddress, amount);
        
        return this.mapClaim(data);
    }

    async getClaimHistory(
        userAddress: string,
        options?: {
            rewardToken?: string;
            fromDate?: Date;
            toDate?: Date;
            limit?: number;
            offset?: number;
        }
    ): Promise<RewardsClaim[]> {
        let query = supabase
            .from('trade_finance_rewards_claims')
            .select('*')
            .eq('user_address', userAddress.toLowerCase())
            .order('claimed_at', { ascending: false });
            
        if (options?.rewardToken) {
            query = query.eq('reward_token_address', options.rewardToken.toLowerCase());
        }
        if (options?.fromDate) {
            query = query.gte('claimed_at', options.fromDate.toISOString());
        }
        if (options?.toDate) {
            query = query.lte('claimed_at', options.toDate.toISOString());
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        if (options?.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }
        
        const { data, error } = await query;
        if (error) throw new Error(`Failed to get claim history: ${error.message}`);
        return (data || []).map(this.mapClaim);
    }

    async getTotalClaimed(userAddress: string, rewardTokenAddress?: string): Promise<string> {
        let query = supabase
            .from('trade_finance_rewards_claims')
            .select('amount')
            .eq('user_address', userAddress.toLowerCase());
            
        if (rewardTokenAddress) {
            query = query.eq('reward_token_address', rewardTokenAddress.toLowerCase());
        }
        
        const { data, error } = await query;
        if (error) throw new Error(`Failed to get total claimed: ${error.message}`);
        
        const total = (data || []).reduce((sum: bigint, row: { amount: string }) => sum + BigInt(row.amount), BigInt(0));
        return total.toString();
    }

    private async incrementClaimedAmount(
        userAddress: string,
        rewardTokenAddress: string,
        amount: string
    ): Promise<void> {
        // Get current claimed amount
        const { data: existing } = await supabase
            .from('trade_finance_user_rewards')
            .select('claimed_amount')
            .eq('user_address', userAddress.toLowerCase())
            .eq('reward_token_address', rewardTokenAddress.toLowerCase())
            .single();
            
        const currentClaimed = BigInt(existing?.claimed_amount || '0');
        const newClaimed = currentClaimed + BigInt(amount);
        
        await supabase
            .from('trade_finance_user_rewards')
            .update({
                claimed_amount: newClaimed.toString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_address', userAddress.toLowerCase())
            .eq('reward_token_address', rewardTokenAddress.toLowerCase());
    }

    // ============ Authorized Claimers ============

    async setAuthorizedClaimer(
        userAddress: string,
        claimerAddress: string,
        expiresAt?: Date
    ): Promise<AuthorizedClaimer> {
        const { data, error } = await supabase
            .from('trade_finance_authorized_claimers')
            .upsert({
                user_address: userAddress.toLowerCase(),
                claimer_address: claimerAddress.toLowerCase(),
                authorized_at: new Date().toISOString(),
                expires_at: expiresAt?.toISOString(),
                is_active: true
            }, {
                onConflict: 'user_address,claimer_address'
            })
            .select()
            .single();
            
        if (error) throw new Error(`Failed to set authorized claimer: ${error.message}`);
        return this.mapAuthorizedClaimer(data);
    }

    async revokeAuthorizedClaimer(
        userAddress: string,
        claimerAddress: string
    ): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_authorized_claimers')
            .update({ is_active: false })
            .eq('user_address', userAddress.toLowerCase())
            .eq('claimer_address', claimerAddress.toLowerCase());
            
        if (error) throw new Error(`Failed to revoke claimer: ${error.message}`);
    }

    async getAuthorizedClaimers(userAddress: string): Promise<AuthorizedClaimer[]> {
        const { data, error } = await supabase
            .from('trade_finance_authorized_claimers')
            .select('*')
            .eq('user_address', userAddress.toLowerCase())
            .eq('is_active', true);
            
        if (error) throw new Error(`Failed to get claimers: ${error.message}`);
        return (data || []).map(this.mapAuthorizedClaimer);
    }

    async isAuthorizedClaimer(
        userAddress: string,
        claimerAddress: string
    ): Promise<boolean> {
        const { data, error } = await supabase
            .from('trade_finance_authorized_claimers')
            .select('id, expires_at')
            .eq('user_address', userAddress.toLowerCase())
            .eq('claimer_address', claimerAddress.toLowerCase())
            .eq('is_active', true)
            .single();
            
        if (error || !data) return false;
        
        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            return false;
        }
        
        return true;
    }

    // ============ Snapshots & Analytics ============

    async createSnapshot(
        assetAddress: string,
        rewardTokenAddress: string,
        chainId?: number
    ): Promise<RewardsSnapshot> {
        // Get config
        const configs = await this.getRewardsConfig(assetAddress, rewardTokenAddress);
        const config = configs[0];
        if (!config) {
            throw new Error('Rewards config not found');
        }
        
        // Calculate totals from claims
        const { data: claims } = await supabase
            .from('trade_finance_rewards_claims')
            .select('amount, user_address')
            .eq('reward_token_address', rewardTokenAddress.toLowerCase());
            
        const totalClaimed = (claims || []).reduce(
            (sum: bigint, c: { amount: string }) => sum + BigInt(c.amount),
            BigInt(0)
        );
        
        const uniqueClaimers = new Set((claims || []).map((c: { user_address: string }) => c.user_address)).size;
        
        // Calculate distributed (based on emissions since start)
        const start = new Date(config.distributionStart || config.distributionEnd);
        const now = new Date();
        const end = new Date(config.distributionEnd);
        const effectiveEnd = now < end ? now : end;
        const secondsElapsed = Math.max(0, (effectiveEnd.getTime() - start.getTime()) / 1000);
        const totalDistributed = BigInt(config.emissionPerSecond) * BigInt(Math.floor(secondsElapsed));
        
        const totalUnclaimed = totalDistributed - totalClaimed;
        
        const { data, error } = await supabase
            .from('trade_finance_rewards_snapshots')
            .insert({
                asset_address: assetAddress.toLowerCase(),
                reward_token_address: rewardTokenAddress.toLowerCase(),
                snapshot_timestamp: new Date().toISOString(),
                total_distributed: totalDistributed.toString(),
                total_claimed: totalClaimed.toString(),
                total_unclaimed: totalUnclaimed.toString(),
                unique_claimers: uniqueClaimers,
                current_emission_rate: config.emissionPerSecond,
                current_index: config.currentIndex,
                chain_id: chainId ?? this.defaultChainId
            })
            .select()
            .single();
            
        if (error) throw new Error(`Failed to create snapshot: ${error.message}`);
        return this.mapSnapshot(data);
    }


    async getLatestSnapshot(
        assetAddress: string,
        rewardTokenAddress: string
    ): Promise<RewardsSnapshot | null> {
        const { data, error } = await supabase
            .from('trade_finance_rewards_snapshots')
            .select('*')
            .eq('asset_address', assetAddress.toLowerCase())
            .eq('reward_token_address', rewardTokenAddress.toLowerCase())
            .order('snapshot_timestamp', { ascending: false })
            .limit(1)
            .single();
            
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to get snapshot: ${error.message}`);
        }
        return data ? this.mapSnapshot(data) : null;
    }

    async getSnapshotHistory(
        assetAddress: string,
        rewardTokenAddress: string,
        limit: number = 30
    ): Promise<RewardsSnapshot[]> {
        const { data, error } = await supabase
            .from('trade_finance_rewards_snapshots')
            .select('*')
            .eq('asset_address', assetAddress.toLowerCase())
            .eq('reward_token_address', rewardTokenAddress.toLowerCase())
            .order('snapshot_timestamp', { ascending: false })
            .limit(limit);
            
        if (error) throw new Error(`Failed to get snapshots: ${error.message}`);
        return (data || []).map(this.mapSnapshot);
    }

    async getRewardsAnalytics(chainId?: number): Promise<{
        totalPrograms: number;
        activePrograms: number;
        totalDistributed: string;
        totalClaimed: string;
        totalUnclaimed: string;
        uniqueUsers: number;
        averageClaimSize: string;
        programsByAsset: Record<string, number>;
    }> {
        // Get all configs
        const { data: configs } = await supabase
            .from('trade_finance_rewards_config')
            .select('*');
            
        const now = new Date();
        const totalPrograms = configs?.length || 0;
        const activePrograms = configs?.filter(
            (c: { is_active: boolean; distribution_end: string }) => c.is_active && new Date(c.distribution_end) > now
        ).length || 0;
        
        // Get all claims
        const { data: claims } = await supabase
            .from('trade_finance_rewards_claims')
            .select('amount, user_address');
            
        const totalClaimed = (claims || []).reduce(
            (sum: bigint, c: { amount: string }) => sum + BigInt(c.amount),
            BigInt(0)
        );
        
        const uniqueUsers = new Set((claims || []).map((c: { user_address: string }) => c.user_address)).size;
        const claimCount = claims?.length || 0;
        const averageClaimSize = claimCount > 0 
            ? (totalClaimed / BigInt(claimCount)).toString()
            : '0';
        
        // Calculate total distributed
        let totalDistributed = BigInt(0);
        for (const config of (configs || [])) {
            const start = new Date(config.distribution_start || config.created_at);
            const end = new Date(config.distribution_end);
            const effectiveEnd = now < end ? now : end;
            const seconds = Math.max(0, (effectiveEnd.getTime() - start.getTime()) / 1000);
            totalDistributed += BigInt(config.emission_per_second) * BigInt(Math.floor(seconds));
        }
        
        const totalUnclaimed = totalDistributed - totalClaimed;
        
        // Programs by asset
        const programsByAsset: Record<string, number> = {};
        for (const config of (configs || [])) {
            const symbol = config.asset_symbol || config.asset_address;
            programsByAsset[symbol] = (programsByAsset[symbol] || 0) + 1;
        }
        
        return {
            totalPrograms,
            activePrograms,
            totalDistributed: totalDistributed.toString(),
            totalClaimed: totalClaimed.toString(),
            totalUnclaimed: totalUnclaimed.toString(),
            uniqueUsers,
            averageClaimSize,
            programsByAsset
        };
    }

    // ============ Commodity-Specific Functions ============

    async getSeasonalEmissionMultiplier(
        commodityType: string,
        date: Date = new Date()
    ): Promise<number> {
        // Seasonal multipliers for agricultural commodities
        const month = date.getMonth();
        
        const seasonalMultipliers: Record<string, number[]> = {
            // Harvest seasons get lower multipliers (high supply = less incentive needed)
            wheat: [1.2, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2],
            corn: [1.2, 1.2, 1.1, 1.0, 0.9, 0.9, 0.8, 0.7, 0.8, 0.9, 1.1, 1.2],
            soybeans: [1.2, 1.1, 1.0, 0.9, 0.9, 0.9, 0.8, 0.8, 0.7, 0.8, 1.0, 1.1],
            coffee: [1.0, 0.9, 0.8, 0.8, 0.9, 1.0, 1.1, 1.1, 1.0, 0.9, 0.9, 1.0],
            sugar: [0.9, 0.9, 1.0, 1.0, 1.1, 1.1, 1.0, 0.9, 0.9, 1.0, 1.0, 0.9],
            // Non-seasonal commodities
            gold: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
            silver: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
            crude_oil: [1.1, 1.0, 0.9, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.9, 1.0],
            natural_gas: [0.8, 0.8, 0.9, 0.9, 1.0, 1.1, 1.2, 1.2, 1.1, 1.0, 0.9, 0.8]
        };
        
        const multipliers = seasonalMultipliers[commodityType.toLowerCase()];
        return multipliers ? (multipliers[month] ?? 1.0) : 1.0;
    }

    async calculateAdjustedEmission(
        baseEmission: string,
        commodityType: string,
        volatility: number,
        liquidityDepth: number
    ): Promise<string> {
        const base = BigInt(baseEmission);
        
        // Get seasonal multiplier
        const seasonalMultiplier = await this.getSeasonalEmissionMultiplier(commodityType);
        
        // Volatility bonus: higher volatility = higher rewards (up to 50% bonus)
        const volatilityMultiplier = 1 + Math.min(0.5, volatility * 0.1);
        
        // Liquidity penalty: lower liquidity = higher rewards (up to 30% bonus)
        const liquidityMultiplier = 1 + Math.max(0, (1 - liquidityDepth) * 0.3);
        
        const totalMultiplier = seasonalMultiplier * volatilityMultiplier * liquidityMultiplier;
        const adjusted = BigInt(Math.floor(Number(base) * totalMultiplier));
        
        return adjusted.toString();
    }

    // ============ Index Management ============

    async updateGlobalIndex(
        assetAddress: string,
        rewardTokenAddress: string,
        newIndex: string
    ): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_rewards_config')
            .update({
                current_index: newIndex,
                last_update_timestamp: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('asset_address', assetAddress.toLowerCase())
            .eq('reward_token_address', rewardTokenAddress.toLowerCase());
            
        if (error) throw new Error(`Failed to update index: ${error.message}`);
    }

    // ============ Private Mapping Functions ============

    private mapRewardsConfig(data: any): RewardsConfig {
        return {
            id: data.id,
            assetAddress: data.asset_address,
            assetSymbol: data.asset_symbol,
            rewardTokenAddress: data.reward_token_address,
            rewardTokenSymbol: data.reward_token_symbol,
            emissionPerSecond: data.emission_per_second,
            distributionEnd: new Date(data.distribution_end),
            distributionStart: data.distribution_start ? new Date(data.distribution_start) : undefined,
            transferStrategyAddress: data.transfer_strategy_address,
            transferStrategyType: data.transfer_strategy_type,
            rewardOracleAddress: data.reward_oracle_address,
            currentIndex: data.current_index || '0',
            isActive: data.is_active,
            chainId: data.chain_id
        };
    }

    private mapUserReward(data: any): UserReward {
        return {
            id: data.id,
            userAddress: data.user_address,
            assetAddress: data.asset_address,
            rewardTokenAddress: data.reward_token_address,
            userIndex: data.user_index || '0',
            accruedAmount: data.accrued_amount || '0',
            claimedAmount: data.claimed_amount || '0',
            lastUpdateTimestamp: new Date(data.last_update_timestamp),
            chainId: data.chain_id
        };
    }

    private mapClaim(data: any): RewardsClaim {
        return {
            id: data.id,
            userAddress: data.user_address,
            rewardTokenAddress: data.reward_token_address,
            rewardTokenSymbol: data.reward_token_symbol,
            amount: data.amount,
            amountFormatted: data.amount_formatted,
            toAddress: data.to_address,
            claimerAddress: data.claimer_address,
            transactionHash: data.transaction_hash,
            blockNumber: data.block_number,
            chainId: data.chain_id,
            claimedAt: new Date(data.claimed_at)
        };
    }

    private mapAuthorizedClaimer(data: any): AuthorizedClaimer {
        return {
            id: data.id,
            userAddress: data.user_address,
            claimerAddress: data.claimer_address,
            authorizedAt: new Date(data.authorized_at),
            expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
            isActive: data.is_active
        };
    }

    private mapSnapshot(data: any): RewardsSnapshot {
        return {
            assetAddress: data.asset_address,
            rewardTokenAddress: data.reward_token_address,
            totalDistributed: data.total_distributed || '0',
            totalClaimed: data.total_claimed || '0',
            totalUnclaimed: data.total_unclaimed || '0',
            uniqueClaimers: data.unique_claimers || 0,
            currentEmissionRate: data.current_emission_rate || '0',
            currentIndex: data.current_index || '0',
            snapshotTimestamp: new Date(data.snapshot_timestamp)
        };
    }
}

// Export singleton instance
export const rewardsService = new RewardsService();
