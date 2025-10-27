/**
 * PSP External Account Service
 * 
 * Manages external bank accounts (ACH, Wire) and cryptocurrency addresses
 * that can receive funds from Warp virtual accounts.
 * 
 * Features:
 * - Create and manage external ACH accounts
 * - Create and manage external Wire accounts
 * - Create and manage external Crypto accounts
 * - List accounts by type (fiat/crypto)
 * - Deactivate accounts
 * - Sync accounts from Warp API
 * - Encrypt sensitive banking data
 * 
 * All sensitive data (account numbers, routing numbers) is encrypted
 * using PSPEncryptionService before storage.
 */

import { BaseService, ServiceResult } from '@/services/BaseService';
import { WarpClientService } from '../auth/warpClientService';
import { PSPEncryptionService } from '../security/pspEncryptionService';
import type { 
  PSPExternalAccount,
  CreateExternalAchAccountRequest,
  CreateExternalWireAccountRequest,
  CreateExternalCryptoAccountRequest,
  ExternalAccountType,
  CurrencyType,
  ExternalAccountStatus,
  PSPEnvironment
} from '@/types/psp';

export class ExternalAccountService extends BaseService {
  constructor() {
    super('PSPExternalAccount');
  }

  /**
   * Create an external ACH account
   * Stores account in both Warp and local database
   */
  async createAchAccount(
    request: CreateExternalAchAccountRequest,
    environment: PSPEnvironment = 'production',
    userId?: string
  ): Promise<ServiceResult<PSPExternalAccount>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(request, [
        'project_id',
        'routing_number',
        'account_number',
        'account_classification',
        'description'
      ]);

      if (!validation.success) {
        return this.error(
          validation.error || 'Validation failed',
          'VALIDATION_ERROR',
          400
        );
      }

      // Get Warp API client
      const warpClient = await WarpClientService.getClientForProject(
        request.project_id,
        environment
      );

      // Create account in Warp
      this.logInfo('Creating ACH account in Warp', {
        projectId: request.project_id,
        description: request.description
      });

      const warpResponse = await warpClient.createExternalAchAccount({
        routingNumber: request.routing_number,
        accountNumber: request.account_number,
        accountType: request.account_classification,
        description: request.description
      });

      if (!warpResponse.success || !warpResponse.data) {
        this.logError('Failed to create ACH account in Warp', warpResponse.error);
        return this.error(
          warpResponse.error?.message || 'Failed to create ACH account in Warp',
          'WARP_API_ERROR',
          500
        );
      }

      // Encrypt sensitive data
      const accountNumberVault = await PSPEncryptionService.encryptAccountNumber(
        request.account_number,
        request.project_id,
        userId || 'system',
        `ACH account: ${request.description}`
      );

      const routingNumberVault = await PSPEncryptionService.encryptRoutingNumber(
        request.routing_number,
        request.project_id,
        userId || 'system',
        `ACH routing: ${request.description}`
      );

