import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ERC3525PropertiesFormProps {
  config: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSwitchChange: (name: string, checked: boolean) => void;
}

/**
 * ERC-3525 Properties Form Component
 * Contains advanced configuration properties for semi-fungible tokens
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
        {/* Financial Instrument Configuration */}
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

            {(config.financialInstrumentType === 'bond' || config.financialInstrumentType === 'note' || config.financialInstrumentType === 'certificate_of_deposit') && (
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-muted-foreground">Debt Instrument Details</h5>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="principalAmount" className="flex items-center">
                      Principal Amount
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Principal amount of the debt instrument</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="principalAmount"
                      name="principalAmount"
                      placeholder="1000000"
                      value={config.principalAmount || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interestRate" className="flex items-center">
                      Interest Rate (%)
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Annual interest rate percentage</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
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
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maturityDate" className="flex items-center">
                      Maturity Date
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Date when the instrument matures</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="maturityDate"
                      name="maturityDate"
                      type="datetime-local"
                      value={config.maturityDate || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="couponFrequency" className="flex items-center">
                      Coupon Frequency
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Frequency of coupon payments</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
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
                        <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="at_maturity">At Maturity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Early Redemption Enabled</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Allow early redemption before maturity</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.earlyRedemptionEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("earlyRedemptionEnabled", checked)}
                    />
                  </div>

                  {config.earlyRedemptionEnabled && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="redemptionPenaltyRate" className="flex items-center">
                        Redemption Penalty Rate (%)
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Penalty rate for early redemption</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="redemptionPenaltyRate"
                        name="redemptionPenaltyRate"
                        type="number"
                        step="0.01"
                        placeholder="2.0"
                        value={config.redemptionPenaltyRate || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {config.financialInstrumentType === 'derivative' && (
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-muted-foreground">Derivative Details</h5>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="derivativeType" className="flex items-center">
                      Derivative Type
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Type of derivative instrument</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select
                      value={config.derivativeType || ""}
                      onValueChange={(value) => handleSelectChange("derivativeType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select derivative type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="option">Option</SelectItem>
                        <SelectItem value="future">Future</SelectItem>
                        <SelectItem value="forward">Forward</SelectItem>
                        <SelectItem value="swap">Swap</SelectItem>
                        <SelectItem value="credit_default_swap">Credit Default Swap</SelectItem>
                        <SelectItem value="synthetic">Synthetic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="underlyingAsset" className="flex items-center">
                      Underlying Asset
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Name or symbol of the underlying asset</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="underlyingAsset"
                      name="underlyingAsset"
                      placeholder="BTC, ETH, AAPL, etc."
                      value={config.underlyingAsset || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="underlyingAssetAddress" className="flex items-center">
                      Underlying Asset Address
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Contract address of the underlying asset (if applicable)</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="underlyingAssetAddress"
                      name="underlyingAssetAddress"
                      placeholder="0x..."
                      value={config.underlyingAssetAddress || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="strikePrice" className="flex items-center">
                      Strike Price
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Strike price for options or target price for other derivatives</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="strikePrice"
                      name="strikePrice"
                      placeholder="50000"
                      value={config.strikePrice || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expirationDate" className="flex items-center">
                      Expiration Date
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Date when the derivative expires</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="expirationDate"
                      name="expirationDate"
                      type="datetime-local"
                      value={config.expirationDate || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="settlementType" className="flex items-center">
                      Settlement Type
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">How the derivative is settled</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select
                      value={config.settlementType || ""}
                      onValueChange={(value) => handleSelectChange("settlementType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select settlement type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Settlement</SelectItem>
                        <SelectItem value="physical">Physical Settlement</SelectItem>
                        <SelectItem value="token">Token Settlement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leverageRatio" className="flex items-center">
                    Leverage Ratio
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Leverage ratio for the derivative (e.g., 10:1)</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="leverageRatio"
                    name="leverageRatio"
                    placeholder="10:1"
                    value={config.leverageRatio || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slot Management Features */}
        <Card>
          <CardHeader>
            <CardTitle>Slot Management Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Slot Creation Enabled</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Allow new slots to be created after deployment</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.slotCreationEnabled || false}
                  onCheckedChange={(checked) => handleSwitchChange("slotCreationEnabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Dynamic Slot Creation</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Allow automatic creation of slots based on demand</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.dynamicSlotCreation || false}
                  onCheckedChange={(checked) => handleSwitchChange("dynamicSlotCreation", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Slot Freeze Enabled</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Allow freezing of individual slots</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.slotFreezeEnabled || false}
                  onCheckedChange={(checked) => handleSwitchChange("slotFreezeEnabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Slot Merge Enabled</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Allow merging of compatible slots</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.slotMergeEnabled || false}
                  onCheckedChange={(checked) => handleSwitchChange("slotMergeEnabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Slot Split Enabled</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Allow splitting of slots into multiple slots</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.slotSplitEnabled || false}
                  onCheckedChange={(checked) => handleSwitchChange("slotSplitEnabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Cross-Slot Transfers</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Allow value transfers between different slots</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.crossSlotTransfers || false}
                  onCheckedChange={(checked) => handleSwitchChange("crossSlotTransfers", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Features Accordion */}
        <Accordion type="multiple" className="w-full">
          {/* Value Computation */}
          <AccordionItem value="value-computation">
            <AccordionTrigger>Value Computation & Oracles</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="valueComputationMethod" className="flex items-center">
                    Value Computation Method
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Method used to compute token values</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={config.valueComputationMethod || ""}
                    onValueChange={(value) => handleSelectChange("valueComputationMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select computation method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Value</SelectItem>
                      <SelectItem value="oracle">Oracle-based</SelectItem>
                      <SelectItem value="formula">Formula-based</SelectItem>
                      <SelectItem value="market">Market-driven</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valueOracleAddress" className="flex items-center">
                    Value Oracle Address
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Address of the oracle providing value data</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="valueOracleAddress"
                    name="valueOracleAddress"
                    placeholder="0x..."
                    value={config.valueOracleAddress || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valueCalculationFormula" className="flex items-center">
                  Value Calculation Formula
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Formula used for value calculations (if applicable)</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Textarea
                  id="valueCalculationFormula"
                  name="valueCalculationFormula"
                  placeholder="e.g., principalAmount * (1 + interestRate * timeElapsed)"
                  value={config.valueCalculationFormula || ""}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Accrual Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable automatic value accrual over time</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.accrualEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("accrualEnabled", checked)}
                  />
                </div>

                {config.accrualEnabled && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 ml-6">
                    <div className="space-y-2">
                      <Label htmlFor="accrualRate" className="flex items-center">
                        Accrual Rate (%)
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Rate at which value accrues over time</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="accrualRate"
                        name="accrualRate"
                        type="number"
                        step="0.01"
                        placeholder="5.0"
                        value={config.accrualRate || ""}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accrualFrequency" className="flex items-center">
                        Accrual Frequency
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Frequency of value accrual</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select
                        value={config.accrualFrequency || ""}
                        onValueChange={(value) => handleSelectChange("accrualFrequency", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="continuous">Continuous</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Value Adjustment Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Allow manual adjustments to token values</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.valueAdjustmentEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("valueAdjustmentEnabled", checked)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Trading & Marketplace */}
          <AccordionItem value="trading-marketplace">
            <AccordionTrigger>Trading & Marketplace</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Slot Marketplace Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable marketplace trading for entire slots</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.slotMarketplaceEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("slotMarketplaceEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Value Marketplace Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable marketplace trading for partial values</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.valueMarketplaceEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("valueMarketplaceEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Partial Value Trading</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Allow trading of partial token values</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.partialValueTrading || false}
                    onCheckedChange={(checked) => handleSwitchChange("partialValueTrading", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Market Maker Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable automated market maker functionality</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.marketMakerEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("marketMakerEnabled", checked)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="minimumTradeValue" className="flex items-center">
                    Minimum Trade Value
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Minimum value for trading transactions</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="minimumTradeValue"
                    name="minimumTradeValue"
                    placeholder="100"
                    value={config.minimumTradeValue || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tradingFeePercentage" className="flex items-center">
                    Trading Fee (%)
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Percentage fee charged on trades</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="tradingFeePercentage"
                    name="tradingFeePercentage"
                    type="number"
                    step="0.01"
                    placeholder="0.5"
                    value={config.tradingFeePercentage || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Trading Fees Enabled</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Enable trading fees on marketplace transactions</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.tradingFeesEnabled || false}
                  onCheckedChange={(checked) => handleSwitchChange("tradingFeesEnabled", checked)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Governance Features */}
          <AccordionItem value="governance">
            <AccordionTrigger>Governance Features</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Slot Voting Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable voting rights based on slot ownership</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.slotVotingEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("slotVotingEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Value Weighted Voting</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Weight voting power by token value</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.valueWeightedVoting || false}
                    onCheckedChange={(checked) => handleSwitchChange("valueWeightedVoting", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Delegate Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Allow delegation of voting power</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.delegateEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("delegateEnabled", checked)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="votingPowerCalculation" className="flex items-center">
                    Voting Power Calculation
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Method for calculating voting power</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={config.votingPowerCalculation || ""}
                    onValueChange={(value) => handleSelectChange("votingPowerCalculation", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select calculation method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear by Value</SelectItem>
                      <SelectItem value="logarithmic">Logarithmic</SelectItem>
                      <SelectItem value="equal">Equal per Token</SelectItem>
                      <SelectItem value="slot_based">Slot-based</SelectItem>
                      <SelectItem value="custom">Custom Formula</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quorumCalculationMethod" className="flex items-center">
                    Quorum Calculation
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Method for calculating voting quorum</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={config.quorumCalculationMethod || ""}
                    onValueChange={(value) => handleSelectChange("quorumCalculationMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quorum method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage of Total</SelectItem>
                      <SelectItem value="absolute">Absolute Value</SelectItem>
                      <SelectItem value="slot_majority">Slot Majority</SelectItem>
                      <SelectItem value="adaptive">Adaptive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proposalValueThreshold" className="flex items-center">
                  Proposal Value Threshold
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Minimum value required to create proposals</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="proposalValueThreshold"
                  name="proposalValueThreshold"
                  placeholder="10000"
                  value={config.proposalValueThreshold || ""}
                  onChange={handleInputChange}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* DeFi Features */}
          <AccordionItem value="defi">
            <AccordionTrigger>DeFi Integration</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Yield Farming Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable yield farming functionality</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.yieldFarmingEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("yieldFarmingEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Liquidity Provision Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable liquidity provision features</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.liquidityProvisionEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("liquidityProvisionEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Compound Interest Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable compound interest calculations</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.compoundInterestEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("compoundInterestEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Flash Loan Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable flash loan functionality</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.flashLoanEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("flashLoanEnabled", checked)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stakingYieldRate" className="flex items-center">
                    Staking Yield Rate (%)
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Annual yield rate for staking</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="stakingYieldRate"
                    name="stakingYieldRate"
                    type="number"
                    step="0.01"
                    placeholder="8.5"
                    value={config.stakingYieldRate || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collateralFactor" className="flex items-center">
                    Collateral Factor
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Collateral factor for lending protocols</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="collateralFactor"
                    name="collateralFactor"
                    placeholder="0.75"
                    value={config.collateralFactor || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="liquidationThreshold" className="flex items-center">
                  Liquidation Threshold
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Threshold for position liquidation</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="liquidationThreshold"
                  name="liquidationThreshold"
                  placeholder="0.85"
                  value={config.liquidationThreshold || ""}
                  onChange={handleInputChange}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Compliance & Enterprise */}
          <AccordionItem value="compliance">
            <AccordionTrigger>Compliance & Enterprise</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Regulatory Compliance Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable regulatory compliance features</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.regulatoryComplianceEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("regulatoryComplianceEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">KYC Required</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Require KYC verification for token holders</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.kycRequired || false}
                    onCheckedChange={(checked) => handleSwitchChange("kycRequired", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Accredited Investor Only</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Restrict ownership to accredited investors</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.accreditedInvestorOnly || false}
                    onCheckedChange={(checked) => handleSwitchChange("accreditedInvestorOnly", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Multi-Signature Required</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Require multi-signature for critical operations</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.multiSignatureRequired || false}
                    onCheckedChange={(checked) => handleSwitchChange("multiSignatureRequired", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Institutional Custody Support</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable institutional custody features</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.institutionalCustodySupport || false}
                    onCheckedChange={(checked) => handleSwitchChange("institutionalCustodySupport", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Enhanced Audit Trail</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable comprehensive audit trail logging</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.auditTrailEnhanced || false}
                    onCheckedChange={(checked) => handleSwitchChange("auditTrailEnhanced", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Emergency Pause Enabled</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable emergency pause functionality</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.emergencyPauseEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("emergencyPauseEnabled", checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="holdingPeriodRestrictions" className="flex items-center">
                  Holding Period Restrictions (days)
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Minimum holding period before transfers are allowed</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="holdingPeriodRestrictions"
                  name="holdingPeriodRestrictions"
                  type="number"
                  placeholder="90"
                  value={config.holdingPeriodRestrictions || ""}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Use Geographic Restrictions</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable geographic restrictions on token ownership</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.useGeographicRestrictions || false}
                    onCheckedChange={(checked) => handleSwitchChange("useGeographicRestrictions", checked)}
                  />
                </div>

                {config.useGeographicRestrictions && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="defaultRestrictionPolicy" className="flex items-center">
                      Default Restriction Policy
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Default policy for geographic restrictions</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select
                      value={config.defaultRestrictionPolicy || ""}
                      onValueChange={(value) => handleSelectChange("defaultRestrictionPolicy", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blocked">Blocked by Default</SelectItem>
                        <SelectItem value="allowed">Allowed by Default</SelectItem>
                        <SelectItem value="whitelist">Whitelist Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </TooltipProvider>
  );
};

export default ERC3525PropertiesForm;
