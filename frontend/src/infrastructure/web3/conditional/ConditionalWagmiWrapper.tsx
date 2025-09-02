/**
 * Conditional Wagmi Wrapper
 * 
 * Only provides Wagmi context to components that need blockchain functionality.
 * Use this to wrap specific routes or components that require wallet/token interactions.
 */

import React, { ReactNode } from 'react';
import { MinimalWagmiProvider } from '../minimal/MinimalWagmiProvider';

interface ConditionalWagmiWrapperProps {
  children: ReactNode;
  /** Whether to enable Wagmi provider - defaults to true */
  enabled?: boolean;
}

export function ConditionalWagmiWrapper({ 
  children, 
  enabled = true 
}: ConditionalWagmiWrapperProps) {
  if (enabled) {
    return (
      <MinimalWagmiProvider>
        {children}
      </MinimalWagmiProvider>
    );
  }
  
  return <>{children}</>;
}

export default ConditionalWagmiWrapper;
