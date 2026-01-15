import { Client, Wallet, Transaction, TrustSet, Payment, AccountSet, AccountLinesTrustline } from 'xrpl';
import { xrplClientManager } from '../core/XRPLClientManager';
import { XRPLNetwork } from '../config/XRPLConfig';

/**
 * Token issuance configuration
 */
export interface TokenIssuanceConfig {
  currencyCode: string;
  totalSupply?: string;
  transferRate?: number;
  tickSize?: number;
  domain?: string;
  requireAuth?: boolean;
  requireDestTag?: boolean;
  disallowXRP?: boolean;
  defaultRipple?: boolean;
}

/**
 * Trust line parameters
 */
export interface TrustLineParams {
  holderWallet: Wallet;
  issuerAddress: string;
  currencyCode: string;
  limit: string;
}

/**
 * Trust line information
 */
export interface TrustLineInfo {
  currency: string;
  issuer: string;
  balance: string;
  limit: string;
  limitPeer: string;
  qualityIn: number;
  qualityOut: number;
  noRipple: boolean;
  noRipplePeer: boolean;
  authorized: boolean;
  peerAuthorized: boolean;
  freeze: boolean;
  freezePeer: boolean;
}

/**
 * XRPL Trust Line Token Service
 * 
 * Handles legacy fungible token operations using trust lines.
 * This is the traditional XRPL token standard.
 * 
 * Based on: xrpl-dev-portal _code-samples/issue-a-token/
 */
export class XRPLTrustLineService {
  private client: Client | null = null;
  private network: XRPLNetwork;

  constructor(network: XRPLNetwork = 'TESTNET') {
    this.network = network;
  }

  /**
   * Initialize client connection
   */
  private async getClient(): Promise<Client> {
    if (!this.client || !this.client.isConnected()) {
      this.client = await xrplClientManager.getClient(this.network);
    }
    return this.client;
  }

  /**
   * Configure issuer account (cold wallet) for token issuance
   */
  async configureIssuerAccount(
    issuerWallet: Wallet,
    config: TokenIssuanceConfig
  ): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      let flags = 0;
      if (config.requireDestTag) {
        flags |= 0x00000001; // tfRequireDestTag
      }
      if (config.disallowXRP) {
        flags |= 0x00000008; // tfDisallowXRP
      }

