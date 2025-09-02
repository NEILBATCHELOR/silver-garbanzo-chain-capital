/**
 * Safe Wallet Components Index
 * 
 * Exports safe versions of wallet components that work without AppKit
 */

export { 
  SafeConnectWalletButton,
  SafeWalletAccount, 
  SafeNetworkSelector 
} from './SafeConnectWalletButton';

// Re-export the safe components with simpler names for easier usage
export { 
  SafeConnectWalletButton as ConnectWalletButton,
  SafeWalletAccount as WalletAccount,
  SafeNetworkSelector as NetworkSelector
} from './SafeConnectWalletButton';
