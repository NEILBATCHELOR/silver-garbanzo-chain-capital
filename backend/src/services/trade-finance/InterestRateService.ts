/**
 * InterestRateService
 * Backend service for Interest Rate Strategy V2 with commodity-specific adjustments
 */

import { getSupabaseClient } from '../../infrastructure/database/supabase';

// ============ Constants ============

const BPS_PRECISION = 10000;
const RAY_PRECISION = BigInt('1000000000000000000000000000'); // 1e27
const BPS_TO_RAY_FACTOR = BigInt('100000000000000000000000'); // 1e23

// Commodity types
export const COMMODITY_TYPES = {
    PRECIOUS_METAL: 0,
    BASE_METAL: 1,
    ENERGY: 2,
    AGRICULTURAL: 3,
    CARBON_CREDIT: 4
} as const;

export type CommodityType = typeof COMMODITY_TYPES[keyof typeof COMMODITY_TYPES];

// ============ Types ============

export interface InterestRateConfig {
    id: string;
    reserveAddress: string;
    chainId: number;
    optimalUsageRatio: number;
    baseVariableBorrowRate: number;
    variableRateSlope1: number;
    variableRateSlope2: number;
    commodityType: CommodityType;
    seasonalEnabled: boolean;
    storageAdjustmentBps: number;
    qualityDecayRateBps: number;
    contangoAdjustmentBps: number;
    assetSymbol?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface InterestRateConfigInput {
    reserveAddress: string;
    chainId?: number;
    optimalUsageRatio: number;
    baseVariableBorrowRate: number;
    variableRateSlope1: number;
    variableRateSlope2: number;
    commodityType?: CommodityType;
    seasonalEnabled?: boolean;
    storageAdjustmentBps?: number;
    qualityDecayRateBps?: number;
    contangoAdjustmentBps?: number;
    assetSymbol?: string;
}

export interface SeasonalMultiplier {
    commodityType: CommodityType;
    month: number;
    multiplierBps: number;
    description?: string;
}

export interface CalculatedRates {
    liquidityRateRay: string;
    variableBorrowRateRay: string;
    liquidityRatePercent: number;
    variableBorrowRatePercent: number;
    utilizationPercent: number;
}

export interface RateCalculationParams {
    reserveAddress: string;
    totalSupply: string;
    totalBorrows: string;
    unbacked?: string;
    reserveFactor?: number;
    chainId?: number;
}

export interface RateSimulationParams {
    reserveAddress: string;
    utilizationPercent: number;
    withSeasonalAdjustment?: boolean;
    month?: number;
    chainId?: number;
}

export interface RateSnapshot {
    id: string;
    reserveAddress: string;
    chainId: number;
    liquidityRateRay: string;
    variableBorrowRateRay: string;
    utilizationRatioRay: string;
    liquidityRatePercent: number;
    variableBorrowRatePercent: number;
    utilizationPercent: number;
    totalSupply: string;
    totalBorrows: string;
    availableLiquidity: string;
    seasonalMultiplierBps: number;
    commodityAdjustmentBps: number;
    snapshotTimestamp: Date;
}

// ============ Helper Functions ============

function bpsToRay(bps: number): bigint {
    return BigInt(bps) * BPS_TO_RAY_FACTOR;
}

function rayToBps(ray: bigint): number {
    return Number(ray / BPS_TO_RAY_FACTOR);
}

function rayToPercent(ray: bigint): number {
    return Number(ray * BigInt(10000) / RAY_PRECISION) / 100;
}

function percentToRay(percent: number): bigint {
    return BigInt(Math.floor(percent * 100)) * BPS_TO_RAY_FACTOR;
}

function rayMul(a: bigint, b: bigint): bigint {
    return (a * b + RAY_PRECISION / BigInt(2)) / RAY_PRECISION;
}

function rayDiv(a: bigint, b: bigint): bigint {
    if (b === BigInt(0)) return BigInt(0);
    return (a * RAY_PRECISION + b / BigInt(2)) / b;
}

// ============ Service Class ============

export class InterestRateService {
    private defaultChainId: number;

    constructor(chainId: number = 1) {
        this.defaultChainId = chainId;
    }

    // ============ Configuration Management ============

