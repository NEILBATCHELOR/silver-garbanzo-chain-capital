/**
 * Injective Token Deployment Service
 * 
 * Unified service that integrates:
 * - InjectiveWalletService (internal wallet signing)
 * - InjectiveNativeTokenService (TokenFactory operations)
 * - MTSUtilities (MultiVM Token Standard)
 * 
 * This service handles the complete token deployment flow from wallet selection
 * to blockchain deployment to database storage.
 */

import { Network } from '@injectivelabs/networks';
import { InjectiveWalletService } from './InjectiveWalletService';
import { InjectiveNativeTokenService } from './InjectiveNativeTokenService';
import { MTSUtilities } from './mts-utils';
import { supabase } from '@/infrastructure/database/client';
import type {
  InjectiveAccountInfo,
  TokenFactoryConfig,
  TokenCreationResult,
  MarketLaunchResult,
  SpotMarketConfig
} from './index';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WalletInfo {
  id: string;
  address: string;
  name: string;
  use_hsm: boolean;
  hsm_key_id?: string;
  encrypted_private_key?: string;
  project_id?: string;
}

export interface TokenDeploymentConfig extends TokenFactoryConfig {
  launchMarket?: boolean;
  marketConfig?: Omit<SpotMarketConfig, 'baseDenom'>;
}

export interface TokenDeploymentResult {
  success: boolean;
  denom?: string;
  txHash?: string;
  marketId?: string;
  marketTxHash?: string;
  error?: string;
  tokenDbId?: string;
  marketDbId?: string;
}

