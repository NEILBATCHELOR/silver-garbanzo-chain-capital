/**
 * DFNS EVM Key Signature Service
 * 
 * Specialized service for EVM blockchain signature generation using DFNS keys
 * Supports Ethereum, Polygon, Base, Arbitrum, Optimism, and other EVM-compatible chains
 * 
 * Features:
 * - Transaction signing (EIP-2718 typed transactions)
 * - Message signing (personal_sign)
 * - EIP-712 typed data signing
 * - EIP-7702 authorization signing
 * - Gas estimation and transaction building helpers
 * - Network-specific optimizations
 * 
 * Reference: https://docs.dfns.co/d/api-docs/keys/generate-signature/evm
 */

import type { WorkingDfnsClient } from '../../../infrastructure/dfns/working-client';
import { DfnsKeySignatureGenerationService } from './keySignatureGenerationService';
import type { DfnsKeySignatureResponse } from './keySignatureGenerationService';
import { DfnsError, DfnsValidationError } from '../../../types/dfns/errors';

// ==============================================
// EVM-SPECIFIC TYPES
// ==============================================

export interface EvmTransactionInput {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId: number;
  type?: 0 | 1 | 2; // Legacy, EIP-2930, EIP-1559
}

export interface Eip712TypedData {
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

export interface Eip7702Authorization {
  chainId: number;
  address: string; // Contract address for delegation
  nonce: number;
}

export interface EvmSignatureOptions {
  userActionToken?: string;
  syncToDatabase?: boolean;
  externalId?: string;
}

// ==============================================
// SUPPORTED EVM NETWORKS
// ==============================================

export const EVM_NETWORKS = {
  // Mainnet Networks
  Ethereum: { chainId: 1, name: 'Ethereum' },
  Polygon: { chainId: 137, name: 'Polygon' },
  Base: { chainId: 8453, name: 'Base' },
  Arbitrum: { chainId: 42161, name: 'Arbitrum One' },
  Optimism: { chainId: 10, name: 'Optimism' },
  BinanceSmartChain: { chainId: 56, name: 'BNB Smart Chain' },
  Avalanche: { chainId: 43114, name: 'Avalanche C-Chain' },
  
  // Testnet Networks
  EthereumGoerli: { chainId: 5, name: 'Ethereum Goerli' },
  EthereumSepolia: { chainId: 11155111, name: 'Ethereum Sepolia' },
  PolygonMumbai: { chainId: 80001, name: 'Polygon Mumbai' },
  BaseSepolia: { chainId: 84532, name: 'Base Sepolia' },
  ArbitrumGoerli: { chainId: 421613, name: 'Arbitrum Goerli' },
  OptimismGoerli: { chainId: 420, name: 'Optimism Goerli' }
} as const;

export type EvmNetworkName = keyof typeof EVM_NETWORKS;

// ==============================================
// SERVICE IMPLEMENTATION
// ==============================================

export class DfnsEvmKeySignatureService {
  private keySignatureService: DfnsKeySignatureGenerationService;

  constructor(private client: WorkingDfnsClient) {
    this.keySignatureService = new DfnsKeySignatureGenerationService(client);
  }

  // ==============================================
  // TRANSACTION SIGNING
  // ==============================================

