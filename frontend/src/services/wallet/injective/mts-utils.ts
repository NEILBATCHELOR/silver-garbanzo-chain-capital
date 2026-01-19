/**
 * MultiVM Token Standard (MTS) Utilities
 * 
 * MTS ensures that every token on Injective—whether deployed using Cosmos modules 
 * or via the EVM—has ONE canonical balance and identity stored in the bank module.
 * 
 * KEY CONCEPTS:
 * - ERC20 using Bank Precompile → erc20:{address} denom on Cosmos side
 * - TokenFactory tokens → factory/{creator}/{subdenom}
 * - Single canonical balance - stored in bank module, reflected in both VMs
 * - No bridging needed - instant sync across environments
 * 
 * BANK PRECOMPILE:
 * - Address: 0x0000000000000000000000000000000000000064
 * - Provides EVM interface to Injective's bank module (x/bank)
 * - Any ERC20 using Bank Precompile is automatically MTS-compliant
 * 
 * @see https://docs.injective.network/developers-evm/multivm-token-standard
 * @see https://docs.injective.network/developers-evm/bank-precompile
 */

import {
  ChainGrpcBankApi
} from '@injectivelabs/sdk-ts';
import {
  Network,
  getNetworkEndpoints
} from '@injectivelabs/networks';
import { ethers } from 'ethers';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Bank Precompile address - fixed system contract
 */
export const BANK_PRECOMPILE_ADDRESS = '0x0000000000000000000000000000000000000064';

/**
 * Bank Precompile ABI - interface for EVM interactions
 */
export const BANK_PRECOMPILE_ABI = [
  'function transfer(address recipient, string denom, uint256 amount) returns (bool)',
  'function balanceOf(address account, string denom) view returns (uint256)',
  'function supply(string denom) view returns (uint256)',
  'function name(string denom) view returns (string)',
  'function symbol(string denom) view returns (string)',
  'function decimals(string denom) view returns (uint8)'
];

// ============================================================================
// TYPES
// ============================================================================

export interface MTSConfig {
  erc20Address: string;
  network: Network;
  enableAutoConvert?: boolean;
}

export interface MTSTokenInfo {
  erc20Address: string;
  bankDenom: string;
  name: string;
  symbol: string;
  decimals: number;
  isMTSEnabled: boolean;
}

export interface MTSBalance {
  address: string;
  erc20Address: string;
  bankDenom: string;
  evmBalance: string;
  nativeBalance: string;
  totalBalance: string;
  lastSyncedAt: Date;
}

export interface CrossVMTransferParams {
  from: string;
  to: string;
  denom: string;
  amount: string;
  fromEnvironment: 'evm' | 'native';
  toEnvironment: 'evm' | 'native';
}

// ============================================================================
// MTS UTILITIES CLASS
// ============================================================================

export class MTSUtilities {
  private network: Network;
  private bankApi: ChainGrpcBankApi;

  constructor(network: Network = Network.Testnet) {
    this.network = network;
    const endpoints = getNetworkEndpoints(network);
    this.bankApi = new ChainGrpcBankApi(endpoints.grpc);
  }

  // ==========================================================================
  // DENOM CONVERSIONS
  // ==========================================================================

  /**
   * Get bank denom for ERC20 address
   * Format: erc20:{lowercase_hex_address}
   * 
   * @example
   * getMTSDenom('0xABC123...') → 'erc20:0xabc123...'
   */
  static getMTSDenom(erc20Address: string): string {
    if (!ethers.isAddress(erc20Address)) {
      throw new Error(`Invalid ERC20 address: ${erc20Address}`);
    }
    return `erc20:${erc20Address.toLowerCase()}`;
  }

  /**
   * Extract ERC20 address from MTS bank denom
   * 
   * @example
   * extractERC20Address('erc20:0xabc123...') → '0xabc123...'
   */
  static extractERC20Address(bankDenom: string): string | null {
    if (!bankDenom.startsWith('erc20:')) {
      return null;
    }
    const address = bankDenom.replace('erc20:', '');
    return ethers.isAddress(address) ? ethers.getAddress(address) : null;
  }

  /**
   * Check if denom is MTS format (erc20:...)
   */
  static isMTSDenom(denom: string): boolean {
    return denom.startsWith('erc20:') && 
           this.extractERC20Address(denom) !== null;
  }

  /**
   * Check if denom is TokenFactory format (factory/...)
   */
  static isTokenFactoryDenom(denom: string): boolean {
    return denom.startsWith('factory/') && 
           denom.split('/').length === 3;
  }

  // ==========================================================================
  // TOKEN INFORMATION
  // ==========================================================================

  /**
   * Get complete MTS token information
   * Queries bank module for metadata (MTS tokens have metadata registered)
   */
  async getTokenInfo(erc20Address: string): Promise<MTSTokenInfo> {
    const bankDenom = MTSUtilities.getMTSDenom(erc20Address);
    
    try {
      // Query bank module for metadata
      // MTS tokens automatically have metadata registered in bank module
      const metadata = await this.bankApi.fetchDenomMetadata(bankDenom);
      
      return {
        erc20Address: ethers.getAddress(erc20Address),
        bankDenom,
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        isMTSEnabled: true // If metadata exists, MTS is enabled
      };
    } catch (error) {
      // If metadata doesn't exist, token might not have MTS enabled yet
      return {
        erc20Address: ethers.getAddress(erc20Address),
        bankDenom,
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 18,
        isMTSEnabled: false
      };
    }
  }

