/**
 * Improved ERC721 Simple Configuration Component
 * Uses centralized state management to eliminate validation issues
 * Based on working pattern from forms-comprehensive
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { TokensIcon } from "@radix-ui/react-icons";
import { useMinConfigForm } from "../../hooks/useMinConfigForm";

/**
 * ERC721SimpleConfig - Minimal ERC-721 NFT configuration interface
 * 
 * Simplified form system for creating basic ERC-721 NFT collections with:
 * 
 * 📋 **Core Information**
 * - Collection name, symbol, description
 * - Basic configuration settings
 * 
 * ⚙️ **Essential Properties**
 * - Metadata management (base_uri, metadata_storage)
 * - Basic supply settings (max_supply, minting controls)
 * - Simple royalty configuration (if enabled)
 * 
 * Focuses on essential features needed to deploy a functional NFT collection
 * without the complexity of advanced features like mint phases, traits, etc.
 */

interface ERC721SimpleConfigProps {
  tokenForm?: any;
  handleInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setTokenForm?: (updater: any) => void;
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
}

const ERC721SimpleConfig: React.FC<ERC721SimpleConfigProps> = ({ 
  tokenForm = {},
  handleInputChange,
  setTokenForm,
  onConfigChange,
  initialConfig = {}
}) => {
  // Use centralized form state management
  const {
    formData,
    handleInputChange: handleInput,
    handleSwitchChange,
    handleSelectChange
  } = useMinConfigForm({
    tokenForm,
    initialConfig,
    onConfigChange,
    setTokenForm,
    handleInputChange
  });

  return (
    <div className="space-y-6">
      <TooltipProvider>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Collection Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center">
                  Collection Name *
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">The name of your NFT collection (e.g., "Bored Ape Yacht Club")</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="My NFT Collection"
                  value={formData.name || ""}
                  onChange={handleInput}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol" className="flex items-center">
                  Collection Symbol *
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">The trading symbol for your collection (e.g., "BAYC")</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="symbol"
                  name="symbol"
                  placeholder="NFT"
                  value={formData.symbol || ""}
                  onChange={handleInput}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center">
                Description
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">A brief description of your NFT collection</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="description"
                name="description"
                placeholder="A unique NFT collection..."
                value={formData.description || ""}
                onChange={handleInput}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUri" className="flex items-center">
                Base URI *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Base URL for token metadata (e.g., "ipfs://QmYourHashHere/")</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="baseUri"
                name="baseUri"
                placeholder="ipfs://QmYourHashHere/"
                value={formData.baseUri || ""}
                onChange={handleInput}
              />
            </div>
          </CardContent>
        </Card>

        {/* Supply Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Supply & Minting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxSupply" className="flex items-center">
                Maximum Supply
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Maximum number of NFTs that can be minted (leave blank for unlimited)</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="maxSupply"
                name="maxSupply"
                type="number"
                placeholder="10000"
                value={formData.maxSupply || ""}
                onChange={handleInput}
              />
            </div>
          </CardContent>
        </Card>

        {/* Royalty Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Royalty Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Enable Royalties</span>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Enable creator royalties on secondary sales (EIP-2981)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={formData.hasRoyalty || false}
                onCheckedChange={(checked) => handleSwitchChange("hasRoyalty", checked)}
              />
            </div>

            {formData.hasRoyalty && (
              <div className="pl-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="royaltyPercentage" className="flex items-center">
                    Royalty Percentage
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Percentage of sale price to collect as royalty (e.g., 5.0 for 5%)</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="royaltyPercentage"
                    name="royaltyPercentage"
                    type="number"
                    placeholder="5.0"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.royaltyPercentage || ""}
                    onChange={handleInput}
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
                        <p className="max-w-xs">Ethereum address that will receive royalty payments</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="royaltyReceiver"
                    name="royaltyReceiver"
                    placeholder="0x..."
                    value={formData.royaltyReceiver || ""}
                    onChange={handleInput}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Features */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Pausable</span>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Allow pausing transfers in emergency situations</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={formData.isPausable || false}
                onCheckedChange={(checked) => handleSwitchChange("isPausable", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Burnable</span>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Allow token holders to burn (destroy) their NFTs</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={formData.isBurnable || false}
                onCheckedChange={(checked) => handleSwitchChange("isBurnable", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
};

export default ERC721SimpleConfig;
