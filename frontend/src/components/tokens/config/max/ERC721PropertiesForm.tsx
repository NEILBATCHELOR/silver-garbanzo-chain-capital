import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion } from "@/components/ui/accordion";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

// Import our new UI components
import { SwitchField, AccordionSection, MultiEntryField, validateEthereumAddress, validateCountryCode } from "./ui";

/**
 * ERC721PropertiesForm - ERC-721 specific properties (CLEANED VERSION)
 * 
 * Removed per FORM_UPDATES_REQUIRED.md:
 * - Gaming mechanics (utility, staking, breeding, evolution)
 * - Sales/minting features (public_sale, whitelist_sale, dutch_auction, mint_phases)
 * - Reveal mechanism (revealable, pre_reveal_uri, etc.)
 * - Marketplace features (creator_earnings, marketplace_approved, operator_filter)
 * - Cross-chain features (bridge_contracts, layer2)
 * - Redundant metadata fields (custom_base_uri, uri_storage, metadata_storage)
 * - Role arrays (mint_roles, burn_roles)
 * 
 * Kept (Compliance & Standards):
 * - whitelist_config (compliance)
 * - whitelist_addresses (compliance)
 * - geographic_restrictions (compliance)
 * - ERC-2981 royalty fields (standard extension)
 * - Core NFT properties (base_uri, max_supply, etc.)
 */

interface ERC721PropertiesFormProps {
  tokenForm: any;
  onInputChange: (field: string, value: any) => void;
}

