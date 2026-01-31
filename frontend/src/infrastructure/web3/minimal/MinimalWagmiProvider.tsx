/**
 * Minimal Wagmi Provider
 * 
 * This provides just the basic Wagmi context needed to prevent useAccount errors
 * without the full AppKit complexity. Use this when you need wagmi hooks to work
 * but don't need full wallet connection functionality.
 */

import React, { ReactNode, Suspense } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a minimal wagmi config
const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true, // Enable SSR mode to prevent hydration issues
});

// Create query client for wagmi
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
  },
});

interface MinimalWagmiProviderProps {
  children: ReactNode;
}

export function MinimalWagmiProvider({ children }: MinimalWagmiProviderProps) {
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MinimalWagmiProvider;
