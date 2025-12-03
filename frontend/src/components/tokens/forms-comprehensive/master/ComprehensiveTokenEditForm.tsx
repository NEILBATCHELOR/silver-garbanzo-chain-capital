// Comprehensive Token Edit Form - Master Component
// Tabbed interface for editing all token tables with min/max modes

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Settings,
  Database,
  FileText,
  Layers,
  Shield,
  Coins,
  Vault
} from 'lucide-react';

import { TokenStandard } from '@/types/core/centralModels';
import { ConfigMode } from '../types';
import { useComprehensiveTokenForm } from '../hooks/useComprehensiveTokenForm';

// Import tab components
import { TokensBasicTab } from '../tabs/common/TokensBasicTab';
import { ERC20PropertiesTab } from '../tabs/erc20/ERC20PropertiesTab';
import { ERC721PropertiesTab } from '../tabs/erc721/ERC721PropertiesTab';
import { ERC721AttributesTab } from '../tabs/erc721/ERC721AttributesTab';
import { ERC721MintPhasesTab } from '../tabs/erc721/ERC721MintPhasesTab';
import { ERC721TraitDefinitionsTab } from '../tabs/erc721/ERC721TraitDefinitionsTab';
import {
  ERC1155PropertiesTab,
  ERC1155TypesTab,
  ERC1155BalancesTab,
  ERC1155CraftingRecipesTab,
  ERC1155DiscountTiersTab,
  ERC1155UriMappingsTab,
  ERC1155TypeConfigsTab
} from '../tabs/erc1155';
import {
  ERC1400PropertiesTab,
  ERC1400PartitionsTab,
  ERC1400ControllersTab,
  ERC1400CorporateActionsTab,
  ERC1400CustodyProvidersTab,
  ERC1400DocumentsTab,
  ERC1400RegulatoryFilingsTab
} from '../tabs/erc1400';
import {
  ERC3525PropertiesTab,
  ERC3525SlotsTab,
  ERC3525AllocationsTab,
  ERC3525PaymentSchedulesTab,
  ERC3525ValueAdjustmentsTab,
  ERC3525SlotConfigsTab
} from '../tabs/erc3525';
import {
  ERC4626PropertiesTab,
  ERC4626VaultStrategiesTab,
  ERC4626AssetAllocationsTab,
  ERC4626FeeTiersTab,
  ERC4626PerformanceMetricsTab,
  ERC4626StrategyParamsTab
} from '../tabs/erc4626';

interface ComprehensiveTokenEditFormProps {
  tokenId?: string;
  standard: TokenStandard;
  configMode?: ConfigMode;
  enableDebug?: boolean;
  onSave?: (data: any) => Promise<void>;
  onCancel?: () => void;
}