    async setInterestRateConfig(config: InterestRateConfigInput): Promise<InterestRateConfig> {
        const chainId = config.chainId ?? this.defaultChainId;

        // Validate parameters
        this.validateRateParams(config);

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('trade_finance_interest_rate_config')
            .upsert({
                reserve_address: config.reserveAddress.toLowerCase(),
                chain_id: chainId,
                optimal_usage_ratio: config.optimalUsageRatio,
                base_variable_borrow_rate: config.baseVariableBorrowRate,
                variable_rate_slope1: config.variableRateSlope1,
                variable_rate_slope2: config.variableRateSlope2,
                commodity_type: config.commodityType ?? COMMODITY_TYPES.PRECIOUS_METAL,
                seasonal_enabled: config.seasonalEnabled ?? false,
                storage_adjustment_bps: config.storageAdjustmentBps ?? 0,
                quality_decay_rate_bps: config.qualityDecayRateBps ?? 0,
                contango_adjustment_bps: config.contangoAdjustmentBps ?? 0,
                asset_symbol: config.assetSymbol,
                is_active: true,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'reserve_address,chain_id'
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to set interest rate config: ${error.message}`);
        return this.mapConfig(data);
    }


    async getInterestRateConfig(reserveAddress: string, chainId?: number): Promise<InterestRateConfig | null> {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('trade_finance_interest_rate_config')
            .select('*')
            .eq('reserve_address', reserveAddress.toLowerCase())
            .eq('chain_id', chainId ?? this.defaultChainId)
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to get interest rate config: ${error.message}`);
        }
        return data ? this.mapConfig(data) : null;
    }

    async getAllConfigs(chainId?: number): Promise<InterestRateConfig[]> {
        const supabase = getSupabaseClient();
        let query = supabase
            .from('trade_finance_interest_rate_config')
            .select('*')
            .eq('is_active', true);

        if (chainId) {
            query = query.eq('chain_id', chainId);
        }

        const { data, error } = await query;
        if (error) throw new Error(`Failed to get configs: ${error.message}`);
        return (data || []).map(this.mapConfig);
    }

    async deactivateConfig(reserveAddress: string, chainId?: number): Promise<void> {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('trade_finance_interest_rate_config')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('reserve_address', reserveAddress.toLowerCase())
            .eq('chain_id', chainId ?? this.defaultChainId);

        if (error) throw new Error(`Failed to deactivate config: ${error.message}`);
    }

    // ============ Seasonal Multipliers ============

    async getSeasonalMultipliers(commodityType: CommodityType): Promise<SeasonalMultiplier[]> {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('trade_finance_seasonal_multipliers')
            .select('*')
            .eq('commodity_type', commodityType)
            .order('month', { ascending: true });

        if (error) throw new Error(`Failed to get seasonal multipliers: ${error.message}`);
        return (data || []).map(this.mapSeasonalMultiplier);
    }

