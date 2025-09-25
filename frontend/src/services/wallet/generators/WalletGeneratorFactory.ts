import { WalletGenerator } from '../WalletGenerator';
import { ETHWalletGenerator } from './ETHWalletGenerator';
import { BTCWalletGenerator } from './BTCWalletGenerator';
import { XRPWalletGenerator } from './XRPWalletGenerator';
import { PolygonWalletGenerator } from './PolygonWalletGenerator';
import { SolanaWalletGenerator } from './SolanaWalletGenerator';
import { AptosWalletGenerator } from './AptosWalletGenerator';
import { SuiWalletGenerator } from './SuiWalletGenerator';
import { NEARWalletGenerator } from './NEARWalletGenerator';
import { StellarWalletGenerator } from './StellarWalletGenerator';
import { InjectiveWalletGenerator } from './InjectiveWalletGenerator';

/**
 * Factory to create the appropriate wallet generator for a blockchain
 * Updated with all enhanced wallet services using real SDKs
 */
export class WalletGeneratorFactory {
  private static generators: Record<string, WalletGenerator> = {};

  /**
   * Get the appropriate wallet generator for a blockchain
   * @param blockchain The blockchain to get the generator for
   * @returns The wallet generator for the blockchain
   */
  public static getGenerator(blockchain: string): WalletGenerator {
    if (!this.generators[blockchain]) {
      this.generators[blockchain] = this.createGenerator(blockchain);
    }
    return this.generators[blockchain];
  }

  /**
   * Create a new wallet generator for a blockchain
   * @param blockchain The blockchain to create the generator for
   * @returns The created wallet generator
   */
  private static createGenerator(blockchain: string): WalletGenerator {
    switch (blockchain.toLowerCase()) {
      case 'ethereum':
        return new ETHWalletGenerator();
      case 'bitcoin':
        return new BTCWalletGenerator();
      case 'ripple':
      case 'xrp':
        return new XRPWalletGenerator();
      case 'polygon':
        return new PolygonWalletGenerator();
      case 'solana':
        return new SolanaWalletGenerator();
      case 'aptos':
        return new AptosWalletGenerator();
      case 'sui':
        return new SuiWalletGenerator();
      case 'near':
        return new NEARWalletGenerator();
      case 'stellar':
        return new StellarWalletGenerator();
      case 'injective':
        return new InjectiveWalletGenerator();
      // EVM-compatible chains use ETHWalletGenerator
      case 'avalanche':
      case 'optimism':
      case 'base':
      case 'zksync':
      case 'arbitrum':
      case 'bsc':
      case 'mantle':
      case 'hedera':
        return new ETHWalletGenerator();
      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }

  /**
   * Get the list of all supported blockchains
   * @returns The list of supported blockchains
   */
  public static getSupportedBlockchains(): string[] {
    return [
      // Enhanced with real SDK implementations
      'bitcoin',     // ✅ Enhanced with bitcoinjs-lib
      'solana',      // ✅ Enhanced with @solana/web3.js  
      'aptos',       // ✅ Enhanced with @aptos-labs/ts-sdk
      'sui',         // ✅ Enhanced with @mysten/sui.js
      'near',        // ✅ Enhanced with near-js
      
      // Previously enhanced
      'ripple',      // ✅ Enhanced with xrpl
      'stellar',     // ✅ Enhanced with @stellar/stellar-sdk
      
      // EVM chains using ETH generator
      'ethereum',
      'polygon', 
      'avalanche',
      'optimism',
      'arbitrum',
      'base',
      'bsc',
      'zksync',
      'mantle',
      'hedera',
      
      // Other supported chains
      'injective'
    ];
  }

  /**
   * Get enhanced blockchains with full SDK integration
   * @returns List of blockchains with enhanced wallet services
   */
  public static getEnhancedBlockchains(): string[] {
    return [
      'bitcoin',    // BitcoinWalletService with bitcoinjs-lib
      'solana',     // SolanaWalletService with @solana/web3.js
      'aptos',      // AptosWalletService with @aptos-labs/ts-sdk
      'sui',        // SuiWalletService with @mysten/sui.js
      'near',       // NEARWalletService with near-api-js
      'ripple',     // RippleWalletService with xrpl
      'stellar'     // StellarWalletService with @stellar/stellar-sdk
    ];
  }

  /**
   * Check if a blockchain has enhanced wallet service support
   * @param blockchain Blockchain name
   * @returns Boolean indicating if enhanced service is available
   */
  public static isEnhanced(blockchain: string): boolean {
    return this.getEnhancedBlockchains().includes(blockchain.toLowerCase());
  }

  /**
   * Get wallet service capabilities for a blockchain
   * @param blockchain Blockchain name
   * @returns Capabilities object
   */
  public static getCapabilities(blockchain: string): {
    enhanced: boolean;
    sdk: string | null;
    features: string[];
  } {
    const enhanced = this.isEnhanced(blockchain);
    
    const capabilityMap: Record<string, { sdk: string; features: string[] }> = {
      bitcoin: {
        sdk: 'bitcoinjs-lib',
        features: ['HD Wallets', 'Multiple Address Types', 'BIP32/39/44', 'Segwit', 'Taproot']
      },
      solana: {
        sdk: '@solana/web3.js',
        features: ['HD Wallets', 'SPL Tokens', 'Network Operations', 'Balance Queries']
      },
      aptos: {
        sdk: '@aptos-labs/ts-sdk',
        features: ['HD Wallets', 'Account Operations', 'Testnet Faucet', 'Network Queries']
      },
      sui: {
        sdk: '@mysten/sui.js',
        features: ['HD Wallets', 'Object Queries', 'Multi-network', 'Gas Estimation']
      },
      near: {
        sdk: 'near-api-js',
        features: ['HD Wallets', 'Account IDs', 'Access Keys', 'Network Operations']
      },
      ripple: {
        sdk: 'xrpl',
        features: ['HD Wallets', 'Multi-sig', 'Network Operations', 'Token Support']
      },
      stellar: {
        sdk: '@stellar/stellar-sdk',
        features: ['HD Wallets', 'Multi-sig', 'Asset Support', 'Network Operations']
      }
    };

    const capabilities = capabilityMap[blockchain.toLowerCase()];
    
    return {
      enhanced,
      sdk: enhanced ? capabilities?.sdk || null : null,
      features: enhanced ? capabilities?.features || [] : ['Basic Generation']
    };
  }
}
