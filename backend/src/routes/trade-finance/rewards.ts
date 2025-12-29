/**
 * Trade Finance - Rewards Routes
 * API routes for liquidity mining rewards management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RewardsService, RewardsConfigInput } from '../../services/trade-finance/RewardsService';

// ============ Request Types ============

interface ConfigureRewardsBody {
    Body: RewardsConfigInput;
}

interface GetUserRewardsParams {
    Params: { user: string };
    Querystring: { chain_id?: string };
}

interface GetConfigParams {
    Params: { asset: string };
    Querystring: { reward_token?: string };
}

interface RecordClaimBody {
    Body: {
        userAddress: string;
        rewardTokenAddress: string;
        amount: string;
        toAddress: string;
        transactionHash?: string;
        blockNumber?: number;
        claimerAddress?: string;
        rewardTokenSymbol?: string;
        chainId?: number;
    };
}

interface ClaimHistoryParams {
    Params: { user: string };
    Querystring: {
        reward_token?: string;
        from_date?: string;
        to_date?: string;
        limit?: string;
        offset?: string;
    };
}

interface AuthorizedClaimerBody {
    Body: {
        userAddress: string;
        claimerAddress: string;
        expiresAt?: string;
    };
}

interface RevokeClaimerBody {
    Body: {
        userAddress: string;
        claimerAddress: string;
    };
}

interface UpdateEmissionBody {
    Body: {
        assetAddress: string;
        rewardTokenAddress: string;
        newEmissionPerSecond: string;
    };
}

interface ExtendDistributionBody {
    Body: {
        assetAddress: string;
        rewardTokenAddress: string;
        newDistributionEnd: string;
    };
}

interface CreateSnapshotBody {
    Body: {
        assetAddress: string;
        rewardTokenAddress: string;
        chainId?: number;
    };
}

interface CheckClaimerParams {
    Params: { user: string; claimer: string };
}

interface SnapshotParams {
    Params: { asset: string; reward: string };
    Querystring: { limit?: string };
}

interface CalculateEmissionBody {
    Body: {
        baseEmission: string;
        commodityType: string;
        volatility: number;
        liquidityDepth: number;
    };
}

interface ChainIdQuery {
    Querystring: { chain_id?: string };
}

// ============ Routes ============

export async function rewardsRoutes(fastify: FastifyInstance) {
    const rewardsService = new RewardsService();

    // ============ Configuration Endpoints ============

    /**
     * POST /api/trade-finance/rewards/config
     * Configure rewards for an asset-reward pair
     */
    fastify.post<ConfigureRewardsBody>(
        '/api/trade-finance/rewards/config',
        async (request: FastifyRequest<ConfigureRewardsBody>, reply: FastifyReply) => {
            try {
                const config = await rewardsService.configureRewards(request.body);
                return reply.status(201).send({ data: config });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to configure rewards' }
                });
            }
        }
    );

    /**
     * GET /api/trade-finance/rewards/config/:asset
     * Get rewards configuration for an asset
     */
    fastify.get<GetConfigParams>(
        '/api/trade-finance/rewards/config/:asset',
        async (request: FastifyRequest<GetConfigParams>, reply: FastifyReply) => {
            try {
                const { asset } = request.params;
                const { reward_token } = request.query;
                
                const configs = await rewardsService.getRewardsConfig(asset, reward_token);
                return reply.send({ data: configs });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get config' }
                });
            }
        }
    );

    /**
     * GET /api/trade-finance/rewards/config/active
     * Get all active rewards configurations
     */
    fastify.get<ChainIdQuery>(
        '/api/trade-finance/rewards/config/active',
        async (request: FastifyRequest<ChainIdQuery>, reply: FastifyReply) => {
            try {
                const chainId = request.query.chain_id ? parseInt(request.query.chain_id) : undefined;
                const configs = await rewardsService.getAllActiveRewardsConfigs(chainId);
                return reply.send({ data: configs });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get active configs' }
                });
            }
        }
    );

    /**
     * PUT /api/trade-finance/rewards/emission
     * Update emission rate for a reward program
     */
    fastify.put<UpdateEmissionBody>(
        '/api/trade-finance/rewards/emission',
        async (request: FastifyRequest<UpdateEmissionBody>, reply: FastifyReply) => {
            try {
                const { assetAddress, rewardTokenAddress, newEmissionPerSecond } = request.body;
                const config = await rewardsService.updateEmissionRate(
                    assetAddress,
                    rewardTokenAddress,
                    newEmissionPerSecond
                );
                return reply.send({ data: config });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to update emission' }
                });
            }
        }
    );

    /**
     * PUT /api/trade-finance/rewards/extend
     * Extend distribution end date
     */
    fastify.put<ExtendDistributionBody>(
        '/api/trade-finance/rewards/extend',
        async (request: FastifyRequest<ExtendDistributionBody>, reply: FastifyReply) => {
            try {
                const { assetAddress, rewardTokenAddress, newDistributionEnd } = request.body;
                const config = await rewardsService.extendDistribution(
                    assetAddress,
                    rewardTokenAddress,
                    new Date(newDistributionEnd)
                );
                return reply.send({ data: config });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to extend distribution' }
                });
            }
        }
    );

    // ============ User Rewards Endpoints ============

    /**
     * GET /api/trade-finance/rewards/user/:user
     * Get user's rewards
     */
    fastify.get<GetUserRewardsParams>(
        '/api/trade-finance/rewards/user/:user',
        async (request: FastifyRequest<GetUserRewardsParams>, reply: FastifyReply) => {
            try {
                const { user } = request.params;
                const chainId = request.query.chain_id ? parseInt(request.query.chain_id) : undefined;
                
                const rewards = await rewardsService.getUserRewards(user, chainId);
                return reply.send({ data: rewards });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get user rewards' }
                });
            }
        }
    );


    /**
     * GET /api/trade-finance/rewards/user/:user/summary
     * Get user's rewards summary
     */
    fastify.get<GetUserRewardsParams>(
        '/api/trade-finance/rewards/user/:user/summary',
        async (request: FastifyRequest<GetUserRewardsParams>, reply: FastifyReply) => {
            try {
                const { user } = request.params;
                const summary = await rewardsService.getUserRewardsSummary(user);
                return reply.send({ data: summary });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get summary' }
                });
            }
        }
    );

    // ============ Claims Endpoints ============

    /**
     * POST /api/trade-finance/rewards/claim
     * Record a rewards claim
     */
    fastify.post<RecordClaimBody>(
        '/api/trade-finance/rewards/claim',
        async (request: FastifyRequest<RecordClaimBody>, reply: FastifyReply) => {
            try {
                const {
                    userAddress,
                    rewardTokenAddress,
                    amount,
                    toAddress,
                    transactionHash,
                    blockNumber,
                    claimerAddress,
                    rewardTokenSymbol,
                    chainId
                } = request.body;

                const claim = await rewardsService.recordClaim(
                    userAddress,
                    rewardTokenAddress,
                    amount,
                    toAddress,
                    transactionHash,
                    blockNumber,
                    claimerAddress,
                    rewardTokenSymbol,
                    chainId
                );

                return reply.status(201).send({ data: claim });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to record claim' }
                });
            }
        }
    );

    /**
     * GET /api/trade-finance/rewards/claims/:user
     * Get claim history for a user
     */
    fastify.get<ClaimHistoryParams>(
        '/api/trade-finance/rewards/claims/:user',
        async (request: FastifyRequest<ClaimHistoryParams>, reply: FastifyReply) => {
            try {
                const { user } = request.params;
                const { reward_token, from_date, to_date, limit, offset } = request.query;

                const claims = await rewardsService.getClaimHistory(user, {
                    rewardToken: reward_token,
                    fromDate: from_date ? new Date(from_date) : undefined,
                    toDate: to_date ? new Date(to_date) : undefined,
                    limit: limit ? parseInt(limit) : undefined,
                    offset: offset ? parseInt(offset) : undefined
                });

                return reply.send({ data: claims });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get claims' }
                });
            }
        }
    );

    /**
     * GET /api/trade-finance/rewards/claims/:user/total
     * Get total claimed by user
     */
    fastify.get<GetUserRewardsParams>(
        '/api/trade-finance/rewards/claims/:user/total',
        async (request: FastifyRequest<GetUserRewardsParams>, reply: FastifyReply) => {
            try {
                const { user } = request.params;
                const total = await rewardsService.getTotalClaimed(user);
                return reply.send({ data: { totalClaimed: total } });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get total' }
                });
            }
        }
    );

    // ============ Authorized Claimers Endpoints ============

    /**
     * POST /api/trade-finance/rewards/claimers/authorize
     * Set an authorized claimer
     */
    fastify.post<AuthorizedClaimerBody>(
        '/api/trade-finance/rewards/claimers/authorize',
        async (request: FastifyRequest<AuthorizedClaimerBody>, reply: FastifyReply) => {
            try {
                const { userAddress, claimerAddress, expiresAt } = request.body;
                const claimer = await rewardsService.setAuthorizedClaimer(
                    userAddress,
                    claimerAddress,
                    expiresAt ? new Date(expiresAt) : undefined
                );
                return reply.status(201).send({ data: claimer });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to authorize claimer' }
                });
            }
        }
    );

    /**
     * POST /api/trade-finance/rewards/claimers/revoke
     * Revoke an authorized claimer
     */
    fastify.post<RevokeClaimerBody>(
        '/api/trade-finance/rewards/claimers/revoke',
        async (request: FastifyRequest<RevokeClaimerBody>, reply: FastifyReply) => {
            try {
                const { userAddress, claimerAddress } = request.body;
                await rewardsService.revokeAuthorizedClaimer(userAddress, claimerAddress);
                return reply.send({ data: { success: true } });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to revoke claimer' }
                });
            }
        }
    );

    /**
     * GET /api/trade-finance/rewards/claimers/:user
     * Get authorized claimers for a user
     */
    fastify.get<GetUserRewardsParams>(
        '/api/trade-finance/rewards/claimers/:user',
        async (request: FastifyRequest<GetUserRewardsParams>, reply: FastifyReply) => {
            try {
                const { user } = request.params;
                const claimers = await rewardsService.getAuthorizedClaimers(user);
                return reply.send({ data: claimers });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get claimers' }
                });
            }
        }
    );

    /**
     * GET /api/trade-finance/rewards/claimers/:user/:claimer/check
     * Check if a claimer is authorized
     */
    fastify.get<CheckClaimerParams>(
        '/api/trade-finance/rewards/claimers/:user/:claimer/check',
        async (request: FastifyRequest<CheckClaimerParams>, reply: FastifyReply) => {
            try {
                const { user, claimer } = request.params;
                const isAuthorized = await rewardsService.isAuthorizedClaimer(user, claimer);
                return reply.send({ data: { isAuthorized } });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to check claimer' }
                });
            }
        }
    );

    // ============ Snapshots & Analytics Endpoints ============

    /**
     * POST /api/trade-finance/rewards/snapshots
     * Create a rewards snapshot
     */
    fastify.post<CreateSnapshotBody>(
        '/api/trade-finance/rewards/snapshots',
        async (request: FastifyRequest<CreateSnapshotBody>, reply: FastifyReply) => {
            try {
                const { assetAddress, rewardTokenAddress, chainId } = request.body;
                const snapshot = await rewardsService.createSnapshot(
                    assetAddress,
                    rewardTokenAddress,
                    chainId
                );
                return reply.status(201).send({ data: snapshot });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to create snapshot' }
                });
            }
        }
    );


    /**
     * GET /api/trade-finance/rewards/snapshots/:asset/:reward
     * Get snapshot history
     */
    fastify.get<SnapshotParams>(
        '/api/trade-finance/rewards/snapshots/:asset/:reward',
        async (request: FastifyRequest<SnapshotParams>, reply: FastifyReply) => {
            try {
                const { asset, reward } = request.params;
                const limit = request.query.limit ? parseInt(request.query.limit) : 30;
                
                const snapshots = await rewardsService.getSnapshotHistory(asset, reward, limit);
                return reply.send({ data: snapshots });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get snapshots' }
                });
            }
        }
    );

    /**
     * GET /api/trade-finance/rewards/snapshots/:asset/:reward/latest
     * Get latest snapshot
     */
    fastify.get<SnapshotParams>(
        '/api/trade-finance/rewards/snapshots/:asset/:reward/latest',
        async (request: FastifyRequest<SnapshotParams>, reply: FastifyReply) => {
            try {
                const { asset, reward } = request.params;
                const snapshot = await rewardsService.getLatestSnapshot(asset, reward);
                
                if (!snapshot) {
                    return reply.status(404).send({
                        error: { message: 'No snapshot found' }
                    });
                }
                
                return reply.send({ data: snapshot });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get snapshot' }
                });
            }
        }
    );

    /**
     * GET /api/trade-finance/rewards/analytics
     * Get rewards analytics
     */
    fastify.get<ChainIdQuery>(
        '/api/trade-finance/rewards/analytics',
        async (request: FastifyRequest<ChainIdQuery>, reply: FastifyReply) => {
            try {
                const chainId = request.query.chain_id ? parseInt(request.query.chain_id) : undefined;
                const analytics = await rewardsService.getRewardsAnalytics(chainId);
                return reply.send({ data: analytics });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get analytics' }
                });
            }
        }
    );

    // ============ Commodity-Specific Endpoints ============

    /**
     * POST /api/trade-finance/rewards/emission/calculate
     * Calculate adjusted emission rate
     */
    fastify.post<CalculateEmissionBody>(
        '/api/trade-finance/rewards/emission/calculate',
        async (request: FastifyRequest<CalculateEmissionBody>, reply: FastifyReply) => {
            try {
                const { baseEmission, commodityType, volatility, liquidityDepth } = request.body;
                
                const adjustedEmission = await rewardsService.calculateAdjustedEmission(
                    baseEmission,
                    commodityType,
                    volatility,
                    liquidityDepth
                );

                const seasonalMultiplier = await rewardsService.getSeasonalEmissionMultiplier(commodityType);

                return reply.send({
                    data: {
                        baseEmission,
                        adjustedEmission,
                        seasonalMultiplier,
                        commodityType
                    }
                });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to calculate emission' }
                });
            }
        }
    );

    /**
     * GET /api/trade-finance/rewards/seasonal/:commodity
     * Get seasonal multiplier for a commodity
     */
    fastify.get<{ Params: { commodity: string } }>(
        '/api/trade-finance/rewards/seasonal/:commodity',
        async (request, reply) => {
            try {
                const { commodity } = request.params;
                const multiplier = await rewardsService.getSeasonalEmissionMultiplier(commodity);
                return reply.send({
                    data: {
                        commodity,
                        multiplier,
                        month: new Date().getMonth(),
                        date: new Date().toISOString()
                    }
                });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to get seasonal multiplier' }
                });
            }
        }
    );

    /**
     * DELETE /api/trade-finance/rewards/config/:asset/:reward
     * Deactivate a rewards program
     */
    fastify.delete<{ Params: { asset: string; reward: string } }>(
        '/api/trade-finance/rewards/config/:asset/:reward',
        async (request, reply) => {
            try {
                const { asset, reward } = request.params;
                await rewardsService.deactivateRewards(asset, reward);
                return reply.send({ data: { success: true } });
            } catch (error) {
                return reply.status(500).send({
                    error: { message: error instanceof Error ? error.message : 'Failed to deactivate rewards' }
                });
            }
        }
    );
}
