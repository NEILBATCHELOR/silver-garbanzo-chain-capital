import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowRight, CheckCircle, ExternalLink, Info, Loader2, ShieldAlert, Zap } from 'lucide-react';
import BlockchainSelector from '@/components/tokens/components/BlockchainSelector';
import { NetworkEnvironment, providerManager } from '@/infrastructure/web3/ProviderManager';
import type { SupportedChain, NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BlockchainFactory } from '@/infrastructure/web3/factories/BlockchainFactory';
import { enhancedTokenDeploymentService } from '@/components/tokens/services/tokenDeploymentService';
import { unifiedTokenDeploymentService } from '@/components/tokens/services/unifiedTokenDeploymentService';

// Utility function for conditional class names
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// Define better types for token configuration
export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  standard?: string;
  initialHolderAddress?: string;
  features?: {
    isBurnable?: boolean;
    isMintable?: boolean;
    isPausable?: boolean;
    isUpgradeable?: boolean;
  };
  metadata?: Record<string, string>;
}

interface TokenDeploymentFormEnhancedProps {
  tokenConfig: TokenConfig;
  onDeploymentSuccess: (tokenAddress: string, transactionHash: string) => void;
}

const TokenDeploymentFormEnhanced: React.FC<TokenDeploymentFormEnhancedProps> = ({
  tokenConfig,
  onDeploymentSuccess
}) => {
  const [blockchain, setBlockchain] = useState<string>('polygon');
  const [environment, setEnvironment] = useState<NetworkEnvironment>(NetworkEnvironment.TESTNET);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [networkDetails, setNetworkDetails] = useState<any>(null);
  const [isProviderAvailable, setIsProviderAvailable] = useState<boolean>(true);
  const [useOptimization, setUseOptimization] = useState<boolean>(true);
  const [deploymentStrategy, setDeploymentStrategy] = useState<'auto' | 'direct' | 'chunked' | 'batched'>('auto');
  
  // Get network details when blockchain or environment changes
  React.useEffect(() => {
    try {
      const chainId = BlockchainFactory.getChainId(blockchain as SupportedChain, environment as NetworkType);
      const explorerUrl = BlockchainFactory.getExplorerUrl(blockchain as SupportedChain, environment as NetworkType);
      const networkConfig = {
        name: `${blockchain} ${environment}`,
        chainId,
        explorerUrl
      };
      setNetworkDetails(networkConfig);
    } catch (err) {
      console.error("Error getting network details:", err);
      setNetworkDetails(null);
    }
  }, [blockchain, environment]);
  
  // Check if provider is available for the selected blockchain
  React.useEffect(() => {
    try {
      const provider = providerManager.getProviderForEnvironment(blockchain as SupportedChain, environment);
      setIsProviderAvailable(!!provider);
    } catch (err) {
      console.error(`Error checking provider for ${blockchain}:`, err);
      setIsProviderAvailable(false);
    }
  }, [blockchain, environment]);
  
  const handleBlockchainChange = (value: string) => {
    setBlockchain(value);
    setValidationErrors({});
  };
  
  const handleEnvironmentChange = (value: string) => {
    setEnvironment(value as NetworkEnvironment);
    setValidationErrors({});
  };
  
  const validateInputs = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!walletAddress) {
      errors.walletAddress = 'Wallet address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      errors.walletAddress = 'Invalid Ethereum address format';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleDeploymentConfirmation = () => {
    if (validateInputs()) {
      setShowConfirmation(true);
    }
  };
  
  const handleDeploy = async () => {
    if (!validateInputs()) {
      return;
    }
    
    setShowConfirmation(false);
    
    try {
      setIsDeploying(true);
      setError(null);
      
      console.log(`Deploying token to ${blockchain} (${environment}) with optimization: ${useOptimization}`);
      
      if (useOptimization) {
        // ✅ Use unified deployment service with optimization
        const result = await unifiedTokenDeploymentService.deployToken(
          'token-id-placeholder', // You'll need to pass actual token ID
          'current-user-id', // You'll need to get from auth context
          'current-project-id', // You'll need to pass actual project ID
          {
            useOptimization: true,
            forceStrategy: deploymentStrategy,
            enableAnalytics: true
          }
        );
        
        if (result.status === 'SUCCESS') {
          console.log(`Optimized deployment successful:`, result);
          onDeploymentSuccess(result.tokenAddress || '', result.transactionHash || '');
        } else {
          throw new Error(result.error || 'Optimized deployment failed');
        }
      } else {
        // ✅ Use enhanced deployment service without optimization
        const result = await enhancedTokenDeploymentService.deployToken(
          'token-id-placeholder',
          'current-user-id',
          'current-project-id'
        );
        
        if (result.status === 'SUCCESS') {
          console.log(`Standard deployment successful:`, result);
          onDeploymentSuccess(result.tokenAddress || '', result.transactionHash || '');
        } else {
          throw new Error(result.error || 'Standard deployment failed');
        }
      }
      
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error(`Error deploying token:`, err);
      console.error(`Blockchain: ${blockchain}, Environment: ${environment}`);
      setError(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };
  
  return (
    <>
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!isProviderAvailable && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-300">Provider Not Available</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              No provider is available for the selected blockchain ({blockchain}). 
              The deployment service will attempt to use a fallback provider.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="environment">Network Environment</Label>
          <Select 
            value={environment} 
            onValueChange={handleEnvironmentChange}
            disabled={isDeploying}
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
            onChange={handleBlockchainChange}
            disabled={isDeploying}
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
        
        <Separator />
        
        {/* ✅ NEW: Optimization Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Deployment Optimization</Label>
              <p className="text-sm text-muted-foreground">
                Use advanced optimization for gas savings and reliability
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useOptimization"
                checked={useOptimization}
                onChange={(e) => setUseOptimization(e.target.checked)}
                disabled={isDeploying}
                className="rounded"
              />
              <Label htmlFor="useOptimization" className="text-sm font-medium">
                Enable Optimization
              </Label>
            </div>
          </div>
          
          {useOptimization && (
            <div className="space-y-2">
              <Label htmlFor="strategy">Deployment Strategy</Label>
              <Select 
                value={deploymentStrategy} 
                onValueChange={(value: any) => setDeploymentStrategy(value)}
                disabled={isDeploying}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect (Recommended)</SelectItem>
                  <SelectItem value="direct">Direct Deployment</SelectItem>
                  <SelectItem value="batched">Batched Deployment</SelectItem>
                  <SelectItem value="chunked">Chunked Deployment</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto-detect analyzes your token configuration and chooses the optimal strategy
              </p>
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <Label htmlFor="walletAddress" className={cn(validationErrors.walletAddress && "text-destructive")}>
            Deployment Wallet Address
          </Label>
          <Input
            id="walletAddress"
            placeholder="0x..."
            value={walletAddress}
            onChange={(e) => {
              setWalletAddress(e.target.value);
              if (validationErrors.walletAddress) {
                setValidationErrors({...validationErrors, walletAddress: ''});
              }
            }}
            disabled={isDeploying}
            className={cn(validationErrors.walletAddress && "border-destructive")}
          />
          {validationErrors.walletAddress && (
            <p className="text-xs text-destructive">{validationErrors.walletAddress}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Address that will own the deployed contract
          </p>
        </div>
        
        {/* Token Configuration Summary */}
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Token Configuration Summary
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>Name:</div>
              <div className="font-medium">{tokenConfig.name}</div>
              
              <div>Symbol:</div>
              <div className="font-medium">{tokenConfig.symbol}</div>
              
              <div>Standard:</div>
              <div className="font-medium">{tokenConfig.standard || 'ERC-20'}</div>
              
              <div>Decimals:</div>
              <div className="font-medium">{tokenConfig.decimals}</div>
              
              <div>Total Supply:</div>
              <div className="font-medium">{tokenConfig.totalSupply}</div>
              
              {tokenConfig.features && (
                <>
                  <div>Features:</div>
                  <div className="font-medium flex flex-wrap gap-1">
                    {tokenConfig.features.isBurnable && <Badge variant="secondary">Burnable</Badge>}
                    {tokenConfig.features.isMintable && <Badge variant="secondary">Mintable</Badge>}
                    {tokenConfig.features.isPausable && <Badge variant="secondary">Pausable</Badge>}
                    {tokenConfig.features.isUpgradeable && <Badge variant="secondary">Upgradeable</Badge>}
                  </div>
                </>
              )}
            </div>
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={handleDeploymentConfirmation} 
          disabled={isDeploying || !blockchain || !walletAddress}
          className="w-full"
          size="lg"
        >
          {isDeploying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {useOptimization ? 'Optimizing & Deploying...' : 'Deploying...'}
            </>
          ) : (
            <>
              {useOptimization ? (
                <Zap className="mr-2 h-4 w-4" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {useOptimization ? 'Deploy with Optimization' : 'Deploy Token'}
            </>
          )}
        </Button>
      </div>
      
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Token Deployment</DialogTitle>
            <DialogDescription>
              You are about to deploy a token to {networkDetails?.name || blockchain}. This action cannot be undone.
              {environment === NetworkEnvironment.MAINNET && (
                <p className="text-red-500 mt-2">
                  Warning: You are deploying to MAINNET. This will incur real costs.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-2 text-sm py-4">
            <div className="font-medium">Token Name:</div>
            <div>{tokenConfig.name}</div>
            
            <div className="font-medium">Symbol:</div>
            <div>{tokenConfig.symbol}</div>
            
            <div className="font-medium">Standard:</div>
            <div>{tokenConfig.standard || 'ERC-20'}</div>
            
            <div className="font-medium">Total Supply:</div>
            <div>{tokenConfig.totalSupply}</div>
            
            <div className="font-medium">Network:</div>
            <div>{networkDetails?.name || blockchain}</div>
            
            <div className="font-medium">Optimization:</div>
            <div className="flex items-center">
              {useOptimization ? (
                <>
                  <Zap className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">Enabled ({deploymentStrategy})</span>
                </>
              ) : (
                <span className="text-gray-600">Disabled</span>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>Cancel</Button>
            <Button onClick={handleDeploy}>
              {useOptimization ? 'Optimize & Deploy' : 'Deploy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TokenDeploymentFormEnhanced;
