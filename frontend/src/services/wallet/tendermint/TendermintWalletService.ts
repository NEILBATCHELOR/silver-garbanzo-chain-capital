/**
 * Tendermint Wallet Service
 * Handles account generation, import, validation, and wallet operations for Tendermint-based chains
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
import { generateMnemonic, validateMnemonic } from 'bip39';
import { TENDERMINT_CHAINS } from '../generators/TendermintWalletGenerator';

export interface TendermintAccountInfo {
  address: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string;
  balance?: string;
  prefix?: string;
  chainId?: string;
}

export interface TendermintGenerationOptions {
  includePrivateKey?: boolean;
  includeMnemonic?: boolean;
  prefix?: string;
  hdPath?: string;
  chainId?: string;
}

export interface TendermintEncryptedWallet {
  encryptedData: string;
  address: string;
  publicKey: string;
  prefix: string;
  chainId?: string;
}

export interface TendermintNetworkInfo {
  name: string;
  chainId: string;
  endpoint: string;
  isConnected: boolean;
  blockHeight?: number;
  prefix: string;
  consensusType: 'tendermint' | 'tendermint-bft';
}

export class TendermintWalletService {
  private client?: StargateClient;
  private signingClient?: SigningStargateClient;
  private rpcUrl: string;
  private chainId: string;
  private prefix: string;
  private coinType: number;
  private denom: string;
  private gasPrice: GasPrice;
  constructor(
    chain: string = 'tendermint',
    customRpcUrl?: string
  ) {
    const config = TENDERMINT_CHAINS[chain] || TENDERMINT_CHAINS.tendermint;
    this.chainId = config.chainId;
    this.prefix = config.prefix;
    this.coinType = config.coinType;
    
    // Default RPC endpoints for Tendermint chains
    const defaultRpcs: { [key: string]: string } = {
      'phoenix-1': 'https://terra-rpc.polkachu.com',
      'columbus-5': 'https://terra-classic-rpc.publicnode.com',
      'Binance-Chain-Tigris': 'https://dex.binance.org',
      'crypto-org-chain-mainnet-1': 'https://rpc.crypto.org',
      'thorchain-mainnet-v1': 'https://rpc.thorchain.info',
      'laozi-mainnet': 'https://rpc.bandchain.org',
      'irishub-1': 'https://rpc-iris.keplr.app',
      'axelar-dojo-1': 'https://axelar-rpc.quickapi.com',
      'stargaze-1': 'https://rpc.stargaze-apis.com',
      'agoric-3': 'https://main.rpc.agoric.net',
    };
    
    this.rpcUrl = customRpcUrl || defaultRpcs[config.chainId] || 'https://rpc.cosmos.network';
    
    // Default denoms for Tendermint chains
    const denoms: { [key: string]: string } = {
      'phoenix-1': 'uluna',
      'columbus-5': 'uluna',
      'Binance-Chain-Tigris': 'bnb',
      'crypto-org-chain-mainnet-1': 'basecro',
      'thorchain-mainnet-v1': 'rune',
      'laozi-mainnet': 'uband',
      'irishub-1': 'uiris',
      'axelar-dojo-1': 'uaxl',
      'stargaze-1': 'ustars',
      'agoric-3': 'ubld',
    };
    
    this.denom = denoms[config.chainId] || 'uatom';
    this.gasPrice = GasPrice.fromString(`0.025${this.denom}`);
  }
  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Connect to Tendermint network
   */
  async connect(): Promise<void> {
    try {
      this.client = await StargateClient.connect(this.rpcUrl);
    } catch (error) {
      throw new Error(`Failed to connect to Tendermint network: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get connection status and network information
   */
  async getNetworkInfo(): Promise<TendermintNetworkInfo> {
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
        prefix: this.prefix,
        consensusType: 'tendermint'
      };
    } catch (error) {
      return {
        name: this.chainId,
        chainId: this.chainId,
        endpoint: this.rpcUrl,
        isConnected: false,
        prefix: this.prefix,
        consensusType: 'tendermint'
      };
    }
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
   * Generate a new Tendermint account
   */
  async generateAccount(options: TendermintGenerationOptions = {}): Promise<TendermintAccountInfo> {
    try {
      const mnemonic = generateMnemonic();
      const hdPath = options.hdPath || `m/44'/${this.coinType}'/0'/0/0`;
      const prefix = options.prefix || this.prefix;
      
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: prefix,
        hdPaths: [stringToPath(hdPath)]
      });
      
      const [account] = await wallet.getAccounts();
      
      const result: TendermintAccountInfo = {
        address: account.address,
        publicKey: toHex(account.pubkey),
        prefix: prefix,
        mnemonic: mnemonic
      };

      // Note: DirectSecp256k1HdWallet doesn't expose private keys for security

      if (options.includeMnemonic) {
        result.mnemonic = mnemonic;
      }

      if (options.chainId) {
        result.chainId = options.chainId;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate Tendermint account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Import an existing account using private key
   */
  async importAccount(privateKey: string, options: TendermintGenerationOptions = {}): Promise<TendermintAccountInfo> {
    try {
      const privKeyBytes = fromHex(privateKey.replace('0x', ''));
      const prefix = options.prefix || this.prefix;
      
      const wallet = await DirectSecp256k1Wallet.fromKey(privKeyBytes, prefix);
      const [account] = await wallet.getAccounts();
      
      const result: TendermintAccountInfo = {
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
        result.balance = (parseInt(balance.amount) / 1000000).toString();
      } catch (balanceError) {
        console.warn(`Could not fetch balance for ${account.address}:`, balanceError);
        result.balance = '0';
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid Tendermint private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Create account from mnemonic phrase
   */
  async fromMnemonic(
    mnemonic: string,
    derivationIndex: number = 0,
    options: TendermintGenerationOptions = {}
  ): Promise<TendermintAccountInfo> {
    try {
      const hdPath = options.hdPath || `m/44'/${this.coinType}'/${derivationIndex}'/0/0`;
      const prefix = options.prefix || this.prefix;
      
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: prefix,
        hdPaths: [stringToPath(hdPath)]
      });
      
      const [account] = await wallet.getAccounts();
      
      const result: TendermintAccountInfo = {
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
  // ============================================================================
  // VALIDATION AND UTILITY
  // ============================================================================

  /**
   * Validate Tendermint address
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

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<string> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Tendermint address');
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
    // Explorer URLs for Tendermint chains
    const explorers: { [key: string]: string } = {
      'phoenix-1': 'https://finder.terra.money/mainnet',
      'columbus-5': 'https://finder.terra.money/classic',
      'crypto-org-chain-mainnet-1': 'https://crypto.org/explorer',
      'thorchain-mainnet-v1': 'https://runescan.io',
      'laozi-mainnet': 'https://cosmoscan.io',
      'axelar-dojo-1': 'https://axelarscan.io',
      'stargaze-1': 'https://www.mintscan.io/stargaze',
    };

    const explorerBase = explorers[this.chainId] || 'https://www.mintscan.io';
    
    if (type === 'tx') {
      return `${explorerBase}/tx/${hashOrAddress}`;
    }
    return `${explorerBase}/address/${hashOrAddress}`;
  }

  /**
   * Get wallet type identifier
   */
  getWalletType(): string {
    return `tendermint-${this.prefix}`;
  }

  /**
   * Get chain configuration
   */
  getChainConfig(): typeof TENDERMINT_CHAINS[string] | undefined {
    return Object.values(TENDERMINT_CHAINS).find(config => config.prefix === this.prefix);
  }

  /**
   * Get supported chains
   */
  static getSupportedChains(): string[] {
    return Object.keys(TENDERMINT_CHAINS);
  }

  /**
   * Check if a chain uses Tendermint consensus
   */
  static isTendermintChain(chainId: string): boolean {
    return Object.values(TENDERMINT_CHAINS).some(config => config.chainId === chainId);
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
}

// Export default instances for convenience
export const tendermintWalletService = new TendermintWalletService('tendermint');

export const terraWalletService = new TendermintWalletService('terra');

export const thorchainWalletService = new TendermintWalletService('thorchain');

export const axelarWalletService = new TendermintWalletService('axelar');

// Export static methods for backward compatibility
export const TendermintWallet = {
  generateAccount: () => tendermintWalletService.generateAccount(),
  fromPrivateKey: (privateKey: string) => tendermintWalletService.importAccount(privateKey),
  fromMnemonic: (mnemonic: string) => tendermintWalletService.fromMnemonic(mnemonic),
  isValidAddress: (address: string) => tendermintWalletService.isValidAddress(address),
  isValidPrivateKey: (privateKey: string) => tendermintWalletService.isValidPrivateKey(privateKey),
  isTendermintChain: TendermintWalletService.isTendermintChain
};