/**
 * PSP Spreads Service
 * Manages fiat-to-crypto trading spreads configuration
 */

import { BaseService } from '../BaseService';
import { PrismaClient } from '@/infrastructure/database/generated/index';
import { logger } from '@/utils/logger';
import {
  SpreadConfig,
  SpreadMatrixRow,
  UpdateSpreadRequest,
  BulkUpdateSpreadsRequest,
  CopySpreadRequest,
  SupportedPSPCryptoAsset,
  SupportedPSPNetwork,
  DEFAULT_FIAT_TIERS
} from '@/types/psp-market-rates';

export class PSPSpreadsService extends BaseService {
  constructor() {
    super('PSPSpreads');
  }

  /**
   * Get spread configuration for a specific tier
   */
  async getSpread(
    projectId: string,
    cryptoAsset: SupportedPSPCryptoAsset,
    network: SupportedPSPNetwork | null,
    transactionAmount: number
  ): Promise<SpreadConfig | null> {
    try {
      const spread = await this.prisma.psp_fiat_crypto_spreads.findFirst({
        where: {
          project_id: projectId,
          crypto_asset: cryptoAsset,
          network: network || null,
          is_active: true,
          tier_min: { lte: transactionAmount },
          OR: [
            { tier_max: null },
            { tier_max: { gt: transactionAmount } }
          ]
        },
        orderBy: { tier_min: 'desc' }
      });

      if (!spread) {
        return null;
      }

      return this.mapToSpreadConfig(spread);
    } catch (error) {
      this.logError('Failed to get spread', { error, projectId, cryptoAsset, transactionAmount });
      throw error;
    }
  }

  /**
   * Get all spreads for a project as a matrix
   */
  async getSpreadMatrix(projectId: string): Promise<SpreadMatrixRow[]> {
    try {
      const spreads = await this.prisma.psp_fiat_crypto_spreads.findMany({
        where: {
          project_id: projectId,
          is_active: true
        },
        orderBy: [
          { crypto_asset: 'asc' },
          { network: 'asc' },
          { tier_min: 'asc' }
        ]
      });

      // Group by asset and network
      const matrixMap = new Map<string, SpreadMatrixRow>();

      for (const spread of spreads) {
        const key = `${spread.crypto_asset}-${spread.network || 'default'}`;
        
        if (!matrixMap.has(key)) {
          matrixMap.set(key, {
            cryptoAsset: spread.crypto_asset as SupportedPSPCryptoAsset,
            network: spread.network as SupportedPSPNetwork | null,
            tiers: []
          });
        }

        const row = matrixMap.get(key)!;
        row.tiers.push({
          tierName: spread.tier_name,
          tierMin: Number(spread.tier_min),
          tierMax: spread.tier_max ? Number(spread.tier_max) : null,
          buySpreadBps: spread.buy_spread_bps,
          sellSpreadBps: spread.sell_spread_bps,
          configId: spread.id
        });
      }

      return Array.from(matrixMap.values());
    } catch (error) {
      this.logError('Failed to get spread matrix', { error, projectId });
      throw error;
    }
  }

  /**
   * Update a single spread configuration
   */
  async updateSpread(
    request: UpdateSpreadRequest,
    userId?: string
  ): Promise<SpreadConfig> {
    try {
      // Build where clause that handles nullable fields properly
      const whereClause = {
        project_id: request.projectId,
        crypto_asset: request.cryptoAsset,
        tier_min: request.tierMin,
        network: request.network === null ? { equals: null } : request.network,
        tier_max: request.tierMax === null ? { equals: null } : request.tierMax
      };

      // Check if spread exists
      const existing = await this.prisma.psp_fiat_crypto_spreads.findFirst({
        where: whereClause
      });

      let spread;
      if (existing) {
        // Update existing spread
        spread = await this.prisma.psp_fiat_crypto_spreads.update({
          where: { id: existing.id },
          data: {
            buy_spread_bps: request.buySpreadBps,
            sell_spread_bps: request.sellSpreadBps,
            updated_by: userId
          }
        });
      } else {
        // Create new spread
        spread = await this.prisma.psp_fiat_crypto_spreads.create({
          data: {
            project_id: request.projectId,
            crypto_asset: request.cryptoAsset,
            network: request.network,
            tier_name: request.tierName,
            tier_min: request.tierMin,
            tier_max: request.tierMax,
            buy_spread_bps: request.buySpreadBps,
            sell_spread_bps: request.sellSpreadBps,
            is_active: true,
            created_by: userId
          }
        });
      }

      return this.mapToSpreadConfig(spread);
    } catch (error) {
      this.logError('Failed to update spread', { error, request });
      throw error;
    }
  }

  /**
   * Bulk update spreads
   */
  async bulkUpdateSpreads(
    request: BulkUpdateSpreadsRequest,
    userId?: string
  ): Promise<SpreadConfig[]> {
    try {
      const results: SpreadConfig[] = [];

      for (const update of request.updates) {
        const spread = await this.updateSpread(
          {
            projectId: request.projectId,
            ...update
          },
          userId
        );
        results.push(spread);
      }

      return results;
    } catch (error) {
      this.logError('Failed to bulk update spreads', { error, request });
      throw error;
    }
  }

  /**
   * Copy spreads across rows or columns
   */
  async copySpreads(request: CopySpreadRequest, userId?: string): Promise<number> {
    try {
      let copiedCount = 0;

      if (request.direction === 'row') {
        // Copy across all tiers for a specific asset/network
        copiedCount = await this.copyRow(request, userId);
      } else {
        // Copy down all assets/networks for a specific tier
        copiedCount = await this.copyColumn(request, userId);
      }

      return copiedCount;
    } catch (error) {
      this.logError('Failed to copy spreads', { error, request });
      throw error;
    }
  }

