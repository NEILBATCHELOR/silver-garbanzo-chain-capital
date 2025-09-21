/**
 * Aptos Transaction Builder
 * Using @aptos-labs/ts-sdk v2 with modern API patterns
 * Supports Aptos mainnet and testnet with real transaction creation
 */

import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  AccountAddress,
  SimpleTransaction,
  PendingTransactionResponse,
  UserTransactionResponse,
  TransactionResponse,
  InputSimulateTransactionOptions,
} from '@aptos-labs/ts-sdk';
import { rpcManager } from '../../../infrastructure/web3/rpc/RPCConnectionManager';
import type { SupportedChain, NetworkType } from '../../../infrastructure/web3/adapters/IBlockchainAdapter';
import { ChainType } from '../AddressUtils';
import { addressUtils } from '../AddressUtils';

// ============================================================================
// APTOS-SPECIFIC INTERFACES
// ============================================================================

export interface AptosTransactionRequest {
  from: string;
  to: string;
  value: number; // in octas (1 APT = 1e8 octas)
  gasUnitPrice?: number; // octas per gas unit
  maxGasAmount?: number; // maximum gas units
  expirationTimestampSecs?: number;
  memo?: string;
  function?: string; // for contract calls
  functionArguments?: any[];
}

export interface AptosGasEstimate {
  gasUnitPrice: number; // octas per gas unit
  maxGasAmount: number; // gas units
  estimatedGasFee: number; // octas
  estimatedGasFeeAPT: string; // APT format
  estimatedGasFeeUsd?: number;
  priorityFeeMultiplier?: number;
}

export interface AptosSignedTransaction {
  transaction: SimpleTransaction;
  senderAuthenticator: any;
  hash?: string;
  sender: string;
  maxGasAmount: number;
  gasUnitPrice: number;
  expirationTimestampSecs: number;
}

export interface AptosBroadcastResult {
  success: boolean;
  hash?: string;
  version?: string;
  vmStatus?: string;
  gasUsed?: number;
  error?: string;
  pendingTransaction?: PendingTransactionResponse;
  transaction?: UserTransactionResponse;
}

export interface AptosTransactionBuilderConfig {
  chainId: number;
  chainName: string;
  networkType: 'mainnet' | 'testnet';
  network: Network;
  rpcUrl?: string;
  symbol: string;
  decimals: number;
  defaultGasUnitPrice?: number;
  defaultMaxGasAmount?: number;
  timeout?: number;
}

// ============================================================================
// APTOS TRANSACTION BUILDER
// ============================================================================

export class AptosTransactionBuilder {
  private aptos: Aptos | null = null;
  private readonly config: AptosTransactionBuilderConfig;

  constructor(config: AptosTransactionBuilderConfig) {
    this.config = config;
    this.initializeAptos();
  }

  private initializeAptos(): void {
    const rpcUrl = this.getRpcUrl();
    
    const aptosConfig = new AptosConfig({
      network: this.config.network,
      ...(rpcUrl && { fullnode: rpcUrl }),
    });

    this.aptos = new Aptos(aptosConfig);
  }

  /**
   * Validate Aptos transaction parameters
   */
  async validateTransaction(tx: AptosTransactionRequest): Promise<boolean> {
    // Validate addresses using AddressUtils
    const fromValid = addressUtils.validateAddress(tx.from, ChainType.APTOS, this.config.networkType);
    const toValid = addressUtils.validateAddress(tx.to, ChainType.APTOS, this.config.networkType);
    
    if (!fromValid.isValid) {
      throw new Error(`Invalid from address: ${fromValid.error}`);
    }
    
    if (!toValid.isValid) {
      throw new Error(`Invalid to address: ${toValid.error}`);
    }

    // Validate value
    if (tx.value <= 0) {
      throw new Error('Transaction value must be greater than 0');
    }

    if (tx.value > 1000000000 * 100000000) { // 1B APT in octas
      throw new Error('Transaction value exceeds reasonable limit');
    }

    // Validate addresses can be created
    try {
      AccountAddress.from(tx.from);
      AccountAddress.from(tx.to);
    } catch (error) {
      throw new Error(`Invalid Aptos address format: ${error.message}`);
    }

    return true;
  }

