/**
 * Injective Native TokenFactory Service - Backend Implementation
 * 
 * Full implementation adapted from frontend service for Node.js backend use.
 * Handles native Cosmos SDK-based token creation using TokenFactory module.
 * 
 * ARCHITECTURE:
 * - Cosmos SDK messages (not EVM contracts)
 * - Chain IDs: "injective-1" (mainnet), "injective-888" (testnet) - strings, not numbers
 * - Token format: factory/{creator_address}/{subdenom}
 * - HSM support available (implementation depends on backend HSM client)
 */

// Core SDK imports
import {
  MsgCreateDenom,
  MsgMint,
  MsgBurn,
  MsgSetDenomMetadata,
  MsgChangeAdmin,
  MsgInstantSpotMarketLaunch,
  MsgSend,
  createTransaction,
  TxGrpcApi,
  ChainGrpcBankApi,
  ChainRestAuthApi,
  PrivateKey,
  TxRaw
} from '@injectivelabs/sdk-ts';

// Network imports
import {
  Network,
  getNetworkEndpoints,
  getNetworkInfo
} from '@injectivelabs/networks';

// Utility imports
import { getDefaultStdFee } from '@injectivelabs/utils';

// Node.js Buffer (already available in Node.js)
import { Buffer } from 'buffer';

