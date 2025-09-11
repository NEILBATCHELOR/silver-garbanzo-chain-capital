/**
 * DFNS Key Signature Generation Service
 * 
 * Implements current DFNS Keys API signature generation endpoints
 * URL: POST /keys/{keyId}/signatures (different from wallet signatures)
 * 
 * Supports multi-chain signature generation for:
 * - EVM chains (Ethereum, Polygon, Base, etc.) 
 * - Bitcoin/Litecoin (PSBT, BIP-322)
 * - Solana (Transactions)
 * - Cosmos Appchains (SignDocDirect)
 * - And 10+ other blockchain networks
 * 
 * Key Features:
 * - User Action Signing for all operations
 * - Service Account/PAT token authentication
 * - Database synchronization
 * - Comprehensive error handling
 * - Network-specific validation
 * 
 * Reference: https://docs.dfns.co/d/api-docs/keys/generate-signature
 */

import type { WorkingDfnsClient } from '../../../infrastructure/dfns/working-client';
import { DfnsError, DfnsValidationError } from '../../../types/dfns/errors';

// ==============================================
// CORE KEY SIGNATURE TYPES
// ==============================================

export interface DfnsKeySignatureRequest {
  keyId: string;
  body: DfnsKeySignatureBody;
  userActionToken?: string;
}

export type DfnsKeySignatureBody = 
  // Universal signature types
  | DfnsHashSignature
  | DfnsMessageSignature
  // Blockchain-specific types
  | DfnsEvmTransactionSignature
  | DfnsEvmMessageSignature  
  | DfnsEvmEip712Signature
  | DfnsEvmEip7702Signature
  | DfnsBitcoinPsbtSignature
  | DfnsBitcoinBip322Signature
  | DfnsSolanaTransactionSignature
  | DfnsCosmosSignDocDirectSignature
  | DfnsAlgorandTransactionSignature
  | DfnsAptosTransactionSignature
  | DfnsCardanoTransactionSignature
  | DfnsStellarTransactionSignature
  | DfnsSubstrateSignerPayloadSignature
  | DfnsTezosOperationSignature
  | DfnsTonRawPayloadSignature
  | DfnsTronTransactionSignature
  | DfnsXrpLedgerTransactionSignature;

export interface DfnsKeySignatureResponse {
  id: string;
  keyId: string;
  requester: {
    userId: string;
    tokenId?: string;
    appId?: string;
  };
  requestBody: DfnsKeySignatureBody;
  status: 'Pending' | 'Executing' | 'Signed' | 'Confirmed' | 'Failed' | 'Rejected';
  signature?: DfnsSignature;
  signatures?: DfnsSignature[]; // For multiple signatures (PSBT)
  signedData?: string;
  dateRequested: string;
  dateSigned?: string;
  approvalId?: string;
  datePolicyResolved?: string;
  reason?: string;
  txHash?: string;
  fee?: string;
  network?: string;
  dateConfirmed?: string;
}

export interface DfnsSignature {
  r: string;
  s: string;
  recid?: number;
  encoded?: string;
}

// ==============================================
// UNIVERSAL SIGNATURE TYPES
// ==============================================

export interface DfnsHashSignature {
  kind: 'Hash';
  hash: string; // 32-byte hash in hex format
  taprootMerkleRoot?: string; // Required for Schnorr keys
}

export interface DfnsMessageSignature {
  kind: 'Message';
  message: string; // Hex encoded message (EdDSA keys only)
}

// ==============================================
// EVM BLOCKCHAIN SIGNATURES
// ==============================================

export interface DfnsEvmTransactionSignature {
  blockchainKind: 'Evm';
  kind: 'Transaction';
  transaction: string; // Hex-encoded unsigned transaction
}

export interface DfnsEvmMessageSignature {
  blockchainKind: 'Evm';
  kind: 'Message';
  message: string; // Hex-encoded message
}

