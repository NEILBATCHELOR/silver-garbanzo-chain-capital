/**
 * Injective Services - Backend
 * 
 * TokenFactory operations only
 * 
 * Exchange and Vault operations have been moved to:
 * - /services/exchange (multi-network)
 * - /services/vault (multi-network)
 */

// TokenFactory Service (Injective-specific)
export {
  InjectiveNativeTokenService,
  injectiveNativeTokenServiceTestnet,
  injectiveNativeTokenServiceMainnet
} from './InjectiveNativeTokenService';

// Types
export * from './types';
