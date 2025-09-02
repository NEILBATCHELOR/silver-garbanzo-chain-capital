import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ERC1400BaseFormProps {
  config: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSwitchChange: (name: string, checked: boolean) => void;
}

/**
 * ERC-1400 Base Form Component
 * Contains common token fields shared across all security token configurations
 */
export const ERC1400BaseForm: React.FC<ERC1400BaseFormProps> = ({
  config,
  handleInputChange,
  handleSelectChange,
  handleSwitchChange,
}) => {
  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>Security Token Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Token Information */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center">
                Token Name *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Full name of the security token</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Corporate Bond Series A"
                value={config.name || ""}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol" className="flex items-center">
                Token Symbol *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Ticker symbol for the security token</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="symbol"
                name="symbol"
                placeholder="CBSA"
                value={config.symbol || ""}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenDetails" className="flex items-center">
              Token Description
              <Tooltip>
                <TooltipTrigger className="ml-1.5">
                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Detailed description of the security token</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Textarea
              id="tokenDetails"
              name="tokenDetails"
              placeholder="Description of the security token, its purpose, and key features"
              value={config.tokenDetails || ""}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          {/* Supply Configuration */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="decimals" className="flex items-center">
                Decimals *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Number of decimal places (0-18)</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="decimals"
                name="decimals"
                type="number"
                min="0"
                max="18"
                placeholder="18"
                value={config.decimals || 18}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="initialSupply" className="flex items-center">
                Initial Supply *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Number of tokens to mint initially</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="initialSupply"
                name="initialSupply"
                placeholder="1000000"
                value={config.initialSupply || ""}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cap" className="flex items-center">
                Supply Cap
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Maximum total supply (optional)</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="cap"
                name="cap"
                placeholder="Optional maximum supply"
                value={config.cap || ""}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Security Type Configuration */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="securityType" className="flex items-center">
                Security Type *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Type of security being tokenized</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select
                value={config.securityType || ""}
                onValueChange={(value) => handleSelectChange("securityType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select security type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="debt">Debt</SelectItem>
                  <SelectItem value="derivative">Derivative</SelectItem>
                  <SelectItem value="fund">Fund</SelectItem>
                  <SelectItem value="commodity">Commodity</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regulationType" className="flex items-center">
                Regulation Type
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Regulatory framework under which the token is issued</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select
                value={config.regulationType || ""}
                onValueChange={(value) => handleSelectChange("regulationType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select regulation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reg-d">Regulation D</SelectItem>
                  <SelectItem value="reg-a-plus">Regulation A+</SelectItem>
                  <SelectItem value="reg-s">Regulation S</SelectItem>
                  <SelectItem value="reg-cf">Regulation CF</SelectItem>
                  <SelectItem value="public">Public Offering</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Issuing Entity Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Issuing Entity</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="issuingEntityName" className="flex items-center">
                  Entity Name *
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Legal name of the issuing entity</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="issuingEntityName"
                  name="issuingEntityName"
                  placeholder="Acme Corporation Ltd."
                  value={config.issuingEntityName || ""}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issuingJurisdiction" className="flex items-center">
                  Jurisdiction *
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Country/state where the entity is incorporated</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="issuingJurisdiction"
                  name="issuingJurisdiction"
                  placeholder="Delaware, USA"
                  value={config.issuingJurisdiction || ""}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issuingEntityLei" className="flex items-center">
                Legal Entity Identifier (LEI)
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">20-character LEI code if available</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="issuingEntityLei"
                name="issuingEntityLei"
                placeholder="549300XXXXXXXXXXXXXX"
                value={config.issuingEntityLei || ""}
                onChange={handleInputChange}
                maxLength={20}
              />
            </div>
          </div>

          {/* Basic Token Features */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Basic Features</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Mintable</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Allow issuing additional tokens after deployment</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.isMintable || false}
                  onCheckedChange={(checked) => handleSwitchChange("isMintable", checked)}
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
                      <p className="max-w-xs">Allow burning/destroying tokens to reduce supply</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.isBurnable || false}
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
                      <p className="max-w-xs">Allow pausing all token transfers in emergencies</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.isPausable || false}
                  onCheckedChange={(checked) => handleSwitchChange("isPausable", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Issuable</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Enable controlled issuance by authorized controllers</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.isIssuable || false}
                  onCheckedChange={(checked) => handleSwitchChange("isIssuable", checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC1400BaseForm;