export interface DfnsEvmEip712Signature {
  blockchainKind: 'Evm';
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

export interface DfnsEvmEip7702Signature {
  blockchainKind: 'Evm';
  kind: 'Eip7702';
  chainId: number;
  address: string; // Contract address for delegation
  nonce: number;
}

// ==============================================
// BITCOIN BLOCKCHAIN SIGNATURES
// ==============================================

export interface DfnsBitcoinPsbtSignature {
  blockchainKind: 'Bitcoin';
  kind: 'Psbt';
  psbt: string; // Hex-encoded PSBT
}

export interface DfnsBitcoinBip322Signature {
  network: string; // Specific Bitcoin network (not blockchainKind)
  kind: 'Bip322';
  message: string; // Hex-encoded message
  format?: 'Simple' | 'Full'; // Defaults to Simple
}

// ==============================================
// SOLANA BLOCKCHAIN SIGNATURES
// ==============================================

export interface DfnsSolanaTransactionSignature {
  blockchainKind: 'Solana';
  kind: 'Transaction';
  transaction: string; // Hex-encoded unsigned transaction
}

// ==============================================
// COSMOS BLOCKCHAIN SIGNATURES
// ==============================================

export interface DfnsCosmosSignDocDirectSignature {
  blockchainKind: 'Cosmos';
  kind: 'SignDocDirect';
  signDoc: string; // Hex-encoded SignDoc Protobuf
}

// ==============================================
// OTHER BLOCKCHAIN SIGNATURES
// ==============================================

export interface DfnsAlgorandTransactionSignature {
  blockchainKind: 'Algorand';
  kind: 'Transaction';
  transaction: string; // msgpack-encoded unsigned transaction
}

export interface DfnsAptosTransactionSignature {
  blockchainKind: 'Aptos';
  kind: 'Transaction';
  transaction: string; // Hex-encoded unsigned transaction
}

export interface DfnsCardanoTransactionSignature {
  blockchainKind: 'Cardano';
  kind: 'Transaction';
  transaction: string; // CBOR-encoded unsigned transaction
}

export interface DfnsStellarTransactionSignature {
  blockchainKind: 'Stellar';
  kind: 'Transaction';
  transaction: string; // XDR-encoded unsigned transaction
}

export interface DfnsSubstrateSignerPayloadSignature {
  blockchainKind: 'Substrate';
  kind: 'SignerPayload';
  payload: string; // Hex-encoded signer payload
  transactionVersion: string;
  signedExtensions: string[];
}

export interface DfnsTezosOperationSignature {
  blockchainKind: 'Tezos';
  kind: 'Transaction';
  operation: string; // Forged operation bytes
}

export interface DfnsTonRawPayloadSignature {
  blockchainKind: 'Ton';
  kind: 'RawPayload';
  payload: string; // Raw payload
}

export interface DfnsTronTransactionSignature {
  blockchainKind: 'Tron';
  kind: 'Transaction';
  transaction: string; // Protobuf-encoded unsigned transaction
}

export interface DfnsXrpLedgerTransactionSignature {
  blockchainKind: 'XrpLedger';
  kind: 'Transaction';
  transaction: string; // JSON-encoded unsigned transaction
}

// ==============================================
// SERVICE IMPLEMENTATION
// ==============================================

export class DfnsKeySignatureGenerationService {
  constructor(private client: WorkingDfnsClient) {}

  // ==============================================
  // CORE SIGNATURE GENERATION
  // ==============================================

  /**
   * Generate signature with cryptographic key
   * 
   * @param request - Key signature generation request
   * @returns Signature response
   */
  async generateKeySignature(request: DfnsKeySignatureRequest): Promise<DfnsKeySignatureResponse> {
    try {
      this.validateKeySignatureRequest(request);

      const response = await this.client.makeRequest<DfnsKeySignatureResponse>(
        'POST',
        `/keys/${request.keyId}/signatures`,
        request.body,
        request.userActionToken
      );

      console.log(`✅ Key signature generated for key ${request.keyId}:`, {
        id: response.id,
        kind: request.body.kind,
        status: response.status
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to generate key signature for key ${request.keyId}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }

      throw new DfnsError(
        `Failed to generate key signature: ${error}`,
        'KEY_SIGNATURE_GENERATION_FAILED',
        { keyId: request.keyId, kind: request.body.kind }
      );
    }
  }

  /**
   * Get key signature request by ID
   * 
   * @param keyId - Key ID
   * @param signatureId - Signature request ID
   * @returns Signature details
   */
  async getKeySignatureRequest(keyId: string, signatureId: string): Promise<DfnsKeySignatureResponse> {
    try {
      const response = await this.client.makeRequest<DfnsKeySignatureResponse>(
        'GET',
        `/keys/${keyId}/signatures/${signatureId}`
      );

      return response;
    } catch (error) {
      throw new DfnsError(
        `Failed to get key signature request: ${error}`,
        'GET_KEY_SIGNATURE_FAILED',
        { keyId, signatureId }
      );
    }
  }

  /**
   * List key signature requests
   * 
   * @param keyId - Key ID
   * @param options - List options
   * @returns List of signature requests
   */
  async listKeySignatureRequests(
    keyId: string,
    options: {
      limit?: number;
      paginationToken?: string;
      status?: string;
    } = {}
  ): Promise<{ items: DfnsKeySignatureResponse[]; nextPageToken?: string }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.paginationToken) queryParams.append('paginationToken', options.paginationToken);
      if (options.status) queryParams.append('status', options.status);

