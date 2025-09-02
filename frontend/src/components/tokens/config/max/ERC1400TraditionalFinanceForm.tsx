import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ERC1400TraditionalFinanceFormProps {
  config: any;
  handleSwitchChange: (name: string, checked: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/**
 * ERC-1400 Traditional Finance Integration Form Component
 * Contains traditional finance system integration features: SWIFT, ISO20022, market data feeds
 */
export const ERC1400TraditionalFinanceForm: React.FC<ERC1400TraditionalFinanceFormProps> = ({
  config,
  handleSwitchChange,
  handleInputChange,
}) => {
  return (
    <TooltipProvider>
      <Accordion type="multiple" className="space-y-4">
        
        {/* Legacy System Integration */}
        <AccordionItem value="legacy">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle>Legacy System Integration</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Traditional Finance Integration</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable integration with traditional financial systems</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.traditionalFinanceIntegration || false}
                    onCheckedChange={(checked) => handleSwitchChange("traditionalFinanceIntegration", checked)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">SWIFT Integration</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable SWIFT network messaging integration</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.swiftIntegrationEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("swiftIntegrationEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">ISO 20022 Messaging</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Support ISO 20022 financial messaging standard</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.iso20022MessagingSupport || false}
                      onCheckedChange={(checked) => handleSwitchChange("iso20022MessagingSupport", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Financial Data Vendor Integration</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Integrate with Bloomberg, Reuters, and other data vendors</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.financialDataVendorIntegration || false}
                      onCheckedChange={(checked) => handleSwitchChange("financialDataVendorIntegration", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Market Data Feeds</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable real-time market data feed integration</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.marketDataFeedsEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("marketDataFeedsEnabled", checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priceDiscoveryMechanisms" className="flex items-center">
                    Price Discovery Mechanisms (JSON)
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Configure price discovery mechanisms and data sources</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Textarea
                    id="priceDiscoveryMechanisms"
                    name="priceDiscoveryMechanisms"
                    placeholder='{"primary": "bloomberg", "fallback": ["reuters", "internal"], "updateFrequency": "1min"}'
                    value={typeof config.priceDiscoveryMechanisms === 'string' 
                      ? config.priceDiscoveryMechanisms 
                      : JSON.stringify(config.priceDiscoveryMechanisms || {}, null, 2)}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Institutional Infrastructure */}
        <AccordionItem value="institutional">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle>Institutional Infrastructure</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Institutional Grade</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable institutional-grade features and compliance</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.institutionalGrade || false}
                      onCheckedChange={(checked) => handleSwitchChange("institutionalGrade", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Custody Integration</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable integration with institutional custody providers</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.custodyIntegrationEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("custodyIntegrationEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Prime Brokerage Support</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Support prime brokerage services integration</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.primeBrokerageSupport || false}
                      onCheckedChange={(checked) => handleSwitchChange("primeBrokerageSupport", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Clearing House Integration</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable clearing house integration for settlement</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.clearingHouseIntegration || false}
                      onCheckedChange={(checked) => handleSwitchChange("clearingHouseIntegration", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Central Securities Depository</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Integrate with Central Securities Depositories</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.centralSecuritiesDepositoryIntegration || false}
                      onCheckedChange={(checked) => handleSwitchChange("centralSecuritiesDepositoryIntegration", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Institutional Wallet Support</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Support institutional-grade wallet solutions</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.institutionalWalletSupport || false}
                      onCheckedChange={(checked) => handleSwitchChange("institutionalWalletSupport", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Blockchain Infrastructure */}
        <AccordionItem value="blockchain">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle>Blockchain Infrastructure</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Cross-chain Bridge Support</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable cross-chain bridge functionality</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.crossChainBridgeSupport || false}
                      onCheckedChange={(checked) => handleSwitchChange("crossChainBridgeSupport", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Layer 2 Scaling Support</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Support Layer 2 scaling solutions</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.layer2ScalingSupport || false}
                      onCheckedChange={(checked) => handleSwitchChange("layer2ScalingSupport", checked)}
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

export default ERC1400TraditionalFinanceForm;
