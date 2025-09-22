/**
 * Ripple (XRP) Adapter Implementation
 * 
 * Ripple-specific adapter implementing the established pattern of delegating
 * wallet operations to RippleWalletService while handling blockchain protocol operations
 * Supports mainnet and testnet networks
 */

import * as xrpl from 'xrpl';
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
} from './IBlockchainAdapter';
import { BaseBlockchainAdapter } from './IBlockchainAdapter';
import { 
  rippleWalletService, 
  rippleTestnetWalletService,
  type RippleAccountInfo,
  type RippleGenerationOptions 
} from '@/services/wallet/ripple';

// Ripple-specific types
interface RippleTrustLine {
  account: string;
  balance: string;
  currency: string;
  limit: string;
  limit_peer: string;
  quality_in: number;
  quality_out: number;
}

interface RipplePaymentTransaction {
  Account: string;
  Destination: string;
  Amount: string | {
    currency: string;
    issuer: string;
    value: string;
  };
  Fee: string;
  Flags: number;
  Sequence: number;
  TransactionType: string;
}

export class RippleAdapter extends BaseBlockchainAdapter {
  private client: xrpl.Client;
  private server: string;
  private walletService: typeof rippleWalletService;

  readonly chainId: string;
  readonly chainName = 'ripple';
  readonly networkType: NetworkType;
  readonly nativeCurrency = {
    name: 'XRP',
    symbol: 'XRP',
    decimals: 6
  };

  constructor(networkType: NetworkType = 'mainnet') {
    super();
    this.networkType = networkType;
    this.chainId = `ripple-${networkType}`;
    
    // Set server based on network type
    if (networkType === 'testnet') {
      this.server = 'wss://s.altnet.rippletest.net:51233';
      this.walletService = rippleTestnetWalletService;
    } else {
      this.server = 'wss://s1.ripple.com';
      this.walletService = rippleWalletService;
    }

    this.client = new xrpl.Client(this.server);
  }

  // ============================================================================
  // CONNECTION MANAGEMENT (Blockchain Protocol Operations)
  // ============================================================================

