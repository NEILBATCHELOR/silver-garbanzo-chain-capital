/**
 * PSP Virtual Account Service
 * 
 * Manages multi-currency virtual accounts for users.
 * 
 * Features:
 * - Create and manage virtual accounts
 * - Get deposit instructions (fiat and crypto)
 * - Track account balances
 * - Link to identity verification cases
 * - Account suspension and closure
 * 
 * Virtual accounts allow users to hold multiple currencies and receive deposits
 * directly from Warp's infrastructure.
 */

import { BaseService, ServiceResult } from '@/services/BaseService';
import { WarpClientService } from '../auth/warpClientService';
import { BalanceService } from './balanceService';
import { randomUUID } from 'crypto';
import type {
  PSPVirtualAccount,
  VirtualAccountType,
  VirtualAccountStatus,
  PSPEnvironment,
  DepositInstructions
} from '@/types/psp';

export interface CreateVirtualAccountRequest {
  project_id: string;
  account_name: string;
  account_type: VirtualAccountType;
  identity_case_id?: string;
}

export interface UpdateVirtualAccountRequest {
  account_name?: string;
  status?: VirtualAccountStatus;
}

export class VirtualAccountService extends BaseService {
  private balanceService: BalanceService;

  constructor() {
    super('PSPVirtualAccount');
    this.balanceService = new BalanceService();
  }

