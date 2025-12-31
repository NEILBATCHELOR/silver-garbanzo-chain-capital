import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Settings, Layers } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import sub-forms (Gaming and Pricing forms removed)
import ERC1155BaseForm from "./ERC1155BaseForm";
import ERC1155TypesForm from "./ERC1155TypesForm";
import ERC1155TypeConfigsForm from "./ERC1155TypeConfigsForm";
import ERC1155UriMappingsForm from "./ERC1155UriMappingsForm";

interface ERC1155ConfigProps {
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
  setTokenForm?: (form: any) => void;
  tokenForm?: any;
}

interface ERC1155CompleteConfig {
  // Base configuration from token_erc1155_properties (CLEANED)
  base_uri?: string;
  metadata_storage?: string;
  has_royalty?: boolean;
  royalty_percentage?: string;
  royalty_receiver?: string;
  is_burnable?: boolean;
  is_pausable?: boolean;
  updatable_uris?: boolean;
  supply_tracking?: boolean;
  batch_minting_enabled?: boolean;
  container_enabled?: boolean;
  dynamic_uris?: boolean;
  updatable_metadata?: boolean;
  
  // Compliance - KEPT per requirements
  use_geographic_restrictions?: boolean;
  default_restriction_policy?: string;
  whitelist_config?: any;
  
  // Related table data
  tokenTypes?: any[];
  typeConfigs?: any[];
  uriMappings?: any[];
}

/**
 * ERC-1155 Configuration Component (CLEANED)
 * 
 * Removed per FORM_UPDATES_REQUIRED.md:
 * - Gaming mechanics (crafting, fusion, leveling, consumable tokens)
 * - Marketplace features (pricing models, discounts, marketplace fees)
 * - Rewards/incentives (referral rewards, airdrops, claim periods)
 * - Governance (voting power, community treasury)
 * - Cross-chain (bridge, layer2)
 * - Role management arrays (mint_roles, burn_roles, metadata_update_roles)
 * 
 * Kept:
 * - Core ERC-1155 properties
 * - Royalties (ERC-2981)
 * - Supply tracking (ERC-5615)
 * - Metadata management (ERC-4906)
 * - Compliance features (whitelist_config)
 */
