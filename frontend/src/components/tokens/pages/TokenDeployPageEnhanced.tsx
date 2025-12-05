import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TokenPageLayout from '../layout/TokenPageLayout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  AlertCircle, 
  ArrowLeft, 
  Check, 
  Loader2, 
  Server,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { 
  Separator 
} from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from '@/components/ui/badge';

// Components
import TokenDeploymentFormProjectWalletIntegrated from '@/components/tokens/components/TokenDeploymentFormProjectWalletIntegrated';
import TokenDeploymentStatusSection from '@/components/tokens/components/deployment/TokenDeploymentStatusSection';
import TokenNavigation from '@/components/tokens/components/TokenNavigation';
import { RoleAssignmentForm } from '@/components/tokens/forms-comprehensive/RoleAssignmentForm';

// Services
import { 
  getToken, 
  updateTokenDeployment 
} from '@/components/tokens/services/tokenService';
import { 
  useTokenization 
} from '@/components/tokens/hooks/useTokenization';
import { supabase } from '@/infrastructure/database/client';

// Hooks
import { useDeploymentConfig } from '@/hooks/useDeploymentConfig';
import useTokenProjectContext from '@/hooks/project/useTokenProjectContext';

// Utils
import { formatAddress } from '@/utils/shared/addressUtils';
import { getExplorerUrl } from '@/utils/shared/explorerUtils';

// Types
import { TokenDetails } from '@/components/tokens/interfaces/TokenInterfaces';
import { DeploymentStatus } from '@/types/deployment/TokenDeploymentTypes';

/**
 * Enhanced TokenDeployPage with factory-based deployment
 * and role assignment integration
 */
