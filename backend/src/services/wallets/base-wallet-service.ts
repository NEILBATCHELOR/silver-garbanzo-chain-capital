/**
 * Base Network Wallet Service
 * 
 * Provides wallet generation and management for Base Network (Ethereum L2)
 * using the Coinbase Developer Platform (CDP) SDK.
 * 
 * Features:
 * - Developer-managed wallet creation
 * - Coinbase-managed wallet creation (optional)
 * - Multi-network support (Base Mainnet & Base Sepolia)
 * - Integration with CDP SDK for enhanced features
 * - Wallet import/export capabilities
 * - Address validation
 * 
 * Chain IDs:
 * - Base Mainnet: 8453
 * - Base Sepolia Testnet: 84532
 */

import { Coinbase, Wallet } from '@coinbase/cdp-sdk';

export interface BaseWalletConfig {
  apiKeyName: string;
  apiKeyPrivateKey: string;
  network?: 'base-mainnet' | 'base-sepolia';
}

export interface BaseWalletResult {
  address: string;
  walletId?: string;
  networkId: string;
  seed?: string; // For developer-managed wallets
  privateKey?: string;
  mnemonic?: string;
}

export interface WalletImportOptions {
  seed: string;
  network?: 'base-mainnet' | 'base-sepolia';
}

/**
 * Base Wallet Service using Coinbase Developer Platform SDK
 */
export class BaseWalletService {
  private cdp: typeof Coinbase;
  private isConfigured: boolean = false;

  constructor(private config?: BaseWalletConfig) {
    this.cdp = Coinbase;
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the CDP SDK with API credentials
   */
  public configure(config: BaseWalletConfig): void {
    try {
      this.cdp.configure({
        apiKeyName: config.apiKeyName,
        privateKey: config.apiKeyPrivateKey
      });
      this.config = config;
      this.isConfigured = true;
    } catch (error) {
      throw new Error(`Failed to configure CDP SDK: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure CDP is configured before operations
   */
  private ensureConfigured(): void {
    if (!this.isConfigured || !this.config) {
      throw new Error('CDP SDK is not configured. Call configure() first.');
    }
  }

  /**
   * Create a new developer-managed wallet
   * Developer-managed wallets give you full control of the private keys
   * 
   * @param network Target network (defaults to base-sepolia for safety)
   * @returns Wallet creation result with address and seed
   */
  public async createDeveloperManagedWallet(
    network: 'base-mainnet' | 'base-sepolia' = 'base-sepolia'
  ): Promise<BaseWalletResult> {
    this.ensureConfigured();

    try {
      // Create a wallet on the specified network
      const wallet = await Wallet.create({ networkId: network });
      
      // Get the default address
      const address = await wallet.getDefaultAddress();
      
      // Export the wallet data (includes seed for backup)
      const walletData = wallet.export();

      return {
        address: address.toString(),
        walletId: wallet.getId(),
        networkId: network,
        seed: walletData.seed
      };
    } catch (error) {
      throw new Error(`Failed to create developer-managed wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Import an existing wallet from seed phrase
   * 
   * @param options Import options including seed and network
   * @returns Imported wallet result
   */
  public async importWallet(options: WalletImportOptions): Promise<BaseWalletResult> {
    this.ensureConfigured();

    try {
      const network = options.network || 'base-sepolia';
      
      // Import the wallet from seed
      const wallet = await Wallet.import({
        seed: options.seed,
        networkId: network
      });

      const address = await wallet.getDefaultAddress();

      return {
        address: address.toString(),
        walletId: wallet.getId(),
        networkId: network,
        seed: options.seed
      };
    } catch (error) {
      throw new Error(`Failed to import wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all wallets (paginated)
   * 
   * @param limit Maximum number of wallets to return
   * @param page Page number for pagination
   * @returns Array of wallet information
   */
  public async listWallets(limit: number = 20, page?: string): Promise<{
    wallets: Array<{
      id: string;
      networkId: string;
      defaultAddress: string;
    }>;
    hasMore: boolean;
    nextPage?: string;
  }> {
    this.ensureConfigured();

    try {
      const walletList = await Wallet.list({ limit, page });
      
      const wallets = await Promise.all(
        walletList.data.map(async (wallet) => ({
          id: wallet.getId(),
          networkId: wallet.getNetworkId(),
          defaultAddress: (await wallet.getDefaultAddress()).toString()
        }))
      );

      return {
        wallets,
        hasMore: walletList.hasMore,
        nextPage: walletList.nextPage
      };
    } catch (error) {
      throw new Error(`Failed to list wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get wallet by ID
   * 
   * @param walletId The wallet ID
   * @returns Wallet information
   */
  public async getWallet(walletId: string): Promise<{
    id: string;
    networkId: string;
    defaultAddress: string;
  }> {
    this.ensureConfigured();

    try {
      const wallet = await Wallet.fetch(walletId);
      const address = await wallet.getDefaultAddress();

      return {
        id: wallet.getId(),
        networkId: wallet.getNetworkId(),
        defaultAddress: address.toString()
      };
    } catch (error) {
      throw new Error(`Failed to get wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Request testnet funds from faucet (Base Sepolia only)
   * 
   * @param walletId The wallet ID to fund
   * @returns Transaction hash of the faucet transaction
   */
  public async requestFaucetFunds(walletId: string): Promise<string> {
    this.ensureConfigured();

    try {
      const wallet = await Wallet.fetch(walletId);
      
      // Faucet is only available on Base Sepolia
      if (wallet.getNetworkId() !== 'base-sepolia') {
        throw new Error('Faucet is only available on Base Sepolia testnet');
      }

      const faucetTx = await wallet.faucet();
      await faucetTx.wait();
      
      return faucetTx.getTransactionHash() || 'Transaction completed';
    } catch (error) {
      throw new Error(`Failed to request faucet funds: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get wallet balance
   * 
   * @param walletId The wallet ID
   * @param assetId Asset to check (default: 'eth')
   * @returns Balance as a string
   */
  public async getBalance(walletId: string, assetId: string = 'eth'): Promise<string> {
    this.ensureConfigured();

    try {
      const wallet = await Wallet.fetch(walletId);
      const balance = await wallet.getBalance(assetId);
      
      return balance.toString();
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate a Base address
   * 
   * @param address The address to validate
   * @returns True if valid, false otherwise
   */
  public validateAddress(address: string): boolean {
    // Base uses Ethereum address format (0x + 40 hex characters)
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    return addressRegex.test(address);
  }

  /**
   * Get chain configuration for Base networks
   * 
   * @param network The network
   * @returns Chain configuration
   */
  public static getChainConfig(network: 'base-mainnet' | 'base-sepolia' = 'base-mainnet'): {
    chainId: number;
    name: string;
    symbol: string;
    explorer: string;
    rpcUrl: string;
    networkId: string;
  } {
    if (network === 'base-mainnet') {
      return {
        chainId: 8453,
        name: 'Base Mainnet',
        symbol: 'ETH',
        explorer: 'https://basescan.org',
        rpcUrl: 'https://mainnet.base.org',
        networkId: 'base-mainnet'
      };
    } else {
      return {
        chainId: 84532,
        name: 'Base Sepolia Testnet',
        symbol: 'ETH',
        explorer: 'https://sepolia.basescan.org',
        rpcUrl: 'https://sepolia.base.org',
        networkId: 'base-sepolia'
      };
    }
  }
}

/**
 * Create a Base wallet service instance
 * 
 * @param config Optional configuration
 * @returns BaseWalletService instance
 */
export function createBaseWalletService(config?: BaseWalletConfig): BaseWalletService {
  return new BaseWalletService(config);
}
