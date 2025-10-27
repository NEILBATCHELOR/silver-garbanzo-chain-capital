/**
 * PSP Balance Service
 * 
 * Tracks and synchronizes cryptocurrency and fiat balances across projects.
 * 
 * Features:
 * - Sync balances from Warp API
 * - Track multi-currency balances per project
 * - Get balance breakdowns (available, locked, pending)
 * - Real-time balance queries
 * 
 * Balances are stored locally but always synced from Warp as source of truth.
 */

import { BaseService, ServiceResult } from '@/services/BaseService';
import { WarpClientService } from '../auth/warpClientService';
import {
  convertDbBalanceToPSPBalance,
  convertDbBalancesToPSPBalances,
  decimalToString,
  stringToDecimal
} from '@/utils/psp-converters';
import type {
  PSPBalance,
  WalletInfo,
  AssetType,
  PSPEnvironment
} from '@/types/psp';

export class BalanceService extends BaseService {
  constructor() {
    super('PSPBalance');
  }

  /**
   * Get all balances for a project
   * Always syncs from Warp first to ensure accuracy
   */
  async getBalances(
    projectId: string,
    virtualAccountId?: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<PSPBalance[]>> {
    try {
      // Sync balances from Warp first
      await this.syncBalances(projectId, virtualAccountId, environment);

      // Query local database
      const whereClause: any = { project_id: projectId };
      if (virtualAccountId) {
        whereClause.virtual_account_id = virtualAccountId;
      }

      const balances = await this.db.psp_balances.findMany({
        where: whereClause,
        orderBy: [
          { asset_type: 'asc' },
          { asset_symbol: 'asc' }
        ]
      });

      return this.success(convertDbBalancesToPSPBalances(balances));
    } catch (error) {
      return this.handleError('Failed to get balances', error);
    }
  }

  /**
   * Get balance for a specific asset
   */
  async getAssetBalance(
    projectId: string,
    assetSymbol: string,
    network?: string,
    virtualAccountId?: string
  ): Promise<ServiceResult<PSPBalance | null>> {
    try {
      const whereClause: any = {
        project_id: projectId,
        asset_symbol: assetSymbol
      };

      if (network) {
        whereClause.network = network;
      }

      if (virtualAccountId) {
        whereClause.virtual_account_id = virtualAccountId;
      }

      const balance = await this.db.psp_balances.findFirst({
        where: whereClause
      });

      return this.success(balance ? convertDbBalanceToPSPBalance(balance) : null);
    } catch (error) {
      return this.handleError('Failed to get asset balance', error);
    }
  }

  /**
   * Sync balances from Warp API
   * Creates or updates balance records in local database
   */
  async syncBalances(
    projectId: string,
    virtualAccountId?: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<number>> {
    try {
      const warpClient = await WarpClientService.getClientForProject(
        projectId,
        environment
      );

      // Get wallets from Warp
      const walletsResponse = await warpClient.getWallets();

      if (!walletsResponse.success || !walletsResponse.data) {
        return this.error(
          'Failed to fetch wallets from Warp',
          'WARP_API_ERROR',
          500
        );
      }

      const data = walletsResponse.data;
      let syncedCount = 0;

      // Process fiat wallets
      if (data.fiat && Array.isArray(data.fiat)) {
        for (const wallet of data.fiat) {
          await this.upsertBalance(projectId, {
            asset_type: 'fiat',
            asset_symbol: wallet.assetId || 'USD',
            network: null,
            available_balance: wallet.disbursable || '0',
            locked_balance: wallet.locked || '0',
            pending_balance: wallet.pending || '0',
            total_balance: wallet.total || '0',
            warp_wallet_id: wallet.id,
            wallet_address: null,
            virtual_account_id: virtualAccountId || null
          });
          syncedCount++;
        }
      }

      // Process crypto wallets
      if (data.crypto && Array.isArray(data.crypto)) {
        for (const wallet of data.crypto) {
          await this.upsertBalance(projectId, {
            asset_type: 'crypto',
            asset_symbol: wallet.symbol,
            network: wallet.network,
            available_balance: (wallet.balance - wallet.locked - wallet.pending).toString(),
            locked_balance: wallet.locked.toString(),
            pending_balance: wallet.pending.toString(),
            total_balance: wallet.total.toString(),
            warp_wallet_id: wallet.id,
            wallet_address: wallet.address,
            virtual_account_id: virtualAccountId || null
          });
          syncedCount++;
        }
      }

      this.logInfo('Synced balances from Warp', {
        projectId,
        syncedCount,
        virtualAccountId
      });

      return this.success(syncedCount);
    } catch (error) {
      return this.handleError('Failed to sync balances', error);
    }
  }

  /**
   * Get wallet information from Warp (live data)
   */
  async getWalletInfo(
    projectId: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<{ fiat: WalletInfo[]; crypto: WalletInfo[] }>> {
    try {
      const warpClient = await WarpClientService.getClientForProject(
        projectId,
        environment
      );

      const response = await warpClient.getWallets();

      if (!response.success || !response.data) {
        return this.error(
          'Failed to fetch wallet info from Warp',
          'WARP_API_ERROR',
          500
        );
      }

      const fiat: WalletInfo[] = (response.data.fiat || []).map((w: any) => ({
        id: w.id,
        asset_symbol: w.assetId || 'USD',
        balance: w.balance,
        locked: w.locked,
        pending: w.pending,
        total: w.total,
        deposit_instructions: w.instructions
      }));

      const crypto: WalletInfo[] = (response.data.crypto || []).map((w: any) => ({
        id: w.id,
        asset_symbol: w.symbol,
        network: w.network,
        balance: w.balance.toString(),
        locked: w.locked.toString(),
        pending: w.pending.toString(),
        total: w.total.toString(),
        address: w.address
      }));

      return this.success({ fiat, crypto });
    } catch (error) {
      return this.handleError('Failed to get wallet info', error);
    }
  }

  /**
   * Check if sufficient balance exists for a transaction
   */
  async hasSufficientBalance(
    projectId: string,
    assetSymbol: string,
    requiredAmount: string,
    network?: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const balanceResult = await this.getAssetBalance(
        projectId,
        assetSymbol,
        network
      );

      if (!balanceResult.success || !balanceResult.data) {
        return this.success(false);
      }

      const available = parseFloat(balanceResult.data.available_balance);
      const required = parseFloat(requiredAmount);

      return this.success(available >= required);
    } catch (error) {
      return this.handleError('Failed to check balance', error);
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Upsert balance record (create or update)
   */
  private async upsertBalance(
    projectId: string,
    balanceData: {
      asset_type: AssetType;
      asset_symbol: string;
      network: string | null;
      available_balance: string;
      locked_balance: string;
      pending_balance: string;
      total_balance: string;
      warp_wallet_id: string;
      wallet_address: string | null;
      virtual_account_id: string | null;
    }
  ): Promise<void> {
    const whereClause: any = {
      project_id: projectId,
      asset_symbol: balanceData.asset_symbol
    };

    if (balanceData.network) {
      whereClause.network = balanceData.network;
    }

    if (balanceData.virtual_account_id) {
      whereClause.virtual_account_id = balanceData.virtual_account_id;
    }

    await this.db.psp_balances.upsert({
      where: whereClause,
      create: {
        project_id: projectId,
        asset_type: balanceData.asset_type,
        asset_symbol: balanceData.asset_symbol,
        network: balanceData.network,
        available_balance: stringToDecimal(balanceData.available_balance),
        locked_balance: stringToDecimal(balanceData.locked_balance),
        pending_balance: stringToDecimal(balanceData.pending_balance),
        total_balance: stringToDecimal(balanceData.total_balance),
        warp_wallet_id: balanceData.warp_wallet_id,
        wallet_address: balanceData.wallet_address,
        virtual_account_id: balanceData.virtual_account_id,
        last_synced_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      update: {
        available_balance: stringToDecimal(balanceData.available_balance),
        locked_balance: stringToDecimal(balanceData.locked_balance),
        pending_balance: stringToDecimal(balanceData.pending_balance),
        total_balance: stringToDecimal(balanceData.total_balance),
        warp_wallet_id: balanceData.warp_wallet_id,
        wallet_address: balanceData.wallet_address,
        last_synced_at: new Date(),
        updated_at: new Date()
      }
    });
  }
}

export default BalanceService;
