/**
 * Modern Solana RPC Service
 * 
 * Modern implementation using @solana/kit and @solana/client
 * Provides type-safe, composable RPC operations
 */

import { 
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  sendAndConfirmTransactionFactory,
  address,
  lamports,
  signature as createSignature,
  isSignature,
  type Address,
  type Lamports
} from '@solana/kit';
import type { Commitment } from '@solana/rpc-types';

// Signature type - branded string from @solana/kit
type Signature = ReturnType<typeof createSignature>;

// Define empty API type for base RPC
type SolanaRpcApi = Record<string, never>;

// Modern RPC configuration
export interface ModernRpcConfig {
  endpoint: string;
  commitment?: Commitment;
  wsEndpoint?: string;
}

// Modern transaction options
export interface ModernTransactionOptions {
  skipPreflight?: boolean;
  maxRetries?: number;
  commitment?: Commitment;
}

/**
 * Modern Solana RPC wrapper
 * Uses @solana/kit for type-safe operations
 */
export class ModernSolanaRpc {
  private rpc: ReturnType<typeof createSolanaRpc>;
  private rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions>;
  private endpoint: string;
  private wsEndpoint: string;
  private commitment: Commitment;

  constructor(config: ModernRpcConfig) {
    this.endpoint = config.endpoint;
    this.commitment = config.commitment || 'confirmed';
    this.rpc = createSolanaRpc(this.endpoint);
    
    // Create WebSocket endpoint from HTTP endpoint if not provided
    this.wsEndpoint = config.wsEndpoint || this.endpoint.replace('http', 'ws');
    this.rpcSubscriptions = createSolanaRpcSubscriptions(this.wsEndpoint);
  }

  /**
   * Get RPC instance
   */
  getRpc(): ReturnType<typeof createSolanaRpc> {
    return this.rpc;
  }

  /**
   * Get endpoint URL
   */
  getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Get commitment level
   */
  getCommitment(): Commitment {
    return this.commitment;
  }

  // ===========================
  // Account Operations
  // ===========================

  /**
   * Get account balance in lamports
   */
  async getBalance(addr: string | Address): Promise<bigint> {
    const pubkey = typeof addr === 'string' ? address(addr) : addr;
    const result = await this.rpc.getBalance(pubkey, { commitment: this.commitment }).send();
    return result.value as bigint;
  }

  /**
   * Get account balance in SOL
   */
  async getBalanceInSol(addr: string | Address): Promise<number> {
    const balance = await this.getBalance(addr);
    const lamportsPerSol = 1_000_000_000n;
    return Number(balance) / Number(lamportsPerSol);
  }

  /**
   * Get account info
   */
  async getAccountInfo(addr: string | Address, commitment?: Commitment) {
    const pubkey = typeof addr === 'string' ? address(addr) : addr;
    const result = await this.rpc.getAccountInfo(pubkey, { 
      commitment: commitment || this.commitment,
      encoding: 'base64'
    }).send();
    return result.value;
  }

  /**
   * Get multiple accounts
   */
  async getMultipleAccounts(addresses: (string | Address)[], commitment?: Commitment) {
    const pubkeys = addresses.map(addr => 
      typeof addr === 'string' ? address(addr) : addr
    );
    
    const result = await this.rpc.getMultipleAccounts(pubkeys, {
      commitment: commitment || this.commitment,
      encoding: 'base64'
    }).send();
    return result.value;
  }

  /**
   * Get program accounts
   */
  async getProgramAccounts(programId: string | Address, commitment?: Commitment) {
    const programAddr = typeof programId === 'string' ? address(programId) : programId;
    
    return this.rpc.getProgramAccounts(programAddr, {
      commitment: commitment || this.commitment,
      encoding: 'base64'
    }).send();
  }

  // ===========================
  // Block & Slot Operations
  // ===========================

  /**
   * Get latest blockhash
   */
  async getLatestBlockhash(commitment?: Commitment) {
    const result = await this.rpc.getLatestBlockhash({ 
      commitment: commitment || this.commitment 
    }).send();
    return result.value;
  }

  /**
   * Get slot
   */
  async getSlot(commitment?: Commitment) {
    return this.rpc.getSlot({ 
      commitment: commitment || this.commitment 
    }).send();
  }

  /**
   * Get block height
   */
  async getBlockHeight(commitment?: Commitment) {
    return this.rpc.getBlockHeight({ 
      commitment: commitment || this.commitment 
    }).send();
  }

  /**
   * Get block time
   */
  async getBlockTime(slot: bigint) {
    return this.rpc.getBlockTime(slot).send();
  }

