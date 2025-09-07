/**
 * DFNS Service - REAL Implementation using Official SDK - CORRECTED VERSION
 * 
 * This file shows how to replace mock implementations with real DFNS API calls
 */

import { DfnsApiClient } from '@dfns/sdk';
import { AsymmetricKeySigner } from '@dfns/sdk-keysigner';
import { DFNS_CONFIG } from '../../infrastructure/dfns/config';

export class RealDfnsService {
  private client: DfnsApiClient;

  constructor() {
    // Initialize with proper SDK client
    this.client = new DfnsApiClient({
      appId: DFNS_CONFIG.appId,
      baseUrl: DFNS_CONFIG.baseUrl,
      signer: new AsymmetricKeySigner({
        privateKey: DFNS_CONFIG.serviceAccountPrivateKey!,
        credId: DFNS_CONFIG.serviceAccountId!,
      })
    });
  }

  // ===== REAL API IMPLEMENTATIONS - CORRECTED =====

  /**
   * Create wallet - REAL implementation
   */
  async createWallet(request: {
    network: 'Ethereum' | 'Polygon' | 'Bitcoin' | 'Solana' | 'EthereumSepolia' | 'PolygonMumbai' | 'BitcoinTestnet3' | 'SolanaDevnet';
    name?: string;
    tags?: string[];
    externalId?: string;
  }): Promise<{ wallet: any; success: boolean; error?: string }> {
    try {
      const response = await this.client.wallets.createWallet({
        body: {
          network: request.network as any,
          name: request.name,
          tags: request.tags,
          externalId: request.externalId
        }
      });

      return {
        wallet: response,
        success: true
      };
    } catch (error) {
      return {
        wallet: null,
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get wallet balances - REAL implementation (replaces mock)
   */
  async getWalletBalances(walletId: string): Promise<any[]> {
    try {
      // REAL API call to get wallet assets
      const response = await this.client.wallets.getWalletAssets({ walletId });
      
      // Transform DFNS response to your expected format
      return response.assets?.map((asset: any) => ({
        asset: {
          symbol: asset.symbol,
          decimals: asset.decimals || 18,
          verified: asset.verified || false,
          name: asset.name,
          nativeAsset: asset.nativeAsset || false
        },
        balance: asset.balance,
        valueInUSD: asset.priceUsd ? (parseFloat(asset.balance) * parseFloat(asset.priceUsd)).toString() : undefined,
        assetSymbol: asset.symbol,
        valueInUsd: asset.priceUsd ? (parseFloat(asset.balance) * parseFloat(asset.priceUsd)).toString() : undefined
      })) || [];
    } catch (error) {
      console.error('Failed to get wallet balances:', error);
      return [];
    }
  }

  /**
   * List wallets - REAL implementation - FIXED
   */
  async listWallets(filters?: {
    paginationToken?: string;
    limit?: string;
  }): Promise<{ wallets: any[]; success: boolean; error?: string }> {
    try {
      // FIXED: Use correct API signature with query wrapper
      const response = await this.client.wallets.listWallets({
        query: {
          paginationToken: filters?.paginationToken,
          limit: filters?.limit
        }
      });

      return {
        wallets: response.items || [],
        success: true
      };
    } catch (error) {
      return {
        wallets: [],
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Transfer asset - REAL implementation
   */
  async transferAsset(
    walletId: string,
    transfer: {
      to: string;
      amount: string;
      kind?: 'Native' | 'Erc20';
      contract?: string; // Required for ERC-20 transfers
      memo?: string;
    }
  ): Promise<{ transfer: any | null; success: boolean; error?: string }> {
    try {
      // Build the transfer body based on the asset type
      let transferBody: any;

      if (transfer.kind === 'Erc20') {
        // ERC-20 transfer requires contract address
        if (!transfer.contract) {
          throw new Error('Contract address is required for ERC-20 transfers');
        }
        transferBody = {
          kind: 'Erc20',
          contract: transfer.contract,
          to: transfer.to,
          amount: transfer.amount,
        };
      } else {
        // Default to native token transfer
        transferBody = {
          kind: 'Native',
          to: transfer.to,
          amount: transfer.amount,
          memo: transfer.memo,
        };
      }

      const response = await this.client.wallets.transferAsset({
        walletId,
        body: transferBody
      });

      return {
        transfer: response,
        success: true
      };
    } catch (error) {
      return {
        transfer: null,
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get wallet transaction history - REAL implementation
   */
  async getWalletHistory(walletId: string): Promise<any[]> {
    try {
      const response = await this.client.wallets.getWalletHistory({ walletId });
      return response.items || [];
    } catch (error) {
      console.error('Failed to get wallet history:', error);
      return [];
    }
  }

  /**
   * Get wallet NFTs - REAL implementation
   */
  async getWalletNfts(walletId: string): Promise<any[]> {
    try {
      const response = await this.client.wallets.getWalletNfts({ walletId });
      return response.nfts || [];
    } catch (error) {
      console.error('Failed to get wallet NFTs:', error);
      return [];
    }
  }

  /**
   * Create signing key - REAL implementation - FIXED
   */
  async createKey(request: {
    curve: 'secp256k1' | 'ed25519' | 'stark';
    name?: string;
  }): Promise<{ key: any; success: boolean; error?: string }> {
    try {
      // FIXED: Remove network field, use only scheme and curve
      const response = await this.client.keys.createKey({
        body: {
          scheme: 'ECDSA', // Required scheme field
          curve: request.curve,
          name: request.name
          // REMOVED: network field doesn't exist in CreateKeyBody
        }
      });

      return {
        key: response,
        success: true
      };
    } catch (error) {
      return {
        key: null,
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * List signing keys - REAL implementation
   */
  async listKeys(): Promise<any[]> {
    try {
      const response = await this.client.keys.listKeys();
      return response.items || [];
    } catch (error) {
      console.error('Failed to list keys:', error);
      return [];
    }
  }

  /**
   * Generate signature - REAL implementation - FIXED
   */
  async generateSignature(
    keyId: string,
    request: {
      kind: 'Hash' | 'Message' | 'Transaction' | 'Eip712' | 'Psbt';
      message?: string;
      hash?: string;
    }
  ): Promise<{ signature: any; success: boolean; error?: string }> {
    try {
      let body: any;
      
      // FIXED: Build correct body based on signature kind
      switch (request.kind) {
        case 'Hash':
          body = {
            kind: 'Hash',
            hash: request.hash || request.message || ''
          };
          break;
        case 'Message':
          body = {
            kind: 'Message',
            message: request.message || ''
          };
          break;
        case 'Transaction':
          body = {
            kind: 'Transaction',
            transaction: request.message || ''
          };
          break;
        default:
          body = {
            kind: request.kind,
            message: request.message || ''
          };
      }

      const response = await this.client.keys.generateSignature({
        keyId,
        body
      });

      return {
        signature: response,
        success: true
      };
    } catch (error) {
      return {
        signature: null,
        success: false,
        error: (error as Error).message
      };
    }
  }

  // ===== Policy Engine - REAL implementations =====

  /**
   * List policies - REAL implementation
   */
  async listPolicies(): Promise<any[]> {
    try {
      const response = await this.client.policies.listPolicies();
      return response.items || [];
    } catch (error) {
      console.error('Failed to list policies:', error);
      return [];
    }
  }

  /**
   * Create policy - REAL implementation
   */
  async createPolicy(policy: {
    name: string;
    activityKind: 'Permissions:Assign' | 'Permissions:Modify' | 'Policies:Modify' | 'Wallets:Sign' | 'Wallets:IncomingTransaction';
    rule: any;
    action?: any; // Add required action field
  }): Promise<{ policy: any; success: boolean; error?: string }> {
    try {
      const response = await this.client.policies.createPolicy({
        body: {
          name: policy.name,
          activityKind: policy.activityKind,
          rule: policy.rule,
          action: policy.action || { kind: 'NoAction' } // Default action if not provided
        }
      });

      return {
        policy: response,
        success: true
      };
    } catch (error) {
      return {
        policy: null,
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * List policy approvals - REAL implementation
   */
  async listApprovals(): Promise<any[]> {
    try {
      const response = await this.client.policies.listApprovals();
      return response.items || [];
    } catch (error) {
      console.error('Failed to list approvals:', error);
      return [];
    }
  }

  // ===== User Management - REAL implementations =====

  /**
   * List users - REAL implementation
   */
  async listUsers(): Promise<any[]> {
    try {
      const response = await this.client.auth.listUsers();
      return response.items || [];
    } catch (error) {
      console.error('Failed to list users:', error);
      return [];
    }
  }

  /**
   * Create user - REAL implementation
   */
  async createUser(user: {
    email: string;
    kind: string;
  }): Promise<{ user: any; success: boolean; error?: string }> {
    try {
      const response = await this.client.auth.createUser({
        body: {
          email: user.email,
          kind: user.kind as any
        }
      });

      return {
        user: response,
        success: true
      };
    } catch (error) {
      return {
        user: null,
        success: false,
        error: (error as Error).message
      };
    }
  }

  // ===== Fee Estimation =====

  async estimateTransferFee(request: {
    walletId: string;
    to: string;
    amount: string;
    asset?: string;
  }): Promise<{
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    estimatedFee?: string;
    estimatedFeeUsd?: string;
    success: boolean;
    error?: string;
  }> {
    try {
      // Note: DFNS doesn't have a direct fee estimation endpoint
      // This returns typical mainnet gas values for estimation
      return {
        gasLimit: '21000',
        gasPrice: '20000000000', // 20 gwei
        maxFeePerGas: '25000000000', // 25 gwei
        maxPriorityFeePerGas: '2000000000', // 2 gwei
        estimatedFee: '0.0005', // Estimated in ETH
        estimatedFeeUsd: '1.25', // Estimated USD value
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // ===== Transfer Creation =====

  async createTransfer(request: {
    walletId: string;
    to: string;
    amount: string;
    asset?: string;
    memo?: string;
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  }): Promise<{
    transferId: string;
    status: string;
    txHash?: string;
    success: boolean;
    error?: string;
  }> {
    try {
      let transferBody: any;

      if (request.asset && request.asset !== 'native') {
        // ERC-20 token transfer
        transferBody = {
          kind: 'Erc20',
          contract: request.asset,
          to: request.to,
          amount: request.amount,
        };
      } else {
        // Native token transfer
        transferBody = {
          kind: 'Native',
          to: request.to,
          amount: request.amount,
          memo: request.memo,
        };
      }

      // Add gas parameters if provided
      if (request.gasLimit) transferBody.gasLimit = request.gasLimit;
      if (request.gasPrice) transferBody.gasPrice = request.gasPrice;
      if (request.maxFeePerGas) transferBody.maxFeePerGas = request.maxFeePerGas;
      if (request.maxPriorityFeePerGas) transferBody.maxPriorityFeePerGas = request.maxPriorityFeePerGas;

      const response = await this.client.wallets.transferAsset({
        walletId: request.walletId,
        body: transferBody
      });

      return {
        transferId: response.id,
        status: response.status,
        txHash: response.txHash,
        success: true
      };
    } catch (error) {
      return {
        transferId: '',
        status: 'failed',
        success: false,
        error: (error as Error).message
      };
    }
  }

  // ===== Wallet Delegation =====

  async delegateWallet(walletId: string, delegateTo: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.client.wallets.delegateWallet({
        walletId,
        body: {
          userId: delegateTo // Correct property name according to DFNS API docs
        }
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // ===== Enhanced Methods for Dashboard =====

  // Alias for dashboard compatibility
  async getWallets(filters?: {
    paginationToken?: string;
    limit?: string;
  }): Promise<{ wallets: any[]; success: boolean; error?: string }> {
    return this.listWallets(filters);
  }

  // Get transfers (using wallet history across all wallets)
  async getTransfers(): Promise<{ transfers: any[]; success: boolean; error?: string }> {
    try {
      // Get all wallets first
      const walletsResponse = await this.listWallets();
      if (!walletsResponse.success) {
        return { transfers: [], success: false, error: walletsResponse.error };
      }

      // Collect transfers from all wallets
      const allTransfers: any[] = [];
      for (const wallet of walletsResponse.wallets) {
        try {
          const history = await this.getWalletHistory(wallet.id);
          allTransfers.push(...history);
        } catch (error) {
          console.warn(`Failed to get history for wallet ${wallet.id}:`, error);
        }
      }

      return { transfers: allTransfers, success: true };
    } catch (error) {
      return {
        transfers: [],
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Get policy approvals
  async getPolicyApprovals(): Promise<{ approvals: any[]; success: boolean; error?: string }> {
    try {
      const approvals = await this.listApprovals();
      return { approvals, success: true };
    } catch (error) {
      return {
        approvals: [],
        success: false,
        error: (error as Error).message
      };
    }
  }

  // ===== Health Check - REAL implementation =====

  /**
   * Health check - REAL implementation
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
    error?: string;
  }> {
    try {
      // Test basic connectivity by listing wallets
      await this.client.wallets.listWallets();
      
      return {
        healthy: true,
        services: {
          dfns: true,
          authentication: true,
          api: true
        }
      };
    } catch (error) {
      return {
        healthy: false,
        services: {
          dfns: false,
          authentication: false,
          api: false
        },
        error: (error as Error).message
      };
    }
  }
}

// Export singleton instance
export const realDfnsService = new RealDfnsService();
export const dfnsService = realDfnsService; // Export with expected name for compatibility
