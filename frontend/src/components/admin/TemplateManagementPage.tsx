/**
 * Template Management Page
 * Admin interface for managing deployed contract templates
 * 
 * BUSINESS LOGIC:
 * - Templates are grouped by SPECIFIC contract_type (e.g., erc20_master, erc721_master)
 * - Multiple versions of the same contract_type can exist
 * - Only ONE version per contract_type can be active at a time
 * - ALL different contract types can be active simultaneously
 *   (e.g., erc20_master AND erc721_master can both be active)
 * 
 * This allows:
 * - Version management: Deploy v2.0.0 of erc20_master, switch active version
 * - Full token selection: Users can deploy any active token type
 * - Module availability: All modules can be independently active/inactive
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  ChevronDown,
  ChevronRight,
  GitBranch,
  Layers,
  Package,
  Settings2,
  Shield
} from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Template {
  id: string;
  contract_type: string;
  contract_address: string;
  version: string;
  is_template: boolean;
  is_active: boolean;
  network: string;
  deployment_tx_hash: string | null;
  contract_details: {
    name?: string;
    verified?: boolean;
    verificationUrl?: string;
  } | null;
  deployed_at: string;
  created_at: string;
}

interface ContractTypeGroup {
  contractType: string;
  displayName: string;
  category: 'master' | 'module' | 'infrastructure';
  description: string;
  templates: Template[];
  activeVersion: Template | null;
}

interface CategorySection {
  category: string;
  displayName: string;
  icon: React.ReactNode;
  description: string;
  contractTypes: ContractTypeGroup[];
}

// Helper functions - defined outside component to avoid initialization order issues
const formatContractTypeName = (contractType: string): string => {
  return contractType
    .split('_')
    .map(part => {
      if (part.match(/^erc\d+/i)) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
};

const getContractCategory = (contractType: string): 'master' | 'module' | 'infrastructure' => {
  if (contractType.includes('_master')) return 'master';
  if (contractType.includes('_module')) return 'module';
  return 'infrastructure';
};


const getContractTypeDescription = (contractType: string): string => {
  const descriptions: Record<string, string> = {
    // Masters
    'erc20_master': 'Standard fungible token (ERC-20)',
    'erc20_rebasing_master': 'Rebasing/elastic supply token',
    'erc20_wrapper_master': 'Wrapped token implementation',
    'erc721_master': 'Non-fungible token (NFT)',
    'erc721_wrapper_master': 'Wrapped NFT implementation',
    'erc1155_master': 'Multi-token standard',
    'erc1400_master': 'Security token standard',
    'erc3525_master': 'Semi-fungible token (SFT)',
    'erc4626_master': 'Tokenized vault standard',
    // Modules
    'vesting_module': 'Token vesting schedules',
    'compliance_module': 'Regulatory compliance',
    'document_module': 'Document management',
    'snapshot_module': 'Balance snapshots',
    'votes_module': 'Governance voting',
    'permit_module': 'Gasless approvals (EIP-2612)',
    'flash_mint_module': 'Flash minting capability',
    'fee_module': 'Transfer fee management',
    'timelock_module': 'Time-locked operations',
    'supply_cap_module': 'Maximum supply enforcement',
    'soulbound_module': 'Non-transferable tokens',
    'consecutive_module': 'Batch minting (ERC-2309)',
    'rental_module': 'Token rental (ERC-4907)',
    'payable_module': 'Payment handling',
    'fraction_module': 'Token fractionalization',
  };
  return descriptions[contractType] || 'Contract template';
};

const getExplorerUrl = (address: string, network: string): string => {
  const explorers: Record<string, string> = {
    hoodi: 'https://hoodi.etherscan.io',
    mainnet: 'https://etherscan.io',
    sepolia: 'https://sepolia.etherscan.io',
  };
  const base = explorers[network] || explorers.hoodi;
  return `${base}/address/${address}`;
};

const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function TemplateManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['master']));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('hoodi');

  // Get unique networks
  const networks = useMemo(() => {
    const networkSet = new Set(allTemplates.map(t => t.network));
    return Array.from(networkSet);
  }, [allTemplates]);

  // Filter by network
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(t => t.network === selectedNetwork);
  }, [allTemplates, selectedNetwork]);


  // Organize templates into structured categories
  const categorySections = useMemo((): CategorySection[] => {
    const typeGroups = new Map<string, Template[]>();
    
    filteredTemplates.forEach(template => {
      const existing = typeGroups.get(template.contract_type) || [];
      existing.push(template);
      typeGroups.set(template.contract_type, existing);
    });

    const contractTypeGroups: ContractTypeGroup[] = Array.from(typeGroups.entries()).map(
      ([contractType, templates]) => {
        templates.sort((a, b) => b.created_at.localeCompare(a.created_at));
        
        return {
          contractType,
          displayName: formatContractTypeName(contractType),
          category: getContractCategory(contractType),
          description: getContractTypeDescription(contractType),
          templates,
          activeVersion: templates.find(t => t.is_active) || null,
        };
      }
    );

    const masters = contractTypeGroups.filter(g => g.category === 'master');
    const modules = contractTypeGroups.filter(g => g.category === 'module');
    const infrastructure = contractTypeGroups.filter(g => g.category === 'infrastructure');

    masters.sort((a, b) => a.displayName.localeCompare(b.displayName));
    modules.sort((a, b) => a.displayName.localeCompare(b.displayName));
    infrastructure.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return [
      {
        category: 'master',
        displayName: 'Token Masters',
        icon: <Layers className="h-5 w-5" />,
        description: 'Master templates for each token standard. Each can be independently active.',
        contractTypes: masters,
      },
      {
        category: 'module',
        displayName: 'Extension Modules',
        icon: <Package className="h-5 w-5" />,
        description: 'Optional modules that can be attached to tokens. Each can be independently toggled.',
        contractTypes: modules,
      },
      {
        category: 'infrastructure',
        displayName: 'Infrastructure',
        icon: <Settings2 className="h-5 w-5" />,
        description: 'Factory, beacon, and deployer contracts.',
        contractTypes: infrastructure,
      },
    ].filter(section => section.contractTypes.length > 0);
  }, [filteredTemplates]);

  const stats = useMemo(() => {
    const total = filteredTemplates.length;
    const active = filteredTemplates.filter(t => t.is_active).length;
    const verified = filteredTemplates.filter(t => t.contract_details?.verified).length;
    const masters = filteredTemplates.filter(t => t.contract_type.includes('_master')).length;
    const modules = filteredTemplates.filter(t => t.contract_type.includes('_module')).length;
    return { total, active, verified, masters, modules };
  }, [filteredTemplates]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('contract_masters')
        .select('*')
        .eq('is_template', true)
        .order('contract_type', { ascending: true })
        .order('version', { ascending: false });

      if (dbError) throw dbError;
      setAllTemplates(data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };


  const toggleTemplateActive = async (template: Template, contractTypeGroup: ContractTypeGroup) => {
    const newActiveState = !template.is_active;
    
    try {
      setSaving(template.id);
      setError(null);
      setSuccess(null);

      if (newActiveState) {
        const otherVersionIds = contractTypeGroup.templates
          .filter(t => t.id !== template.id)
          .map(t => t.id);

        if (otherVersionIds.length > 0) {
          const { error: deactivateError } = await supabase
            .from('contract_masters')
            .update({ is_active: false })
            .in('id', otherVersionIds);

          if (deactivateError) throw deactivateError;
        }
      }

      const { error: updateError } = await supabase
        .from('contract_masters')
        .update({ is_active: newActiveState })
        .eq('id', template.id);

      if (updateError) throw updateError;

      await loadTemplates();

      const action = newActiveState ? 'Activated' : 'Deactivated';
      setSuccess(`${action}: ${formatContractTypeName(template.contract_type)} v${template.version}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update template:', err);
      setError(err instanceof Error ? err.message : 'Failed to update template');
    } finally {
      setSaving(null);
    }
  };

  const activateAllInCategory = async (section: CategorySection) => {
    try {
      setSaving('bulk');
      setError(null);

      const templateIds = section.contractTypes
        .map(group => group.templates[0]?.id)
        .filter(Boolean);

      if (templateIds.length === 0) return;

      const { error: updateError } = await supabase
        .from('contract_masters')
        .update({ is_active: true })
        .in('id', templateIds);

      if (updateError) throw updateError;

      await loadTemplates();
      setSuccess(`Activated ${templateIds.length} templates in ${section.displayName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to bulk activate:', err);
      setError(err instanceof Error ? err.message : 'Failed to bulk activate');
    } finally {
      setSaving(null);
    }
  };

  const deactivateAllInCategory = async (section: CategorySection) => {
    try {
      setSaving('bulk');
      setError(null);

      const templateIds = section.contractTypes
        .flatMap(group => group.templates.map(t => t.id));

      if (templateIds.length === 0) return;

      const { error: updateError } = await supabase
        .from('contract_masters')
        .update({ is_active: false })
        .in('id', templateIds);

      if (updateError) throw updateError;

      await loadTemplates();
      setSuccess(`Deactivated all templates in ${section.displayName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to bulk deactivate:', err);
      setError(err instanceof Error ? err.message : 'Failed to bulk deactivate');
    } finally {
      setSaving(null);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Management</h1>
          <p className="text-muted-foreground mt-2">
            Configure which contract templates are available for token deployment
          </p>
        </div>
        <Button onClick={loadTemplates} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
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

      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Templates</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.masters}</div>
              <div className="text-sm text-muted-foreground">Token Masters</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.modules}</div>
              <div className="text-sm text-muted-foreground">Modules</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.verified}</div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </div>
          </CardContent>
        </Card>
      </div>


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

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> Each contract type (e.g., ERC20 Master, Vesting Module) can be 
          independently activated. If multiple versions exist for the same type, only one version can be 
          active. Active templates are available for user token deployments.
        </AlertDescription>
      </Alert>

      {categorySections.length === 0 && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No templates found for {selectedNetwork} network. Deploy templates first using the deployment scripts.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {categorySections.map((section) => {
          const activeCount = section.contractTypes.filter(g => g.activeVersion).length;
          const totalCount = section.contractTypes.length;

          return (
            <Card key={section.category}>
              <Collapsible
                open={expandedCategories.has(section.category)}
                onOpenChange={() => toggleCategory(section.category)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedCategories.has(section.category) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="text-muted-foreground">{section.icon}</div>
                        <div>
                          <CardTitle>{section.displayName}</CardTitle>
                          <CardDescription className="mt-1">{section.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{totalCount} types</Badge>
                        <Badge 
                          variant={activeCount === totalCount ? "default" : "secondary"}
                          className={activeCount === totalCount ? "bg-green-600" : ""}
                        >
                          {activeCount}/{totalCount} active
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 pb-4 border-b">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => activateAllInCategory(section)}
                        disabled={saving === 'bulk' || activeCount === totalCount}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Activate All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deactivateAllInCategory(section)}
                        disabled={saving === 'bulk' || activeCount === 0}
                      >
                        Deactivate All
                      </Button>
                    </div>


                    <div className="space-y-3">
                      {section.contractTypes.map((group) => {
                        const latestTemplate = group.templates[0];
                        const hasMultipleVersions = group.templates.length > 1;
                        const isActive = group.activeVersion !== null;

                        return (
                          <div
                            key={group.contractType}
                            className={`p-4 border rounded-lg transition-colors ${
                              isActive 
                                ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' 
                                : 'border-border hover:border-muted-foreground/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{group.displayName}</h4>
                                  {isActive && (
                                    <Badge variant="default" className="bg-green-600">Active</Badge>
                                  )}
                                  {latestTemplate?.contract_details?.verified && (
                                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Verified
                                    </Badge>
                                  )}
                                  {hasMultipleVersions && (
                                    <Badge variant="outline">{group.templates.length} versions</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{group.description}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                                  <a
                                    href={getExplorerUrl(latestTemplate.contract_address, latestTemplate.network)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-blue-600"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {formatAddress(latestTemplate.contract_address)}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <span>v{latestTemplate.version}</span>
                                  <span>
                                    Deployed {new Date(latestTemplate.deployed_at || latestTemplate.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <Label htmlFor={`toggle-${group.contractType}`} className="text-sm text-muted-foreground">
                                  {isActive ? 'Active' : 'Inactive'}
                                </Label>
                                <Switch
                                  id={`toggle-${group.contractType}`}
                                  checked={isActive}
                                  onCheckedChange={() => toggleTemplateActive(latestTemplate, group)}
                                  disabled={saving !== null}
                                />
                                {saving === latestTemplate.id && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                              </div>
                            </div>


                            {hasMultipleVersions && (
                              <div className="mt-4 pt-4 border-t">
                                <h5 className="text-sm font-medium mb-2">Available Versions</h5>
                                <div className="space-y-2">
                                  {group.templates.map((template) => (
                                    <div
                                      key={template.id}
                                      className={`flex items-center justify-between p-2 rounded ${
                                        template.is_active 
                                          ? 'bg-green-100 dark:bg-green-950/30' 
                                          : 'bg-muted/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="font-mono">v{template.version}</span>
                                        <span className="text-muted-foreground">
                                          {formatAddress(template.contract_address)}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {new Date(template.created_at).toLocaleDateString()}
                                        </span>
                                        {template.is_active && (
                                          <Badge variant="default" className="bg-green-600 text-xs">Active</Badge>
                                        )}
                                      </div>
                                      {!template.is_active && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleTemplateActive(template, group)}
                                          disabled={saving !== null}
                                        >
                                          Make Active
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