  /**
   * Get block data
   */
  async getBlock(slot: bigint, commitment?: Commitment) {
    return this.rpc.getBlock(slot, {
      commitment: commitment || this.commitment,
      maxSupportedTransactionVersion: 0,
      transactionDetails: 'full',
      rewards: true
    }).send();
  }

  // ===========================
  // Transaction Operations
  // ===========================

  /**
   * Get transaction
   */
  async getTransaction(signatureString: string, commitment?: Commitment) {
    const sig = createSignature(signatureString);
    return this.rpc.getTransaction(sig, {
      commitment: commitment || this.commitment,
      encoding: 'jsonParsed',
      maxSupportedTransactionVersion: 0
    }).send();
  }

  /**
   * Get signatures for address
   */
  async getSignaturesForAddress(
    addr: string | Address,
    options?: {
      limit?: number;
      before?: string;
      until?: string;
      commitment?: Commitment;
    }
  ) {
    const pubkey = typeof addr === 'string' ? address(addr) : addr;
    
    // Convert commitment - getSignaturesForAddress only supports "confirmed" or "finalized"
    const allowedCommitment = options?.commitment === 'processed' 
      ? 'confirmed' 
      : (options?.commitment || this.commitment === 'processed' ? 'confirmed' : this.commitment);
    
    // Convert string signatures to Signature type
    const config: {
      limit?: number;
      before?: Signature;
      until?: Signature;
      commitment?: 'confirmed' | 'finalized';
    } = {
      limit: options?.limit,
      commitment: allowedCommitment as 'confirmed' | 'finalized'
    };

    // Only add before/until if they exist and are valid signatures
    if (options?.before && isSignature(options.before)) {
      config.before = options.before as Signature;
    }
    if (options?.until && isSignature(options.until)) {
      config.until = options.until as Signature;
    }
    
    return this.rpc.getSignaturesForAddress(pubkey, config).send();
  }

