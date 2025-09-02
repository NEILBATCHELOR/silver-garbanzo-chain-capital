import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ERC1400CrossBorderTradingFormProps {
  config: any;
  handleSwitchChange: (name: string, checked: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/**
 * ERC-1400 Cross-border Trading Form Component
 * Contains international trading features: multi-jurisdiction compliance, treaty benefits, currency hedging
 */
export const ERC1400CrossBorderTradingForm: React.FC<ERC1400CrossBorderTradingFormProps> = ({
  config,
  handleSwitchChange,
  handleInputChange,
}) => {
  return (
    <TooltipProvider>
      <Accordion type="multiple" className="space-y-4">
        
        {/* International Trading */}
        <AccordionItem value="international">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle>International Trading</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Cross-border Trading</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable trading across international borders</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.crossBorderTradingEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("crossBorderTradingEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Multi-jurisdiction Compliance</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Support compliance across multiple jurisdictions</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.multiJurisdictionCompliance || false}
                      onCheckedChange={(checked) => handleSwitchChange("multiJurisdictionCompliance", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Passport Regime Support</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Support EU/ASEAN financial passport regimes</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.passportRegimeSupport || false}
                      onCheckedChange={(checked) => handleSwitchChange("passportRegimeSupport", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Treaty Benefits</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable tax treaty benefit processing</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.treatyBenefitsEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("treatyBenefitsEnabled", checked)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="foreignOwnershipRestrictions" className="flex items-center">
                      Foreign Ownership Restrictions (JSON)
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Configure foreign ownership restrictions by country</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Textarea
                      id="foreignOwnershipRestrictions"
                      name="foreignOwnershipRestrictions"
                      placeholder='{"maxForeignOwnership": "49%", "restrictedCountries": ["XX", "YY"]}'
                      value={typeof config.foreignOwnershipRestrictions === 'string' 
                        ? config.foreignOwnershipRestrictions 
                        : JSON.stringify(config.foreignOwnershipRestrictions || {}, null, 2)}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regulatoryEquivalenceMapping" className="flex items-center">
                      Regulatory Equivalence Mapping (JSON)
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Map equivalent regulatory frameworks across jurisdictions</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Textarea
                      id="regulatoryEquivalenceMapping"
                      name="regulatoryEquivalenceMapping"
                      placeholder='{"US_RegD": ["EU_PP", "UK_PP"], "EU_MiFID": ["US_QIB"]}'
                      value={typeof config.regulatoryEquivalenceMapping === 'string' 
                        ? config.regulatoryEquivalenceMapping 
                        : JSON.stringify(config.regulatoryEquivalenceMapping || {}, null, 2)}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Tax & Currency Management */}
        <AccordionItem value="tax-currency">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle>Tax & Currency Management</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Withholding Tax Automation</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Automate withholding tax calculations and payments</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.withholdingTaxAutomation || false}
                      onCheckedChange={(checked) => handleSwitchChange("withholdingTaxAutomation", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Currency Hedging</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable currency hedging for international exposures</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.currencyHedgingEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("currencyHedgingEnabled", checked)}
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

export default ERC1400CrossBorderTradingForm;
