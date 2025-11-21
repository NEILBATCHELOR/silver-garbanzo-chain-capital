/**
 * Factory Configuration Page
 * Admin interface for configuring factory contracts with templates
 * Manages which templates each factory should use for deployment
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
  Settings
} from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';
import { ethers } from 'ethers';

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

export function FactoryConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [registrations, setRegistrations] = useState<TemplateRegistration[]>([]);
  const [registering, setRegistering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

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
    const mappings: Record<string, string[]> = {
      'erc20_factory': ['erc20_master', 'erc20_rebasing_master', 'erc20_wrapper_master'],
      'erc721_factory': ['erc721_master', 'erc721_wrapper_master'],
      'erc1155_factory': ['erc1155_master'],
      'erc1400_factory': ['erc1400_master'],
      'erc3525_factory': ['erc3525_master'],
      'erc4626_factory': ['erc4626_master'],
      'beacon_proxy_factory': ['erc20_master', 'erc721_master', 'erc1155_master'],
      // Add mappings for module factories
      'erc20_extension_factory': ['compliance_module', 'vesting_module', 'timelock_module', 'fee_module'],
      'erc721_extension_factory': ['rental_module', 'royalty_module', 'fractionalization_module'],
      // Add more mappings as needed
    };

    const relevantTypes = mappings[factoryType] || [];

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

      // Register template
      const tx = await factoryContract.registerTemplate(templateType, templateAddress);
      await tx.wait();

      // Update registration status
      setRegistrations(prev =>
        prev.map(r =>
          r.factoryAddress === factoryAddress && r.templateType === templateType
            ? { ...r, isRegistered: true }
            : r
        )
      );

      setSuccess(`Successfully registered ${templateType} template`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to register template:', err);
      setError(err instanceof Error ? err.message : 'Failed to register template');
    } finally {
      setRegistering(null);
    }
  };

  const getExplorerUrl = (address: string) => {
    return `https://hoodi.etherscan.io/address/${address}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
        <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
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

          const registeredCount = factoryRegistrations.filter(r => r.isRegistered).length;
          const totalCount = factoryRegistrations.length;

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
                        href={getExplorerUrl(factory.contract_address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-blue-600"
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
                    <Badge variant={registeredCount === totalCount ? 'default' : 'outline'}>
                      {registeredCount}/{totalCount} templates
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
                          className={`flex items-center justify-between p-3 border rounded ${registration.isRegistered ? 'border-green-500 bg-green-50/50' : ''
                            }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{registration.templateType}</h4>
                              {registration.checking ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : registration.isRegistered ? (
                                <Badge variant="default" className="bg-green-600">
                                  Registered
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  Not Registered
                                </Badge>
                              )}
                            </div>
                            <a
                              href={getExplorerUrl(registration.templateAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground flex items-center gap-1 hover:text-blue-600 mt-1"
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
                            disabled={isRegistering || registration.isRegistered || registration.checking}
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
