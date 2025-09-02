import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion } from "@/components/ui/accordion";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Import our new UI components
import { SwitchField, AccordionSection, MultiEntryField } from "./ui";

interface ERC1155BaseFormProps {
  config: any;
  onChange: (field: string, value: any) => void;
}

/**
 * ERC-1155 Base Form Component
 * Handles core properties from token_erc1155_properties table (69 fields)
 * Organized by functional categories for better UX
 */
const ERC1155BaseForm: React.FC<ERC1155BaseFormProps> = ({ config, onChange }) => {
  const handleInputChange = (field: string, value: any) => {
    onChange(field, value);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Collection Details */}
        <Card>
          <CardHeader>
            <CardTitle>Collection Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="base_uri" className="flex items-center">
                  Base URI
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Base URI for token metadata (e.g., ipfs://QmHash/)</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="base_uri"
                  value={config.base_uri || ""}
                  onChange={(e) => handleInputChange("base_uri", e.target.value)}
                  placeholder="ipfs://QmHash/"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metadata_storage" className="flex items-center">
                  Metadata Storage
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Where token metadata is stored</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select 
                  value={config.metadata_storage || "ipfs"} 
                  onValueChange={(value) => handleInputChange("metadata_storage", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ipfs">IPFS</SelectItem>
                    <SelectItem value="arweave">Arweave</SelectItem>
                    <SelectItem value="centralized">Centralized</SelectItem>
                    <SelectItem value="onchain">On-chain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Features */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Features</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={["core-features"]}>
              {/* Core Features */}
              <AccordionSection
                value="core-features"
                title="Core Features"
                badge={{ type: "advanced", text: "Core" }}
              >
                <div className="space-y-6">
                  <SwitchField
                    label="Royalty Support"
                    description="Enable EIP-2981 royalty standard"
                    checked={config.has_royalty || false}
                    onCheckedChange={(checked) => handleInputChange("has_royalty", checked)}
                  />

                  <SwitchField
                    label="Burnable"
                    description="Allow tokens to be burned (destroyed)"
                    checked={config.is_burnable || false}
                    onCheckedChange={(checked) => handleInputChange("is_burnable", checked)}
                  />

                  <SwitchField
                    label="Pausable"
                    description="Allow pausing all token operations"
                    checked={config.is_pausable || false}
                    onCheckedChange={(checked) => handleInputChange("is_pausable", checked)}
                  />

                  <SwitchField
                    label="Supply Tracking"
                    description="Track total supply for each token type"
                    checked={config.supply_tracking || false}
                    onCheckedChange={(checked) => handleInputChange("supply_tracking", checked)}
                  />

                  {config.has_royalty && (
                    <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="royalty_percentage">Royalty Percentage (%)</Label>
                          <Input
                            id="royalty_percentage"
                            value={config.royalty_percentage || ""}
                            onChange={(e) => handleInputChange("royalty_percentage", e.target.value)}
                            placeholder="5.0"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="royalty_receiver">Royalty Receiver Address</Label>
                          <Input
                            id="royalty_receiver"
                            value={config.royalty_receiver || ""}
                            onChange={(e) => handleInputChange("royalty_receiver", e.target.value)}
                            placeholder="0x..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionSection>

              {/* Access Control */}
              <AccordionSection
                value="access-control"
                title="Access Control & Permissions"
                badge={{ type: "enterprise", text: "Security" }}
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="access_control">Access Control Model</Label>
                    <Select 
                      value={config.access_control || "ownable"} 
                      onValueChange={(value) => handleInputChange("access_control", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select access control" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ownable">Ownable (Single Owner)</SelectItem>
                        <SelectItem value="roles">Role-Based Access</SelectItem>
                        <SelectItem value="none">No Access Control</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <SwitchField
                    label="Approval For All"
                    description="Enable setApprovalForAll functionality"
                    checked={config.enable_approval_for_all ?? true}
                    onCheckedChange={(checked) => handleInputChange("enable_approval_for_all", checked)}
                  />

                  <SwitchField
                    label="Updatable URIs"
                    description="Allow updating token URIs after minting"
                    checked={config.updatable_uris || false}
                    onCheckedChange={(checked) => handleInputChange("updatable_uris", checked)}
                  />
                </div>
              </AccordionSection>

              {/* Batch Operations */}
              <AccordionSection
                value="batch-operations"
                title="Batch Operations"
                badge={{ type: "advanced", text: "Performance" }}
              >
                <div className="space-y-6">
                  <SwitchField
                    label="Batch Minting"
                    description="Enable minting multiple tokens in one transaction"
                    checked={config.batch_minting_enabled || false}
                    onCheckedChange={(checked) => handleInputChange("batch_minting_enabled", checked)}
                  />

                  <SwitchField
                    label="Container Support"
                    description="Enable nested token containers"
                    checked={config.container_enabled || false}
                    onCheckedChange={(checked) => handleInputChange("container_enabled", checked)}
                  />
                </div>
              </AccordionSection>

              {/* Geographic Restrictions */}
              <AccordionSection
                value="geographic"
                title="Geographic Restrictions"
                badge={{ type: "compliance", text: "Compliance" }}
              >
                <div className="space-y-6">
                  <SwitchField
                    label="Geographic Restrictions"
                    description="Enable geographic-based transfer restrictions"
                    checked={config.use_geographic_restrictions || false}
                    onCheckedChange={(checked) => handleInputChange("use_geographic_restrictions", checked)}
                  />

                  {config.use_geographic_restrictions && (
                    <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                      <div className="space-y-2">
                        <Label htmlFor="default_restriction_policy">Default Policy</Label>
                        <Select 
                          value={config.default_restriction_policy || "allowed"} 
                          onValueChange={(value) => handleInputChange("default_restriction_policy", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select default policy" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="allowed">Allow by Default</SelectItem>
                            <SelectItem value="blocked">Block by Default</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <MultiEntryField
                        label="Restricted Countries"
                        description="ISO 3166-1 alpha-2 country codes to restrict (e.g., US, CN, RU)"
                        placeholder="US"
                        values={config.geographic_restrictions || []}
                        onValuesChange={(values) => handleInputChange("geographic_restrictions", values)}
                        maxItems={250}
                      />
                    </div>
                  )}
                </div>
              </AccordionSection>

              {/* Advanced Token Features */}
              <AccordionSection
                value="advanced-features"
                title="Advanced Token Features"
                badge={{ type: "advanced", text: "Advanced" }}
              >
                <div className="space-y-6">
                  {/* Dynamic URIs */}
                  <SwitchField
                    label="Dynamic URIs"
                    description="Enable dynamic metadata URIs"
                    checked={config.dynamic_uris || false}
                    onCheckedChange={(checked) => handleInputChange("dynamic_uris", checked)}
                  />

                  <SwitchField
                    label="Updatable Metadata"
                    description="Allow metadata updates after minting"
                    checked={config.updatable_metadata || false}
                    onCheckedChange={(checked) => handleInputChange("updatable_metadata", checked)}
                  />

                  <SwitchField
                    label="Advanced Supply Tracking"
                    description="Enable detailed supply tracking features"
                    checked={config.supply_tracking_advanced || false}
                    onCheckedChange={(checked) => handleInputChange("supply_tracking_advanced", checked)}
                  />

                  {/* Max Supply Configuration */}
                  {config.supply_tracking_advanced && (
                    <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                      <Label htmlFor="max_supply_per_type">Max Supply Per Type (Optional)</Label>
                      <Input
                        id="max_supply_per_type"
                        value={config.max_supply_per_type || ""}
                        onChange={(e) => handleInputChange("max_supply_per_type", e.target.value)}
                        placeholder="Leave blank for unlimited"
                      />
                    </div>
                  )}
                </div>
              </AccordionSection>

              {/* Role-based Access */}
              <AccordionSection
                value="roles"
                title="Role Management"
                badge={{ type: "enterprise", text: "Access" }}
              >
                <div className="space-y-6">
                  <SwitchField
                    label="Burning Enabled"
                    description="Enable token burning functionality"
                    checked={config.burning_enabled || false}
                    onCheckedChange={(checked) => handleInputChange("burning_enabled", checked)}
                  />

                  {/* Role Arrays Configuration */}
                  <div className="space-y-4">
                    <MultiEntryField
                      label="Mint Roles"
                      description="Addresses allowed to mint new tokens"
                      placeholder="0x742d35Cc6634C0532925a3b8D44C5dB8678C6323"
                      values={config.mint_roles || []}
                      onValuesChange={(values) => handleInputChange("mint_roles", values)}
                      maxItems={50}
                    />

                    {config.burning_enabled && (
                      <MultiEntryField
                        label="Burn Roles"
                        description="Addresses allowed to burn tokens"
                        placeholder="0x742d35Cc6634C0532925a3b8D44C5dB8678C6323"
                        values={config.burn_roles || []}
                        onValuesChange={(values) => handleInputChange("burn_roles", values)}
                        maxItems={50}
                      />
                    )}

                    {config.updatable_metadata && (
                      <MultiEntryField
                        label="Metadata Update Roles"
                        description="Addresses allowed to update token metadata"
                        placeholder="0x742d35Cc6634C0532925a3b8D44C5dB8678C6323"
                        values={config.metadata_update_roles || []}
                        onValuesChange={(values) => handleInputChange("metadata_update_roles", values)}
                        maxItems={50}
                      />
                    )}
                  </div>
                </div>
              </AccordionSection>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default ERC1155BaseForm;