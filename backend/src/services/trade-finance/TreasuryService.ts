import { supabase } from '../../infrastructure/database/supabase';

/**
 * TreasuryService
 * Handles protocol treasury operations including:
 * - Fee collection and accumulation
 * - Revenue distribution to recipients
 * - Payment streams
 * - Protocol reserve management
 */

export interface FeeCollection {
    id: string;
    tokenAddress: string;
    amount: bigint;
    feeSource: 'INTEREST_SPREAD' | 'FLASH_LOAN' | 'LIQUIDATION_BONUS' | 'ORACLE_SUBSCRIPTION' | 'POSITION_MANAGEMENT' | 'OTHER';
    collectorAddress?: string;
    transactionHash?: string;
    collectedAt: Date;
}

export interface FeeAccumulation {
    id: string;
    tokenAddress: string;
    currentAmount: bigint;
    totalCollected: bigint;
    lastCollected?: Date;
    lastDistributed?: Date;
}

export interface RevenueRecipient {
    id: string;
    recipientId: string;
    recipientAddress: string;
    recipientName?: string;
    recipientType: 'TREASURY' | 'TEAM' | 'INSURANCE_FUND' | 'DEVELOPMENT_FUND' | 'COMMUNITY' | 'OPERATIONS';
    feeShareBps: number;
    active: boolean;
}

export interface FeeDistribution {
    id: string;
    tokenAddress: string;
    recipientId: string;
    recipientAddress: string;
    amount: bigint;
    shareBps: number;
    transactionHash?: string;
    distributedAt: Date;
}

export interface PaymentStream {
    id: string;
    streamId: bigint;
    senderAddress: string;
    recipientAddress: string;
    tokenAddress: string;
    depositAmount: bigint;
    startTime: Date;
    stopTime: Date;
    remainingBalance: bigint;
    ratePerSecond: bigint;
    withdrawnAmount: bigint;
    canceled: boolean;
}

export interface ProtocolReserve {
    id: string;
    tokenAddress: string;
    totalBalance: bigint;
    allocatedAmount: bigint;
    availableAmount: bigint;
    lastDeposit?: Date;
    lastWithdrawal?: Date;
}

