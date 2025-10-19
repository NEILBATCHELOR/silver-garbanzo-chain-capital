import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Wallet, 
  Shield, 
  Copy, 
  Eye, 
  EyeOff, 
  Plus, 
  CheckCircle, 
  AlertTriangle,
  Network,
  Key,
  RefreshCw,
  ShieldAlert,
  Users,
  MinusCircle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProjectWalletResult, enhancedProjectWalletService } from '@/services/project/project-wallet-service';
import { multiSigTransactionService } from '@/services/wallet/multiSig/MultiSigTransactionService';
import { 
  getAllChains, 
  getChainConfig, 
  getChainEnvironments, 
  getChainEnvironment,
  type ChainConfig,
  type NetworkEnvironment 
} from '@/config/chains';

// Module-level lock to prevent concurrent wallet generation for the same project
const inProgressProjectGenerations = new Set<string>();

import { useAuth } from "@/hooks/auth/useAuth";
import { usePermissionsContext } from "@/hooks/auth/usePermissions";

interface ProjectWalletGeneratorProps {
  projectId: string;
  projectName: string;
  projectType: string;
  onWalletGenerated?: (wallet: ProjectWalletResult) => void;
}

export const ProjectWalletGenerator: React.FC<ProjectWalletGeneratorProps> = ({
  projectId,
  projectName,
  projectType,
  onWalletGenerated
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissionsContext();
  const [selectedNetwork, setSelectedNetwork] = useState<string>('ethereum');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWallets, setGeneratedWallets] = useState<ProjectWalletResult[]>([]);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [includePrivateKey, setIncludePrivateKey] = useState(true);
  const [includeMnemonic, setIncludeMnemonic] = useState(true);
  const [multiNetworkMode, setMultiNetworkMode] = useState(false);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(['ethereum']);
  const [hasRequiredPermissions, setHasRequiredPermissions] = useState<boolean | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  
  // Multi-sig wallet state
  const [createMultiSig, setCreateMultiSig] = useState(false);
  const [multiSigName, setMultiSigName] = useState('');
  const [multiSigOwners, setMultiSigOwners] = useState<string[]>(['', '', '']);
  const [multiSigThreshold, setMultiSigThreshold] = useState(2);
  const [generatedMultiSigAddress, setGeneratedMultiSigAddress] = useState<string | null>(null);
  
  const generationInProgressRef = useRef(false);
  const lastGenerationIdRef = useRef<string>('');
  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get all available chains
  const allChains = getAllChains();
  
  // Get available environments for the selected network
  const availableEnvironments = selectedNetwork 
    ? getChainEnvironments(selectedNetwork)
    : [];
  
  // Set default environment when network changes
  useEffect(() => {
    if (availableEnvironments.length > 0) {
      // Default to first testnet if available, otherwise first environment
      const defaultEnv = availableEnvironments.find(env => env.isTestnet) || availableEnvironments[0];
      setSelectedEnvironment(defaultEnv.name);
    } else {
      setSelectedEnvironment('');
    }
  }, [selectedNetwork, availableEnvironments.length]);

  // Check permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      setIsCheckingPermissions(true);
      if (!user) {
        setHasRequiredPermissions(false);
        setIsCheckingPermissions(false);
        return;
      }

      try {
        // Check for both required permissions
        const hasCreatePermission = await hasPermission('project.create');
        const hasEditPermission = await hasPermission('project.edit');
        
        setHasRequiredPermissions(hasCreatePermission && hasEditPermission);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasRequiredPermissions(false);
      } finally {
        setIsCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, [user, hasPermission]);

  const handleNetworkToggle = useCallback((network: string, checked: boolean) => {
    setSelectedNetworks(prev => 
      checked 
        ? [...prev, network]
        : prev.filter(n => n !== network)
    );
  }, []);

  // Multi-sig wallet helpers
  const addMultiSigOwner = useCallback(() => {
    setMultiSigOwners(prev => [...prev, '']);
  }, []);

  const removeMultiSigOwner = useCallback((index: number) => {
    if (multiSigOwners.length > 2) {
      setMultiSigOwners(prev => prev.filter((_, i) => i !== index));
      if (multiSigThreshold > multiSigOwners.length - 1) {
        setMultiSigThreshold(multiSigOwners.length - 1);
      }
    }
  }, [multiSigOwners.length, multiSigThreshold]);

  const updateMultiSigOwner = useCallback((index: number, value: string) => {
    setMultiSigOwners(prev => {
      const newOwners = [...prev];
      newOwners[index] = value;
      return newOwners;
    });
  }, []);

  const deployMultiSigWallet = useCallback(async () => {
    if (!selectedNetwork) {
      toast({
        title: "Error",
        description: "Please select a network first",
        variant: "destructive"
      });
      return;
    }

    if (!multiSigName || multiSigName.trim() === '') {
      toast({
        title: "Error",
        description: "Please enter a wallet name",
        variant: "destructive"
      });
      return;
    }

    const validOwners = multiSigOwners.filter(o => o.trim() !== '');
    if (validOwners.length < 2) {
      toast({
        title: "Error",
        description: "At least 2 owners required",
        variant: "destructive"
      });
      return;
    }

    if (multiSigThreshold < 1 || multiSigThreshold > validOwners.length) {
      toast({
        title: "Error",
        description: `Threshold must be between 1 and ${validOwners.length}`,
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedMultiSigAddress(null);

    try {
      const result = await multiSigTransactionService.deployMultiSigWallet(
        multiSigName,
        validOwners,
        multiSigThreshold,
        selectedNetwork,
        projectId
      );

      setGeneratedMultiSigAddress(result.address);
      
      toast({
        title: "Success",
        description: `Multi-sig wallet deployed at ${result.address.slice(0, 10)}...`,
      });
    } catch (error: any) {
      console.error('Error deploying multi-sig wallet:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deploy multi-sig wallet",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedNetwork, multiSigName, multiSigOwners, multiSigThreshold, projectId, toast]);

  // Generate a unique identifier for each generation request
  const generateRequestId = useCallback(() => {
    return `${projectId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, [projectId]);

  const generateSingleWallet = useCallback(async (requestId: string) => {
    if (!selectedNetwork || !selectedEnvironment) {
      toast({
        title: "Error",
        description: "Please select a network and environment first",
        variant: "destructive"
      });
      generationInProgressRef.current = false;
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to generate a wallet",
        variant: "destructive"
      });
      generationInProgressRef.current = false;
      return;
    }

    if (hasRequiredPermissions === false) {
      toast({
        title: "Permission Denied",
        description: "You need project.create and project.edit permissions to generate a wallet",
        variant: "destructive"
      });
      generationInProgressRef.current = false;
      return;
    }

    setIsGenerating(true);
    setGeneratedWallets([]);

    try {
      console.log(`[WalletGenerator] Generating single wallet for ${selectedNetwork}/${selectedEnvironment}, request: ${requestId}`);
      
      // Get the specific environment configuration
      const environment = getChainEnvironment(selectedNetwork, selectedEnvironment);
      if (!environment) {
        throw new Error(`Invalid environment: ${selectedNetwork}/${selectedEnvironment}`);
      }
      
      const result = await enhancedProjectWalletService.generateWalletForProject({
        projectId,
        projectName,
        projectType,
        network: selectedNetwork,
        networkEnvironment: environment.isTestnet ? 'testnet' : 'mainnet',
        chainId: environment.chainId,
        net: environment.net,
        includePrivateKey,
        includeMnemonic,
        userId: user.id // Pass the user ID for permission checking
      });

      if (result.success) {
        setGeneratedWallets([result]);
        
        // Notify parent component that a wallet was generated
        if (onWalletGenerated) {
          onWalletGenerated(result);
        }
        
        toast({
          title: "Success",
          description: `${environment.displayName} wallet generated successfully`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate wallet",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating wallet:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedNetwork, selectedEnvironment, projectId, projectName, projectType, includePrivateKey, includeMnemonic, onWalletGenerated, toast, user, hasRequiredPermissions]);

  const generateMultiNetworkWallets = useCallback(async (requestId: string) => {
    if (selectedNetworks.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one network",
        variant: "destructive"
      });
      generationInProgressRef.current = false;
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to generate wallets",
        variant: "destructive"
      });
      generationInProgressRef.current = false;
      return;
    }

    if (hasRequiredPermissions === false) {
      toast({
        title: "Permission Denied",
        description: "You need project.create and project.edit permissions to generate wallets",
        variant: "destructive"
      });
      generationInProgressRef.current = false;
      return;
    }

    setIsGenerating(true);
    setGeneratedWallets([]);

    try {
      console.log(`[WalletGenerator] Generating wallets for networks: ${selectedNetworks.join(', ')}, request: ${requestId}`);
      
      // For multi-network mode, use first testnet for each selected network
      const networksWithEnvironments = selectedNetworks.map(network => {
        const environments = getChainEnvironments(network);
        const defaultEnv = environments.find(env => env.isTestnet) || environments[0];
        return {
          network,
          environment: defaultEnv
        };
      });
      
      const results = await enhancedProjectWalletService.generateMultiNetworkWallets(
        {
          projectId,
          projectName,
          projectType,
          networkEnvironment: 'testnet', // Default to testnet for multi-network
          includePrivateKey,
          includeMnemonic,
          userId: user.id
        },
        networksWithEnvironments
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        const successfulWallets = results.filter(r => r.success);
        setGeneratedWallets(successfulWallets);
        
        if (onWalletGenerated) {
          onWalletGenerated(successfulWallets[0]);
        }

        toast({
          title: "Success",
          description: `Generated ${successCount} wallet${successCount > 1 ? 's' : ''} successfully${failCount > 0 ? ` (${failCount} failed)` : ''}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate any wallets",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating multi-network wallets:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedNetworks, projectId, projectName, projectType, includePrivateKey, includeMnemonic, onWalletGenerated, toast, user, hasRequiredPermissions]);

  // Enhanced duplicate prevention for the generate button
  const onGenerateClick = useCallback((isMultiNetwork: boolean) => {
    // Check if a generation is already in progress
    if (inProgressProjectGenerations.has(projectId)) {
      console.warn(`[WalletGenerator] Wallet generation already in progress for project ${projectId}.`);
      return;
    }

    if (generationInProgressRef.current) {
      console.warn('[WalletGenerator] Generation already in progress.');
      return;
    }
    
    // Generate a unique request ID
    const requestId = generateRequestId();
    
    // Check if this is the same as the last generation (double-click protection)
    if (lastGenerationIdRef.current === requestId) {
      console.log("Duplicate request ID detected - ignoring click");
      return;
    }
    
    // Update tracking
    lastGenerationIdRef.current = requestId;
    generationInProgressRef.current = true;
    inProgressProjectGenerations.add(projectId);
    
    // Clear any existing timeout
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
    }
    
    // Set a timeout to release the lock if something goes wrong
    generationTimeoutRef.current = setTimeout(() => {
      generationInProgressRef.current = false;
      console.log("Generation timeout - releasing lock");
    }, 30000); // 30 second timeout
    
    // Call the appropriate generation function
    const generateWallets = async () => {
      try {
        if (isMultiNetwork) {
          await generateMultiNetworkWallets(requestId);
        } else {
          await generateSingleWallet(requestId);
        }
      } finally {
        // Always release the lock when done
        generationInProgressRef.current = false;
        inProgressProjectGenerations.delete(projectId);
        if (generationTimeoutRef.current) {
          clearTimeout(generationTimeoutRef.current);
          generationTimeoutRef.current = null;
        }
      }
    };
    
    generateWallets();
  }, [generateRequestId, generateMultiNetworkWallets, generateSingleWallet]);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  }, [toast]);

  const getNetworkConfig = (network: string): ChainConfig | undefined => {
    return getChainConfig(network);
  };

  return (
    <div className="space-y-6">
      {/* Permission Check Warning */}
      {isCheckingPermissions ? (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Checking permissions...
          </AlertDescription>
        </Alert>
      ) : hasRequiredPermissions === false ? (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Permission Denied</AlertTitle>
          <AlertDescription>
            You need both project.create and project.edit permissions to generate wallet credentials.
            Please contact your administrator for access.
          </AlertDescription>
        </Alert>
      ) : null}
      {/* Generation Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            Generate New Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Multi-network toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="multi-network"
              checked={multiNetworkMode}
              onCheckedChange={(checked) => setMultiNetworkMode(checked === true)}
              disabled={createMultiSig}
            />
            <label htmlFor="multi-network" className="text-sm font-medium">
              Generate for multiple networks simultaneously
            </label>
          </div>

          {/* Multi-sig wallet toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="create-multisig"
              checked={createMultiSig}
              onCheckedChange={(checked) => {
                setCreateMultiSig(checked === true);
                if (checked) {
                  setMultiNetworkMode(false); // Disable multi-network when multi-sig is enabled
                }
              }}
            />
            <label htmlFor="create-multisig" className="text-sm font-medium flex items-center">
              <Users className="mr-1 h-4 w-4" />
              Create Multi-Signature Wallet
            </label>
          </div>

          {/* Multi-sig Wallet Configuration */}
          {createMultiSig && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Shield className="mr-2 h-4 w-4" />
                  Multi-Sig Wallet Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Wallet Name */}
                <div className="space-y-2">
                  <Label htmlFor="multisig-name">Wallet Name</Label>
                  <Input
                    id="multisig-name"
                    value={multiSigName}
                    onChange={(e) => setMultiSigName(e.target.value)}
                    placeholder="e.g., Treasury Wallet"
                  />
                </div>

                {/* Network Selection (required for multi-sig) */}
                <div className="space-y-2">
                  <Label>Network</Label>
                  <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a blockchain network" />
                    </SelectTrigger>
                    <SelectContent>
                      {allChains.map((chain) => (
                        <SelectItem key={chain.name} value={chain.name}>
                          <span className="flex items-center gap-2">
                            <span>{chain.icon}</span>
                            <span>{chain.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Owners */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Owners ({multiSigOwners.filter(o => o).length})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMultiSigOwner}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Owner
                    </Button>
                  </div>
                  {multiSigOwners.map((owner, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={owner}
                        onChange={(e) => updateMultiSigOwner(index, e.target.value)}
                        placeholder="0x..."
                        className="flex-1"
                      />
                      {multiSigOwners.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMultiSigOwner(index)}
                        >
                          <MinusCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Threshold */}
                <div className="space-y-2">
                  <Label htmlFor="multisig-threshold">
                    Required Signatures ({multiSigThreshold} of {multiSigOwners.filter(o => o).length})
                  </Label>
                  <Input
                    id="multisig-threshold"
                    type="number"
                    min="1"
                    max={multiSigOwners.filter(o => o).length}
                    value={multiSigThreshold}
                    onChange={(e) => setMultiSigThreshold(parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of signatures required to execute transactions
                  </p>
                </div>

                {/* Deploy Button */}
                <Button
                  onClick={deployMultiSigWallet}
                  disabled={isGenerating || !multiSigName || multiSigOwners.filter(o => o).length < 2}
                  className="w-full"
                >
                  {isGenerating ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  {isGenerating ? 'Deploying...' : 'Deploy Multi-Sig Wallet'}
                </Button>

                {/* Success Message */}
                {generatedMultiSigAddress && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">Multi-sig wallet deployed successfully!</p>
                        <div className="flex items-center space-x-2">
                          <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                            {generatedMultiSigAddress}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generatedMultiSigAddress, 'Multi-sig wallet address')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Single Network Selection (only if not creating multi-sig) */}
          {!multiNetworkMode && !createMultiSig && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Network:</label>
                <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a blockchain network" />
                  </SelectTrigger>
                  <SelectContent>
                    {allChains.map((chain) => (
                      <SelectItem key={chain.name} value={chain.name}>
                        <span className="flex items-center gap-2">
                          <span>{chain.icon}</span>
                          <span>{chain.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Environment:</label>
                <Select 
                  value={selectedEnvironment} 
                  onValueChange={setSelectedEnvironment}
                  disabled={availableEnvironments.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose network environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEnvironments.map((env) => (
                      <SelectItem key={env.name} value={env.name}>
                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-2">
                            {env.isTestnet ? '🟡' : '🟢'} {env.displayName}
                          </span>
                          {env.chainId && (
                            <span className="text-xs text-muted-foreground ml-2">
                              Chain ID: {env.chainId}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEnvironment && !getChainEnvironment(selectedNetwork, selectedEnvironment)?.isTestnet && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      ⚠️ Warning: Mainnet wallets control real assets. Use with caution.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Multi-Network Selection */}
          {multiNetworkMode && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Environment (applies to all):</label>
                <Alert className="mb-2">
                  <AlertDescription>
                    Each network will use its default testnet environment for safety.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Networks:</label>
                <div className="grid grid-cols-2 gap-2">
                  {allChains.map((chain) => (
                    <div key={chain.name} className="flex items-center space-x-2">
                      <Checkbox 
                        id={chain.name}
                        checked={selectedNetworks.includes(chain.name)}
                        onCheckedChange={(checked) => handleNetworkToggle(chain.name, checked as boolean)}
                      />
                      <label htmlFor={chain.name} className="text-sm flex items-center space-x-1">
                        <span>{chain.icon}</span>
                        <span>{chain.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedNetworks.length} network{selectedNetworks.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Generation Options (only show for regular wallets) */}
          {!createMultiSig && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Generation Options:</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-private-key"
                      checked={includePrivateKey}
                      onCheckedChange={(checked) => setIncludePrivateKey(checked === true)}
                    />
                    <label htmlFor="include-private-key" className="text-sm">
                      Include private key in response (required for vault storage)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-mnemonic"
                      checked={includeMnemonic}
                      onCheckedChange={(checked) => setIncludeMnemonic(checked === true)}
                    />
                    <label htmlFor="include-mnemonic" className="text-sm">
                      Include mnemonic phrase (for HD wallet backup)
                    </label>
                  </div>
                </div>
              </div>

              {/* Generate Button - Using the debounced click handler */}
              <Button 
                onClick={() => onGenerateClick(multiNetworkMode)}
                disabled={isGenerating || isCheckingPermissions || hasRequiredPermissions === false || !user}
                className="w-full"
              >
                {isGenerating ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="mr-2 h-4 w-4" />
                )}
                {isGenerating 
                  ? 'Generating...' 
                  : multiNetworkMode 
                    ? `Generate ${selectedNetworks.length} Wallets`
                    : 'Generate Wallet'
                }
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      {/* Generated Wallets Display */}
      {generatedWallets.length > 0 && (
        <div className="space-y-4">
          {generatedWallets.map((wallet, index) => (
            <Card key={`${wallet.network}-${index}`}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  {getNetworkConfig(wallet.network)?.label || wallet.network} Wallet Generated Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Network Badge */}
                <div className="flex items-center space-x-2 flex-wrap">
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Network className="h-3 w-3" />
                    <span>{getNetworkConfig(wallet.network)?.label || wallet.network}</span>
                  </Badge>
                  {wallet.chainId && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <span>Chain ID: {wallet.chainId}</span>
                    </Badge>
                  )}
                  {wallet.net && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <span>Environment: {wallet.net}</span>
                    </Badge>
                  )}
                  {wallet.vaultStorageId && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Shield className="h-3 w-3" />
                      <span>Vault Stored</span>
                    </Badge>
                  )}
                </div>

                {/* Wallet Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Wallet className="mr-1 h-4 w-4" />
                    Wallet Address:
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                      {wallet.walletAddress}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(wallet.walletAddress, `${wallet.network} wallet address`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Public Key */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Key className="mr-1 h-4 w-4" />
                    Public Key:
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                      {wallet.publicKey}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(wallet.publicKey, `${wallet.network} public key`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Private Key */}
                {wallet.privateKey && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <Shield className="mr-1 h-4 w-4" />
                      Private Key:
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                        {showPrivateKey ? wallet.privateKey : '••••••••••••••••••••••••••••••••'}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                      >
                        {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(wallet.privateKey!, `${wallet.network} private key`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Mnemonic Phrase */}
                {wallet.mnemonic && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <Key className="mr-1 h-4 w-4" />
                      Mnemonic Phrase:
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                        {showMnemonic ? wallet.mnemonic : '•••••• •••••• •••••• •••••• •••••• ••••••'}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowMnemonic(!showMnemonic)}
                      >
                        {showMnemonic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(wallet.mnemonic!, `${wallet.network} mnemonic phrase`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Vault Information */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vault Information:</label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Key Vault ID:</span>
                      <p className="font-mono text-xs break-all">{wallet.keyVaultId}</p>
                    </div>
                    {wallet.vaultStorageId && (
                      <div>
                        <span className="text-muted-foreground">Vault Storage ID:</span>
                        <p className="font-mono text-xs break-all">{wallet.vaultStorageId}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Warning - only show once for multiple wallets */}
                {index === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Security Notice:</strong> The private keys and mnemonic phrases are shown here for immediate use. 
                      They are securely stored in the vault and encrypted. Never share these credentials with unauthorized parties.
                      {generatedWallets.some(w => w.vaultStorageId) 
                        ? " Private keys are backed up in secure vault storage."
                        : " Consider enabling vault storage for enhanced security."
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
};

export default ProjectWalletGenerator;