const ERC721PropertiesForm: React.FC<ERC721PropertiesFormProps> = ({ 
  tokenForm = {},
  onInputChange
}) => {
  const [config, setConfig] = useState(() => {
    // Initialize with cleaned token_erc721_properties fields
    return {
      // Metadata Management (3 fields)
      base_uri: tokenForm.base_uri || "",
      updatable_uris: tokenForm.updatable_uris ?? false,
      
      // Supply & Minting (6 fields)
      max_supply: tokenForm.max_supply || "",
      minting_method: tokenForm.minting_method || "open",
      auto_increment_ids: tokenForm.auto_increment_ids ?? true,
      is_mintable: tokenForm.is_mintable ?? true,
      supply_cap_enabled: tokenForm.supply_cap_enabled ?? false,
      total_supply_cap: tokenForm.total_supply_cap || "",
      
      // Access Control & Features (5 fields)
      is_burnable: tokenForm.is_burnable ?? false,
      is_pausable: tokenForm.is_pausable ?? false,
      access_control: tokenForm.access_control || "ownable",
      enumerable: tokenForm.enumerable ?? true,
      use_safe_transfer: tokenForm.use_safe_transfer ?? true,
      
      // Royalties - ERC-2981 Standard (3 fields)
      has_royalty: tokenForm.has_royalty ?? false,
      royalty_percentage: tokenForm.royalty_percentage || "",
      royalty_receiver: tokenForm.royalty_receiver || "",
      
      // Transfer & Trading (2 fields)
      transfer_locked: tokenForm.transfer_locked ?? false,
      soulbound: tokenForm.soulbound ?? false,
      
      // Asset Type (1 field)
      asset_type: tokenForm.asset_type || "unique_asset",
      
      // Compliance - KEPT per requirements (4 fields + JSONB configs)
      use_geographic_restrictions: tokenForm.use_geographic_restrictions ?? false,
      default_restriction_policy: tokenForm.default_restriction_policy || "allowed",
      geographic_restrictions: tokenForm.geographic_restrictions || [],
      whitelist_addresses: tokenForm.whitelist_addresses || [],
      
      // JSONB Configuration Objects - KEPT (2 fields)
      whitelist_config: tokenForm.whitelist_config || {},
      transfer_restrictions: tokenForm.transfer_restrictions || {}
    };
  });

  // Update parent when config changes
  useEffect(() => {
    Object.keys(config).forEach(key => {
      onInputChange(key, config[key]);
    });
  }, [config, onInputChange]);

  const handleChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        
        {/* Core Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Core NFT Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assetType" className="flex items-center">
                Asset Type
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">The type of asset your NFT represents</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select value={config.asset_type} onValueChange={(value) => handleChange("asset_type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unique_asset">Unique Digital Asset</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="ip_rights">Intellectual Property Rights</SelectItem>
                  <SelectItem value="financial_instrument">Financial Instrument</SelectItem>
                  <SelectItem value="membership">Membership/Access Token</SelectItem>
                  <SelectItem value="utility">Utility Token</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-6">
              <SwitchField
                label="Mintable"
                description="Allow new tokens to be minted"
                checked={config.is_mintable}
                onCheckedChange={(checked) => handleChange("is_mintable", checked)}
              />

              <SwitchField
                label="Burnable"
                description="Allow token holders to burn their tokens"
                checked={config.is_burnable}
                onCheckedChange={(checked) => handleChange("is_burnable", checked)}
              />

              <SwitchField
                label="Pausable"
                description="Allow authorized users to pause all token transfers"
                checked={config.is_pausable}
                onCheckedChange={(checked) => handleChange("is_pausable", checked)}
              />

              <SwitchField
                label="Enumerable Extension"
                description="Enable token enumeration for marketplace discovery"
                checked={config.enumerable}
                onCheckedChange={(checked) => handleChange("enumerable", checked)}
              />

              <SwitchField
                label="Safe Transfer"
                description="Use safe transfer methods to prevent token loss"
                checked={config.use_safe_transfer}
                onCheckedChange={(checked) => handleChange("use_safe_transfer", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Advanced Features in Accordion */}
        <Accordion type="multiple" defaultValue={["metadata"]}>
          
          {/* Metadata Management */}
          <AccordionSection
            value="metadata"
            title="Metadata Management"
            badge={{ type: "advanced", text: "Core" }}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="baseUri" className="flex items-center">
                  Base URI
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Base URI for token metadata. Token IDs will be appended to this URI.
                        Example: ipfs://QmHash/ or https://api.example.com/metadata/
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="baseUri"
                  value={config.base_uri}
                  onChange={(e) => handleChange("base_uri", e.target.value)}
                  placeholder="ipfs://QmHash/ or https://..."
                />
              </div>

              <SwitchField
                label="Updatable URIs"
                description="Allow metadata URIs to be updated after minting (ERC-4906)"
                checked={config.updatable_uris}
                onCheckedChange={(checked) => handleChange("updatable_uris", checked)}
              />
            </div>
          </AccordionSection>
          
          {/* Supply & Minting */}
          <AccordionSection
            value="supply"
            title="Supply & Minting Configuration"
            badge={{ type: "advanced", text: "Core" }}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="maxSupply" className="flex items-center">
                  Maximum Supply
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Total number of tokens that can ever be minted. Leave empty for unlimited.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="maxSupply"
                  type="number"
                  value={config.max_supply}
                  onChange={(e) => handleChange("max_supply", e.target.value)}
                  placeholder="e.g., 10000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mintingMethod">Minting Method</Label>
                <Select value={config.minting_method} onValueChange={(value) => handleChange("minting_method", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select minting method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open Minting</SelectItem>
                    <SelectItem value="controlled">Controlled Minting</SelectItem>
                    <SelectItem value="sequential">Sequential Minting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SwitchField
                label="Auto-increment Token IDs"
                description="Automatically increment token IDs (1, 2, 3...) instead of custom IDs"
                checked={config.auto_increment_ids}
                onCheckedChange={(checked) => handleChange("auto_increment_ids", checked)}
              />

              <SwitchField
                label="Enable Supply Cap"
                description="Enforce a hard cap on total supply"
                checked={config.supply_cap_enabled}
                onCheckedChange={(checked) => handleChange("supply_cap_enabled", checked)}
              />

              {config.supply_cap_enabled && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="totalSupplyCap">Total Supply Cap</Label>
                  <Input
                    id="totalSupplyCap"
                    type="number"
                    value={config.total_supply_cap}
                    onChange={(e) => handleChange("total_supply_cap", e.target.value)}
                    placeholder="e.g., 10000"
                  />
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Royalties - ERC-2981 */}
          <AccordionSection
            value="royalties"
            title="Royalties (ERC-2981)"
            badge={{ type: "enterprise", text: "Standard" }}
          >
            <div className="space-y-6">
              <SwitchField
                label="Enable Royalties"
                description="Implement ERC-2981 standard for NFT royalties"
                checked={config.has_royalty}
                onCheckedChange={(checked) => handleChange("has_royalty", checked)}
              />

              {config.has_royalty && (
                <div className="space-y-6 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="royaltyPercentage" className="flex items-center">
                      Royalty Percentage
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Percentage of sale price paid as royalty (e.g., 5 for 5%)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="royaltyPercentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={config.royalty_percentage}
                      onChange={(e) => handleChange("royalty_percentage", e.target.value)}
                      placeholder="e.g., 5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="royaltyReceiver" className="flex items-center">
                      Royalty Receiver Address
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Ethereum address that will receive royalty payments
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="royaltyReceiver"
                      value={config.royalty_receiver}
                      onChange={(e) => handleChange("royalty_receiver", e.target.value)}
                      placeholder="0x..."
                    />
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Transfer & Trading Controls */}
          <AccordionSection
            value="transfer"
            title="Transfer & Trading Controls"
            badge={{ type: "advanced", text: "Security" }}
          >
            <div className="space-y-6">
              <SwitchField
                label="Transfer Locked"
                description="Prevent all token transfers (can be unlocked later)"
                checked={config.transfer_locked}
                onCheckedChange={(checked) => handleChange("transfer_locked", checked)}
              />

              <SwitchField
                label="Soulbound (ERC-5192)"
                description="Make tokens non-transferable (permanent)"
                checked={config.soulbound}
                onCheckedChange={(checked) => handleChange("soulbound", checked)}
              />
            </div>
          </AccordionSection>

          {/* Access Control */}
          <AccordionSection
            value="access"
            title="Access Control"
            badge={{ type: "advanced", text: "Security" }}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="accessControl">Access Control Model</Label>
                <Select value={config.access_control} onValueChange={(value) => handleChange("access_control", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select access control model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ownable">Ownable (Single Owner)</SelectItem>
                    <SelectItem value="roles">Role-Based Access Control</SelectItem>
                    <SelectItem value="multi_sig">Multi-Signature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionSection>

          {/* Compliance & Restrictions - KEPT per requirements */}
          <AccordionSection
            value="compliance"
            title="Compliance & Restrictions"
            badge={{ type: "enterprise", text: "Compliance" }}
          >
            <div className="space-y-6">
              <SwitchField
                label="Geographic Restrictions"
                description="Enable country-based transfer restrictions"
                checked={config.use_geographic_restrictions}
                onCheckedChange={(checked) => handleChange("use_geographic_restrictions", checked)}
              />

              {config.use_geographic_restrictions && (
                <div className="space-y-6 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="defaultPolicy">Default Restriction Policy</Label>
                    <Select 
                      value={config.default_restriction_policy} 
                      onValueChange={(value) => handleChange("default_restriction_policy", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select default policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allowed">Allowed (Blacklist Mode)</SelectItem>
                        <SelectItem value="restricted">Restricted (Whitelist Mode)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <MultiEntryField
                    label="Restricted Countries"
                    description="Enter country codes (e.g., US, CN, RU)"
                    values={config.geographic_restrictions}
                    onValuesChange={(values) => handleChange("geographic_restrictions", values)}
                    validation={validateCountryCode}
                    placeholder="Enter 2-letter country code"
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <InfoCircledIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Whitelist Configuration</Label>
                    <p className="text-xs text-muted-foreground">
                      Manage approved addresses for token transfers (compliance module)
                    </p>
                  </div>
                </div>

                <MultiEntryField
                  label="Whitelisted Addresses"
                  description="Ethereum addresses approved for transfers"
                  values={config.whitelist_addresses}
                  onValuesChange={(values) => handleChange("whitelist_addresses", values)}
                  validation={validateEthereumAddress}
                  placeholder="0x..."
                />
              </div>
            </div>
          </AccordionSection>

        </Accordion>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Asset Type:</span>
                <span className="ml-2 font-medium">{config.asset_type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Supply:</span>
                <span className="ml-2 font-medium">{config.max_supply || "Unlimited"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mintable:</span>
                <Badge variant={config.is_mintable ? "default" : "secondary"} className="ml-2">
                  {config.is_mintable ? "Yes" : "No"}
                </Badge>
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
                  {config.has_royalty ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Soulbound:</span>
                <Badge variant={config.soulbound ? "default" : "secondary"} className="ml-2">
                  {config.soulbound ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Geographic Restrictions:</span>
                <Badge variant={config.use_geographic_restrictions ? "default" : "secondary"} className="ml-2">
                  {config.use_geographic_restrictions ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </TooltipProvider>
  );
};

export default ERC721PropertiesForm;
