/**
 * Cosmos Wallet Service
 * Handles account generation, import, validation, and comprehensive wallet operations for Cosmos SDK chains
 */

import { 
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  OfflineSigner
} from '@cosmjs/proto-signing';
import { 
  StargateClient,
  SigningStargateClient,
  GasPrice
} from '@cosmjs/stargate';
import { stringToPath } from '@cosmjs/crypto';
import { fromHex, toHex, fromBech32 } from '@cosmjs/encoding';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { COSMOS_CHAINS } from '../generators/CosmosWalletGenerator';

export interface CosmosAccountInfo {
  address: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string;
  balance?: string;
  prefix?: string;
  chainId?: string;
}

export interface CosmosGenerationOptions {
  includePrivateKey?: boolean;
  includeMnemonic?: boolean;
  prefix?: string;
  hdPath?: string;
  chainId?: string;
}

export interface CosmosEncryptedWallet {
  encryptedData: string;
  address: string;
  publicKey: string;
  prefix: string;
  chainId?: string;
}

export interface CosmosNetworkInfo {
  name: string;
  chainId: string;
  endpoint: string;
  isConnected: boolean;
  blockHeight?: number;
  prefix: string;
}

export class CosmosWalletService {
  private client?: StargateClient;
  private signingClient?: SigningStargateClient;
  private rpcUrl: string;
  private chainId: string;
  private prefix: string;
  private coinType: number;
  private denom: string;
  private gasPrice: GasPrice;