  /**
   * Estimate Aptos transaction gas using v2 SDK
   */
  async estimateGas(tx: AptosTransactionRequest): Promise<AptosGasEstimate> {
    if (!this.aptos) {
      throw new Error(`${this.config.chainName} client not initialized`);
    }

    await this.validateTransaction(tx);

    try {
      const sender = AccountAddress.from(tx.from);
      const recipient = AccountAddress.from(tx.to);

      // Build transaction for estimation using v2 API
      const transaction = await this.aptos.transaction.build.simple({
        sender: sender,
        data: {
          function: '0x1::aptos_account::transfer',
          functionArguments: [recipient, tx.value],
        },
        options: {
          gasUnitPrice: tx.gasUnitPrice || this.config.defaultGasUnitPrice || 100,
          maxGasAmount: tx.maxGasAmount || this.config.defaultMaxGasAmount || 2000,
          ...(tx.expirationTimestampSecs && { expireTimestamp: tx.expirationTimestampSecs }),
        },
      });

      // Simulate transaction to get gas estimate
      let gasEstimate: any;
      try {
        const simulation = await this.aptos.transaction.simulate.simple({
          transaction,
        });

        if (simulation && simulation.length > 0) {
          gasEstimate = {
            gasUsed: parseInt(simulation[0].gas_used),
            gasUnitPrice: parseInt(simulation[0].gas_unit_price),
          };
        }
      } catch (error) {
        console.warn('Gas simulation failed, using defaults:', error.message);
        gasEstimate = {
          gasUsed: this.config.defaultMaxGasAmount || 2000,
          gasUnitPrice: this.config.defaultGasUnitPrice || 100,
        };
      }

      const gasUnitPrice = tx.gasUnitPrice || gasEstimate.gasUnitPrice || this.config.defaultGasUnitPrice || 100;
      const maxGasAmount = Math.ceil((gasEstimate.gasUsed || 2000) * 1.2); // 20% buffer
      
      const estimatedGasFee = gasUnitPrice * maxGasAmount;
      const estimatedGasFeeAPT = (estimatedGasFee / 100000000).toFixed(8);

      // Get USD estimate
      let estimatedGasFeeUsd: number | undefined;
      try {
        const aptPrice = await this.getAPTPriceUSD();
        if (aptPrice) {
          estimatedGasFeeUsd = parseFloat(estimatedGasFeeAPT) * aptPrice;
        }
      } catch (error) {
        console.warn('Failed to get APT price for USD estimation:', error);
      }

      return {
        gasUnitPrice,
        maxGasAmount,
        estimatedGasFee,
        estimatedGasFeeAPT,
        estimatedGasFeeUsd,
      };

    } catch (error) {
      throw new Error(`Aptos gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Sign Aptos transaction using private key with v2 SDK
   */
  async signTransaction(tx: AptosTransactionRequest, privateKey: string): Promise<AptosSignedTransaction> {
    if (!this.aptos) {
      throw new Error(`${this.config.chainName} client not initialized`);
    }

    await this.validateTransaction(tx);

    try {
      // Create account from private key
      const account = this.createAccount(privateKey);
      
      // Verify account address matches from address
      if (account.accountAddress.toString() !== tx.from) {
        throw new Error('Private key does not match from address');
      }

      const recipient = AccountAddress.from(tx.to);

      // Build transaction using v2 API
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: '0x1::aptos_account::transfer',
          functionArguments: [recipient, tx.value],
        },
        options: {
          gasUnitPrice: tx.gasUnitPrice || this.config.defaultGasUnitPrice || 100,
          maxGasAmount: tx.maxGasAmount || this.config.defaultMaxGasAmount || 2000,
          ...(tx.expirationTimestampSecs && { expireTimestamp: tx.expirationTimestampSecs }),
        },
      });

      // Sign transaction using v2 API
      const senderAuthenticator = this.aptos.transaction.sign({
        signer: account,
        transaction,
      });

      return {
        transaction,
        senderAuthenticator,
        sender: account.accountAddress.toString(),
        maxGasAmount: tx.maxGasAmount || this.config.defaultMaxGasAmount || 2000,
        gasUnitPrice: tx.gasUnitPrice || this.config.defaultGasUnitPrice || 100,
        expirationTimestampSecs: tx.expirationTimestampSecs || Math.floor(Date.now() / 1000) + 30,
      };

    } catch (error) {
      throw new Error(`Aptos transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Broadcast Aptos transaction using v2 SDK
   */
  async broadcastTransaction(signedTx: AptosSignedTransaction): Promise<AptosBroadcastResult> {
    if (!this.aptos) {
      throw new Error(`${this.config.chainName} client not initialized`);
    }

    try {
      // Submit transaction using v2 API
      const pendingTransaction = await this.aptos.transaction.submit.simple({
        transaction: signedTx.transaction,
        senderAuthenticator: signedTx.senderAuthenticator,
      });

      // Wait for transaction to be processed
      const committedTxn = await this.aptos.waitForTransaction({
        transactionHash: pendingTransaction.hash,
        options: {
          timeoutSecs: this.config.timeout ? this.config.timeout / 1000 : 30,
        },
      });

      const success = committedTxn.success;
      
      return {
        success,
        hash: committedTxn.hash,
        version: committedTxn.version,
        vmStatus: committedTxn.vm_status,
        gasUsed: committedTxn.gas_used ? parseInt(committedTxn.gas_used) : undefined,
        pendingTransaction,
        transaction: success ? (committedTxn as UserTransactionResponse) : undefined,
      };

    } catch (error) {
      return {
        success: false,
        error: `Aptos broadcast failed: ${error.message}`,
      };
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<{
    success: boolean;
    pending: boolean;
    version?: string;
    vmStatus?: string;
    gasUsed?: number;
  }> {
    if (!this.aptos) {
      throw new Error('Client not initialized');
    }

    try {
      const transaction = await this.aptos.getTransactionByHash({
        transactionHash: txHash,
      });

      if (transaction.type === 'pending_transaction') {
        return {
          success: false,
          pending: true,
        };
      }

      const userTransaction = transaction as UserTransactionResponse;
      
      return {
        success: userTransaction.success,
        pending: false,
        version: userTransaction.version,
        vmStatus: userTransaction.vm_status,
        gasUsed: parseInt(userTransaction.gas_used),
      };

    } catch (error) {
      console.error(`Failed to get transaction status for ${txHash}:`, error);
      return {
        success: false,
        pending: false,
      };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<number> {
    if (!this.aptos) {
      throw new Error('Client not initialized');
    }

    try {
      const accountAddress = AccountAddress.from(address);
      const resource = await this.aptos.getAccountResource({
        accountAddress,
        resourceType: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
      });

      return parseInt((resource as any).coin.value);
    } catch (error) {
      console.error(`Failed to get balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(address: string): Promise<any> {
    if (!this.aptos) {
      throw new Error('Client not initialized');
    }

    try {
      const accountAddress = AccountAddress.from(address);
      return await this.aptos.getAccountInfo({
        accountAddress,
      });
    } catch (error) {
      console.error(`Failed to get account info for ${address}:`, error);
      return null;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private createAccount(privateKey: string): Account {
    try {
      // Remove 0x prefix if present
      const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
      
      if (cleanKey.length !== 64) {
        throw new Error('Invalid private key length. Expected 32 bytes (64 hex characters).');
      }

      const privateKeyBytes = new Uint8Array(
        cleanKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );

      const ed25519PrivateKey = new Ed25519PrivateKey(privateKeyBytes);
      return Account.fromPrivateKey({ privateKey: ed25519PrivateKey });

    } catch (error) {
      throw new Error(`Invalid Aptos private key: ${error.message}`);
    }
  }

  private async getAPTPriceUSD(): Promise<number | null> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=aptos&vs_currencies=usd');
      const data = await response.json();
      return data.aptos?.usd || null;
    } catch {
      return null;
    }
  }

  private getRpcUrl(): string | null {
    try {
      const provider = rpcManager.getOptimalProvider(
        'aptos' as SupportedChain,
        this.config.networkType as NetworkType
      );
      return provider?.config.url || this.config.rpcUrl || null;
    } catch {
      return this.config.rpcUrl || null;
    }
  }
}

// ============================================================================
// CHAIN-SPECIFIC APTOS BUILDERS
// ============================================================================

export const AptosMainnetTransactionBuilder = () => {
  return new AptosTransactionBuilder({
    chainId: 1,
    chainName: 'Aptos',
    networkType: 'mainnet',
    network: Network.MAINNET,
    rpcUrl: import.meta.env.VITE_APTOS_RPC_URL,
    symbol: 'APT',
    decimals: 8,
    defaultGasUnitPrice: 100,
    defaultMaxGasAmount: 2000,
    timeout: 30000,
  });
};

export const AptosTestnetTransactionBuilder = () => {
  return new AptosTransactionBuilder({
    chainId: 2,
    chainName: 'Aptos Testnet',
    networkType: 'testnet',
    network: Network.TESTNET,
    rpcUrl: import.meta.env.VITE_APTOS_TESTNET_RPC_URL || 'https://fullnode.testnet.aptoslabs.com/v1',
    symbol: 'APT',
    decimals: 8,
    defaultGasUnitPrice: 100,
    defaultMaxGasAmount: 2000,
    timeout: 30000,
  });
};

// Export convenience function
export const getAptosTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  return networkType === 'mainnet' ? AptosMainnetTransactionBuilder() : AptosTestnetTransactionBuilder();
};
