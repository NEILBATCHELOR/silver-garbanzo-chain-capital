/**
 * Selective AppKit Provider
 * 
 * Use this to wrap only specific components/pages that need Web3 wallet functionality.
 * This prevents unnecessary AppKit initialization on pages that don't need wallets.
 */

import React, { ReactNode } from 'react';
import AppKitProvider from './AppKitProvider';

interface SelectiveAppKitProviderProps {
  children: ReactNode;
  /** 
   * Whether to enable AppKit for this component.
   * Set to false to disable wallet functionality for this component tree.
   */
  enabled?: boolean;
  /**
   * Optional error fallback if AppKit fails to initialize
   */
  fallback?: ReactNode;
}

export function SelectiveAppKitProvider({ 
  children, 
  enabled = true,
  fallback = null 
}: SelectiveAppKitProviderProps) {
  
  // If disabled, just render children without AppKit
  if (!enabled) {
    return <>{children}</>;
  }

  // If no project ID is available, render fallback or children without wallet functionality
  const projectId = import.meta.env.VITE_PUBLIC_PROJECT_ID;
  if (!projectId) {
    if (import.meta.env.DEV) {
      console.warn('AppKit disabled: VITE_PUBLIC_PROJECT_ID not found');
    }
    return fallback ? <>{fallback}</> : <>{children}</>;
  }

  // Wrap with AppKit provider for wallet functionality
  try {
    return <AppKitProvider>{children}</AppKitProvider>;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('AppKit initialization failed:', error);
    }
    return fallback ? <>{fallback}</> : <>{children}</>;
  }
}

/**
 * Hook to check if AppKit is available in the current context
 */
export function useAppKitAvailable(): boolean {
  const projectId = import.meta.env.VITE_PUBLIC_PROJECT_ID;
  return !!projectId;
}

export default SelectiveAppKitProvider;
