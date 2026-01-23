/**
 * Modern Solana Explorer Service
 * Provides explorer URLs for Solana transactions, addresses, and tokens
 * 
 * Supported Explorers:
 * - Solana Explorer (official)
 * - Solscan (community favorite)
 * - Solana FM (advanced analytics)
 * - XRAY (visual explorer)
 */

import type { SolanaNetwork } from './ModernSolanaTypes';
import type { Address } from '@solana/kit';

// ============================================================================
// TYPES
// ============================================================================

export type ExplorerType = 'transaction' | 'address' | 'token' | 'block';

export type ExplorerProvider = 'solana' | 'solscan' | 'solanafm' | 'xray';

export interface ExplorerLink {
  provider: ExplorerProvider;
  url: string;
  name: string;
}

// ============================================================================
// SOLANA EXPLORER SERVICE
// ============================================================================

export class ModernSolanaExplorer {
  /**
   * Get Solana Explorer URL (Official)
   */
  static getSolanaExplorerUrl(
    identifier: string,
    network: SolanaNetwork,
    type: ExplorerType = 'transaction'
  ): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    const path = this.getExplorerPath(type);
    return `https://explorer.solana.com/${path}/${identifier}${cluster}`;
  }

  /**
   * Get Solscan URL (Community Favorite)
   */
  static getSolscanUrl(
    identifier: string,
    network: SolanaNetwork,
    type: ExplorerType = 'transaction'
  ): string {
    const prefix = network === 'mainnet-beta' ? '' : `${network}.`;
    const path = this.getSolscanPath(type);
    return `https://${prefix}solscan.io/${path}/${identifier}`;
  }

  /**
   * Get Solana FM URL (Advanced Analytics)
   */
  static getSolanaFMUrl(
    identifier: string,
    network: SolanaNetwork,
    type: ExplorerType = 'transaction'
  ): string {
    const cluster = this.getClusterParam(network);
    const path = this.getSolanaFMPath(type);
    return `https://solana.fm/${path}/${identifier}${cluster}`;
  }

  /**
   * Get XRAY URL (Visual Explorer)
   */
  static getXRAYUrl(
    identifier: string,
    network: SolanaNetwork,
    type: ExplorerType = 'transaction'
  ): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    const path = this.getXRAYPath(type);
    return `https://xray.helius.xyz/${path}/${identifier}${cluster}`;
  }

  /**
   * Get all explorer links for an identifier
   */
  static getAllExplorerLinks(
    identifier: string,
    network: SolanaNetwork,
    type: ExplorerType = 'transaction'
  ): ExplorerLink[] {
    return [
      {
        provider: 'solana',
        name: 'Solana Explorer',
        url: this.getSolanaExplorerUrl(identifier, network, type)
      },
      {
        provider: 'solscan',
        name: 'Solscan',
        url: this.getSolscanUrl(identifier, network, type)
      },
      {
        provider: 'solanafm',
        name: 'Solana FM',
        url: this.getSolanaFMUrl(identifier, network, type)
      },
      {
        provider: 'xray',
        name: 'XRAY',
        url: this.getXRAYUrl(identifier, network, type)
      }
    ];
  }

  /**
   * Get primary explorer URL (defaults to Solana Explorer)
   */
  static getPrimaryExplorerUrl(
    identifier: string,
    network: SolanaNetwork,
    type: ExplorerType = 'transaction',
    provider: ExplorerProvider = 'solana'
  ): string {
    switch (provider) {
      case 'solscan':
        return this.getSolscanUrl(identifier, network, type);
      case 'solanafm':
        return this.getSolanaFMUrl(identifier, network, type);
      case 'xray':
        return this.getXRAYUrl(identifier, network, type);
      default:
        return this.getSolanaExplorerUrl(identifier, network, type);
    }
  }

  /**
   * Create explorer link with metadata
   */
  static createExplorerLink(
    identifier: string,
    network: SolanaNetwork,
    type: ExplorerType,
    provider: ExplorerProvider = 'solana'
  ): ExplorerLink {
    const url = this.getPrimaryExplorerUrl(identifier, network, type, provider);
    const names = {
      solana: 'Solana Explorer',
      solscan: 'Solscan',
      solanafm: 'Solana FM',
      xray: 'XRAY'
    };

    return {
      provider,
      name: names[provider],
      url
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get Solana Explorer path segment
   */
  private static getExplorerPath(type: ExplorerType): string {
    switch (type) {
      case 'transaction':
        return 'tx';
      case 'address':
        return 'address';
      case 'token':
        return 'address'; // Tokens use address path
      case 'block':
        return 'block';
      default:
        return 'tx';
    }
  }

  /**
   * Get Solscan path segment
   */
  private static getSolscanPath(type: ExplorerType): string {
    switch (type) {
      case 'transaction':
        return 'tx';
      case 'address':
        return 'account';
      case 'token':
        return 'token';
      case 'block':
        return 'block';
      default:
        return 'tx';
    }
  }

  /**
   * Get Solana FM path segment
   */
  private static getSolanaFMPath(type: ExplorerType): string {
    switch (type) {
      case 'transaction':
        return 'tx';
      case 'address':
        return 'address';
      case 'token':
        return 'address'; // Tokens use address path
      case 'block':
        return 'block';
      default:
        return 'tx';
    }
  }

  /**
   * Get XRAY path segment
   */
  private static getXRAYPath(type: ExplorerType): string {
    switch (type) {
      case 'transaction':
        return 'tx';
      case 'address':
        return 'account';
      case 'token':
        return 'token';
      case 'block':
        return 'block';
      default:
        return 'tx';
    }
  }

  /**
   * Get cluster parameter for URLs
   */
  private static getClusterParam(network: SolanaNetwork): string {
    if (network === 'mainnet-beta') return '';
    return `?cluster=${network}`;
  }

  /**
   * Validate Solana address format
   */
  static isValidSolanaAddress(address: string): boolean {
    // Basic validation: Solana addresses are base58 encoded, 32-44 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  }

  /**
   * Validate Solana transaction signature format
   */
  static isValidSignature(signature: string): boolean {
    // Transaction signatures are base58 encoded, typically 87-88 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
    return base58Regex.test(signature);
  }

  /**
   * Format address for display (truncate middle)
   */
  static formatAddress(address: string, startChars = 4, endChars = 4): string {
    if (address.length <= startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  /**
   * Format signature for display (truncate middle)
   */
  static formatSignature(signature: string, startChars = 8, endChars = 8): string {
    if (signature.length <= startChars + endChars) return signature;
    return `${signature.slice(0, startChars)}...${signature.slice(-endChars)}`;
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick access functions for common use cases
 */
export const solanaExplorer = {
  // Transaction links
  tx: (signature: string, network: SolanaNetwork) =>
    ModernSolanaExplorer.getSolanaExplorerUrl(signature, network, 'transaction'),
  
  txSolscan: (signature: string, network: SolanaNetwork) =>
    ModernSolanaExplorer.getSolscanUrl(signature, network, 'transaction'),
  
  // Address links
  address: (addr: string, network: SolanaNetwork) =>
    ModernSolanaExplorer.getSolanaExplorerUrl(addr, network, 'address'),
  
  addressSolscan: (addr: string, network: SolanaNetwork) =>
    ModernSolanaExplorer.getSolscanUrl(addr, network, 'address'),
  
  // Token links
  token: (mint: string, network: SolanaNetwork) =>
    ModernSolanaExplorer.getSolanaExplorerUrl(mint, network, 'token'),
  
  tokenSolscan: (mint: string, network: SolanaNetwork) =>
    ModernSolanaExplorer.getSolscanUrl(mint, network, 'token'),
  
  // Block links
  block: (slot: string, network: SolanaNetwork) =>
    ModernSolanaExplorer.getSolanaExplorerUrl(slot, network, 'block'),
  
  // All explorers
  all: (identifier: string, network: SolanaNetwork, type: ExplorerType = 'transaction') =>
    ModernSolanaExplorer.getAllExplorerLinks(identifier, network, type),
  
  // Formatting helpers
  formatAddr: (address: string) => ModernSolanaExplorer.formatAddress(address),
  formatSig: (signature: string) => ModernSolanaExplorer.formatSignature(signature),
  
  // Validation
  isValidAddress: (address: string) => ModernSolanaExplorer.isValidSolanaAddress(address),
  isValidSignature: (sig: string) => ModernSolanaExplorer.isValidSignature(sig)
};

export default ModernSolanaExplorer;