  async connect(config: ConnectionConfig): Promise<void> {
    try {
      this.config = config;
      
      // Use provided RPC URL or default server
      if (config.rpcUrl) {
        this.server = config.rpcUrl;
        this.client = new xrpl.Client(this.server);
      }

      if (this.client.isConnected()) {
        return;
      }

      await this.client.connect();
      
      if (!this.client.isConnected()) {
        throw new Error('Failed to establish connection to Ripple network');
      }

      this._isConnected = true;
      console.log(`Connected to Ripple ${this.networkType}`);
    } catch (error) {
      this._isConnected = false;
      throw new Error(`Failed to connect to Ripple: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client.isConnected()) {
        await this.client.disconnect();
      }
      this._isConnected = false;
      console.log('Disconnected from Ripple');
    } catch (error) {
      console.warn('Error during Ripple disconnect:', error);
    }
  }

  async getHealth(): Promise<HealthStatus> {
    if (!this.client.isConnected()) {
      return {
        isHealthy: false,
        latency: -1,
        lastChecked: Date.now()
      };
    }

    const startTime = Date.now();
    try {
      const response = await this.client.request({
        command: 'server_info'
      });
      
      const latency = Date.now() - startTime;
      const blockHeight = response.result.info?.complete_ledgers ? 
        parseInt(response.result.info.complete_ledgers.split('-')[1]) : undefined;
      
      return {
        isHealthy: true,
        latency,
        blockHeight,
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

  // ============================================================================
  // ACCOUNT OPERATIONS (Delegated to Wallet Service)
  // ============================================================================

  async generateAccount(): Promise<AdapterAccountInfo> {
    this.validateConnection();
    
    // Use wallet service for sophisticated account generation
    const walletAccount = this.walletService.generateAccount({
      includePrivateKey: false, // Security: adapter doesn't store private keys
      includeSeed: false
    });
    
    // Adapter adds blockchain-specific data
    const balance = await this.getBalance(walletAccount.address);
    
    return {
      address: walletAccount.address,
      balance,
      publicKey: walletAccount.publicKey
    };
  }

  async importAccount(privateKeyOrSeed: string): Promise<AdapterAccountInfo> {
    this.validateConnection();
    
    try {
      // Use wallet service for sophisticated import with error handling
      let walletAccount: RippleAccountInfo;
      
      // Try importing as seed first, then as private key
      if (this.walletService.isValidSeed(privateKeyOrSeed)) {
        walletAccount = await this.walletService.importAccount(privateKeyOrSeed, {
          includePrivateKey: false, // Security: adapter doesn't store private keys
          includeSeed: false
        });
      } else if (this.walletService.isValidPrivateKey(privateKeyOrSeed)) {
        walletAccount = await this.walletService.importFromPrivateKey(privateKeyOrSeed, {
          includePrivateKey: false,
          includeSeed: false
        });
      } else {
        throw new Error('Invalid seed or private key format');
      }
      
      // Adapter adds blockchain-specific data
      const balance = await this.getBalance(walletAccount.address);
      
      return {
        address: walletAccount.address,
        balance: BigInt(Math.floor(parseFloat(walletAccount.balance || '0') * 1000000)), // Convert XRP to drops
        publicKey: walletAccount.publicKey
      };
    } catch (error) {
      throw new Error(`Ripple import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Enhanced features using Wallet Service
  async generateHDAccount(mnemonic: string, index: number = 0): Promise<AdapterAccountInfo> {
    this.validateConnection();
    
    const walletAccount = this.walletService.restoreFromMnemonic(mnemonic, index);
    const balance = await this.getBalance(walletAccount.address);
    
    return {
      address: walletAccount.address,
      balance,
      publicKey: walletAccount.publicKey
    };
  }

  async generateMultipleAccounts(count: number): Promise<AdapterAccountInfo[]> {
    this.validateConnection();
    
    const walletAccounts = this.walletService.generateMultipleAccounts(count, {
      includePrivateKey: false,
      includeSeed: false
    });
    
    return Promise.all(walletAccounts.map(async (account) => ({
      address: account.address,
      balance: await this.getBalance(account.address),
      publicKey: account.publicKey
    })));
  }

  generateMnemonic(): string {
    return this.walletService.generateMnemonic();
  }

  // Enhanced validation using wallet service
  isValidWalletAccount(account: unknown): boolean {
    return this.walletService.isValidAddress((account as any)?.address) && 
           this.isValidAddress((account as any)?.address);
  }

  async getAccount(address: string): Promise<AdapterAccountInfo> {
    this.validateConnection();
    
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid Ripple address: ${address}`);
    }

    const balance = await this.getBalance(address);
    
    return {
      address,
      balance
    };
  }

  async getBalance(address: string): Promise<bigint> {
    this.validateConnection();
    
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid Ripple address: ${address}`);
    }

    try {
      const response = await this.client.request({
        command: 'account_info',
        account: address
      });
      
      if (response.result.account_data) {
        // Return balance in drops (1 XRP = 1,000,000 drops)
        return BigInt(response.result.account_data.Balance);
      }
      
      return BigInt(0);
    } catch (error) {
      // Account might not exist on network
      if (error instanceof Error && error.message.includes('Account not found')) {
        return BigInt(0);
      }
      throw new Error(`Failed to get Ripple balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // TRANSACTION OPERATIONS (Blockchain Protocol Operations)
  // ============================================================================

  async estimateGas(params: TransactionParams): Promise<string> {
    this.validateConnection();
    
    try {
      // Get current base fee from server
      const response = await this.client.request({
        command: 'server_info'
      });
      
      // Default fee if unable to get from server
      let baseFee = '12'; // 12 drops default
      
      if (response.result.info?.validated_ledger?.base_fee_xrp) {
        baseFee = response.result.info.validated_ledger.base_fee_xrp.toString();
      }
      
      // Token transfers may require higher fees due to trust line operations
      if (params.tokenAddress) {
        return (parseInt(baseFee) * 2).toString(); // Double fee for token operations
      }
      
      return baseFee;
    } catch (error) {
      // Return default fee if unable to estimate
      return '12'; // 12 drops default fee
    }
  }

  async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
    this.validateConnection();
    
    // Note: This is a simplified implementation
    // In production, transaction signing requires private key management
    throw new Error('Ripple transaction sending requires proper signing - implement with RippleWalletManager');
  }

  async getTransaction(txHash: string): Promise<TransactionStatus> {
    this.validateConnection();
    
    try {
      const response = await this.client.request({
        command: 'tx',
        transaction: txHash
      });
      
      if (response.result) {
        const tx = response.result;
        
        // Get ledger info for confirmation count
        let confirmations = 0;
        if (tx.ledger_index) {
          const currentLedgerResponse = await this.client.request({
            command: 'ledger_current'
          });
          confirmations = currentLedgerResponse.result.ledger_current_index - tx.ledger_index;
        }
        
        const status = (tx.meta as any)?.TransactionResult === 'tesSUCCESS' ? 'confirmed' : 'failed';
        
        return {
          status,
          confirmations,
          blockNumber: tx.ledger_index,
          timestamp: tx.date ? tx.date + 946684800 : undefined // Ripple epoch to Unix timestamp
        };
      }
      
      return {
        status: 'pending',
        confirmations: 0
      };
    } catch (error) {
      // Transaction might be pending
      return {
        status: 'pending',
        confirmations: 0
      };
    }
  }

  async signMessage(message: string, privateKey: string): Promise<string> {
    try {
      const wallet = new xrpl.Wallet(null, privateKey);
      // Ripple uses a specific signing scheme
      const messageBytes = Buffer.from(message, 'utf8');
      // This is simplified - in production use proper XRPL signing
      return Buffer.from(wallet.privateKey + message).toString('hex');
    } catch (error) {
      throw new Error(`Ripple message signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // TOKEN OPERATIONS (Blockchain Protocol Operations)
  // ============================================================================

  async getTokenBalance(address: string, tokenAddress: string): Promise<TokenBalance> {
    this.validateConnection();
    
    if (!this.isValidAddress(address)) {
      throw new Error('Invalid address provided');
    }

    try {
      // In Ripple, tokens are represented as trust lines
      // tokenAddress format: "currency.issuer" (e.g., "USD.rAccountAddress")
      const [currency, issuer] = tokenAddress.split('.');
      
      if (!currency || !issuer || !this.isValidAddress(issuer)) {
        throw new Error('Invalid token address format. Expected: currency.issuer');
      }

      const response = await this.client.request({
        command: 'account_lines',
        account: address
      });

      const trustLine = response.result.lines?.find(
        (line: any) => line.currency === currency && line.account === issuer
      );

      if (trustLine) {
        return {
          address: tokenAddress,
          symbol: currency,
          decimals: 6, // Most Ripple tokens use 6 decimal places
          balance: BigInt(Math.floor(parseFloat(trustLine.balance) * 1000000)) // Convert to micro-units
        };
      }

      return {
        address: tokenAddress,
        symbol: currency,
        decimals: 6,
        balance: BigInt(0)
      };
    } catch (error) {
      throw new Error(`Failed to get Ripple token balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
  }> {
    this.validateConnection();
    
    try {
      const [currency, issuer] = tokenAddress.split('.');
      
      if (!currency || !issuer || !this.isValidAddress(issuer)) {
        throw new Error('Invalid token address format. Expected: currency.issuer');
      }

      // Get issuer account info
      const response = await this.client.request({
        command: 'account_info',
        account: issuer
      });

      return {
        name: `${currency} Token`,
        symbol: currency,
        decimals: 6,
        totalSupply: BigInt(0) // Total supply is not directly available in Ripple
      };
    } catch (error) {
      throw new Error(`Failed to get Ripple token info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // BLOCK OPERATIONS (Blockchain Protocol Operations)
  // ============================================================================

  async getCurrentBlockNumber(): Promise<number> {
    this.validateConnection();
    
    try {
      const response = await this.client.request({
        command: 'ledger_current'
      });
      return response.result.ledger_current_index;
    } catch (error) {
      throw new Error(`Failed to get current ledger: ${error instanceof Error ? error.message : String(error)}`);
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
      const response = await this.client.request({
        command: 'ledger',
        ledger_index: blockNumber,
        transactions: true
      });

      const ledger = response.result.ledger;
      
      return {
        number: blockNumber,
        timestamp: ledger.close_time ? ledger.close_time + 946684800 : 0, // Ripple epoch to Unix
        hash: ledger.ledger_hash,
        transactions: ledger.transactions || []
      };
    } catch (error) {
      throw new Error(`Failed to get Ripple ledger: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS (Enhanced with Wallet Service)
  // ============================================================================

  isValidAddress(address: string): boolean {
    return this.walletService.isValidAddress(address);
  }

  formatAddress(address: string): string {
    return this.walletService.formatAddress(address);
  }

  getExplorerUrl(txHash: string): string {
    return this.walletService.getExplorerUrl(txHash, 'tx');
  }

  // ============================================================================
  // RIPPLE-SPECIFIC METHODS (Blockchain Protocol Operations)
  // ============================================================================

  /**
   * Get trust lines for an account (Ripple-specific token balances)
   */
  async getTrustLines(address: string): Promise<RippleTrustLine[]> {
    this.validateConnection();
    
    if (!this.isValidAddress(address)) {
      throw new Error('Invalid Ripple address');
    }

    try {
      const response = await this.client.request({
        command: 'account_lines',
        account: address
      });

      return response.result.lines || [];
    } catch (error) {
      throw new Error(`Failed to get trust lines: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get account reserve requirements
   */
  async getAccountReserve(): Promise<{ base: number; owner: number }> {
    this.validateConnection();
    
    try {
      const response = await this.client.request({
        command: 'server_state'
      });

      return {
        base: response.result.state?.validated_ledger?.reserve_base || 20,
        owner: response.result.state?.validated_ledger?.reserve_inc || 5
      };
    } catch (error) {
      return { base: 20, owner: 5 }; // Default values
    }
  }

  /**
   * Check if account requires activation
   */
  async requiresActivation(address: string): Promise<boolean> {
    try {
      const balance = await this.getBalance(address);
      return balance === BigInt(0);
    } catch (error) {
      return true; // Assume activation required if we can't check
    }
  }

  /**
   * Create a simple XRP payment transaction (unsigned)
   */
  async preparePayment(
    fromAddress: string,
    toAddress: string,
    amount: string, // in drops or XRP
    fee?: string
  ): Promise<RipplePaymentTransaction> {
    this.validateConnection();
    
    if (!this.isValidAddress(fromAddress) || !this.isValidAddress(toAddress)) {
      throw new Error('Invalid Ripple address');
    }

    try {
      const accountInfo = await this.client.request({
        command: 'account_info',
        account: fromAddress
      });

      const sequence = accountInfo.result.account_data.Sequence;
      
      return {
        Account: fromAddress,
        Destination: toAddress,
        Amount: amount.includes('.') ? xrpl.xrpToDrops(amount) : amount,
        Fee: fee || await this.estimateGas({ to: toAddress, amount }),
        Flags: 0,
        Sequence: sequence,
        TransactionType: 'Payment'
      };
    } catch (error) {
      throw new Error(`Failed to prepare payment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert XRP to drops
   */
  xrpToDrops(xrp: string | number): string {
    return xrpl.xrpToDrops(xrp);
  }

  /**
   * Convert drops to XRP
   */
  dropsToXrp(drops: string | number): string {
    return xrpl.dropsToXrp(drops).toString();
  }

  /**
   * Get network type for wallet service selection
   */
  getNetworkType(): NetworkType {
    return this.networkType;
  }
}