const ERC1155Config: React.FC<ERC1155ConfigProps> = ({ 
  onConfigChange,
  initialConfig = {},
  setTokenForm,
  tokenForm = {}
}) => {
  const [activeTab, setActiveTab] = useState("base");
  const [config, setConfig] = useState<ERC1155CompleteConfig>({
    // Base properties
    base_uri: initialConfig.base_uri || tokenForm.base_uri || "",
    metadata_storage: initialConfig.metadata_storage || tokenForm.metadata_storage || "ipfs",
    has_royalty: initialConfig.has_royalty ?? tokenForm.has_royalty ?? false,
    royalty_percentage: initialConfig.royalty_percentage || tokenForm.royalty_percentage || "",
    royalty_receiver: initialConfig.royalty_receiver || tokenForm.royalty_receiver || "",
    is_burnable: initialConfig.is_burnable ?? tokenForm.is_burnable ?? false,
    is_pausable: initialConfig.is_pausable ?? tokenForm.is_pausable ?? false,
    updatable_uris: initialConfig.updatable_uris ?? tokenForm.updatable_uris ?? false,
    supply_tracking: initialConfig.supply_tracking ?? tokenForm.supply_tracking ?? true,
    batch_minting_enabled: initialConfig.batch_minting_enabled ?? tokenForm.batch_minting_enabled ?? true,
    container_enabled: initialConfig.container_enabled ?? tokenForm.container_enabled ?? false,
    dynamic_uris: initialConfig.dynamic_uris ?? tokenForm.dynamic_uris ?? false,
    updatable_metadata: initialConfig.updatable_metadata ?? tokenForm.updatable_metadata ?? false,
    
    // Compliance
    use_geographic_restrictions: initialConfig.use_geographic_restrictions ?? tokenForm.use_geographic_restrictions ?? false,
    default_restriction_policy: initialConfig.default_restriction_policy || tokenForm.default_restriction_policy || "allowed",
    whitelist_config: initialConfig.whitelist_config || tokenForm.whitelist_config || {},
    
    // Related tables
    tokenTypes: initialConfig.tokenTypes || [],
    typeConfigs: initialConfig.typeConfigs || [],
    uriMappings: initialConfig.uriMappings || []
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Update parent when config changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config);
    }
    if (setTokenForm) {
      setTokenForm(config);
    }
  }, [config, onConfigChange, setTokenForm]);

  const handleBaseConfigChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTypesChange = (types: any[]) => {
    setConfig(prev => ({ ...prev, tokenTypes: types }));
  };

  const handleTypeConfigsChange = (typeConfigs: any[]) => {
    setConfig(prev => ({ ...prev, typeConfigs }));
  };

  const handleUriMappingsChange = (uriMappings: any[]) => {
    setConfig(prev => ({ ...prev, uriMappings }));
  };

  // Validation
  const validateConfig = () => {
    const errors: string[] = [];

    // Base URI validation
    if (!config.base_uri || config.base_uri.trim() === "") {
      errors.push("Base URI is required");
    }

    // Royalty validation
    if (config.has_royalty) {
      if (!config.royalty_percentage || parseFloat(config.royalty_percentage) < 0 || parseFloat(config.royalty_percentage) > 100) {
        errors.push("Royalty percentage must be between 0 and 100");
      }
      if (!config.royalty_receiver || !/^0x[a-fA-F0-9]{40}$/.test(config.royalty_receiver)) {
        errors.push("Valid royalty receiver address is required");
      }
    }

    // Token types validation
    if (!config.tokenTypes || config.tokenTypes.length === 0) {
      errors.push("At least one token type must be defined");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const isConfigValid = validationErrors.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">ERC-1155 Multi-Token Configuration</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure your multi-token standard contract with support for fungible and non-fungible token types
              </p>
            </div>
            <Badge variant={isConfigValid ? "default" : "destructive"}>
              {isConfigValid ? (
                <><CheckCircle2 className="mr-1 h-3 w-3" /> Valid</>
              ) : (
                <><AlertCircle className="mr-1 h-3 w-3" /> {validationErrors.length} Error{validationErrors.length !== 1 ? 's' : ''}</>
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="base" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Base Properties
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Token Types
          </TabsTrigger>
          <TabsTrigger value="type-configs" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Type Configs
          </TabsTrigger>
          <TabsTrigger value="uri-mappings" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            URI Mappings
          </TabsTrigger>
        </TabsList>

        {/* Base Properties Tab */}
        <TabsContent value="base" className="space-y-4">
          <ERC1155BaseForm
            config={config}
            onChange={handleBaseConfigChange}
          />
        </TabsContent>

        {/* Token Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <ERC1155TypesForm
            tokenTypes={config.tokenTypes || []}
            onChange={handleTypesChange}
          />
        </TabsContent>

        {/* Type Configurations Tab */}
        <TabsContent value="type-configs" className="space-y-4">
          <ERC1155TypeConfigsForm
            typeConfigs={config.typeConfigs || []}
            onChange={handleTypeConfigsChange}
          />
        </TabsContent>

        {/* URI Mappings Tab */}
        <TabsContent value="uri-mappings" className="space-y-4">
          <ERC1155UriMappingsForm
            uriMappings={config.uriMappings || []}
            onChange={handleUriMappingsChange}
          />
        </TabsContent>
      </Tabs>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Token Types:</span>
              <span className="ml-2 font-medium">{config.tokenTypes?.length || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Burnable:</span>
              <Badge variant={config.is_burnable ? "default" : "secondary"} className="ml-2">
                {config.is_burnable ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Pausable:</span>
              <Badge variant={config.is_pausable ? "default" : "secondary"} className="ml-2">
                {config.is_pausable ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Royalties:</span>
              <Badge variant={config.has_royalty ? "default" : "secondary"} className="ml-2">
                {config.has_royalty ? `${config.royalty_percentage}%` : "Disabled"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Supply Tracking:</span>
              <Badge variant={config.supply_tracking ? "default" : "secondary"} className="ml-2">
                {config.supply_tracking ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Batch Minting:</span>
              <Badge variant={config.batch_minting_enabled ? "default" : "secondary"} className="ml-2">
                {config.batch_minting_enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ERC1155Config;
