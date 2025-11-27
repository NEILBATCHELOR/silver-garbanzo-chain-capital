/**
 * Factory Configuration Page - DYNAMIC VERSION
 * 
 * Loads all contract data from the database dynamically.
 * Supports multiple deployments with version/date selector.
 * 
 * ARCHITECTURE (Actual Deployed System):
 * ═══════════════════════════════════════
 * BeaconProxyFactory → deploys BeaconProxy → points to TokenBeacon → points to Master
 * 
 * Key Points:
 * - NO template registration needed - factories take beacon addresses directly
 * - Token-specific factories (ERC20Factory, etc.) handle token deployment
 * - Extension factories handle module attachment
 * - Masters are template implementations that beacons point to
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Loader2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Info,
  Layers,
  Box,
  Zap,
  Settings,
  Cpu,
  Shield,
  Search,
  Copy,
  Check,
  Database,
  Factory,
  Package,
  Calendar,
  GitBranch
} from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';
import { useToast } from '@/components/ui/use-toast';
import { DeploymentImportDialog } from './DeploymentImportDialog';
import { DeploymentDialog } from './DeploymentDialog';

// ============================================
// Types
// ============================================

interface ContractMaster {
  id: string;
  contract_type: string;
  contract_address: string;
  is_template: boolean;
  is_active: boolean;
  network: string;
  environment: string;
  abi: unknown;
  version: string | null;
  deployment_tx_hash: string | null;
  contract_details: {
    name?: string;
    description?: string;
    standard?: string;
    category?: string;
    forStandard?: string;
    master?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface CategoryConfig {
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

interface Deployment {
  date: string;
  label: string;
  count: number;
  network: string;
}

// ============================================
// Constants
// ============================================

const NETWORK_EXPLORERS: Record<string, string> = {
  hoodi: 'https://hoodi.etherscan.io',
  mainnet: 'https://etherscan.io',
  sepolia: 'https://sepolia.etherscan.io',
};

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  factories: {
    label: 'Token Factories',
    icon: <Factory className="h-4 w-4" />,
    description: 'Deploy new token instances via beacon proxies',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  },
  beacons: {
    label: 'Token Beacons',
    icon: <Layers className="h-4 w-4" />,
    description: 'Upgradeable pointers to master implementations',
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  },
  masters: {
    label: 'Master Implementations',
    icon: <Box className="h-4 w-4" />,
    description: 'Template contracts that beacons point to',
    color: 'bg-green-500/10 text-green-500 border-green-500/20'
  },
  modules: {
    label: 'Extension Modules',
    icon: <Zap className="h-4 w-4" />,
    description: 'Attachable functionality for tokens',
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
  },
  extensionFactories: {
    label: 'Extension Factories',
    icon: <Package className="h-4 w-4" />,
    description: 'Deploy extension instances for tokens',
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
  },
  infrastructure: {
    label: 'Infrastructure',
    icon: <Cpu className="h-4 w-4" />,
    description: 'Core system contracts (registries, deployers)',
    color: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  },
  governance: {
    label: 'Governance',
    icon: <Shield className="h-4 w-4" />,
    description: 'Upgrade control and multi-sig contracts',
    color: 'bg-red-500/10 text-red-500 border-red-500/20'
  },
  other: {
    label: 'Other Contracts',
    icon: <Settings className="h-4 w-4" />,
    description: 'Uncategorized contracts',
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }
};

// ============================================
// Helpers
// ============================================

const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getExplorerLink = (address: string, network: string): string => {
  const base = NETWORK_EXPLORERS[network] || NETWORK_EXPLORERS.hoodi;
  return `${base}/address/${address}`;
};

const categorizeContract = (contractType: string): string => {
  const t = contractType.toLowerCase();
  
  if (t.includes('factory') && !t.includes('extension') && !t.includes('wallet')) {
    if (t.includes('erc20') || t.includes('erc721') || t.includes('erc1155') || 
        t.includes('erc1400') || t.includes('erc3525') || t.includes('erc4626') ||
        t === 'beacon_proxy_factory') {
      return 'factories';
    }
  }
  
  if (t.includes('extension') && t.includes('factory')) {
    return 'extensionFactories';
  }
  
  if (t.includes('beacon') && !t.includes('factory')) {
    return 'beacons';
  }
  
  if (t.includes('master')) {
    return 'masters';
  }
  
  if (t.includes('module') || t === 'extension_module') {
    return 'modules';
  }
  
  if (t.includes('registry') || t.includes('deployer') || 
      t.includes('policy') || t === 'haircut_engine') {
    return 'infrastructure';
  }
  
  if (t.includes('governance') || t.includes('governor') || 
      t.includes('multisig') || t.includes('multi_sig')) {
    return 'governance';
  }
  
  return 'other';
};

const getDisplayName = (contractType: string, details: ContractMaster['contract_details']): string => {
  if (details?.name) return details.name;
  
  return contractType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getTokenStandard = (contractType: string): string | null => {
  const match = contractType.match(/erc\d+/i);
  return match ? match[0].toUpperCase() : null;
};


// ============================================
// Components
// ============================================

interface CopyButtonProps {
  text: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 w-6 p-0">
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
};

interface ContractCardProps {
  contract: ContractMaster;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract }) => {
  const standard = getTokenStandard(contract.contract_type);
  const displayName = getDisplayName(contract.contract_type, contract.contract_details);
  
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{displayName}</span>
          {standard && (
            <Badge variant="outline" className="text-xs">
              {standard}
            </Badge>
          )}
          {contract.is_template && (
            <Badge variant="secondary" className="text-xs">
              Template
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <code className="text-xs text-muted-foreground font-mono">
            {formatAddress(contract.contract_address)}
          </code>
          <CopyButton text={contract.contract_address} />
          <a
            href={getExplorerLink(contract.contract_address, contract.network)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          v{contract.version || '1.0.0'} • {contract.network}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {contract.is_active ? (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Inactive
          </Badge>
        )}
      </div>
    </div>
  );
};

interface CategorySectionProps {
  category: string;
  contracts: ContractMaster[];
  config: CategoryConfig;
}

const CategorySection: React.FC<CategorySectionProps> = ({ category, contracts, config }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (contracts.length === 0) return null;
  
  return (
    <Card className="mb-4">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              {config.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{config.label}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{contracts.length}</Badge>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-2">
          {contracts.map(contract => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </CardContent>
      )}
    </Card>
  );
};

// ============================================
// Main Component
// ============================================

export const FactoryConfigurationPage: React.FC = () => {
  const { toast } = useToast();
  const [allContracts, setAllContracts] = useState<ContractMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('hoodi');
  const [selectedDeployment, setSelectedDeployment] = useState<string>('latest');
  const [refreshing, setRefreshing] = useState(false);
  
  // Get unique deployments from all contracts
  const deployments = useMemo((): Deployment[] => {
    const deploymentMap = new Map<string, Deployment>();
    
    allContracts.forEach(contract => {
      const dateKey = contract.created_at.split('T')[0];
      const key = `${contract.network}-${dateKey}`;
      const existing = deploymentMap.get(key);
      
      if (existing) {
        existing.count++;
      } else {
        deploymentMap.set(key, {
          date: dateKey,
          label: new Date(dateKey).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }),
          count: 1,
          network: contract.network
        });
      }
    });
    
    return Array.from(deploymentMap.values())
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allContracts]);

  // Get unique networks
  const networks = useMemo(() => {
    const networkSet = new Set(allContracts.map(c => c.network));
    return Array.from(networkSet);
  }, [allContracts]);

  // Filter by deployment and network
  const networkFilteredContracts = useMemo(() => {
    let filtered = allContracts.filter(c => c.network === selectedNetwork);
    
    if (selectedDeployment !== 'all' && selectedDeployment !== 'latest') {
      filtered = filtered.filter(c => c.created_at.startsWith(selectedDeployment));
    } else if (selectedDeployment === 'latest' && deployments.length > 0) {
      const latestDate = deployments.find(d => d.network === selectedNetwork)?.date;
      if (latestDate) {
        filtered = filtered.filter(c => c.created_at.startsWith(latestDate));
      }
    }
    
    return filtered;
  }, [allContracts, selectedNetwork, selectedDeployment, deployments]);

  // Filter by search query
  const filteredContracts = useMemo(() => {
    if (!searchQuery) return networkFilteredContracts;
    
    const query = searchQuery.toLowerCase();
    return networkFilteredContracts.filter(contract => {
      const matchesType = contract.contract_type.toLowerCase().includes(query);
      const matchesAddress = contract.contract_address.toLowerCase().includes(query);
      const matchesName = contract.contract_details?.name?.toLowerCase().includes(query);
      return matchesType || matchesAddress || matchesName;
    });
  }, [networkFilteredContracts, searchQuery]);
  
  // Group contracts by category
  const categorizedContracts = useMemo(() => {
    const groups: Record<string, ContractMaster[]> = {};
    
    for (const contract of filteredContracts) {
      const category = categorizeContract(contract.contract_type);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(contract);
    }
    
    return groups;
  }, [filteredContracts]);
  
  // Stats
  const stats = useMemo(() => ({
    total: filteredContracts.length,
    templates: filteredContracts.filter(c => c.is_template).length,
    factories: (categorizedContracts.factories?.length || 0) + (categorizedContracts.extensionFactories?.length || 0),
    modules: categorizedContracts.modules?.length || 0
  }), [filteredContracts, categorizedContracts]);
  
  // Load contracts from database
  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: dbError } = await supabase
        .from('contract_masters')
        .select('*')
        .order('contract_type', { ascending: true });
      
      if (dbError) throw dbError;
      
      setAllContracts(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load contracts';
      setError(message);
      toast({
        title: 'Error loading contracts',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Initial load
  useEffect(() => {
    loadContracts();
  }, [loadContracts]);
  
  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContracts();
    setRefreshing(false);
    toast({ title: 'Contracts refreshed' });
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Factory Configuration</h1>
            <p className="text-muted-foreground">Loading deployed contracts...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadContracts} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Factory Configuration</h1>
          <p className="text-muted-foreground">
            View deployed contracts and manage deployments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DeploymentDialog onDeploymentComplete={loadContracts} />
          <DeploymentImportDialog onImportComplete={loadContracts} />
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Deployment & Network Selectors */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                <Calendar className="h-4 w-4 inline mr-2" />
                Deployment Version
              </label>
              <Select value={selectedDeployment} onValueChange={setSelectedDeployment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select deployment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest Deployment</SelectItem>
                  <SelectItem value="all">All Deployments</SelectItem>
                  {deployments
                    .filter(d => d.network === selectedNetwork)
                    .map(deployment => (
                      <SelectItem key={deployment.date} value={deployment.date}>
                        {deployment.label} ({deployment.count} contracts)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                <GitBranch className="h-4 w-4 inline mr-2" />
                Network
              </label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {networks.length === 0 ? (
                    <SelectItem value="hoodi">Hoodi</SelectItem>
                  ) : (
                    networks.map(network => (
                      <SelectItem key={network} value={network}>
                        {network.charAt(0).toUpperCase() + network.slice(1)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Architecture Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Beacon Proxy Architecture</AlertTitle>
        <AlertDescription className="mt-2">
          <div className="font-mono text-xs bg-muted p-2 rounded mt-2">
            BeaconProxyFactory → BeaconProxy → TokenBeacon → Master Implementation
          </div>
          <p className="text-sm mt-2">
            Tokens are deployed via factories that create beacon proxies. Beacons point to upgradeable 
            master implementations, allowing centralized upgrades across all tokens.
          </p>
        </AlertDescription>
      </Alert>

      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Contracts</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Factories</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.factories}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Modules</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.modules}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Templates</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.templates}</p>
        </Card>
      </div>
      
      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contracts by name, type, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Contract Categories */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="">
          <TabsTrigger value="all">All Categories</TabsTrigger>
          <TabsTrigger value="factories">Factories</TabsTrigger>
          <TabsTrigger value="beacons">Beacons</TabsTrigger>
          <TabsTrigger value="masters">Masters</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {Object.entries(CATEGORY_CONFIG).map(([category, config]) => (
            <CategorySection
              key={category}
              category={category}
              contracts={categorizedContracts[category] || []}
              config={config}
            />
          ))}
        </TabsContent>
        
        <TabsContent value="factories" className="mt-4">
          <CategorySection
            category="factories"
            contracts={categorizedContracts.factories || []}
            config={CATEGORY_CONFIG.factories}
          />
          <CategorySection
            category="extensionFactories"
            contracts={categorizedContracts.extensionFactories || []}
            config={CATEGORY_CONFIG.extensionFactories}
          />
        </TabsContent>
        
        <TabsContent value="beacons" className="mt-4">
          <CategorySection
            category="beacons"
            contracts={categorizedContracts.beacons || []}
            config={CATEGORY_CONFIG.beacons}
          />
        </TabsContent>
        
        <TabsContent value="masters" className="mt-4">
          <CategorySection
            category="masters"
            contracts={categorizedContracts.masters || []}
            config={CATEGORY_CONFIG.masters}
          />
        </TabsContent>
        
        <TabsContent value="modules" className="mt-4">
          <CategorySection
            category="modules"
            contracts={categorizedContracts.modules || []}
            config={CATEGORY_CONFIG.modules}
          />
        </TabsContent>
        
        <TabsContent value="infrastructure" className="mt-4">
          <CategorySection
            category="infrastructure"
            contracts={categorizedContracts.infrastructure || []}
            config={CATEGORY_CONFIG.infrastructure}
          />
          <CategorySection
            category="governance"
            contracts={categorizedContracts.governance || []}
            config={CATEGORY_CONFIG.governance}
          />
        </TabsContent>
      </Tabs>
      
      {filteredContracts.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No contracts found</AlertTitle>
          <AlertDescription>
            {searchQuery 
              ? `No contracts match "${searchQuery}"`
              : `No contracts found for ${selectedNetwork} network`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FactoryConfigurationPage;