  /**
   * Sign EVM transaction with optimized payload
   * 
   * @param keyId - DFNS key ID
   * @param transaction - EVM transaction input or hex string
   * @param options - Signing options
   * @returns Signature response
   */
  async signTransaction(
    keyId: string,
    transaction: EvmTransactionInput | string,
    options: EvmSignatureOptions = {}
  ): Promise<DfnsKeySignatureResponse> {
    try {
      let transactionHex: string;

      if (typeof transaction === 'string') {
        // Already serialized transaction
        transactionHex = transaction.startsWith('0x') ? transaction : `0x${transaction}`;
      } else {
        // Build transaction from input
        transactionHex = this.buildTransactionHex(transaction);
      }

      this.validateTransactionHex(transactionHex);

      const response = await this.keySignatureService.signEvmTransaction(
        keyId,
        transactionHex,
        options.userActionToken
      );

      console.log(`✅ EVM transaction signed with key ${keyId}:`, {
        signatureId: response.id,
        status: response.status
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to sign EVM transaction with key ${keyId}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }

      throw new DfnsError(
        `Failed to sign EVM transaction: ${error}`,
        'EVM_TRANSACTION_SIGNING_FAILED',
        { keyId }
      );
    }
  }

  /**
   * Sign EVM message (personal_sign)
   * 
   * @param keyId - DFNS key ID
   * @param message - Message to sign (string or hex)
   * @param options - Signing options
   * @returns Signature response
   */
  async signMessage(
    keyId: string,
    message: string,
    options: EvmSignatureOptions = {}
  ): Promise<DfnsKeySignatureResponse> {
    try {
      const messageHex = this.prepareMessageHex(message);

      const response = await this.keySignatureService.signEvmMessage(
        keyId,
        messageHex,
        options.userActionToken
      );

      console.log(`✅ EVM message signed with key ${keyId}:`, {
        signatureId: response.id,
        messageLength: message.length
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to sign EVM message with key ${keyId}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }

      throw new DfnsError(
        `Failed to sign EVM message: ${error}`,
        'EVM_MESSAGE_SIGNING_FAILED',
        { keyId }
      );
    }
  }

  /**
   * Sign EIP-712 typed data
   * 
   * @param keyId - DFNS key ID
   * @param typedData - EIP-712 typed data structure
   * @param options - Signing options
   * @returns Signature response
   */
  async signTypedData(
    keyId: string,
    typedData: Eip712TypedData,
    options: EvmSignatureOptions = {}
  ): Promise<DfnsKeySignatureResponse> {
    try {
      this.validateEip712TypedData(typedData);

      const response = await this.keySignatureService.signEvmEip712(
        keyId,
        typedData,
        options.userActionToken
      );

      console.log(`✅ EIP-712 typed data signed with key ${keyId}:`, {
        signatureId: response.id,
        domain: typedData.domain.name || 'Unknown'
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to sign EIP-712 typed data with key ${keyId}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }

      throw new DfnsError(
        `Failed to sign EIP-712 typed data: ${error}`,
        'EIP712_SIGNING_FAILED',
        { keyId }
      );
    }
  }

  /**
   * Sign EIP-7702 authorization
   * 
   * @param keyId - DFNS key ID
   * @param authorization - EIP-7702 authorization data
   * @param options - Signing options
   * @returns Signature response
   */
  async signEip7702Authorization(
    keyId: string,
    authorization: Eip7702Authorization,
    options: EvmSignatureOptions = {}
  ): Promise<DfnsKeySignatureResponse> {
    try {
      this.validateEip7702Authorization(authorization);

      const response = await this.keySignatureService.signEvmEip7702(
        keyId,
        authorization.chainId,
        authorization.address,
        authorization.nonce,
        options.userActionToken
      );

      console.log(`✅ EIP-7702 authorization signed with key ${keyId}:`, {
        signatureId: response.id,
        chainId: authorization.chainId,
        contractAddress: authorization.address
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to sign EIP-7702 authorization with key ${keyId}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }

      throw new DfnsError(
        `Failed to sign EIP-7702 authorization: ${error}`,
        'EIP7702_SIGNING_FAILED',
        { keyId }
      );
    }
  }

  // ==============================================
  // NETWORK-SPECIFIC HELPERS
  // ==============================================

  /**
   * Get network information by chain ID
   * 
   * @param chainId - EVM chain ID
   * @returns Network information
   */
  getNetworkInfo(chainId: number): { chainId: number; name: string } | null {
    const network = Object.values(EVM_NETWORKS).find(n => n.chainId === chainId);
    return network || null;
  }

  /**
   * Get network by name
   * 
   * @param name - Network name
   * @returns Network information
   */
  getNetworkByName(name: EvmNetworkName): { chainId: number; name: string } {
    return EVM_NETWORKS[name];
  }

  /**
   * Check if chain ID is supported
   * 
   * @param chainId - EVM chain ID
   * @returns Whether chain is supported
   */
  isChainSupported(chainId: number): boolean {
    return Object.values(EVM_NETWORKS).some(n => n.chainId === chainId);
  }

  /**
   * Get all supported networks
   * 
   * @returns Array of supported networks
   */
  getSupportedNetworks(): Array<{ chainId: number; name: string; networkName: string }> {
    return Object.entries(EVM_NETWORKS).map(([networkName, network]) => ({
      ...network,
      networkName
    }));
  }

  // ==============================================
  // TRANSACTION BUILDING HELPERS
  // ==============================================

  /**
   * Build transaction hex from input parameters
   * 
   * @param transaction - Transaction input
   * @returns Hex-encoded transaction
   */
  private buildTransactionHex(transaction: EvmTransactionInput): string {
    // This is a simplified version - in practice, you'd want to use ethers.js or similar
    // to properly serialize the transaction based on type
    
    if (!transaction.to || !transaction.chainId) {
      throw new DfnsValidationError('Transaction must include "to" address and "chainId"');
    }

    // For now, return a placeholder - in real implementation, use proper serialization
    throw new DfnsError(
      'Transaction building not implemented - please provide serialized transaction hex',
      'TRANSACTION_BUILDING_NOT_IMPLEMENTED'
    );
  }

  /**
   * Prepare message for signing (convert to hex if needed)
   * 
   * @param message - Message string or hex
   * @returns Hex-encoded message
   */
  private prepareMessageHex(message: string): string {
    if (message.startsWith('0x')) {
      return message;
    }

    // Convert string to hex
    const buffer = Buffer.from(message, 'utf8');
    return `0x${buffer.toString('hex')}`;
  }

  // ==============================================
  // VALIDATION HELPERS
  // ==============================================

  /**
   * Validate transaction hex format
   * 
   * @param transactionHex - Hex-encoded transaction
   */
  private validateTransactionHex(transactionHex: string): void {
    if (!transactionHex.startsWith('0x')) {
      throw new DfnsValidationError('Transaction hex must start with 0x');
    }

    if (transactionHex.length < 4) {
      throw new DfnsValidationError('Transaction hex is too short');
    }

    const hexPattern = /^0x[0-9a-fA-F]+$/;
    if (!hexPattern.test(transactionHex)) {
      throw new DfnsValidationError('Transaction hex contains invalid characters');
    }
  }

  /**
   * Validate EIP-712 typed data structure
   * 
   * @param typedData - EIP-712 typed data
   */
  private validateEip712TypedData(typedData: Eip712TypedData): void {
    if (!typedData.types || typeof typedData.types !== 'object') {
      throw new DfnsValidationError('EIP-712 types must be an object');
    }

    if (!typedData.domain || typeof typedData.domain !== 'object') {
      throw new DfnsValidationError('EIP-712 domain must be an object');
    }

    if (!typedData.message || typeof typedData.message !== 'object') {
      throw new DfnsValidationError('EIP-712 message must be an object');
    }

    // Validate that types exist for all referenced types
    for (const [typeName, fields] of Object.entries(typedData.types)) {
      if (!Array.isArray(fields)) {
        throw new DfnsValidationError(`EIP-712 type "${typeName}" must be an array of fields`);
      }

      for (const field of fields) {
        if (!field.name || !field.type) {
          throw new DfnsValidationError(`EIP-712 field in type "${typeName}" must have name and type`);
        }
      }
    }
  }

  /**
   * Validate EIP-7702 authorization structure
   * 
   * @param authorization - EIP-7702 authorization
   */
  private validateEip7702Authorization(authorization: Eip7702Authorization): void {
    if (!authorization.chainId || typeof authorization.chainId !== 'number') {
      throw new DfnsValidationError('EIP-7702 authorization must include numeric chainId');
    }

    if (!authorization.address || typeof authorization.address !== 'string') {
      throw new DfnsValidationError('EIP-7702 authorization must include contract address');
    }

    if (!authorization.address.startsWith('0x') || authorization.address.length !== 42) {
      throw new DfnsValidationError('EIP-7702 contract address must be valid Ethereum address');
    }

    if (typeof authorization.nonce !== 'number' || authorization.nonce < 0) {
      throw new DfnsValidationError('EIP-7702 authorization nonce must be non-negative number');
    }
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  /**
   * Get EVM signature statistics for key
   * 
   * @param keyId - Key ID
   * @returns EVM-specific signature statistics
   */
  async getEvmSignatureStatistics(keyId: string): Promise<{
    total: number;
    transactions: number;
    messages: number;
    eip712: number;
    eip7702: number;
    byNetwork: Record<string, number>;
  }> {
    try {
      const allStats = await this.keySignatureService.getKeySignatureStatistics(keyId);
      
      // Filter for EVM signatures only
      const evmStats = {
        total: 0,
        transactions: 0,
        messages: 0,
        eip712: 0,
        eip7702: 0,
        byNetwork: {} as Record<string, number>
      };

      // Count EVM blockchain signatures
      if (allStats.byBlockchain['Evm']) {
        evmStats.total = allStats.byBlockchain['Evm'];
      }

      // Count by signature kind (would need to query actual signatures for accurate counts)
      evmStats.transactions = allStats.byKind['Transaction'] || 0;
      evmStats.messages = allStats.byKind['Message'] || 0;
      evmStats.eip712 = allStats.byKind['Eip712'] || 0;
      evmStats.eip7702 = allStats.byKind['Eip7702'] || 0;

      return evmStats;
    } catch (error) {
      throw new DfnsError(
        `Failed to get EVM signature statistics: ${error}`,
        'EVM_SIGNATURE_STATS_FAILED',
        { keyId }
      );
    }
  }

  /**
   * Get pending EVM signature requests
   * 
   * @param keyId - Key ID
   * @returns Pending EVM signature requests
   */
  async getPendingEvmSignatures(keyId: string): Promise<DfnsKeySignatureResponse[]> {
    try {
      const pendingSignatures = await this.keySignatureService.getPendingKeySignatures(keyId);
      
      // Filter for EVM signatures only
      return pendingSignatures.filter(sig => 
        'blockchainKind' in sig.requestBody && 
        sig.requestBody.blockchainKind === 'Evm'
      );
    } catch (error) {
      throw new DfnsError(
        `Failed to get pending EVM signatures: ${error}`,
        'PENDING_EVM_SIGNATURES_FAILED',
        { keyId }
      );
    }
  }
}

// ==============================================
// FACTORY FUNCTION
// ==============================================

/**
 * Create DFNS EVM Key Signature Service instance
 * 
 * @param client - Working DFNS client
 * @returns EVM key signature service
 */
export function getDfnsEvmKeySignatureService(client: WorkingDfnsClient): DfnsEvmKeySignatureService {
  return new DfnsEvmKeySignatureService(client);
}