// Tab configuration for each standard
const getTabConfig = (standard: TokenStandard) => {
  const baseConfig = [
    {
      id: 'tokens',
      label: 'Basic Info',
      description: 'Core token information',
      icon: <FileText className="w-4 h-4" />,
      component: TokensBasicTab
    }
  ];

  switch (standard) {
    case TokenStandard.ERC20:
      return [
        ...baseConfig,
        {
          id: 'token_erc20_properties',
          label: 'ERC-20 Properties',
          description: 'Fungible token configuration',
          icon: <Coins className="w-4 h-4" />,
          component: ERC20PropertiesTab
        }
      ];

    case TokenStandard.ERC721:
      return [
        ...baseConfig,
        {
          id: 'token_erc721_properties',
          label: 'NFT Properties',
          description: 'NFT collection configuration',
          icon: <Layers className="w-4 h-4" />,
          component: ERC721PropertiesTab
        },
        {
          id: 'token_erc721_attributes',
          label: 'Attributes',
          description: 'Token attributes definition',
          icon: <Settings className="w-4 h-4" />,
          component: ERC721AttributesTab
        },
        {
          id: 'token_erc721_mint_phases',
          label: 'Mint Phases',
          description: 'Minting phase configuration',
          icon: <Layers className="w-4 h-4" />,
          component: ERC721MintPhasesTab
        },
        {
          id: 'token_erc721_trait_definitions',
          label: 'Trait Definitions',
          description: 'NFT trait definitions',
          icon: <Database className="w-4 h-4" />,
          component: ERC721TraitDefinitionsTab
        }
      ];

    case TokenStandard.ERC1155:
      return [
        ...baseConfig,
        {
          id: 'token_erc1155_properties',
          label: 'Multi-Token Properties',
          description: 'ERC-1155 configuration',
          icon: <Layers className="w-4 h-4" />,
          component: ERC1155PropertiesTab
        },
        {
          id: 'token_erc1155_types',
          label: 'Token Types',
          description: 'Token type definitions',
          icon: <Database className="w-4 h-4" />,
          component: ERC1155TypesTab
        },
        {
          id: 'token_erc1155_balances',
          label: 'Balances',
          description: 'Balance tracking',
          icon: <Coins className="w-4 h-4" />,
          component: ERC1155BalancesTab
        },
        {
          id: 'token_erc1155_crafting_recipes',
          label: 'Crafting Recipes',
          description: 'Gaming mechanics',
          icon: <Settings className="w-4 h-4" />,
          component: ERC1155CraftingRecipesTab
        },
        {
          id: 'token_erc1155_discount_tiers',
          label: 'Discount Tiers',
          description: 'Pricing tiers',
          icon: <Coins className="w-4 h-4" />,
          component: ERC1155DiscountTiersTab
        },
        {
          id: 'token_erc1155_uri_mappings',
          label: 'URI Mappings',
          description: 'Metadata mapping',
          icon: <FileText className="w-4 h-4" />,
          component: ERC1155UriMappingsTab
        },
        {
          id: 'token_erc1155_type_configs',
          label: 'Type Configurations',
          description: 'Type configurations',
          icon: <Settings className="w-4 h-4" />,
          component: ERC1155TypeConfigsTab
        }
      ];

    case TokenStandard.ERC1400:
      return [
        ...baseConfig,
        {
          id: 'token_erc1400_properties',
          label: 'Security Token Properties',
          description: 'ERC-1400 configuration',
          icon: <Shield className="w-4 h-4" />,
          component: ERC1400PropertiesTab
        },
        {
          id: 'token_erc1400_partitions',
          label: 'Partitions',
          description: 'Token partitions',
          icon: <Database className="w-4 h-4" />,
          component: ERC1400PartitionsTab
        },
        {
          id: 'token_erc1400_controllers',
          label: 'Controllers',
          description: 'Access controllers',
          icon: <Shield className="w-4 h-4" />,
          component: ERC1400ControllersTab
        },
        {
          id: 'token_erc1400_documents',
          label: 'Documents',
          description: 'Legal documents',
          icon: <FileText className="w-4 h-4" />,
          component: ERC1400DocumentsTab
        },
        {
          id: 'token_erc1400_corporate_actions',
          label: 'Corporate Actions',
          description: 'Corporate events',
          icon: <Settings className="w-4 h-4" />,
          component: ERC1400CorporateActionsTab
        },
        {
          id: 'token_erc1400_custody_providers',
          label: 'Custody Providers',
          description: 'Custodian management',
          icon: <Vault className="w-4 h-4" />,
          component: ERC1400CustodyProvidersTab
        },
        {
          id: 'token_erc1400_regulatory_filings',
          label: 'Regulatory Filings',
          description: 'Compliance filings',
          icon: <Shield className="w-4 h-4" />,
          component: ERC1400RegulatoryFilingsTab
        }
      ];

    case TokenStandard.ERC3525:
      return [
        ...baseConfig,
        {
          id: 'token_erc3525_properties',
          label: 'Semi-Fungible Properties',
          description: 'ERC-3525 configuration',
          icon: <Layers className="w-4 h-4" />,
          component: ERC3525PropertiesTab
        },
        {
          id: 'token_erc3525_slots',
          label: 'Slots',
          description: 'Slot definitions',
          icon: <Database className="w-4 h-4" />,
          component: ERC3525SlotsTab
        },
        {
          id: 'token_erc3525_allocations',
          label: 'Allocations',
          description: 'Value allocations',
          icon: <Coins className="w-4 h-4" />,
          component: ERC3525AllocationsTab
        },
        {
          id: 'token_erc3525_payment_schedules',
          label: 'Payment Schedules',
          description: 'Payment tracking',
          icon: <Settings className="w-4 h-4" />,
          component: ERC3525PaymentSchedulesTab
        },
        {
          id: 'token_erc3525_value_adjustments',
          label: 'Value Adjustments',
          description: 'Value modifications',
          icon: <Settings className="w-4 h-4" />,
          component: ERC3525ValueAdjustmentsTab
        },
        {
          id: 'token_erc3525_slot_configs',
          label: 'Slot Configurations',
          description: 'Slot configurations',
          icon: <Settings className="w-4 h-4" />,
          component: ERC3525SlotConfigsTab
        }
      ];

    case TokenStandard.ERC4626:
      return [
        ...baseConfig,
        {
          id: 'token_erc4626_properties',
          label: 'Vault Properties',
          description: 'ERC-4626 configuration',
          icon: <Vault className="w-4 h-4" />,
          component: ERC4626PropertiesTab
        },
        {
          id: 'token_erc4626_vault_strategies',
          label: 'Vault Strategies',
          description: 'Investment strategies',
          icon: <Settings className="w-4 h-4" />,
          component: ERC4626VaultStrategiesTab
        },
        {
          id: 'token_erc4626_asset_allocations',
          label: 'Asset Allocations',
          description: 'Asset allocation',
          icon: <Coins className="w-4 h-4" />,
          component: ERC4626AssetAllocationsTab
        },
        {
          id: 'token_erc4626_fee_tiers',
          label: 'Fee Tiers',
          description: 'Fee structures',
          icon: <Coins className="w-4 h-4" />,
          component: ERC4626FeeTiersTab
        },
        {
          id: 'token_erc4626_performance_metrics',
          label: 'Performance Metrics',
          description: 'Performance tracking',
          icon: <Database className="w-4 h-4" />,
          component: ERC4626PerformanceMetricsTab
        },
        {
          id: 'token_erc4626_strategy_params',
          label: 'Strategy Parameters',
          description: 'Strategy parameters',
          icon: <Settings className="w-4 h-4" />,
          component: ERC4626StrategyParamsTab
        }
      ];

    default:
      return baseConfig;
  }
};

