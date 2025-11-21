/**
 * Template Management Page
 * Admin interface for managing deployed contract templates
 * Allows selection of active templates for each token standard
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink, 
  RefreshCw,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight
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
  contract_details: {
    name?: string;
    verified?: boolean;
    verificationUrl?: string;
  };
  deployed_at: string;
}

interface TemplateCategory {
  category: string;
  description: string;
  templates: Template[];
  activeTemplate: string | null;
}

export function TemplateManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (templates.length > 0) {
      organizeTemplates();
    }
  }, [templates]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('contract_masters')
        .select('*')
        .eq('network', 'hoodi')
        .eq('environment', 'testnet')
        .eq('is_template', true)
        .order('contract_type', { ascending: true })
        .order('deployed_at', { ascending: false });

      if (dbError) throw dbError;

      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const organizeTemplates = () => {
    // Group templates by category
    const categoryMap: Record<string, Template[]> = {};

    templates.forEach(template => {
      // Extract category from contract_type
      const category = getCategoryFromType(template.contract_type);
      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }
      categoryMap[category].push(template);
    });

    // Convert to array with metadata
    const categoriesArray: TemplateCategory[] = Object.entries(categoryMap).map(
      ([category, categoryTemplates]) => {
        // Find currently active template (if any)
        const activeTemplate = categoryTemplates.find(t => t.is_active);

        return {
          category,
          description: getCategoryDescription(category),
          templates: categoryTemplates,
          activeTemplate: activeTemplate?.id || null,
        };
      }
    );

    // Sort categories
    categoriesArray.sort((a, b) => {
      const order = ['master', 'module', 'factory', 'infrastructure'];
      const aIndex = order.findIndex(o => a.category.toLowerCase().includes(o));
      const bIndex = order.findIndex(o => b.category.toLowerCase().includes(o));
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      return a.category.localeCompare(b.category);
    });

    setCategories(categoriesArray);
    
    // Expand master templates by default
    setExpandedCategories(new Set(
      categoriesArray
        .filter(c => c.category.toLowerCase().includes('master'))
        .map(c => c.category)
    ));
  };

  const getCategoryFromType = (contractType: string): string => {
    if (contractType.includes('_master')) return 'Token Masters';
    if (contractType.includes('_module')) return 'Extension Modules';
    if (contractType.includes('_factory')) return 'Factories';
    if (contractType.includes('beacon')) return 'Beacons';
    if (contractType.includes('deployer')) return 'Deployers';
    if (contractType.includes('policy') || contractType.includes('governance')) return 'Governance';
    return 'Infrastructure';
  };

  const getCategoryDescription = (category: string): string => {
    const descriptions: Record<string, string> = {
      'Token Masters': 'Master contract templates for token standards (ERC20, ERC721, etc.)',
      'Extension Modules': 'Modular extensions for adding functionality to tokens',
      'Factories': 'Factory contracts for deploying token instances',
      'Beacons': 'Beacon contracts for upgradeable proxy pattern',
      'Deployers': 'Deployment infrastructure contracts',
      'Governance': 'Governance and policy enforcement contracts',
      'Infrastructure': 'Core infrastructure contracts',
    };
    return descriptions[category] || 'Other contract templates';
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

  const setActiveTemplate = async (categoryTemplates: Template[], templateId: string) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Deactivate all templates in this category
      const { error: deactivateError } = await supabase
        .from('contract_masters')
        .update({ is_active: false })
        .in('id', categoryTemplates.map(t => t.id));

      if (deactivateError) throw deactivateError;

      // Activate the selected template
      const { error: activateError } = await supabase
        .from('contract_masters')
        .update({ is_active: true })
        .eq('id', templateId);

      if (activateError) throw activateError;

      // Reload templates to reflect changes
      await loadTemplates();

      const selectedTemplate = categoryTemplates.find(t => t.id === templateId);
      setSuccess(`Activated template: ${selectedTemplate?.contract_details?.name || selectedTemplate?.contract_type}`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to set active template:', err);
      setError(err instanceof Error ? err.message : 'Failed to update template');
    } finally {
      setSaving(false);
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
          <h1 className="text-3xl font-bold">Template Management</h1>
          <p className="text-muted-foreground mt-2">
            Configure active contract templates for token deployment
          </p>
        </div>
        <Button onClick={loadTemplates} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{templates.length}</div>
              <div className="text-sm text-muted-foreground">Total Templates</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {templates.filter(t => t.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {templates.filter(t => t.contract_details?.verified).length}
              </div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{categories.length}</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
          </CardContent>
        </Card>
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
        <AlertDescription>
          <strong>Active templates</strong> are used by default when deploying new tokens. 
          Only one template per category should be active at a time.
        </AlertDescription>
      </Alert>

      {/* Template Categories */}
      <div className="space-y-4">
        {categories.map((category) => (
          <Card key={category.category}>
            <Collapsible
              open={expandedCategories.has(category.category)}
              onOpenChange={() => toggleCategory(category.category)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {expandedCategories.has(category.category) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle>{category.category}</CardTitle>
                          <CardDescription className="mt-1">
                            {category.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {category.templates.length} templates
                      </Badge>
                      {category.activeTemplate && (
                        <Badge variant="default" className="bg-green-600">
                          1 active
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {category.templates.map((template) => (
                    <div
                      key={template.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        template.is_active ? 'border-green-500 bg-green-50/50' : ''
                      }`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {template.contract_details?.name || template.contract_type}
                          </h4>
                          {template.is_active && (
                            <Badge variant="default" className="bg-green-600">
                              Active
                            </Badge>
                          )}
                          {template.contract_details?.verified && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <a
                            href={getExplorerUrl(template.contract_address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            {formatAddress(template.contract_address)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <span>Version {template.version}</span>
                          <span>
                            Deployed {new Date(template.deployed_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => setActiveTemplate(category.templates, template.id)}
                        disabled={saving || template.is_active}
                        variant={template.is_active ? 'default' : 'outline'}
                        size="sm"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Updating...
                          </>
                        ) : template.is_active ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Active
                          </>
                        ) : (
                          'Set Active'
                        )}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}
