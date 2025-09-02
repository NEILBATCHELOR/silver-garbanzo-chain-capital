import { GuardianApiClient } from '@/infrastructure/guardian/GuardianApiClient';
import { GuardianWalletDatabaseService } from './GuardianWalletDatabaseService';
import { createUUID } from '@/utils/guardian/uuidUtils';
import type { 
  GuardianWalletRequest, 
  GuardianWalletResponse,
  GuardianWalletExtension 
} from '@/types/guardian/guardian';
import type { Wallet } from '@/types/core/centralModels';
import { WalletType } from '@/types/core/centralModels';
import { supabase } from '@/infrastructure/database/client';

/**
 * GuardianWalletService - Integration layer between Guardian API and Chain Capital wallet system
 */
class GuardianWalletService {
  private apiClient: GuardianApiClient;
  private dbService: GuardianWalletDatabaseService;

  constructor() {
    this.apiClient = new GuardianApiClient();
    this.dbService = new GuardianWalletDatabaseService();
  }

  /**
   * Create a new Guardian-managed wallet
   */
  async createGuardianWallet(params: {
    name: string;
    type: 'EOA' | 'MULTISIG' | 'SMART';
    userId: string;
    blockchain?: 'polygon' | 'ethereum';
    metadata?: Record<string, any>;
  }): Promise<Wallet & GuardianWalletExtension> {
    // Use the database service for complete workflow (API + Database storage)
    const walletRecord = await this.dbService.createGuardianWallet({
      name: params.name,
      type: params.type,
      userId: params.userId,
      blockchain: params.blockchain || 'polygon'
    });

    // Convert database record to internal wallet format
    const walletData = walletRecord.blockchain_specific_data;
    
    return {
      id: walletRecord.id,
      name: walletData.name,
      type: this.mapTypeToWalletType(params.type),
      address: walletData.accounts?.[0]?.address || '', // Primary address
      userId: walletData.user_id,
      blockchain: walletData.blockchain,
      chainId: walletData.blockchain === 'ethereum' ? 1 : 80002, // Ethereum mainnet or Polygon Amoy
      isDefault: false,
      guardianWalletId: walletData.guardian_wallet_id,
      guardianMetadata: {
        operationId: walletData.operation_id,
        status: walletData.status,
        accounts: walletData.accounts,
        externalId: walletData.guardian_external_id,
        createdVia: 'chaincapital-platform',
        ...params.metadata
      },
      isGuardianManaged: true,
      createdAt: walletRecord.created_at,
      updatedAt: walletRecord.updated_at
    };
  }

  /**
   * Get Guardian wallet by ID
   */
  async getGuardianWallet(guardianWalletId: string): Promise<Wallet & GuardianWalletExtension> {
    const guardianWallet = await this.apiClient.getWallet(guardianWalletId);
    return this.guardianToInternalWallet(guardianWallet);
  }

  /**
   * List all Guardian wallets for a user
   */
  async listUserGuardianWallets(userId: string): Promise<(Wallet & GuardianWalletExtension)[]> {
    const guardianWallets = await this.apiClient.getWallets();
    // Note: Guardian API doesn't support filtering by userId in the API
    // This would need to be filtered on the client side or handled differently
    return guardianWallets.map(gw => this.guardianToInternalWallet(gw));
  }

  /**
   * Update Guardian wallet
   */
  async updateGuardianWallet(guardianWalletId: string, updates: {
    name?: string;
    metadata?: Record<string, any>;
  }): Promise<Wallet & GuardianWalletExtension> {
    // Note: Guardian API doesn't currently support wallet updates
    // This would need to be implemented when the API supports it
    throw new Error('Guardian wallet updates not yet supported by Guardian API');
  }

  /**
   * Delete Guardian wallet
   */
  async deleteGuardianWallet(guardianWalletId: string): Promise<void> {
    // Note: Guardian API doesn't currently support wallet deletion
    // This would need to be implemented when the API supports it
    throw new Error('Guardian wallet deletion not yet supported by Guardian API');
  }

  /**
   * Get operation status (for tracking async wallet creation)
   */
  async getOperationStatus(operationId: string): Promise<any> {
    return this.apiClient.getOperation(operationId);
  }