  /**
   * Copy spreads across tiers (row copy)
   */
  private async copyRow(request: CopySpreadRequest, userId?: string): Promise<number> {
    const { projectId, source, targets } = request;

    if (!source.cryptoAsset || !source.tierName) {
      throw new Error('Source asset and tier required for row copy');
    }

    // Get source spread
    const sourceSpread = await this.prisma.psp_fiat_crypto_spreads.findFirst({
      where: {
        project_id: projectId,
        crypto_asset: source.cryptoAsset,
        network: source.network,
        tier_name: source.tierName
      }
    });

    if (!sourceSpread) {
      throw new Error('Source spread not found');
    }

    // Copy to target tiers
    let copiedCount = 0;
    for (const target of targets) {
      if (!target.tierName) continue;

      const tier = DEFAULT_FIAT_TIERS.find(t => t.name === target.tierName);
      if (!tier) {
        this.logWarn('Tier not found for target', { tierName: target.tierName });
        continue;
      }

      await this.updateSpread(
        {
          projectId,
          cryptoAsset: source.cryptoAsset,
          network: source.network || null,
          tierName: target.tierName,
          tierMin: tier.min,
          tierMax: tier.max,
          buySpreadBps: sourceSpread.buy_spread_bps,
          sellSpreadBps: sourceSpread.sell_spread_bps
        },
        userId
      );
      copiedCount++;
    }

    return copiedCount;
  }

  /**
   * Copy spreads down assets (column copy)
   */
  private async copyColumn(request: CopySpreadRequest, userId?: string): Promise<number> {
    const { projectId, source, targets } = request;

    if (!source.tierName) {
      throw new Error('Source tier required for column copy');
    }

    // Get all source spreads for this tier
    const sourceSpreads = await this.prisma.psp_fiat_crypto_spreads.findMany({
      where: {
        project_id: projectId,
        crypto_asset: source.cryptoAsset,
        network: source.network,
        tier_name: source.tierName
      }
    });

    if (sourceSpreads.length === 0) {
      throw new Error('Source spreads not found');
    }

    // Copy to target assets/networks
    let copiedCount = 0;
    for (const target of targets) {
      if (!target.cryptoAsset) continue;

      for (const sourceSpread of sourceSpreads) {
        await this.updateSpread(
          {
            projectId,
            cryptoAsset: target.cryptoAsset,
            network: target.network || null,
            tierName: sourceSpread.tier_name,
            tierMin: Number(sourceSpread.tier_min),
            tierMax: sourceSpread.tier_max ? Number(sourceSpread.tier_max) : null,
            buySpreadBps: sourceSpread.buy_spread_bps,
            sellSpreadBps: sourceSpread.sell_spread_bps
          },
          userId
        );
        copiedCount++;
      }
    }

    return copiedCount;
  }

  /**
   * Initialize default spreads for a project
   */
  async initializeDefaultSpreads(projectId: string, userId?: string): Promise<void> {
    try {
      const assets: SupportedPSPCryptoAsset[] = ['BTC', 'ETH', 'USDC', 'USDT'];
      const defaultSpreads: Record<SupportedPSPCryptoAsset, number[]> = {
        BTC: [100, 75, 50, 25, 10],
        ETH: [80, 60, 40, 20, 8],
        USDC: [30, 20, 15, 10, 5],
        USDT: [30, 20, 15, 10, 5],
        MATIC: [50, 40, 30, 20, 10],
        AVAX: [60, 45, 30, 15, 8],
        SOL: [70, 50, 35, 20, 10],
        XLM: [40, 30, 20, 15, 8],
        TRX: [45, 35, 25, 15, 8],
        ALGO: [50, 38, 25, 15, 8]
      };

      for (const asset of assets) {
        const spreads = defaultSpreads[asset];
        for (let i = 0; i < DEFAULT_FIAT_TIERS.length; i++) {
          const tier = DEFAULT_FIAT_TIERS[i];
          const spreadBps = spreads[i];

          // Ensure tier and spreadBps exist
          if (!tier || spreadBps === undefined) {
            this.logWarn('Missing tier or spread data', { asset, index: i });
            continue;
          }

          await this.updateSpread(
            {
              projectId,
              cryptoAsset: asset,
              network: null,
              tierName: tier.name,
              tierMin: tier.min,
              tierMax: tier.max,
              buySpreadBps: spreadBps,
              sellSpreadBps: spreadBps
            },
            userId
          );
        }
      }

      this.logInfo('Initialized default spreads', { projectId });
    } catch (error) {
      this.logError('Failed to initialize default spreads', { error, projectId });
      throw error;
    }
  }

  /**
   * Map database record to SpreadConfig type
   */
  private mapToSpreadConfig(record: any): SpreadConfig {
    // Ensure proper type handling for nullable fields
    const network = record.network ?? null;
    const tierMin = record.tier_min != null ? Number(record.tier_min) : 0;
    const tierMax = record.tier_max != null ? Number(record.tier_max) : null;
    
    return {
      id: record.id,
      projectId: record.project_id,
      cryptoAsset: record.crypto_asset,
      network: network as SupportedPSPNetwork | null,
      tierName: record.tier_name,
      tierMin: tierMin,
      tierMax: tierMax,
      buySpreadBps: record.buy_spread_bps ?? 0,
      sellSpreadBps: record.sell_spread_bps ?? 0,
      isActive: record.is_active ?? true,
      createdAt: record.created_at?.toISOString() ?? new Date().toISOString(),
      updatedAt: record.updated_at?.toISOString() ?? new Date().toISOString(),
      createdBy: record.created_by ?? undefined,
      updatedBy: record.updated_by ?? undefined
    };
  }
}