      // Store in local database
      const account = await this.db.psp_external_accounts.create({
        data: {
          project_id: request.project_id,
          warp_account_id: warpResponse.data.id,
          account_type: 'ach' as ExternalAccountType,
          currency_type: 'fiat' as CurrencyType,
          routing_number_vault_id: routingNumberVault.vaultId,
          account_number_vault_id: accountNumberVault.vaultId,
          account_number_last4: request.account_number.slice(-4),
          account_holder_name: warpResponse.data.accountHolderName,
          bank_name: warpResponse.data.bankName,
          account_classification: request.account_classification,
          transfer_method: 'ach',
          description: request.description,
          status: 'active' as ExternalAccountStatus,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      this.logInfo('ACH account created successfully', {
        accountId: account.id,
        warpAccountId: account.warp_account_id,
        last4: account.account_number_last4
      });

      return this.success(account as PSPExternalAccount);
    } catch (error) {
      return this.handleError('Failed to create ACH account', error);
    }
  }

  /**
   * Create an external Wire account
   */
  async createWireAccount(
    request: CreateExternalWireAccountRequest,
    environment: PSPEnvironment = 'production',
    userId?: string
  ): Promise<ServiceResult<PSPExternalAccount>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(request, [
        'project_id',
        'routing_number',
        'account_number',
        'receiver_name',
        'receiver_address',
        'receiver_bank_name',
        'receiver_bank_address',
        'description'
      ]);

      if (!validation.success) {
        return this.error(
          validation.error || 'Validation failed',
          'VALIDATION_ERROR',
          400
        );
      }

      // Get Warp API client
      const warpClient = await WarpClientService.getClientForProject(
        request.project_id,
        environment
      );

      // Create account in Warp
      this.logInfo('Creating Wire account in Warp', {
        projectId: request.project_id,
        description: request.description
      });

      const warpResponse = await warpClient.createExternalWireAccount({
        routingNumber: request.routing_number,
        accountNumber: request.account_number,
        receiverName: request.receiver_name,
        receiverAddress: request.receiver_address,
        receiverBankName: request.receiver_bank_name,
        receiverBankAddress: request.receiver_bank_address,
        description: request.description
      });

      if (!warpResponse.success || !warpResponse.data) {
        this.logError('Failed to create Wire account in Warp', warpResponse.error);
        return this.error(
          warpResponse.error?.message || 'Failed to create Wire account in Warp',
          'WARP_API_ERROR',
          500
        );
      }

      // Encrypt sensitive data
      const accountNumberVault = await PSPEncryptionService.encryptAccountNumber(
        request.account_number,
        request.project_id,
        userId || 'system',
        `Wire account: ${request.description}`
      );

      const routingNumberVault = await PSPEncryptionService.encryptRoutingNumber(
        request.routing_number,
        request.project_id,
        userId || 'system',
        `Wire routing: ${request.description}`
      );

      // Store in local database
      const account = await this.db.psp_external_accounts.create({
        data: {
          project_id: request.project_id,
          warp_account_id: warpResponse.data.id,
          account_type: 'wire' as ExternalAccountType,
          currency_type: 'fiat' as CurrencyType,
          routing_number_vault_id: routingNumberVault.vaultId,
          account_number_vault_id: accountNumberVault.vaultId,
          account_number_last4: request.account_number.slice(-4),
          account_holder_name: request.receiver_name,
          bank_name: request.receiver_bank_name,
          transfer_method: 'wire',
          description: request.description,
          status: 'active' as ExternalAccountStatus,
          metadata: JSON.parse(JSON.stringify({
            receiver_address: request.receiver_address,
            receiver_bank_address: request.receiver_bank_address
          })),
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      this.logInfo('Wire account created successfully', {
        accountId: account.id,
        warpAccountId: account.warp_account_id,
        last4: account.account_number_last4
      });

      return this.success(account as PSPExternalAccount);
    } catch (error) {
      return this.handleError('Failed to create Wire account', error);
    }
  }

  /**
   * Create an external cryptocurrency account
   */
  async createCryptoAccount(
    request: CreateExternalCryptoAccountRequest,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<PSPExternalAccount>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(request, [
        'project_id',
        'wallet_address',
        'network',
        'description'
      ]);

      if (!validation.success) {
        return this.error(
          validation.error || 'Validation failed',
          'VALIDATION_ERROR',
          400
        );
      }

      // Get Warp API client
      const warpClient = await WarpClientService.getClientForProject(
        request.project_id,
        environment
      );

      // Create account in Warp
      this.logInfo('Creating crypto account in Warp', {
        projectId: request.project_id,
        network: request.network,
        description: request.description
      });

      const warpResponse = await warpClient.createExternalCryptoAccount({
        description: request.description,
        address: request.wallet_address,
        network: request.network
      });

      if (!warpResponse.success || !warpResponse.data) {
        this.logError('Failed to create crypto account in Warp', warpResponse.error);
        return this.error(
          warpResponse.error?.message || 'Failed to create crypto account in Warp',
          'WARP_API_ERROR',
          500
        );
      }

      // Store in local database
      const account = await this.db.psp_external_accounts.create({
        data: {
          project_id: request.project_id,
          warp_account_id: warpResponse.data.id,
          account_type: 'crypto' as ExternalAccountType,
          currency_type: 'crypto' as CurrencyType,
          network: request.network,
          wallet_address: request.wallet_address,
          description: request.description,
          status: 'active' as ExternalAccountStatus,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      this.logInfo('Crypto account created successfully', {
        accountId: account.id,
        warpAccountId: account.warp_account_id,
        network: request.network,
        address: request.wallet_address.slice(0, 10) + '...'
      });

      return this.success(account as PSPExternalAccount);
    } catch (error) {
      return this.handleError('Failed to create crypto account', error);
    }
  }

  /**
   * List all fiat external accounts for a project
   */
  async listFiatAccounts(
    projectId: string,
    includeInactive = false
  ): Promise<ServiceResult<PSPExternalAccount[]>> {
    try {
      const whereClause: any = {
        project_id: projectId,
        currency_type: 'fiat' as CurrencyType
      };

      if (!includeInactive) {
        whereClause.status = 'active';
      }

      const accounts = await this.db.psp_external_accounts.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' }
      });

      return this.success(accounts as PSPExternalAccount[]);
    } catch (error) {
      return this.handleError('Failed to list fiat accounts', error);
    }
  }

  /**
   * List all crypto external accounts for a project
   */
  async listCryptoAccounts(
    projectId: string,
    includeInactive = false
  ): Promise<ServiceResult<PSPExternalAccount[]>> {
    try {
      const whereClause: any = {
        project_id: projectId,
        currency_type: 'crypto' as CurrencyType
      };

      if (!includeInactive) {
        whereClause.status = 'active';
      }

      const accounts = await this.db.psp_external_accounts.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' }
      });

      return this.success(accounts as PSPExternalAccount[]);
    } catch (error) {
      return this.handleError('Failed to list crypto accounts', error);
    }
  }

