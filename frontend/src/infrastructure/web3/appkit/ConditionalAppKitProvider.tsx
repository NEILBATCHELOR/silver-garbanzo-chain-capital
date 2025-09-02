/**
 * Conditional AppKit Provider
 * Only loads AppKit/WalletConnect on specific routes that require wallet functionality
 * This improves performance by avoiding unnecessary initialization on non-wallet pages
 */

import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import AppKitProvider from './AppKitProvider';

interface ConditionalAppKitProviderProps {
  children: ReactNode;
  cookies?: string | null;
}

// Routes that SHOULD initialize WalletConnect/AppKit
const APPKIT_ENABLED_ROUTES = [
  '/wallet/demo',    // Specific wallet demo page
  '/wallet',         // All wallet routes (/wallet/*)
  '/deploy',         // All deploy routes (/deploy*)
];

export function ConditionalAppKitProvider({ children, cookies }: ConditionalAppKitProviderProps) {
  const location = useLocation();
  
  // Check if current route should have AppKit enabled
  const shouldEnableAppKit = APPKIT_ENABLED_ROUTES.some(route => {
    if (route === '/wallet') {
      // Match any route starting with /wallet
      return location.pathname.startsWith('/wallet');
    } else if (route === '/deploy') {
      // Match any route containing /deploy (including project-specific routes like /projects/:id/tokens/:id/deploy)
      return location.pathname.includes('/deploy');
    } else {
      // Exact match for specific routes like /wallet/demo
      return location.pathname === route || location.pathname.startsWith(route);
    }
  });

  // Only initialize AppKit for wallet and deploy routes
  if (shouldEnableAppKit) {
    console.log('🔗 AppKit route detected, initializing wallet functionality');
    return <AppKitProvider cookies={cookies}>{children}</AppKitProvider>;
  }

  // For all other routes, skip AppKit to improve performance
  console.log('⚡ Non-wallet route detected, skipping AppKit initialization for better performance');
  return <>{children}</>;
}

export default ConditionalAppKitProvider;