  /**
   * Wait for transaction confirmation
   * Note: Modern RPC doesn't have confirmTransaction, use getSignatureStatuses instead
   */
  async waitForConfirmation(signatureString: string, commitment?: Commitment, maxAttempts: number = 30): Promise<boolean> {
    const sig = createSignature(signatureString);
    for (let i = 0; i < maxAttempts; i++) {
      const statuses = await this.rpc.getSignatureStatuses([sig]).send();
      const status = statuses.value[0];
      
      if (status) {
        const targetCommitment = commitment || this.commitment;
        const statusCommitment = status.confirmationStatus;
        
        // Check if we've reached desired commitment level
        if (statusCommitment === targetCommitment || 
            (targetCommitment === 'confirmed' && statusCommitment === 'finalized') ||
            (targetCommitment === 'processed' && (statusCommitment === 'confirmed' || statusCommitment === 'finalized'))) {
          return status.err === null;
        }
      }
      
      // Wait 500ms before next attempt
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return false;
  }

  /**
   * Send and confirm transaction (MODERN - preferred method)
   * Uses sendAndConfirmTransactionFactory from @solana/kit
   * 
   * DEPRECATED: Use sendRawTransaction + waitForConfirmation instead
   * This method requires WebSocket support which many RPC providers don't offer
   */
  async sendAndConfirmTransaction(
    signedTransaction: any, // SignedTransaction type from @solana/kit
    options?: {
      commitment?: Commitment;
      skipPreflight?: boolean;
    }
  ): Promise<string> {
    // Type assertion to avoid cluster type mismatch errors
    // Since we're deprecating this in favor of polling-based confirmation
    const sendAndConfirm = sendAndConfirmTransactionFactory({ 
      rpc: this.rpc as any, 
      rpcSubscriptions: this.rpcSubscriptions as any
    });
    
    const signature = await sendAndConfirm(signedTransaction, {
      commitment: options?.commitment || this.commitment,
      skipPreflight: options?.skipPreflight
    });
    
    return signature as unknown as string;
  }

  /**
   * Send raw transaction
   * Accepts either Uint8Array (will be base64-encoded) or string (already base64-encoded)
   */
  async sendRawTransaction(
    transaction: Uint8Array | string,
    options?: {
      skipPreflight?: boolean;
      maxRetries?: number;
      minContextSlot?: number;
    }
  ): Promise<string> {
    let base64Encoded: string;
    
    if (typeof transaction === 'string') {
      // Already base64-encoded (from getBase64EncodedWireTransaction)
      base64Encoded = transaction;
    } else {
      // Raw bytes - convert to base64 string using native APIs
      // Use Buffer in Node.js or btoa in browser
      if (typeof Buffer !== 'undefined') {
        // Node.js environment
        base64Encoded = Buffer.from(transaction).toString('base64');
      } else {
        // Browser environment - convert Uint8Array to binary string then to base64
        const binaryString = Array.from(transaction)
          .map(byte => String.fromCharCode(byte))
          .join('');
        base64Encoded = btoa(binaryString);
      }
    }
    
    const config = {
      encoding: 'base64' as const, // CRITICAL: Tell RPC this is base64, not base58
      skipPreflight: options?.skipPreflight,
      maxRetries: options?.maxRetries ? BigInt(options.maxRetries) : undefined,
      minContextSlot: options?.minContextSlot ? BigInt(options.minContextSlot) : undefined
    };
    
    // Cast to any to pass the base64 string
    const signature = await this.rpc.sendTransaction(base64Encoded as any, config).send();
    return signature as unknown as string;
  }

  // ===========================
  // Network Information
  // ===========================

  /**
   * Get version
   */
  async getVersion() {
    return this.rpc.getVersion().send();
  }

  /**
   * Get genesis hash
   */
  async getGenesisHash() {
    return this.rpc.getGenesisHash().send();
  }

  /**
   * Get cluster nodes
   */
  async getClusterNodes() {
    return this.rpc.getClusterNodes().send();
  }

  /**
   * Get epoch info
   */
  async getEpochInfo(commitment?: Commitment) {
    const result = await this.rpc.getEpochInfo({ 
      commitment: commitment || this.commitment 
    }).send();
    return result;
  }

  // ===========================
  // Fee Operations
  // ===========================

  /**
   * Get minimum balance for rent exemption
   */
  async getMinimumBalanceForRentExemption(space: bigint, commitment?: Commitment) {
    return this.rpc.getMinimumBalanceForRentExemption(space, {
      commitment: commitment || this.commitment
    }).send();
  }

  /**
   * Get recent prioritization fees
   */
  async getRecentPrioritizationFees(addresses?: (string | Address)[]) {
    const pubkeys = addresses?.map(addr => 
      typeof addr === 'string' ? address(addr) : addr
    );
    
    return this.rpc.getRecentPrioritizationFees(pubkeys).send();
  }

  // ===========================
  // Health & Status
  // ===========================

  /**
   * Get health status
   */
  async getHealth() {
    return this.rpc.getHealth().send();
  }

  /**
   * Request airdrop (devnet/testnet only)
   * Note: Modern RPC API doesn't have requestAirdrop directly
   * Use the web interface at https://faucet.solana.com for devnet airdrops
   */
  async requestAirdrop(addr: string | Address, lamportsAmount: bigint): Promise<string> {
    throw new Error('requestAirdrop is not available in modern @solana/kit. Use https://faucet.solana.com for devnet/testnet airdrops.');
  }
}

// ===========================
// Network Helpers
// ===========================

import { getRpcUrl } from '@/infrastructure/web3/rpc/rpc-config';

/**
 * Get default RPC endpoint for network from .env ONLY
 * NO FALLBACKS - must be configured in .env
 */
export function getDefaultEndpoint(network: 'mainnet-beta' | 'devnet' | 'testnet'): string {
  // Map Solana network names to getRpcUrl network parameter
  const networkMap: Record<string, 'mainnet' | 'devnet' | 'testnet'> = {
    'mainnet-beta': 'mainnet',
    'devnet': 'devnet',
    'testnet': 'testnet'
  };

  const rpcNetwork = networkMap[network];
  const url = getRpcUrl('solana', rpcNetwork);
  
  if (!url) {
    throw new Error(
      `Solana ${network} RPC URL not configured. ` +
      `Add VITE_SOLANA_${rpcNetwork.toUpperCase()}_RPC_URL to your .env file.`
    );
  }
  
  return url;
}

/**
 * Create modern RPC for network
 */
export function createModernRpc(
  network: 'mainnet-beta' | 'devnet' | 'testnet',
  commitment?: Commitment
): ModernSolanaRpc {
  return new ModernSolanaRpc({
    endpoint: getDefaultEndpoint(network),
    commitment
  });
}

/**
 * Create modern RPC from custom endpoint
 */
export function createCustomRpc(
  endpoint: string,
  commitment?: Commitment
): ModernSolanaRpc {
  return new ModernSolanaRpc({ endpoint, commitment });
}

// ===========================
// Utility Functions
// ===========================

/**
 * Convert number to lamports
 */
export function toLamports(sol: number): bigint {
  const lamportsPerSol = 1_000_000_000n;
  return BigInt(Math.floor(sol * Number(lamportsPerSol)));
}

/**
 * Convert lamports to SOL
 */
export function toSol(lamportsAmount: bigint): number {
  const lamportsPerSol = 1_000_000_000n;
  return Number(lamportsAmount) / Number(lamportsPerSol);
}

// Export for convenience
export { address, lamports };
export type { Address, Lamports };
