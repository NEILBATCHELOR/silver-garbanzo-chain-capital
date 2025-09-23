/**
 * Injective Adapter Implementation
 * 
 * Injective Protocol blockchain adapter
 * Built on Cosmos SDK with custom DeFi modules
 */

import { CosmosAdapter } from '../cosmos/CosmosAdapter';
import type { 
  NetworkType, 
  TransactionParams, 
  TransactionResult,
  AccountInfo as AdapterAccountInfo,
  TokenBalance
} from '../IBlockchainAdapter';
import { 
  ChainRestAuthApi,
  ChainRestTendermintApi,
  ChainRestBankApi,
  ChainGrpcBankApi,
  ChainGrpcAuthApi,
  ChainGrpcWasmApi,
  IndexerGrpcSpotApi,
  IndexerGrpcDerivativesApi,
  IndexerGrpcAccountApi,
  IndexerGrpcOracleApi
} from '@injectivelabs/sdk-ts';
import {
  Network,
  getNetworkEndpoints,
  getNetworkInfo
} from '@injectivelabs/networks';
import {
  MsgSend,
  MsgExecuteContract,
  MsgInstantiateContract
} from '@injectivelabs/sdk-ts';
import {
  BaseAccount,
  TxRestApi,
  PrivateKey,
  createTransaction
} from '@injectivelabs/sdk-ts';
import { BigNumberInBase } from '@injectivelabs/utils';

// Injective-specific types
export interface InjectiveMarketInfo {
  marketId: string;
  ticker: string;
  baseDenom: string;
  quoteDenom: string;
  minPriceTickSize: string;
  minQuantityTickSize: string;
}

export interface InjectivePosition {
  marketId: string;
  subaccountId: string;
  direction: 'long' | 'short';
  quantity: string;
  entryPrice: string;
  margin: string;
  unrealizedPnl: string;
}

export interface InjectiveOrder {
  orderHash: string;
  marketId: string;
  subaccountId: string;
  price: string;
  quantity: string;
  orderType: string;
  side: 'buy' | 'sell';
  state: string;
}

export class InjectiveAdapter extends CosmosAdapter {
  private network: Network;
  private endpoints: any;
  
  // API clients
  private authApi?: ChainRestAuthApi;
  private tendermintApi?: ChainRestTendermintApi;
  private bankApi?: ChainRestBankApi;
  private txApi?: TxRestApi;
  
  // gRPC clients
  private grpcBankApi?: ChainGrpcBankApi;
  private grpcAuthApi?: ChainGrpcAuthApi;
  private grpcWasmApi?: ChainGrpcWasmApi;
  
  // Indexer clients
  private indexerSpotApi?: IndexerGrpcSpotApi;
  private indexerDerivativesApi?: IndexerGrpcDerivativesApi;
  private indexerAccountApi?: IndexerGrpcAccountApi;
  private indexerOracleApi?: IndexerGrpcOracleApi;

  // Note: Using inherited chainName from CosmosAdapter
  // Injective-specific functionality distinguishes this from base Cosmos

  constructor(networkType: NetworkType = 'mainnet') {
    // Initialize with Injective-specific config
    super(networkType, 'inj');

    // Set Injective network
    this.network = networkType === 'mainnet' ? Network.Mainnet : Network.Testnet;
    this.endpoints = getNetworkEndpoints(this.network);
    const networkInfo = getNetworkInfo(this.network);

    // Override Cosmos defaults
    this.chainId = networkInfo.chainId;
    this.denom = 'inj';
    this.addressPrefix = 'inj';
    this.rpcEndpoint = this.endpoints.rpc;
    
    // Note: nativeCurrency is readonly in base class, so we can't override it
    // The Injective native currency info is handled in specific methods
  }

  // Connection management
  async connect(config?: any): Promise<void> {
    try {
      // Connect using parent Cosmos adapter
      await super.connect(config || { 
        rpcUrl: this.endpoints.rpc, 
        networkId: this.chainId 
      });

      // Initialize Injective-specific APIs
      this.authApi = new ChainRestAuthApi(this.endpoints.rest);
      this.tendermintApi = new ChainRestTendermintApi(this.endpoints.rest);
      this.bankApi = new ChainRestBankApi(this.endpoints.rest);
      this.txApi = new TxRestApi(this.endpoints.rest);

      // Initialize gRPC clients
      this.grpcBankApi = new ChainGrpcBankApi(this.endpoints.grpc);
      this.grpcAuthApi = new ChainGrpcAuthApi(this.endpoints.grpc);
      this.grpcWasmApi = new ChainGrpcWasmApi(this.endpoints.grpc);

      // Initialize indexer clients
      this.indexerSpotApi = new IndexerGrpcSpotApi(this.endpoints.indexer);
      this.indexerDerivativesApi = new IndexerGrpcDerivativesApi(this.endpoints.indexer);
      this.indexerAccountApi = new IndexerGrpcAccountApi(this.endpoints.indexer);
      this.indexerOracleApi = new IndexerGrpcOracleApi(this.endpoints.indexer);

      console.log(`Connected to Injective ${this.networkType}`);
    } catch (error) {
      this._isConnected = false;
      throw new Error(`Failed to connect to Injective: ${error}`);
    }
  }

