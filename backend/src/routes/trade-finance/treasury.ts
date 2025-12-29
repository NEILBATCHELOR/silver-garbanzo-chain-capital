import { FastifyInstance } from 'fastify';
import { TreasuryService } from '../../services/trade-finance/TreasuryService';

/**
 * Treasury API Routes
 * Endpoints for managing protocol fees, revenue distribution, and reserves
 */

export async function treasuryRoutes(fastify: FastifyInstance) {
    const treasuryService = new TreasuryService();

    // ============ Fee Collection Routes ============

    /**
     * POST /treasury/fees/collect
     * Record fee collection
     */
    fastify.post<{
        Body: {
            tokenAddress: string;
            amount: string;
            feeSource: string;
            collectorAddress?: string;
            txHash?: string;
        };
    }>('/treasury/fees/collect', async (request, reply) => {
        try {
            const { tokenAddress, amount, feeSource, collectorAddress, txHash } = request.body;
            await treasuryService.recordFeeCollection(
                tokenAddress,
                BigInt(amount),
                feeSource as any,
                collectorAddress,
                txHash
            );
            return { success: true, message: 'Fee collection recorded' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /treasury/fees/accumulation
     * Get all fee accumulations
     */
    fastify.get('/treasury/fees/accumulation', async (request, reply) => {
        try {
            const accumulations = await treasuryService.getAllFeeAccumulations();
            return { success: true, data: accumulations };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /treasury/fees/accumulation/:tokenAddress
     * Get fee accumulation for specific token
     */
    fastify.get<{ Params: { tokenAddress: string } }>(
        '/treasury/fees/accumulation/:tokenAddress',
        async (request, reply) => {
            try {
                const { tokenAddress } = request.params;
                const accumulation = await treasuryService.getFeeAccumulation(tokenAddress);
                return { success: true, data: accumulation };
            } catch (error) {
                return reply.code(500).send({ success: false, error: (error as Error).message });
            }
        }
    );

    /**
     * GET /treasury/fees/history
     * Get fee collection history
     */
    fastify.get<{
        Querystring: {
            tokenAddress?: string;
            limit?: string;
        };
    }>('/treasury/fees/history', async (request, reply) => {
        try {
            const { tokenAddress, limit } = request.query;
            const history = await treasuryService.getFeeCollectionHistory(
                tokenAddress,
                limit ? parseInt(limit) : undefined
            );
            return { success: true, data: history };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    // ============ Revenue Recipient Routes ============

    /**
     * GET /treasury/recipients
     * Get all revenue recipients
     */
    fastify.get<{
        Querystring: {
            activeOnly?: string;
        };
    }>('/treasury/recipients', async (request, reply) => {
        try {
            const activeOnly = request.query.activeOnly === 'true';
            const recipients = await treasuryService.getRevenueRecipients(activeOnly);
            return { success: true, data: recipients };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * POST /treasury/recipients
     * Create or update revenue recipient
     */
    fastify.post<{
        Body: {
            recipientId: string;
            recipientAddress: string;
            recipientName?: string;
            recipientType: string;
            feeShareBps: number;
            active: boolean;
        };
    }>('/treasury/recipients', async (request, reply) => {
        try {
            const recipientData = request.body;
            await treasuryService.upsertRevenueRecipient(recipientData as any);
            return { success: true, message: 'Revenue recipient updated' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    // ============ Fee Distribution Routes ============

    /**
     * POST /treasury/fees/distribute
     * Record fee distribution
     */
    fastify.post<{
        Body: {
            tokenAddress: string;
            recipientId: string;
            recipientAddress: string;
            amount: string;
            shareBps: number;
            txHash?: string;
        };
    }>('/treasury/fees/distribute', async (request, reply) => {
        try {
            const { tokenAddress, recipientId, recipientAddress, amount, shareBps, txHash } = request.body;
            await treasuryService.recordFeeDistribution(
                tokenAddress,
                recipientId,
                recipientAddress,
                BigInt(amount),
                shareBps,
                txHash
            );
            return { success: true, message: 'Fee distribution recorded' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /treasury/fees/distributions
     * Get distribution history
     */
    fastify.get<{
        Querystring: {
            tokenAddress?: string;
            recipientId?: string;
            limit?: string;
        };
    }>('/treasury/fees/distributions', async (request, reply) => {
        try {
            const { tokenAddress, recipientId, limit } = request.query;
            const history = await treasuryService.getDistributionHistory(
                tokenAddress,
                recipientId,
                limit ? parseInt(limit) : undefined
            );
            return { success: true, data: history };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    // ============ Payment Stream Routes ============

    /**
     * POST /treasury/streams
     * Create payment stream
     */
    fastify.post<{
        Body: {
            streamId: string;
            senderAddress: string;
            recipientAddress: string;
            tokenAddress: string;
            depositAmount: string;
            startTime: string;
            stopTime: string;
            remainingBalance: string;
            ratePerSecond: string;
        };
    }>('/treasury/streams', async (request, reply) => {
        try {
            const streamData = request.body;
            await treasuryService.createPaymentStream({
                streamId: BigInt(streamData.streamId),
                senderAddress: streamData.senderAddress,
                recipientAddress: streamData.recipientAddress,
                tokenAddress: streamData.tokenAddress,
                depositAmount: BigInt(streamData.depositAmount),
                startTime: new Date(streamData.startTime),
                stopTime: new Date(streamData.stopTime),
                remainingBalance: BigInt(streamData.remainingBalance),
                ratePerSecond: BigInt(streamData.ratePerSecond)
            });
            return { success: true, message: 'Payment stream created' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /treasury/streams
     * Get payment streams
     */
    fastify.get<{
        Querystring: {
            recipientAddress?: string;
            activeOnly?: string;
        };
    }>('/treasury/streams', async (request, reply) => {
        try {
            const { recipientAddress, activeOnly } = request.query;
            const streams = await treasuryService.getPaymentStreams(
                recipientAddress,
                activeOnly === 'true'
            );
            return { success: true, data: streams };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * POST /treasury/streams/:streamId/withdraw
     * Record stream withdrawal
     */
    fastify.post<{
        Params: { streamId: string };
        Body: {
            recipientAddress: string;
            amount: string;
            txHash?: string;
        };
    }>('/treasury/streams/:streamId/withdraw', async (request, reply) => {
        try {
            const { streamId } = request.params;
            const { recipientAddress, amount, txHash } = request.body;
            
            await treasuryService.recordStreamWithdrawal(
                BigInt(streamId),
                recipientAddress,
                BigInt(amount),
                txHash
            );
            
            return { success: true, message: 'Stream withdrawal recorded' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * POST /treasury/streams/:streamId/cancel
     * Cancel payment stream
     */
    fastify.post<{ Params: { streamId: string } }>(
        '/treasury/streams/:streamId/cancel',
        async (request, reply) => {
            try {
                const { streamId } = request.params;
                await treasuryService.cancelStream(BigInt(streamId));
                return { success: true, message: 'Stream canceled' };
            } catch (error) {
                return reply.code(500).send({ success: false, error: (error as Error).message });
            }
        }
    );

    // ============ Protocol Reserve Routes ============

    /**
     * POST /treasury/reserve
     * Update protocol reserve
     */
    fastify.post<{
        Body: {
            tokenAddress: string;
            transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'ALLOCATION' | 'DEALLOCATION';
            amount: string;
            purpose?: string;
            authorizedBy?: string;
            txHash?: string;
        };
    }>('/treasury/reserve', async (request, reply) => {
        try {
            const { tokenAddress, transactionType, amount, purpose, authorizedBy, txHash } = request.body;
            await treasuryService.updateProtocolReserve(
                tokenAddress,
                transactionType,
                BigInt(amount),
                purpose,
                authorizedBy,
                txHash
            );
            return { success: true, message: 'Reserve updated' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /treasury/reserve
     * Get all protocol reserves
     */
    fastify.get('/treasury/reserve', async (request, reply) => {
        try {
            const reserves = await treasuryService.getAllProtocolReserves();
            return { success: true, data: reserves };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /treasury/reserve/:tokenAddress
     * Get protocol reserve for specific token
     */
    fastify.get<{ Params: { tokenAddress: string } }>(
        '/treasury/reserve/:tokenAddress',
        async (request, reply) => {
            try {
                const { tokenAddress } = request.params;
                const reserve = await treasuryService.getProtocolReserve(tokenAddress);
                return { success: true, data: reserve };
            } catch (error) {
                return reply.code(500).send({ success: false, error: (error as Error).message });
            }
        }
    );

    // ============ Analytics Routes ============

    /**
     * POST /treasury/snapshot/:tokenAddress
     * Create treasury snapshot
     */
    fastify.post<{ Params: { tokenAddress: string } }>(
        '/treasury/snapshot/:tokenAddress',
        async (request, reply) => {
            try {
                const { tokenAddress } = request.params;
                await treasuryService.createTreasurySnapshot(tokenAddress);
                return { success: true, message: 'Snapshot created' };
            } catch (error) {
                return reply.code(500).send({ success: false, error: (error as Error).message });
            }
        }
    );

    /**
     * GET /treasury/analytics
     * Get treasury analytics
     */
    fastify.get<{
        Querystring: {
            days?: string;
        };
    }>('/treasury/analytics', async (request, reply) => {
        try {
            const days = request.query.days ? parseInt(request.query.days) : 30;
            const analytics = await treasuryService.getTreasuryAnalytics(days);
            
            // Convert BigInt to string for JSON serialization
            const serializable = {
                ...analytics,
                totalFeesCollected: analytics.totalFeesCollected.toString(),
                totalDistributed: analytics.totalDistributed.toString(),
                protocolReserve: analytics.protocolReserve.toString(),
                streamingPayments: analytics.streamingPayments.toString(),
                revenueBySource: Object.entries(analytics.revenueBySource).reduce(
                    (acc, [key, value]) => ({ ...acc, [key]: value.toString() }),
                    {}
                )
            };
            
            return { success: true, data: serializable };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });
}
