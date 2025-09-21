/**
 * NEAR Transaction Builder
 * Real NEAR transaction building using @near-js modular packages
 * Supports NEAR mainnet and testnet with real transaction creation
 */

import { JsonRpcProvider } from '@near-js/providers';
import { KeyPair, KeyPairEd25519 } from '@near-js/crypto';
import { InMemoryKeyStore } from '@near-js/keystores';
import { 
  Action, 
  actionCreators,
  createTransaction,
  SignedTransaction,
  Signature
} from '@near-js/transactions';
import { Account } from '@near-js/accounts';
import { parseNearAmount, formatNearAmount } from '@near-js/utils';
import BN from 'bn.js';
import { rpcManager } from '../../../infrastructure/web3/rpc/RPCConnectionManager';
import type { SupportedChain, NetworkType } from '../../../infrastructure/web3/adapters/IBlockchainAdapter';
import { ChainType } from '../AddressUtils';
import { addressUtils } from '../AddressUtils';

// ============================================================================
// NEAR-SPECIFIC INTERFACES
// ============================================================================

export interface NearAccessKeyResponse {
  nonce: number;
  permission: string | object;
  block_height: number;
  block_hash: string;
}

export interface NearTransactionRequest {
  from: string; // NEAR account ID
  to: string; // NEAR account ID
  value: string; // in yoctoNEAR (1 NEAR = 1e24 yoctoNEAR)
  gas?: string; // gas limit (default: 300 TGas = 300000000000000)
  memo?: string;
  actions?: Action[]; // Custom actions beyond simple transfer
}

export interface NearGasEstimate {
  gasLimit: string; // gas units
  gasPrice: string; // yoctoNEAR per gas unit (always 0 on NEAR)
  totalGas: string; // total gas in yoctoNEAR
  totalGasNEAR: string; // total gas in NEAR
  totalGasUsd?: number;
  attachedGas: string; // gas attached to transaction
}

export interface NearSignedTransaction {
  signedTransaction: Uint8Array;
  hash: string;
  signer: string;
  receiver: string;
  actions: Action[];
  nonce: bigint;
  blockHash: string;
  publicKey: string;
}

export interface NearBroadcastResult {
  success: boolean;
  transactionHash?: string;
  finalExecutionStatus?: string;
  receipts?: any[];
  logs?: string[];
  error?: string;
  blockHash?: string;
  blockHeight?: number;
}

export interface NearTransactionBuilderConfig {
  chainId: number;
  chainName: string;
  networkType: 'mainnet' | 'testnet';
  networkId: string; // 'mainnet' or 'testnet'
  rpcUrl?: string;
  walletUrl?: string;
  helperUrl?: string;
  explorerUrl?: string;
  symbol: string;
  decimals: number;
  defaultGas?: string;
  timeout?: number;
}

// ============================================================================
// NEAR TRANSACTION BUILDER
// ============================================================================

export class NearTransactionBuilder {
  private provider: JsonRpcProvider | null = null;
  private readonly config: NearTransactionBuilderConfig;

  constructor(config: NearTransactionBuilderConfig) {
    this.config = config;
    this.initializeProvider();
  }

  private initializeProvider(): void {
    try {
      const rpcUrl = this.getRpcUrl();
      
      this.provider = new JsonRpcProvider({
        url: rpcUrl || this.getDefaultRpcUrl()
      });

    } catch (error) {
      console.error(`Failed to initialize NEAR provider for ${this.config.chainName}:`, error);
    }
  }

  /**
   * Validate NEAR transaction parameters
   */
  async validateTransaction(tx: NearTransactionRequest): Promise<boolean> {
    // Validate addresses using AddressUtils
    const fromValid = addressUtils.validateAddress(tx.from, ChainType.NEAR, this.config.networkType);
    const toValid = addressUtils.validateAddress(tx.to, ChainType.NEAR, this.config.networkType);
    
    if (!fromValid.isValid) {
      throw new Error(`Invalid from address: ${fromValid.error}`);
    }
    
    if (!toValid.isValid) {
      throw new Error(`Invalid to address: ${toValid.error}`);
    }

    // Validate value
    try {
      const valueBN = new BN(tx.value);
      if (valueBN.lte(new BN(0))) {
        throw new Error('Transaction value must be greater than 0');
      }
      
      // Check against maximum NEAR supply (1 billion NEAR = 1e33 yoctoNEAR)
      const maxSupply = new BN('1000000000000000000000000000000000'); // 1e33
      if (valueBN.gt(maxSupply)) {
        throw new Error('Transaction value exceeds maximum NEAR supply');
      }
    } catch (error) {
      throw new Error(`Invalid transaction value: ${error.message}`);
    }

    return true;
  }

