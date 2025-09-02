import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  AlertCircle, 
  ArrowRight, 
  CheckCircle, 
  ExternalLink, 
  Info, 
  Loader2, 
  ShieldAlert, 
  Zap, 
  Wallet, 
  Plus, 
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Wand2
} from 'lucide-react';
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
import { tokenProjectWalletIntegrationService, TokenWalletIntegrationResult } from '@/services/token/tokenProjectWalletIntegrationService';
import { useToast } from '@/components/ui/use-toast';

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

interface TokenDeploymentFormProjectWalletIntegratedProps {
  tokenConfig: TokenConfig;
  projectId: string;
  projectName?: string;
  onDeploymentSuccess: (tokenAddress: string, transactionHash: string) => void;
}

const TokenDeploymentFormProjectWalletIntegrated: React.FC<TokenDeploymentFormProjectWalletIntegratedProps> = ({
  tokenConfig,
  projectId,
  projectName = 'Chain Capital Project',
  onDeploymentSuccess
}) => {
  const { toast } = useToast();
  
  // Form state
  const [blockchain, setBlockchain] = useState<string>('polygon');
  const [environment, setEnvironment] = useState<NetworkEnvironment>(NetworkEnvironment.TESTNET);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [networkDetails, setNetworkDetails] = useState<any>(null);
  const [isProviderAvailable, setIsProviderAvailable] = useState<boolean>(true);
  
  // Optimization options
  const [useOptimization, setUseOptimization] = useState<boolean>(true);
  const [deploymentStrategy, setDeploymentStrategy] = useState<'auto' | 'direct' | 'chunked' | 'batched'>('auto');
  
  // Wallet integration state
  const [walletIntegrationMode, setWalletIntegrationMode] = useState<'auto' | 'manual'>('auto');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletPrivateKey, setWalletPrivateKey] = useState<string>('');
  const [walletResult, setWalletResult] = useState<TokenWalletIntegrationResult | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedPrivateKey, setCopiedPrivateKey] = useState<boolean>(false);
  
  // Get network details when blockchain or environment changes
  useEffect(() => {
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
  useEffect(() => {
    try {
      const provider = providerManager.getProviderForEnvironment(blockchain as SupportedChain, environment);
      setIsProviderAvailable(!!provider);
    } catch (err) {
      console.error(`Error checking provider for ${blockchain}:`, err);
      setIsProviderAvailable(false);
    }
  }, [blockchain, environment]);
  
  // Auto-load wallet when blockchain changes and in auto mode
  useEffect(() => {
    if (walletIntegrationMode === 'auto') {
      loadWalletForNetwork();
    }
  }, [blockchain, walletIntegrationMode]);
  
  /**
   * Load wallet for selected network
   */
  const loadWalletForNetwork = async () => {
    setIsLoadingWallet(true);
    setError(null);
    
    try {
      const result = await tokenProjectWalletIntegrationService.getOrCreateWalletForDeployment({
        projectId,
        projectName,
        projectType: 'tokenization',
        network: blockchain,
        forceNew: false,
        includePrivateKey: true,
        includeMnemonic: true
      });
      
      setWalletResult(result);
      
      if (result.success) {
        setWalletAddress(result.walletAddress);
        setWalletPrivateKey(result.privateKey || '');
        
        if (result.isNewWallet) {
          toast({
            title: "New Wallet Created",
            description: `Created new ${blockchain} wallet for deployment`,
            variant: "default",
          });
        } else {
          toast({
            title: "Existing Wallet Found",
            description: `Using existing ${blockchain} wallet for deployment`,
            variant: "default",
          });
        }
      } else {
        setError(result.error || 'Failed to load wallet');
        setWalletAddress('');
        setWalletPrivateKey('');
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      setError(error instanceof Error ? error.message : 'Failed to load wallet');
      setWalletAddress('');
      setWalletPrivateKey('');
    } finally {
      setIsLoadingWallet(false);
    }
  };
  
  /**
   * Generate new wallet for network
   */
  const generateNewWallet = async () => {
    setIsLoadingWallet(true);
    setError(null);
    
    try {
      const result = await tokenProjectWalletIntegrationService.getOrCreateWalletForDeployment({
        projectId,
        projectName,
        projectType: 'tokenization',
        network: blockchain,
        forceNew: true, // Force new wallet generation
        includePrivateKey: true,
        includeMnemonic: true
      });
      
      setWalletResult(result);
      
      if (result.success) {
        setWalletAddress(result.walletAddress);
        setWalletPrivateKey(result.privateKey || '');
        
        toast({
          title: "New Wallet Generated",
          description: `Generated fresh ${blockchain} wallet for deployment`,
          variant: "default",
        });
      } else {
        setError(result.error || 'Failed to generate wallet');
      }
    } catch (error) {
      console.error('Error generating wallet:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate wallet');
    } finally {
      setIsLoadingWallet(false);
    }
  };
  
  /**
   * Copy text to clipboard
   */
  const copyToClipboard = async (text: string, type: 'address' | 'privateKey') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'address') {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedPrivateKey(true);
        setTimeout(() => setCopiedPrivateKey(false), 2000);
      }
      
      toast({
        title: "Copied to clipboard",
        description: `${type === 'address' ? 'Wallet address' : 'Private key'} copied`,
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };
  
  const handleBlockchainChange = (value: string) => {
    setBlockchain(value);
    setValidationErrors({});
    // Reset wallet state when changing blockchain
    setWalletResult(null);
    if (walletIntegrationMode === 'manual') {
      setWalletAddress('');
      setWalletPrivateKey('');
    }
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
      console.log(`Using wallet: ${walletAddress}`);
      
      if (useOptimization) {
        // ✅ Use unified deployment service with optimization
        // Note: Wallet information is handled internally by the deployment service
        // through the tokenProjectWalletIntegrationService that was called earlier
        const result = await unifiedTokenDeploymentService.deployToken(
          'token-id-placeholder', // You'll need to pass actual token ID
          'current-user-id', // You'll need to get from auth context
          projectId,
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
          projectId
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
      <div className="space-y-6">
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
        
        {/* Network Configuration Section */}
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>
        
        {/* Wallet Integration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Deployment Wallet
            </CardTitle>
            <CardDescription>
              Configure the wallet that will deploy and own the token contract
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wallet Integration Mode Selector */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-base">Automatic Wallet Management</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create and manage project wallets for deployment
                </p>
              </div>
              <Switch
                checked={walletIntegrationMode === 'auto'}
                onCheckedChange={(checked) => {
                  setWalletIntegrationMode(checked ? 'auto' : 'manual');
                  if (checked) {
                    loadWalletForNetwork();
                  } else {
                    setWalletAddress('');
                    setWalletPrivateKey('');
                    setWalletResult(null);
                  }
                }}
                disabled={isDeploying}
              />
            </div>
            
            {walletIntegrationMode === 'auto' ? (
              // Automatic Wallet Management
              <div className="space-y-4">
                {isLoadingWallet ? (
                  <div className="flex items-center justify-center p-6 bg-muted/20 rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading wallet for {blockchain}...</span>
                  </div>
                ) : walletResult && walletResult.success ? (
                  // Wallet successfully loaded
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">
                          {walletResult.isNewWallet ? 'New wallet created' : 'Existing wallet found'}
                        </span>
                        <Badge variant={walletResult.isNewWallet ? "default" : "secondary"}>
                          {walletResult.network}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadWalletForNetwork}
                          disabled={isLoadingWallet || isDeploying}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Refresh
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateNewWallet}
                          disabled={isLoadingWallet || isDeploying}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          New
                        </Button>
                      </div>
                    </div>
                    
                    {/* Wallet Address Display */}
                    <div className="space-y-2">
                      <Label>Wallet Address</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={walletAddress}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(walletAddress, 'address')}
                        >
                          {copiedAddress ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Private Key Display (Optional) */}
                    {walletPrivateKey && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Private Key (Secure)</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                          >
                            {showPrivateKey ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type={showPrivateKey ? "text" : "password"}
                            value={walletPrivateKey}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(walletPrivateKey, 'privateKey')}
                          >
                            {copiedPrivateKey ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Keep this private key secure. It controls access to your wallet.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // No wallet or error
                  <div className="flex items-center justify-center p-6 bg-muted/20 rounded-lg">
                    <div className="text-center">
                      <AlertCircle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {walletResult?.error || 'Failed to load wallet'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadWalletForNetwork}
                        className="mt-2"
                        disabled={isLoadingWallet || isDeploying}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Manual Wallet Entry
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
            )}
          </CardContent>
        </Card>
        
        {/* Optimization Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Deployment Optimization
            </CardTitle>
            <CardDescription>
              Configure deployment optimization and gas saving strategies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-base">Enable Optimization</Label>
                <p className="text-sm text-muted-foreground">
                  Use advanced optimization for gas savings and reliability
                </p>
              </div>
              <Switch
                checked={useOptimization}
                onCheckedChange={setUseOptimization}
                disabled={isDeploying}
              />
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
          </CardContent>
        </Card>
        
        {/* Token Configuration Summary */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Token Configuration Summary</AlertTitle>
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
        
        {/* Deploy Button */}
        <Button 
          onClick={handleDeploymentConfirmation} 
          disabled={isDeploying || !blockchain || !walletAddress || isLoadingWallet}
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
      
      {/* Confirmation Dialog */}
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
            
            <div className="font-medium">Wallet:</div>
            <div className="font-mono text-xs">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</div>
            
            <div className="font-medium">Wallet Mode:</div>
            <div className="flex items-center">
              {walletIntegrationMode === 'auto' ? (
                <>
                  <Wallet className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">Auto ({walletResult?.isNewWallet ? 'New' : 'Existing'})</span>
                </>
              ) : (
                <span className="text-gray-600">Manual</span>
              )}
            </div>
            
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

export default TokenDeploymentFormProjectWalletIntegrated;