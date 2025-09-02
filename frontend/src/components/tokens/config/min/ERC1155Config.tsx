/**
 * Improved ERC1155 Simple Configuration Component
 * Uses centralized state management to eliminate validation issues
 * Based on working pattern from forms-comprehensive
 */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ERC1155SimpleConfigProps } from "@/components/tokens/types";
import { useMinConfigForm } from "../../hooks/useMinConfigForm";

/**
 * Simple configuration component for ERC1155 (Multi-Token) tokens
 * Focuses on the core features needed to deploy an ERC-1155 contract
 * Uses centralized state management to prevent validation issues
 */
const ERC1155ConfigMin: React.FC<ERC1155SimpleConfigProps> = ({ 
  tokenForm,
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
    handleSelectChange,
    handleFieldChange
  } = useMinConfigForm({
    tokenForm,
    initialConfig,
    onConfigChange,
    setTokenForm,
    handleInputChange
  });

  // Local state for token types - this is specific to ERC1155 and not part of main form data
  const [tokenTypes, setTokenTypes] = useState(() => {
    const initialTokenTypes = formData.tokenTypes || initialConfig.tokenTypes;
    if (Array.isArray(initialTokenTypes) && initialTokenTypes.length > 0) {
      return initialTokenTypes.map(token => ({
        id: token.id || "1",
        name: token.name || "Token Type 1",
        supply: token.supply || "1000",
        fungible: token.fungible ?? true
      }));
    }
    return [{ id: "1", name: "Token Type 1", supply: "1000", fungible: true }];
  });

  // Handle token type changes and update main form data
  const handleTokenTypeChange = (index: number, field: string, value: string | boolean) => {
    const updatedTokenTypes = [...tokenTypes];
    updatedTokenTypes[index] = { ...updatedTokenTypes[index], [field]: value };
    setTokenTypes(updatedTokenTypes);
    
    // Update main form data
    handleFieldChange("tokenTypes", updatedTokenTypes);
  };

  // Add a new token type
  const addTokenType = () => {
    const newId = (Math.max(...tokenTypes.map(t => parseInt(t.id) || 0), 0) + 1).toString();
    const newTokenTypes = [...tokenTypes, { id: newId, name: `Token Type ${newId}`, supply: "1000", fungible: true }];
    setTokenTypes(newTokenTypes);
    handleFieldChange("tokenTypes", newTokenTypes);
  };

  // Remove a token type
  const removeTokenType = (index: number) => {
    if (tokenTypes.length <= 1) {
      return; // Always keep at least one token type
    }
    const newTokenTypes = tokenTypes.filter((_, i) => i !== index);
    setTokenTypes(newTokenTypes);
    handleFieldChange("tokenTypes", newTokenTypes);
  };

  return (
    <div className="space-y-6">
      <TooltipProvider>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Collection Details Section */}
              <div>
                <h3 className="text-md font-medium mb-4">Collection Details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center">
                      Collection Name
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The name of your token collection</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="My ERC-1155 Collection"
                      value={formData.name || ""}
                      onChange={handleInput}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="flex items-center">
                      Collection Symbol
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The short symbol for your collection</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="symbol"
                      name="symbol"
                      placeholder="M1155"
                      value={formData.symbol || ""}
                      onChange={handleInput}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="description" className="flex items-center">
                    Description
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">A brief description of your token collection</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="A brief description of your ERC-1155 collection"
                    value={formData.description || ""}
                    onChange={handleInput}
                  />
                </div>
              </div>

              {/* Metadata Settings Section */}
              <div>
                <h3 className="text-md font-medium mb-4">Metadata Settings</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="metadataStorage" className="flex items-center">
                      Metadata Storage
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Where your token metadata will be stored</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select 
                      value={formData.metadataStorage || "ipfs"} 
                      onValueChange={(value) => handleSelectChange("metadataStorage", value)}
                    >
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
                          <p className="max-w-xs">The base URI for all token metadata (e.g., "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/"). Token IDs will be appended to this URI.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="baseUri"
                      name="baseUri"
                      placeholder="ipfs://..."
                      value={formData.baseUri || ""}
                      onChange={handleInput}
                    />
                    <p className="text-xs text-muted-foreground">
                      Can be set later if not available yet
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Batch Minting</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Allow minting multiple token types in a single transaction</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.batchMinting ?? true}
                      onCheckedChange={(checked) => handleSwitchChange("batchMinting", checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Features Section */}
              <div>
                <h3 className="text-md font-medium mb-4">Advanced Features</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Supply Tracking</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Track token supply automatically</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.supplyTracking ?? true}
                      onCheckedChange={(checked) => handleSwitchChange("supplyTracking", checked)}
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
                          <p className="max-w-xs">Allow tokens to be burned (destroyed)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.isBurnable || false}
                      onCheckedChange={(checked) => handleSwitchChange("isBurnable", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Pausable</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Allow pausing all token transfers</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.isPausable || false}
                      onCheckedChange={(checked) => handleSwitchChange("isPausable", checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessControl" className="flex items-center">
                      Access Control
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">How access to administrative functions is controlled</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select 
                      value={formData.accessControl || "ownable"} 
                      onValueChange={(value) => handleSelectChange("accessControl", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select access control method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ownable">Ownable (Single Owner)</SelectItem>
                        <SelectItem value="roles">Role-Based Access</SelectItem>
                        <SelectItem value="none">No Access Control</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Token Types Section */}
              <div>
                <h3 className="text-md font-medium mb-4">
                  Token Types
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (Define your token IDs)
                  </span>
                </h3>
                
                <div className="space-y-4">
                  {tokenTypes.map((tokenType, index) => (
                    <div key={index} className="p-4 border rounded-md">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Token ID: {tokenType.id}</h4>
                        {tokenTypes.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTokenType(index)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`tokenName-${index}`}>
                            Token Name
                          </Label>
                          <Input
                            id={`tokenName-${index}`}
                            value={tokenType.name}
                            onChange={(e) => handleTokenTypeChange(index, "name", e.target.value)}
                            placeholder="Gold Coin"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`tokenSupply-${index}`}>
                            Initial Supply
                          </Label>
                          <Input
                            id={`tokenSupply-${index}`}
                            type="number"
                            value={tokenType.supply}
                            onChange={(e) => handleTokenTypeChange(index, "supply", e.target.value)}
                            placeholder="1000"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center space-x-2">
                        <Switch
                          id={`tokenFungible-${index}`}
                          checked={tokenType.fungible}
                          onCheckedChange={(checked) => handleTokenTypeChange(index, "fungible", checked)}
                        />
                        <Label htmlFor={`tokenFungible-${index}`}>
                          Fungible Token
                        </Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">If enabled, creates a fungible token with the specified supply. If disabled, creates a single NFT.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={addTokenType}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Token Type
                  </Button>
                </div>
              </div>

              {/* Royalty Settings Section */}
              <div>
                <h3 className="text-md font-medium mb-4">Royalty Settings (EIP-2981)</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Enable Royalties</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Adds royaltyInfo(uint256 tokenId, uint256 salePrice) for creator royalties on secondary sales</p>
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
                          Royalty Percentage (%)
                          <Tooltip>
                            <TooltipTrigger className="ml-1.5">
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">The percentage of the sale price that goes to the creator (e.g., 5.0 for 5%)</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id="royaltyPercentage"
                          name="royaltyPercentage"
                          type="number"
                          placeholder="5.0"
                          value={formData.royaltyPercentage || "0"}
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
                              <p className="max-w-xs">The Ethereum address that will receive royalty payments</p>
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
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
};

export default ERC1155ConfigMin;
