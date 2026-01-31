/**
 * Vault Wallet Context
 * Provides selected wallet from dashboard header to all vault operation components
 */

import React, { createContext, useContext } from 'react';
import type { ProjectWalletData } from '@/services/project/project-wallet-service';

interface VaultWalletContextType {
  selectedWallet: (ProjectWalletData & { decryptedPrivateKey?: string }) | null;
  network: 'MAINNET' | 'TESTNET' | 'DEVNET';
}

const VaultWalletContext = createContext<VaultWalletContextType | undefined>(undefined);

export function useVaultWallet() {
  const context = useContext(VaultWalletContext);
  if (!context) {
    throw new Error('useVaultWallet must be used within VaultWalletProvider');
  }
  return context;
}

interface VaultWalletProviderProps {
  selectedWallet: (ProjectWalletData & { decryptedPrivateKey?: string }) | null;
  network: 'MAINNET' | 'TESTNET' | 'DEVNET';
  children: React.ReactNode;
}

export function VaultWalletProvider({ 
  selectedWallet, 
  network, 
  children 
}: VaultWalletProviderProps) {
  return (
    <VaultWalletContext.Provider value={{ selectedWallet, network }}>
      {children}
    </VaultWalletContext.Provider>
  );
}
