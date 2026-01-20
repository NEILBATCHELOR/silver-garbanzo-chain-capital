/**
 * Wallet Generators Index
 * Exports all wallet generators for supported blockchain networks
 */

// Enhanced Wallet Generators with Full SDK Integration
export { SolanaWalletGenerator } from './SolanaWalletGenerator';
export { BTCWalletGenerator } from './BTCWalletGenerator';
export { AptosWalletGenerator } from './AptosWalletGenerator';
export { SuiWalletGenerator } from './SuiWalletGenerator';
export { NEARWalletGenerator } from './NEARWalletGenerator';

// Existing Enhanced Generators
export { XRPWalletGenerator } from './XRPWalletGenerator';
export { XRPLEvmWalletGenerator } from './XRPLEvmWalletGenerator';
export { StellarWalletGenerator } from './StellarWalletGenerator';

// EVM-based Generators
export { ETHWalletGenerator } from './ETHWalletGenerator';
export { PolygonWalletGenerator } from './PolygonWalletGenerator';
export { InjectiveWalletGenerator } from './InjectiveWalletGenerator';
export { BaseWalletGenerator } from './BaseWalletGenerator';

// Factory
export { WalletGeneratorFactory } from './WalletGeneratorFactory';

// Base interfaces
export type { WalletGenerator, Wallet, WalletMetadata, WalletGenerationOptions } from '../WalletGenerator';
