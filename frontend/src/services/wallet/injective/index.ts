/**
 * Injective Wallet Service Exports
 */

// Import types for local use in type aliases
import type {
  InjectiveAccountInfo,
  InjectiveGenerationOptions,
  InjectiveNetworkInfo,
  InjectiveOrderParams,
  InjectiveSendParams
} from './InjectiveWalletService';

// Export all wallet service functionality
export * from './InjectiveWalletService';

// Re-export all types
export type {
  InjectiveAccountInfo,
  InjectiveGenerationOptions,
  InjectiveNetworkInfo,
  InjectiveOrderParams,
  InjectiveSendParams
};

// Additional exports required by main index
export interface InjectiveEncryptedWallet {
  address: string;
  encryptedPrivateKey: string;
  keyId?: string;
  publicKey: string;
}

export interface InjectiveMarketOrder {
  marketId: string;
  orderHash: string;
  subaccountId: string;
  price: string;
  quantity: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  state: string;
}

// Re-export the transfer params as the main index expects it
// Now InjectiveSendParams is available since we imported it above
export type InjectiveTransferParams = InjectiveSendParams;
