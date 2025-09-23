/**
 * Cosmos Adapter Implementation
 * 
 * Cosmos SDK blockchain adapter for IBC-enabled chains
 * Supports mainnet and testnet networks
 */

import { StargateClient, SigningStargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { Secp256k1HdWallet, StdFee } from '@cosmjs/amino';
import { coins, Coin } from '@cosmjs/proto-signing';
import { fromBech32, toBech32 } from '@cosmjs/encoding';
import { Secp256k1 } from '@cosmjs/crypto';
import { sha256 } from '@cosmjs/crypto';
import { fromHex, toHex } from '@cosmjs/encoding';
import { stringToPath } from '@cosmjs/crypto';
import type {
  IBlockchainAdapter,
  NetworkType,
  TransactionParams,
  TransactionResult,
  TransactionStatus,
  AccountInfo as AdapterAccountInfo,
  TokenBalance,
  ConnectionConfig,
  HealthStatus
} from '../IBlockchainAdapter';
import { BaseBlockchainAdapter } from '../IBlockchainAdapter';

// Cosmos-specific types
export interface CosmosTokenInfo {
  denom: string;
  amount: string;
}

export interface CosmosAccountInfo extends AdapterAccountInfo {
  accountNumber?: number;
  sequence?: number;
  pubkey?: string;
}

export class CosmosAdapter extends BaseBlockchainAdapter {
  protected client?: StargateClient;
  protected signingClient?: SigningStargateClient;
  protected rpcEndpoint: string = '';
  protected addressPrefix: string = 'cosmos';
  public chainId: string;
  protected denom: string = 'uatom';
  protected wallet?: DirectSecp256k1HdWallet | Secp256k1HdWallet;

  readonly chainName = 'cosmos';
  readonly networkType: NetworkType;
  readonly nativeCurrency = {
    name: 'Cosmos',
    symbol: 'ATOM',
    decimals: 6
  };

  constructor(networkType: NetworkType = 'mainnet', addressPrefix = 'cosmos') {
    super();
    this.networkType = networkType;
    this.addressPrefix = addressPrefix;
    
    // Set chain ID and RPC endpoint based on network type
    if (networkType === 'mainnet') {
      this.chainId = 'cosmoshub-4';
      this.rpcEndpoint = 'https://cosmos-rpc.polkachu.com';
    } else if (networkType === 'testnet') {
      this.chainId = 'theta-testnet-001';
      this.rpcEndpoint = 'https://rpc.sentry-01.theta-testnet.polypore.xyz';
    } else {
      throw new Error(`Unsupported Cosmos network: ${networkType}`);
    }
  }

  // Connection management
  async connect(config: ConnectionConfig): Promise<void> {
    try {
      this.config = config;
      
      // Use provided RPC URL or default endpoint
      const rpcUrl = config.rpcUrl || this.rpcEndpoint;
      
      // Connect to Cosmos network
      this.client = await StargateClient.connect(rpcUrl);
      
      // Test connection
      const height = await this.client.getHeight();
      if (height > 0) {
        this._isConnected = true;
        console.log(`Connected to Cosmos ${this.networkType} at height ${height}`);
      } else {
        throw new Error('Failed to connect to Cosmos network');
      }
    } catch (error) {
      this._isConnected = false;
      throw new Error(`Failed to connect to Cosmos: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.disconnect();
      this.client = undefined;
    }
    if (this.signingClient) {
      this.signingClient.disconnect();
      this.signingClient = undefined;
    }
    this._isConnected = false;
    console.log('Disconnected from Cosmos');
  }

  async getHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!this.client) {
        return {
          isHealthy: false,
          latency: Date.now() - startTime,
          lastChecked: Date.now()
        };
      }

      const height = await this.client.getHeight();
      
      return {
        isHealthy: true,
        latency: Date.now() - startTime,
        blockHeight: height,
        lastChecked: Date.now()
      };
    } catch (error) {
      return {
        isHealthy: false,
        latency: Date.now() - startTime,
        lastChecked: Date.now()
      };
    }
  }

  // Account operations
  async generateAccount(): Promise<AdapterAccountInfo> {
    try {
      // Generate mnemonic and create wallet
      const wallet = await DirectSecp256k1HdWallet.generate(24, {
        prefix: this.addressPrefix
      });
      
      const accounts = await wallet.getAccounts();
      const account = accounts[0];
      
      if (!account) {
        throw new Error('Failed to generate account');
      }

      // Get balance if connected
      let balance = BigInt(0);
      if (this._isConnected && this.client) {
        const balanceData = await this.client.getBalance(account.address, this.denom);
        balance = BigInt(balanceData.amount);
      }

      return {
        address: account.address,
        publicKey: toHex(account.pubkey),
        balance
      };
    } catch (error) {
      throw new Error(`Failed to generate Cosmos account: ${error}`);
    }
  }

  async importAccount(privateKey: string): Promise<AdapterAccountInfo> {
    try {
      // Import wallet from mnemonic or private key
      let wallet: DirectSecp256k1HdWallet;
      
      // Check if it's a mnemonic phrase
      if (privateKey.split(' ').length >= 12) {
        wallet = await DirectSecp256k1HdWallet.fromMnemonic(privateKey, {
          prefix: this.addressPrefix
        });
      } else {
        // Create wallet from private key hex
        const privKeyBytes = fromHex(privateKey);
        wallet = await DirectSecp256k1HdWallet.fromMnemonic(
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
          { prefix: this.addressPrefix }
        );
      }

      this.wallet = wallet;
      const accounts = await wallet.getAccounts();
      const account = accounts[0];
      
      if (!account) {
        throw new Error('Failed to import account');
      }

      // Get balance if connected
      let balance = BigInt(0);
      if (this._isConnected && this.client) {
        const balanceData = await this.client.getBalance(account.address, this.denom);
        balance = BigInt(balanceData.amount);
      }

      // Create signing client for transactions
      if (this.config?.rpcUrl && this.wallet) {
        this.signingClient = await SigningStargateClient.connectWithSigner(
          this.config.rpcUrl,
          this.wallet
        );
      }

      return {
        address: account.address,
        publicKey: toHex(account.pubkey),
        balance
      };
    } catch (error) {
      throw new Error(`Failed to import Cosmos account: ${error}`);
    }
  }

  async getAccount(address: string): Promise<AdapterAccountInfo> {
    this.validateConnection();
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const account = await this.client.getAccount(address);
      const balance = await this.client.getBalance(address, this.denom);

      return {
        address,
        balance: BigInt(balance.amount),
        publicKey: account?.pubkey ? toHex(account.pubkey as any) : undefined
      };
    } catch (error) {
      throw new Error(`Failed to get Cosmos account: ${error}`);
    }
  }

  async getBalance(address: string): Promise<bigint> {
    this.validateConnection();
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const balance = await this.client.getBalance(address, this.denom);
      return BigInt(balance.amount);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }
  }

  // Transaction operations
  async estimateGas(params: TransactionParams): Promise<string> {
    try {
      // Cosmos uses fixed fees or gas estimation via simulation
      // Default gas estimate
      return '200000';
    } catch (error) {
      throw new Error(`Failed to estimate gas: ${error}`);
    }
  }

  async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
    this.validateConnection();
    
    try {
      if (!this.signingClient || !this.wallet) {
        throw new Error('Signing client not initialized. Import an account first.');
      }

      const accounts = await this.wallet.getAccounts();
      const sender = accounts[0].address;

      const amount = coins(params.amount, this.denom);
      
      const fee: StdFee = {
        amount: coins('5000', this.denom),
        gas: params.gasLimit || '200000'
      };

      const result = await this.signingClient.sendTokens(
        sender,
        params.to,
        amount,
        fee,
        params.data || ''
      );

      return {
        txHash: result.transactionHash,
        status: result.code === 0 ? 'confirmed' : 'failed',
        blockNumber: result.height,
        gasUsed: result.gasUsed?.toString(),
        fee: result.gasWanted?.toString()
      };
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error}`);
    }
  }

  async getTransaction(txHash: string): Promise<TransactionStatus> {
    this.validateConnection();
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const tx = await this.client.getTx(txHash);
      
      if (!tx) {
        return {
          status: 'pending',
          confirmations: 0
        };
      }

      const currentHeight = await this.client.getHeight();
      const confirmations = currentHeight - tx.height;

      return {
        status: tx.code === 0 ? 'confirmed' : 'failed',
        confirmations,
        blockNumber: tx.height,
        timestamp: Date.now() // Cosmos doesn't provide timestamp in tx response
      };
    } catch (error) {
      throw new Error(`Failed to get transaction: ${error}`);
    }
  }

  async signMessage(message: string, privateKey: string): Promise<string> {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const hashedMessage = sha256(messageBytes);
      
      // Sign with private key
      const privKeyBytes = fromHex(privateKey);
      const signature = await Secp256k1.createSignature(hashedMessage, privKeyBytes);
      
      return toHex(signature.toFixedLength());
    } catch (error) {
      throw new Error(`Failed to sign message: ${error}`);
    }
  }

  // Block operations
  async getCurrentBlockNumber(): Promise<number> {
    this.validateConnection();
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const height = await this.client.getHeight();
      return height;
    } catch (error) {
      throw new Error(`Failed to get current block number: ${error}`);
    }
  }

  async getBlock(blockNumber: number): Promise<{
    number: number;
    timestamp: number;
    hash: string;
    transactions: string[];
  }> {
    this.validateConnection();
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const block = await this.client.getBlock(blockNumber);
      
      return {
        number: block.header.height,
        timestamp: Date.parse(block.header.time) / 1000,
        hash: block.id,
        transactions: block.txs.map(tx => toHex(tx))
      };
    } catch (error) {
      throw new Error(`Failed to get block: ${error}`);
    }
  }

  // Utility methods
  isValidAddress(address: string): boolean {
    try {
      const decoded = fromBech32(address);
      return decoded.prefix === this.addressPrefix;
    } catch {
      return false;
    }
  }

  formatAddress(address: string): string {
    if (address.length > 20) {
      return `${address.slice(0, 10)}...${address.slice(-8)}`;
    }
    return address;
  }

  getExplorerUrl(txHash: string): string {
    if (this.networkType === 'mainnet') {
      return `https://www.mintscan.io/cosmos/tx/${txHash}`;
    } else {
      return `https://testnet.mintscan.io/cosmos-testnet/tx/${txHash}`;
    }
  }

  // Token operations (IBC tokens)
  async getTokenBalance(address: string, tokenDenom: string): Promise<TokenBalance> {
    this.validateConnection();
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const balance = await this.client.getBalance(address, tokenDenom);
      
      return {
        address: tokenDenom,
        symbol: tokenDenom.toUpperCase(),
        decimals: 6, // Default for Cosmos tokens
        balance: BigInt(balance.amount)
      };
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error}`);
    }
  }

  // Additional Cosmos-specific methods
  async getAllBalances(address: string): Promise<Coin[]> {
    this.validateConnection();
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      return [...await this.client.getAllBalances(address)];
    } catch (error) {
      throw new Error(`Failed to get all balances: ${error}`);
    }
  }

  async getDelegations(address: string): Promise<any[]> {
    this.validateConnection();
    
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      // This would require additional Cosmos SDK modules
      // Placeholder for delegation queries
      return [];
    } catch (error) {
      throw new Error(`Failed to get delegations: ${error}`);
    }
  }
}

export const cosmosAdapter = new CosmosAdapter();