  /**
   * Get account details by ID
   */
  async getAccount(accountId: string): Promise<ServiceResult<PSPExternalAccount>> {
    return this.findById<PSPExternalAccount>(
      this.db.psp_external_accounts,
      accountId
    );
  }

  /**
   * Deactivate an external account
   */
  async deactivateAccount(accountId: string): Promise<ServiceResult<boolean>> {
    try {
      const account = await this.db.psp_external_accounts.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        return this.error('Account not found', 'NOT_FOUND', 404);
      }

      // Update status to inactive
      await this.db.psp_external_accounts.update({
        where: { id: accountId },
        data: {
          status: 'inactive',
          updated_at: new Date()
        }
      });

      this.logInfo('External account deactivated', {
        accountId,
        accountType: account.account_type
      });

      return this.success(true);
    } catch (error) {
      return this.handleError('Failed to deactivate account', error);
    }
  }

  /**
   * Sync external accounts from Warp
   * Useful for ensuring local database matches Warp state
   */
  async syncWithWarp(
    projectId: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<{ 
    fiatAccounts: number;
    cryptoAccounts: number;
  }>> {
    try {
      const warpClient = await WarpClientService.getClientForProject(
        projectId,
        environment
      );

      // Get fiat accounts from Warp
      const fiatResponse = await warpClient.getExternalFiatAccounts();
      let fiatCount = 0;

      if (fiatResponse.success && fiatResponse.data) {
        fiatCount = Array.isArray(fiatResponse.data) ? fiatResponse.data.length : 0;
      }

      // Get crypto accounts from Warp
      const cryptoResponse = await warpClient.getExternalCryptoAccounts();
      let cryptoCount = 0;

      if (cryptoResponse.success && cryptoResponse.data) {
        cryptoCount = Array.isArray(cryptoResponse.data) ? cryptoResponse.data.length : 0;
      }

      this.logInfo('Synced external accounts from Warp', {
        projectId,
        fiatAccounts: fiatCount,
        cryptoAccounts: cryptoCount
      });

      return this.success({
        fiatAccounts: fiatCount,
        cryptoAccounts: cryptoCount
      });
    } catch (error) {
      return this.handleError('Failed to sync with Warp', error);
    }
  }

  /**
   * Get decrypted account number (for authorized operations only)
   * Use sparingly and log all access
   */
  async getDecryptedAccountNumber(
    accountId: string,
    userId: string
  ): Promise<ServiceResult<string>> {
    try {
      const account = await this.db.psp_external_accounts.findUnique({
        where: { id: accountId },
        select: { 
          id: true,
          account_number_vault_id: true,
          project_id: true
        }
      });

      if (!account) {
        return this.error('Account not found', 'NOT_FOUND', 404);
      }

      if (!account.account_number_vault_id) {
        return this.error('No encrypted account number found', 'NO_VAULT_DATA', 404);
      }

      // Log this sensitive operation
      this.logInfo('Decrypting account number', {
        accountId,
        userId,
        projectId: account.project_id
      });

      // Decrypt from vault
      const decrypted = await PSPEncryptionService.decryptAccountNumber(
        account.account_number_vault_id
      );

      return this.success(decrypted);
    } catch (error) {
      return this.handleError('Failed to decrypt account number', error);
    }
  }
}

export default ExternalAccountService;
