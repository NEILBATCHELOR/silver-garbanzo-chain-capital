/**
 * DFNS Signature Generation Service
 * 
 * Implements current DFNS Generate Signature API methods for signing transactions and messages
 * Supports multiple blockchain networks and signature types
 * Based on: https://docs.dfns.co/d/api-docs/wallets/generate-signature-from-wallet
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError, DfnsValidationError, DfnsNetworkError } from '../../types/dfns/errors';

// ==============================================
// SIGNATURE GENERATION TYPES
// ==============================================

export interface DfnsSignatureRequest {
  walletId: string;
  body: DfnsSignatureBody;
  userActionToken?: string;
}

export interface DfnsSignatureBody {
  kind: DfnsSignatureKind;
  // Additional properties depend on the kind and network
  [key: string]: any;
}

export type DfnsSignatureKind = 
  // EVM Networks (Ethereum, Polygon, etc.)
  | 'Transaction'      // EVM transaction signing
  | 'Message'          // Arbitrary message signing
  | 'Eip712'          // EIP-712 typed data signing
  // Bitcoin/Litecoin
  | 'Psbt'            // Bitcoin PSBT signing
  | 'Bip322'          // BIP-322 message signing
  // Solana
  | 'Transaction'     // Solana transaction
  | 'Message'         // Solana message
  // Other chains
  | 'SignerPayload'   // Substrate (Polkadot)
  | 'TransactionHash' // Algorand
  | 'RawPayload'      // TON
  | 'TxnBytes'        // NEAR;

export interface DfnsSignatureResponse {
  id: string;
  walletId: string;
  network: string;
  requester: {
    userId: string;
    tokenId?: string;
    appId: string;
  };
  requestBody: DfnsSignatureBody;
  status: 'Pending' | 'Signed' | 'Failed' | 'Rejected';
  signature?: DfnsSignature;
  signedData?: string;
  dateRequested: string;
  dateSigned?: string;
  failureReason?: string;
}

export interface DfnsSignature {
  r: string;
  s: string;
  recid?: number;
  encoded: string;
}

// ==============================================
// EVM SIGNATURE TYPES
// ==============================================

export interface DfnsEvmTransactionSignature extends DfnsSignatureBody {
  kind: 'Transaction';
  transaction: string; // Hex-encoded unsigned transaction
}

export interface DfnsEvmMessageSignature extends DfnsSignatureBody {
  kind: 'Message';
  message: string; // Hex-encoded message
}

export interface DfnsEvmEip712Signature extends DfnsSignatureBody {
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

// ==============================================
// BITCOIN SIGNATURE TYPES
// ==============================================

export interface DfnsBitcoinPsbtSignature extends DfnsSignatureBody {
  kind: 'Psbt';
  psbt: string; // Hex-encoded PSBT
}

export interface DfnsBitcoinBip322Signature extends DfnsSignatureBody {
  kind: 'Bip322';
  hash: string; // Hex-encoded message hash
}

// ==============================================
// SOLANA SIGNATURE TYPES
// ==============================================

export interface DfnsSolanaTransactionSignature extends DfnsSignatureBody {
  kind: 'Transaction';
  transaction: string; // Base64-encoded unsigned transaction
}

export interface DfnsSolanaMessageSignature extends DfnsSignatureBody {
  kind: 'Message';
  message: string; // Hex-encoded message
}

// ==============================================
// OTHER CHAIN SIGNATURE TYPES
// ==============================================

export interface DfnsSubstrateSignature extends DfnsSignatureBody {
  kind: 'SignerPayload';
  payload: string;
  transactionVersion: string;
  signedExtensions: string[];
}

export interface DfnsAlgorandSignature extends DfnsSignatureBody {
  kind: 'TransactionHash';
  txnHash: string;
}

export interface DfnsTonSignature extends DfnsSignatureBody {
  kind: 'RawPayload';
  payload: string;
}

export interface DfnsNearSignature extends DfnsSignatureBody {
  kind: 'TxnBytes';
  txnBytes: string;
}

// ==============================================
// SERVICE IMPLEMENTATION
// ==============================================

export class DfnsSignatureGenerationService {
  constructor(private client: WorkingDfnsClient) {}

  // ==============================================
  // CORE SIGNATURE GENERATION
  // ==============================================

  /**
   * Generate signature for wallet
   * 
   * @param request - Signature generation request
   * @returns Signature response
   */
  async generateSignature(request: DfnsSignatureRequest): Promise<DfnsSignatureResponse> {
    try {
      this.validateSignatureRequest(request);

      const response = await this.client.makeRequest<DfnsSignatureResponse>(
        'POST',
        `/wallets/${request.walletId}/signatures`,
        request.body,
        request.userActionToken
      );

      console.log(`✅ Signature generated for wallet ${request.walletId}:`, {
        id: response.id,
        kind: request.body.kind,
        status: response.status
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to generate signature for wallet ${request.walletId}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }

      throw new DfnsError(
        `Failed to generate signature: ${error}`,
        'SIGNATURE_GENERATION_FAILED',
        { walletId: request.walletId, kind: request.body.kind }
      );
    }
  }

  /**
   * Get signature request by ID
   * 
   * @param walletId - Wallet ID
   * @param signatureId - Signature request ID
   * @returns Signature details
   */
  async getSignatureRequest(walletId: string, signatureId: string): Promise<DfnsSignatureResponse> {
    try {
      const response = await this.client.makeRequest<DfnsSignatureResponse>(
        'GET',
        `/wallets/${walletId}/signatures/${signatureId}`
      );

      return response;
    } catch (error) {
      throw new DfnsError(
        `Failed to get signature request: ${error}`,
        'GET_SIGNATURE_FAILED',
        { walletId, signatureId }
      );
    }
  }

  /**
   * List signature requests for wallet
   * 
   * @param walletId - Wallet ID
   * @param options - List options
   * @returns List of signature requests
   */
  async listSignatureRequests(
    walletId: string,
    options: {
      limit?: number;
      paginationToken?: string;
      status?: 'Pending' | 'Signed' | 'Failed' | 'Rejected';
    } = {}
  ): Promise<{ items: DfnsSignatureResponse[]; nextPageToken?: string }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.paginationToken) queryParams.append('paginationToken', options.paginationToken);
      if (options.status) queryParams.append('status', options.status);

      const query = queryParams.toString();
      const endpoint = `/wallets/${walletId}/signatures${query ? `?${query}` : ''}`;

      const response = await this.client.makeRequest<{
        items: DfnsSignatureResponse[];
        nextPageToken?: string;
      }>('GET', endpoint);

      return response;
    } catch (error) {
      throw new DfnsError(
        `Failed to list signature requests: ${error}`,
        'LIST_SIGNATURES_FAILED',
        { walletId }
      );
    }
  }

  // ==============================================
  // EVM SIGNATURE METHODS
  // ==============================================

  /**
   * Sign EVM transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - Hex-encoded unsigned transaction
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signEvmTransaction(
    walletId: string,
    transaction: string,
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'Transaction',
        transaction
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  /**
   * Sign EVM message
   * 
   * @param walletId - Wallet ID
   * @param message - Hex-encoded message
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signEvmMessage(
    walletId: string,
    message: string,
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'Message',
        message
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  /**
   * Sign EIP-712 typed data
   * 
   * @param walletId - Wallet ID
   * @param typedData - EIP-712 typed data structure
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signEip712TypedData(
    walletId: string,
    typedData: {
      types: Record<string, Array<{ name: string; type: string }>>;
      domain: {
        name?: string;
        version?: string;
        chainId?: number;
        verifyingContract?: string;
        salt?: string;
      };
      message: Record<string, any>;
    },
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'Eip712',
        ...typedData
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  // ==============================================
  // BITCOIN SIGNATURE METHODS
  // ==============================================

  /**
   * Sign Bitcoin PSBT
   * 
   * @param walletId - Wallet ID
   * @param psbt - Hex-encoded PSBT
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signBitcoinPsbt(
    walletId: string,
    psbt: string,
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'Psbt',
        psbt
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  /**
   * Sign Bitcoin message using BIP-322
   * 
   * @param walletId - Wallet ID
   * @param messageHash - Hex-encoded message hash
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signBitcoinMessage(
    walletId: string,
    messageHash: string,
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'Bip322',
        hash: messageHash
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  // ==============================================
  // SOLANA SIGNATURE METHODS
  // ==============================================

  /**
   * Sign Solana transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - Base64-encoded unsigned transaction
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signSolanaTransaction(
    walletId: string,
    transaction: string,
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'Transaction',
        transaction
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  /**
   * Sign Solana message
   * 
   * @param walletId - Wallet ID
   * @param message - Hex-encoded message
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signSolanaMessage(
    walletId: string,
    message: string,
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'Message',
        message
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  // ==============================================
  // OTHER CHAIN SIGNATURE METHODS
  // ==============================================

  /**
   * Sign Substrate (Polkadot) signer payload
   * 
   * @param walletId - Wallet ID
   * @param payload - Hex-encoded signer payload
   * @param transactionVersion - Transaction version
   * @param signedExtensions - Signed extensions array
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signSubstratePayload(
    walletId: string,
    payload: string,
    transactionVersion: string,
    signedExtensions: string[],
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'SignerPayload',
        payload,
        transactionVersion,
        signedExtensions
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  /**
   * Sign Algorand transaction hash
   * 
   * @param walletId - Wallet ID
   * @param txnHash - Transaction hash
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signAlgorandTransaction(
    walletId: string,
    txnHash: string,
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'TransactionHash',
        txnHash
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  /**
   * Sign TON raw payload
   * 
   * @param walletId - Wallet ID
   * @param payload - Raw payload
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signTonPayload(
    walletId: string,
    payload: string,
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'RawPayload',
        payload
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  /**
   * Sign NEAR transaction bytes
   * 
   * @param walletId - Wallet ID
   * @param txnBytes - Transaction bytes
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signNearTransaction(
    walletId: string,
    txnBytes: string,
    userActionToken?: string
  ): Promise<DfnsSignatureResponse> {
    const request: DfnsSignatureRequest = {
      walletId,
      body: {
        kind: 'TxnBytes',
        txnBytes
      },
      userActionToken
    };

    return this.generateSignature(request);
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  /**
   * Get signature statistics for wallet
   * 
   * @param walletId - Wallet ID
   * @returns Signature statistics
   */
  async getSignatureStatistics(walletId: string): Promise<{
    total: number;
    pending: number;
    signed: number;
    failed: number;
    rejected: number;
    byKind: Record<string, number>;
  }> {
    try {
      const response = await this.listSignatureRequests(walletId, { limit: 1000 });
      const signatures = response.items;

      const stats = {
        total: signatures.length,
        pending: 0,
        signed: 0,
        failed: 0,
        rejected: 0,
        byKind: {} as Record<string, number>
      };

      signatures.forEach(sig => {
        // Count by status
        switch (sig.status) {
          case 'Pending':
            stats.pending++;
            break;
          case 'Signed':
            stats.signed++;
            break;
          case 'Failed':
            stats.failed++;
            break;
          case 'Rejected':
            stats.rejected++;
            break;
        }

        // Count by kind
        const kind = sig.requestBody.kind;
        stats.byKind[kind] = (stats.byKind[kind] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw new DfnsError(
        `Failed to get signature statistics: ${error}`,
        'SIGNATURE_STATS_FAILED',
        { walletId }
      );
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
      throw new DfnsError(
        `Failed to get pending signatures: ${error}`,
        'PENDING_SIGNATURES_FAILED',
        { walletId }
      );
    }
  }

  /**
   * Get recent signature requests
   * 
   * @param walletId - Wallet ID
   * @param count - Number of recent signatures to get
   * @returns Recent signature requests
   */
  async getRecentSignatures(walletId: string, count: number = 10): Promise<DfnsSignatureResponse[]> {
    try {
      const response = await this.listSignatureRequests(walletId, { limit: count });
      return response.items;
    } catch (error) {
      throw new DfnsError(
        `Failed to get recent signatures: ${error}`,
        'RECENT_SIGNATURES_FAILED',
        { walletId }
      );
    }
  }

  // ==============================================
  // VALIDATION METHODS
  // ==============================================

  /**
   * Validate signature request
   * 
   * @param request - Signature request to validate
   */
  private validateSignatureRequest(request: DfnsSignatureRequest): void {
    if (!request.walletId) {
      throw new DfnsValidationError('Wallet ID is required');
    }

    if (!request.body || !request.body.kind) {
      throw new DfnsValidationError('Signature body with kind is required');
    }

    // Validate based on signature kind
    switch (request.body.kind) {
      case 'Transaction':
        if (!request.body.transaction) {
          throw new DfnsValidationError('Transaction data is required for Transaction signatures');
        }
        break;
      
      case 'Message':
        if (!request.body.message) {
          throw new DfnsValidationError('Message data is required for Message signatures');
        }
        break;
      
      case 'Eip712':
        if (!request.body.types || !request.body.domain || !request.body.message) {
          throw new DfnsValidationError('Types, domain, and message are required for EIP-712 signatures');
        }
        break;
      
      case 'Psbt':
        if (!request.body.psbt) {
          throw new DfnsValidationError('PSBT data is required for PSBT signatures');
        }
        break;
      
      case 'Bip322':
        if (!request.body.hash) {
          throw new DfnsValidationError('Hash is required for BIP-322 signatures');
        }
        break;
      
      case 'SignerPayload':
        if (!request.body.payload) {
          throw new DfnsValidationError('Payload is required for SignerPayload signatures');
        }
        break;
      
      case 'TransactionHash':
        if (!request.body.txnHash) {
          throw new DfnsValidationError('Transaction hash is required for TransactionHash signatures');
        }
        break;
      
      case 'RawPayload':
        if (!request.body.payload) {
          throw new DfnsValidationError('Payload is required for RawPayload signatures');
        }
        break;
      
      case 'TxnBytes':
        if (!request.body.txnBytes) {
          throw new DfnsValidationError('Transaction bytes are required for TxnBytes signatures');
        }
        break;
      
      default:
        throw new DfnsValidationError(`Unsupported signature kind: ${request.body.kind}`);
    }
  }
}

// ==============================================
// FACTORY FUNCTION
// ==============================================

/**
 * Create DFNS Signature Generation Service instance
 * 
 * @param client - Working DFNS client
 * @returns Signature generation service
 */
export function getDfnsSignatureGenerationService(client: WorkingDfnsClient): DfnsSignatureGenerationService {
  return new DfnsSignatureGenerationService(client);
}
