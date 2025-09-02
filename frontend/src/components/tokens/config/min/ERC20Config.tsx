/**
 * Improved ERC20 Simple Configuration Component
 * Uses centralized state management to eliminate validation issues
 * Based on working pattern from forms-comprehensive
 */
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { ERC20SimpleConfigProps } from "@/components/tokens/types";
import { useMinConfigForm } from "../../hooks/useMinConfigForm";

/**
 * Simple configuration component for ERC20 tokens
 * Focuses on mandatory and commonly used features of the ERC-20 standard
 * Uses centralized state management to prevent validation issues
 */
const ERC20SimpleConfig: React.FC<ERC20SimpleConfigProps> = ({ 
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
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Core Required Functions Section */}
              <div>
                <h3 className="text-md font-medium mb-4">Core Token Details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center">
                      Token Name
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The full name of your token (e.g., "Ethereum")</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="My Token"
                      value={formData.name || ""}
                      onChange={handleInput}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="flex items-center">
                      Token Symbol
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The trading symbol for your token (e.g., "ETH")</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="symbol"
                      name="symbol"
                      placeholder="TKN"
                      value={formData.symbol || ""}
                      onChange={handleInput}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="flex items-center">
                    Token Type
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Classification of your token's primary use case</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select 
                    value={formData.tokenType || "utility"} 
                    onValueChange={(value) => handleSelectChange("tokenType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select token type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utility">Utility Token</SelectItem>
                      <SelectItem value="security">Security Token</SelectItem>
                      <SelectItem value="governance">Governance Token</SelectItem>
                      <SelectItem value="stablecoin">Stablecoin</SelectItem>
                      <SelectItem value="asset_backed">Asset-Backed Token</SelectItem>
                      <SelectItem value="debt">Debt Token</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="description" className="flex items-center">
                    Description
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">A brief description of your token's purpose</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="A brief description of your token"
                    value={formData.description || ""}
                    onChange={handleInput}
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="decimals" className="flex items-center">
                      Decimals
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Number of decimal places (standard is 18 for Ethereum-like precision)</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="decimals"
                      name="decimals"
                      type="number"
                      placeholder="18"
                      value={formData.decimals || 18}
                      onChange={handleInput}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="initialSupply" className="flex items-center">
                      Initial Supply
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The total number of tokens to create at launch</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="initialSupply"
                      name="initialSupply"
                      placeholder="1000000"
                      value={formData.initialSupply || ""}
                      onChange={handleInput}
                    />
                  </div>
                </div>
              </div>

              {/* Optional Extensions Section */}
              <div>
                <h3 className="text-md font-medium mb-4">Common Extensions</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Mintable</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Allows creating new tokens after initial supply (mint function)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.isMintable || false}
                      onCheckedChange={(checked) => handleSwitchChange("isMintable", checked)}
                    />
                  </div>

                  {formData.isMintable && (
                    <div className="pl-6 space-y-2">
                      <Label htmlFor="cap" className="flex items-center">
                        Maximum Supply Cap
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Set a maximum token supply limit (leave blank for unlimited)</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="cap"
                        name="cap"
                        placeholder="Optional - leave blank for unlimited"
                        value={formData.cap || ""}
                        onChange={handleInput}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Burnable</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Allows destroying tokens (burn and burnFrom functions)</p>
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
                          <p className="max-w-xs">Allows pausing all token transfers in emergency situations (pause/unpause functions)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.isPausable || false}
                      onCheckedChange={(checked) => handleSwitchChange("isPausable", checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
};

export default ERC20SimpleConfig;
