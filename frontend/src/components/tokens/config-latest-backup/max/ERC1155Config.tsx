import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Settings, Palette, Gamepad2, MapPin, Link, Layers } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import sub-forms
import ERC1155BaseForm from "./ERC1155BaseForm";
import ERC1155TypesForm from "./ERC1155TypesForm";
import ERC1155PricingForm from "./ERC1155PricingForm";
import ERC1155GamingForm from "./ERC1155GamingForm";
import ERC1155TypeConfigsForm from "./ERC1155TypeConfigsForm";
import ERC1155UriMappingsForm from "./ERC1155UriMappingsForm";

interface ERC1155ConfigProps {
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
  setTokenForm?: (form: any) => void;
  tokenForm?: any;
}

interface ERC1155CompleteConfig {
  // Base configuration from token_erc1155_properties
  base_uri?: string;
  metadata_storage?: string;
  has_royalty?: boolean;
  royalty_percentage?: string;
  royalty_receiver?: string;
  is_burnable?: boolean;
  is_pausable?: boolean;
  access_control?: string;
  updatable_uris?: boolean;
  supply_tracking?: boolean;
  enable_approval_for_all?: boolean;
  batch_minting_enabled?: boolean;
  container_enabled?: boolean;
  use_geographic_restrictions?: boolean;
  default_restriction_policy?: string;
  dynamic_uris?: boolean;
  updatable_metadata?: boolean;
  supply_tracking_advanced?: boolean;
  max_supply_per_type?: string;
  burning_enabled?: boolean;
  mint_roles?: string[];
  burn_roles?: string[];
  metadata_update_roles?: string[];
  
  // Pricing configuration
  pricing_model?: string;
  base_price?: string;
  bulk_discount_enabled?: boolean;
  referral_rewards_enabled?: boolean;
  referral_percentage?: string;
  lazy_minting_enabled?: boolean;
  airdrop_enabled?: boolean;
  airdrop_snapshot_block?: number;
  claim_period_enabled?: boolean;
  claim_start_time?: string;
  claim_end_time?: string;
  marketplace_fees_enabled?: boolean;
  marketplace_fee_percentage?: string;
  marketplace_fee_recipient?: string;
  bundle_trading_enabled?: boolean;
  atomic_swaps_enabled?: boolean;
  cross_collection_trading?: boolean;
  
  // Gaming configuration
  crafting_enabled?: boolean;
  fusion_enabled?: boolean;
  experience_points_enabled?: boolean;
  leveling_enabled?: boolean;
  consumable_tokens?: boolean;
  voting_power_enabled?: boolean;
  voting_weight_per_token?: any;
  community_treasury_enabled?: boolean;
  treasury_percentage?: string;
  proposal_creation_threshold?: string;
  bridge_enabled?: boolean;
  bridgeable_token_types?: string[];
  wrapped_versions?: any;
  layer2_support_enabled?: boolean;
  supported_layer2_networks?: string[];
  
  // Related table data
  tokenTypes?: any[];
  discountTiers?: any[];
  craftingRecipes?: any[];
  typeConfigs?: any[];
  uriMappings?: any[];
}

/**
 * ERC-1155 Comprehensive Configuration Component
 * Orchestrates all sub-forms and manages complete token configuration
 * Covers all 69 fields from token_erc1155_properties plus 6 supporting tables
 */
