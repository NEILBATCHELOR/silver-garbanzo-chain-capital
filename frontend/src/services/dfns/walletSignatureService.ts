/**
 * DFNS Wallet Signature Generation Service
 * 
 * Implements the current DFNS Wallet Signature API
 * POST /wallets/{walletId}/signatures
 * 
 * Supports multiple signature types:
 * - Hash: Raw hash signing  
 * - Transaction: Blockchain transaction signing
 * - Eip712: Ethereum typed data signing
 * - Psbt: Bitcoin PSBT signing
 * - Bip322: Bitcoin message signing
 * 
 * Requires User Action Signing for all operations
 * Works with Service Account/PAT token authentication
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError } from '../../types/dfns/errors';

// ==============================
// DFNS API SIGNATURE TYPES
// ==============================

/**
 * Base signature request interface
 */
export interface DfnsSignatureRequest {
  kind: string;
  [key: string]: any;
}

/**
 * Raw hash signature request
 */
export interface DfnsHashSignatureRequest extends DfnsSignatureRequest {
  kind: 'Hash';
  hash: string; // Hex-encoded hash to sign
}

/**
 * Blockchain transaction signature request
 */
export interface DfnsTransactionSignatureRequest extends DfnsSignatureRequest {
  kind: 'Transaction';
  transaction: string; // Hex-encoded transaction
}

/**
 * Ethereum EIP-712 typed data signature request
 */
export interface DfnsEip712SignatureRequest extends DfnsSignatureRequest {
  kind: 'Eip712';
  types: Record<string, Array<{ name: string; type: string }>>;
  domain: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
    salt?: string;
  };
  message: Record<string, any>;
}

/**
 * Bitcoin PSBT signature request
 */
export interface DfnsPsbtSignatureRequest extends DfnsSignatureRequest {
  kind: 'Psbt';
  psbt: string; // Hex-encoded PSBT
}

/**
 * Bitcoin BIP-322 message signature request
 */
export interface DfnsBip322SignatureRequest extends DfnsSignatureRequest {
  kind: 'Bip322';
  message: string; // Message to sign
  address?: string; // Optional specific address
}

/**
 * Union type for all signature request types
 */
export type DfnsSignatureRequestBody = 
  | DfnsHashSignatureRequest
  | DfnsTransactionSignatureRequest 
  | DfnsEip712SignatureRequest
  | DfnsPsbtSignatureRequest
  | DfnsBip322SignatureRequest;

// ==============================
// DFNS API RESPONSE TYPES  
// ==============================

/**
 * DFNS signature response from API
 */
export interface DfnsSignatureResponse {
  id: string;
  walletId: string;
  network: string;
  requester: {
    userId: string;
    tokenId?: string;
    appId: string;
  };
  requestBody: DfnsSignatureRequestBody;
  status: 'Pending' | 'Executing' | 'Signed' | 'Failed' | 'Rejected';
  signature?: {
    r: string;
    s: string;
    recid?: number;
    encoded?: string; // For some signature types
  };
  reason?: string; // If failed or rejected
  dateCreated: string;
  dateUpdated: string;
}

/**
 * List signature requests response
 */
export interface DfnsListSignatureRequestsResponse {
  items: DfnsSignatureResponse[];
  nextPageToken?: string;
}

// ==============================
// SERVICE OPTIONS
// ==============================

export interface DfnsSignatureOptions {
  userActionToken?: string;
  syncToDatabase?: boolean;
  metadata?: Record<string, any>;
}

export interface DfnsListSignatureOptions {
  limit?: number;
  paginationToken?: string;
  status?: DfnsSignatureResponse['status'];
}

// ==============================
// DFNS WALLET SIGNATURE SERVICE
// ==============================

export class DfnsWalletSignatureService {
  constructor(private client: WorkingDfnsClient) {}

