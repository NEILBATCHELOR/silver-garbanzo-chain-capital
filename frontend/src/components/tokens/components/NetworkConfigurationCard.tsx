import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, ShieldAlert, Info } from 'lucide-react';
import BlockchainSelector from '@/components/tokens/components/BlockchainSelector';
import { NetworkEnvironment, providerManager } from '@/infrastructure/web3/ProviderManager';
import { BlockchainFactory } from '@/infrastructure/web3/factories/BlockchainFactory';
import type { SupportedChain, NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

export interface NetworkConfiguration {
  blockchain: string;
  environment: NetworkEnvironment;
}

interface NetworkConfigurationCardProps {
  blockchain: string;
  environment: NetworkEnvironment;
  onBlockchainChange: (blockchain: string) => void;
  onEnvironmentChange: (environment: NetworkEnvironment) => void;
  disabled?: boolean;
}

/**
 * Network Configuration Card
 * 
 * Handles blockchain and environment selection for token deployment.
 * Displays network details, provider availability, and mainnet warnings.
 * 
 * @component
 */
export const NetworkConfigurationCard: React.FC<NetworkConfigurationCardProps> = React.memo(({
  blockchain,
  environment,
  onBlockchainChange,
  onEnvironmentChange,
  disabled = false
}) => {
  const [isProviderAvailable, setIsProviderAvailable] = useState(true);
  
  // Get network details
  const networkDetails = useMemo(() => {
    try {
      const chainId = BlockchainFactory.getChainId(blockchain as SupportedChain, environment as NetworkType);
      const explorerUrl = BlockchainFactory.getExplorerUrl(blockchain as SupportedChain, environment as NetworkType);
      
      return {
        name: `${blockchain} ${environment}`,
        chainId,
        explorerUrl
      };
    } catch (err) {
      console.error("Error getting network details:", err);
      return null;
    }
  }, [blockchain, environment]);
  
  // Check provider availability
  useEffect(() => {
    try {
      const provider = providerManager.getProviderForEnvironment(
        blockchain as SupportedChain, 
        environment
      );
      setIsProviderAvailable(!!provider);
    } catch (err) {
      console.error(`Error checking provider for ${blockchain}:`, err);
      setIsProviderAvailable(false);
    }
  }, [blockchain, environment]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Network Configuration
        </CardTitle>
        <CardDescription>
          Select the blockchain network and environment for deployment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isProviderAvailable && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-300">
              Provider Not Available
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              No provider is available for the selected blockchain ({blockchain}). 
              The deployment service will attempt to use a fallback provider.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="environment">Network Environment</Label>
            <Select 
              value={environment} 
              onValueChange={onEnvironmentChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NetworkEnvironment.TESTNET}>Testnet</SelectItem>
                <SelectItem value={NetworkEnvironment.MAINNET}>Mainnet</SelectItem>
              </SelectContent>
            </Select>
            
            {environment === NetworkEnvironment.MAINNET && (
              <Alert variant="destructive" className="mt-2">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  You are deploying to MAINNET. This will incur real costs.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="blockchain">Blockchain Network</Label>
            <BlockchainSelector
              value={blockchain}
              onChange={onBlockchainChange}
              disabled={disabled}
            />
            
            {networkDetails && (
              <div className="mt-2 text-sm flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {networkDetails.name}
                </Badge>
                {networkDetails.chainId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center text-muted-foreground">
                          <Info className="h-3 w-3 mr-1" />
                          Chain ID: {networkDetails.chainId}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Network Chain ID</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

NetworkConfigurationCard.displayName = 'NetworkConfigurationCard';