    async setSeasonalMultiplier(
        commodityType: CommodityType,
        month: number,
        multiplierBps: number,
        description?: string
    ): Promise<SeasonalMultiplier> {
        // Validate
        if (month < 0 || month > 11) {
            throw new Error('Month must be between 0 and 11');
        }
        if (multiplierBps < 7000 || multiplierBps > 15000) {
            throw new Error('Multiplier must be between 7000 and 15000 bps');
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('trade_finance_seasonal_multipliers')
            .upsert({
                commodity_type: commodityType,
                month,
                multiplier_bps: multiplierBps,
                description,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'commodity_type,month'
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to set seasonal multiplier: ${error.message}`);
        return this.mapSeasonalMultiplier(data);
    }

    async getCurrentSeasonalMultiplier(commodityType: CommodityType): Promise<number> {
        const month = new Date().getMonth();
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('trade_finance_seasonal_multipliers')
            .select('multiplier_bps')
            .eq('commodity_type', commodityType)
            .eq('month', month)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to get seasonal multiplier: ${error.message}`);
        }
        return data?.multiplier_bps ?? 10000;
    }


    // ============ Interest Rate Calculation ============

    async calculateInterestRates(params: RateCalculationParams): Promise<CalculatedRates> {
        const config = await this.getInterestRateConfig(params.reserveAddress, params.chainId);
        if (!config) {
            throw new Error('Interest rate config not found');
        }

        const totalSupply = BigInt(params.totalSupply);
        const totalBorrows = BigInt(params.totalBorrows);
        const unbacked = BigInt(params.unbacked || '0');
        const reserveFactor = params.reserveFactor ?? 1000; // Default 10%

        // Calculate utilization
        const availableLiquidity = totalSupply - totalBorrows;
        const totalLiquidityPlusDebt = availableLiquidity + totalBorrows;
        
        if (totalLiquidityPlusDebt === BigInt(0)) {
            return {
                liquidityRateRay: '0',
                variableBorrowRateRay: bpsToRay(config.baseVariableBorrowRate).toString(),
                liquidityRatePercent: 0,
                variableBorrowRatePercent: rayToPercent(bpsToRay(config.baseVariableBorrowRate)),
                utilizationPercent: 0
            };
        }

        const borrowUsageRatio = rayDiv(totalBorrows * RAY_PRECISION, totalLiquidityPlusDebt * RAY_PRECISION);
        const supplyUsageRatio = rayDiv(
            totalBorrows * RAY_PRECISION,
            (totalLiquidityPlusDebt + unbacked) * RAY_PRECISION
        );

        // Calculate base variable borrow rate
        const optimalRatio = bpsToRay(config.optimalUsageRatio);
        const baseRate = bpsToRay(config.baseVariableBorrowRate);
        const slope1 = bpsToRay(config.variableRateSlope1);
        const slope2 = bpsToRay(config.variableRateSlope2);

        let variableBorrowRate: bigint;

        if (borrowUsageRatio > optimalRatio) {
            const excessRatio = rayDiv(borrowUsageRatio - optimalRatio, RAY_PRECISION - optimalRatio);
            variableBorrowRate = baseRate + slope1 + rayMul(slope2, excessRatio);
        } else {
            variableBorrowRate = baseRate + rayMul(slope1, rayDiv(borrowUsageRatio, optimalRatio));
        }

        // Apply commodity adjustments
        variableBorrowRate = await this.applyCommodityAdjustments(variableBorrowRate, config);

        // Calculate liquidity rate
        const liquidityRate = rayMul(
            rayMul(variableBorrowRate, supplyUsageRatio),
            bpsToRay(BPS_PRECISION - reserveFactor)
        );

        return {
            liquidityRateRay: liquidityRate.toString(),
            variableBorrowRateRay: variableBorrowRate.toString(),
            liquidityRatePercent: rayToPercent(liquidityRate),
            variableBorrowRatePercent: rayToPercent(variableBorrowRate),
            utilizationPercent: rayToPercent(borrowUsageRatio)
        };
    }

    async simulateRates(params: RateSimulationParams): Promise<CalculatedRates> {
        const config = await this.getInterestRateConfig(params.reserveAddress, params.chainId);
        if (!config) {
            throw new Error('Interest rate config not found');
        }

        const utilizationRay = percentToRay(params.utilizationPercent);
        const reserveFactor = 1000; // Default 10%

        // Calculate base variable borrow rate
        const optimalRatio = bpsToRay(config.optimalUsageRatio);
        const baseRate = bpsToRay(config.baseVariableBorrowRate);
        const slope1 = bpsToRay(config.variableRateSlope1);
        const slope2 = bpsToRay(config.variableRateSlope2);

        let variableBorrowRate: bigint;

        if (utilizationRay > optimalRatio) {
            const excessRatio = rayDiv(utilizationRay - optimalRatio, RAY_PRECISION - optimalRatio);
            variableBorrowRate = baseRate + slope1 + rayMul(slope2, excessRatio);
        } else {
            variableBorrowRate = baseRate + rayMul(slope1, rayDiv(utilizationRay, optimalRatio));
        }

        // Apply commodity adjustments if requested
        if (params.withSeasonalAdjustment) {
            variableBorrowRate = await this.applyCommodityAdjustments(
                variableBorrowRate, 
                config,
                params.month
            );
        }

        // Calculate liquidity rate
        const liquidityRate = rayMul(
            rayMul(variableBorrowRate, utilizationRay),
            bpsToRay(BPS_PRECISION - reserveFactor)
        );

        // Record simulation
        const supabase = getSupabaseClient();
        await supabase.from('trade_finance_rate_simulations').insert({
            reserve_address: params.reserveAddress.toLowerCase(),
            chain_id: params.chainId ?? this.defaultChainId,
            simulated_utilization: params.utilizationPercent,
            simulated_liquidity_rate: rayToPercent(liquidityRate),
            simulated_borrow_rate: rayToPercent(variableBorrowRate),
            with_seasonal_adjustment: params.withSeasonalAdjustment ?? false,
            seasonal_month: params.month
        });

        return {
            liquidityRateRay: liquidityRate.toString(),
            variableBorrowRateRay: variableBorrowRate.toString(),
            liquidityRatePercent: rayToPercent(liquidityRate),
            variableBorrowRatePercent: rayToPercent(variableBorrowRate),
            utilizationPercent: params.utilizationPercent
        };
    }

    // ============ Private Helper Methods ============

    private validateRateParams(config: InterestRateConfigInput): void {
        if (config.optimalUsageRatio < 0 || config.optimalUsageRatio > 10000) {
            throw new Error('optimalUsageRatio must be between 0 and 10000 bps');
        }
        if (config.baseVariableBorrowRate < 0) {
            throw new Error('baseVariableBorrowRate must be positive');
        }
        if (config.variableRateSlope1 < 0 || config.variableRateSlope2 < 0) {
            throw new Error('variableRateSlope1 and variableRateSlope2 must be positive');
        }
    }

    private mapConfig(data: any): InterestRateConfig {
        return {
            id: data.id,
            reserveAddress: data.reserve_address,
            chainId: data.chain_id,
            optimalUsageRatio: data.optimal_usage_ratio,
            baseVariableBorrowRate: data.base_variable_borrow_rate,
            variableRateSlope1: data.variable_rate_slope1,
            variableRateSlope2: data.variable_rate_slope2,
            commodityType: data.commodity_type,
            seasonalEnabled: data.seasonal_enabled,
            storageAdjustmentBps: data.storage_adjustment_bps,
            qualityDecayRateBps: data.quality_decay_rate_bps,
            contangoAdjustmentBps: data.contango_adjustment_bps,
            assetSymbol: data.asset_symbol,
            isActive: data.is_active,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }

    private mapSeasonalMultiplier(data: any): SeasonalMultiplier {
        return {
            commodityType: data.commodity_type,
            month: data.month,
            multiplierBps: data.multiplier_bps,
            description: data.description
        };
    }

    private async applyCommodityAdjustments(
        baseRate: bigint,
        config: InterestRateConfig,
        month?: number
    ): Promise<bigint> {
        let adjustedRate = baseRate;

        // Apply storage cost adjustment
        if (config.storageAdjustmentBps > 0) {
            const storageAdjustment = bpsToRay(config.storageAdjustmentBps);
            adjustedRate = adjustedRate + storageAdjustment;
        }

        // Apply quality decay adjustment (for perishables)
        if (config.qualityDecayRateBps > 0) {
            const decayAdjustment = bpsToRay(config.qualityDecayRateBps);
            adjustedRate = adjustedRate + decayAdjustment;
        }

        // Apply contango/backwardation adjustment
        if (config.contangoAdjustmentBps !== 0) {
            const contangoAdjustment = bpsToRay(Math.abs(config.contangoAdjustmentBps));
            if (config.contangoAdjustmentBps > 0) {
                adjustedRate = adjustedRate + contangoAdjustment;
            } else {
                adjustedRate = adjustedRate - contangoAdjustment;
            }
        }

        // Apply seasonal adjustment if enabled
        if (config.seasonalEnabled && month !== undefined) {
            const seasonalMultipliers = await this.getSeasonalMultipliers(config.commodityType);
            const monthMultiplier = seasonalMultipliers.find(m => m.month === month);
            
            if (monthMultiplier) {
                // Apply multiplier (e.g., 10000 bps = 1.0x, 12000 bps = 1.2x)
                adjustedRate = rayMul(adjustedRate, bpsToRay(monthMultiplier.multiplierBps));
            }
        }

        return adjustedRate;
    }
}

