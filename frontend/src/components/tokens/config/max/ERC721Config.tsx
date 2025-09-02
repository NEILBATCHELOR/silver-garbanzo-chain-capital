import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoCircledIcon, TokensIcon, LayersIcon, GearIcon, StarIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Import all ERC-721 form components
import ERC721BaseForm from './ERC721BaseForm';
import ERC721PropertiesForm from './ERC721PropertiesForm';
import ERC721AttributesForm from './ERC721AttributesForm';
import ERC721MintPhasesForm from './ERC721MintPhasesForm';
import ERC721TraitDefinitionsForm from './ERC721TraitDefinitionsForm';

/**
 * ERC721Config - Complete ERC-721 NFT configuration interface
 * 
 * Comprehensive form system for creating ERC-721 NFT collections with:
 * 
 * 📋 **Core Information** (ERC721BaseForm)
 * - Collection name, symbol, description
 * - Configuration mode selection
 * - Total supply settings
 * 
 * ⚙️ **Properties & Features** (ERC721PropertiesForm) 
 * - All 84 fields from token_erc721_properties table
 * - Metadata management, minting controls, royalties
 * - Sales phases, reveal mechanisms, advanced features
 * 
 * 🎨 **Attributes** (ERC721AttributesForm)
 * - Basic trait definitions for metadata structure
 * - Simple trait_type and values configuration
 * 
 * 📅 **Mint Phases** (ERC721MintPhasesForm)
 * - Sequential launch phases (presale, public, etc.)
 * - Phase-specific pricing and access controls
 * 
 * 🎲 **Advanced Traits** (ERC721TraitDefinitionsForm)
 * - Rarity-weighted trait definitions
 * - Procedural generation support
 * - Complex trait relationships
 * 
 * Supports both minimal and maximum configuration modes with progressive disclosure.
 */

interface ERC721ConfigProps {
  tokenForm: any;
  onInputChange: (field: string, value: any) => void;
  configMode?: 'min' | 'basic' | 'advanced' | 'max';
}