const ERC1155Config: React.FC<ERC1155ConfigProps> = ({ 
  onConfigChange,
  initialConfig = {},
  setTokenForm,
  tokenForm
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [config, setConfig] = useState<ERC1155CompleteConfig>(() => {
    const defaultConfig: ERC1155CompleteConfig = {
      // Base defaults
      metadata_storage: "ipfs",
      access_control: "ownable",
      supply_tracking: true,
      enable_approval_for_all: true,
      default_restriction_policy: "allowed",
      pricing_model: "fixed",
      
      // Initialize arrays
      tokenTypes: [],
      discountTiers: [],
      craftingRecipes: [],
      typeConfigs: [],
      uriMappings: [],
      mint_roles: [],
      burn_roles: [],
      metadata_update_roles: [],
      bridgeable_token_types: [],
      supported_layer2_networks: []
    };
    
    return { ...defaultConfig, ...initialConfig };
  });

  // Update parent when config changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config);
    }
    if (setTokenForm) {
      setTokenForm(prev => ({ ...prev, ...config }));
    }
  }, [config, onConfigChange, setTokenForm]);

  // Handle base configuration changes
  const handleBaseConfigChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle related table data changes
  const handleTableDataChange = (table: string, data: any[]) => {
    setConfig(prev => ({
      ...prev,
      [table]: data
    }));
  };

  // Validation functions
  const getValidationStatus = () => {
    const issues = [];
    const warnings = [];

    // Check required fields
    if (!config.tokenTypes || config.tokenTypes.length === 0) {
      issues.push("At least one token type must be defined");
    }

    // Check royalty configuration
    if (config.has_royalty) {
      if (!config.royalty_percentage || parseFloat(config.royalty_percentage) <= 0) {
        issues.push("Royalty percentage must be greater than 0 when royalties are enabled");
      }
      if (!config.royalty_receiver) {
        issues.push("Royalty receiver address is required when royalties are enabled");
      }
    }

    // Check pricing configuration
    if (config.pricing_model !== "free" && (!config.base_price || parseFloat(config.base_price) <= 0)) {
      warnings.push("Base price should be set for non-free pricing models");
    }

    // Check URI configuration
    if (!config.base_uri && (!config.uriMappings || config.uriMappings.length === 0)) {
      warnings.push("Either base URI or individual URI mappings should be configured");
    }

    return { issues, warnings };
  };

  const { issues, warnings } = getValidationStatus();

  // Get tab completion status
  const getTabStatus = (tab: string) => {
    switch (tab) {
      case "types":
        return config.tokenTypes && config.tokenTypes.length > 0;
      case "pricing":
        return config.pricing_model && (config.pricing_model === "free" || config.base_price);
      case "gaming":
        return !config.crafting_enabled || (config.craftingRecipes && config.craftingRecipes.length > 0);
      case "configs":
        return true; // Optional
      case "uris":
        return config.base_uri || (config.uriMappings && config.uriMappings.length > 0);
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                ERC-1155 Multi-Token Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive configuration for ERC-1155 multi-token contracts with advanced features
              </p>
            </div>
            <div className="flex gap-2">
              {issues.length === 0 && warnings.length === 0 ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Valid Configuration
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {issues.length} Issues
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Validation Messages */}
          {issues.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Issues that need to be resolved:</strong>
                <ul className="list-disc list-inside mt-2">
                  {issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {warnings.length > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Recommendations:</strong>
                <ul className="list-disc list-inside mt-2">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {config.tokenTypes?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Token Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {config.craftingRecipes?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Crafting Recipes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {config.discountTiers?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Discount Tiers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {config.uriMappings?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">URI Mappings</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Forms */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Base
            {getTabStatus("overview") && <CheckCircle2 className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Types
            {getTabStatus("types") && <CheckCircle2 className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Pricing
            {getTabStatus("pricing") && <CheckCircle2 className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="gaming" className="flex items-center gap-1">
            <Gamepad2 className="h-3 w-3" />
            Gaming
            {getTabStatus("gaming") && <CheckCircle2 className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="configs" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Configs
            {getTabStatus("configs") && <CheckCircle2 className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="uris" className="flex items-center gap-1">
            <Link className="h-3 w-3" />
            URIs
            {getTabStatus("uris") && <CheckCircle2 className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
        </TabsList>

        {/* Base Configuration */}
        <TabsContent value="overview">
          <ERC1155BaseForm
            config={config}
            onChange={handleBaseConfigChange}
          />
        </TabsContent>

        {/* Token Types Management */}
        <TabsContent value="types">
          <ERC1155TypesForm
            tokenTypes={config.tokenTypes || []}
            onChange={(tokenTypes) => handleTableDataChange("tokenTypes", tokenTypes)}
          />
        </TabsContent>

        {/* Pricing & Economics */}
        <TabsContent value="pricing">
          <ERC1155PricingForm
            config={config}
            discountTiers={config.discountTiers || []}
            onChange={handleBaseConfigChange}
            onDiscountTiersChange={(tiers) => handleTableDataChange("discountTiers", tiers)}
          />
        </TabsContent>

        {/* Gaming & Utility */}
        <TabsContent value="gaming">
          <ERC1155GamingForm
            config={config}
            craftingRecipes={config.craftingRecipes || []}
            onChange={handleBaseConfigChange}
            onCraftingRecipesChange={(recipes) => handleTableDataChange("craftingRecipes", recipes)}
          />
        </TabsContent>

        {/* Type Configurations */}
        <TabsContent value="configs">
          <ERC1155TypeConfigsForm
            typeConfigs={config.typeConfigs || []}
            onChange={(typeConfigs) => handleTableDataChange("typeConfigs", typeConfigs)}
          />
        </TabsContent>

        {/* URI Mappings */}
        <TabsContent value="uris">
          <ERC1155UriMappingsForm
            uriMappings={config.uriMappings || []}
            onChange={(uriMappings) => handleTableDataChange("uriMappings", uriMappings)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ERC1155Config;