const TokenDeployPageEnhanced: React.FC = () => {
  // Replace direct useParams with useTokenProjectContext
  const { tokenId } = useParams<{ tokenId: string }>();
  const { projectId, project, isLoading: projectLoading } = useTokenProjectContext();
  const navigate = useNavigate();
  
  // State management
  const [token, setToken] = useState<TokenDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('configure');
  const [standardInfo, setStandardInfo] = useState<Record<string, any>>({});
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>('hoodi'); // Default to Hoodi
  
  // Gas configuration state
  const [gasPrice, setGasPrice] = useState<string>('20'); // Default 20 Gwei
  const [gasLimit, setGasLimit] = useState<number>(3000000); // Default 3M gas
  
  // EIP-1559 specific state
  const [maxFeePerGas, setMaxFeePerGas] = useState<string>('');
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState<string>('');
  
  // 🆕 Factory configuration state
  const [factoryAddress, setFactoryAddress] = useState<string>('');
  const [factoryConfigured, setFactoryConfigured] = useState<boolean>(false);
  const [activeTemplates, setActiveTemplates] = useState<any[]>([]);
  const [loadingFactory, setLoadingFactory] = useState<boolean>(false);
  
  // 🆕 Role assignment state
  const [roleAddresses, setRoleAddresses] = useState<Record<string, string>>({});
  
  // Use deployment config hook to get dynamic configuration
  const { 
    config: deploymentConfig, 
    loading: configLoading, 
    saveContractAddresses,
    updateGasConfig 
  } = useDeploymentConfig({
    projectId,
    chain: selectedChain,
    gasPrice,
    gasLimit
  });
  
  // Standard-specific information for deployment guidance
  const standardInfoMap: Record<string, any> = {
    'ERC-20': {
      title: 'ERC-20 Token Standard',
      description: 'Fungible token standard for currencies and assets',
      features: [
        { name: 'Fungibility', value: 'Fully fungible' },
        { name: 'Divisibility', value: 'Divisible (configurable decimals)' },
        { name: 'Transfer', value: 'Standard transfer and transferFrom' },
        { name: 'Approval', value: 'Delegated spending via approve/allowance' }
      ],
      deploymentRequirements: [
        'Name and symbol',
        'Decimals (typically 18)',
        'Initial supply (optional)',
        'Cap (optional)'
      ],
      blockchainInteractions: [
        'Contract deployment',
        'Token minting',
        'Token transfers'
      ]
    },
    'ERC-721': {
      title: 'ERC-721 Token Standard',
      description: 'Non-fungible token standard for unique assets',
      features: [
        { name: 'Fungibility', value: 'Non-fungible (each token is unique)' },
        { name: 'Divisibility', value: 'Indivisible' },
        { name: 'Metadata', value: 'URI for off-chain metadata' },
        { name: 'Enumeration', value: 'Optional token enumeration' }
      ],
      deploymentRequirements: [
        'Name and symbol',
        'Base URI for metadata',
        'Royalty configuration (optional)'
      ],
      blockchainInteractions: [
        'Contract deployment',
        'Token minting',
        'Token transfers',
        'Metadata resolution'
      ]
    },
    'ERC-1155': {
      title: 'ERC-1155 Multi-Token Standard',
      description: 'Multi-token standard supporting both fungible and non-fungible tokens',
      features: [
        { name: 'Fungibility', value: 'Mixed (supports both fungible and non-fungible)' },
        { name: 'Batching', value: 'Efficient batch transfers' },
        { name: 'Metadata', value: 'URI pattern for metadata' },
        { name: 'Approval', value: 'Operator approval model' }
      ],
      deploymentRequirements: [
        'Name (optional)',
        'Base URI for metadata',
        'Initial token types and balances (optional)'
      ],
      blockchainInteractions: [
        'Contract deployment',
        'Token minting (single and batch)',
        'Token transfers (single and batch)',
        'Metadata resolution'
      ]
    },
    'ERC-3525': {
      title: 'ERC-3525 Semi-Fungible Token',
      description: 'Semi-fungible token standard that combines aspects of ERC-20 and ERC-721',
      features: [
        { name: 'Fungibility', value: 'Semi-fungible (value + uniqueness)' },
        { name: 'Values', value: 'Tokens within same slot can have values' },
        { name: 'Slots', value: 'Tokens categorized by slots' }
      ],
      deploymentRequirements: [
        'Name and symbol',
        'Decimals for values',
        'Slot configuration'
      ],
      blockchainInteractions: [
        'Contract deployment',
        'Token minting',
        'Value transfers',
        'Slot mapping'
      ]
    },
    'ERC-4626': {
      title: 'ERC-4626 Tokenized Vault',
      description: 'Standard for yield-bearing vaults with deposit/withdrawal mechanisms',
      features: [
        { name: 'Asset/Share', value: 'Conversion between assets and shares' },
        { name: 'Accounting', value: 'Standardized accounting functions' },
        { name: 'Limits', value: 'Max deposit/withdrawal limits' }
      ],
      deploymentRequirements: [
        'Name and symbol',
        'Underlying asset address',
        'Fee structure (optional)',
        'Strategy configuration (optional)'
      ],
      blockchainInteractions: [
        'Contract deployment',
        'Asset deposits',
        'Share withdrawals',
        'Yield accrual'
      ]
    },
    'ERC-1400': {
      title: 'ERC-1400 Security Token',
      description: 'Security token standard with compliance and control features',
      features: [
        { name: 'Compliance', value: 'Built-in compliance checks' },
        { name: 'Partitions', value: 'Tokens can be partitioned' },
        { name: 'Controls', value: 'Issuer controls for transfers' }
      ],
      deploymentRequirements: [
        'Name and symbol',
        'Compliance rules',
        'Controller addresses'
      ],
      blockchainInteractions: [
        'Contract deployment',
        'Issuance and redemption',
        'Partition management',
        'Compliance checks'
      ]
    }
  };
  
  /**
   * Helper function to convert string status to DeploymentStatus enum
   */
  const stringToDeploymentStatus = (status: string): DeploymentStatus => {
    const statusMap: Record<string, DeploymentStatus> = {
      'PENDING': DeploymentStatus.PENDING,
      'pending': DeploymentStatus.PENDING,
      'DEPLOYING': DeploymentStatus.DEPLOYING,
      'deploying': DeploymentStatus.DEPLOYING,
      'SUCCESS': DeploymentStatus.SUCCESS,
      'success': DeploymentStatus.SUCCESS,
      'FAILED': DeploymentStatus.FAILED,
      'failed': DeploymentStatus.FAILED,
      'ABORTED': DeploymentStatus.ABORTED,
      'aborted': DeploymentStatus.ABORTED,
      'VERIFYING': DeploymentStatus.VERIFYING,
      'verifying': DeploymentStatus.VERIFYING,
      'VERIFIED': DeploymentStatus.VERIFIED,
      'verified': DeploymentStatus.VERIFIED,
      'VERIFICATION_FAILED': DeploymentStatus.VERIFICATION_FAILED,
      'verification_failed': DeploymentStatus.VERIFICATION_FAILED
    };
    
    return statusMap[status] || DeploymentStatus.PENDING;
  };
  
  // 🆕 Check factory configuration
  useEffect(() => {
    const checkFactoryConfiguration = async () => {
      if (!selectedChain) return;
      
      try {
        setLoadingFactory(true);
        
        // Check for factory registry first (preferred)
        const { data: registryData, error: registryError } = await supabase
          .from('contract_masters')
          .select('contract_address, is_active')
          .eq('network', selectedChain)
          .eq('environment', 'testnet')
          .eq('contract_type', 'factory_registry')
          .eq('is_active', true)
          .maybeSingle();
        
        // If no registry, check for any factory contracts
        const { data: factoriesData, error: factoriesError } = await supabase
          .from('contract_masters')
          .select('contract_address, contract_type, is_active')
          .eq('network', selectedChain)
          .eq('environment', 'testnet')
          .like('contract_type', '%factory%')
          .eq('is_active', true);
        
        if (registryError) {
          console.error('Error checking factory registry:', registryError);
        }
        
        if (factoriesError) {
          console.error('Error checking factories:', factoriesError);
        }
        
        // Prefer registry, fallback to any factory
        if (registryData) {
          setFactoryAddress(registryData.contract_address);
          setFactoryConfigured(true);
        } else if (factoriesData && factoriesData.length > 0) {
          // Multiple factories exist, use the first one as representative
          setFactoryAddress(factoriesData[0].contract_address);
          setFactoryConfigured(true);
        } else {
          setFactoryAddress('');
          setFactoryConfigured(false);
        }
        
        // Get active templates for the selected blockchain
        const { data: templatesData, error: templatesError } = await supabase
          .from('contract_masters')
          .select('*')
          .eq('network', selectedChain)
          .eq('environment', 'testnet')
          .eq('is_template', true)
          .eq('is_active', true);
        
        if (templatesError) {
          console.error('Error fetching templates:', templatesError);
        } else {
          setActiveTemplates(templatesData || []);
        }
        
      } catch (error) {
        console.error('Error checking factory configuration:', error);
      } finally {
        setLoadingFactory(false);
      }
    };
    
    checkFactoryConfiguration();
  }, [selectedChain]);
  
  /**
   * Fetch token data and deployment status
   */
  const fetchTokenData = async () => {
    // Check if we have valid IDs
    if (!tokenId) {
      setIsLoading(false);
      setError("Token ID is undefined. Please select a valid token.");
      navigate(`/projects/${projectId}/tokens/select/deploy`);
      return;
    }
    
    if (!projectId) {
      setIsLoading(false);
      setError("Project ID is undefined. Please select a valid project.");
      navigate('/projects');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const tokenData = await getToken(tokenId);
      
      // Transform database token into the TokenDetails structure
      const transformedToken: TokenDetails = {
        id: tokenData.id,
        name: tokenData.name || 'Unnamed Token',
        symbol: tokenData.symbol || 'UNKNOWN',
        standard: tokenData.standard || 'Unknown Standard',
        decimals: tokenData.decimals || 18,
        blocks: typeof tokenData.blocks === 'object' && tokenData.blocks !== null ? 
          tokenData.blocks as Record<string, any> : {},
        address: (tokenData as any).address,
        blockchain: (tokenData as any).blockchain,
        total_supply: tokenData.total_supply || '0',
        deployment_status: (tokenData as any).deployment_status,
        deployment_transaction: (tokenData as any).deployment_transaction,
        deployment_block: (tokenData as any).deployment_block,
        deployment_timestamp: (tokenData as any).deployment_timestamp,
        deployment_environment: (tokenData as any).deployment_environment
      };
      
      setToken(transformedToken);
      
      // Set deployment status from token data
      if (transformedToken.deployment_status) {
        const statusValue = typeof transformedToken.deployment_status === 'string' 
          ? stringToDeploymentStatus(transformedToken.deployment_status)
          : transformedToken.deployment_status;
        setDeploymentStatus(statusValue);
      }
      
      // Set standard-specific information
      if (transformedToken.standard && standardInfoMap[transformedToken.standard]) {
        setStandardInfo(standardInfoMap[transformedToken.standard]);
      } else {
        setStandardInfo({});
      }
      
      // If token is already deployed or has deployment status, switch to status tab
      if ((tokenData as any).address && (tokenData as any).blockchain) {
        setActiveTab('status');
      } else if (transformedToken.deployment_status === DeploymentStatus.DEPLOYING) {
        setActiveTab('status');
        setIsDeploying(true);
      }
    } catch (err) {
      console.error('Error fetching token:', err);
      setError(`Failed to load token: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load token details
  useEffect(() => {
    fetchTokenData();
  }, [tokenId, projectId]);
  
  /**
   * Handle deployment success
   */
  const handleDeploymentSuccess = async (
    tokenAddress: string,
    transactionHash: string
  ) => {
    try {
      // Save contract addresses dynamically
      if (deploymentConfig && saveContractAddresses) {
        await saveContractAddresses({
          token: tokenAddress,
          // Policy engine address if deployed (will be added later)
        });
      }

      // Update database with the new deployment details
      await updateTokenDeployment(tokenId as string, {
        address: tokenAddress,
        blockchain: selectedChain,
        transaction_hash: transactionHash,
        status: 'DEPLOYED'
      });

      // Reload the token data
      fetchTokenData();

      // Switch to the status tab
      setActiveTab('status');
      setDeploymentStatus(DeploymentStatus.SUCCESS);
    } catch (err) {
      console.error('Error updating deployment info:', err);
      setError(`Failed to update deployment details: ${(err as Error).message}`);
    }
  };
  
  /**
   * Handle starting a new deployment
   */
  const handleDeploymentStart = async (blockchain: string, environment: string) => {
    if (!projectId || !tokenId) return;
    
    setIsDeploying(true);
    setDeploymentStatus(DeploymentStatus.DEPLOYING);
    setActiveTab('status');
  };
  
  /**
   * Handle deployment status change
   */
  const handleDeploymentStatusChange = (status: DeploymentStatus) => {
    setDeploymentStatus(status);
    
    if (status === DeploymentStatus.SUCCESS || status === DeploymentStatus.FAILED) {
      setIsDeploying(false);
    }
  };
  
  /**
   * Handle token change (if navigating between tokens)
   */
  const handleTokenChange = (newTokenId: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/tokens/${newTokenId}/deploy`, { replace: true });
    }
  };
  
  // 🆕 Handle role address change
  const handleRoleChange = (role: string, address: string) => {
    setRoleAddresses(prev => ({
      ...prev,
      [role]: address
    }));
  };
  
  // 🆕 Handle blockchain change from deployment form
  const handleBlockchainChange = (blockchain: string) => {
    console.log('Blockchain changed to:', blockchain);
    setSelectedChain(blockchain);
  };
  
  return (
    <TokenPageLayout>
      {/* Loading state */}
      {isLoading ? (
        <div className="flex h-[400px] w-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : token ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Deploy {token.name}
              </h1>
              <p className="text-muted-foreground">
                Deploy your token to a blockchain network using factory-based template cloning.
              </p>
            </div>
          </div>
          
          {/* 🆕 Factory Configuration Status Alert - Only show if not loading and not configured */}
          {!loadingFactory && !factoryConfigured && (
            <Alert variant="default" className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-800 dark:text-amber-300">
                Factory Infrastructure Not Detected on <Badge variant="outline" className="ml-1 font-mono">{selectedChain}</Badge>
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <div className="space-y-2">
                  <p>
                    No factory contracts or templates found for the <strong>{selectedChain}</strong> network.
                    Template-based deployment is highly recommended for gas efficiency.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/admin/templates`)}
                    >
                      Manage Templates
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/admin/factory-config`)}
                    >
                      Configure Factory
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* ✅ Success Alert - Factory is configured */}
          {!loadingFactory && factoryConfigured && activeTemplates.length > 0 && (
            <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-300">
                Factory Infrastructure Ready on <Badge variant="outline" className="ml-1 font-mono bg-white dark:bg-gray-800">{selectedChain}</Badge>
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">
                <p>
                  Found <strong>{activeTemplates.length} templates</strong> on the <strong>{selectedChain}</strong> network.
                  Gas-efficient template-based deployment is available.
                </p>
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="configure" disabled={isDeploying}>
                Configure Deployment
              </TabsTrigger>
              <TabsTrigger 
                value="status" 
                className={deploymentStatus ? "relative" : ""}
              >
                {deploymentStatus && (
                  <div className="absolute -top-1 -right-1">
                    {deploymentStatus === DeploymentStatus.PENDING && (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    {deploymentStatus === DeploymentStatus.DEPLOYING && (
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    )}
                    {deploymentStatus === DeploymentStatus.SUCCESS && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {deploymentStatus === DeploymentStatus.FAILED && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
                Deployment Status
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="configure" className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight">Configure Deployment</h2>
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                  {/* 🆕 Role Assignment Form - Moved above Gas Configuration */}
                  <RoleAssignmentForm
                    projectId={projectId || ''}
                    contractAddress={token?.address} // Pass deployed contract address for authorization
                    roleAddresses={roleAddresses}
                    onRoleChange={handleRoleChange}
                    availableRoles={['minter', 'pauser', 'burner', 'upgrader']}
                  />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Deployment Configuration</CardTitle>
                      <CardDescription>Fill in the deployment details below to deploy this token to a blockchain network.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <TokenDeploymentFormProjectWalletIntegrated
                        tokenId={tokenId || ''}
                        tokenConfig={{
                          name: token.name,
                          symbol: token.symbol,
                          decimals: token.decimals,
                          totalSupply: token.total_supply || '0',
                          standard: token.standard,
                          features: token.blocks?.features || {},
                          metadata: token.blocks?.metadata || {}
                        }}
                        projectId={projectId || ''}
                        projectName={project?.name || 'Chain Capital Project'}
                        onDeploymentSuccess={handleDeploymentSuccess}
                        gasPrice={gasPrice}
                        gasLimit={gasLimit}
                        onGasPriceChange={setGasPrice}
                        onGasLimitChange={setGasLimit}
                        maxFeePerGas={maxFeePerGas}
                        maxPriorityFeePerGas={maxPriorityFeePerGas}
                        onMaxFeePerGasChange={setMaxFeePerGas}
                        onMaxPriorityFeePerGasChange={setMaxPriorityFeePerGas}
                        // 🆕 Pass factory and role props
                        factoryAddress={factoryAddress}
                        factoryConfigured={factoryConfigured}
                        roleAddresses={roleAddresses}
                        // 🆕 Pass blockchain state and handler
                        initialBlockchain={selectedChain}
                        onBlockchainChange={handleBlockchainChange}
                      />
                    </CardContent>
                  </Card>
                </div>
                
                <div className="col-span-1 space-y-6">
                  {/* 🆕 Factory Infrastructure Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Deployment Infrastructure
                      </CardTitle>
                      <CardDescription>
                        Factory-based template cloning for gas-efficient deployment
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {loadingFactory ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : factoryConfigured ? (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Ready
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Network:</span>
                              <span className="font-medium">{selectedChain}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Factory Registry:</span>
                              <code className="text-xs">{formatAddress(factoryAddress)}</code>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Master Templates:</span>
                              <span className="font-medium">{activeTemplates.filter(t => t.contract_type.includes('master')).length}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Module Templates:</span>
                              <span className="font-medium">{activeTemplates.filter(t => t.contract_type.includes('module')).length}</span>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium">Deployment Method</h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              <li className="flex items-start gap-1">
                                <Check className="h-3 w-3 mt-0.5 text-green-500" />
                                <span>Template cloning (gas-efficient)</span>
                              </li>
                              <li className="flex items-start gap-1">
                                <Check className="h-3 w-3 mt-0.5 text-green-500" />
                                <span>Pre-audited contracts</span>
                              </li>
                              <li className="flex items-start gap-1">
                                <Check className="h-3 w-3 mt-0.5 text-green-500" />
                                <span>Modular architecture</span>
                              </li>
                            </ul>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(getExplorerUrl(selectedChain, factoryAddress), '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-2" />
                            View Registry on Explorer
                          </Button>
                        </>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Factory infrastructure not detected. Direct deployment will be used (higher gas cost).
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Standard Info Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{standardInfo.title || token.standard}</CardTitle>
                      <CardDescription>{standardInfo.description || 'Token standard information'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {standardInfo.features && (
                        <Collapsible defaultOpen>
                          <CollapsibleTrigger className="flex w-full items-center justify-between">
                            <h3 className="text-sm font-medium">Features</h3>
                            <ChevronDown className="h-4 w-4" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <ul className="space-y-2 text-sm">
                              {standardInfo.features.map((feature: any, index: number) => (
                                <li key={index} className="flex justify-between">
                                  <span className="text-muted-foreground">{feature.name}:</span>
                                  <span>{feature.value}</span>
                                </li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      
                      {standardInfo.deploymentRequirements && (
                        <Collapsible defaultOpen>
                          <CollapsibleTrigger className="flex w-full items-center justify-between">
                            <h3 className="text-sm font-medium">Deployment Requirements</h3>
                            <ChevronDown className="h-4 w-4" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <ul className="space-y-1 text-sm">
                              {standardInfo.deploymentRequirements.map((req: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      
                      {standardInfo.blockchainInteractions && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex w-full items-center justify-between">
                            <h3 className="text-sm font-medium">Blockchain Interactions</h3>
                            <ChevronDown className="h-4 w-4" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <ul className="space-y-1 text-sm">
                              {standardInfo.blockchainInteractions.map((interaction: string, index: number) => (
                                <li key={index}>{interaction}</li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="status" className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight">Deployment Status</h2>
              <Separator className="my-4" />
              
              {token && (
                <TokenDeploymentStatusSection
                  token={token}
                  projectId={projectId || ''}
                  deploymentStatus={deploymentStatus}
                  onStatusChange={handleDeploymentStatusChange}
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Token Not Found</AlertTitle>
          <AlertDescription>
            The requested token could not be found. Please select a valid token.
          </AlertDescription>
        </Alert>
      )}
    </TokenPageLayout>
  );
};

// Helper function to generate status badges with consistent styling
const getStatusBadge = (status: DeploymentStatus | null) => {
  if (!status) return null;
  
  switch (status) {
    case DeploymentStatus.PENDING:
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    case DeploymentStatus.DEPLOYING:
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Deploying</Badge>;
    case DeploymentStatus.SUCCESS:
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Deployed</Badge>;
    case DeploymentStatus.FAILED:
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
    case DeploymentStatus.ABORTED:
      return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Aborted</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export default TokenDeployPageEnhanced;
export { getStatusBadge };
