/**
 * Injective Transaction Builder
 * Real Injective transaction building using @injectivelabs/sdk-ts
 * Supports Injective mainnet and testnet with real transaction creation
 */

import {
  ChainId,
  CosmosChainId,
} from '@injectivelabs/ts-types';

import {
  Network,
  getNetworkEndpoints,
} from '@injectivelabs/networks';

import {
  TxRestApi,
  ChainGrpcBankApi,
  ChainGrpcAuthApi,
  ChainRestAuthApi,
  IndexerGrpcAccountApi,
  IndexerGrpcExplorerApi,
  MsgSend,
  PrivateKey,
  PublicKey,
  createTransaction,
  BaseAccount,
} from '@injectivelabs/sdk-ts';

import {
  BigNumberInBase,
  BigNumberInWei,
} from '@injectivelabs/utils';

import { rpcManager } from '../../../infrastructure/web3/rpc/RPCConnectionManager';
import type { SupportedChain, NetworkType } from '../../../infrastructure/web3/adapters/IBlockchainAdapter';
import { ChainType } from '../AddressUtils';
import { addressUtils } from '../AddressUtils';

// Define DEFAULT_STD_FEE since it's not exported in this version
const DEFAULT_STD_FEE = {
  amount: [
    {
      amount: '500000000000000',
      denom: 'inj',
    },
  ],
  gas: '200000',
};

// ============================================================================
// INJECTIVE-SPECIFIC INTERFACES
// ============================================================================

export interface InjectiveTransactionRequest {
  from: string; // Injective address (inj...)
  to: string; // Injective address (inj...)
  value: string; // in wei (18 decimals)
  denom?: string; // default is 'inj'
  gas?: string; // gas limit
  gasPrice?: string; // gas price in wei
  memo?: string;
  timeoutHeight?: number;
}

export interface InjectiveGasEstimate {
  gasLimit: number;
  gasPrice: string; // wei
  gasFee: string; // wei
  gasFeeINJ: string; // INJ format
  gasFeeUsd?: number;
  estimatedGas: number;
}

export interface InjectiveSignedTransaction {
  txRaw: any; // TxRaw from Injective SDK
  signBytes: Uint8Array;
  hash: string;
  signer: string;
  msgs: any[];
  gasLimit: number;
  gasPrice: string;
  memo: string;
  timeoutHeight: number;
}

export interface InjectiveBroadcastResult {
  success: boolean;
  txHash?: string;
  height?: number;
  gasUsed?: number;
  gasWanted?: number;
  code?: number;
  codespace?: string;
  rawLog?: string;
  logs?: any[];
  events?: any[];
  data?: string;
  info?: string;
  error?: string;
}

export interface InjectiveTransactionBuilderConfig {
  chainId: ChainId;
  chainName: string;
  networkType: 'mainnet' | 'testnet';
  network: Network;
  rpcUrl?: string;
  grpcUrl?: string;
  restUrl?: string;
  explorerUrl?: string;
  symbol: string;
  decimals: number;
  baseDenom: string;
  defaultGasPrice?: string;
  defaultGasLimit?: number;
  timeout?: number;
}

// ============================================================================
// INJECTIVE TRANSACTION BUILDER
// ============================================================================

export class InjectiveTransactionBuilder {
  private txClient: TxRestApi | null = null;
  private bankApi: ChainGrpcBankApi | null = null;
  private authApi: ChainGrpcAuthApi | null = null;
  private restAuthApi: ChainRestAuthApi | null = null;
  private accountApi: IndexerGrpcAccountApi | null = null;
  private explorerApi: IndexerGrpcExplorerApi | null = null;
  private readonly config: InjectiveTransactionBuilderConfig;
  private readonly endpoints: any;

  constructor(config: InjectiveTransactionBuilderConfig) {
    this.config = config;
    this.endpoints = getNetworkEndpoints(config.network);
    this.initializeClients();
  }

  private initializeClients(): void {
    try {
      const grpcUrl = this.config.grpcUrl || this.endpoints.grpc;
      const restUrl = this.config.restUrl || this.endpoints.rest;
      
      this.txClient = new TxRestApi(restUrl);
      this.bankApi = new ChainGrpcBankApi(grpcUrl);
      this.authApi = new ChainGrpcAuthApi(grpcUrl);
      this.restAuthApi = new ChainRestAuthApi(restUrl);
      
      const indexerUrl = this.endpoints.indexer;
      this.accountApi = new IndexerGrpcAccountApi(indexerUrl);
      this.explorerApi = new IndexerGrpcExplorerApi(indexerUrl);

    } catch (error) {
      console.error(`Failed to initialize Injective clients for ${this.config.chainName}:`, error);
    }
  }