  /**
   * Check if token has MTS enabled
   * Verifies by checking if bank module has metadata for the denom
   */
  async checkMTSStatus(erc20Address: string): Promise<boolean> {
    try {
      const bankDenom = MTSUtilities.getMTSDenom(erc20Address);
      // If we can fetch metadata, MTS is enabled
      await this.bankApi.fetchDenomMetadata(bankDenom);
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // BALANCE QUERIES
  // ==========================================================================

  /**
   * Get balance in both MTS representations
   * Returns balances from both EVM and native Cosmos SDK
   * 
   * NOTE: These should always be equal if MTS is working correctly!
   */
  async getMTSBalance(
    address: string, 
    erc20Address: string
  ): Promise<MTSBalance> {
    const bankDenom = MTSUtilities.getMTSDenom(erc20Address);
    
    try {
      // Query bank module (canonical source of truth)
      const balance = await this.bankApi.fetchBalance({
        accountAddress: address,
        denom: bankDenom
      });

      // For MTS tokens, EVM and native balance should be identical
      const balanceAmount = balance.amount;
      
      return {
        address,
        erc20Address: ethers.getAddress(erc20Address),
        bankDenom,
        evmBalance: balanceAmount,
        nativeBalance: balanceAmount,
        totalBalance: balanceAmount,
        lastSyncedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get MTS balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all MTS token balances for an address
   * Filters for erc20:... denoms only
   */
  async getAllMTSBalances(address: string): Promise<MTSBalance[]> {
    try {
      const balances = await this.bankApi.fetchBalances(address);
      
      const mtsBalances: MTSBalance[] = [];
      
      for (const balance of balances.balances) {
        if (MTSUtilities.isMTSDenom(balance.denom)) {
          const erc20Address = MTSUtilities.extractERC20Address(balance.denom);
          if (erc20Address) {
            mtsBalances.push({
              address,
              erc20Address,
              bankDenom: balance.denom,
              evmBalance: balance.amount,
              nativeBalance: balance.amount,
              totalBalance: balance.amount,
              lastSyncedAt: new Date()
            });
          }
        }
      }
      
      return mtsBalances;
    } catch (error) {
      throw new Error(`Failed to get all MTS balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==========================================================================
  // CROSS-VM TRANSFERS
  // ==========================================================================

  /**
   * Validate cross-VM transfer parameters
   * 
   * NOTE: For MTS tokens, cross-VM transfers are automatic!
   * You can use either EVM transfer() or Cosmos bank send.
   * Balance updates reflect instantly in both environments.
   */
  static validateCrossVMTransfer(params: CrossVMTransferParams): {
    valid: boolean;
    error?: string;
  } {
    const { from, to, denom, amount, fromEnvironment, toEnvironment } = params;

    // Validate addresses
    if (!from || !to) {
      return { valid: false, error: 'From and to addresses required' };
    }

    // Validate denom
    if (!denom) {
      return { valid: false, error: 'Denom required' };
    }

    // Validate amount
    if (!amount || BigInt(amount) <= 0n) {
      return { valid: false, error: 'Amount must be positive' };
    }

    // Validate environments
    if (fromEnvironment === toEnvironment) {
      return { 
        valid: false, 
        error: 'Cross-VM transfer requires different environments' 
      };
    }

    // For MTS tokens, verify denom format
    if (!MTSUtilities.isMTSDenom(denom) && 
        !MTSUtilities.isTokenFactoryDenom(denom)) {
      return { 
        valid: false, 
        error: 'Denom must be MTS (erc20:...) or TokenFactory (factory/...) format' 
      };
    }

    return { valid: true };
  }

  /**
   * Get suggested transfer method for cross-VM transfer
   * 
   * For MTS tokens:
   * - Use EVM transfer() if sender prefers EVM
   * - Use Cosmos bank send if sender prefers native
   * - Result is the same either way!
   */
  static getSuggestedTransferMethod(params: CrossVMTransferParams): {
    method: 'evm' | 'cosmos';
    reason: string;
  } {
    const { fromEnvironment, denom } = params;

    // Check if MTS token
    const isMTS = MTSUtilities.isMTSDenom(denom);
    
    if (!isMTS) {
      // TokenFactory tokens: use native Cosmos
      return {
        method: 'cosmos',
        reason: 'TokenFactory tokens use Cosmos bank module'
      };
    }

    // For MTS tokens, use sender's preferred environment
    // Convert 'native' to 'cosmos' for method type
    return {
      method: fromEnvironment === 'native' ? 'cosmos' : fromEnvironment,
      reason: 'MTS tokens work identically in both environments'
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Format MTS denom for display
   * Converts erc20:0xabc... → 0xabc...def (checksummed)
   */
  static formatMTSDenomForDisplay(denom: string): string {
    const address = this.extractERC20Address(denom);
    if (address) {
      return ethers.getAddress(address);
    }
    return denom;
  }

  /**
   * Get network info
   */
  getNetwork(): Network {
    return this.network;
  }

  /**
   * Switch network
   */
  switchNetwork(network: Network): void {
    this.network = network;
    const endpoints = getNetworkEndpoints(network);
    this.bankApi = new ChainGrpcBankApi(endpoints.grpc);
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

/**
 * Testnet MTS utilities instance
 */
export const mtsUtilitiesTestnet = new MTSUtilities(Network.Testnet);

/**
 * Mainnet MTS utilities instance
 */
export const mtsUtilitiesMainnet = new MTSUtilities(Network.Mainnet);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Quick helper to get MTS denom from ERC20 address
 */
export function getMTSDenom(erc20Address: string): string {
  return MTSUtilities.getMTSDenom(erc20Address);
}

/**
 * Quick helper to check if denom is MTS format
 */
export function isMTSDenom(denom: string): boolean {
  return MTSUtilities.isMTSDenom(denom);
}

/**
 * Quick helper to extract ERC20 address from MTS denom
 */
export function extractERC20Address(bankDenom: string): string | null {
  return MTSUtilities.extractERC20Address(bankDenom);
}