// Local types
import {
  TokenConfig,
  MintParams,
  BurnParams,
  SpotMarketConfig,
  TokenCreationResult,
  MarketLaunchResult,
  TokenMetadata
} from './types';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class InjectiveNativeTokenService {
  private network: Network;
  private endpoints: any;
  private chainId: string;
  private chainRestAuthApi: ChainRestAuthApi;
  private chainGrpcBankApi: ChainGrpcBankApi;
  private txClient: TxGrpcApi;

  constructor(network: Network = Network.Mainnet) {
    this.network = network;
    this.endpoints = getNetworkEndpoints(network);
    this.chainId = getNetworkInfo(network).chainId;
    
    // Initialize APIs
    this.chainRestAuthApi = new ChainRestAuthApi(this.endpoints.rest);
    this.chainGrpcBankApi = new ChainGrpcBankApi(this.endpoints.grpc);
    this.txClient = new TxGrpcApi(this.endpoints.grpc);
  }

  // ============================================================================
  // TOKEN CREATION
  // ============================================================================

  /**
   * Create a new TokenFactory denom
   * Format: factory/{creator_address}/{subdenom}
   * 
   * IMPORTANT: This creates the token in multiple steps:
   * 1. Create denom (MsgCreateDenom)
   * 2. Set metadata (MsgSetDenomMetadata) - separate transaction
   * 3. Mint initial supply (MsgMint) - if specified, separate transaction
   * 
   * @param config - Token configuration
   * @param creatorAddress - Injective address (inj1...)
   * @param privateKey - Private key for signing (or use HSM)
   * @param useHSM - Whether to use HSM for signing
   * @returns Token creation result with denom
   */
  async createToken(
    config: TokenConfig,
    creatorAddress: string,
    privateKey: string,
    useHSM: boolean = false
  ): Promise<TokenCreationResult> {
    try {
      // Validate subdenom (alphanumeric and dashes only)
      if (!/^[a-z0-9-]+$/.test(config.subdenom)) {
        throw new Error('Subdenom must contain only lowercase letters, numbers, and dashes');
      }

      // Generate denom
      const denom = `factory/${creatorAddress}/${config.subdenom}`;

      // Step 1: Create denom
      const msgCreateDenom = MsgCreateDenom.fromJSON({
        sender: creatorAddress,
        subdenom: config.subdenom
      });

      const createTxHash = await this.broadcastSingleMessage(
        msgCreateDenom,
        creatorAddress,
        privateKey,
        useHSM
      );

      console.log(`✅ Token denom created: ${denom}, TX: ${createTxHash}`);

      // Step 2: Set metadata (separate transaction)
      const msgSetMetadata = this.createMetadataMessage(
        denom,
        config.metadata,
        creatorAddress
      );

      const metadataTxHash = await this.broadcastSingleMessage(
        msgSetMetadata,
        creatorAddress,
        privateKey,
        useHSM
      );

      console.log(`✅ Metadata set, TX: ${metadataTxHash}`);

      // Step 3: Mint initial supply if specified (separate transaction)
      if (config.initialSupply) {
        const msgMint = MsgMint.fromJSON({
          sender: creatorAddress,
          amount: {
            denom: denom,
            amount: config.initialSupply
          }
        });

        const mintTxHash = await this.broadcastSingleMessage(
          msgMint,
          creatorAddress,
          privateKey,
          useHSM
        );

        console.log(`✅ Initial supply minted, TX: ${mintTxHash}`);
      }

      return {
        denom,
        txHash: createTxHash,
        success: true
      };
    } catch (error) {
      console.error('Token creation failed:', error);
      return {
        denom: '',
        txHash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // TOKEN MINTING
  // ============================================================================

  /**
   * Mint tokens to a TokenFactory denom
   * Only the admin can mint
   * 
   * @param params - Mint parameters
   * @param adminAddress - Admin address (must be denom admin)
   * @param privateKey - Private key for signing
   * @param useHSM - Whether to use HSM
   * @returns Transaction hash
   */
  async mintTokens(
    params: MintParams,
    adminAddress: string,
    privateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    try {
      const msgMint = MsgMint.fromJSON({
        sender: adminAddress,
        amount: {
          denom: params.denom,
          amount: params.amount
        }
      });

      const mintTxHash = await this.broadcastSingleMessage(
        msgMint,
        adminAddress,
        privateKey,
        useHSM
      );

      // If recipient specified and different from admin, send tokens
      if (params.recipient && params.recipient !== adminAddress) {
        const msgSend = MsgSend.fromJSON({
          srcInjectiveAddress: adminAddress,
          dstInjectiveAddress: params.recipient,
          amount: {
            denom: params.denom,
            amount: params.amount
          }
        });

        const sendTxHash = await this.broadcastSingleMessage(
          msgSend,
          adminAddress,
          privateKey,
          useHSM
        );

        console.log(`✅ Tokens sent to ${params.recipient}, TX: ${sendTxHash}`);
        return sendTxHash;
      }

      return mintTxHash;
    } catch (error) {
      console.error('Token minting failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // TOKEN BURNING
  // ============================================================================

  /**
   * Burn tokens from a TokenFactory denom
   * 
   * @param params - Burn parameters
   * @param burnerAddress - Address burning tokens
   * @param privateKey - Private key for signing
   * @param useHSM - Whether to use HSM
   * @returns Transaction hash
   */
  async burnTokens(
    params: BurnParams,
    burnerAddress: string,
    privateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    try {
      const msgBurn = MsgBurn.fromJSON({
        sender: burnerAddress,
        amount: {
          denom: params.denom,
          amount: params.amount
        }
      });

      return await this.broadcastSingleMessage(
        msgBurn,
        burnerAddress,
        privateKey,
        useHSM
      );
    } catch (error) {
      console.error('Token burning failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // METADATA MANAGEMENT
  // ============================================================================

  /**
   * Set or update token metadata
   * Only the admin can set metadata
   * 
   * @param denom - Token denom
   * @param metadata - Token metadata
   * @param adminAddress - Admin address
   * @param privateKey - Private key
   * @param useHSM - Use HSM
   * @returns Transaction hash
   */
  async setMetadata(
    denom: string,
    metadata: TokenMetadata,
    adminAddress: string,
    privateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    try {
      const msgSetMetadata = this.createMetadataMessage(
        denom,
        metadata,
        adminAddress
      );

      return await this.broadcastSingleMessage(
        msgSetMetadata,
        adminAddress,
        privateKey,
        useHSM
      );
    } catch (error) {
      console.error('Metadata update failed:', error);
      throw error;
    }
  }

  /**
   * Change admin of a TokenFactory denom
   * 
   * @param denom - Token denom
   * @param newAdmin - New admin address
   * @param currentAdmin - Current admin address
   * @param privateKey - Private key
   * @param useHSM - Use HSM
   * @returns Transaction hash
   */
  async changeAdmin(
    denom: string,
    newAdmin: string,
    currentAdmin: string,
    privateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    try {
      const msgChangeAdmin = MsgChangeAdmin.fromJSON({
        sender: currentAdmin,
        denom: denom,
        newAdmin: newAdmin
      });

      return await this.broadcastSingleMessage(
        msgChangeAdmin,
        currentAdmin,
        privateKey,
        useHSM
      );
    } catch (error) {
      console.error('Admin change failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // MARKET LAUNCH
  // ============================================================================

  /**
   * Launch a spot market on Injective DEX
   * Permissionless - anyone can launch
   * 
   * NOTE: Market fees are set by system defaults (not configurable via instant launch)
   * 
   * @param config - Market configuration
   * @param launcherAddress - Address launching market
   * @param privateKey - Private key
   * @param useHSM - Use HSM
   * @returns Market launch result
   */
  async launchSpotMarket(
    config: SpotMarketConfig,
    launcherAddress: string,
    privateKey: string,
    useHSM: boolean = false
  ): Promise<MarketLaunchResult> {
    try {
      // Create message with correct structure: proposer + nested market object
      const msgLaunch = MsgInstantSpotMarketLaunch.fromJSON({
        proposer: launcherAddress,
        market: {
          sender: launcherAddress,
          ticker: config.ticker,
          baseDenom: config.baseDenom,
          quoteDenom: config.quoteDenom,
          minPriceTickSize: config.minPriceTickSize,
          minQuantityTickSize: config.minQuantityTickSize,
          minNotional: config.minNotional || '1000000', // Default 1 USDT (6 decimals)
          baseDecimals: config.baseDecimals || 18,
          quoteDecimals: config.quoteDecimals || 6
        }
      });

      const txHash = await this.broadcastSingleMessage(
        msgLaunch,
        launcherAddress,
        privateKey,
        useHSM
      );

      // Market ID format: 0x{hash}
      const marketId = `0x${txHash.slice(0, 64)}`;

      return {
        marketId,
        txHash,
        success: true
      };
    } catch (error) {
      console.error('Market launch failed:', error);
      return {
        marketId: '',
        txHash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get token balance
   */
  async getBalance(address: string, denom: string): Promise<string> {
    try {
      const allBalances = await this.chainGrpcBankApi.fetchBalances(address);
      const specificBalance = allBalances.balances?.find((b: any) => b.denom === denom);
      
      return specificBalance?.amount || '0';
    } catch (error) {
      console.error('Balance query failed:', error);
      return '0';
    }
  }

  /**
   * Get all token balances for an address
   */
  async getAllBalances(address: string): Promise<Array<{ denom: string; amount: string }>> {
    try {
      const result = await this.chainGrpcBankApi.fetchBalances(address);
      return result.balances || [];
    } catch (error) {
      console.error('All balances query failed:', error);
      return [];
    }
  }

  /**
   * Get total supply for a denom
   */
  async getTotalSupply(denom: string): Promise<string> {
    try {
      const supplyResponse = await this.chainGrpcBankApi.fetchTotalSupply();
      // Response has structure { supply: TotalSupply[], pagination: Pagination }
      const denomSupply = supplyResponse.supply.find((s: any) => s.denom === denom);
      return denomSupply?.amount || '0';
    } catch (error) {
      console.error('Supply query failed:', error);
      return '0';
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Create metadata message
   */
  private createMetadataMessage(
    denom: string,
    metadata: TokenMetadata,
    sender: string
  ): MsgSetDenomMetadata {
    // Create params object with explicit structure
    const params = {
      sender,
      metadata: {
        denomUnits: [
          {
            denom,
            exponent: 0,
            aliases: [metadata.symbol.toLowerCase()]
          },
          {
            denom: metadata.displayDenom || metadata.symbol,
            exponent: metadata.decimals,
            aliases: []
          }
        ],
        base: denom,
        display: metadata.displayDenom || metadata.symbol,
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        uri: metadata.uri || '',
        uriHash: '',
        decimals: metadata.decimals
      }
    };

    return MsgSetDenomMetadata.fromJSON(params);
  }

  /**
   * Broadcast a single message transaction
   * 
   * @param message - Single message to broadcast
   * @param senderAddress - Sender address
   * @param privateKey - Private key (if not using HSM)
   * @param useHSM - Use HSM for signing
   * @returns Transaction hash
   */
  private async broadcastSingleMessage(
    message: any,
    senderAddress: string,
    privateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    try {
      // Get account details
      const accountDetails = await this.chainRestAuthApi.fetchAccount(senderAddress);
      const baseAccount = accountDetails.account.base_account;

      // Prepare transaction
      const { signBytes, txRaw } = createTransaction({
        message: message,  // Single message
        memo: '',
        fee: getDefaultStdFee(),
        pubKey: baseAccount.pub_key?.key || '',
        sequence: parseInt(baseAccount.sequence, 10),
        accountNumber: parseInt(baseAccount.account_number, 10),
        chainId: this.chainId
      });

      // Sign transaction
      let signature: Uint8Array;
      
      if (useHSM) {
        // TODO: Implement HSM signing for backend
        // This would integrate with backend HSM client
        throw new Error('HSM signing not yet implemented in backend');
      } else if (privateKey) {
        // Sign with private key
        const pk = PrivateKey.fromHex(privateKey);
        signature = await pk.sign(Buffer.from(signBytes));
      } else {
        throw new Error('No signing method provided (privateKey or HSM)');
      }

      // Assign signatures to txRaw
      txRaw.signatures = [signature];

      // Broadcast
      const txResponse = await this.txClient.broadcast(txRaw);
      
      if (txResponse.code !== 0) {
        throw new Error(`Transaction failed: ${txResponse.rawLog}`);
      }

      return txResponse.txHash;
    } catch (error) {
      console.error('Transaction broadcast failed:', error);
      throw error;
    }
  }

  /**
   * Validate denom format
   */
  validateDenom(denom: string): boolean {
    // TokenFactory format: factory/{address}/{subdenom}
    const factoryRegex = /^factory\/inj1[a-z0-9]{38}\/[a-z0-9-]+$/;
    
    // Peggy format: peggy0x...
    const peggyRegex = /^peggy0x[a-fA-F0-9]{40}$/;
    
    // Native IBC format: ibc/...
    const ibcRegex = /^ibc\/[A-F0-9]{64}$/;
    
    return factoryRegex.test(denom) || peggyRegex.test(denom) || ibcRegex.test(denom) || denom === 'inj';
  }

  /**
   * Parse denom to extract creator and subdenom
   */
  parseDenom(denom: string): { creator: string; subdenom: string } | null {
    const match = denom.match(/^factory\/(inj1[a-z0-9]{38})\/([a-z0-9-]+)$/);
    if (!match || !match[1] || !match[2]) return null;
    return {
      creator: match[1],
      subdenom: match[2]
    };
  }
}

// Export singleton instance for testnet
export const injectiveNativeTokenServiceTestnet = new InjectiveNativeTokenService(Network.Testnet);

// Export singleton instance for mainnet
export const injectiveNativeTokenServiceMainnet = new InjectiveNativeTokenService(Network.Mainnet);