  // Override account operations for Injective
  async getAccount(address: string): Promise<AdapterAccountInfo> {
    this.validateConnection();
    
    try {
      if (!this.authApi || !this.bankApi) {
        throw new Error('API clients not initialized');
      }

      // Get account details
      const accountDetailsResponse = await this.authApi.fetchAccount(address);
      const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);
      
      // Get balances
      const balancesResponse = await this.bankApi.fetchBalances(address);
      const injBalance = balancesResponse.balances.find(b => b.denom === this.denom);

      return {
        address,
        balance: BigInt(injBalance?.amount || '0'),
        publicKey: baseAccount.pubKey?.key || undefined,
        nonce: baseAccount.sequence
      };
    } catch (error) {
      throw new Error(`Failed to get Injective account: ${error}`);
    }
  }

  async getBalance(address: string): Promise<bigint> {
    this.validateConnection();
    
    try {
      if (!this.bankApi) {
        throw new Error('Bank API not initialized');
      }

      const balancesResponse = await this.bankApi.fetchBalances(address);
      const injBalance = balancesResponse.balances.find(b => b.denom === this.denom);
      
      return BigInt(injBalance?.amount || '0');
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }
  }

  // Transaction operations with Injective SDK
  async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
    this.validateConnection();
    
    try {
      if (!this.wallet || !this.txApi) {
        throw new Error('Wallet or TX API not initialized');
      }

      const accounts = await this.wallet.getAccounts();
      const sender = accounts[0];
      
      // Create MsgSend
      const amount = {
        denom: this.denom,
        amount: params.amount
      };

      const msg = MsgSend.fromJSON({
        srcInjectiveAddress: sender.address,
        dstInjectiveAddress: params.to,
        amount
      });

      // Get account details for nonce
      const accountDetails = await this.authApi!.fetchAccount(sender.address);
      const baseAccount = BaseAccount.fromRestApi(accountDetails);

      // Create transaction
      const { signDoc, txRaw } = createTransaction({
        message: msg,
        memo: params.data || '',
        pubKey: baseAccount.pubKey?.key || '',
        sequence: baseAccount.sequence,
        accountNumber: baseAccount.accountNumber,
        chainId: this.chainId
      });

      // Sign transaction
      const privateKey = PrivateKey.fromHex(sender.pubkey);
      const signature = await privateKey.sign(Buffer.from(JSON.stringify(signDoc)));

      // Broadcast transaction
      const txResponse = await this.txApi.broadcast(txRaw);

      return {
        txHash: txResponse.txHash,
        status: txResponse.code === 0 ? 'confirmed' : 'failed',
        blockNumber: txResponse.height,
        gasUsed: txResponse.gasUsed?.toString(),
        fee: txResponse.gasWanted?.toString()
      };
    } catch (error) {
      throw new Error(`Failed to send Injective transaction: ${error}`);
    }
  }

  // Injective-specific methods

  // Spot market operations (via indexer)
  async getSpotMarkets(): Promise<any[]> {
    if (!this.indexerSpotApi) {
      throw new Error('Indexer Spot API not initialized');
    }

    try {
      const markets = await this.indexerSpotApi.fetchMarkets();
      return markets || [];
    } catch (error) {
      throw new Error(`Failed to get spot markets: ${error}`);
    }
  }

  async getSpotOrderbook(marketId: string): Promise<any> {
    if (!this.indexerSpotApi) {
      throw new Error('Indexer Spot API not initialized');
    }

    try {
      const orderbook = await this.indexerSpotApi.fetchOrderbook(marketId);
      return orderbook;
    } catch (error) {
      throw new Error(`Failed to get spot orderbook: ${error}`);
    }
  }

  // Derivatives market operations (via indexer)
  async getDerivativeMarkets(): Promise<any[]> {
    if (!this.indexerDerivativesApi) {
      throw new Error('Indexer Derivatives API not initialized');
    }

    try {
      const markets = await this.indexerDerivativesApi.fetchMarkets();
      return markets || [];
    } catch (error) {
      throw new Error(`Failed to get derivative markets: ${error}`);
    }
  }

  async getDerivativePositions(subaccountId: string): Promise<InjectivePosition[]> {
    if (!this.indexerDerivativesApi) {
      throw new Error('Indexer Derivatives API not initialized');
    }

    try {
      const positions = await this.indexerDerivativesApi.fetchPositions({
        subaccountId
      });

      return positions.positions.map((pos: any) => ({
        marketId: pos.marketId,
        subaccountId: pos.subaccountId,
        direction: pos.direction,
        quantity: pos.quantity,
        entryPrice: pos.entryPrice,
        margin: pos.margin,
        unrealizedPnl: pos.unrealizedPnl
      }));
    } catch (error) {
      throw new Error(`Failed to get derivative positions: ${error}`);
    }
  }

  // Subaccount operations
  async getSubaccounts(address: string): Promise<string[]> {
    if (!this.indexerAccountApi) {
      throw new Error('Indexer Account API not initialized');
    }

    try {
      const subaccounts = await this.indexerAccountApi.fetchSubaccountsList(address);
      return subaccounts.map((sa: any) => sa.subaccountId);
    } catch (error) {
      throw new Error(`Failed to get subaccounts: ${error}`);
    }
  }

  async getSubaccountBalance(subaccountId: string, denom: string = 'inj'): Promise<any> {
    if (!this.indexerAccountApi) {
      throw new Error('Indexer Account API not initialized');
    }

    try {
      const balances = await this.indexerAccountApi.fetchSubaccountBalance(subaccountId, denom);
      return balances;
    } catch (error) {
      throw new Error(`Failed to get subaccount balance: ${error}`);
    }
  }

  // Oracle operations
  async getOraclePrices(baseSymbol: string = 'INJ', quoteSymbol: string = 'USD', oracleType: string = 'bandibc'): Promise<any> {
    if (!this.indexerOracleApi) {
      throw new Error('Indexer Oracle API not initialized');
    }

    try {
      const prices = await this.indexerOracleApi.fetchOraclePrice({
        baseSymbol,
        quoteSymbol,
        oracleType
      });
      return prices;
    } catch (error) {
      throw new Error(`Failed to get oracle prices: ${error}`);
    }
  }

  // CosmWasm contract operations
  async querySmartContract(contractAddress: string, query: any): Promise<any> {
    if (!this.grpcWasmApi) {
      throw new Error('Wasm API not initialized');
    }

    try {
      const response = await this.grpcWasmApi.fetchSmartContractState(
        contractAddress,
        Buffer.from(JSON.stringify(query)).toString('base64')
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to query smart contract: ${error}`);
    }
  }

  async executeContract(
    contractAddress: string,
    msg: any,
    funds?: { denom: string; amount: string }[]
  ): Promise<TransactionResult> {
    if (!this.wallet || !this.txApi) {
      throw new Error('Wallet or TX API not initialized');
    }

    try {
      const accounts = await this.wallet.getAccounts();
      const sender = accounts[0];

      const msgExecute = MsgExecuteContract.fromJSON({
        sender: sender.address,
        contractAddress,
        msg,
        funds: funds || []
      });

      // Get account details
      const accountDetails = await this.authApi!.fetchAccount(sender.address);
      const baseAccount = BaseAccount.fromRestApi(accountDetails);

      // Create and sign transaction
      const { signDoc, txRaw } = createTransaction({
        message: msgExecute,
        memo: '',
        pubKey: baseAccount.pubKey?.key || '',
        sequence: baseAccount.sequence,
        accountNumber: baseAccount.accountNumber,
        chainId: this.chainId
      });

      const privateKey = PrivateKey.fromHex(sender.pubkey);
      const signature = await privateKey.sign(Buffer.from(JSON.stringify(signDoc)));

      // Broadcast
      const txResponse = await this.txApi.broadcast(txRaw);

      return {
        txHash: txResponse.txHash,
        status: txResponse.code === 0 ? 'confirmed' : 'failed',
        blockNumber: txResponse.height
      };
    } catch (error) {
      throw new Error(`Failed to execute contract: ${error}`);
    }
  }

  // Override explorer URL for Injective
  getExplorerUrl(txHash: string): string {
    if (this.networkType === 'mainnet') {
      return `https://explorer.injective.network/transaction/${txHash}`;
    } else {
      return `https://testnet.explorer.injective.network/transaction/${txHash}`;
    }
  }

  // Get network endpoints
  getNetworkEndpoints(): any {
    return this.endpoints;
  }

  // Token operations with CW20 support
  async getTokenBalance(address: string, tokenAddress: string): Promise<TokenBalance> {
    this.validateConnection();
    
    try {
      // Check if it's a native token or CW20
      if (tokenAddress.startsWith('inj')) {
        // Native or IBC token
        const balances = await this.bankApi!.fetchBalances(address);
        const tokenBalance = balances.balances.find(b => b.denom === tokenAddress);
        
        return {
          address: tokenAddress,
          symbol: tokenAddress.toUpperCase(),
          decimals: 18,
          balance: BigInt(tokenBalance?.amount || '0')
        };
      } else {
        // CW20 token
        const query = {
          balance: { address }
        };
        
        const response = await this.querySmartContract(tokenAddress, query);
        
        return {
          address: tokenAddress,
          symbol: 'CW20', // Would need token_info query for actual symbol
          decimals: 18,
          balance: BigInt(response.balance || '0')
        };
      }
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error}`);
    }
  }
}

export const injectiveAdapter = new InjectiveAdapter();
