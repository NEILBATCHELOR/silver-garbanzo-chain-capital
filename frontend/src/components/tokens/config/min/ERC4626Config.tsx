/**
 * Improved ERC4626 Simple Configuration Component
 * Uses centralized state management to eliminate validation issues
 * Based on working pattern from forms-comprehensive
 */
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMinConfigForm } from "../../hooks/useMinConfigForm";

// Define the props interface for ERC4626
interface ERC4626SimpleConfigProps {
  tokenForm: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setTokenForm: React.Dispatch<React.SetStateAction<any>>;
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
}

/**
 * Simple configuration component for ERC4626 (Tokenized Vault) tokens
 * Focuses on the core features needed to deploy an ERC-4626 vault
 * Uses centralized state management to prevent validation issues
 */
const ERC4626SimpleConfig: React.FC<ERC4626SimpleConfigProps> = ({ 
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

  // Handle fee toggle with nested object structure
  const handleFeeToggle = (enabled: boolean) => {
    const updatedFee = { 
      ...(formData.fee || {}),
      enabled 
    };
    handleFieldChange("fee", updatedFee);
  };

  // Handle fee percentage change
  const handleFeePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = e.target.value;
    const updatedFee = { 
      ...(formData.fee || {}),
      percentage: parseFloat(percentage) || 0
    };
    handleFieldChange("fee", updatedFee);
  };

  return (
    <div className="space-y-6">
      <TooltipProvider>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Vault Information */}
              <div>
                <h3 className="text-md font-medium mb-4">Vault Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center">
                      Vault Name
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The name of your tokenized vault</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="My Tokenized Vault"
                      value={formData.name || ""}
                      onChange={handleInput}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="flex items-center">
                      Vault Symbol
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The short symbol for your vault shares (e.g., "vUSDC")</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="symbol"
                      name="symbol"
                      placeholder="vUSDC"
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
                        <p className="max-w-xs">A brief description of your tokenized vault</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="A brief description of your ERC-4626 vault"
                    value={formData.description || ""}
                    onChange={handleInput}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="decimals" className="flex items-center">
                      Vault Share Decimals
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Number of decimal places for vault shares (usually matches underlying asset)</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="decimals"
                      name="decimals"
                      type="number"
                      placeholder="18"
                      value={formData.decimals ?? 18}
                      onChange={handleInput}
                    />
                  </div>
                </div>
              </div>

              {/* Underlying Asset Configuration */}
              <div>
                <h3 className="text-md font-medium mb-4">Underlying Asset</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assetAddress" className="flex items-center">
                      Asset Contract Address
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The contract address of the ERC-20 token that users will deposit into this vault</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="assetAddress"
                      name="assetAddress"
                      placeholder="0x..."
                      value={formData.assetAddress || ""}
                      onChange={handleInput}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="assetName" className="flex items-center">
                        Asset Name
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">The name of the underlying asset (e.g., "USD Coin")</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="assetName"
                        name="assetName"
                        placeholder="USD Coin"
                        value={formData.assetName || ""}
                        onChange={handleInput}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assetSymbol" className="flex items-center">
                        Asset Symbol
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">The symbol of the underlying asset (e.g., "USDC")</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="assetSymbol"
                        name="assetSymbol"
                        placeholder="USDC"
                        value={formData.assetSymbol || ""}
                        onChange={handleInput}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assetDecimals" className="flex items-center">
                        Asset Decimals
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Number of decimal places for the underlying asset</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="assetDecimals"
                        name="assetDecimals"
                        type="number"
                        placeholder="6"
                        value={formData.assetDecimals ?? 18}
                        onChange={handleInput}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Deposit/Withdrawal Limits */}
              <div>
                <h3 className="text-md font-medium mb-4">Deposit & Withdrawal Limits</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="minDepositAmount" className="flex items-center">
                      Minimum Deposit Amount
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The minimum amount of underlying asset that can be deposited</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="minDepositAmount"
                      name="minDepositAmount"
                      type="number"
                      placeholder="100"
                      value={formData.minDepositAmount || ""}
                      onChange={handleInput}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxDepositAmount" className="flex items-center">
                      Maximum Deposit Amount
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The maximum amount of underlying asset that can be deposited (leave empty for no limit)</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="maxDepositAmount"
                      name="maxDepositAmount"
                      type="number"
                      placeholder="1000000"
                      value={formData.maxDepositAmount || ""}
                      onChange={handleInput}
                    />
                  </div>
                </div>
              </div>

              {/* Fee Configuration */}
              <div>
                <h3 className="text-md font-medium mb-4">Fee Configuration</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Enable Management Fee</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable a management fee on vault assets</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.fee?.enabled || false}
                      onCheckedChange={handleFeeToggle}
                    />
                  </div>

                  {formData.fee?.enabled && (
                    <div className="pl-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="feePercentage" className="flex items-center">
                          Management Fee (% per year)
                          <Tooltip>
                            <TooltipTrigger className="ml-1.5">
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Annual management fee percentage (e.g., 2.0 for 2% per year)</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id="feePercentage"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="2.0"
                          value={formData.fee?.percentage || ""}
                          onChange={handleFeePercentageChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Features */}
              <div>
                <h3 className="text-md font-medium mb-4">Advanced Features</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Pausable</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Allow pausing of all vault operations in case of emergency</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.pausable || false}
                      onCheckedChange={(checked) => handleSwitchChange("pausable", checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Information Section */}
              <div className="p-4 bg-muted/30 rounded-md">
                <h4 className="text-sm font-medium mb-2">About ERC-4626 Vaults</h4>
                <p className="text-xs text-muted-foreground">
                  ERC-4626 is a standard for tokenized vaults that represent shares of a 
                  single underlying ERC-20 token. Users deposit the underlying asset and 
                  receive vault shares in return. This enables yield farming, lending protocols, 
                  and other DeFi strategies with a standardized interface.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
};

export default ERC4626SimpleConfig;
