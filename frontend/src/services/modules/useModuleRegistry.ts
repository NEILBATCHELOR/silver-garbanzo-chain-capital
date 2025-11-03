// React Hook for Module Registry
// Provides automatic module selection and address resolution in forms

import { useState, useEffect } from 'react';
import { ModuleRegistryService, ModuleSelection } from '@/services/modules';

interface UseModuleRegistryProps {
  network: string;
  tokenStandard: 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400';
  environment?: string;
}

export interface UseModuleRegistryResult {
  selection: ModuleSelection;
  availableFeatures: string[];
  isLoading: boolean;
  error: string | null;
  toggleFeature: (feature: keyof ModuleSelection) => void;
  getResolvedAddresses: () => Promise<ModuleSelection['resolvedAddresses']>;
}

/**
 * Hook for managing module selection and automatic address resolution
 * 
 * Usage in forms:
 * ```tsx
 * const { selection, toggleFeature, getResolvedAddresses } = useModuleRegistry({
 *   network: 'hoodi',
 *   tokenStandard: 'erc20'
 * });
 * 
 * // User toggles a feature
 * <Switch checked={selection.compliance} onCheckedChange={() => toggleFeature('compliance')} />
 * 
 * // On deploy, resolve addresses automatically
 * const addresses = await getResolvedAddresses();
 * ```
 */
export function useModuleRegistry({
  network,
  tokenStandard,
  environment = 'testnet'
}: UseModuleRegistryProps): UseModuleRegistryResult {
  const [selection, setSelection] = useState<ModuleSelection>({});
  const [availableFeatures, setAvailableFeatures] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available features on mount
  useEffect(() => {
    loadAvailableFeatures();
  }, [network, tokenStandard, environment]);

  const loadAvailableFeatures = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const features = await ModuleRegistryService.getAvailableFeatures(
        tokenStandard,
        network,
        environment
      );
      setAvailableFeatures(features);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load available features';
      setError(message);
      console.error('Failed to load module features:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = (feature: keyof ModuleSelection) => {
    setSelection(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const getResolvedAddresses = async (): Promise<ModuleSelection['resolvedAddresses']> => {
    try {
      const resolved = await ModuleRegistryService.resolveModuleAddresses(
        selection,
        network,
        tokenStandard,
        environment
      );
      return resolved;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve module addresses';
      setError(message);
      throw new Error(message);
    }
  };

  return {
    selection,
    availableFeatures,
    isLoading,
    error,
    toggleFeature,
    getResolvedAddresses
  };
}