  /**
   * Generate a signature from a wallet
   * Requires User Action Signing for all operations
   * 
   * @param walletId - Wallet ID to sign with
   * @param request - Signature request body
   * @param options - Signing options
   * @returns Signature response
   */
  async generateSignature(
    walletId: string,
    request: DfnsSignatureRequestBody,
    options: DfnsSignatureOptions = {}
  ): Promise<DfnsSignatureResponse> {
    try {
      const { userActionToken, syncToDatabase = false } = options;

      // Validate wallet ID
      if (!walletId || typeof walletId !== 'string') {
        throw new DfnsError('Invalid wallet ID provided', 'INVALID_WALLET_ID');
      }

      // Validate signature request
      this.validateSignatureRequest(request);

      // User Action Signing is REQUIRED for signature generation
      if (!userActionToken) {
        throw new DfnsError(
          'User Action Signing required for signature generation. Please provide userActionToken.',
          'USER_ACTION_REQUIRED',
          { 
            operation: 'generateSignature',
            walletId,
            signatureKind: request.kind,
            requiredPermission: 'Wallets:GenerateSignature'
          }
        );
      }

      console.log(`🔏 Generating ${request.kind} signature for wallet: ${walletId}`);

      const response = await this.client.makeRequest<DfnsSignatureResponse>(
        'POST',
        `/wallets/${walletId}/signatures`,
        request,
        userActionToken
      );

      // Sync to database if requested
      if (syncToDatabase && response.id) {
        await this.syncSignatureToDatabase(response);
      }

      console.log(`✅ Signature generated successfully:`, {
        id: response.id,
        status: response.status,
        kind: request.kind
      });

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      throw new DfnsError(
        `Failed to generate signature: ${error}`,
        'SIGNATURE_GENERATION_FAILED',
        { walletId, signatureKind: request.kind }
      );
    }
  }

  /**
   * Get signature request by ID
   * 
   * @param walletId - Wallet ID
   * @param signatureId - Signature request ID
   * @returns Signature request details
   */
  async getSignatureRequest(
    walletId: string,
    signatureId: string
  ): Promise<DfnsSignatureResponse> {
    try {
      if (!walletId || !signatureId) {
        throw new DfnsError('Wallet ID and signature ID are required', 'INVALID_PARAMETERS');
      }

      const response = await this.client.makeRequest<DfnsSignatureResponse>(
        'GET',
        `/wallets/${walletId}/signatures/${signatureId}`
      );

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      throw new DfnsError(
        `Failed to get signature request: ${error}`,
        'GET_SIGNATURE_FAILED',
        { walletId, signatureId }
      );
    }
  }

  /**
   * List signature requests for a wallet
   * 
   * @param walletId - Wallet ID
   * @param options - List options
   * @returns List of signature requests
   */
  async listSignatureRequests(
    walletId: string,
    options: DfnsListSignatureOptions = {}
  ): Promise<DfnsListSignatureRequestsResponse> {
    try {
      if (!walletId) {
        throw new DfnsError('Wallet ID is required', 'INVALID_WALLET_ID');
      }

      const queryParams = new URLSearchParams();
      
      if (options.limit) {
        queryParams.append('limit', options.limit.toString());
      }
      
      if (options.paginationToken) {
        queryParams.append('paginationToken', options.paginationToken);
      }
      
      if (options.status) {
        queryParams.append('status', options.status);
      }

      const endpoint = `/wallets/${walletId}/signatures${queryParams.toString() ? `?${queryParams}` : ''}`;
      
      const response = await this.client.makeRequest<DfnsListSignatureRequestsResponse>(
        'GET',
        endpoint
      );

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      throw new DfnsError(
        `Failed to list signature requests: ${error}`,
        'LIST_SIGNATURES_FAILED',
        { walletId }
      );
    }
  }

  // ==============================
  // CONVENIENCE METHODS BY TYPE
  // ==============================

  /**
   * Generate hash signature
   * 
   * @param walletId - Wallet ID
   * @param hash - Hex-encoded hash to sign
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Signature response
   */
  async generateHashSignature(
    walletId: string,
    hash: string,
    userActionToken?: string,
    options: Omit<DfnsSignatureOptions, 'userActionToken'> = {}
  ): Promise<DfnsSignatureResponse> {
    if (!hash.startsWith('0x')) {
      hash = `0x${hash}`;
    }

    return this.generateSignature(
      walletId,
      { kind: 'Hash', hash },
      { ...options, userActionToken }
    );
  }

  /**
   * Generate transaction signature
   * 
   * @param walletId - Wallet ID
   * @param transaction - Hex-encoded transaction
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Signature response
   */
  async generateTransactionSignature(
    walletId: string,
    transaction: string,
    userActionToken?: string,
    options: Omit<DfnsSignatureOptions, 'userActionToken'> = {}
  ): Promise<DfnsSignatureResponse> {
    if (!transaction.startsWith('0x')) {
      transaction = `0x${transaction}`;
    }

    return this.generateSignature(
      walletId,
      { kind: 'Transaction', transaction },
      { ...options, userActionToken }
    );
  }