export class TreasuryService {
    /**
     * Record fee collection
     */
    async recordFeeCollection(
        tokenAddress: string,
        amount: bigint,
        feeSource: FeeCollection['feeSource'],
        collectorAddress?: string,
        txHash?: string
    ): Promise<void> {
        // Insert collection record
        const { error: collectionError } = await supabase
            .from('trade_finance_fee_collections')
            .insert({
                token_address: tokenAddress.toLowerCase(),
                amount: amount.toString(),
                fee_source: feeSource,
                collector_address: collectorAddress?.toLowerCase(),
                transaction_hash: txHash
            });
            
        if (collectionError) throw collectionError;
        
        // Update accumulation
        const { data: existing } = await supabase
            .from('trade_finance_fee_accumulations')
            .select('*')
            .eq('token_address', tokenAddress.toLowerCase())
            .single();
            
        if (existing) {
            await supabase
                .from('trade_finance_fee_accumulations')
                .update({
                    current_amount: (BigInt(existing.current_amount) + amount).toString(),
                    total_collected: (BigInt(existing.total_collected) + amount).toString(),
                    last_collected: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('token_address', tokenAddress.toLowerCase());
        } else {
            await supabase
                .from('trade_finance_fee_accumulations')
                .insert({
                    token_address: tokenAddress.toLowerCase(),
                    current_amount: amount.toString(),
                    total_collected: amount.toString(),
                    last_collected: new Date().toISOString()
                });
        }
    }

    /**
     * Get fee accumulation for token
     */
    async getFeeAccumulation(tokenAddress: string): Promise<FeeAccumulation | null> {
        const { data, error } = await supabase
            .from('trade_finance_fee_accumulations')
            .select('*')
            .eq('token_address', tokenAddress.toLowerCase())
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }
        
        return this.mapFeeAccumulation(data);
    }

    /**
     * Get all fee accumulations
     */
    async getAllFeeAccumulations(): Promise<FeeAccumulation[]> {
        const { data, error } = await supabase
            .from('trade_finance_fee_accumulations')
            .select('*')
            .order('total_collected', { ascending: false });
            
        if (error) throw error;
        
        return data.map(this.mapFeeAccumulation);
    }

    /**
     * Get fee collection history
     */
    async getFeeCollectionHistory(
        tokenAddress?: string,
        limit: number = 100
    ): Promise<FeeCollection[]> {
        let query = supabase
            .from('trade_finance_fee_collections')
            .select('*')
            .order('collected_at', { ascending: false })
            .limit(limit);
            
        if (tokenAddress) {
            query = query.eq('token_address', tokenAddress.toLowerCase());
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        return data.map(this.mapFeeCollection);
    }

    /**
     * Create or update revenue recipient
     */
    async upsertRevenueRecipient(recipient: Omit<RevenueRecipient, 'id'>): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_revenue_recipients')
            .upsert({
                recipient_id: recipient.recipientId,
                recipient_address: recipient.recipientAddress.toLowerCase(),
                recipient_name: recipient.recipientName,
                recipient_type: recipient.recipientType,
                fee_share_bps: recipient.feeShareBps,
                active: recipient.active,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'recipient_id'
            });
            
        if (error) throw error;
    }

    /**
     * Get all revenue recipients
     */
    async getRevenueRecipients(activeOnly: boolean = false): Promise<RevenueRecipient[]> {
        let query = supabase
            .from('trade_finance_revenue_recipients')
            .select('*')
            .order('fee_share_bps', { ascending: false });
            
        if (activeOnly) {
            query = query.eq('active', true);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        return data.map(this.mapRevenueRecipient);
    }

    /**
     * Record fee distribution
     */
    async recordFeeDistribution(
        tokenAddress: string,
        recipientId: string,
        recipientAddress: string,
        amount: bigint,
        shareBps: number,
        txHash?: string
    ): Promise<void> {
        // Record distribution
        const { error: distributionError } = await supabase
            .from('trade_finance_fee_distributions')
            .insert({
                token_address: tokenAddress.toLowerCase(),
                recipient_id: recipientId,
                recipient_address: recipientAddress.toLowerCase(),
                amount: amount.toString(),
                share_bps: shareBps,
                transaction_hash: txHash
            });
            
        if (distributionError) throw distributionError;
        
        // Update accumulation
        const { data: accumulation } = await supabase
            .from('trade_finance_fee_accumulations')
            .select('current_amount')
            .eq('token_address', tokenAddress.toLowerCase())
            .single();
            
        if (accumulation) {
            const newAmount = BigInt(accumulation.current_amount) - amount;
            await supabase
                .from('trade_finance_fee_accumulations')
                .update({
                    current_amount: newAmount.toString(),
                    last_distributed: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('token_address', tokenAddress.toLowerCase());
        }
    }

    /**
     * Get distribution history
     */
    async getDistributionHistory(
        tokenAddress?: string,
        recipientId?: string,
        limit: number = 100
    ): Promise<FeeDistribution[]> {
        let query = supabase
            .from('trade_finance_fee_distributions')
            .select('*')
            .order('distributed_at', { ascending: false })
            .limit(limit);
            
        if (tokenAddress) {
            query = query.eq('token_address', tokenAddress.toLowerCase());
        }
        if (recipientId) {
            query = query.eq('recipient_id', recipientId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        return data.map(this.mapFeeDistribution);
    }

    /**
     * Create payment stream
     */
    async createPaymentStream(stream: Omit<PaymentStream, 'id' | 'withdrawnAmount' | 'canceled'>): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_payment_streams')
            .insert({
                stream_id: stream.streamId.toString(),
                sender_address: stream.senderAddress.toLowerCase(),
                recipient_address: stream.recipientAddress.toLowerCase(),
                token_address: stream.tokenAddress.toLowerCase(),
                deposit_amount: stream.depositAmount.toString(),
                start_time: stream.startTime.toISOString(),
                stop_time: stream.stopTime.toISOString(),
                remaining_balance: stream.remainingBalance.toString(),
                rate_per_second: stream.ratePerSecond.toString(),
                withdrawn_amount: '0',
                canceled: false
            });
            
        if (error) throw error;
    }

    /**
     * Record stream withdrawal
     */
    async recordStreamWithdrawal(
        streamId: bigint,
        recipientAddress: string,
        amount: bigint,
        txHash?: string
    ): Promise<void> {
        // Record withdrawal
        const { error: withdrawalError } = await supabase
            .from('trade_finance_stream_withdrawals')
            .insert({
                stream_id: streamId.toString(),
                recipient_address: recipientAddress.toLowerCase(),
                amount: amount.toString(),
                transaction_hash: txHash
            });
            
        if (withdrawalError) throw withdrawalError;
        
        // Update stream
        const { data: stream } = await supabase
            .from('trade_finance_payment_streams')
            .select('withdrawn_amount, remaining_balance')
            .eq('stream_id', streamId.toString())
            .single();
            
        if (stream) {
            await supabase
                .from('trade_finance_payment_streams')
                .update({
                    withdrawn_amount: (BigInt(stream.withdrawn_amount) + amount).toString(),
                    remaining_balance: (BigInt(stream.remaining_balance) - amount).toString(),
                    updated_at: new Date().toISOString()
                })
                .eq('stream_id', streamId.toString());
        }
    }

    /**
     * Cancel stream
     */
    async cancelStream(streamId: bigint): Promise<void> {
        const { error } = await supabase
            .from('trade_finance_payment_streams')
            .update({
                canceled: true,
                updated_at: new Date().toISOString()
            })
            .eq('stream_id', streamId.toString());
            
        if (error) throw error;
    }

    /**
     * Get payment streams
     */
    async getPaymentStreams(
        recipientAddress?: string,
        activeOnly: boolean = false
    ): Promise<PaymentStream[]> {
        let query = supabase
            .from('trade_finance_payment_streams')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (recipientAddress) {
            query = query.eq('recipient_address', recipientAddress.toLowerCase());
        }
        if (activeOnly) {
            query = query.eq('canceled', false);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        return data.map(this.mapPaymentStream);
    }

    /**
     * Update protocol reserve
     */
    async updateProtocolReserve(
        tokenAddress: string,
        transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'ALLOCATION' | 'DEALLOCATION',
        amount: bigint,
        purpose?: string,
        authorizedBy?: string,
        txHash?: string
    ): Promise<void> {
        // Record transaction
        const { error: txError } = await supabase
            .from('trade_finance_reserve_transactions')
            .insert({
                token_address: tokenAddress.toLowerCase(),
                transaction_type: transactionType,
                amount: amount.toString(),
                purpose,
                authorized_by: authorizedBy?.toLowerCase(),
                transaction_hash: txHash
            });
            
        if (txError) throw txError;
        
        // Update reserve balance
        const { data: reserve } = await supabase
            .from('trade_finance_protocol_reserve')
            .select('*')
            .eq('token_address', tokenAddress.toLowerCase())
            .single();
            
        const updateData: any = { updated_at: new Date().toISOString() };
        
        if (reserve) {
            const totalBalance = BigInt(reserve.total_balance);
            const allocatedAmount = BigInt(reserve.allocated_amount);
            
            if (transactionType === 'DEPOSIT') {
                updateData.total_balance = (totalBalance + amount).toString();
                updateData.available_amount = (totalBalance + amount - allocatedAmount).toString();
                updateData.last_deposit = new Date().toISOString();
            } else if (transactionType === 'WITHDRAWAL') {
                updateData.total_balance = (totalBalance - amount).toString();
                updateData.available_amount = (totalBalance - amount - allocatedAmount).toString();
                updateData.last_withdrawal = new Date().toISOString();
            } else if (transactionType === 'ALLOCATION') {
                updateData.allocated_amount = (allocatedAmount + amount).toString();
                updateData.available_amount = (totalBalance - allocatedAmount - amount).toString();
            } else if (transactionType === 'DEALLOCATION') {
                updateData.allocated_amount = (allocatedAmount - amount).toString();
                updateData.available_amount = (totalBalance - allocatedAmount + amount).toString();
            }
            
            await supabase
                .from('trade_finance_protocol_reserve')
                .update(updateData)
                .eq('token_address', tokenAddress.toLowerCase());
        } else {
            // Create new reserve entry
            await supabase
                .from('trade_finance_protocol_reserve')
                .insert({
                    token_address: tokenAddress.toLowerCase(),
                    total_balance: amount.toString(),
                    allocated_amount: '0',
                    available_amount: amount.toString(),
                    last_deposit: new Date().toISOString()
                });
        }
    }

    /**
     * Get protocol reserve
     */
    async getProtocolReserve(tokenAddress: string): Promise<ProtocolReserve | null> {
        const { data, error } = await supabase
            .from('trade_finance_protocol_reserve')
            .select('*')
            .eq('token_address', tokenAddress.toLowerCase())
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        
        return this.mapProtocolReserve(data);
    }

    /**
     * Get all protocol reserves
     */
    async getAllProtocolReserves(): Promise<ProtocolReserve[]> {
        const { data, error } = await supabase
            .from('trade_finance_protocol_reserve')
            .select('*')
            .order('total_balance', { ascending: false });
            
        if (error) throw error;
        
        return data.map(this.mapProtocolReserve);
    }

    /**
     * Create treasury snapshot
     */
    async createTreasurySnapshot(tokenAddress: string): Promise<void> {
        const [accumulation, reserve] = await Promise.all([
            this.getFeeAccumulation(tokenAddress),
            this.getProtocolReserve(tokenAddress)
        ]);
        
        const { data: distributions } = await supabase
            .from('trade_finance_fee_distributions')
            .select('amount')
            .eq('token_address', tokenAddress.toLowerCase());
            
        const totalDistributed = distributions?.reduce((sum: bigint, d: any) => sum + BigInt(d.amount), 0n) || 0n;
        
        const { error } = await supabase
            .from('trade_finance_treasury_snapshots')
            .insert({
                token_address: tokenAddress.toLowerCase(),
                balance: (accumulation?.currentAmount || 0n).toString(),
                accumulated_fees: (accumulation?.totalCollected || 0n).toString(),
                distributed_amount: totalDistributed.toString(),
                reserve_balance: (reserve?.totalBalance || 0n).toString(),
                snapshot_date: new Date().toISOString().split('T')[0]
            });
            
        if (error && error.code !== '23505') throw error; // Ignore duplicate
    }

    /**
     * Get treasury analytics
     */
    async getTreasuryAnalytics(days: number = 30): Promise<{
        totalFeesCollected: bigint;
        totalDistributed: bigint;
        protocolReserve: bigint;
        streamingPayments: bigint;
        revenueBySource: Record<string, bigint>;
    }> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const [collections, distributions, reserves, streams] = await Promise.all([
            supabase
                .from('trade_finance_fee_collections')
                .select('amount, fee_source')
                .gte('collected_at', startDate.toISOString()),
            supabase
                .from('trade_finance_fee_distributions')
                .select('amount')
                .gte('distributed_at', startDate.toISOString()),
            supabase
                .from('trade_finance_protocol_reserve')
                .select('total_balance'),
            supabase
                .from('trade_finance_payment_streams')
                .select('remaining_balance')
                .eq('canceled', false)
        ]);
        
        const totalFeesCollected = collections.data?.reduce((sum: bigint, c: any) => sum + BigInt(c.amount), 0n) || 0n;
        const totalDistributed = distributions.data?.reduce((sum: bigint, d: any) => sum + BigInt(d.amount), 0n) || 0n;
        const protocolReserve = reserves.data?.reduce((sum: bigint, r: any) => sum + BigInt(r.total_balance), 0n) || 0n;
        const streamingPayments = streams.data?.reduce((sum: bigint, s: any) => sum + BigInt(s.remaining_balance), 0n) || 0n;
        
        const revenueBySource: Record<string, bigint> = {};
        if (collections.data) {
            collections.data.forEach((c: any) => {
                revenueBySource[c.fee_source] = (revenueBySource[c.fee_source] || 0n) + BigInt(c.amount);
            });
        }
        
        return {
            totalFeesCollected,
            totalDistributed,
            protocolReserve,
            streamingPayments,
            revenueBySource
        };
    }

    // Mapping helpers
    private mapFeeCollection(row: any): FeeCollection {
        return {
            id: row.id,
            tokenAddress: row.token_address,
            amount: BigInt(row.amount),
            feeSource: row.fee_source,
            collectorAddress: row.collector_address,
            transactionHash: row.transaction_hash,
            collectedAt: new Date(row.collected_at)
        };
    }

    private mapFeeAccumulation(row: any): FeeAccumulation {
        return {
            id: row.id,
            tokenAddress: row.token_address,
            currentAmount: BigInt(row.current_amount),
            totalCollected: BigInt(row.total_collected),
            lastCollected: row.last_collected ? new Date(row.last_collected) : undefined,
            lastDistributed: row.last_distributed ? new Date(row.last_distributed) : undefined
        };
    }

    private mapRevenueRecipient(row: any): RevenueRecipient {
        return {
            id: row.id,
            recipientId: row.recipient_id,
            recipientAddress: row.recipient_address,
            recipientName: row.recipient_name,
            recipientType: row.recipient_type,
            feeShareBps: row.fee_share_bps,
            active: row.active
        };
    }

    private mapFeeDistribution(row: any): FeeDistribution {
        return {
            id: row.id,
            tokenAddress: row.token_address,
            recipientId: row.recipient_id,
            recipientAddress: row.recipient_address,
            amount: BigInt(row.amount),
            shareBps: row.share_bps,
            transactionHash: row.transaction_hash,
            distributedAt: new Date(row.distributed_at)
        };
    }

    private mapPaymentStream(row: any): PaymentStream {
        return {
            id: row.id,
            streamId: BigInt(row.stream_id),
            senderAddress: row.sender_address,
            recipientAddress: row.recipient_address,
            tokenAddress: row.token_address,
            depositAmount: BigInt(row.deposit_amount),
            startTime: new Date(row.start_time),
            stopTime: new Date(row.stop_time),
            remainingBalance: BigInt(row.remaining_balance),
            ratePerSecond: BigInt(row.rate_per_second),
            withdrawnAmount: BigInt(row.withdrawn_amount),
            canceled: row.canceled
        };
    }

    private mapProtocolReserve(row: any): ProtocolReserve {
        return {
            id: row.id,
            tokenAddress: row.token_address,
            totalBalance: BigInt(row.total_balance),
            allocatedAmount: BigInt(row.allocated_amount),
            availableAmount: BigInt(row.available_amount),
            lastDeposit: row.last_deposit ? new Date(row.last_deposit) : undefined,
            lastWithdrawal: row.last_withdrawal ? new Date(row.last_withdrawal) : undefined
        };
    }
}
