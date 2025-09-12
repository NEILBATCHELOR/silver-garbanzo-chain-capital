/**
 * Conditional DFNS Provider
 * 
 * Only initializes DFNS when actually needed (on DFNS-related routes)
 * Prevents unnecessary API calls on non-DFNS pages
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeDfnsService, DfnsService } from '@/services/dfns';

interface DfnsContextType {
  dfnsService: DfnsService | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  initializeDfns: () => Promise<void>;
}

const DfnsContext = createContext<DfnsContextType | null>(null);

export const useDfns = () => {
  const context = useContext(DfnsContext);
  if (!context) {
    throw new Error('useDfns must be used within a DfnsProvider');
  }
  return context;
};

interface DfnsProviderProps {
  children: ReactNode;
  autoInitialize?: boolean; // Only initialize when explicitly requested
}

export const DfnsProvider: React.FC<DfnsProviderProps> = ({ 
  children, 
  autoInitialize = false 
}) => {
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeDfns = async () => {
    if (isInitialized || isInitializing) {
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);

      console.log('🔄 Initializing DFNS service on demand...');
      
      const service = await initializeDfnsService();
      
      setDfnsService(service);
      setIsInitialized(true);
      
      // Get status for logging
      const status = await service.getAuthenticationStatusAsync();
      console.log('🎯 DFNS Service Initialized on Demand:', {
        authenticated: status.isAuthenticated,
        method: status.methodDisplayName,
        wallets: status.walletsCount,
        credentials: status.credentialsCount
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown DFNS initialization error';
      setError(errorMessage);
      console.warn('⚠️ DFNS Service initialization failed:', errorMessage);
      console.log('📝 DFNS will continue in limited mode');
    } finally {
      setIsInitializing(false);
    }
  };

  // Auto-initialize only if explicitly requested
  useEffect(() => {
    if (autoInitialize) {
      initializeDfns();
    }
  }, [autoInitialize]);

  const contextValue: DfnsContextType = {
    dfnsService,
    isInitialized,
    isInitializing,
    error,
    initializeDfns
  };

  return (
    <DfnsContext.Provider value={contextValue}>
      {children}
    </DfnsContext.Provider>
  );
};

/**
 * Conditional DFNS Route Wrapper
 * 
 * Similar to WagmiRouteWrapper - only provides DFNS context on specific routes
 */
interface ConditionalDfnsWrapperProps {
  children: ReactNode;
}

export const ConditionalDfnsWrapper: React.FC<ConditionalDfnsWrapperProps> = ({ children }) => {
  const currentPath = window.location.pathname;
  
  // Define routes that need DFNS
  const dfnsRoutes = [
    '/wallet/dfns',
    '/mobile-auth'
  ];
  
  const needsDfns = dfnsRoutes.some(route => currentPath.startsWith(route));
  
  if (needsDfns) {
    return (
      <DfnsProvider autoInitialize={true}>
        {children}
      </DfnsProvider>
    );
  }
  
  // For non-DFNS routes, provide a minimal context
  return (
    <DfnsProvider autoInitialize={false}>
      {children}
    </DfnsProvider>
  );
};