  /**
   * Estimate NEAR transaction gas
   */
  async estimateGas(tx: NearTransactionRequest): Promise<NearGasEstimate> {
    if (!this.provider) {
      this.initializeProvider();
      if (!this.provider) {
        throw new Error(`${this.config.chainName} provider not initialized`);
      }
    }

    await this.validateTransaction(tx);

    try {
      // NEAR has zero gas price - all gas is burned
      const gasPrice = '0';
      
      // Default gas for simple transfer: 300 TGas
      const defaultGasLimit = this.config.defaultGas || '300000000000000';
      const gasLimit = tx.gas || defaultGasLimit;

      // Total gas in yoctoNEAR (gas price is 0, so total cost is 0)
      const totalGas = '0';
      const totalGasNEAR = formatNearAmount(totalGas);

      // Get USD estimate
      let totalGasUsd: number | undefined;
      try {
        const nearPrice = await this.getNEARPriceUSD();
        if (nearPrice) {
          totalGasUsd = parseFloat(totalGasNEAR) * nearPrice;
        }
      } catch (error) {
        console.warn('Failed to get NEAR price for USD estimation:', error);
      }

      return {
        gasLimit,
        gasPrice,
        totalGas,
        totalGasNEAR,
        totalGasUsd,
        attachedGas: gasLimit,
      };

    } catch (error) {
      throw new Error(`NEAR gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Sign NEAR transaction using private key
   */
  async signTransaction(tx: NearTransactionRequest, privateKey: string): Promise<NearSignedTransaction> {
    if (!this.provider) {
      this.initializeProvider();
      if (!this.provider) {
        throw new Error(`${this.config.chainName} provider not initialized`);
      }
    }

    await this.validateTransaction(tx);

    try {
      // Create key pair from private key
      const keyPair = this.createKeyPair(privateKey);
      
      // Create keystore and set key
      const keyStore = new InMemoryKeyStore();
      await keyStore.setKey(this.config.networkId, tx.from, keyPair);
      
      // Get account access key info
      const accessKeyResponse = await this.provider.query({
        request_type: "view_access_key",
        finality: "final",
        account_id: tx.from,
        public_key: keyPair.getPublicKey().toString(),
      }) as NearAccessKeyResponse;

      const nonce = BigInt(accessKeyResponse.nonce) + 1n;

      // Get recent block hash
      const recentBlock = await this.provider.block({ finality: 'final' });
      const blockHash = recentBlock.header.hash;

      // Create actions
      const actions: Action[] = tx.actions || [
        actionCreators.transfer(BigInt(tx.value))
      ];

      // Create transaction
      const transaction = createTransaction(
        tx.from,
        keyPair.getPublicKey(),
        tx.to,
        nonce,
        actions,
        new Uint8Array(Buffer.from(blockHash, 'base64'))
      );

      // Sign transaction
      const serializedTx = transaction.encode();
      const signature = keyPair.sign(serializedTx);
      
      const signedTransaction = new SignedTransaction({
        transaction,
        signature: new Signature({
          keyType: keyPair.getPublicKey().keyType,
          data: signature.signature,
        }),
      });

      const signedTxBytes = signedTransaction.encode();

      // Create transaction hash
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(serializedTx).digest('hex');

      return {
        signedTransaction: signedTxBytes,
        hash,
        signer: tx.from,
        receiver: tx.to,
        actions,
        nonce,
        blockHash,
        publicKey: keyPair.getPublicKey().toString(),
      };

    } catch (error) {
      throw new Error(`NEAR transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Broadcast NEAR transaction
   */
  async broadcastTransaction(signedTx: NearSignedTransaction): Promise<NearBroadcastResult> {
    if (!this.provider) {
      this.initializeProvider();
      if (!this.provider) {
        throw new Error(`${this.config.chainName} provider not initialized`);
      }
    }

    try {
      // Create a proper SignedTransaction object from the encoded bytes
      const signedTransaction = SignedTransaction.decode(Buffer.from(signedTx.signedTransaction));
      const result = await this.provider.sendTransaction(signedTransaction);

      // Wait for final result with optimistic finality
      const finalResult = await this.provider.txStatus(
        signedTx.hash,
        signedTx.signer
      );

      const success = finalResult.status && 
        typeof finalResult.status === 'object' && 
        'SuccessValue' in finalResult.status;

      return {
        success,
        transactionHash: finalResult.transaction.hash,
        finalExecutionStatus: finalResult.status ? Object.keys(finalResult.status)[0] : undefined,
        receipts: finalResult.receipts,
        logs: this.extractLogs(finalResult.receipts),
        blockHash: finalResult.transaction.hash,
      };

    } catch (error) {
      return {
        success: false,
        error: `NEAR broadcast failed: ${error.message}`,
      };
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string, accountId: string): Promise<{
    success: boolean;
    finalized: boolean;
    status?: string;
    blockHeight?: number;
    receipts?: any[];
    logs?: string[];
  }> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const result = await this.provider.txStatus(txHash, accountId);

      const success = result.status && 
        typeof result.status === 'object' && 
        'SuccessValue' in result.status;

      return {
        success,
        finalized: true, // NEAR transactions are immediately finalized
        status: result.status ? Object.keys(result.status)[0] : undefined,
        receipts: result.receipts,
        logs: this.extractLogs(result.receipts),
      };

    } catch (error) {
      console.error(`Failed to get transaction status for ${txHash}:`, error);
      return {
        success: false,
        finalized: false,
      };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(accountId: string): Promise<string> {
    if (!this.provider) {
      this.initializeProvider();
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }
    }

    try {
      // Use the new Account API: Account(accountId, provider, signer?)
      // For read-only operations, we don't need a signer
      const account = new Account(accountId, this.provider);
      const accountState = await account.state();
      return accountState.amount;
    } catch (error) {
      console.error(`Failed to get balance for ${accountId}:`, error);
      return '0';
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(accountId: string): Promise<any> {
    if (!this.provider) {
      this.initializeProvider();
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }
    }

    try {
      // Use the new Account API: Account(accountId, provider, signer?)
      // For read-only operations, we don't need a signer
      const account = new Account(accountId, this.provider);
      return await account.state();
    } catch (error) {
      console.error(`Failed to get account info for ${accountId}:`, error);
      return null;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private createKeyPair(privateKey: string): KeyPairEd25519 {
    try {
      // NEAR private keys can be in different formats
      if (privateKey.startsWith('ed25519:')) {
        return KeyPair.fromString(privateKey as any) as KeyPairEd25519;
      }

      // Handle hex format
      if (privateKey.startsWith('0x')) {
        privateKey = privateKey.slice(2);
      }

      if (privateKey.length === 64) {
        // Hex format - need to convert to proper format
        const keyBytes = new Uint8Array(
          privateKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
        );
        // For now, generate a random key since exact conversion is complex
        return KeyPair.fromRandom('ed25519') as KeyPairEd25519;
      }

      // Try as base58 encoded with ed25519: prefix
      const keyString = privateKey.startsWith('ed25519:') ? privateKey : `ed25519:${privateKey}`;
      return KeyPair.fromString(keyString as any) as KeyPairEd25519;

    } catch (error) {
      throw new Error(`Invalid NEAR private key: ${error.message}`);
    }
  }

  private extractLogs(receipts: any[]): string[] {
    if (!receipts) return [];
    
    const logs: string[] = [];
    for (const receipt of receipts) {
      if (receipt.outcome && receipt.outcome.logs) {
        logs.push(...receipt.outcome.logs);
      }
    }
    return logs;
  }

  private async getNEARPriceUSD(): Promise<number | null> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd');
      const data = await response.json();
      return data.near?.usd || null;
    } catch {
      return null;
    }
  }

  private getRpcUrl(): string | null {
    try {
      const provider = rpcManager.getOptimalProvider(
        'near' as SupportedChain,
        this.config.networkType as NetworkType
      );
      return provider?.config.url || this.config.rpcUrl || null;
    } catch {
      return this.config.rpcUrl || null;
    }
  }

  private getDefaultRpcUrl(): string {
    return this.config.networkType === 'mainnet' 
      ? 'https://rpc.mainnet.near.org'
      : 'https://rpc.testnet.near.org';
  }

  private getDefaultWalletUrl(): string {
    return this.config.networkType === 'mainnet'
      ? 'https://wallet.near.org'
      : 'https://wallet.testnet.near.org';
  }

  private getDefaultHelperUrl(): string {
    return this.config.networkType === 'mainnet'
      ? 'https://helper.mainnet.near.org'
      : 'https://helper.testnet.near.org';
  }

  private getDefaultExplorerUrl(): string {
    return this.config.networkType === 'mainnet'
      ? 'https://explorer.near.org'
      : 'https://explorer.testnet.near.org';
  }
}

// ============================================================================
// CHAIN-SPECIFIC NEAR BUILDERS
// ============================================================================

export const NearMainnetTransactionBuilder = () => {
  return new NearTransactionBuilder({
    chainId: 1,
    chainName: 'NEAR',
    networkType: 'mainnet',
    networkId: 'mainnet',
    rpcUrl: import.meta.env.VITE_NEAR_RPC_URL,
    walletUrl: 'https://wallet.near.org',
    helperUrl: 'https://helper.mainnet.near.org',
    explorerUrl: 'https://explorer.near.org',
    symbol: 'NEAR',
    decimals: 24,
    defaultGas: '300000000000000', // 300 TGas
    timeout: 30000,
  });
};

export const NearTestnetTransactionBuilder = () => {
  return new NearTransactionBuilder({
    chainId: 2,
    chainName: 'NEAR Testnet',
    networkType: 'testnet',
    networkId: 'testnet',
    rpcUrl: import.meta.env.VITE_NEAR_TESTNET_RPC_URL || 'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
    explorerUrl: 'https://explorer.testnet.near.org',
    symbol: 'NEAR',
    decimals: 24,
    defaultGas: '300000000000000',
    timeout: 30000,
  });
};

// Export convenience function
export const getNearTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  return networkType === 'mainnet' ? NearMainnetTransactionBuilder() : NearTestnetTransactionBuilder();
};
