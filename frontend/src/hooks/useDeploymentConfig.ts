/**
 * useDeploymentConfig - Hook for managing dynamic deployment configuration
 * 
 * Fetches role addresses from project wallets and manages deployment settings
 */

import { useState, useEffect } from 'react';
import { projectWalletService, DeploymentConfig } from '@/services/project-wallets';
import { useToast } from '@/components/ui/use-toast';

interface UseDeploymentConfigOptions {
  projectId: string | null;
  chain: string;
  gasPrice: string;  // Required - should come from UI or estimator
  gasLimit: number;  // Required - should come from UI or estimator
}

interface UseDeploymentConfigReturn {
  config: DeploymentConfig | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  updateGasConfig: (gasPrice?: string, gasLimit?: number) => void;
  saveContractAddresses: (addresses: { policyEngine?: string; token?: string }) => Promise<void>;
}

export function useDeploymentConfig({
  projectId,
  chain,
  gasPrice,
  gasLimit
}: UseDeploymentConfigOptions): UseDeploymentConfigReturn {
  const [config, setConfig] = useState<DeploymentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConfig = async () => {
    if (!projectId) {
      setError('Project ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const deploymentConfig = await projectWalletService.getDeploymentConfig(
        projectId,
        chain,
        gasPrice,
        gasLimit
      );

      setConfig(deploymentConfig);

      // Show warning if no role addresses are configured
      if (!deploymentConfig.roleAddresses.admin && 
          !deploymentConfig.roleAddresses.deployer) {
        toast({
          title: "No Wallet Addresses Found",
          description: "Please configure project wallets before deployment",
          variant: "destructive"
        });
      }

    } catch (err) {
      console.error('Error fetching deployment config:', err);
      setError('Failed to load deployment configuration');
      toast({
        title: "Configuration Error",
        description: "Failed to load deployment settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGasConfig = (newGasPrice?: string, newGasLimit?: number) => {
    if (config) {
      setConfig({
        ...config,
        gasConfig: {
          gasPrice: newGasPrice || config.gasConfig.gasPrice,
          gasLimit: newGasLimit || config.gasConfig.gasLimit
        }
      });
    }
  };

  const saveContractAddresses = async (addresses: { policyEngine?: string; token?: string }) => {
    if (!projectId) return;

    try {
      await projectWalletService.saveContractAddresses(projectId, chain, addresses);
      
      // Update local config
      if (config) {
        setConfig({
          ...config,
          contractAddresses: {
            ...config.contractAddresses,
            ...addresses
          }
        });
      }

      toast({
        title: "Contract Addresses Saved",
        description: "Deployment addresses have been saved successfully",
      });
    } catch (err) {
      console.error('Error saving contract addresses:', err);
      toast({
        title: "Save Failed",
        description: "Failed to save contract addresses",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [projectId, chain]);

  return {
    config,
    loading,
    error,
    refreshConfig: fetchConfig,
    updateGasConfig,
    saveContractAddresses
  };
}