  /**
   * Generate EIP-712 signature for typed data
   * 
   * @param walletId - Wallet ID
   * @param typedData - EIP-712 typed data
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Signature response
   */
  async generateEip712Signature(
    walletId: string,
    typedData: {
      types: Record<string, Array<{ name: string; type: string }>>;
      domain: DfnsEip712SignatureRequest['domain'];
      message: Record<string, any>;
    },
    userActionToken?: string,
    options: Omit<DfnsSignatureOptions, 'userActionToken'> = {}
  ): Promise<DfnsSignatureResponse> {
    return this.generateSignature(
      walletId,
      { 
        kind: 'Eip712',
        types: typedData.types,
        domain: typedData.domain,
        message: typedData.message
      },
      { ...options, userActionToken }
    );
  }

  /**
   * Generate Bitcoin PSBT signature
   * 
   * @param walletId - Wallet ID
   * @param psbt - Hex-encoded PSBT
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Signature response
   */
  async generatePsbtSignature(
    walletId: string,
    psbt: string,
    userActionToken?: string,
    options: Omit<DfnsSignatureOptions, 'userActionToken'> = {}
  ): Promise<DfnsSignatureResponse> {
    if (!psbt.startsWith('0x')) {
      psbt = `0x${psbt}`;
    }

    return this.generateSignature(
      walletId,
      { kind: 'Psbt', psbt },
      { ...options, userActionToken }
    );
  }

  /**
   * Generate BIP-322 message signature
   * 
   * @param walletId - Wallet ID
   * @param message - Message to sign
   * @param userActionToken - Required User Action token
   * @param address - Optional specific address
   * @param options - Additional options
   * @returns Signature response
   */
  async generateBip322Signature(
    walletId: string,
    message: string,
    userActionToken?: string,
    address?: string,
    options: Omit<DfnsSignatureOptions, 'userActionToken'> = {}
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsBip322SignatureRequest = {
      kind: 'Bip322',
      message
    };

    if (address) {
      request.address = address;
    }

    return this.generateSignature(
      walletId,
      request,
      { ...options, userActionToken }
    );
  }

  // ==============================
  // STATISTICS & MONITORING
  // ==============================

