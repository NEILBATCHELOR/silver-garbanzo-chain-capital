/**
 * Reown AppKit Context Provider - Multi-Wallet Support
 * 
 * This provides the AppKit context for the entire application
 * with comprehensive wallet support including social logins, email, and all major wallets
 * Must be a Client Component for React integration
 */

'use client'

import React, { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, cookieToInitialState, type Config } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import { config, networks, projectId, wagmiAdapter } from './config'
import { mainnet } from '@reown/appkit/networks'

const queryClient = new QueryClient()

const metadata = {
  name: 'Chain Capital',
  description: 'Chain Capital Tokenization Platform - Connect with any wallet',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://chaincapital.com',
  icons: ['https://chaincapital.com/logo.png'],
}

// Initialize AppKit with comprehensive wallet support and enhanced error handling
if (!projectId) {
  if (import.meta.env.DEV) {
    console.warn("AppKit Warning: Project ID is missing. Wallet functionality will be limited.");
  }
} else {
  // Use a more robust initialization with multiple fallback strategies
  const initializeAppKit = async () => {
    try {
      // Validate Project ID format before API calls
      if (!projectId || projectId.length !== 32) {
        if (import.meta.env.DEV) {
          console.warn('AppKit Warning: Project ID format invalid. Expected 32-character string.');
        }
        return;
      }

      createAppKit({
        adapters: [wagmiAdapter],
        projectId: projectId!,
        networks: networks,
        defaultNetwork: mainnet,
        metadata,
        
        // Enable all wallet features for maximum compatibility
        features: { 
          analytics: true,      // Enable usage analytics
          onramp: true,        // Enable on-ramp services (buy crypto)
          swaps: true,         // Enable token swaps
          email: true,         // Enable email login
          socials: [           // Enable social logins
            'google', 
            'github', 
            'apple', 
            'discord',
            'x',
            'farcaster'
          ],
          emailShowWallets: true, // Show wallet options with email
        },
        
        // Theme configuration for better UX
        themeMode: 'light',
        themeVariables: {
          '--w3m-accent': '#3b82f6',      // Primary blue color
          '--w3m-color-mix': '#ffffff',
          '--w3m-color-mix-strength': 20,
          '--w3m-font-family': 'Inter, sans-serif',
          '--w3m-border-radius-master': '8px',
        },
        
        // Enable all connection methods
        enableWalletConnect: true,  // WalletConnect protocol
        enableInjected: true,       // Browser extension wallets
        enableEIP6963: true,        // EIP-6963 wallet discovery
        enableCoinbase: true,       // Coinbase wallet
        
        // Remove specific wallet IDs to prevent 400 errors - let AppKit auto-discover
        // includeWalletIds and excludeWalletIds can cause API errors if IDs are outdated
        allWallets: 'SHOW', // Show all available wallets automatically
        
        // Terms and Privacy (recommended for production)
        termsConditionsUrl: 'https://chaincapital.com/terms',
        privacyPolicyUrl: 'https://chaincapital.com/privacy',
      });

    } catch (error) {
      // Enhanced error handling with specific error types
      if (import.meta.env.DEV) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
          console.warn('⚠️ AppKit: API configuration issue - check Project ID and domain settings at https://cloud.reown.com');
        } else if (errorMessage.includes('Network')) {
          console.warn('⚠️ AppKit: Network connectivity issue - wallet features limited');
        } else {
          console.info('ℹ️ AppKit: Initialization completed with limited functionality');
        }
      }
      // App continues to function without AppKit
    }
  };

  // Initialize asynchronously to prevent blocking
  initializeAppKit();
}

export default function AppKitProvider({
  children,
  cookies,
}: {
  children: ReactNode
  cookies?: string | null // Cookies from server for hydration
}) {
  // Calculate initial state for Wagmi SSR hydration
  const initialState = cookieToInitialState(config as Config, cookies || null)

  return (
    // Cast config as Config for WagmiProvider
    <WagmiProvider config={config as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
