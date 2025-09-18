/**
 * Wallet Provider Conflict Handler
 * 
 * Handles conflicts when multiple wallet extensions (MetaMask, Coinbase, etc.) 
 * are trying to set the global Ethereum provider simultaneously.
 * This prevents console errors and provides a better user experience.
 */

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Handle provider conflicts gracefully
 * This function should be called early in the app initialization
 */
export function handleWalletProviderConflicts(): void {
  if (typeof window === 'undefined') return;

  // Suppress specific MetaMask provider conflict errors
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorMessage = args[0];
    
    // Skip MetaMask provider conflict errors - these are non-critical
    if (
      typeof errorMessage === 'string' && (
        errorMessage.includes('MetaMask encountered an error setting the global Ethereum provider') ||
        errorMessage.includes('Cannot set property ethereum of') ||
        errorMessage.includes('which has only a getter') ||
        errorMessage.includes('provider-injection')
      )
    ) {
      // Log as debug info instead of error for development
      if (import.meta.env.DEV) {
        console.debug('🔧 Wallet Provider Conflict (handled):', errorMessage);
      }
      return;
    }
    
    // Log all other errors normally
    originalConsoleError.apply(console, args);
  };

  // Add a one-time listener for provider conflicts
  if (window.ethereum) {
    try {
      // Check if multiple providers are available
      const providers = getAllEthereumProviders();
      
      if (providers.length > 1) {
        if (import.meta.env.DEV) {
          console.info(
            `🦊 Multiple wallet providers detected: ${providers.map(p => p.name || 'Unknown').join(', ')}. ` +
            'This is normal and handled automatically.'
          );
        }
        
        // Prioritize MetaMask if available, otherwise use the first provider
        const preferredProvider = providers.find(p => p.isMetaMask) || providers[0];
        
        // Set the preferred provider as the main ethereum object
        if (preferredProvider && preferredProvider !== window.ethereum) {
          Object.defineProperty(window, 'ethereum', {
            value: preferredProvider,
            writable: false,
            configurable: false,
          });
        }
      }
    } catch (error) {
      // Silently handle provider setup errors in development
      if (import.meta.env.DEV) {
        console.debug('Provider conflict resolution failed (non-critical):', error);
      }
    }
  }
}

/**
 * Get all available Ethereum providers
 */
function getAllEthereumProviders(): any[] {
  if (typeof window === 'undefined') return [];
  
  const providers: any[] = [];
  
  // Check for the main ethereum provider
  if (window.ethereum) {
    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      // Multiple providers available (EIP-5749)
      providers.push(...window.ethereum.providers);
    } else {
      // Single provider
      providers.push(window.ethereum);
    }
  }
  
  return providers;
}

/**
 * Check if a specific wallet is available
 */
export function isWalletAvailable(walletName: 'metamask' | 'coinbase' | 'brave'): boolean {
  if (typeof window === 'undefined') return false;
  
  const providers = getAllEthereumProviders();
  
  switch (walletName) {
    case 'metamask':
      return providers.some(p => p.isMetaMask === true);
    case 'coinbase':
      return providers.some(p => p.isCoinbaseWallet === true);
    case 'brave':
      return providers.some(p => p.isBraveWallet === true);
    default:
      return false;
  }
}

/**
 * Get wallet provider information for debugging
 */
export function getWalletProviderInfo(): { name: string; isAvailable: boolean; isActive: boolean }[] {
  const wallets = [
    { name: 'MetaMask', key: 'metamask' as const },
    { name: 'Coinbase', key: 'coinbase' as const },
    { name: 'Brave', key: 'brave' as const },
  ];
  
  return wallets.map(wallet => ({
    name: wallet.name,
    isAvailable: isWalletAvailable(wallet.key),
    isActive: window.ethereum ? 
      (wallet.key === 'metamask' && window.ethereum.isMetaMask) ||
      (wallet.key === 'coinbase' && window.ethereum.isCoinbaseWallet) ||
      (wallet.key === 'brave' && window.ethereum.isBraveWallet) : false,
  }));
}