  constructor(
    chain: string = 'cosmos',
    customRpcUrl?: string
  ) {
    const config = COSMOS_CHAINS[chain] || COSMOS_CHAINS.cosmos;
    this.chainId = config.chainId;
    this.prefix = config.prefix;
    this.coinType = config.coinType;
    
    // Default RPC endpoints for common chains
    const defaultRpcs: { [key: string]: string } = {
      'cosmoshub-4': 'https://rpc.cosmos.network',
      'osmosis-1': 'https://rpc.osmosis.zone',
      'juno-1': 'https://rpc-juno.itastakers.com',
      'secret-4': 'https://rpc.secret.express',
      'akashnet-2': 'https://rpc.akash.forbole.com',
      'stride-1': 'https://stride-rpc.polkachu.com',
    };
    
    this.rpcUrl = customRpcUrl || defaultRpcs[config.chainId] || 'https://rpc.cosmos.network';
    
    // Default denoms for common chains
    const denoms: { [key: string]: string } = {
      'cosmoshub-4': 'uatom',
      'osmosis-1': 'uosmo',
      'juno-1': 'ujuno',
      'secret-4': 'uscrt',
      'akashnet-2': 'uakt',
      'stride-1': 'ustrd',
    };
    
    this.denom = denoms[config.chainId] || 'uatom';
    this.gasPrice = GasPrice.fromString(`0.025${this.denom}`);
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Connect to Cosmos network
   */
  async connect(): Promise<void> {
    try {
      this.client = await StargateClient.connect(this.rpcUrl);
    } catch (error) {
      throw new Error(`Failed to connect to Cosmos network: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get connection status and network information
   */
  async getNetworkInfo(): Promise<CosmosNetworkInfo> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      const chainId = await this.client!.getChainId();
      const height = await this.client!.getHeight();
      
      return {
        name: this.chainId,
        chainId: chainId,
        endpoint: this.rpcUrl,
        isConnected: true,
        blockHeight: height,
        prefix: this.prefix
      };
    } catch (error) {
      return {
        name: this.chainId,
        chainId: this.chainId,
        endpoint: this.rpcUrl,
        isConnected: false,
        prefix: this.prefix
      };
    }
  }

  /**
   * Update connection settings
   */
  async updateConnection(chain: string, customRpcUrl?: string): Promise<void> {
    const config = COSMOS_CHAINS[chain] || COSMOS_CHAINS.cosmos;
    this.chainId = config.chainId;
    this.prefix = config.prefix;
    this.coinType = config.coinType;
    this.rpcUrl = customRpcUrl || this.rpcUrl;
    
    // Reconnect with new settings
    await this.connect();
  }

  /**
   * Disconnect from network
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = undefined;
    }
    if (this.signingClient) {
      await this.signingClient.disconnect();
      this.signingClient = undefined;
    }
  }

  // ============================================================================
  // WALLET GENERATION
  // ============================================================================

  /**
   * Generate a new Cosmos account
   */
  async generateAccount(options: CosmosGenerationOptions = {}): Promise<CosmosAccountInfo> {
    try {
      const mnemonic = generateMnemonic();
      const hdPath = options.hdPath || `m/44'/${this.coinType}'/0'/0/0`;
      const prefix = options.prefix || this.prefix;
      
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: prefix,
        hdPaths: [stringToPath(hdPath)]
      });
      
      const [account] = await wallet.getAccounts();
      
      const result: CosmosAccountInfo = {
        address: account.address,
        publicKey: toHex(account.pubkey),
        prefix: prefix,
        mnemonic: mnemonic
      };

      // Note: DirectSecp256k1HdWallet doesn't expose private keys for security
      // Private key extraction is not available from HD wallets

      if (options.includeMnemonic) {
        result.mnemonic = mnemonic;
      }

      if (options.chainId) {
        result.chainId = options.chainId;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate Cosmos account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple Cosmos accounts at once
   */
  async generateMultipleAccounts(
    count: number,
    options: CosmosGenerationOptions = {}
  ): Promise<CosmosAccountInfo[]> {
    const accounts: CosmosAccountInfo[] = [];
    const mnemonic = generateMnemonic();
    const prefix = options.prefix || this.prefix;
    
    for (let i = 0; i < count; i++) {
      const hdPath = `m/44'/${this.coinType}'/${i}'/0/0`;
      
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: prefix,
        hdPaths: [stringToPath(hdPath)]
      });
      
      const [account] = await wallet.getAccounts();
      
      const accountInfo: CosmosAccountInfo = {
        address: account.address,
        publicKey: toHex(account.pubkey),
        prefix: prefix,
        mnemonic: mnemonic
      };

      // Note: DirectSecp256k1HdWallet doesn't expose private keys for security

      if (options.includeMnemonic && i === 0) {
        accountInfo.mnemonic = mnemonic; // Only include mnemonic for first account
      }

      accounts.push(accountInfo);
    }
    
    return accounts;
  }

  /**
   * Import an existing account using private key
   */
  async importAccount(privateKey: string, options: CosmosGenerationOptions = {}): Promise<CosmosAccountInfo> {
    try {
      const privKeyBytes = fromHex(privateKey.replace('0x', ''));
      const prefix = options.prefix || this.prefix;
      
      const wallet = await DirectSecp256k1Wallet.fromKey(privKeyBytes, prefix);
      const [account] = await wallet.getAccounts();
      
      const result: CosmosAccountInfo = {
        address: account.address,
        publicKey: toHex(account.pubkey),
        prefix: prefix
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey;
      }

      // Try to fetch balance
      try {
        if (!this.client) {
          await this.connect();
        }
        const balance = await this.client!.getBalance(account.address, this.denom);
        result.balance = (parseInt(balance.amount) / 1000000).toString(); // Convert from micro units
      } catch (balanceError) {
        console.warn(`Could not fetch balance for ${account.address}:`, balanceError);
        result.balance = '0';
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid Cosmos private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from private key (alias for consistency)
   */
  async fromPrivateKey(privateKey: string, options: CosmosGenerationOptions = {}): Promise<CosmosAccountInfo> {
    return this.importAccount(privateKey, options);
  }

  /**
   * Generate mnemonic phrase
   */
  generateMnemonic(): string {
    try {
      return generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from mnemonic phrase
   */
  async fromMnemonic(
    mnemonic: string,
    derivationIndex: number = 0,
    options: CosmosGenerationOptions = {}
  ): Promise<CosmosAccountInfo> {
    try {
      const hdPath = options.hdPath || `m/44'/${this.coinType}'/${derivationIndex}'/0/0`;
      const prefix = options.prefix || this.prefix;
      
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: prefix,
        hdPaths: [stringToPath(hdPath)]
      });
      
      const [account] = await wallet.getAccounts();
      
      const result: CosmosAccountInfo = {
        address: account.address,
        publicKey: toHex(account.pubkey),
        prefix: prefix
      };

      // Note: DirectSecp256k1HdWallet doesn't expose private keys for security

      if (options.includeMnemonic) {
        result.mnemonic = mnemonic;
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate HD wallets from mnemonic
   */
  async generateHDWallets(
    mnemonic: string,
    numWallets: number = 1,
    options: CosmosGenerationOptions = {}
  ): Promise<CosmosAccountInfo[]> {
    const wallets: CosmosAccountInfo[] = [];
    
    for (let i = 0; i < numWallets; i++) {
      const wallet = await this.fromMnemonic(mnemonic, i, {
        ...options,
        includeMnemonic: false
      });
      
      if (options.includeMnemonic && i === 0) {
        wallet.mnemonic = mnemonic;
      }
      
      wallets.push(wallet);
    }
    
    return wallets;
  }

  /**
   * Restore account from mnemonic
   */
  async restoreFromMnemonic(mnemonic: string, index: number = 0): Promise<CosmosAccountInfo> {
    try {
      return await this.fromMnemonic(mnemonic, index, {
        includePrivateKey: true,
        includeMnemonic: true
      });
    } catch (error) {
      throw new Error(`Failed to restore from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // WALLET ENCRYPTION
  // ============================================================================

  /**
   * Encrypt wallet for secure storage
   */
  async encryptWallet(
    account: CosmosAccountInfo,
    password: string
  ): Promise<CosmosEncryptedWallet> {
    try {
      if (!account.privateKey) {
        throw new Error('Private key required for encryption');
      }

      const data = {
        privateKey: account.privateKey,
        publicKey: account.publicKey,
        mnemonic: account.mnemonic,
        prefix: account.prefix || this.prefix,
        chainId: account.chainId || this.chainId
      };

      // Simplified encryption - in production use proper crypto
      const encryptedData = Buffer.from(JSON.stringify(data)).toString('base64');
      
      return {
        encryptedData,
        address: account.address,
        publicKey: account.publicKey,
        prefix: account.prefix || this.prefix,
        chainId: account.chainId
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt wallet from storage
   */
  async decryptWallet(
    encryptedWallet: CosmosEncryptedWallet,
    password: string
  ): Promise<CosmosAccountInfo> {
    try {
      // Simplified decryption - in production use proper crypto
      const dataString = Buffer.from(encryptedWallet.encryptedData, 'base64').toString();
      const data = JSON.parse(dataString);
      
      return {
        address: encryptedWallet.address,
        publicKey: encryptedWallet.publicKey,
        privateKey: data.privateKey,
        mnemonic: data.mnemonic,
        prefix: data.prefix,
        chainId: data.chainId
      };
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // VALIDATION AND UTILITY
  // ============================================================================

  /**
   * Validate Cosmos address
   */
  isValidAddress(address: string): boolean {
    try {
      const decoded = fromBech32(address);
      return decoded.prefix === this.prefix;
    } catch {
      return false;
    }
  }

  /**
   * Validate address for any prefix
   */
  static isValidCosmosAddress(address: string, prefix?: string): boolean {
    try {
      const decoded = fromBech32(address);
      if (prefix) {
        return decoded.prefix === prefix;
      }
      // Check if it's any known Cosmos prefix
      return Object.values(COSMOS_CHAINS).some(config => config.prefix === decoded.prefix);
    } catch {
      return false;
    }
  }

  /**
   * Validate private key
   */
  isValidPrivateKey(privateKey: string): boolean {
    try {
      const cleanKey = privateKey.replace('0x', '');
      if (cleanKey.length !== 64) { // 32 bytes in hex
        return false;
      }
      const privKeyBytes = fromHex(cleanKey);
      return privKeyBytes.length === 32;
    } catch {
      return false;
    }
  }

  /**
   * Validate mnemonic phrase
   */
  isValidMnemonic(mnemonic: string): boolean {
    try {
      return validateMnemonic(mnemonic);
    } catch {
      return false;
    }
  }

  // ============================================================================
  // NETWORK OPERATIONS
  // ============================================================================

  /**
   * Get account information from network
   */
  async getAccountInfo(address: string): Promise<CosmosAccountInfo | null> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Cosmos address format');
      }

      if (!this.client) {
        await this.connect();
      }

      const account = await this.client!.getAccount(address);
      if (!account) {
        return null; // Account doesn't exist
      }

      const balance = await this.client!.getBalance(address, this.denom);
      
      return {
        address: address,
        publicKey: account.pubkey ? toHex(account.pubkey.value) : '',
        balance: (parseInt(balance.amount) / 1000000).toString(),
        prefix: this.prefix,
        chainId: this.chainId
      };
    } catch (error) {
      console.error('Error fetching Cosmos account info:', error);
      return null;
    }
  }

  /**
   * Check if account exists on network
   */
  async accountExists(address: string): Promise<boolean> {
    try {
      if (!this.isValidAddress(address)) {
        return false;
      }
      
      if (!this.client) {
        await this.connect();
      }
      
      const account = await this.client!.getAccount(address);
      return account !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<string> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Cosmos address');
      }

      if (!this.client) {
        await this.connect();
      }

      const balance = await this.client!.getBalance(address, this.denom);
      return (parseInt(balance.amount) / 1000000).toString();
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
    }
  }

  /**
   * Get all balances for an address
   */
  async getAllBalances(address: string): Promise<Array<{ denom: string; amount: string }>> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Cosmos address');
      }

      if (!this.client) {
        await this.connect();
      }

      const balances = await this.client!.getAllBalances(address);
      return balances.map(coin => ({
        denom: coin.denom,
        amount: (parseInt(coin.amount) / 1000000).toString()
      }));
    } catch (error) {
      console.error('Error fetching all balances:', error);
      return [];
    }
  }

  /**
   * Get current block height
   */
  async getBlockHeight(): Promise<number> {
    try {
      if (!this.client) {
        await this.connect();
      }
      return await this.client!.getHeight();
    } catch (error) {
      throw new Error(`Failed to get block height: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Format address for display
   */
  formatAddress(address: string, show: number = 6): string {
    if (!this.isValidAddress(address)) {
      return address;
    }
    
    if (address.length <= show * 2 + 3) {
      return address;
    }
    
    return `${address.slice(0, this.prefix.length + show)}...${address.slice(-show)}`;
  }

  /**
   * Get explorer URL for address or transaction
   */
  getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' = 'address'): string {
    // Explorer URLs for common Cosmos chains
    const explorers: { [key: string]: string } = {
      'cosmoshub-4': 'https://www.mintscan.io/cosmos',
      'osmosis-1': 'https://www.mintscan.io/osmosis',
      'juno-1': 'https://www.mintscan.io/juno',
      'secret-4': 'https://www.mintscan.io/secret',
      'akashnet-2': 'https://www.mintscan.io/akash',
      'stride-1': 'https://www.mintscan.io/stride',
    };

    const explorerBase = explorers[this.chainId] || 'https://www.mintscan.io/cosmos';
    
    if (type === 'tx') {
      return `${explorerBase}/transactions/${hashOrAddress}`;
    }
    return `${explorerBase}/account/${hashOrAddress}`;
  }

  /**
   * Get wallet type identifier
   */
  getWalletType(): string {
    return `cosmos-${this.prefix}`;
  }

  /**
   * Get chain configuration
   */
  getChainConfig(): typeof COSMOS_CHAINS[string] | undefined {
    return Object.values(COSMOS_CHAINS).find(config => config.prefix === this.prefix);
  }

  /**
   * Get supported chains
   */
  static getSupportedChains(): string[] {
    return Object.keys(COSMOS_CHAINS);
  }

  /**
   * Convert amount from display unit to base unit (micro)
   */
  toMicroUnit(amount: string | number): string {
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    return Math.floor(amountNum * 1000000).toString();
  }

  /**
   * Convert amount from base unit (micro) to display unit
   */
  fromMicroUnit(amount: string | number): string {
    const amountNum = typeof amount === 'string' ? parseInt(amount) : amount;
    return (amountNum / 1000000).toString();
  }

  /**
   * Get native denom for the chain
   */
  getNativeDenom(): string {
    return this.denom;
  }

  /**
   * Get gas price for the chain
   */
  getGasPrice(): GasPrice {
    return this.gasPrice;
  }

  /**
   * Get signing client for transactions
   */
  async getSigningClient(signer: OfflineSigner): Promise<SigningStargateClient> {
    if (!this.signingClient) {
      this.signingClient = await SigningStargateClient.connectWithSigner(
        this.rpcUrl,
        signer,
        { gasPrice: this.gasPrice }
      );
    }
    return this.signingClient;
  }
}

// Export default instances for convenience
export const cosmosWalletService = new CosmosWalletService('cosmos');

export const osmosisWalletService = new CosmosWalletService('osmosis');

export const junoWalletService = new CosmosWalletService('juno');

// Export static methods for backward compatibility
export const CosmosWallet = {
  generateAccount: () => cosmosWalletService.generateAccount(),
  fromPrivateKey: (privateKey: string) => cosmosWalletService.fromPrivateKey(privateKey),
  fromMnemonic: (mnemonic: string) => cosmosWalletService.fromMnemonic(mnemonic),
  isValidAddress: (address: string) => cosmosWalletService.isValidAddress(address),
  isValidPrivateKey: (privateKey: string) => cosmosWalletService.isValidPrivateKey(privateKey)
};