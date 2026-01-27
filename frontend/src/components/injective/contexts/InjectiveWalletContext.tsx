/**
 * Injective Wallet Context
 * Provides selected wallet from dashboard header to all operation forms
 * 
 * Pattern: Follows Solana wallet context pattern for consistency
 */

import React, { createContext, useContext } from 'react';
import type { ProjectWalletData } from '@/services/project/project-wallet-service';

export interface InjectiveWalletContextType {
  selectedWallet: (ProjectWalletData & { decryptedPrivateKey?: string }) | null;
  network: 'MAINNET' | 'TESTNET' | 'DEVNET';
}

const InjectiveWalletContext = createContext<InjectiveWalletContextType | undefined>(undefined);

/**
 * Hook to access Injective wallet context
 * @throws Error if used outside of InjectiveWalletProvider
 */
export function useInjectiveWallet() {
  const context = useContext(InjectiveWalletContext);
  if (!context) {
    throw new Error('useInjectiveWallet must be used within InjectiveWalletProvider');
  }
  return context;
}

interface InjectiveWalletProviderProps {
  selectedWallet: (ProjectWalletData & { decryptedPrivateKey?: string }) | null;
  network: 'MAINNET' | 'TESTNET' | 'DEVNET';
  children: React.ReactNode;
}

/**
 * Provider component for Injective wallet context
 * Wraps components that need access to the selected wallet
 */
export function InjectiveWalletProvider({ 
  selectedWallet, 
  network, 
  children 
}: InjectiveWalletProviderProps) {
  return (
    <InjectiveWalletContext.Provider value={{ selectedWallet, network }}>
      {children}
    </InjectiveWalletContext.Provider>
  );
}
