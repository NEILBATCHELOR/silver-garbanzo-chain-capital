import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ERC1400RiskManagementFormProps {
  config: any;
  handleSwitchChange: (name: string, checked: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/**
 * ERC-1400 Advanced Risk Management Form Component
 * Contains advanced risk management features: position limits, stress testing, collateral management
 */
export const ERC1400RiskManagementForm: React.FC<ERC1400RiskManagementFormProps> = ({
  config,
  handleSwitchChange,
  handleInputChange,
}) => {
  return (
    <TooltipProvider>
      <Accordion type="multiple" className="space-y-4">
        
        {/* Risk Controls */}
        <AccordionItem value="controls">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle>Risk Controls</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Advanced Risk Management</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable comprehensive risk management functionality</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.advancedRiskManagement || false}
                    onCheckedChange={(checked) => handleSwitchChange("advancedRiskManagement", checked)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Position Limits</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable position limit enforcement</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.positionLimitsEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("positionLimitsEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Stress Testing</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable stress testing functionality</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.stressTestingEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("stressTestingEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Dynamic Margin Requirements</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable dynamic margin requirement adjustments</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.marginRequirementsDynamic || false}
                      onCheckedChange={(checked) => handleSwitchChange("marginRequirementsDynamic", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Collateral Management</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable collateral management functionality</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.collateralManagementEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("collateralManagementEnabled", checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concentrationLimits" className="flex items-center">
                    Concentration Limits (JSON)
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Configure concentration limits for risk management</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Textarea
                    id="concentrationLimits"
                    name="concentrationLimits"
                    placeholder='{"singleInvestor": "10%", "singleSector": "25%", "geography": "30%"}'
                    value={typeof config.concentrationLimits === 'string' 
                      ? config.concentrationLimits 
                      : JSON.stringify(config.concentrationLimits || {}, null, 2)}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Insurance & Disaster Recovery */}
        <AccordionItem value="protection">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle>Insurance & Disaster Recovery</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Insurance Coverage</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable insurance coverage for token holders</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.insuranceCoverageEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("insuranceCoverageEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Disaster Recovery</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable disaster recovery and business continuity planning</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.disasterRecoveryEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("disasterRecoveryEnabled", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

      </Accordion>
    </TooltipProvider>
  );
};

export default ERC1400RiskManagementForm;
