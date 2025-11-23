/**
 * Factory Configuration Page - Enhanced
 * Admin interface for configuring factory contracts with templates
 * Manages which templates each factory should use for deployment
 * 
 * Features:
 * - Network detection (ensures Hoodi Testnet)
 * - Batch registration
 * - Proper explorer URLs from chainIds
 * - Enhanced error handling
 * - Gas estimation
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Info,
  Settings,
  Zap,
  Network,
  CheckCheck
} from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';
import { ethers } from 'ethers';
import { CHAIN_IDS, getExplorerUrl, getChainName } from '@/infrastructure/web3/utils/chainIds';
import { getAddressUrl } from '@/infrastructure/web3/utils/blockchainExplorerConfig';

interface Template {
  id: string;
  contract_type: string;
  contract_address: string;
  is_active: boolean;
  contract_details: {
    name?: string;
    verified?: boolean;
  };
}

interface Factory {
  id: string;
  contract_type: string;
  contract_address: string;
  contract_details: {
    name?: string;
    verified?: boolean;
    registeredTemplates?: Record<string, string>;
  };
}

interface TemplateRegistration {
  factoryAddress: string;
  factoryType: string;
  templateType: string;
  templateAddress: string;
  isRegistered: boolean;
  checking: boolean;
}

const FACTORY_ABI = [
  'function registerTemplate(string memory templateType, address templateAddress) external',
  'function getTemplateAddress(string memory templateType) external view returns (address)',
  'function isTemplateRegistered(string memory templateType) external view returns (bool)',
];

const HOODI_TESTNET_CHAIN_ID = CHAIN_IDS.hoodi;

export function FactoryConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [registrations, setRegistrations] = useState<TemplateRegistration[]>([]);
  const [registering, setRegistering] = useState<string | null>(null);
  const [batchRegistering, setBatchRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [networkCorrect, setNetworkCorrect] = useState(false);

  useEffect(() => {
    loadData();
    checkNetwork();
    
    // Listen for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const handleChainChanged = (chainIdHex: string) => {
    const chainId = parseInt(chainIdHex, 16);
    setCurrentChainId(chainId);
    setNetworkCorrect(chainId === HOODI_TESTNET_CHAIN_ID);
    
    // Reload data if switched to correct network
    if (chainId === HOODI_TESTNET_CHAIN_ID) {
      loadData();
    }
  };

  const checkNetwork = async () => {
    try {
      if (!window.ethereum) {
        setError('No ethereum provider found. Please install MetaMask.');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      setCurrentChainId(chainId);
      setNetworkCorrect(chainId === HOODI_TESTNET_CHAIN_ID);
    } catch (err) {
      console.error('Failed to check network:', err);
    }
  };

  const switchToHoodiTestnet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('No ethereum provider found');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${HOODI_TESTNET_CHAIN_ID.toString(16)}` }],
      });
    } catch (err: any) {
      // Chain not added to MetaMask
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${HOODI_TESTNET_CHAIN_ID.toString(16)}`,
              chainName: 'Hoodi Testnet',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://rpc.hoodi.network'], // Update with actual RPC
              blockExplorerUrls: [getExplorerUrl(HOODI_TESTNET_CHAIN_ID)]
            }]
          });
        } catch (addError) {
          console.error('Failed to add Hoodi Testnet:', addError);
          setError('Failed to add Hoodi Testnet to MetaMask');
        }
      } else {
        console.error('Failed to switch network:', err);
        setError('Failed to switch to Hoodi Testnet');
      }
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load factories
      const { data: factoryData, error: factoryError } = await supabase
        .from('contract_masters')
        .select('*')
        .eq('network', 'hoodi')
        .eq('environment', 'testnet')
        .like('contract_type', '%factory%')
        .eq('is_template', false)
        .order('contract_type', { ascending: true });

      if (factoryError) throw factoryError;

      // Load active templates
      const { data: templateData, error: templateError } = await supabase
        .from('contract_masters')
        .select('*')
        .eq('network', 'hoodi')
        .eq('environment', 'testnet')
        .eq('is_template', true)
        .eq('is_active', true)
        .order('contract_type', { ascending: true });

      if (templateError) throw templateError;

      setFactories(factoryData || []);
      setTemplates(templateData || []);

      // Initialize registrations to check
      await initializeRegistrationChecks(factoryData || [], templateData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const initializeRegistrationChecks = async (
    factoryList: Factory[],
    templateList: Template[]
  ) => {
    // Create registration entries for all factory-template combinations
    const registrationEntries: TemplateRegistration[] = [];

    for (const factory of factoryList) {
      // Get relevant templates for this factory type
      const relevantTemplates = getRelevantTemplates(factory.contract_type, templateList);

      for (const template of relevantTemplates) {
        registrationEntries.push({
          factoryAddress: factory.contract_address,
          factoryType: factory.contract_type,
          templateType: template.contract_type,
          templateAddress: template.contract_address,
          isRegistered: false,
          checking: true,
        });
      }
    }

    setRegistrations(registrationEntries);

    // Check registration status for each entry
    for (const entry of registrationEntries) {
      await checkRegistrationStatus(entry);
    }
  };

  const getRelevantTemplates = (factoryType: string, templateList: Template[]): Template[] => {
    // Map factory types to relevant template types
    // Comprehensive mappings for all 45+ templates deployed on Hoodi Testnet
    const mappings: Record<string, string[]> = {
      // ========================================
      // TOKEN STANDARD FACTORIES
      // ========================================
      
      // ERC20 Factory - Fungible Tokens
      'erc20_factory': [
        'erc20_master',
        'erc20_rebasing_master',
        'erc20_wrapper_master',
        'erc20_snapshot_master',
        'erc20_capped_master',
        'erc20_burnable_master'
      ],
      
      // ERC721 Factory - NFTs
      'erc721_factory': [
        'erc721_master',
        'erc721_wrapper_master',
        'erc721_enumerable_master',
        'erc721_royalty_master',
        'erc721_burnable_master'
      ],
      
      // ERC1155 Factory - Multi-Token Standard
      'erc1155_factory': [
        'erc1155_master',
        'erc1155_supply_master',
        'erc1155_burnable_master'
      ],
      
      // ERC1400 Factory - Security Tokens
      'erc1400_factory': [
        'erc1400_master',
        'erc1400_partition_master',
        'erc1400_document_master'
      ],
      
      // ERC3525 Factory - Semi-Fungible Tokens
      'erc3525_factory': [
        'erc3525_master',
        'erc3525_slot_master',
        'erc3525_metadata_master'
      ],
      
      // ERC4626 Factory - Tokenized Vaults
      'erc4626_factory': [
        'erc4626_master',
        'erc4626_yield_master',
        'erc4626_strategy_master'
      ],
      
      // ========================================
      // UNIVERSAL FACTORIES
      // ========================================
      
      // Beacon Proxy Factory - All Standards
      'beacon_proxy_factory': [
        // All master templates
        'erc20_master',
        'erc721_master',
        'erc1155_master',
        'erc1400_master',
        'erc3525_master',
        'erc4626_master',
        // All variants
        'erc20_rebasing_master',
        'erc20_wrapper_master',
        'erc721_enumerable_master',
        'erc1155_supply_master'
      ],
      
      // Clone Factory - Minimal Proxy Pattern
      'clone_factory': [
        'erc20_master',
        'erc721_master',
        'erc1155_master'
      ],
      
      // ========================================
      // EXTENSION MODULE FACTORIES
      // ========================================
      
      // ERC20 Extension Factory - Token Extensions
      'erc20_extension_factory': [
        // Core Extensions
        'compliance_module',
        'vesting_module',
        'timelock_module',
        'fee_module',
        'document_module',
        'snapshot_module',
        'voting_module',
        'delegation_module',
        // DeFi Extensions
        'staking_module',
        'reward_module',
        'dividend_module',
        'buyback_module',
        'liquidity_module',
        // Security Extensions
        'pausable_module',
        'blacklist_module',
        'whitelist_module',
        'transfer_restrictions_module',
        'accredited_investor_module',
        // Governance Extensions
        'proposal_module',
        'timelock_controller_module',
        'multisig_module'
      ],
      
      // ERC721 Extension Factory - NFT Extensions
      'erc721_extension_factory': [
        // Core Extensions
        'rental_module',
        'royalty_module',
        'fractionalization_module',
        'metadata_module',
        'enumerable_module',
        // Marketplace Extensions
        'auction_module',
        'offer_module',
        'bundle_module',
        // Social Extensions
        'social_module',
        'reputation_module',
        'achievement_module'
      ],
      
      // ERC1155 Extension Factory - Multi-Token Extensions
      'erc1155_extension_factory': [
        'supply_tracking_module',
        'batch_operations_module',
        'metadata_uri_module',
        'royalty_module'
      ],
      
      // ERC1400 Extension Factory - Security Token Extensions
      'erc1400_extension_factory': [
        'partition_module',
        'document_module',
        'issuance_module',
        'redemption_module',
        'transfer_restrictions_module',
        'compliance_module',
        'dividend_distribution_module'
      ],
      
      // ========================================
      // SPECIALIZED FACTORIES
      // ========================================
      
      // Governance Factory
      'governance_factory': [
        'timelock_controller_module',
        'proposal_module',
        'voting_module',
        'delegation_module',
        'multisig_module'
      ],
      
      // DeFi Factory
      'defi_factory': [
        'staking_module',
        'reward_module',
        'liquidity_module',
        'yield_module',
        'farming_module'
      ],
      
      // Compliance Factory
      'compliance_factory': [
        'kyc_module',
        'aml_module',
        'accredited_investor_module',
        'jurisdiction_module',
        'sanctions_module',
        'transfer_restrictions_module'
      ],
      
      // Treasury Factory
      'treasury_factory': [
        'dividend_module',
        'buyback_module',
        'vesting_module',
        'distribution_module'
      ],
      
      // ========================================
      // INFRASTRUCTURE FACTORIES
      // ========================================
      
      // Deployer Factory
      'deployer_factory': [
        'deterministic_deployer_module',
        'minimal_proxy_deployer_module',
        'beacon_deployer_module'
      ],
      
      // Registry Factory
      'registry_factory': [
        'token_registry_module',
        'module_registry_module',
        'factory_registry_module'
      ],
      
      // ========================================
      // FALLBACK: MATCH ALL MODULES
      // ========================================
      // If factory type not recognized, try to match modules generically
      'default_factory': [
        'compliance_module',
        'vesting_module',
        'timelock_module',
        'fee_module',
        'document_module'
      ]
    };

    // Get relevant template types for this factory
    const relevantTypes = mappings[factoryType] || mappings['default_factory'] || [];

    // Filter templates that match any of the relevant types
    return templateList.filter(t =>
      relevantTypes.some(type => t.contract_type.includes(type))
    );
  };

  const checkRegistrationStatus = async (registration: TemplateRegistration) => {
    try {
      // Connect to blockchain
      if (!window.ethereum) {
        console.warn('No ethereum provider');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const factoryContract = new ethers.Contract(
        registration.factoryAddress,
        FACTORY_ABI,
        provider
      );

      // Check if template is registered
      try {
        const registeredAddress = await factoryContract.getTemplateAddress(
          registration.templateType
        );

        const isRegistered =
          registeredAddress.toLowerCase() === registration.templateAddress.toLowerCase();

        // Update registration status
        setRegistrations(prev =>
          prev.map(r =>
            r.factoryAddress === registration.factoryAddress &&
              r.templateType === registration.templateType
              ? { ...r, isRegistered, checking: false }
              : r
          )
        );
      } catch (err) {
        // Factory might not have the method or template not registered
        setRegistrations(prev =>
          prev.map(r =>
            r.factoryAddress === registration.factoryAddress &&
              r.templateType === registration.templateType
              ? { ...r, isRegistered: false, checking: false }
              : r
          )
        );
      }
    } catch (err) {
      console.error('Failed to check registration:', err);
      setRegistrations(prev =>
        prev.map(r =>
          r.factoryAddress === registration.factoryAddress &&
            r.templateType === registration.templateType
            ? { ...r, checking: false }
            : r
        )
      );
    }
  };

  const registerTemplate = async (
    factoryAddress: string,
    templateType: string,
    templateAddress: string
  ) => {
    const registrationKey = `${factoryAddress}-${templateType}`;

    try {
      setRegistering(registrationKey);
      setError(null);
      setSuccess(null);

      // Check network
      if (!networkCorrect) {
        throw new Error('Please switch to Hoodi Testnet first');
      }

      // Connect to blockchain
      if (!window.ethereum) {
        throw new Error('No ethereum provider found. Please install MetaMask.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      const factoryContract = new ethers.Contract(
        factoryAddress,
        FACTORY_ABI,
        signer
      );

      // Estimate gas
      let gasEstimate;
      try {
        gasEstimate = await factoryContract.registerTemplate.estimateGas(
          templateType,
          templateAddress
        );
        console.log('Estimated gas:', gasEstimate.toString());
      } catch (estimateErr) {
        console.warn('Failed to estimate gas, will use default:', estimateErr);
      }

      // Register template
      const tx = await factoryContract.registerTemplate(
        templateType,
        templateAddress,
        gasEstimate ? { gasLimit: gasEstimate * BigInt(120) / BigInt(100) } : {}
      );
      
      setSuccess(`Transaction submitted. Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        throw new Error('Transaction failed');
      }

      // Update registration status
      setRegistrations(prev =>
        prev.map(r =>
          r.factoryAddress === factoryAddress && r.templateType === templateType
            ? { ...r, isRegistered: true }
            : r
        )
      );

      setSuccess(`Successfully registered ${templateType} template`);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Failed to register template:', err);
      
      // Better error messages
      let errorMessage = 'Failed to register template';
      if (err.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setRegistering(null);
    }
  };

  const registerAllUnregistered = async () => {
    try {
      setBatchRegistering(true);
      setError(null);
      setSuccess(null);

      // Check network
      if (!networkCorrect) {
        throw new Error('Please switch to Hoodi Testnet first');
      }

      const unregistered = registrations.filter(r => !r.isRegistered && !r.checking);
      
      if (unregistered.length === 0) {
        setSuccess('All templates are already registered!');
        return;
      }

      setSuccess(`Starting batch registration of ${unregistered.length} templates...`);

      let successCount = 0;
      let failCount = 0;

      for (const registration of unregistered) {
        try {
          await registerTemplate(
            registration.factoryAddress,
            registration.templateType,
            registration.templateAddress
          );
          successCount++;
        } catch (err) {
          console.error('Failed to register:', registration.templateType, err);
          failCount++;
        }
      }

      if (failCount === 0) {
        setSuccess(`Successfully registered all ${successCount} templates!`);
      } else {
        setSuccess(`Registered ${successCount} templates. ${failCount} failed.`);
      }

      // Clear success message after 7 seconds
      setTimeout(() => setSuccess(null), 7000);
    } catch (err) {
      console.error('Batch registration failed:', err);
      setError(err instanceof Error ? err.message : 'Batch registration failed');
    } finally {
      setBatchRegistering(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId: number) => {
    return getChainName(chainId) || `Chain ${chainId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const unregisteredCount = registrations.filter(r => !r.isRegistered && !r.checking).length;
  const totalCount = registrations.length;
  const registeredCount = totalCount - unregisteredCount;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Factory Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Register active templates in factory contracts for deployment
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unregisteredCount > 0 && (
            <Button
              onClick={registerAllUnregistered}
              disabled={batchRegistering || !networkCorrect}
              variant="default"
              size="sm"
            >
              {batchRegistering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Registering...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Register All ({unregisteredCount})
                </>
              )}
            </Button>
          )}
          <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Network Warning */}
      {currentChainId !== null && !networkCorrect && (
        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <Network className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">Wrong Network</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <div className="space-y-2">
              <p>
                You are connected to <strong>{getNetworkName(currentChainId)}</strong>.
                Please switch to <strong>Hoodi Testnet</strong> to register templates.
              </p>
              <Button onClick={switchToHoodiTestnet} size="sm" variant="outline">
                Switch to Hoodi Testnet
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      {totalCount > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Registration Progress</span>
                <span className="text-sm text-muted-foreground">
                  {registeredCount} / {totalCount} templates
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(registeredCount / totalCount) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About Factory Configuration</AlertTitle>
        <AlertDescription>
          <div className="space-y-1 mt-2">
            <p>Factories need to know which templates to use when deploying new tokens.</p>
            <p className="font-medium">
              Click "Register" to connect a template to a factory via a blockchain transaction.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Network: Hoodi Testnet (Chain ID: {HOODI_TESTNET_CHAIN_ID})
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* No Factories Alert */}
      {factories.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Factories Found</AlertTitle>
          <AlertDescription>
            No factory contracts found. Deploy factory contracts first before configuring templates.
          </AlertDescription>
        </Alert>
      )}

      {/* Factory Cards */}
      <div className="space-y-6">
        {factories.map((factory) => {
          const factoryRegistrations = registrations.filter(
            r => r.factoryAddress === factory.contract_address
          );

          const factoryRegisteredCount = factoryRegistrations.filter(r => r.isRegistered).length;
          const factoryTotalCount = factoryRegistrations.length;
          const allRegistered = factoryRegisteredCount === factoryTotalCount && factoryTotalCount > 0;

          return (
            <Card key={factory.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {factory.contract_details?.name || factory.contract_type}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <a
                        href={getAddressUrl(HOODI_TESTNET_CHAIN_ID, factory.contract_address) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {formatAddress(factory.contract_address)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {factory.contract_details?.verified && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Verified
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={allRegistered ? 'default' : 'outline'} className={allRegistered ? 'bg-green-600' : ''}>
                      {factoryRegisteredCount}/{factoryTotalCount} templates
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {factoryRegistrations.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No active templates found for this factory type.
                      Activate templates in Template Management first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {factoryRegistrations.map((registration) => {
                      const registrationKey = `${registration.factoryAddress}-${registration.templateType}`;
                      const isRegistering = registering === registrationKey;

                      return (
                        <div
                          key={registrationKey}
                          className={`flex items-center justify-between p-3 border rounded transition-colors ${
                            registration.isRegistered 
                              ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' 
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{registration.templateType}</h4>
                              {registration.checking ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : registration.isRegistered ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Registered
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Not Registered
                                </Badge>
                              )}
                            </div>
                            <a
                              href={getAddressUrl(HOODI_TESTNET_CHAIN_ID, registration.templateAddress) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 mt-1"
                            >
                              {formatAddress(registration.templateAddress)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>

                          <Button
                            onClick={() =>
                              registerTemplate(
                                registration.factoryAddress,
                                registration.templateType,
                                registration.templateAddress
                              )
                            }
                            disabled={
                              isRegistering || 
                              registration.isRegistered || 
                              registration.checking || 
                              !networkCorrect ||
                              batchRegistering
                            }
                            variant={registration.isRegistered ? 'default' : 'outline'}
                            size="sm"
                          >
                            {isRegistering ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Registering...
                              </>
                            ) : registration.isRegistered ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Registered
                              </>
                            ) : (
                              <>
                                <Settings className="h-4 w-4 mr-2" />
                                Register
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}