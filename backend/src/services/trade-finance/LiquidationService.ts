import { supabase } from '../../infrastructure/database/supabase';

/**
 * LiquidationService
 * Handles all liquidation-related operations including:
 * - Dutch auctions
 * - Graceful liquidation (margin calls)
 * - Flash liquidations
 * - Insurance claims
 */

export interface DutchAuction {
    id: string;
    auctionId: bigint;
    userAddress: string;
    collateralAsset: string;
    debtAsset: string;
    collateralAmount: bigint;
    debtAmount: bigint;
    startTime: Date;
    duration: number;
    startPrice: bigint;
    startDiscountBps: number;
    endDiscountBps: number;
    useExponentialDecay: boolean;
    active: boolean;
    physicalDeliveryRequested: boolean;
}

export interface MarginCall {
    id: string;
    userAddress: string;
    commodityType: string;
    startTime: Date;
    endTime: Date;
    initialHealthFactor: number;
    requiredCollateral: bigint;
    resolved: boolean;
    liquidated: boolean;
    resolutionTime?: Date;
    collateralAdded?: bigint;
    newHealthFactor?: number;
}

export interface FlashLiquidation {
    id: string;
    liquidationId: bigint;
    initiatorAddress: string;
    userAddress: string;
    collateralAsset: string;
    debtAsset: string;
    flashLoanAmount: bigint;
    collateralReceived: bigint;
    debtCovered: bigint;
    flashLoanFee: bigint;
    profit: bigint;
    transactionHash?: string;
    executedAt: Date;
}

export interface InsuranceClaim {
    id: string;
    userAddress: string;
    commodityType: string;
    claimAmount: bigint;
    claimReason?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
    initiatedAt: Date;
    resolvedAt?: Date;
    payoutAmount?: bigint;
}

export class LiquidationService {
    /**
     * Record a new Dutch auction
     */
    async recordDutchAuction(auction: Omit<DutchAuction, 'id'>): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_dutch_auctions')
            .insert({
                auction_id: auction.auctionId.toString(),
                user_address: auction.userAddress.toLowerCase(),
                collateral_asset: auction.collateralAsset.toLowerCase(),
                debt_asset: auction.debtAsset.toLowerCase(),
                collateral_amount: auction.collateralAmount.toString(),
                debt_amount: auction.debtAmount.toString(),
                start_time: auction.startTime.toISOString(),
                duration: auction.duration,
                start_price: auction.startPrice.toString(),
                start_discount_bps: auction.startDiscountBps,
                end_discount_bps: auction.endDiscountBps,
                use_exponential_decay: auction.useExponentialDecay,
                active: auction.active,
                physical_delivery_requested: auction.physicalDeliveryRequested
            });
            