      const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: issuerWallet.address,
        TransferRate: config.transferRate,
        TickSize: config.tickSize,
        Domain: config.domain ? Buffer.from(config.domain).toString('hex') : undefined,
        SetFlag: config.defaultRipple ? 8 : undefined, // asfDefaultRipple
        Flags: flags
      };

      const response = await client.submitAndWait(tx, {
        wallet: issuerWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Account configuration failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to configure issuer account: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Configure hot wallet for operational token management
   */
  async configureHotWallet(
    hotWallet: Wallet,
    config: TokenIssuanceConfig
  ): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      let flags = 0;
      if (config.requireDestTag) {
        flags |= 0x00000001; // tfRequireDestTag
      }
      if (config.disallowXRP) {
        flags |= 0x00000008; // tfDisallowXRP
      }

      const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: hotWallet.address,
        Domain: config.domain ? Buffer.from(config.domain).toString('hex') : undefined,
        SetFlag: config.requireAuth ? 2 : undefined, // asfRequireAuth
        Flags: flags
      };

      const response = await client.submitAndWait(tx, {
        wallet: hotWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Hot wallet configuration failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to configure hot wallet: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create trust line from holder to issuer
   */
  async createTrustLine(params: TrustLineParams): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: TrustSet = {
        TransactionType: 'TrustSet',
        Account: params.holderWallet.address,
        LimitAmount: {
          currency: params.currencyCode,
          issuer: params.issuerAddress,
          value: params.limit
        }
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.holderWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Trust line creation failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to create trust line: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Remove/close trust line
   */
  async removeTrustLine(
    holderWallet: Wallet,
    issuerAddress: string,
    currencyCode: string
  ): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      // Set limit to 0 to remove trust line
      const tx: TrustSet = {
        TransactionType: 'TrustSet',
        Account: holderWallet.address,
        LimitAmount: {
          currency: currencyCode,
          issuer: issuerAddress,
          value: '0'
        }
      };

      const response = await client.submitAndWait(tx, {
        wallet: holderWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Trust line removal failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to remove trust line: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Issue tokens to holder
   */
  async issueTokens(
    issuerWallet: Wallet,
    destination: string,
    currencyCode: string,
    amount: string
  ): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: Payment = {
        TransactionType: 'Payment',
        Account: issuerWallet.address,
        Destination: destination,
        Amount: {
          currency: currencyCode,
          value: amount,
          issuer: issuerWallet.address
        }
      };

      const response = await client.submitAndWait(tx, {
        wallet: issuerWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Token issuance failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to issue tokens: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Transfer tokens between holders
   */
  async transferTokens(
    senderWallet: Wallet,
    destination: string,
    currencyCode: string,
    issuerAddress: string,
    amount: string
  ): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: Payment = {
        TransactionType: 'Payment',
        Account: senderWallet.address,
        Destination: destination,
        Amount: {
          currency: currencyCode,
          value: amount,
          issuer: issuerAddress
        }
      };

      const response = await client.submitAndWait(tx, {
        wallet: senderWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Token transfer failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to transfer tokens: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get trust lines for an account
   */
  async getTrustLines(address: string): Promise<TrustLineInfo[]> {
    try {
      const client = await this.getClient();

      const response = await client.request({
        command: 'account_lines',
        account: address,
        ledger_index: 'validated'
      });

      // Properly type the response
      const lines: AccountLinesTrustline[] = response.result.lines;

      return lines.map((line) => ({
        currency: line.currency,
        issuer: line.account,
        balance: line.balance,
        limit: line.limit,
        limitPeer: line.limit_peer || '0',
        qualityIn: line.quality_in || 0,
        qualityOut: line.quality_out || 0,
        noRipple: line.no_ripple || false,
        noRipplePeer: line.no_ripple_peer || false,
        authorized: line.authorized || false,
        peerAuthorized: line.peer_authorized || false,
        freeze: line.freeze || false,
        freezePeer: line.freeze_peer || false
      }));
    } catch (error) {
      throw new Error(
        `Failed to get trust lines: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get token balance for specific currency
   */
  async getTokenBalance(
    address: string,
    currencyCode: string,
    issuerAddress: string
  ): Promise<string> {
    try {
      const trustLines = await this.getTrustLines(address);
      
      const line = trustLines.find(
        (l) => l.currency === currencyCode && l.issuer === issuerAddress
      );

      return line ? line.balance : '0';
    } catch (error) {
      throw new Error(
        `Failed to get token balance: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Freeze trust line (issuer only)
   */
  async freezeTrustLine(
    issuerWallet: Wallet,
    holderAddress: string,
    currencyCode: string
  ): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: TrustSet = {
        TransactionType: 'TrustSet',
        Account: issuerWallet.address,
        LimitAmount: {
          currency: currencyCode,
          issuer: holderAddress,
          value: '0'
        },
        Flags: 0x00040000 // tfSetFreeze
      };

      const response = await client.submitAndWait(tx, {
        wallet: issuerWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Trust line freeze failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to freeze trust line: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate currency code format
   */
  static isValidCurrencyCode(code: string): boolean {
    // Standard currency code: 3 characters (e.g., USD, EUR)
    if (/^[A-Z0-9]{3}$/.test(code)) {
      return true;
    }
    
    // Hex currency code: 40 hex characters
    if (/^[0-9A-F]{40}$/.test(code)) {
      return true;
    }

    return false;
  }

  /**
   * Convert standard currency code to hex format
   */
  static currencyCodeToHex(code: string): string {
    if (code.length === 3) {
      // Pad to 20 bytes (40 hex chars)
      return code.padEnd(40, '0');
    }
    return code;
  }

  /**
   * Convert hex currency code to standard format
   */
  static hexToCurrencyCode(hex: string): string {
    if (hex.length === 40) {
      // Remove trailing zeros and convert to ASCII
      const trimmed = hex.replace(/0+$/, '');
      if (trimmed.length === 6) { // 3 ASCII chars = 6 hex chars
        return Buffer.from(trimmed, 'hex').toString('ascii');
      }
    }
    return hex;
  }
}