  /**
   * Convert Guardian API wallet to internal wallet format
   */
  private guardianToInternalWallet(guardianWallet: any): Wallet & GuardianWalletExtension {
    return {
      id: `guardian_${guardianWallet.id}`,
      name: guardianWallet.name || 'Guardian Wallet',
      type: this.mapGuardianWalletType(guardianWallet.type || 'EOA'),
      address: guardianWallet.address || '',
      userId: guardianWallet.userId || 'unknown',
      blockchain: guardianWallet.blockchain || 'polygon',
      chainId: guardianWallet.chainId || 80002,
      isDefault: false,
      guardianWalletId: guardianWallet.id,
      guardianMetadata: guardianWallet.metadata || {},
      isGuardianManaged: true,
      createdAt: guardianWallet.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Map Guardian wallet type to internal wallet type
   */
  private mapGuardianWalletType(guardianType: string): WalletType {
    switch (guardianType.toUpperCase()) {
      case 'EOA':
        return WalletType.EOA;
      case 'MULTISIG':
        return WalletType.MULTISIG;
      case 'SMART':
        return WalletType.SMART;
      default:
        return WalletType.INDIVIDUAL;
    }
  }

  /**
   * Map internal type to Guardian wallet type
   */
  private mapTypeToWalletType(type: 'EOA' | 'MULTISIG' | 'SMART'): WalletType {
    switch (type) {
      case 'EOA':
        return WalletType.EOA;
      case 'MULTISIG':
        return WalletType.MULTISIG;
      case 'SMART':
        return WalletType.SMART;
      default:
        return WalletType.INDIVIDUAL;
    }
  }

  /**
   * List all wallets from database (filtered by user)
   */
  async listWallets(userId?: string): Promise<(Wallet & GuardianWalletExtension)[]> {
    let query = supabase
      .from('wallet_details')
      .select('*')
      .not('blockchain_specific_data->>guardian_wallet_id', 'is', null);

    // Filter by user ID if provided
    if (userId) {
      // Use type assertion to avoid deep instantiation TypeScript error
      query = (query as any).eq('blockchain_specific_data->>user_id', userId);
    }

    const { data: walletRecords, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch Guardian wallets: ${error.message}`);
    }

    if (!walletRecords) {
      return [];
    }

    // Convert database records to internal wallet format
    return walletRecords.map(record => {
      const walletData = record.blockchain_specific_data as Record<string, any> || {};
      
      return {
        id: record.id,
        name: walletData.name || 'Guardian Wallet',
        type: this.mapTypeToWalletType('EOA'), // Default to EOA for now
        address: walletData.accounts?.[0]?.address || '',
        userId: walletData.user_id,
        blockchain: walletData.blockchain || 'polygon',
        chainId: walletData.blockchain === 'ethereum' ? 1 : 80002,
        isDefault: false,
        guardianWalletId: walletData.guardian_wallet_id,
        guardianMetadata: {
          operationId: walletData.operation_id || '',
          status: walletData.status || 'pending',
          accounts: walletData.accounts || [],
          externalId: walletData.guardian_external_id || '',
          createdVia: 'chaincapital-platform' // Required property
        },
        isGuardianManaged: true,
        createdAt: record.created_at || new Date().toISOString(),
        updatedAt: record.updated_at || new Date().toISOString()
      };
    });
  }

  /**
   * Get wallet by ID (alias for getGuardianWallet for compatibility)
   */
  async getWalletById(walletId: string): Promise<Wallet & GuardianWalletExtension> {
    return this.getGuardianWallet(walletId);
  }

  /**
   * Create wallet (alias for createGuardianWallet for compatibility)
   */
  async createWallet(params: {
    name: string;
    type: 'EOA' | 'MULTISIG' | 'SMART';
    userId: string;
    blockchain?: 'polygon' | 'ethereum';
    metadata?: Record<string, any>;
  }): Promise<Wallet & GuardianWalletExtension> {
    return this.createGuardianWallet(params);
  }

  /**
   * Send transaction via Guardian API
   */
  async sendTransaction(transactionRequest: {
    walletId: string;
    to: string;
    value: string;
    data?: string;
    gasLimit?: string;
    gasPrice?: string;
    nonce?: number;
  }): Promise<any> {
    // This would need to be implemented when Guardian API supports transactions
    throw new Error('Transaction sending not yet implemented in Guardian API');
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(walletId: string): Promise<any[]> {
    // This would need to be implemented when Guardian API supports transaction history
    throw new Error('Transaction history not yet implemented in Guardian API');
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{ status: string; message: string }> {
    try {
      // Basic health check by attempting to list wallets
      await this.apiClient.getWallets();
      return { status: 'healthy', message: 'Guardian service is operational' };
    } catch (error: any) {
      return { status: 'error', message: `Guardian service error: ${error.message}` };
    }
  }

  /**
   * Sync wallet status from Guardian API and update local database
   */
  async syncWalletWithGuardianApi(operationId: string): Promise<Wallet & GuardianWalletExtension | null> {
    try {
      // Get operation status from Guardian API
      const operation = await this.apiClient.getOperation(operationId);
      
      if (!operation) {
        return null;
      }

      // Find the wallet in our database by operation ID
      const { data: walletRecord, error: fetchError } = await supabase
        .from('wallet_details')
        .select('*')
        .eq('blockchain_specific_data->>operation_id', operationId)
        .single();

      if (fetchError || !walletRecord) {
        console.error('Wallet not found for operation:', operationId);
        return null;
      }

      const currentData = walletRecord.blockchain_specific_data as Record<string, any>;
      
      // Update wallet data with Guardian API response
      const updatedData = {
        ...currentData,
        status: operation.status,
        accounts: operation.result?.accounts || currentData.accounts || [],
        updated_from_guardian_api: new Date().toISOString()
      };

      // If operation is completed and we have accounts, update the address
      if (operation.status === 'completed' && operation.result?.accounts?.length > 0) {
        updatedData.accounts = operation.result.accounts;
      }

      // Update the database with explicit type assertion
      const { data: updatedRecord, error: updateError } = await (supabase as any)
        .from('wallet_details')
        .update({
          blockchain_specific_data: updatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update wallet:', updateError);
        return null;
      }

      // Convert to internal wallet format with proper type safety
      const walletData = updatedRecord.blockchain_specific_data as Record<string, any>;
      return {
        id: updatedRecord.id,
        name: walletData.name || 'Guardian Wallet',
        type: this.mapTypeToWalletType('EOA'),
        address: walletData.accounts?.[0]?.address || '',
        userId: walletData.user_id,
        blockchain: walletData.blockchain || 'polygon',
        chainId: walletData.blockchain === 'ethereum' ? 1 : 80002,
        isDefault: false,
        guardianWalletId: walletData.guardian_wallet_id,
        guardianMetadata: {
          operationId: walletData.operation_id || '',
          status: walletData.status || 'pending',
          accounts: walletData.accounts || [],
          externalId: walletData.guardian_external_id || '',
          createdVia: 'chaincapital-platform'
        },
        isGuardianManaged: true,
        createdAt: updatedRecord.created_at || new Date().toISOString(),
        updatedAt: updatedRecord.updated_at || new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to sync wallet with Guardian API:', error);
      return null;
    }
  }

  /**
   * Sync all pending wallets with Guardian API
   */
  async syncAllPendingWallets(): Promise<(Wallet & GuardianWalletExtension)[]> {
    try {
      // Get all pending wallets with explicit type assertion
      const { data: pendingWallets, error } = await (supabase as any)
        .from('wallet_details')
        .select('*')
        .eq('blockchain_specific_data->>status', 'pending')
        .not('blockchain_specific_data->>operation_id', 'is', null);

      if (error || !pendingWallets) {
        console.error('Failed to fetch pending wallets:', error);
        return [];
      }

      // Sync each pending wallet
      const syncPromises = pendingWallets.map(wallet => {
        const operationId = (wallet.blockchain_specific_data as any)?.operation_id;
        return operationId ? this.syncWalletWithGuardianApi(operationId) : null;
      });

      const syncResults = await Promise.all(syncPromises);
      
      // Filter out null results and return updated wallets
      return syncResults.filter((wallet): wallet is Wallet & GuardianWalletExtension => wallet !== null);
    } catch (error) {
      console.error('Failed to sync pending wallets:', error);
      return [];
    }
  }

  /**
   * Expose the API client for direct access when needed
   */
  getApiClient(): GuardianApiClient {
    return this.apiClient;
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const status = await this.getStatus();
      return { healthy: status.status === 'healthy', details: status };
    } catch (error: any) {
      return { healthy: false, details: { error: error.message } };
    }
  }
}

export { GuardianWalletService };
export default GuardianWalletService;
