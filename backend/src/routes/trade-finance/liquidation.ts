import { FastifyInstance } from 'fastify';
import { LiquidationService } from '../../services/trade-finance/LiquidationService';

/**
 * Liquidation API Routes
 * Endpoints for managing liquidations, margin calls, and insurance claims
 */

export async function liquidationRoutes(fastify: FastifyInstance) {
    const liquidationService = new LiquidationService();

    // ============ Dutch Auction Routes ============

    /**
     * GET /liquidation/auctions/active
     * Get all active Dutch auctions
     */
    fastify.get('/liquidation/auctions/active', async (request, reply) => {
        try {
            const auctions = await liquidationService.getActiveAuctions();
            return { success: true, data: auctions };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /liquidation/auctions/:userAddress
     * Get auctions for a specific user
     */
    fastify.get<{ Params: { userAddress: string } }>(
        '/liquidation/auctions/:userAddress',
        async (request, reply) => {
            try {
                const { userAddress } = request.params;
                const auctions = await liquidationService.getUserAuctions(userAddress);
                return { success: true, data: auctions };
            } catch (error) {
                return reply.code(500).send({ success: false, error: (error as Error).message });
            }
        }
    );

    /**
     * POST /liquidation/auctions
     * Record a new Dutch auction (called by smart contract events)
     */
    fastify.post<{ Body: Record<string, any> }>('/liquidation/auctions', async (request, reply) => {
        try {
            const auctionData = request.body as any;
            await liquidationService.recordDutchAuction(auctionData);
            return { success: true, message: 'Auction recorded' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * POST /liquidation/auctions/:auctionId/execute
     * Record auction execution
     */
    fastify.post<{ 
        Params: { auctionId: string };
        Body: {
            liquidatorAddress: string;
            collateralReceived: string;
            debtPaid: string;
            finalPrice: string;
            txHash?: string;
        };
    }>('/liquidation/auctions/:auctionId/execute', async (request, reply) => {
        try {
            const { auctionId } = request.params;
            const { liquidatorAddress, collateralReceived, debtPaid, finalPrice, txHash } = request.body;
            
            await liquidationService.recordAuctionExecution(
                BigInt(auctionId),
                liquidatorAddress,
                BigInt(collateralReceived),
                BigInt(debtPaid),
                BigInt(finalPrice),
                txHash
            );
            
            return { success: true, message: 'Auction execution recorded' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    // ============ Margin Call Routes ============

    /**
     * GET /liquidation/margin-calls/active
     * Get all active margin calls
     */
    fastify.get('/liquidation/margin-calls/active', async (request, reply) => {
        try {
            const marginCalls = await liquidationService.getActiveMarginCalls();
            return { success: true, data: marginCalls };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /liquidation/margin-calls/:userAddress
     * Get margin calls for a specific user
     */
    fastify.get<{ Params: { userAddress: string } }>(
        '/liquidation/margin-calls/:userAddress',
        async (request, reply) => {
            try {
                const { userAddress } = request.params;
                const marginCalls = await liquidationService.getUserMarginCalls(userAddress);
                return { success: true, data: marginCalls };
            } catch (error) {
                return reply.code(500).send({ success: false, error: (error as Error).message });
            }
        }
    );

    /**
     * POST /liquidation/margin-calls
     * Record a new margin call
     */
    fastify.post<{ Body: Record<string, any> }>('/liquidation/margin-calls', async (request, reply) => {
        try {
            const marginCallData = request.body as any;
            await liquidationService.recordMarginCall(marginCallData);
            return { success: true, message: 'Margin call recorded' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * POST /liquidation/margin-calls/:userAddress/resolve
     * Record margin call resolution
     */
    fastify.post<{
        Params: { userAddress: string };
        Body: {
            collateralAdded: string;
            newHealthFactor: number;
        };
    }>('/liquidation/margin-calls/:userAddress/resolve', async (request, reply) => {
        try {
            const { userAddress } = request.params;
            const { collateralAdded, newHealthFactor } = request.body;
            
            await liquidationService.resolveMarginCall(
                userAddress,
                BigInt(collateralAdded),
                newHealthFactor
            );
            
            return { success: true, message: 'Margin call resolved' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    // ============ Health Warning Routes ============

    /**
     * POST /liquidation/warnings
     * Record health factor warning
     */
    fastify.post<{
        Body: {
            userAddress: string;
            healthFactor: number;
            warningType: 'LOW' | 'CRITICAL' | 'MARGIN_CALL';
        };
    }>('/liquidation/warnings', async (request, reply) => {
        try {
            const { userAddress, healthFactor, warningType } = request.body;
            await liquidationService.recordHealthWarning(userAddress, healthFactor, warningType);
            return { success: true, message: 'Warning recorded' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    // ============ Flash Liquidation Routes ============

    /**
     * GET /liquidation/flash
     * Get flash liquidation history
     */
    fastify.get<{
        Querystring: {
            initiatorAddress?: string;
            limit?: string;
        };
    }>('/liquidation/flash', async (request, reply) => {
        try {
            const { initiatorAddress, limit } = request.query;
            const liquidations = await liquidationService.getFlashLiquidations(
                initiatorAddress,
                limit ? parseInt(limit) : undefined
            );
            return { success: true, data: liquidations };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * POST /liquidation/flash
     * Record flash liquidation
     */
    fastify.post<{ Body: Record<string, any> }>('/liquidation/flash', async (request, reply) => {
        try {
            const liquidationData = request.body as any;
            await liquidationService.recordFlashLiquidation(liquidationData);
            return { success: true, message: 'Flash liquidation recorded' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    // ============ Insurance Claim Routes ============

    /**
     * POST /liquidation/insurance-claims
     * Create insurance claim
     */
    fastify.post<{
        Body: {
            userAddress: string;
            commodityType: string;
            claimAmount: string;
            claimReason?: string;
        };
    }>('/liquidation/insurance-claims', async (request, reply) => {
        try {
            const { userAddress, commodityType, claimAmount, claimReason } = request.body;
            await liquidationService.createInsuranceClaim({
                userAddress,
                commodityType,
                claimAmount: BigInt(claimAmount),
                claimReason
            });
            return { success: true, message: 'Insurance claim created' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /liquidation/insurance-claims
     * Get insurance claims
     */
    fastify.get<{
        Querystring: {
            userAddress?: string;
            status?: string;
        };
    }>('/liquidation/insurance-claims', async (request, reply) => {
        try {
            const { userAddress, status } = request.query;
            const claims = await liquidationService.getInsuranceClaims(userAddress, status);
            return { success: true, data: claims };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    /**
     * PATCH /liquidation/insurance-claims/:claimId
     * Update insurance claim status
     */
    fastify.patch<{
        Params: { claimId: string };
        Body: {
            status: 'APPROVED' | 'REJECTED' | 'PAID';
            payoutAmount?: string;
        };
    }>('/liquidation/insurance-claims/:claimId', async (request, reply) => {
        try {
            const { claimId } = request.params;
            const { status, payoutAmount } = request.body;
            
            await liquidationService.updateInsuranceClaimStatus(
                claimId,
                status,
                payoutAmount ? BigInt(payoutAmount) : undefined
            );
            
            return { success: true, message: 'Claim status updated' };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });

    // ============ Analytics Routes ============

    /**
     * GET /liquidation/analytics
     * Get liquidation analytics
     */
    fastify.get<{
        Querystring: {
            days?: string;
        };
    }>('/liquidation/analytics', async (request, reply) => {
        try {
            const days = request.query.days ? parseInt(request.query.days) : 30;
            const analytics = await liquidationService.getLiquidationAnalytics(days);
            return { success: true, data: analytics };
        } catch (error) {
            return reply.code(500).send({ success: false, error: (error as Error).message });
        }
    });
}
