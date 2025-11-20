/**
 * Contract Deployment Component
 * UI for deploying Foundry contracts with wallet selection
 * Auto-recognizes network and environment from wallet chain ID
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Loader2, ExternalLink, ArrowLeft, Info } from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';
import { chainIdToBlockchainAndEnvironment } from '@/infrastructure/web3/utils/chainIdUtils';
import { getExplorerUrl as getExplorerUrlFromChainId } from '@/infrastructure/web3/utils/chainIds';

interface ProjectWallet {
  id: string;
  project_wallet_name: string | null;
  wallet_address: string;
  wallet_type: string | null;
  chain_id: string | null;
  evm_chain_id: string | null;
  non_evm_network: string | null;
}

interface ContractType {
  type: string;
  category: string;
  description: string;
  selected: boolean;
}

interface DeploymentResult {
  success: boolean;
  contractType: string;
  address?: string;
  transactionHash?: string;
  error?: string;
}

interface Project {
  id: string;
  name: string;
}

export function ContractDeployment() {
  const { projectId, organizationId } = useParams<{ projectId?: string; organizationId?: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [wallets, setWallets] = useState<ProjectWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [contracts, setContracts] = useState<ContractType[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [results, setResults] = useState<DeploymentResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentContract, setCurrentContract] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-derive network and environment from selected wallet
  const walletNetworkInfo = useMemo(() => {
    if (!selectedWallet) return null;
    
    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) return null;
    
    try {
      // For non-EVM networks with EVM compatibility (like Injective), use evm_chain_id
      // Otherwise use chain_id for standard EVM networks
      const chainIdToUse = wallet.evm_chain_id || wallet.chain_id;
      
      if (!chainIdToUse) return null;
      
      const chainId = parseInt(chainIdToUse);
      const networkInfo = chainIdToBlockchainAndEnvironment(chainId);
      return networkInfo;
    } catch (err) {
      console.error('Failed to parse chain ID:', err);
      return null;
    }
  }, [selectedWallet, wallets]);

  // Load project details if projectId is provided
  useEffect(() => {
    if (projectId) {
      loadProject();
    } else {
      setIsLoading(false);
    }
  }, [projectId]);

  // Load wallets and contract types
  useEffect(() => {
    loadWallets();
    loadContractTypes();
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWallets = async () => {
    try {
      let query = supabase
        .from('project_wallets')
        .select('id, project_wallet_name, wallet_address, wallet_type, chain_id, evm_chain_id, non_evm_network')
        .order('created_at', { ascending: false });

      // Filter by project if projectId is provided
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out null addresses and ensure either chain_id or evm_chain_id exists
      // For non-EVM networks like Injective, evm_chain_id is required for contract deployment
      const validWallets = (data || []).filter(w => 
        w.wallet_address && (w.chain_id || w.evm_chain_id)
      );
      setWallets(validWallets);
    } catch (err) {
      console.error('Failed to load wallets:', err);
      setError('Failed to load wallets');
    }
  };

  const loadContractTypes = async () => {
    try {
      const response = await fetch('/api/contract-deployment/contract-types');
      
      if (!response.ok) {
        throw new Error('Failed to fetch contract types');
      }
      
      const data = await response.json();

      // Ensure data exists and has contractTypes array
      if (data && Array.isArray(data.contractTypes)) {
        setContracts(
          data.contractTypes.map((ct: any) => ({
            ...ct,
            selected: false,
          }))
        );
      } else {
        console.warn('Invalid contract types data structure:', data);
        setContracts([]);
      }
    } catch (err) {
      console.error('Failed to load contract types:', err);
      // Set empty array instead of leaving undefined
      setContracts([]);
    }
  };

  const toggleContract = (type: string) => {
    setContracts((prev) =>
      prev.map((c) =>
        c.type === type ? { ...c, selected: !c.selected } : c
      )
    );
  };

  const selectAll = () => {
    setContracts((prev) => prev.map((c) => ({ ...c, selected: true })));
  };

  const deselectAll = () => {
    setContracts((prev) => prev.map((c) => ({ ...c, selected: false })));
  };

  const handleDeploy = async () => {
    if (!selectedWallet) {
      setError('Please select a wallet');
      return;
    }

    if (!walletNetworkInfo) {
      setError('Selected wallet does not have a valid chain ID');
      return;
    }

    const selectedContracts = contracts.filter((c) => c.selected);
    if (selectedContracts.length === 0) {
      setError('Please select at least one contract');
      return;
    }

    setDeploying(true);
    setError(null);
    setResults([]);
    setProgress(0);

    try {
      const response = await fetch('/api/contract-deployment/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: selectedWallet,
          network: walletNetworkInfo.blockchain,
          environment: walletNetworkInfo.environment,
          projectId: projectId || null,
          contracts: selectedContracts.map((c) => ({
            contractType: c.type,
            verifyOnEtherscan: true,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Deployment failed');
      }

      const data = await response.json();
      setDeploymentId(data.deploymentId);
      setResults(data.results);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  const getExplorerUrl = (address: string) => {
    if (!walletNetworkInfo) return '#';
    
    const explorerBaseUrl = getExplorerUrlFromChainId(walletNetworkInfo.chainId);
    if (!explorerBaseUrl) return '#';
    
    return `${explorerBaseUrl}/address/${address}`;
  };

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/projects');
    }
  };

  // Group contracts by category
  const groupedContracts = contracts.reduce((acc, contract) => {
    if (!acc[contract.category]) {
      acc[contract.category] = [];
    }
    acc[contract.category].push(contract);
    return acc;
  }, {} as Record<string, ContractType[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Project Context */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Deploy Foundry Contracts</h1>
          {project && (
            <p className="text-muted-foreground">
              Project: {project.name}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Deployment Configuration</CardTitle>
          <CardDescription>
            Deploy token factories, master implementations, and extension modules to blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wallet Selection */}
          <div className="space-y-2">
            <Label>Deployment Wallet</Label>
            <Select value={selectedWallet} onValueChange={setSelectedWallet}>
              <SelectTrigger>
                <SelectValue placeholder="Select wallet..." />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.project_wallet_name || 'Unnamed Wallet'} ({wallet.wallet_address.slice(0, 6)}...
                    {wallet.wallet_address.slice(-4)})
                    {wallet.wallet_type && ` - ${wallet.wallet_type}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {wallets.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No wallets found. Please create a wallet first.
              </p>
            )}
          </div>

          {/* Auto-Detected Network and Environment */}
          {walletNetworkInfo && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Auto-detected from wallet:</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Network:</span>{' '}
                      <span className="font-medium">{walletNetworkInfo.chainName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Environment:</span>{' '}
                      <span className="font-medium capitalize">{walletNetworkInfo.environment}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Chain ID:</span>{' '}
                      <span className="font-medium">{walletNetworkInfo.chainId}</span>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {selectedWallet && !walletNetworkInfo && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The selected wallet does not have a valid chain ID configured.
                Please ensure the wallet has been properly initialized with a blockchain network.
              </AlertDescription>
            </Alert>
          )}

          {/* Contract Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Contracts to Deploy</Label>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>

            {Object.keys(groupedContracts).length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No contract types available. Please check your API configuration.
                </AlertDescription>
              </Alert>
            ) : (
              Object.entries(groupedContracts).map(([category, categoryContracts]) => (
                <div key={category} className="space-y-2">
                  <h3 className="font-semibold text-sm">{category}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryContracts.map((contract) => (
                      <div key={contract.type} className="flex items-start space-x-2">
                        <Checkbox
                          id={contract.type}
                          checked={contract.selected}
                          onCheckedChange={() => toggleContract(contract.type)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={contract.type}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {contract.description}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Deploy Button */}
          <Button
            className="w-full"
            onClick={handleDeploy}
            disabled={
              deploying || 
              !selectedWallet || 
              !walletNetworkInfo ||
              contracts.filter((c) => c.selected).length === 0
            }
          >
            {deploying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              'Deploy Contracts'
            )}
          </Button>

          {/* Progress */}
          {deploying && (
            <div className="space-y-2">
              <Progress value={progress} />
              {currentContract && (
                <p className="text-sm text-muted-foreground">
                  Deploying: {currentContract}
                </p>
              )}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Deployment Results</h3>
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between border rounded-lg p-3"
                  >
                    <div className="flex items-start space-x-3">
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{result.contractType}</p>
                        {result.success && result.address && (
                          <a
                            href={getExplorerUrl(result.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {result.address.slice(0, 10)}...{result.address.slice(-8)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {result.error && (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