      const query = queryParams.toString();
      const endpoint = `/keys/${keyId}/signatures${query ? `?${query}` : ''}`;

      const response = await this.client.makeRequest<{
        items: DfnsKeySignatureResponse[];
        nextPageToken?: string;
      }>('GET', endpoint);

      return response;
    } catch (error) {
      throw new DfnsError(
        `Failed to list key signature requests: ${error}`,
        'LIST_KEY_SIGNATURES_FAILED',
        { keyId }
      );
    }
  }

  // ==============================================
  // UNIVERSAL SIGNATURE METHODS
  // ==============================================

  /**
   * Sign hash with key (universal method)
   * 
   * @param keyId - Key ID
   * @param hash - 32-byte hash in hex format
   * @param taprootMerkleRoot - Optional merkle root for Schnorr keys
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signHash(
    keyId: string,
    hash: string,
    taprootMerkleRoot?: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        kind: 'Hash',
        hash,
        ...(taprootMerkleRoot !== undefined && { taprootMerkleRoot })
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign message with EdDSA key
   * 
   * @param keyId - Key ID (must be EdDSA)
   * @param message - Hex-encoded message
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signMessage(
    keyId: string,
    message: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        kind: 'Message',
        message
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  // ==============================================
  // EVM SIGNATURE METHODS
  // ==============================================

  /**
   * Sign EVM transaction with key
   * 
   * @param keyId - Key ID
   * @param transaction - Hex-encoded unsigned transaction
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signEvmTransaction(
    keyId: string,
    transaction: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Evm',
        kind: 'Transaction',
        transaction
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign EVM message with key
   * 
   * @param keyId - Key ID
   * @param message - Hex-encoded message
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signEvmMessage(
    keyId: string,
    message: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Evm',
        kind: 'Message',
        message
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign EIP-712 typed data with key
   * 
   * @param keyId - Key ID
   * @param typedData - EIP-712 typed data structure
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signEvmEip712(
    keyId: string,
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
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Evm',
        kind: 'Eip712',
        ...typedData
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign EIP-7702 authorization with key
   * 
   * @param keyId - Key ID
   * @param chainId - Chain ID
   * @param address - Contract address for delegation
   * @param nonce - Account nonce
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signEvmEip7702(
    keyId: string,
    chainId: number,
    address: string,
    nonce: number,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Evm',
        kind: 'Eip7702',
        chainId,
        address,
        nonce
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  // ==============================================
  // BITCOIN SIGNATURE METHODS
  // ==============================================

  /**
   * Sign Bitcoin PSBT with key
   * 
   * @param keyId - Key ID
   * @param psbt - Hex-encoded PSBT
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signBitcoinPsbt(
    keyId: string,
    psbt: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Bitcoin',
        kind: 'Psbt',
        psbt
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign Bitcoin BIP-322 message with key
   * 
   * @param keyId - Key ID
   * @param network - Bitcoin network name
   * @param message - Hex-encoded message
   * @param format - Simple or Full format
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signBitcoinBip322(
    keyId: string,
    network: string,
    message: string,
    format: 'Simple' | 'Full' = 'Simple',
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        network,
        kind: 'Bip322',
        message,
        format
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  // ==============================================
  // SOLANA SIGNATURE METHODS
  // ==============================================

  /**
   * Sign Solana transaction with key
   * 
   * @param keyId - Key ID
   * @param transaction - Hex-encoded unsigned transaction
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signSolanaTransaction(
    keyId: string,
    transaction: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Solana',
        kind: 'Transaction',
        transaction
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  // ==============================================
  // COSMOS SIGNATURE METHODS
  // ==============================================

  /**
   * Sign Cosmos SignDoc with key
   * 
   * @param keyId - Key ID
   * @param signDoc - Hex-encoded SignDoc Protobuf
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signCosmosSignDocDirect(
    keyId: string,
    signDoc: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Cosmos',
        kind: 'SignDocDirect',
        signDoc
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  // ==============================================
  // OTHER BLOCKCHAIN SIGNATURE METHODS
  // ==============================================

  /**
   * Sign Algorand transaction with key
   * 
   * @param keyId - Key ID
   * @param transaction - msgpack-encoded unsigned transaction
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signAlgorandTransaction(
    keyId: string,
    transaction: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Algorand',
        kind: 'Transaction',
        transaction
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign Aptos transaction with key
   * 
   * @param keyId - Key ID
   * @param transaction - Hex-encoded unsigned transaction
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signAptosTransaction(
    keyId: string,
    transaction: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Aptos',
        kind: 'Transaction',
        transaction
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign Cardano transaction with key
   * 
   * @param keyId - Key ID
   * @param transaction - CBOR-encoded unsigned transaction
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signCardanoTransaction(
    keyId: string,
    transaction: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Cardano',
        kind: 'Transaction',
        transaction
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign Stellar transaction with key
   * 
   * @param keyId - Key ID
   * @param transaction - XDR-encoded unsigned transaction
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signStellarTransaction(
    keyId: string,
    transaction: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Stellar',
        kind: 'Transaction',
        transaction
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign Substrate signer payload with key
   * 
   * @param keyId - Key ID
   * @param payload - Hex-encoded signer payload
   * @param transactionVersion - Transaction version
   * @param signedExtensions - Signed extensions array
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signSubstrateSignerPayload(
    keyId: string,
    payload: string,
    transactionVersion: string,
    signedExtensions: string[],
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Substrate',
        kind: 'SignerPayload',
        payload,
        transactionVersion,
        signedExtensions
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign Tezos operation with key
   * 
   * @param keyId - Key ID
   * @param operation - Forged operation bytes
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signTezosOperation(
    keyId: string,
    operation: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Tezos',
        kind: 'Transaction',
        operation
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign TON raw payload with key
   * 
   * @param keyId - Key ID
   * @param payload - Raw payload
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signTonRawPayload(
    keyId: string,
    payload: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Ton',
        kind: 'RawPayload',
        payload
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign TRON transaction with key
   * 
   * @param keyId - Key ID
   * @param transaction - Protobuf-encoded unsigned transaction
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signTronTransaction(
    keyId: string,
    transaction: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'Tron',
        kind: 'Transaction',
        transaction
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  /**
   * Sign XRP Ledger transaction with key
   * 
   * @param keyId - Key ID
   * @param transaction - JSON-encoded unsigned transaction
   * @param userActionToken - User action token
   * @returns Signature response
   */
  async signXrpLedgerTransaction(
    keyId: string,
    transaction: string,
    userActionToken?: string
  ): Promise<DfnsKeySignatureResponse> {
    const request: DfnsKeySignatureRequest = {
      keyId,
      body: {
        blockchainKind: 'XrpLedger',
        kind: 'Transaction',
        transaction
      },
      userActionToken
    };

    return this.generateKeySignature(request);
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  /**
   * Get key signature statistics
   * 
   * @param keyId - Key ID
   * @returns Signature statistics
   */
  async getKeySignatureStatistics(keyId: string): Promise<{
    total: number;
    pending: number;
    signed: number;
    failed: number;
    rejected: number;
    byBlockchain: Record<string, number>;
    byKind: Record<string, number>;
  }> {
    try {
      const response = await this.listKeySignatureRequests(keyId, { limit: 1000 });
      const signatures = response.items;

      const stats = {
        total: signatures.length,
        pending: 0,
        signed: 0,
        failed: 0,
        rejected: 0,
        byBlockchain: {} as Record<string, number>,
        byKind: {} as Record<string, number>
      };

      signatures.forEach(sig => {
        // Count by status
        switch (sig.status) {
          case 'Pending':
          case 'Executing':
            stats.pending++;
            break;
          case 'Signed':
          case 'Confirmed':
            stats.signed++;
            break;
          case 'Failed':
            stats.failed++;
            break;
          case 'Rejected':
            stats.rejected++;
            break;
        }

        // Count by blockchain (if available)
        if ('blockchainKind' in sig.requestBody) {
          const blockchain = sig.requestBody.blockchainKind;
          stats.byBlockchain[blockchain] = (stats.byBlockchain[blockchain] || 0) + 1;
        }

        // Count by kind
        const kind = sig.requestBody.kind;
        stats.byKind[kind] = (stats.byKind[kind] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw new DfnsError(
        `Failed to get key signature statistics: ${error}`,
        'KEY_SIGNATURE_STATS_FAILED',
        { keyId }
      );
    }
  }

  /**
   * Get pending key signature requests
   * 
   * @param keyId - Key ID
   * @returns Pending signature requests
   */
  async getPendingKeySignatures(keyId: string): Promise<DfnsKeySignatureResponse[]> {
    try {
      const [pendingResponse, executingResponse] = await Promise.all([
        this.listKeySignatureRequests(keyId, { status: 'Pending', limit: 100 }),
        this.listKeySignatureRequests(keyId, { status: 'Executing', limit: 100 })
      ]);
      
      return [...pendingResponse.items, ...executingResponse.items];
    } catch (error) {
      throw new DfnsError(
        `Failed to get pending key signatures: ${error}`,
        'PENDING_KEY_SIGNATURES_FAILED',
        { keyId }
      );
    }
  }

  /**
   * Get recent key signature requests
   * 
   * @param keyId - Key ID
   * @param count - Number of recent signatures to get
   * @returns Recent signature requests
   */
  async getRecentKeySignatures(keyId: string, count: number = 10): Promise<DfnsKeySignatureResponse[]> {
    try {
      const response = await this.listKeySignatureRequests(keyId, { limit: count });
      return response.items;
    } catch (error) {
      throw new DfnsError(
        `Failed to get recent key signatures: ${error}`,
        'RECENT_KEY_SIGNATURES_FAILED',
        { keyId }
      );
    }
  }

  // ==============================================
  // VALIDATION METHODS
  // ==============================================

  /**
   * Validate key signature request
   * 
   * @param request - Key signature request to validate
   */
  private validateKeySignatureRequest(request: DfnsKeySignatureRequest): void {
    if (!request.keyId) {
      throw new DfnsValidationError('Key ID is required');
    }

    if (!request.body || !request.body.kind) {
      throw new DfnsValidationError('Signature body with kind is required');
    }

    // Validate based on signature kind and blockchain
    switch (request.body.kind) {
      case 'Hash':
        if (!('hash' in request.body) || !request.body.hash) {
          throw new DfnsValidationError('Hash is required for Hash signatures');
        }
        break;
      
      case 'Message':
        if (!('message' in request.body) || !request.body.message) {
          throw new DfnsValidationError('Message is required for Message signatures');
        }
        break;
      
      case 'Transaction':
        if ('blockchainKind' in request.body) {
          // Blockchain-specific transaction validation
          if (!('transaction' in request.body) || !request.body.transaction) {
            throw new DfnsValidationError('Transaction data is required for Transaction signatures');
          }
        }
        break;
      
      case 'Eip712':
        if ('blockchainKind' in request.body && request.body.blockchainKind === 'Evm') {
          const eip712Body = request.body as DfnsEvmEip712Signature;
          if (!eip712Body.types || !eip712Body.domain || !eip712Body.message) {
            throw new DfnsValidationError('Types, domain, and message are required for EIP-712 signatures');
          }
        }
        break;
      
      case 'Psbt':
        if (!('psbt' in request.body) || !request.body.psbt) {
          throw new DfnsValidationError('PSBT data is required for PSBT signatures');
        }
        break;
      
      case 'Bip322':
        if (!('message' in request.body) || !request.body.message) {
          throw new DfnsValidationError('Message is required for BIP-322 signatures');
        }
        if (!('network' in request.body) || !request.body.network) {
          throw new DfnsValidationError('Network is required for BIP-322 signatures');
        }
        break;
      
      case 'SignDocDirect':
        if (!('signDoc' in request.body) || !request.body.signDoc) {
          throw new DfnsValidationError('SignDoc is required for SignDocDirect signatures');
        }
        break;
      
      default:
        throw new DfnsValidationError(`Unsupported signature kind: ${request.body.kind}`);
    }

    // Validate blockchain-specific requirements
    if ('blockchainKind' in request.body) {
      const validBlockchainKinds = [
        'Evm', 'Bitcoin', 'Solana', 'Cosmos', 'Algorand', 'Aptos', 
        'Cardano', 'Stellar', 'Substrate', 'Tezos', 'Ton', 'Tron', 'XrpLedger'
      ];
      
      if (!validBlockchainKinds.includes(request.body.blockchainKind)) {
        throw new DfnsValidationError(`Unsupported blockchain kind: ${request.body.blockchainKind}`);
      }
    }
  }
}

// ==============================================
// FACTORY FUNCTION
// ==============================================

/**
 * Create DFNS Key Signature Generation Service instance
 * 
 * @param client - Working DFNS client
 * @returns Key signature generation service
 */
export function getDfnsKeySignatureGenerationService(client: WorkingDfnsClient): DfnsKeySignatureGenerationService {
  return new DfnsKeySignatureGenerationService(client);
}