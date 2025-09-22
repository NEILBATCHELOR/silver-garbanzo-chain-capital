/**
 * Aptos Adapter Implementation
 * 
 * Aptos-specific adapter implementing account-based model with AptosWalletService integration
 * Supports mainnet, testnet, and devnet networks
 */

import { Account, Aptos, AptosConfig, Ed25519PrivateKey, Network } from "@aptos-labs/ts-sdk";
import type {
  IBlockchainAdapter,
  NetworkType,
  TransactionParams,
  TransactionResult,
  TransactionStatus,
  AccountInfo,
  TokenBalance,
  ConnectionConfig,
  HealthStatus
} from './IBlockchainAdapter';
import { BaseBlockchainAdapter } from './IBlockchainAdapter';
import { aptosWalletService } from '@/services/wallet/aptos';

export class AptosAdapter extends BaseBlockchainAdapter {
  private client: Aptos;
  private walletService = aptosWalletService;
  private network: string;

  readonly chainId: string;
  readonly chainName = 'aptos';
  readonly networkType: NetworkType;
  readonly nativeCurrency = {
    name: 'Aptos',
    symbol: 'APT',
    decimals: 8
  };

  constructor(networkType: NetworkType = 'mainnet') {
    super();
    this.networkType = networkType;
    
    // Map network types to Aptos networks
    const networkMap = {
      mainnet: Network.MAINNET,
      testnet: Network.TESTNET,
      devnet: Network.DEVNET
    };

    const aptosNetwork = networkMap[networkType as keyof typeof networkMap];
    if (!aptosNetwork) {
      throw new Error(`Unsupported Aptos network: ${networkType}`);
    }

    this.chainId = `aptos-${networkType}`;
    this.network = networkType;
    
    const config = new AptosConfig({ 
      network: aptosNetwork 
    });
    this.client = new Aptos(config);
  }

  // Connection management
  async connect(config: ConnectionConfig): Promise<void> {
    try {
      this.config = config;
      
      // Test connection with a simple request
      await this.client.getLedgerInfo();
      
      this._isConnected = true;
      console.log(`Connected to Aptos ${this.networkType}`);
    } catch (error) {
      this._isConnected = false;
      throw new Error(`Failed to connect to Aptos: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
    console.log(`Disconnected from Aptos ${this.networkType}`);
  }

  async getHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const ledgerInfo = await this.client.getLedgerInfo();
      const latency = Date.now() - startTime;
      
      return {
        isHealthy: true,
        latency,
        blockHeight: Number(ledgerInfo.block_height),
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

  // Account operations with wallet service integration
  async generateAccount(): Promise<AccountInfo> {
    this.validateConnection();
    
    // Use wallet service for sophisticated account generation
    const walletAccount = this.walletService.generateAccount({
      includePrivateKey: false // Adapter doesn't need private key for security
    });
    
    // Adapter adds blockchain-specific data
    const balance = await this.getBalance(walletAccount.address);
    
    return {
      address: walletAccount.address,
      balance,
      publicKey: walletAccount.publicKey
    };
  }

  async importAccount(privateKey: string): Promise<AccountInfo> {
    this.validateConnection();
    
    try {
      // Use wallet service for sophisticated import with error handling
      const walletAccount = await this.walletService.importAccount(privateKey, {
        includePrivateKey: false // Security: adapter doesn't store private keys
      });
      
      // Adapter adds blockchain-specific data
      const balance = await this.getBalance(walletAccount.address);
      
      return {
        address: walletAccount.address,
        balance,
        publicKey: walletAccount.publicKey
      };
    } catch (error) {
      throw new Error(`Aptos import failed: ${error}`);
    }
  }

  // Enhanced wallet service features
  async generateHDAccount(mnemonic: string, index: number): Promise<AccountInfo> {
    this.validateConnection();
    
    const walletAccount = this.walletService.fromMnemonic(mnemonic, index, {
      includePrivateKey: false
    });
    
    const balance = await this.getBalance(walletAccount.address);
    
    return {
      address: walletAccount.address,
      balance,
      publicKey: walletAccount.publicKey
    };
  }

  async generateMultipleAccounts(count: number): Promise<AccountInfo[]> {
    this.validateConnection();
    
    const walletAccounts = this.walletService.generateMultipleAccounts(count, {
      includePrivateKey: false
    });
    
    return Promise.all(walletAccounts.map(async (account) => ({
      address: account.address,
      balance: await this.getBalance(account.address),
      publicKey: account.publicKey
    })));
  }

  isValidWalletAccount(account: unknown): boolean {
    return this.walletService.isValidAddress((account as any)?.address) && 
           this.isValidAddress((account as any)?.address);
  }

  generateMnemonic(): string {
    return this.walletService.generateMnemonic();
  }

  async getAccount(address: string): Promise<AccountInfo> {
    this.validateConnection();
    
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid Aptos address: ${address}`);
    }

    const balance = await this.getBalance(address);
    return { 
      address, 
      balance 
    };
  }

  // Transaction operations - basic implementations
  async estimateGas(params: any): Promise<string> {
    return '1000'; // TODO: Implement gas estimation
  }

  async sendTransaction(params: any): Promise<any> {
    // TODO: Implement transaction sending
    throw new Error('Not implemented');
  }

  async getTransaction(txHash: string): Promise<any> {
    // TODO: Implement transaction retrieval
    throw new Error('Not implemented');
  }

