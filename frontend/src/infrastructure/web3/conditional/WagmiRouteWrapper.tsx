/**
 * Wagmi Route Wrapper
 * 
 * Automatically provides Wagmi context based on route patterns.
 * Only wraps routes that need blockchain functionality (tokens, wallets, minting).
 */

import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ConditionalWagmiWrapper } from './ConditionalWagmiWrapper';

interface WagmiRouteWrapperProps {
  children: ReactNode;
}

/**
 * Route patterns that require Wagmi/Web3 functionality
 */
const WEB3_ROUTES = [
  '/tokens',
  '/wallet',
  '/captable/minting',
  '/factoring/tokenization',
  '/factoring/distribution',
  '/trade-finance',
] as const;

/**
 * Route patterns that contain Web3 functionality (using includes check)
 */
const WEB3_ROUTE_PATTERNS = [
  'tokens',
  'wallet', 
  'minting',
  'tokenization',
  'deploy',
  'trade-finance',
] as const;

/**
 * Determines if current route needs Web3/Wagmi functionality
 */
function useNeedsWeb3(): boolean {
  const location = useLocation();
  const pathname = location.pathname;
  
  // Check exact routes
  const needsExactRoute = WEB3_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  // Check pattern routes
  const needsPatternRoute = WEB3_ROUTE_PATTERNS.some(pattern => 
    pathname.includes(pattern)
  );
  
  return needsExactRoute || needsPatternRoute;
}

export function WagmiRouteWrapper({ children }: WagmiRouteWrapperProps) {
  const needsWeb3 = useNeedsWeb3();
  
  return (
    <ConditionalWagmiWrapper enabled={needsWeb3}>
      {children}
    </ConditionalWagmiWrapper>
  );
}

export default WagmiRouteWrapper;
