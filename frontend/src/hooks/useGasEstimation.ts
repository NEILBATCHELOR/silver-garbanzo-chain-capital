import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import type { EIP1559FeeData } from '@/components/tokens/components/transactions/GasEstimatorEIP1559';

export interface GasConfiguration {
  mode: 'estimator' | 'manual';
  gasPrice: string;
  gasLimit: number;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  isEIP1559: boolean;
}

/**
 * Hook to manage gas configuration and estimation
 * 
 * Provides gas configuration state and handlers for manual/automatic modes.
 * Automatically determines if network supports EIP-1559.
 * 
 * @param blockchain - Current blockchain network
 * @param provider - Ethers provider for the network
 * @returns Object containing gas config, handlers, and estimation data
 * 
 * @example
 * ```tsx
 * const { 
 *   gasConfig, 
 *   updateGasConfig, 
 *   handleGasEstimate,
 *   estimatedData 
 * } = useGasEstimation('polygon', provider);
 * ```
 */
export const useGasEstimation = (
  blockchain: string,
  provider: ethers.Provider | null
) => {
  const [gasConfig, setGasConfig] = useState<GasConfiguration>({
    mode: 'estimator',
    gasPrice: '20',
    gasLimit: 3000000,
    isEIP1559: false
  });
  
  const [estimatedData, setEstimatedData] = useState<EIP1559FeeData | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  
  // Get network-specific gas recommendations
  const getGasRecommendation = useCallback(() => {
    const recommendations: Record<string, { price: string; limit: number; note: string }> = {
      ethereum: { price: '20-50', limit: 3000000, note: 'Mainnet: 20-50 Gwei typical' },
      polygon: { price: '30-100', limit: 3000000, note: 'Polygon: 30-100 Gwei typical' },
      base: { price: '1-5', limit: 3000000, note: 'Base: 1-5 Gwei typical' },
      arbitrum: { price: '1-5', limit: 3000000, note: 'Arbitrum: 1-5 Gwei typical' },
      optimism: { price: '1-5', limit: 3000000, note: 'Optimism: 1-5 Gwei typical' },
      avalanche: { price: '25-50', limit: 3000000, note: 'Avalanche: 25-50 Gwei typical' },
      bsc: { price: '3-5', limit: 3000000, note: 'BSC: 3-5 Gwei typical' }
    };
    
    return recommendations[blockchain] || { price: '20', limit: 3000000, note: 'Default: 20 Gwei' };
  }, [blockchain]);
  
  // Handle gas estimation updates from GasEstimatorEIP1559 component
  const handleGasEstimate = useCallback((feeData: EIP1559FeeData, isManualMode: boolean = false) => {
    console.log('🔧 [useGasEstimation] handleGasEstimate called:', {
      isManualMode,
      currentMode: gasConfig.mode,
      feeData: {
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      }
    });
    
    setEstimatedData(feeData);
    
    // Determine if network supports EIP-1559
    const supportsEIP1559 = !!(feeData.maxFeePerGas && feeData.maxPriorityFeePerGas);
    
    // If gas estimator is in advanced mode, switch to manual mode and use manual values
    if (isManualMode) {
      console.log('⚠️ [Gas Estimation] Estimator in advanced mode - switching to manual mode');
      
      if (supportsEIP1559) {
        const maxFeeGwei = (Number(feeData.maxFeePerGas) / 1e9).toFixed(2);
        const priorityFeeGwei = (Number(feeData.maxPriorityFeePerGas) / 1e9).toFixed(2);
        
        console.log('✅ [Gas Estimation] Setting manual EIP-1559 values:', {
          maxFeePerGas: maxFeeGwei,
          maxPriorityFeePerGas: priorityFeeGwei
        });
        
        setGasConfig(prev => {
          const newConfig = {
            ...prev,
            mode: 'manual' as const, // 🔥 FIX: Set mode to 'manual' to prevent automatic overwrites
            maxFeePerGas: maxFeeGwei,
            maxPriorityFeePerGas: priorityFeeGwei,
            gasPrice: maxFeeGwei,
            isEIP1559: true
          };
          
          console.log('🔧 [useGasEstimation] State update - manual mode:', {
            old: prev,
            new: newConfig
          });
          
          return newConfig;
        });
      }
      return;
    }
    
    // Only auto-update if in estimator mode OR if explicitly switching from manual to automatic
    // (isManualMode=false signals the user disabled advanced mode)
    if (gasConfig.mode === 'manual' && isManualMode !== false) {
      console.log('⚠️ [Gas Estimation] Skipping auto-update - user in manual mode');
      return;
    }
    
    if (supportsEIP1559) {
      // EIP-1559 network
      const maxFeeGwei = (Number(feeData.maxFeePerGas) / 1e9).toFixed(2);
      const priorityFeeGwei = (Number(feeData.maxPriorityFeePerGas) / 1e9).toFixed(2);
      
      // If switching back from manual to automatic, log it
      if (gasConfig.mode === 'manual' && isManualMode === false) {
        console.log('🔄 [Gas Estimation] User switched back to automatic mode - updating with automatic values');
      } else {
        console.log('🤖 [Gas Estimation] Auto-updating EIP-1559 gas settings');
      }
      
      setGasConfig(prev => {
        const newConfig = {
          ...prev,
          mode: 'estimator' as const, // Always set to estimator when applying automatic values
          maxFeePerGas: maxFeeGwei,
          maxPriorityFeePerGas: priorityFeeGwei,
          gasPrice: maxFeeGwei,
          isEIP1559: true
        };
        
        console.log('🔧 [useGasEstimation] State update - automatic mode:', {
          old: prev,
          new: newConfig
        });
        
        return newConfig;
      });
    } else {
      // Legacy network
      if (feeData.gasPrice) {
        const gasPriceGwei = (Number(feeData.gasPrice) / 1e9).toFixed(2);
        
        if (gasConfig.mode === 'manual' && isManualMode === false) {
          console.log('🔄 [Gas Estimation] User switched back to automatic mode - updating with automatic values');
        }
        
        setGasConfig(prev => {
          const newConfig = {
            ...prev,
            mode: 'estimator' as const, // Always set to estimator when applying automatic values
            gasPrice: gasPriceGwei,
            isEIP1559: false
          };
          
          console.log('🔧 [useGasEstimation] State update - automatic legacy:', {
            old: prev,
            new: newConfig
          });
          
          return newConfig;
        });
      }
    }
  }, [gasConfig.mode]);
  
  // Update gas configuration
  const updateGasConfig = useCallback((updates: Partial<GasConfiguration>) => {
    setGasConfig(prev => ({
      ...prev,
      ...updates
    }));
  }, []);
  
  // Manual gas price change - switches to manual mode
  const handleGasPriceChange = useCallback((value: string) => {
    setGasConfig(prev => ({
      ...prev,
      gasPrice: value,
      mode: 'manual'
    }));
  }, []);
  
  // Manual gas limit change - switches to manual mode
  const handleGasLimitChange = useCallback((value: number) => {
    setGasConfig(prev => ({
      ...prev,
      gasLimit: value,
      mode: 'manual'
    }));
  }, []);
  
  // Manual max fee per gas change - switches to manual mode
  const handleMaxFeePerGasChange = useCallback((value: string) => {
    setGasConfig(prev => ({
      ...prev,
      maxFeePerGas: value,
      mode: 'manual'
    }));
  }, []);
  
  // Manual max priority fee per gas change - switches to manual mode
  const handleMaxPriorityFeePerGasChange = useCallback((value: string) => {
    setGasConfig(prev => ({
      ...prev,
      maxPriorityFeePerGas: value,
      mode: 'manual'
    }));
  }, []);
  
  return {
    gasConfig,
    estimatedData,
    isEstimating,
    updateGasConfig,
    handleGasEstimate,
    handleGasPriceChange,
    handleGasLimitChange,
    handleMaxFeePerGasChange,
    handleMaxPriorityFeePerGasChange,
    getGasRecommendation
  };
};
