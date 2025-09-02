import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion } from "@/components/ui/accordion";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

// Import our new UI components
import { SwitchField, AccordionSection, MultiEntryField, FeatureBadge, validateEthereumAddress, validateCountryCode } from "./ui";

/**
 * ERC721PropertiesForm - ERC-721 specific properties from token_erc721_properties table
 * 
 * Updated with improved UI:
 * - Consistent badge alignment using AccordionSection
 * - Clean toggle layout using SwitchField  
 * - Multi-entry fields for whitelists and geographic restrictions
 * - Better spacing and visual hierarchy
 * 
 * Handles all 84 fields from token_erc721_properties table organized in logical sections:
 * - Metadata Management (base_uri, metadata_storage, contract_uri, dynamic metadata)
 * - Supply & Minting (max_supply, minting settings, admin/public minting controls)
 * - Access Control & Features (pausable, burnable, access control, roles)
 * - Royalties & Creator Earnings (EIP-2981 royalties, creator earnings, marketplace settings)
 * - Sales & Phases (public/whitelist sales, dutch auctions, mint phases)
 * - Reveal Mechanism (revealable collections, pre-reveal URIs, auto-reveal settings)
 * - Advanced Features (staking, breeding, evolution, utility features)
 * - Transfer & Trading (soulbound tokens, transfer restrictions, operator filters)
 * - Cross-chain & Layer2 (bridge contracts, layer2 networks)
 * - Geographic Restrictions (compliance settings)
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
    // Initialize with all token_erc721_properties fields (84 total)
    return {
      // Metadata Management (7 fields)
      base_uri: tokenForm.base_uri || "",
      metadata_storage: tokenForm.metadata_storage || "ipfs",
      contract_uri: tokenForm.contract_uri || "",
      custom_base_uri: tokenForm.custom_base_uri || "",
      uri_storage: tokenForm.uri_storage || "tokenId",
      updatable_uris: tokenForm.updatable_uris ?? false,
      enable_dynamic_metadata: tokenForm.enable_dynamic_metadata ?? false,
      
      // Supply & Minting (11 fields)
      max_supply: tokenForm.max_supply || "",
      reserved_tokens: tokenForm.reserved_tokens || 0,
      minting_method: tokenForm.minting_method || "open",
      auto_increment_ids: tokenForm.auto_increment_ids ?? true,
      supply_validation_enabled: tokenForm.supply_validation_enabled ?? true,
      is_mintable: tokenForm.is_mintable ?? true,
      admin_mint_enabled: tokenForm.admin_mint_enabled ?? true,
      public_mint_enabled: tokenForm.public_mint_enabled ?? false,
      mint_roles: tokenForm.mint_roles || [],
      supply_cap_enabled: tokenForm.supply_cap_enabled ?? false,
      total_supply_cap: tokenForm.total_supply_cap || "",
      
      // Access Control & Features (6 fields)
      is_burnable: tokenForm.is_burnable ?? false,
      is_pausable: tokenForm.is_pausable ?? false,
      access_control: tokenForm.access_control || "ownable",
      enumerable: tokenForm.enumerable ?? true,
      use_safe_transfer: tokenForm.use_safe_transfer ?? true,
      burn_roles: tokenForm.burn_roles || [],
      
      // Royalties & Creator Earnings (9 fields)
      has_royalty: tokenForm.has_royalty ?? false,
      royalty_percentage: tokenForm.royalty_percentage || "",
      royalty_receiver: tokenForm.royalty_receiver || "",
      creator_earnings_enabled: tokenForm.creator_earnings_enabled ?? false,
      creator_earnings_percentage: tokenForm.creator_earnings_percentage || "",
      creator_earnings_address: tokenForm.creator_earnings_address || "",
      marketplace_approved: tokenForm.marketplace_approved || [],
      operator_filter_enabled: tokenForm.operator_filter_enabled ?? false,
      custom_operator_filter_address: tokenForm.custom_operator_filter_address || "",
      
      // Sales & Phases (17 fields)
      public_sale_enabled: tokenForm.public_sale_enabled ?? false,
      public_sale_price: tokenForm.public_sale_price || "",
      public_sale_start_time: tokenForm.public_sale_start_time || "",
      public_sale_end_time: tokenForm.public_sale_end_time || "",
      whitelist_sale_enabled: tokenForm.whitelist_sale_enabled ?? false,
      whitelist_sale_price: tokenForm.whitelist_sale_price || "",
      whitelist_sale_start_time: tokenForm.whitelist_sale_start_time || "",
      whitelist_sale_end_time: tokenForm.whitelist_sale_end_time || "",
      minting_price: tokenForm.minting_price || "",
      max_mints_per_tx: tokenForm.max_mints_per_tx || null,
      max_mints_per_wallet: tokenForm.max_mints_per_wallet || null,
      mint_phases_enabled: tokenForm.mint_phases_enabled ?? false,
      dutch_auction_enabled: tokenForm.dutch_auction_enabled ?? false,
      dutch_auction_start_price: tokenForm.dutch_auction_start_price || "",
      dutch_auction_end_price: tokenForm.dutch_auction_end_price || "",
      dutch_auction_duration: tokenForm.dutch_auction_duration || null,
      asset_type: tokenForm.asset_type || "unique_asset",
      
      // Reveal Mechanism (8 fields)
      revealable: tokenForm.revealable ?? false,
      pre_reveal_uri: tokenForm.pre_reveal_uri || "",
      placeholder_image_uri: tokenForm.placeholder_image_uri || "",
      reveal_batch_size: tokenForm.reveal_batch_size || null,
      auto_reveal: tokenForm.auto_reveal ?? false,
      reveal_delay: tokenForm.reveal_delay || null,
      metadata_frozen: tokenForm.metadata_frozen ?? false,
      metadata_provenance_hash: tokenForm.metadata_provenance_hash || "",
      
      // Advanced Features (9 fields)
      utility_enabled: tokenForm.utility_enabled ?? false,
      utility_type: tokenForm.utility_type || "",
      staking_enabled: tokenForm.staking_enabled ?? false,
      staking_rewards_token_address: tokenForm.staking_rewards_token_address || "",
      staking_rewards_rate: tokenForm.staking_rewards_rate || "",
      breeding_enabled: tokenForm.breeding_enabled ?? false,
      evolution_enabled: tokenForm.evolution_enabled ?? false,
      enable_fractional_ownership: tokenForm.enable_fractional_ownership ?? false,
      
      // Transfer & Trading (2 fields)
      transfer_locked: tokenForm.transfer_locked ?? false,
      soulbound: tokenForm.soulbound ?? false,
      
      // Cross-chain & Layer2 (4 fields)
      cross_chain_enabled: tokenForm.cross_chain_enabled ?? false,
      bridge_contracts: tokenForm.bridge_contracts || {},
      layer2_enabled: tokenForm.layer2_enabled ?? false,
      layer2_networks: tokenForm.layer2_networks || [],
      
      // Geographic Restrictions (4 fields)
      use_geographic_restrictions: tokenForm.use_geographic_restrictions ?? false,
      default_restriction_policy: tokenForm.default_restriction_policy || "allowed",
      geographic_restrictions: tokenForm.geographic_restrictions || [],
      whitelist_addresses: tokenForm.whitelist_addresses || [],
      
      // JSONB Configuration Objects (6 fields)
      sales_config: tokenForm.sales_config || {},
      whitelist_config: tokenForm.whitelist_config || {},
      permission_config: tokenForm.permission_config || {},
      dynamic_uri_config: tokenForm.dynamic_uri_config || {},
      batch_minting_config: tokenForm.batch_minting_config || {},
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
                <Label htmlFor="metadataStorage" className="flex items-center">
                  Metadata Storage *
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Where your NFT metadata will be stored</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select value={config.metadata_storage} onValueChange={(value) => handleChange("metadata_storage", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ipfs">IPFS (Recommended)</SelectItem>
                    <SelectItem value="arweave">Arweave</SelectItem>
                    <SelectItem value="centralized">Centralized Server</SelectItem>
                    <SelectItem value="onchain">On-Chain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUri" className="flex items-center">
                  Base URI
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">The base URI for all token metadata (e.g., "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/")</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="baseUri"
                  placeholder="ipfs://QmHash/ or https://api.example.com/metadata/"
                  value={config.base_uri}
                  onChange={(e) => handleChange("base_uri", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractUri">Contract URI (Collection Metadata)</Label>
                <Input
                  id="contractUri"
                  placeholder="ipfs://QmHash/contract.json"
                  value={config.contract_uri}
                  onChange={(e) => handleChange("contract_uri", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uriStorage">URI Storage Method</Label>
                <Select value={config.uri_storage} onValueChange={(value) => handleChange("uri_storage", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tokenId">Token ID Based</SelectItem>
                    <SelectItem value="custom">Custom URI per Token</SelectItem>
                    <SelectItem value="folder">Folder Structure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SwitchField
                label="Updatable URIs"
                description="Allow metadata URIs to be updated after minting"
                checked={config.updatable_uris}
                onCheckedChange={(checked) => handleChange("updatable_uris", checked)}
              />

              <SwitchField
                label="Dynamic Metadata"
                description="Enable metadata to change based on external conditions"
                checked={config.enable_dynamic_metadata}
                onCheckedChange={(checked) => handleChange("enable_dynamic_metadata", checked)}
              />

              <SwitchField
                label="Metadata Frozen"
                description="Permanently freeze metadata to prevent future updates"
                checked={config.metadata_frozen}
                onCheckedChange={(checked) => handleChange("metadata_frozen", checked)}
              />

              {config.metadata_frozen && (
                <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                  <Label htmlFor="provenanceHash">Provenance Hash</Label>
                  <Input
                    id="provenanceHash"
                    placeholder="0x..."
                    value={config.metadata_provenance_hash}
                    onChange={(e) => handleChange("metadata_provenance_hash", e.target.value)}
                  />
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Supply & Minting */}
          <AccordionSection
            value="supply"
            title="Supply & Minting Configuration"
            badge={{ type: "advanced", text: "Core" }}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxSupply">Maximum Supply</Label>
                  <Input
                    id="maxSupply"
                    type="number"
                    min="1"
                    placeholder="10000"
                    value={config.max_supply}
                    onChange={(e) => handleChange("max_supply", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reservedTokens">Reserved Tokens</Label>
                  <Input
                    id="reservedTokens"
                    type="number"
                    min="0"
                    placeholder="100"
                    value={config.reserved_tokens}
                    onChange={(e) => handleChange("reserved_tokens", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mintingMethod">Minting Method</Label>
                <Select value={config.minting_method} onValueChange={(value) => handleChange("minting_method", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open Minting</SelectItem>
                    <SelectItem value="whitelist">Whitelist Only</SelectItem>
                    <SelectItem value="auction">Auction Based</SelectItem>
                    <SelectItem value="lazy">Lazy Minting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SwitchField
                label="Auto-increment IDs"
                description="Automatically assign sequential token IDs"
                checked={config.auto_increment_ids}
                onCheckedChange={(checked) => handleChange("auto_increment_ids", checked)}
              />

              <SwitchField
                label="Admin Mint"
                description="Allow administrators to mint tokens"
                checked={config.admin_mint_enabled}
                onCheckedChange={(checked) => handleChange("admin_mint_enabled", checked)}
              />

              <SwitchField
                label="Public Mint"
                description="Allow public minting of tokens"
                checked={config.public_mint_enabled}
                onCheckedChange={(checked) => handleChange("public_mint_enabled", checked)}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxMintsPerTx">Max Mints Per Transaction</Label>
                  <Input
                    id="maxMintsPerTx"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={config.max_mints_per_tx || ""}
                    onChange={(e) => handleChange("max_mints_per_tx", parseInt(e.target.value) || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxMintsPerWallet">Max Mints Per Wallet</Label>
                  <Input
                    id="maxMintsPerWallet"
                    type="number"
                    min="1"
                    placeholder="Leave blank for unlimited"
                    value={config.max_mints_per_wallet || ""}
                    onChange={(e) => handleChange("max_mints_per_wallet", parseInt(e.target.value) || null)}
                  />
                </div>
              </div>

              <SwitchField
                label="Supply Cap Enabled"
                description="Enable overall supply cap validation"
                checked={config.supply_cap_enabled}
                onCheckedChange={(checked) => handleChange("supply_cap_enabled", checked)}
              />

              <SwitchField
                label="Supply Validation"
                description="Validate supply constraints during minting"
                checked={config.supply_validation_enabled}
                onCheckedChange={(checked) => handleChange("supply_validation_enabled", checked)}
              />

              {config.supply_cap_enabled && (
                <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                  <Label htmlFor="totalSupplyCap">Total Supply Cap</Label>
                  <Input
                    id="totalSupplyCap"
                    type="number"
                    placeholder="Maximum possible supply"
                    value={config.total_supply_cap}
                    onChange={(e) => handleChange("total_supply_cap", e.target.value)}
                  />
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Royalties & Creator Earnings */}
          <AccordionSection
            value="royalties"
            title="Royalties & Creator Earnings"
            badge={{ type: "enterprise", text: "Enterprise" }}
          >
            <div className="space-y-6">
              <SwitchField
                label="Enable Royalties (EIP-2981)"
                description="Standard royalty mechanism for secondary sales"
                checked={config.has_royalty}
                onCheckedChange={(checked) => handleChange("has_royalty", checked)}
              />

              {config.has_royalty && (
                <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="royaltyPercentage">Royalty Percentage (%)</Label>
                      <Input
                        id="royaltyPercentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="5.0"
                        value={config.royalty_percentage}
                        onChange={(e) => handleChange("royalty_percentage", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="royaltyReceiver">Royalty Receiver Address</Label>
                      <Input
                        id="royaltyReceiver"
                        placeholder="0x..."
                        value={config.royalty_receiver}
                        onChange={(e) => handleChange("royalty_receiver", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <SwitchField
                label="Creator Earnings (Additional)"
                description="Additional creator earnings on top of royalties"
                checked={config.creator_earnings_enabled}
                onCheckedChange={(checked) => handleChange("creator_earnings_enabled", checked)}
              />

              {config.creator_earnings_enabled && (
                <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="creatorEarningsPercentage">Creator Earnings (%)</Label>
                      <Input
                        id="creatorEarningsPercentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="2.5"
                        value={config.creator_earnings_percentage}
                        onChange={(e) => handleChange("creator_earnings_percentage", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="creatorEarningsAddress">Creator Earnings Address</Label>
                      <Input
                        id="creatorEarningsAddress"
                        placeholder="0x..."
                        value={config.creator_earnings_address}
                        onChange={(e) => handleChange("creator_earnings_address", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <SwitchField
                label="Operator Filter (OpenSea)"
                description="Filter out blocked marketplaces and operators"
                checked={config.operator_filter_enabled}
                onCheckedChange={(checked) => handleChange("operator_filter_enabled", checked)}
              />

              {config.operator_filter_enabled && (
                <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                  <Label htmlFor="customOperatorFilter">Custom Operator Filter Address</Label>
                  <Input
                    id="customOperatorFilter"
                    placeholder="0x... (optional)"
                    value={config.custom_operator_filter_address}
                    onChange={(e) => handleChange("custom_operator_filter_address", e.target.value)}
                  />
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Sales & Phases */}
          <AccordionSection
            value="sales"
            title="Sales & Mint Phases"
            badge={{ type: "enterprise", text: "Sales" }}
          >
            <div className="space-y-6">
              {/* Public Sale */}
              <div className="space-y-4">
                <SwitchField
                  label="Public Sale"
                  description="Enable public sale phase"
                  checked={config.public_sale_enabled}
                  onCheckedChange={(checked) => handleChange("public_sale_enabled", checked)}
                />

                {config.public_sale_enabled && (
                  <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="publicSalePrice">Price (ETH)</Label>
                      <Input
                        id="publicSalePrice"
                        type="number"
                        step="0.001"
                        placeholder="0.08"
                        value={config.public_sale_price}
                        onChange={(e) => handleChange("public_sale_price", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="publicSaleStartTime">Start Time</Label>
                        <Input
                          id="publicSaleStartTime"
                          type="datetime-local"
                          value={config.public_sale_start_time}
                          onChange={(e) => handleChange("public_sale_start_time", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="publicSaleEndTime">End Time</Label>
                        <Input
                          id="publicSaleEndTime"
                          type="datetime-local"
                          value={config.public_sale_end_time}
                          onChange={(e) => handleChange("public_sale_end_time", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Whitelist Sale */}
              <div className="space-y-4">
                <SwitchField
                  label="Whitelist Sale"
                  description="Enable whitelist/allowlist sale phase"
                  checked={config.whitelist_sale_enabled}
                  onCheckedChange={(checked) => handleChange("whitelist_sale_enabled", checked)}
                />

                {config.whitelist_sale_enabled && (
                  <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="whitelistSalePrice">Price (ETH)</Label>
                      <Input
                        id="whitelistSalePrice"
                        type="number"
                        step="0.001"
                        placeholder="0.05"
                        value={config.whitelist_sale_price}
                        onChange={(e) => handleChange("whitelist_sale_price", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="whitelistSaleStartTime">Start Time</Label>
                        <Input
                          id="whitelistSaleStartTime"
                          type="datetime-local"
                          value={config.whitelist_sale_start_time}
                          onChange={(e) => handleChange("whitelist_sale_start_time", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whitelistSaleEndTime">End Time</Label>
                        <Input
                          id="whitelistSaleEndTime"
                          type="datetime-local"
                          value={config.whitelist_sale_end_time}
                          onChange={(e) => handleChange("whitelist_sale_end_time", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Dutch Auction */}
              <div className="space-y-4">
                <SwitchField
                  label="Dutch Auction"
                  description="Enable Dutch auction pricing mechanism"
                  checked={config.dutch_auction_enabled}
                  onCheckedChange={(checked) => handleChange("dutch_auction_enabled", checked)}
                />

                {config.dutch_auction_enabled && (
                  <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="dutchAuctionStartPrice">Start Price (ETH)</Label>
                        <Input
                          id="dutchAuctionStartPrice"
                          type="number"
                          step="0.001"
                          placeholder="1.0"
                          value={config.dutch_auction_start_price}
                          onChange={(e) => handleChange("dutch_auction_start_price", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dutchAuctionEndPrice">End Price (ETH)</Label>
                        <Input
                          id="dutchAuctionEndPrice"
                          type="number"
                          step="0.001"
                          placeholder="0.1"
                          value={config.dutch_auction_end_price}
                          onChange={(e) => handleChange("dutch_auction_end_price", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dutchAuctionDuration">Duration (hours)</Label>
                        <Input
                          id="dutchAuctionDuration"
                          type="number"
                          min="1"
                          placeholder="24"
                          value={config.dutch_auction_duration || ""}
                          onChange={(e) => handleChange("dutch_auction_duration", parseInt(e.target.value) || null)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <SwitchField
                label="Enable Mint Phases"
                description="Enable advanced mint phase management"
                checked={config.mint_phases_enabled}
                onCheckedChange={(checked) => handleChange("mint_phases_enabled", checked)}
              />
            </div>
          </AccordionSection>

          {/* Reveal Mechanism */}
          <AccordionSection
            value="reveal"
            title="Reveal Mechanism"
            badge={{ type: "advanced", text: "NFT" }}
          >
            <div className="space-y-6">
              <SwitchField
                label="Enable Reveal Mechanism"
                description="Start with placeholder images and reveal actual NFTs later"
                checked={config.revealable}
                onCheckedChange={(checked) => handleChange("revealable", checked)}
              />

              {config.revealable && (
                <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="preRevealUri">Pre-reveal URI</Label>
                    <Input
                      id="preRevealUri"
                      placeholder="ipfs://QmHash/placeholder.json"
                      value={config.pre_reveal_uri}
                      onChange={(e) => handleChange("pre_reveal_uri", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="placeholderImageUri">Placeholder Image URI</Label>
                    <Input
                      id="placeholderImageUri"
                      placeholder="ipfs://QmHash/placeholder.png"
                      value={config.placeholder_image_uri}
                      onChange={(e) => handleChange("placeholder_image_uri", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="revealBatchSize">Reveal Batch Size</Label>
                      <Input
                        id="revealBatchSize"
                        type="number"
                        min="1"
                        placeholder="100"
                        value={config.reveal_batch_size || ""}
                        onChange={(e) => handleChange("reveal_batch_size", parseInt(e.target.value) || null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="revealDelay">Reveal Delay (hours)</Label>
                      <Input
                        id="revealDelay"
                        type="number"
                        min="0"
                        placeholder="24"
                        value={config.reveal_delay || ""}
                        onChange={(e) => handleChange("reveal_delay", parseInt(e.target.value) || null)}
                      />
                    </div>
                  </div>

                  <SwitchField
                    label="Auto-reveal"
                    description="Automatically reveal tokens after delay"
                    checked={config.auto_reveal}
                    onCheckedChange={(checked) => handleChange("auto_reveal", checked)}
                  />
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Advanced Features */}
          <AccordionSection
            value="advanced"
            title="Advanced Features"
            badge={{ type: "advanced", text: "Advanced" }}
          >
            <div className="space-y-6">
              {/* Utility Features */}
              <div className="space-y-4">
                <SwitchField
                  label="Utility Enabled"
                  description="Enable utility features for your NFTs"
                  checked={config.utility_enabled}
                  onCheckedChange={(checked) => handleChange("utility_enabled", checked)}
                />

                {config.utility_enabled && (
                  <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                    <Label htmlFor="utilityType">Utility Type</Label>
                    <Select value={config.utility_type} onValueChange={(value) => handleChange("utility_type", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select utility type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="membership">Membership Access</SelectItem>
                        <SelectItem value="governance">Governance Rights</SelectItem>
                        <SelectItem value="staking">Staking Rewards</SelectItem>
                        <SelectItem value="gaming">Gaming Utility</SelectItem>
                        <SelectItem value="metaverse">Metaverse Assets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              {/* Staking */}
              <div className="space-y-4">
                <SwitchField
                  label="Staking Enabled"
                  description="Enable staking functionality for NFT holders"
                  checked={config.staking_enabled}
                  onCheckedChange={(checked) => handleChange("staking_enabled", checked)}
                />

                {config.staking_enabled && (
                  <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="stakingRewardsTokenAddress">Rewards Token Address</Label>
                      <Input
                        id="stakingRewardsTokenAddress"
                        placeholder="0x... (rewards token contract)"
                        value={config.staking_rewards_token_address}
                        onChange={(e) => handleChange("staking_rewards_token_address", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stakingRewardsRate">Rewards Rate (tokens per day)</Label>
                      <Input
                        id="stakingRewardsRate"
                        placeholder="10"
                        value={config.staking_rewards_rate}
                        onChange={(e) => handleChange("staking_rewards_rate", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Gaming Features */}
              <div className="space-y-4">
                <SwitchField
                  label="Breeding"
                  description="Enable breeding between NFTs to create new tokens"
                  checked={config.breeding_enabled}
                  onCheckedChange={(checked) => handleChange("breeding_enabled", checked)}
                />

                <SwitchField
                  label="Evolution"
                  description="Allow NFTs to evolve and change over time"
                  checked={config.evolution_enabled}
                  onCheckedChange={(checked) => handleChange("evolution_enabled", checked)}
                />

                <SwitchField
                  label="Fractional Ownership"
                  description="Enable fractional ownership of individual NFTs"
                  checked={config.enable_fractional_ownership}
                  onCheckedChange={(checked) => handleChange("enable_fractional_ownership", checked)}
                />
              </div>
            </div>
          </AccordionSection>

          {/* Transfer & Trading */}
          <AccordionSection
            value="trading"
            title="Transfer & Trading Restrictions"
            badge={{ type: "compliance", text: "Compliance" }}
          >
            <div className="space-y-6">
              <SwitchField
                label="Soulbound Tokens"
                description="Non-transferable tokens tied to the holder"
                checked={config.soulbound}
                onCheckedChange={(checked) => handleChange("soulbound", checked)}
              />

              <SwitchField
                label="Transfer Locked"
                description="Temporarily lock transfers for all tokens"
                checked={config.transfer_locked}
                onCheckedChange={(checked) => handleChange("transfer_locked", checked)}
              />

              {(config.soulbound || config.transfer_locked) && (
                <div className="p-3 border rounded-md bg-yellow-50 dark:bg-yellow-900/20">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ {config.soulbound ? 'Soulbound tokens cannot be transferred.' : 'Transfer-locked tokens have restricted transferability.'}
                  </p>
                </div>
              )}

              <Separator />

              {/* Whitelist Management */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Whitelist Management</h4>
                
                <MultiEntryField
                  label="Whitelisted Addresses"
                  description="Ethereum addresses allowed to receive tokens"
                  placeholder="0x742d35Cc6634C0532925a3b8D44C5dB8678C6323"
                  values={config.whitelist_addresses}
                  onValuesChange={(values) => handleChange("whitelist_addresses", values)}
                  validation={validateEthereumAddress}
                  validationError="Please enter a valid Ethereum address"
                  maxItems={1000}
                />
              </div>
            </div>
          </AccordionSection>

          {/* Cross-chain & Layer2 */}
          <AccordionSection
            value="crosschain"
            title="Cross-chain & Layer2"
            badge={{ type: "enterprise", text: "Infrastructure" }}
          >
            <div className="space-y-6">
              <SwitchField
                label="Cross-chain Enabled"
                description="Enable cross-chain bridging functionality"
                checked={config.cross_chain_enabled}
                onCheckedChange={(checked) => handleChange("cross_chain_enabled", checked)}
              />

              <SwitchField
                label="Layer2 Enabled"
                description="Enable Layer2 network support"
                checked={config.layer2_enabled}
                onCheckedChange={(checked) => handleChange("layer2_enabled", checked)}
              />

              {(config.cross_chain_enabled || config.layer2_enabled) && (
                <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Cross-chain and Layer2 configurations will be set up after deployment through the bridge management interface.
                  </p>
                </div>
              )}
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
                label="Enable Geographic Restrictions"
                description="Restrict access based on geographic location"
                checked={config.use_geographic_restrictions}
                onCheckedChange={(checked) => handleChange("use_geographic_restrictions", checked)}
              />

              {config.use_geographic_restrictions && (
                <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="defaultRestrictionPolicy">Default Restriction Policy</Label>
                    <Select value={config.default_restriction_policy} onValueChange={(value) => handleChange("default_restriction_policy", value)}>
                      <SelectTrigger>
                        <SelectValue />
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
                    values={config.geographic_restrictions}
                    onValuesChange={(values) => handleChange("geographic_restrictions", values)}
                    validation={validateCountryCode}
                    validationError="Please enter a valid 2-letter country code (e.g., US, GB, DE)"
                    maxItems={250}
                  />
                </div>
              )}
            </div>
          </AccordionSection>

        </Accordion>
      </div>
    </TooltipProvider>
  );
};

export default ERC721PropertiesForm;