        if (error) throw error;
    }

    /**
     * Record auction execution
     */
    async recordAuctionExecution(
        auctionId: bigint,
        liquidatorAddress: string,
        collateralReceived: bigint,
        debtPaid: bigint,
        finalPrice: bigint,
        txHash?: string
    ): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_auction_executions')
            .insert({
                auction_id: auctionId.toString(),
                liquidator_address: liquidatorAddress.toLowerCase(),
                collateral_received: collateralReceived.toString(),
                debt_paid: debtPaid.toString(),
                final_price: finalPrice.toString(),
                transaction_hash: txHash
            });
            
        if (error) throw error;
        
        // Update auction status
        await supabase
            .from('trade_finance_dutch_auctions')
            .update({ 
                active: false,
                updated_at: new Date().toISOString()
            })
            .eq('auction_id', auctionId.toString());
    }

    /**
     * Get active Dutch auctions
     */
    async getActiveAuctions(): Promise<DutchAuction[]> {
        const { data, error } = await supabase
            .from('trade_finance_dutch_auctions')
            .select('*')
            .eq('active', true)
            .order('start_time', { ascending: false });
            
        if (error) throw error;
        
        return data.map(this.mapDutchAuction);
    }

    /**
     * Get auctions by user
     */
    async getUserAuctions(userAddress: string): Promise<DutchAuction[]> {
        const { data, error } = await supabase
            .from('trade_finance_dutch_auctions')
            .select('*')
            .eq('user_address', userAddress.toLowerCase())
            .order('start_time', { ascending: false });
            
        if (error) throw error;
        
        return data.map(this.mapDutchAuction);
    }

    /**
     * Record margin call
     */
    async recordMarginCall(marginCall: Omit<MarginCall, 'id'>): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_margin_calls')
            .insert({
                user_address: marginCall.userAddress.toLowerCase(),
                commodity_type: marginCall.commodityType,
                start_time: marginCall.startTime.toISOString(),
                end_time: marginCall.endTime.toISOString(),
                initial_health_factor: marginCall.initialHealthFactor.toString(),
                required_collateral: marginCall.requiredCollateral.toString(),
                resolved: marginCall.resolved,
                liquidated: marginCall.liquidated
            });
            
        if (error) throw error;
    }

    /**
     * Update margin call resolution
     */
    async resolveMarginCall(
        userAddress: string,
        collateralAdded: bigint,
        newHealthFactor: number
    ): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_margin_calls')
            .update({
                resolved: true,
                resolution_time: new Date().toISOString(),
                collateral_added: collateralAdded.toString(),
                new_health_factor: newHealthFactor.toString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_address', userAddress.toLowerCase())
            .eq('resolved', false)
            .eq('liquidated', false);
            
        if (error) throw error;
    }

    /**
     * Get active margin calls
     */
    async getActiveMarginCalls(): Promise<MarginCall[]> {
        const { data, error } = await supabase
            .from('trade_finance_margin_calls')
            .select('*')
            .eq('resolved', false)
            .eq('liquidated', false)
            .order('start_time', { ascending: false });
            
        if (error) throw error;
        
        return data.map(this.mapMarginCall);
    }

    /**
     * Get user's margin calls
     */
    async getUserMarginCalls(userAddress: string): Promise<MarginCall[]> {
        const { data, error } = await supabase
            .from('trade_finance_margin_calls')
            .select('*')
            .eq('user_address', userAddress.toLowerCase())
            .order('start_time', { ascending: false });
            
        if (error) throw error;
        
        return data.map(this.mapMarginCall);
    }

    /**
     * Record health factor warning
     */
    async recordHealthWarning(
        userAddress: string,
        healthFactor: number,
        warningType: 'LOW' | 'CRITICAL' | 'MARGIN_CALL'
    ): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_health_warnings')
            .insert({
                user_address: userAddress.toLowerCase(),
                health_factor: healthFactor.toString(),
                warning_type: warningType
            });
            
        if (error) throw error;
    }

    /**
     * Record flash liquidation
     */
    async recordFlashLiquidation(liquidation: Omit<FlashLiquidation, 'id'>): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_flash_liquidations')
            .insert({
                liquidation_id: liquidation.liquidationId.toString(),
                initiator_address: liquidation.initiatorAddress.toLowerCase(),
                user_address: liquidation.userAddress.toLowerCase(),
                collateral_asset: liquidation.collateralAsset.toLowerCase(),
                debt_asset: liquidation.debtAsset.toLowerCase(),
                flash_loan_amount: liquidation.flashLoanAmount.toString(),
                collateral_received: liquidation.collateralReceived.toString(),
                debt_covered: liquidation.debtCovered.toString(),
                flash_loan_fee: liquidation.flashLoanFee.toString(),
                profit: liquidation.profit.toString(),
                transaction_hash: liquidation.transactionHash
            });
            
        if (error) throw error;
    }

    /**
     * Get flash liquidation history
     */
    async getFlashLiquidations(
        initiatorAddress?: string,
        limit: number = 50
    ): Promise<FlashLiquidation[]> {
        let query = supabase
            .from('trade_finance_flash_liquidations')
            .select('*')
            .order('executed_at', { ascending: false })
            .limit(limit);
            
        if (initiatorAddress) {
            query = query.eq('initiator_address', initiatorAddress.toLowerCase());
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        return data.map(this.mapFlashLiquidation);
    }

    /**
     * Create insurance claim
     */
    async createInsuranceClaim(claim: Omit<InsuranceClaim, 'id' | 'status' | 'initiatedAt'>): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_insurance_claims')
            .insert({
                user_address: claim.userAddress.toLowerCase(),
                commodity_type: claim.commodityType,
                claim_amount: claim.claimAmount.toString(),
                claim_reason: claim.claimReason,
                status: 'PENDING'
            });
            
        if (error) throw error;
    }

    /**
     * Update insurance claim status
     */
    async updateInsuranceClaimStatus(
        claimId: string,
        status: 'APPROVED' | 'REJECTED' | 'PAID',
        payoutAmount?: bigint
    ): Promise<void> {
        const updateData: any = {
            status,
            resolved_at: new Date().toISOString()
        };
        
        if (payoutAmount) {
            updateData.payout_amount = payoutAmount.toString();
        }
        
        const { error } = await supabase
            .from('trade_finance_insurance_claims')
            .update(updateData)
            .eq('id', claimId);
            
        if (error) throw error;
    }

    /**
     * Get insurance claims
     */
    async getInsuranceClaims(
        userAddress?: string,
        status?: string
    ): Promise<InsuranceClaim[]> {
        let query = supabase
            .from('trade_finance_insurance_claims')
            .select('*')
            .order('initiated_at', { ascending: false });
            
        if (userAddress) {
            query = query.eq('user_address', userAddress.toLowerCase());
        }
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        return data.map(this.mapInsuranceClaim);
    }

    /**
     * Get liquidation analytics
     */
    async getLiquidationAnalytics(days: number = 30): Promise<{
        totalLiquidations: number;
        totalValue: bigint;
        averageHealthFactor: number;
        dutchAuctions: number;
        flashLiquidations: number;
        gracefulResolutions: number;
    }> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Get various metrics in parallel
        const [dutchData, flashData, marginData] = await Promise.all([
            supabase
                .from('trade_finance_auction_executions')
                .select('debt_paid')
                .gte('executed_at', startDate.toISOString()),
            supabase
                .from('trade_finance_flash_liquidations')
                .select('debt_covered')
                .gte('executed_at', startDate.toISOString()),
            supabase
                .from('trade_finance_margin_calls')
                .select('*')
                .eq('resolved', true)
                .gte('start_time', startDate.toISOString())
        ]);
        
        const dutchValue = dutchData.data?.reduce((sum: bigint, d: any) => sum + BigInt(d.debt_paid || 0), 0n) || 0n;
        const flashValue = flashData.data?.reduce((sum: bigint, d: any) => sum + BigInt(d.debt_covered || 0), 0n) || 0n;
        
        return {
            totalLiquidations: (dutchData.data?.length || 0) + (flashData.data?.length || 0),
            totalValue: dutchValue + flashValue,
            averageHealthFactor: 0.95, // Calculate from data
            dutchAuctions: dutchData.data?.length || 0,
            flashLiquidations: flashData.data?.length || 0,
            gracefulResolutions: marginData.data?.length || 0
        };
    }

    // Mapping helpers
    private mapDutchAuction(row: any): DutchAuction {
        return {
            id: row.id,
            auctionId: BigInt(row.auction_id),
            userAddress: row.user_address,
            collateralAsset: row.collateral_asset,
            debtAsset: row.debt_asset,
            collateralAmount: BigInt(row.collateral_amount),
            debtAmount: BigInt(row.debt_amount),
            startTime: new Date(row.start_time),
            duration: row.duration,
            startPrice: BigInt(row.start_price),
            startDiscountBps: row.start_discount_bps,
            endDiscountBps: row.end_discount_bps,
            useExponentialDecay: row.use_exponential_decay,
            active: row.active,
            physicalDeliveryRequested: row.physical_delivery_requested
        };
    }

    private mapMarginCall(row: any): MarginCall {
        return {
            id: row.id,
            userAddress: row.user_address,
            commodityType: row.commodity_type,
            startTime: new Date(row.start_time),
            endTime: new Date(row.end_time),
            initialHealthFactor: parseFloat(row.initial_health_factor),
            requiredCollateral: BigInt(row.required_collateral),
            resolved: row.resolved,
            liquidated: row.liquidated,
            resolutionTime: row.resolution_time ? new Date(row.resolution_time) : undefined,
            collateralAdded: row.collateral_added ? BigInt(row.collateral_added) : undefined,
            newHealthFactor: row.new_health_factor ? parseFloat(row.new_health_factor) : undefined
        };
    }

    private mapFlashLiquidation(row: any): FlashLiquidation {
        return {
            id: row.id,
            liquidationId: BigInt(row.liquidation_id),
            initiatorAddress: row.initiator_address,
            userAddress: row.user_address,
            collateralAsset: row.collateral_asset,
            debtAsset: row.debt_asset,
            flashLoanAmount: BigInt(row.flash_loan_amount),
            collateralReceived: BigInt(row.collateral_received),
            debtCovered: BigInt(row.debt_covered),
            flashLoanFee: BigInt(row.flash_loan_fee),
            profit: BigInt(row.profit),
            transactionHash: row.transaction_hash,
            executedAt: new Date(row.executed_at)
        };
    }

    private mapInsuranceClaim(row: any): InsuranceClaim {
        return {
            id: row.id,
            userAddress: row.user_address,
            commodityType: row.commodity_type,
            claimAmount: BigInt(row.claim_amount),
            claimReason: row.claim_reason,
            status: row.status,
            initiatedAt: new Date(row.initiated_at),
            resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
            payoutAmount: row.payout_amount ? BigInt(row.payout_amount) : undefined
        };
    }
}