const ERC721Config: React.FC<ERC721ConfigProps> = ({ 
  tokenForm = {},
  onInputChange,
  configMode = 'max'
}) => {
  const [activeTab, setActiveTab] = useState("core");
  const [config, setConfig] = useState(() => ({
    // Ensure standard is set
    standard: 'ERC-721',
    decimals: 0,
    ...tokenForm
  }));

  // Update parent when config changes
  useEffect(() => {
    Object.keys(config).forEach(key => {
      onInputChange(key, config[key]);
    });
  }, [config, onInputChange]);

  const handleInputChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Progress tracking
  const getTabProgress = (tabId: string): { completed: number; total: number } => {
    switch (tabId) {
      case 'core':
        const coreRequired = ['name', 'symbol'];
        const coreCompleted = coreRequired.filter(field => config[field]).length;
        return { completed: coreCompleted, total: coreRequired.length };
      
      case 'properties':
        const propsRequired = ['metadata_storage', 'asset_type'];
        const propsCompleted = propsRequired.filter(field => config[field]).length;
        return { completed: propsCompleted, total: propsRequired.length };
      
      case 'attributes':
        const hasAttributes = config.token_attributes?.some((attr: any) => 
          attr.trait_type && attr.values?.some((v: string) => v.trim())
        );
        return { completed: hasAttributes ? 1 : 0, total: 1 };
      
      case 'phases':
        const hasPhases = config.mint_phases?.some((phase: any) => 
          phase.phase_name && phase.price !== undefined
        );
        return { completed: hasPhases ? 1 : 0, total: 1 };
      
      case 'traits':
        const hasTraits = config.trait_definitions?.some((trait: any) => 
          trait.trait_name && trait.possible_values?.length > 0
        );
        return { completed: hasTraits ? 1 : 0, total: 1 };
      
      default:
        return { completed: 0, total: 1 };
    }
  };

  const TabTriggerWithProgress: React.FC<{ 
    value: string; 
    icon: React.ReactNode; 
    title: string;
    description: string;
    required?: boolean;
  }> = ({ value, icon, title, description, required = false }) => {
    const progress = getTabProgress(value);
    const isComplete = progress.completed === progress.total;
    const isPartial = progress.completed > 0 && progress.completed < progress.total;
    
    return (
      <TabsTrigger value={value} className="relative group">
        <div className="flex items-center space-x-2">
          {icon}
          <div className="text-left">
            <div className="flex items-center space-x-1">
              <span className="font-medium">{title}</span>
              {required && <Badge variant="secondary" className="text-xs">Required</Badge>}
              {isComplete && <Badge variant="default" className="text-xs bg-green-100 text-green-800">✓</Badge>}
              {isPartial && <Badge variant="outline" className="text-xs">Partial</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger className="absolute inset-0" />
          <TooltipContent>
            <p className="max-w-xs">{description}</p>
            <p className="text-xs mt-1">Progress: {progress.completed}/{progress.total}</p>
          </TooltipContent>
        </Tooltip>
      </TabsTrigger>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center">
              <TokensIcon className="h-6 w-6 mr-2" />
              ERC-721 NFT Collection Configuration
              <Badge variant="outline" className="ml-2">
                {configMode.toUpperCase()} Mode
              </Badge>
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Create a comprehensive NFT collection with advanced features, minting phases, and rarity systems.
            </div>
          </CardHeader>
        </Card>

        {/* Configuration Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabTriggerWithProgress
              value="core"
              icon={<InfoCircledIcon className="h-4 w-4" />}
              title="Core Info"
              description="Collection basics"
              required={true}
            />
            <TabTriggerWithProgress
              value="properties"
              icon={<GearIcon className="h-4 w-4" />}
              title="Properties"
              description="Advanced features"
              required={true}
            />
            <TabTriggerWithProgress
              value="attributes"
              icon={<LayersIcon className="h-4 w-4" />}
              title="Attributes"
              description="Basic traits"
            />
            <TabTriggerWithProgress
              value="phases"
              icon={<StarIcon className="h-4 w-4" />}
              title="Mint Phases"
              description="Launch strategy"
            />
            <TabTriggerWithProgress
              value="traits"
              icon={<TokensIcon className="h-4 w-4" />}
              title="Advanced Traits"
              description="Rarity system"
            />
          </TabsList>

          {/* Core Information Tab */}
          <TabsContent value="core" className="space-y-4">
            <ERC721BaseForm
              tokenForm={config}
              onInputChange={handleInputChange}
            />
          </TabsContent>

          {/* Properties & Features Tab */}
          <TabsContent value="properties" className="space-y-4">
            <ERC721PropertiesForm
              tokenForm={config}
              onInputChange={handleInputChange}
            />
          </TabsContent>

          {/* Attributes Tab */}
          <TabsContent value="attributes" className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg mb-4">
              <div className="text-sm font-medium text-blue-900 mb-1">
                Basic Attributes
              </div>
              <div className="text-xs text-blue-700">
                Define simple trait types and possible values for your NFT metadata structure.
                For advanced rarity systems, use the "Advanced Traits" tab.
              </div>
            </div>
            <ERC721AttributesForm
              tokenForm={config}
              onInputChange={handleInputChange}
            />
          </TabsContent>

          {/* Mint Phases Tab */}
          <TabsContent value="phases" className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg mb-4">
              <div className="text-sm font-medium text-green-900 mb-1">
                Sequential Minting Phases
              </div>
              <div className="text-xs text-green-700">
                Create a structured launch strategy with multiple phases like presale, allowlist, and public mint.
                Each phase can have different pricing, supply limits, and access requirements.
              </div>
            </div>
            <ERC721MintPhasesForm
              tokenForm={config}
              onInputChange={handleInputChange}
            />
          </TabsContent>

          {/* Advanced Traits Tab */}
          <TabsContent value="traits" className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg mb-4">
              <div className="text-sm font-medium text-purple-900 mb-1">
                Rarity-Weighted Trait System
              </div>
              <div className="text-xs text-purple-700">
                Define traits with rarity weights for procedural generation, marketplace rarity calculations,
                and advanced collection analytics. This enables complex trait relationships and accurate rarity rankings.
              </div>
            </div>
            <ERC721TraitDefinitionsForm
              tokenForm={config}
              onInputChange={handleInputChange}
            />
          </TabsContent>
        </Tabs>

        {/* Configuration Summary */}
        {config.name && config.symbol && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-sm font-medium">Collection</div>
                  <div className="text-xs text-muted-foreground">
                    {config.name} ({config.symbol})
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Standard</div>
                  <div className="text-xs text-muted-foreground">
                    ERC-721 NFT Collection
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Supply</div>
                  <div className="text-xs text-muted-foreground">
                    {config.max_supply || config.total_supply || 'Unlimited'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Features</div>
                  <div className="text-xs text-muted-foreground">
                    {[
                      config.has_royalty && 'Royalties',
                      config.revealable && 'Reveal',
                      config.mint_phases_enabled && 'Phases',
                      config.staking_enabled && 'Staking'
                    ].filter(Boolean).join(', ') || 'Basic NFT'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

// Export individual components for flexibility
export { 
  ERC721BaseForm, 
  ERC721PropertiesForm, 
  ERC721AttributesForm, 
  ERC721MintPhasesForm, 
  ERC721TraitDefinitionsForm 
};

export default ERC721Config;