  /**
   * Create a new virtual account
   * This creates the account in both our database and Warp
   */
  async createVirtualAccount(
    request: CreateVirtualAccountRequest,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<PSPVirtualAccount>> {
    try {
      const { project_id, account_name, account_type, identity_case_id } = request;

      // Validate identity case if provided
      if (identity_case_id) {
        const identityCase = await this.db.psp_identity_cases.findFirst({
          where: {
            id: identity_case_id,
            project_id,
            status: 'approved'
          }
        });

        if (!identityCase) {
          return this.error(
            'Identity case not found or not approved',
            'INVALID_IDENTITY_CASE',
            400
          );
        }
      }

      // Get Warp client for the project
      const warpClient = await WarpClientService.getClientForProject(
        project_id,
        environment
      );

      // Create virtual account via Warp API
      // Note: Warp API expects accountId and name only
      const warpResponse = await warpClient.createVirtualAccount({
        accountId: randomUUID(),
        name: account_name
      });

      if (!warpResponse.success || !warpResponse.data) {
        return this.error(
          'Failed to create virtual account in Warp',
          'WARP_API_ERROR',
          500
        );
      }

      const warpAccount = warpResponse.data;

      // Create in our database
      const virtualAccount = await this.db.psp_virtual_accounts.create({
        data: {
          project_id,
          warp_virtual_account_id: warpAccount.id,
          identity_case_id: identity_case_id || null,
          account_name,
          account_type,
          status: 'active',
          balances: warpAccount.balances || {},
          deposit_instructions: warpAccount.deposit_instructions || {},
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      this.logInfo('Created virtual account', {
        accountId: virtualAccount.id,
        projectId: project_id,
        warpAccountId: warpAccount.id
      });

      // Sync initial balances
      await this.balanceService.syncBalances(
        project_id,
        virtualAccount.id,
        environment
      );

      return this.success(virtualAccount as PSPVirtualAccount);
    } catch (error) {
      return this.handleError('Failed to create virtual account', error);
    }
  }

  /**
   * Get a virtual account by ID
   */
  async getVirtualAccount(
    accountId: string,
    projectId: string
  ): Promise<ServiceResult<PSPVirtualAccount | null>> {
    try {
      const account = await this.db.psp_virtual_accounts.findFirst({
        where: {
          id: accountId,
          project_id: projectId
        },
        include: {
          psp_identity_cases: true
        }
      });

      return this.success(account ? (account as PSPVirtualAccount) : null);
    } catch (error) {
      return this.handleError('Failed to get virtual account', error);
    }
  }

  /**
   * List all virtual accounts for a project
   */
  async listVirtualAccounts(
    projectId: string,
    options?: {
      status?: VirtualAccountStatus;
      account_type?: VirtualAccountType;
      identity_case_id?: string;
    }
  ): Promise<ServiceResult<PSPVirtualAccount[]>> {
    try {
      const whereClause: any = { project_id: projectId };

      if (options?.status) {
        whereClause.status = options.status;
      }

      if (options?.account_type) {
        whereClause.account_type = options.account_type;
      }

      if (options?.identity_case_id) {
        whereClause.identity_case_id = options.identity_case_id;
      }

      const accounts = await this.db.psp_virtual_accounts.findMany({
        where: whereClause,
        include: {
          psp_identity_cases: true
        },
        orderBy: { created_at: 'desc' }
      });

      return this.success(accounts as PSPVirtualAccount[]);
    } catch (error) {
      return this.handleError('Failed to list virtual accounts', error);
    }
  }

  /**
   * Update a virtual account
   */
  async updateVirtualAccount(
    accountId: string,
    projectId: string,
    updates: UpdateVirtualAccountRequest
  ): Promise<ServiceResult<PSPVirtualAccount>> {
    try {
      // Verify account belongs to project
      const existingAccount = await this.db.psp_virtual_accounts.findFirst({
        where: {
          id: accountId,
          project_id: projectId
        }
      });

      if (!existingAccount) {
        return this.error(
          'Virtual account not found',
          'ACCOUNT_NOT_FOUND',
          404
        );
      }

      // Update in database
      const updatedAccount = await this.db.psp_virtual_accounts.update({
        where: { id: accountId },
        data: {
          ...updates,
          updated_at: new Date()
        }
      });

      this.logInfo('Updated virtual account', {
        accountId,
        projectId,
        updates
      });

      return this.success(updatedAccount as PSPVirtualAccount);
    } catch (error) {
      return this.handleError('Failed to update virtual account', error);
    }
  }

  /**
   * Suspend a virtual account
   */
  async suspendVirtualAccount(
    accountId: string,
    projectId: string
  ): Promise<ServiceResult<PSPVirtualAccount>> {
    return this.updateVirtualAccount(accountId, projectId, { status: 'suspended' });
  }

  /**
   * Close a virtual account
   * NOTE: Cannot close accounts with non-zero balances
   */
  async closeVirtualAccount(
    accountId: string,
    projectId: string
  ): Promise<ServiceResult<PSPVirtualAccount>> {
    try {
      // Check if account has balances
      const balancesResult = await this.balanceService.getBalances(
        projectId,
        accountId
      );

      if (balancesResult.success && balancesResult.data) {
        const hasBalance = balancesResult.data.some(
          balance => parseFloat(balance.total_balance) > 0
        );

        if (hasBalance) {
          return this.error(
            'Cannot close account with non-zero balances',
            'BALANCE_NOT_ZERO',
            400
          );
        }
      }

      return this.updateVirtualAccount(accountId, projectId, { status: 'closed' });
    } catch (error) {
      return this.handleError('Failed to close virtual account', error);
    }
  }

  /**
   * Get deposit instructions for a virtual account
   * Returns both fiat (ACH/Wire) and crypto deposit information
   */
  async getDepositInstructions(
    accountId: string,
    projectId: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<DepositInstructions>> {
    try {
      // Get account
      const accountResult = await this.getVirtualAccount(accountId, projectId);

      if (!accountResult.success || !accountResult.data) {
        return this.error(
          'Virtual account not found',
          'ACCOUNT_NOT_FOUND',
          404
        );
      }

      const account = accountResult.data;

      // If instructions are cached, return them
      if (account.deposit_instructions) {
        return this.success(account.deposit_instructions as DepositInstructions);
      }

      // Otherwise, fetch fresh from Warp using getWallets endpoint
      const warpClient = await WarpClientService.getClientForProject(
        projectId,
        environment
      );

      // Get wallets which contain deposit instructions
      const walletsResponse = await warpClient.getWallets();

      if (!walletsResponse.success || !walletsResponse.data) {
        return this.error(
          'Failed to fetch deposit instructions from Warp',
          'WARP_API_ERROR',
          500
        );
      }

      // Extract deposit instructions from wallets response
      const instructions: DepositInstructions = {
        fiat: walletsResponse.data.fiat?.[0]?.instructions || {},
        crypto: walletsResponse.data.crypto || []
      };

      // Cache in database (cast to any to satisfy Prisma's JSON type)
      await this.db.psp_virtual_accounts.update({
        where: { id: accountId },
        data: {
          deposit_instructions: instructions as any,
          updated_at: new Date()
        }
      });

      this.logInfo('Fetched deposit instructions', {
        accountId,
        projectId
      });

      return this.success(instructions);
    } catch (error) {
      return this.handleError('Failed to get deposit instructions', error);
    }
  }

  /**
   * Get balances for a virtual account
   */
  async getAccountBalances(
    accountId: string,
    projectId: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<any[]>> {
    try {
      // Verify account exists
      const accountResult = await this.getVirtualAccount(accountId, projectId);

      if (!accountResult.success || !accountResult.data) {
        return this.error(
          'Virtual account not found',
          'ACCOUNT_NOT_FOUND',
          404
        );
      }

      // Get balances from balance service
      return this.balanceService.getBalances(projectId, accountId, environment);
    } catch (error) {
      return this.handleError('Failed to get account balances', error);
    }
  }

  /**
   * Sync virtual account data from Warp
   * Updates balances and deposit instructions
   */
  async syncVirtualAccount(
    accountId: string,
    projectId: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<PSPVirtualAccount>> {
    try {
      // Sync balances
      await this.balanceService.syncBalances(projectId, accountId, environment);

      // Refresh deposit instructions
      await this.getDepositInstructions(accountId, projectId, environment);

      // Get updated account
      const accountResult = await this.getVirtualAccount(accountId, projectId);
      
      if (!accountResult.success || !accountResult.data) {
        return this.error('Virtual account not found', 'NOT_FOUND', 404);
      }

      return this.success(accountResult.data);
    } catch (error) {
      return this.handleError('Failed to sync virtual account', error);
    }
  }
}

export default VirtualAccountService;