export const ComprehensiveTokenEditForm: React.FC<ComprehensiveTokenEditFormProps> = ({
  tokenId,
  standard,
  configMode = 'min',
  enableDebug = false,
  onSave,
  onCancel
}) => {
  const [activeTabId, setActiveTabId] = useState('tokens');
  
  const {
    formState,
    eventHandlers,
    hasUnsavedChanges,
    hasErrors
  } = useComprehensiveTokenForm({
    tokenId,
    standard,
    configMode,
    enableDebug
  });

  const tabConfig = getTabConfig(standard);

  // ✅ FIX: Extract project_id from tokens table data
  const projectId = formState.tabs['tokens']?.data?.[0]?.project_id;
  console.log('[ComprehensiveTokenEditForm] Extracted projectId:', projectId, 'from tokens table');

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    eventHandlers.onTabChange(tabId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {tokenId ? 'Edit Token' : 'Create Token'}
          </h2>
          <p className="text-muted-foreground">
            Configure all aspects of your {standard} token
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={configMode === 'min' ? 'default' : 'secondary'}>
            {configMode === 'min' ? 'Basic Mode' : 'Advanced Mode'}
          </Badge>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-yellow-600">
              Unsaved Changes
            </Badge>
          )}
          {hasErrors && (
            <Badge variant="destructive">
              Has Errors
            </Badge>
          )}
        </div>
      </div>

      {/* Global Errors */}
      {formState.globalErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {formState.globalErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => eventHandlers.onSaveAll()}
          disabled={formState.isSubmitting || !hasUnsavedChanges}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save All Changes
        </Button>
        
        <Button
          variant="outline"
          onClick={() => eventHandlers.onReset(activeTabId)}
          disabled={formState.isSubmitting}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Current Tab
        </Button>
        
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={formState.isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>

      <Separator />

      {/* Tabbed Interface */}
      <Tabs value={activeTabId} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="w-full grid gap-1" style={{ gridTemplateColumns: `repeat(${tabConfig.length}, 1fr)` }}>
          {tabConfig.map((tab) => {
            const tabState = formState.tabs[tab.id];
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 text-sm min-w-0 flex-1"
              >
                {tab.icon}
                <span className="hidden sm:inline truncate">{tab.label}</span>
                {tabState?.isModified && (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
                )}
                {tabState?.hasErrors && (
                  <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabConfig.map((tab) => {
          const TabComponent = tab.component;
          const tabState = formState.tabs[tab.id];
          
          return (
            <TabsContent key={tab.id} value={tab.id} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {tab.icon}
                      <div>
                        <CardTitle>{tab.label}</CardTitle>
                        {tab.description && (
                          <p className="text-sm text-muted-foreground">
                            {tab.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {tabState?.isModified && (
                        <Badge variant="outline" className="text-yellow-600">
                          Modified
                        </Badge>
                      )}
                      {tabState?.hasErrors && (
                        <Badge variant="destructive">
                          Has Errors
                        </Badge>
                      )}
                      
                      <Button
                        size="sm"
                        onClick={() => eventHandlers.onSave(tab.id)}
                        disabled={formState.isSubmitting || !tabState?.isModified}
                        className="flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <TabComponent
                    tokenId={tokenId}
                    projectId={projectId} // ✅ FIX: Pass projectId to all tab components
                    data={tabState?.data}
                    tokenData={formState.tabs['tokens']?.data} // ✅ FIX: Pass token table data for name, symbol, description
                    validationErrors={tabState?.validationErrors || {}}
                    isModified={tabState?.isModified || false}
                    configMode={configMode}
                    onFieldChange={(field: string, value: any, recordIndex?: number) =>
                      eventHandlers.onFieldChange(tab.id, field, value, recordIndex)
                    }
                    onValidate={() => eventHandlers.onValidate(tab.id)}
                    isSubmitting={formState.isSubmitting}
                    onSave={(data: any) => eventHandlers.onSave(tab.id)}
                    onCancel={() => eventHandlers.onReset(tab.id)}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default ComprehensiveTokenEditForm;
