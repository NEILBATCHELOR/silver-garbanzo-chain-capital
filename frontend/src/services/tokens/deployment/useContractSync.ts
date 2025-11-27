/**
 * useContractSync Hook
 * 
 * React hook for synchronizing contract_masters database with 
 * deployed contracts from hoodi-complete.json
 */

import { useState, useCallback } from 'react';
import { ContractSyncService, SyncResult } from '@/services/tokens/deployment/ContractSyncService';

// Import the deployment data directly
import hoodiDeployment from '../../../../foundry-contracts/deployments/hoodi-complete.json';

interface UseSyncState {
  isLoading: boolean;
  result: SyncResult | null;
  error: string | null;
}

/**
 * ABI Loader - loads ABI from foundry output via dynamic import
 */
async function loadABI(abiPath: string): Promise<any> {
  try {
    // Dynamic import of ABI files from foundry output
    const abiModule = await import(`../../../../foundry-contracts/out/${abiPath}`);
    return abiModule.default || abiModule;
  } catch (err) {
    console.warn(`Failed to load ABI: ${abiPath}`, err);
    return null;
  }
}

export function useContractSync() {
  const [state, setState] = useState<UseSyncState>({
    isLoading: false,
    result: null,
    error: null,
  });
  
  const sync = useCallback(async () => {
    setState({ isLoading: true, result: null, error: null });
    
    try {
      const result = await ContractSyncService.syncFromDeployment(
        hoodiDeployment,
        loadABI
      );
      
      setState({
        isLoading: false,
        result,
        error: result.success ? null : 'Sync completed with errors',
      });
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState({
        isLoading: false,
        result: null,
        error: errorMsg,
      });
      throw err;
    }
  }, []);
  
  const verify = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const verification = await ContractSyncService.verifySync(hoodiDeployment);
      setState(prev => ({ ...prev, isLoading: false }));
      return verification;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      throw err;
    }
  }, []);
  
  const getDeploymentData = useCallback(() => {
    return hoodiDeployment;
  }, []);
  
  const getContractMapping = useCallback(() => {
    return ContractSyncService.getContractAbiMap();
  }, []);
  
  return {
    ...state,
    sync,
    verify,
    getDeploymentData,
    getContractMapping,
  };
}

export default useContractSync;
