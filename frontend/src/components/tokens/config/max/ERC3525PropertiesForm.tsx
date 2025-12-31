import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ERC3525PropertiesFormProps {
  config: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSwitchChange: (name: string, checked: boolean) => void;
}

/**
 * ERC-3525 Properties Form Component (CLEANED)
 * 
 * Removed per FORM_UPDATES_REQUIRED.md:
 * - Value computation/oracle fields (8 fields)
 * - Trading/marketplace features (7 fields)
 * - Governance features (6 fields)
 * - DeFi features (7 fields)
 * - Advanced slot management (7 fields)
 * - Compliance duplication (5 fields - kept whitelist_config)
 * 
 * Kept:
 * - Financial instrument configuration (bonds, derivatives)
 * - Basic slot configuration
 * - Core ERC-3525 properties
 * - Compliance features (whitelist_config)
 */
export const ERC3525PropertiesForm: React.FC<ERC3525PropertiesFormProps> = ({
  config,
  handleInputChange,
  handleSelectChange,
  handleSwitchChange,
}) => {
  return (
    <TooltipProvider>
      <div className="space-y-6">
        
        {/* Financial Instrument Configuration - KEPT */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Instrument Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="financialInstrumentType" className="flex items-center">
                Financial Instrument Type
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Type of financial instrument this token represents</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select
                value={config.financialInstrumentType || ""}
                onValueChange={(value) => handleSelectChange("financialInstrumentType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select financial instrument type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bond">Bond</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="certificate_of_deposit">Certificate of Deposit</SelectItem>
                  <SelectItem value="commercial_paper">Commercial Paper</SelectItem>
                  <SelectItem value="structured_product">Structured Product</SelectItem>
                  <SelectItem value="derivative">Derivative</SelectItem>
                  <SelectItem value="fractional_ownership">Fractional Ownership</SelectItem>
                  <SelectItem value="multi_class_share">Multi-Class Share</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bond/Debt Instrument Configuration */}
            {(config.financialInstrumentType === 'bond' || 
              config.financialInstrumentType === 'note' || 
              config.financialInstrumentType === 'certificate_of_deposit') && (
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-muted-foreground">Debt Instrument Details</h5>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="principalAmount">Principal Amount</Label>
                    <Input
                      id="principalAmount"
                      name="principalAmount"
                      placeholder="1000000"
                      value={config.principalAmount || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <Input
                      id="interestRate"
                      name="interestRate"
                      type="number"
                      step="0.01"
                      placeholder="5.25"
                      value={config.interestRate || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maturityDate">Maturity Date</Label>
                    <Input
                      id="maturityDate"
                      name="maturityDate"
                      type="date"
                      value={config.maturityDate || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="couponFrequency">Coupon Frequency</Label>
                    <Select
                      value={config.couponFrequency || ""}
                      onValueChange={(value) => handleSelectChange("couponFrequency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentSchedule">Payment Schedule (JSON)</Label>
                  <Textarea
                    id="paymentSchedule"
                    name="paymentSchedule"
                    placeholder='[{"date": "2025-06-30", "amount": "25000"}]'
                    value={config.paymentSchedule || ""}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="earlyRedemptionEnabled"
                    checked={config.earlyRedemptionEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("earlyRedemptionEnabled", checked)}
                  />
                  <Label htmlFor="earlyRedemptionEnabled" className="cursor-pointer">
                    Early Redemption Enabled
                  </Label>
                </div>

                {config.earlyRedemptionEnabled && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="redemptionPenaltyRate">Redemption Penalty Rate (%)</Label>
                    <Input
                      id="redemptionPenaltyRate"
                      name="redemptionPenaltyRate"
                      type="number"
                      step="0.01"
                      placeholder="2.5"
                      value={config.redemptionPenaltyRate || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Derivative Configuration */}
            {config.financialInstrumentType === 'derivative' && (
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-muted-foreground">Derivative Details</h5>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="derivativeType">Derivative Type</Label>
                    <Select
                      value={config.derivativeType || ""}
                      onValueChange={(value) => handleSelectChange("derivativeType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="option">Option</SelectItem>
                        <SelectItem value="future">Future</SelectItem>
                        <SelectItem value="swap">Swap</SelectItem>
                        <SelectItem value="forward">Forward</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="underlyingAsset">Underlying Asset</Label>
                    <Input
                      id="underlyingAsset"
                      name="underlyingAsset"
                      placeholder="BTC, ETH, AAPL, etc."
                      value={config.underlyingAsset || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="underlyingAssetAddress">Underlying Asset Address</Label>
                    <Input
                      id="underlyingAssetAddress"
                      name="underlyingAssetAddress"
                      placeholder="0x..."
                      value={config.underlyingAssetAddress || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="strikePrice">Strike Price</Label>
                    <Input
                      id="strikePrice"
                      name="strikePrice"
                      type="number"
                      placeholder="50000"
                      value={config.strikePrice || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expirationDate">Expiration Date</Label>
                    <Input
                      id="expirationDate"
                      name="expirationDate"
                      type="date"
                      value={config.expirationDate || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="settlementType">Settlement Type</Label>
                    <Select
                      value={config.settlementType || ""}
                      onValueChange={(value) => handleSelectChange("settlementType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select settlement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Settlement</SelectItem>
                        <SelectItem value="physical">Physical Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marginRequirements">Margin Requirements</Label>
                    <Input
                      id="marginRequirements"
                      name="marginRequirements"
                      placeholder="10000"
                      value={config.marginRequirements || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leverageRatio">Leverage Ratio</Label>
                    <Input
                      id="leverageRatio"
                      name="leverageRatio"
                      type="number"
                      placeholder="10"
                      value={config.leverageRatio || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Slot Configuration - KEPT (simplified) */}
        <Card>
          <CardHeader>
            <CardTitle>Slot Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="slotType">Slot Type</Label>
              <Select
                value={config.slotType || ""}
                onValueChange={(value) => handleSelectChange("slotType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select slot type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maturity">Maturity-Based</SelectItem>
                  <SelectItem value="risk">Risk-Based</SelectItem>
                  <SelectItem value="tranche">Tranche-Based</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="updatableSlots"
                checked={config.updatableSlots || false}
                onCheckedChange={(checked) => handleSwitchChange("updatableSlots", checked)}
              />
              <Label htmlFor="updatableSlots" className="cursor-pointer">
                Updatable Slots
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="mergable"
                checked={config.mergable || false}
                onCheckedChange={(checked) => handleSwitchChange("mergable", checked)}
              />
              <Label htmlFor="mergable" className="cursor-pointer">
                Allow Slot Merging
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="splittable"
                checked={config.splittable || false}
                onCheckedChange={(checked) => handleSwitchChange("splittable", checked)}
              />
              <Label htmlFor="splittable" className="cursor-pointer">
                Allow Slot Splitting
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Core ERC-3525 Features */}
        <Card>
          <CardHeader>
            <CardTitle>ERC-3525 Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="slotApprovals"
                checked={config.slotApprovals || false}
                onCheckedChange={(checked) => handleSwitchChange("slotApprovals", checked)}
              />
              <Label htmlFor="slotApprovals" className="cursor-pointer">
                Slot-Level Approvals (ERC-3525 Extension)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="valueApprovals"
                checked={config.valueApprovals || false}
                onCheckedChange={(checked) => handleSwitchChange("valueApprovals", checked)}
              />
              <Label htmlFor="valueApprovals" className="cursor-pointer">
                Value-Level Approvals
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="allowsSlotEnumeration"
                checked={config.allowsSlotEnumeration || false}
                onCheckedChange={(checked) => handleSwitchChange("allowsSlotEnumeration", checked)}
              />
              <Label htmlFor="allowsSlotEnumeration" className="cursor-pointer">
                Slot Enumeration (ERC-3525 Extension)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Compliance - KEPT per requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance & Restrictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="whitelistConfig">Whitelist Configuration (JSON)</Label>
              <Textarea
                id="whitelistConfig"
                name="whitelistConfig"
                placeholder='{"enabled": true, "addresses": []}'
                value={typeof config.whitelistConfig === 'string' 
                  ? config.whitelistConfig 
                  : JSON.stringify(config.whitelistConfig || {}, null, 2)}
                onChange={handleInputChange}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Configure whitelist settings for compliance (JSONB format)
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </TooltipProvider>
  );
};

export default ERC3525PropertiesForm;