  /**
   * Get signature statistics for a wallet
   * 
   * @param walletId - Wallet ID
   * @returns Signature statistics
   */
  async getSignatureStatistics(walletId: string) {
    try {
      const response = await this.listSignatureRequests(walletId, { limit: 1000 });
      const signatures = response.items;

      const stats = {
        total: signatures.length,
        byStatus: signatures.reduce((acc, sig) => {
          acc[sig.status] = (acc[sig.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byKind: signatures.reduce((acc, sig) => {
          acc[sig.requestBody.kind] = (acc[sig.requestBody.kind] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recent: signatures
          .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
          .slice(0, 10),
        successRate: signatures.length > 0 
          ? (signatures.filter(sig => sig.status === 'Signed').length / signatures.length) * 100
          : 0
      };

      return stats;
    } catch (error) {
      console.error('❌ Failed to get signature statistics:', error);
      return {
        total: 0,
        byStatus: {},
        byKind: {},
        recent: [],
        successRate: 0
      };
    }
  }

  /**
   * Get pending signature requests
   * 
   * @param walletId - Wallet ID
   * @returns Pending signature requests
   */
  async getPendingSignatures(walletId: string): Promise<DfnsSignatureResponse[]> {
    try {
      const response = await this.listSignatureRequests(walletId, { 
        status: 'Pending',
        limit: 100
      });

      return response.items;
    } catch (error) {
      console.error('❌ Failed to get pending signatures:', error);
      return [];
    }
  }

  /**
   * Get recent signature requests
   * 
   * @param walletId - Wallet ID
   * @param count - Number of recent signatures (default: 10)
   * @returns Recent signature requests
   */
  async getRecentSignatures(walletId: string, count: number = 10): Promise<DfnsSignatureResponse[]> {
    try {
      const response = await this.listSignatureRequests(walletId, { 
        limit: count
      });

      return response.items
        .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
        .slice(0, count);
    } catch (error) {
      console.error('❌ Failed to get recent signatures:', error);
      return [];
    }
  }

  // ==============================
  // VALIDATION & UTILITIES
  // ==============================

  /**
   * Validate signature request body
   * 
   * @param request - Signature request to validate
   */
  private validateSignatureRequest(request: DfnsSignatureRequestBody): void {
    if (!request || typeof request !== 'object') {
      throw new DfnsError('Invalid signature request', 'INVALID_REQUEST');
    }

    if (!request.kind) {
      throw new DfnsError('Signature kind is required', 'MISSING_KIND');
    }

    switch (request.kind) {
      case 'Hash':
        const hashReq = request as DfnsHashSignatureRequest;
        if (!hashReq.hash) {
          throw new DfnsError('Hash is required for Hash signature', 'MISSING_HASH');
        }
        break;

      case 'Transaction':
        const txReq = request as DfnsTransactionSignatureRequest;
        if (!txReq.transaction) {
          throw new DfnsError('Transaction is required for Transaction signature', 'MISSING_TRANSACTION');
        }
        break;

      case 'Eip712':
        const eipReq = request as DfnsEip712SignatureRequest;
        if (!eipReq.types || !eipReq.domain || !eipReq.message) {
          throw new DfnsError('Types, domain, and message are required for EIP-712 signature', 'MISSING_EIP712_DATA');
        }
        break;

      case 'Psbt':
        const psbtReq = request as DfnsPsbtSignatureRequest;
        if (!psbtReq.psbt) {
          throw new DfnsError('PSBT is required for PSBT signature', 'MISSING_PSBT');
        }
        break;

      case 'Bip322':
        const bipReq = request as DfnsBip322SignatureRequest;
        if (!bipReq.message) {
          throw new DfnsError('Message is required for BIP-322 signature', 'MISSING_MESSAGE');
        }
        break;

      default:
        throw new DfnsError(`Unsupported signature kind: ${(request as any).kind}`, 'UNSUPPORTED_KIND');
    }
  }

  /**
   * Sync signature to database (if database tables exist)
   * 
   * @param signature - Signature response to sync
   */
  private async syncSignatureToDatabase(signature: DfnsSignatureResponse): Promise<void> {
    try {
      // Implementation would sync to dfns_wallet_signatures table
      // For now, just log the operation
      console.log('📊 Syncing signature to database:', {
        id: signature.id,
        walletId: signature.walletId,
        status: signature.status,
        kind: signature.requestBody.kind
      });
    } catch (error) {
      console.warn('⚠️ Failed to sync signature to database:', error);
      // Don't throw - this is not critical for the operation
    }
  }

  /**
   * Check if signature generation is supported for network
   * 
   * @param network - Network name
   * @param signatureKind - Signature kind
   * @returns Whether signature generation is supported
   */
  isSupportedForNetwork(network: string, signatureKind: string): boolean {
    const networkSupport: Record<string, string[]> = {
      // Ethereum and EVM chains
      'Ethereum': ['Hash', 'Transaction', 'Eip712'],
      'EthereumSepolia': ['Hash', 'Transaction', 'Eip712'],
      'Polygon': ['Hash', 'Transaction', 'Eip712'],
      'Arbitrum': ['Hash', 'Transaction', 'Eip712'],
      'Optimism': ['Hash', 'Transaction', 'Eip712'],
      'Base': ['Hash', 'Transaction', 'Eip712'],
      
      // Bitcoin chains
      'Bitcoin': ['Hash', 'Psbt', 'Bip322'],
      'BitcoinTestnet3': ['Hash', 'Psbt', 'Bip322'],
      'Litecoin': ['Hash', 'Psbt', 'Bip322'],
      
      // Other chains
      'Solana': ['Hash', 'Transaction'],
      'SolanaDevnet': ['Hash', 'Transaction'],
      'Aptos': ['Hash', 'Transaction'],
      'Sui': ['Hash', 'Transaction']
    };

    const supportedKinds = networkSupport[network] || ['Hash'];
    return supportedKinds.includes(signatureKind);
  }
}

// ==============================
// GLOBAL SERVICE INSTANCE
// ==============================

let globalWalletSignatureService: DfnsWalletSignatureService | null = null;

/**
 * Get or create the global DFNS Wallet Signature service instance
 */
export function getDfnsWalletSignatureService(client?: WorkingDfnsClient): DfnsWalletSignatureService {
  if (!globalWalletSignatureService) {
    if (!client) {
      throw new DfnsError('WorkingDfnsClient is required to create DfnsWalletSignatureService', 'CLIENT_REQUIRED');
    }
    globalWalletSignatureService = new DfnsWalletSignatureService(client);
  }
  return globalWalletSignatureService;
}

/**
 * Reset the global service instance
 */
export function resetDfnsWalletSignatureService(): void {
  globalWalletSignatureService = null;
}
