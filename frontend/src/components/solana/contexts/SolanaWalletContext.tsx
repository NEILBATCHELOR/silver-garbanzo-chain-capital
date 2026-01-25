/**
 * Solana Wallet Context
 * Provides selected wallet from dashboard header to all operation forms
 */

import React, { createContext, useContext } from 'react';
import type { ProjectWalletData } from '@/services/project/project-wallet-service';

interface SolanaWalletContextType {
  selectedWallet: (ProjectWalletData & { decryptedPrivateKey?: string }) | null;
  network: 'MAINNET' | 'TESTNET' | 'DEVNET';
}

const SolanaWalletContext = createContext<SolanaWalletContextType | undefined>(undefined);

export function useSolanaWallet() {
  const context = useContext(SolanaWalletContext);
  if (!context) {
    throw new Error('useSolanaWallet must be used within SolanaWalletProvider');
  }
  return context;
}

interface SolanaWalletProviderProps {
  selectedWallet: (ProjectWalletData & { decryptedPrivateKey?: string }) | null;
  network: 'MAINNET' | 'TESTNET' | 'DEVNET';
  children: React.ReactNode;
}

export function SolanaWalletProvider({ 
  selectedWallet, 
  network, 
  children 
}: SolanaWalletProviderProps) {
  return (
    <SolanaWalletContext.Provider value={{ selectedWallet, network }}>
      {children}
    </SolanaWalletContext.Provider>
  );
}