  async signMessage(message: string, privateKey: string): Promise<string> {
    try {
      // Create account from private key
      const cleanPrivateKey = privateKey.replace(/^0x/i, '');
      const privKey = new Ed25519PrivateKey(cleanPrivateKey);
      const account = Account.fromPrivateKey({ privateKey: privKey });
      
      // Sign the message
      const messageBytes = new TextEncoder().encode(message);
      const signature = account.sign(messageBytes);
      
      return signature.toString();
    } catch (error) {
      throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Block operations - basic implementations
  async getCurrentBlockNumber(): Promise<number> {
    // TODO: Implement block number retrieval
    return 0;
  }

  async getBlock(blockNumber: number): Promise<any> {
    // TODO: Implement block retrieval
    throw new Error('Not implemented');
  }

  // Utility methods - basic implementations
  formatAddress(address: string): string {
    return address; // TODO: Implement address formatting
  }

  getExplorerUrl(txHash: string): string {
    return `https://explorer.aptoslabs.com/txn/${txHash}`;
  }

  getChainName(): string {
    return "aptos";
  }

  getChainId(): number {
    return 0; // Aptos doesn't use chain IDs in the same way as EVM chains
  }

  async generateAddress(publicKey: string): Promise<string> {
    try {
      // Remove 0x prefix if present and ensure proper length
      const cleanPubKey = publicKey.replace(/^0x/i, '');
      
      // Aptos addresses are derived from public keys differently
      // For now, we'll use the public key as the basis for the address
      // In practice, you'd create an Account from the public key
      const address = `0x${cleanPubKey.substring(0, 64).padStart(64, '0')}`;
      return address;
    } catch (error) {
      throw new Error(`Failed to generate Aptos address: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createMultiSigWallet(
    owners: string[],
    threshold: number,
  ): Promise<string> {
    try {
      // Aptos multisig implementation would require deploying a multisig module
      // For now, we'll create a deterministic address based on owners and threshold
      const combinedData = owners.join('') + threshold.toString();
      const hash = require('crypto').createHash('sha256').update(combinedData).digest('hex');
      return `0x${hash.substring(0, 64)}`;
    } catch (error) {
      throw new Error(`Failed to create Aptos multisig wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getBalance(address: string): Promise<bigint> {
    try {
      const resources = await this.client.getAccountResources({ accountAddress: address });
      
      // Find the APT coin resource
      const coinResource = resources.find(r => 
        r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );
      
      if (!coinResource) {
        return BigInt(0);
      }
      
      const coinData = coinResource.data as any;
      const balance = BigInt(coinData.coin.value);
      
      return balance; // Return balance in Octas (smallest unit)
    } catch (error) {
      console.error('Error getting Aptos balance:', error);
      return BigInt(0);
    }
  }

  async getTokenBalance(
    address: string,
    tokenAddress: string,
  ): Promise<TokenBalance> {
    try {
      const resources = await this.client.getAccountResources({ accountAddress: address });
      
      // Find the specific coin resource
      const coinResource = resources.find(r => 
        r.type === `0x1::coin::CoinStore<${tokenAddress}>`
      );
      
      if (!coinResource) {
        return {
          address: tokenAddress,
          symbol: 'UNKNOWN',
          decimals: 8,
          balance: BigInt(0)
        };
      }
      
      const coinData = coinResource.data as any;
      const balance = BigInt(coinData.coin.value);
      
      return {
        address: tokenAddress,
        symbol: 'TOKEN', // Would need to fetch from token metadata
        decimals: 8, // Would need to fetch from token metadata
        balance
      };
    } catch (error) {
      console.error('Error getting Aptos token balance:', error);
      return {
        address: tokenAddress,
        symbol: 'ERROR',
        decimals: 8,
        balance: BigInt(0)
      };
    }
  }

  async proposeTransaction(
    walletAddress: string,
    to: string,
    value: string,
    data: string = "",
  ): Promise<string> {
    try {
      // Convert APT to Octas
      const amountInOctas = Math.floor(parseFloat(value) * 100000000);
      
      // Build a transfer transaction
      const transaction = await this.client.transaction.build.simple({
        sender: walletAddress,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [to, amountInOctas],
        },
      });
      
      // Return the transaction hash for later signing
      const serializedTx = Buffer.from(transaction.bcsToBytes()).toString('hex');
      return serializedTx;
    } catch (error) {
      throw new Error(`Failed to propose Aptos transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async signTransaction(
    transactionString: string,
    privateKey: string,
  ): Promise<string> {
    try {
      // Create account from private key
      const cleanPrivateKey = privateKey.replace(/^0x/i, '');
      const privKey = new Ed25519PrivateKey(cleanPrivateKey);
      const account = Account.fromPrivateKey({ privateKey: privKey });
      
      // Deserialize the transaction
      const txBytes = new Uint8Array(Buffer.from(transactionString, 'hex'));
      
      // Sign the transaction
      const signature = account.sign(txBytes);
      
      return signature.toString();
    } catch (error) {
      throw new Error(`Failed to sign Aptos transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async executeTransaction(
    walletAddress: string,
    signedTransactionString: string,
    signatures: string[],
  ): Promise<string> {
    try {
      // For a complete implementation, we would need to submit the signed transaction
      // This would involve reconstructing the signed transaction and submitting it
      
      // For now, return a mock transaction hash
      // In practice, you'd use this.client.transaction.submit()
      const mockTxHash = `0x${require('crypto').createHash('sha256').update(signedTransactionString).digest('hex')}`;
      
      return mockTxHash;
    } catch (error) {
      throw new Error(`Failed to execute Aptos transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isValidAddress(address: string): boolean {
    try {
      // Aptos addresses should be 32 bytes (64 hex chars) plus 0x prefix
      if (!address.startsWith("0x") || address.length !== 66) {
        return false;
      }
      
      // Check if it's valid hex
      const hex = address.slice(2);
      return /^[0-9a-fA-F]{64}$/.test(hex);
    } catch (error) {
      return false;
    }
  }
}