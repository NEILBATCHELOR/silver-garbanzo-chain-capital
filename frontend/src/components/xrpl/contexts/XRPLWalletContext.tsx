/**
 * XRPL Wallet Context
 * Provides selected wallet from dashboard header to all operation components
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { ProjectWalletData } from '@/services/project/project-wallet-service';

interface XRPLWalletContextType {
  selectedWallet: (ProjectWalletData & { decryptedPrivateKey?: string }) | null;
  network: 'MAINNET' | 'TESTNET' | 'DEVNET';
}

const XRPLWalletContext = createContext<XRPLWalletContextType | undefined>(undefined);

export function useXRPLWallet() {
  const context = useContext(XRPLWalletContext);
  if (!context) {
    throw new Error('useXRPLWallet must be used within XRPLWalletProvider');
  }
  return context;
}

interface XRPLWalletProviderProps {
  selectedWallet: (ProjectWalletData & { decryptedPrivateKey?: string }) | null;
  network: 'MAINNET' | 'TESTNET' | 'DEVNET';
  children: React.ReactNode;
}

export function XRPLWalletProvider({ 
  selectedWallet, 
  network, 
  children 
}: XRPLWalletProviderProps) {
  // CRITICAL: Memoize context value to prevent unnecessary re-renders
  // Only update context when wallet ID or network actually changes
  const contextValue = useMemo(() => ({
    selectedWallet,
    network
  }), [
    selectedWallet?.id,
    selectedWallet?.wallet_address,
    selectedWallet?.decryptedPrivateKey,
    network
  ]);

  return (
    <XRPLWalletContext.Provider value={contextValue}>
      {children}
    </XRPLWalletContext.Provider>
  );
}
