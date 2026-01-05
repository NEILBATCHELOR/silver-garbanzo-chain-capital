/**
 * Trade Finance Context Provider
 * 
 * Provides project-scoped context for all trade finance features.
 * Supports multi-tenant architecture for institutional use.
 * 
 * Benefits:
 * - No prop drilling through components
 * - Type-safe context access
 * - Consistent project scope across all trade finance features
 * - Dynamic project switching via dropdown selector
 * - Easy to extend with additional context values
 */

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService';

/**
 * Trade Finance Context Value
 * 
 * Core context values available to all trade finance components.
 * Can be extended with additional values as needed (selectedNetwork, userPermissions, etc.)
 */
interface TradeFinanceContextValue {
  /** Current project ID for trade finance operations */
  projectId: string;
  /** Update the selected project ID */
  setProjectId: (projectId: string) => void;
  /** Loading state while fetching initial project */
  isLoading: boolean;
}

/**
 * Trade Finance Context
 * 
 * Context instance - should not be used directly.
 * Use useTradeFinance() hook instead.
 */
const TradeFinanceContext = createContext<TradeFinanceContextValue | undefined>(undefined);

/**
 * Trade Finance Provider Props
 */
interface TradeFinanceProviderProps {
  /** Initial project ID (optional - will auto-detect primary project if not provided) */
  initialProjectId?: string;
  /** Child components */
  children: ReactNode;
}

/**
 * Trade Finance Provider Component
 * 
 * Wraps trade finance routes to provide project context with dynamic project selection.
 * Automatically loads the primary project if no initial project is provided.
 * 
 * @example
 * ```tsx
 * <TradeFinanceProvider>
 *   <Routes>
 *     <Route path="marketplace" element={<MarketplaceDashboard />} />
 *     <Route path="supply" element={<SupplyPage />} />
 *   </Routes>
 * </TradeFinanceProvider>
 * ```
 */
export function TradeFinanceProvider({ initialProjectId, children }: TradeFinanceProviderProps) {
  const [projectId, setProjectId] = useState<string>(initialProjectId || '');
  const [isLoading, setIsLoading] = useState(!initialProjectId);

  // Load primary project if no initial project ID provided
  useEffect(() => {
    if (!initialProjectId) {
      loadPrimaryProject();
    }
  }, [initialProjectId]);

  const loadPrimaryProject = async () => {
    try {
      setIsLoading(true);
      const project = await getPrimaryOrFirstProject();
      
      if (project) {
        setProjectId(project.id);
      } else {
        // Fallback to a default project ID if no projects found
        setProjectId('trade-finance-default');
        console.warn('No projects found, using default trade finance project ID');
      }
    } catch (error) {
      console.error('Error loading primary project:', error);
      setProjectId('trade-finance-default');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TradeFinanceContext.Provider value={{ projectId, setProjectId, isLoading }}>
      {children}
    </TradeFinanceContext.Provider>
  );
}

/**
 * Use Trade Finance Context Hook
 * 
 * Access trade finance context values.
 * Must be used within TradeFinanceProvider.
 * 
 * @throws Error if used outside TradeFinanceProvider
 * 
 * @example
 * ```tsx
 * function MarketplaceDashboard() {
 *   const { projectId } = useTradeFinance();
 *   const marketplaceService = createMarketplaceService(projectId);
 *   // ...
 * }
 * ```
 */
export function useTradeFinance() {
  const context = useContext(TradeFinanceContext);
  
  if (!context) {
    throw new Error(
      'useTradeFinance must be used within TradeFinanceProvider. ' +
      'Wrap your trade finance routes with <TradeFinanceProvider>.'
    );
  }
  
  return context;
}