export interface MTSTokenInfo {
  denom: string;
  isMTS: boolean;
  evmAddress?: string;
  nativeBalance: string;
  evmBalance?: string;
  metadata?: any;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class InjectiveTokenDeploymentService {
  private walletService: InjectiveWalletService;
  private tokenService: InjectiveNativeTokenService;
  private network: Network;

  constructor(network: Network = Network.Testnet) {
    this.network = network;
    this.walletService = new InjectiveWalletService(network);
    this.tokenService = new InjectiveNativeTokenService(network);
  }

  // ============================================================================
  // WALLET MANAGEMENT
  // ============================================================================

  /**
   * Load wallet from database by ID
   */
  async loadWallet(walletId: string): Promise<WalletInfo | null> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', walletId)
        .single();

      if (error || !data) {
        console.error('Error loading wallet:', error);
        return null;
      }

      return data as WalletInfo;
    } catch (error) {
      console.error('Error loading wallet:', error);
      return null;
    }
  }

  /**
   * Get project wallets filtered by blockchain
   */
  async getProjectWallets(projectId: string): Promise<WalletInfo[]> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('project_id', projectId)
        .eq('blockchain', 'injective')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading project wallets:', error);
        return [];
      }

      return (data || []) as WalletInfo[];
    } catch (error) {
      console.error('Error loading project wallets:', error);
      return [];
    }
  }

  /**
   * Convert wallet info to account info for signing
   * IMPORTANT: Does not decrypt private keys - that should happen in a secure context
   */
  private walletToAccountInfo(wallet: WalletInfo): InjectiveAccountInfo {
    if (wallet.use_hsm) {
      return {
        address: wallet.address,
        publicKey: '', // Public key derived from address
        keyId: wallet.hsm_key_id
      };
    } else {
      // Note: Private key decryption should happen elsewhere for security
      return {
        address: wallet.address,
        publicKey: '',
        privateKey: undefined // Caller must decrypt and provide
      };
    }
  }

  // ============================================================================
  // TOKEN DEPLOYMENT
  // ============================================================================

  /**
   * Deploy TokenFactory token with optional market launch
   * 
   * Flow:
   * 1. Load wallet from database
   * 2. Create token on blockchain
   * 3. Save token to database
   * 4. Optional: Launch spot market
   * 5. Optional: Save market to database
   * 6. Check MTS status
   */
  async deployToken(
    config: TokenDeploymentConfig,
    walletId: string,
    privateKey?: string // Only needed if not using HSM
  ): Promise<TokenDeploymentResult> {
    try {
      // 1. Load wallet
      const wallet = await this.loadWallet(walletId);
      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found'
        };
      }

      // 2. Prepare account info
      const accountInfo = this.walletToAccountInfo(wallet);
      if (!wallet.use_hsm && !privateKey) {
        return {
          success: false,
          error: 'Private key required for non-HSM wallet'
        };
      }
      if (privateKey) {
        accountInfo.privateKey = privateKey;
      }

      // 3. Create token
      const tokenResult = await this.tokenService.createToken(
        {
          subdenom: config.subdenom,
          initialSupply: config.initialSupply,
          metadata: config.metadata
        },
        accountInfo.address,
        accountInfo.privateKey || '',
        wallet.use_hsm
      );

      if (!tokenResult.success || !tokenResult.denom) {
        return {
          success: false,
          error: tokenResult.error || 'Token creation failed'
        };
      }

      // 4. Save token to database
      const { data: tokenDb, error: tokenDbError } = await supabase
        .from('injective_native_tokens')
        .insert({
          denom: tokenResult.denom,
          subdenom: config.subdenom,
          wallet_id: walletId,
          creator_address: accountInfo.address,
          total_supply: config.initialSupply,
          circulating_supply: config.initialSupply,
          name: config.metadata.name,
          symbol: config.metadata.symbol,
          decimals: config.metadata.decimals,
          description: config.metadata.description,
          admin_address: accountInfo.address,
          network: this.network === Network.Mainnet ? 'mainnet' : 'testnet',
          chain_id: this.network === Network.Mainnet ? 'injective-1' : 'injective-888',
          creation_tx_hash: tokenResult.txHash,
          status: 'active'
        })
        .select()
        .single();

      if (tokenDbError) {
        console.error('Error saving token to database:', tokenDbError);
        // Token created but not saved - return partial success
        return {
          success: true,
          denom: tokenResult.denom,
          txHash: tokenResult.txHash,
          error: 'Token created but database save failed'
        };
      }

      const result: TokenDeploymentResult = {
        success: true,
        denom: tokenResult.denom,
        txHash: tokenResult.txHash,
        tokenDbId: tokenDb?.id
      };

      // 5. Optional: Launch market
      if (config.launchMarket && config.marketConfig) {
        try {
          const marketResult = await this.tokenService.launchSpotMarket(
            {
              ...config.marketConfig,
              baseDenom: tokenResult.denom
            },
            accountInfo.address,
            accountInfo.privateKey || '',
            wallet.use_hsm
          );

          if (marketResult.success && marketResult.marketId) {
            result.marketId = marketResult.marketId;
            result.marketTxHash = marketResult.txHash;

            // Save market to database
            const { data: marketDb } = await supabase
              .from('injective_markets')
              .insert({
                market_id: marketResult.marketId,
                ticker: config.marketConfig.ticker,
                market_type: 'spot',
                base_denom: tokenResult.denom,
                quote_denom: config.marketConfig.quoteDenom,
                min_price_tick_size: config.marketConfig.minPriceTickSize,
                min_quantity_tick_size: config.marketConfig.minQuantityTickSize,
                network: this.network === Network.Mainnet ? 'mainnet' : 'testnet',
                chain_id: this.network === Network.Mainnet ? 'injective-1' : 'injective-888',
                launch_tx_hash: marketResult.txHash,
                launcher_wallet_id: walletId,
                status: 'active'
              })
              .select()
              .single();

            if (marketDb) {
              result.marketDbId = marketDb.id;
            }
          }
        } catch (marketError) {
          console.error('Error launching market:', marketError);
          result.error = `Token created but market launch failed: ${marketError}`;
        }
      }

      return result;
    } catch (error) {
      console.error('Error deploying token:', error);
      return {
        success: false,
        error: `Deployment failed: ${error}`
      };
    }
  }

  // ============================================================================
  // MTS INTEGRATION
  // ============================================================================

  /**
   * Get complete token information including MTS status
   */
  async getTokenInfo(denom: string, address?: string): Promise<MTSTokenInfo | null> {
    try {
      // Get MTS utilities instance
      const mtsUtils = new MTSUtilities(this.network);

      // Check if token has MTS enabled
      const isMTS = await mtsUtils.checkMTSStatus(denom);

      // Get token metadata
      const metadata = await mtsUtils.getTokenInfo(denom);

      // Get balances if address provided
      let nativeBalance = '0';
      let evmBalance = '0';

      if (address && isMTS) {
        const balances = await mtsUtils.getMTSBalance(address, denom);
        nativeBalance = balances.nativeBalance;
        evmBalance = balances.evmBalance;
      } else if (address) {
        // Non-MTS token, just get native balance
        nativeBalance = (await this.walletService.getBalance(address, denom)).amount;
      }

      return {
        denom,
        isMTS,
        evmAddress: isMTS ? this.denomToEVMAddress(denom) : undefined,
        nativeBalance,
        evmBalance: isMTS ? evmBalance : undefined,
        metadata
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      return null;
    }
  }

  /**
   * Get all tokens for a project with MTS status
   */
  async getProjectTokens(projectId: string): Promise<MTSTokenInfo[]> {
    try {
      // Get tokens from database
      const { data: tokens } = await supabase
        .from('injective_native_tokens')
        .select(`
          denom,
          creator_address,
          wallets!inner(project_id)
        `)
        .eq('wallets.project_id', projectId)
        .eq('status', 'active');

      if (!tokens || tokens.length === 0) {
        return [];
      }

      // Get MTS info for each token
      const tokenInfos = await Promise.all(
        tokens.map(t => this.getTokenInfo(t.denom))
      );

      return tokenInfos.filter(info => info !== null) as MTSTokenInfo[];
    } catch (error) {
      console.error('Error getting project tokens:', error);
      return [];
    }
  }

  /**
   * Convert factory denom to potential EVM address
   * Format: factory/{address}/{subdenom} -> extract address portion
   */
  private denomToEVMAddress(denom: string): string | undefined {
    // MTS denoms have format: erc20:0x...
    if (denom.startsWith('erc20:')) {
      return denom.replace('erc20:', '');
    }
    return undefined;
  }

  // ============================================================================
  // TOKEN OPERATIONS WITH WALLET INTEGRATION
  // ============================================================================

  /**
   * Mint tokens using project wallet
   */
  async mintTokens(
    denom: string,
    amount: string,
    recipient: string,
    walletId: string,
    privateKey?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const wallet = await this.loadWallet(walletId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      const accountInfo = this.walletToAccountInfo(wallet);
      if (!wallet.use_hsm && !privateKey) {
        return { success: false, error: 'Private key required' };
      }
      if (privateKey) {
        accountInfo.privateKey = privateKey;
      }

      const txHash = await this.tokenService.mintTokens(
        { denom, amount, recipient },
        accountInfo.address,
        accountInfo.privateKey || '',
        wallet.use_hsm
      );

      return { success: true, txHash };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Burn tokens using project wallet
   */
  async burnTokens(
    denom: string,
    amount: string,
    walletId: string,
    privateKey?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const wallet = await this.loadWallet(walletId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }

      const accountInfo = this.walletToAccountInfo(wallet);
      if (!wallet.use_hsm && !privateKey) {
        return { success: false, error: 'Private key required' };
      }
      if (privateKey) {
        accountInfo.privateKey = privateKey;
      }

      const txHash = await this.tokenService.burnTokens(
        { denom, amount },
        accountInfo.address,
        accountInfo.privateKey || '',
        wallet.use_hsm
      );

      return { success: true, txHash };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const injectiveTokenDeploymentServiceTestnet = new InjectiveTokenDeploymentService(Network.Testnet);
export const injectiveTokenDeploymentServiceMainnet = new InjectiveTokenDeploymentService(Network.Mainnet);