  /**
   * Validate Injective transaction parameters
   */
  async validateTransaction(tx: InjectiveTransactionRequest): Promise<boolean> {
    // Validate addresses using AddressUtils
    const fromValid = addressUtils.validateAddress(tx.from, ChainType.INJECTIVE, this.config.networkType);
    const toValid = addressUtils.validateAddress(tx.to, ChainType.INJECTIVE, this.config.networkType);
    
    if (!fromValid.isValid) {
      throw new Error(`Invalid from address: ${fromValid.error}`);
    }
    
    if (!toValid.isValid) {
      throw new Error(`Invalid to address: ${toValid.error}`);
    }

    // Validate value
    try {
      const valueBN = new BigNumberInWei(tx.value);
      if (valueBN.lte(0)) {
        throw new Error('Transaction value must be greater than 0');
      }
    } catch (error) {
      throw new Error(`Invalid transaction value: ${error.message}`);
    }

    // Validate addresses format
    if (!tx.from.startsWith('inj1') || tx.from.length !== 42) {
      throw new Error('Invalid Injective from address format');
    }

    if (!tx.to.startsWith('inj1') || tx.to.length !== 42) {
      throw new Error('Invalid Injective to address format');
    }

    return true;
  }

  /**
   * Estimate Injective transaction gas
   */
  async estimateGas(tx: InjectiveTransactionRequest): Promise<InjectiveGasEstimate> {
    if (!this.txClient || !this.authApi) {
      throw new Error(`${this.config.chainName} clients not initialized`);
    }

    await this.validateTransaction(tx);

    try {
      // Create message for simulation
      const msg = MsgSend.fromJSON({
        srcInjectiveAddress: tx.from,
        dstInjectiveAddress: tx.to,
        amount: {
          denom: tx.denom || this.config.baseDenom,
          amount: tx.value,
        },
      });

      // Get account details for sequence number
      const accountDetails = await this.authApi.fetchAccount(tx.from);
      
      // For now, use default gas values since transaction creation has changed
      const estimatedGas = this.config.defaultGasLimit || 200000;
      const gasLimit = Math.ceil(estimatedGas * 1.3); // 30% buffer
      const gasPrice = tx.gasPrice || this.config.defaultGasPrice || '500000000'; // 0.5 Gwei equivalent
      const gasFee = new BigNumberInWei(gasPrice).multipliedBy(gasLimit);
      const gasFeeINJ = new BigNumberInBase(gasFee.toFixed()).toWei(-18).toFixed(6);

      // Get USD estimate
      let gasFeeUsd: number | undefined;
      try {
        const injPrice = await this.getINJPriceUSD();
        if (injPrice) {
          gasFeeUsd = parseFloat(gasFeeINJ) * injPrice;
        }
      } catch (error) {
        console.warn('Failed to get INJ price for USD estimation:', error);
      }

      return {
        gasLimit,
        gasPrice,
        gasFee: gasFee.toFixed(),
        gasFeeINJ,
        gasFeeUsd,
        estimatedGas,
      };

    } catch (error) {
      throw new Error(`Injective gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Sign Injective transaction using private key
   */
  async signTransaction(tx: InjectiveTransactionRequest, privateKey: string): Promise<InjectiveSignedTransaction> {
    if (!this.authApi) {
      throw new Error(`${this.config.chainName} auth client not initialized`);
    }

    await this.validateTransaction(tx);

    try {
      // Create private key instance
      const privKey = PrivateKey.fromHex(privateKey);
      const pubKey = privKey.toPublicKey();
      const publicKeyBase64 = pubKey.toBase64();
      
      // Verify public key matches from address
      const addressFromPubKey = pubKey.toBech32();
      if (addressFromPubKey !== tx.from) {
        throw new Error('Private key does not match from address');
      }

      // Get account details
      const accountDetailsResponse = await this.restAuthApi.fetchAccount(tx.from);
      const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

      // Create message
      const msg = MsgSend.fromJSON({
        srcInjectiveAddress: tx.from,
        dstInjectiveAddress: tx.to,
        amount: {
          denom: tx.denom || this.config.baseDenom,
          amount: tx.value,
        },
      });

      // Calculate gas
      const gasLimit = parseInt(tx.gas || this.config.defaultGasLimit?.toString() || '200000');
      const gasPrice = tx.gasPrice || this.config.defaultGasPrice || '500000000';
      
      // Create the fee structure
      const fee = {
        amount: [
          {
            denom: this.config.baseDenom,
            amount: new BigNumberInWei(gasPrice).multipliedBy(gasLimit).toFixed(),
          },
        ],
        gas: gasLimit.toString(),
      };

      // Create transaction using new API
      const { txRaw, signBytes } = createTransaction({
        message: msg,
        memo: tx.memo || '',
        fee: fee,
        pubKey: publicKeyBase64,
        sequence: baseAccount.sequence,
        timeoutHeight: tx.timeoutHeight || 0,
        accountNumber: baseAccount.accountNumber,
        chainId: this.config.chainId,
      });

      // Sign the transaction
      const signature = await privKey.sign(Buffer.from(signBytes));

      // Append signature to txRaw
      txRaw.signatures = [signature];

      return {
        txRaw,
        signBytes,
        hash: '', // Will be calculated during broadcast
        signer: tx.from,
        msgs: [msg],
        gasLimit,
        gasPrice,
        memo: tx.memo || '',
        timeoutHeight: tx.timeoutHeight || 0,
      };

    } catch (error) {
      throw new Error(`Injective transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Broadcast Injective transaction
   */
  async broadcastTransaction(signedTx: InjectiveSignedTransaction): Promise<InjectiveBroadcastResult> {
    if (!this.txClient) {
      throw new Error(`${this.config.chainName} transaction client not initialized`);
    }

    try {
      const txResponse = await this.txClient.broadcast(signedTx.txRaw);

      const success = txResponse.code === 0;

      return {
        success,
        txHash: txResponse.txHash,
        height: txResponse.height,
        gasUsed: txResponse.gasUsed,
        gasWanted: txResponse.gasWanted,
        code: txResponse.code,
        codespace: txResponse.codespace,
        rawLog: txResponse.rawLog,
        logs: txResponse.logs,
        events: txResponse.events,
        data: txResponse.data,
        info: txResponse.info,
      };

    } catch (error) {
      return {
        success: false,
        error: `Injective broadcast failed: ${error.message}`,
      };
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<{
    success: boolean;
    found: boolean;
    height?: number;
    gasUsed?: number;
    gasWanted?: number;
    code?: number;
    logs?: any[];
  }> {
    if (!this.explorerApi) {
      throw new Error('Explorer API not initialized');
    }

    try {
      const transaction = await this.explorerApi.fetchTxByHash(txHash);

      if (!transaction) {
        return {
          success: false,
          found: false,
        };
      }

      const success = transaction.code === 0;

      return {
        success,
        found: true,
        height: parseInt((transaction as any).height?.toString() || '0'),
        gasUsed: parseInt((transaction as any).gasUsed?.toString() || '0'),
        gasWanted: parseInt((transaction as any).gasWanted?.toString() || '0'),
        code: transaction.code,
        logs: (transaction as any).logs || [],
      };

    } catch (error) {
      console.error(`Failed to get transaction status for ${txHash}:`, error);
      return {
        success: false,
        found: false,
      };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string, denom?: string): Promise<string> {
    if (!this.bankApi) {
      throw new Error('Bank client not initialized');
    }

    try {
      const balance = await this.bankApi.fetchBalance({
        accountAddress: address,
        denom: denom || this.config.baseDenom,
      });

      return balance.amount;
    } catch (error) {
      console.error(`Failed to get balance for ${address}:`, error);
      return '0';
    }
  }

  /**
   * Get all balances for address
   */
  async getAllBalances(address: string): Promise<any[]> {
    if (!this.bankApi) {
      throw new Error('Bank client not initialized');
    }

    try {
      const balances = await this.bankApi.fetchBalances(address);
      return balances.balances;
    } catch (error) {
      console.error(`Failed to get all balances for ${address}:`, error);
      return [];
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(address: string): Promise<any> {
    if (!this.authApi) {
      throw new Error('Auth client not initialized');
    }

    try {
      const accountDetails = await this.authApi.fetchAccount(address);
      return accountDetails;
    } catch (error) {
      console.error(`Failed to get account info for ${address}:`, error);
      return null;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getINJPriceUSD(): Promise<number | null> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd');
      const data = await response.json();
      return data['injective-protocol']?.usd || null;
    } catch {
      return null;
    }
  }

  private getRpcUrl(): string | null {
    try {
      const provider = rpcManager.getOptimalProvider(
        'injective' as SupportedChain,
        this.config.networkType as NetworkType
      );
      return provider?.config.url || this.config.rpcUrl || null;
    } catch {
      return this.config.rpcUrl || null;
    }
  }
}

// ============================================================================
// CHAIN-SPECIFIC INJECTIVE BUILDERS
// ============================================================================

export const InjectiveMainnetTransactionBuilder = () => {
  return new InjectiveTransactionBuilder({
    chainId: ChainId.Mainnet,
    chainName: 'Injective',
    networkType: 'mainnet',
    network: Network.Mainnet,
    rpcUrl: import.meta.env.VITE_INJECTIVE_RPC_URL,
    explorerUrl: 'https://explorer.injective.network',
    symbol: 'INJ',
    decimals: 18,
    baseDenom: 'inj',
    defaultGasPrice: '500000000', // 0.5 Gwei equivalent
    defaultGasLimit: 200000,
    timeout: 30000,
  });
};

export const InjectiveTestnetTransactionBuilder = () => {
  return new InjectiveTransactionBuilder({
    chainId: ChainId.Testnet,
    chainName: 'Injective Testnet',
    networkType: 'testnet',
    network: Network.Testnet,
    rpcUrl: import.meta.env.VITE_INJECTIVE_TESTNET_RPC_URL || 'https://testnet.injective.network:443',
    explorerUrl: 'https://testnet.explorer.injective.network',
    symbol: 'INJ',
    decimals: 18,
    baseDenom: 'inj',
    defaultGasPrice: '500000000',
    defaultGasLimit: 200000,
    timeout: 30000,
  });
};

// Export convenience function
export const getInjectiveTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  return networkType === 'mainnet' ? InjectiveMainnetTransactionBuilder() : InjectiveTestnetTransactionBuilder();
};
