import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ERC1400AdvancedGovernanceFormProps {
  config: any;
  handleSwitchChange: (name: string, checked: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/**
 * ERC-1400 Advanced Governance Form Component
 * Contains advanced governance features: voting delegation, proxy voting, board elections, etc.
 */
export const ERC1400AdvancedGovernanceForm: React.FC<ERC1400AdvancedGovernanceFormProps> = ({
  config,
  handleSwitchChange,
  handleInputChange,
}) => {
  return (
    <TooltipProvider>
      <Accordion type="multiple" className="space-y-4">
        
        {/* Voting Features */}
        <AccordionItem value="voting">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle>Advanced Voting Features</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Advanced Governance</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable comprehensive governance functionality</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.advancedGovernanceEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange("advancedGovernanceEnabled", checked)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Proxy Voting</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable proxy voting functionality</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.proxyVotingEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("proxyVotingEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Cumulative Voting</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable cumulative voting for elections</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.cumulativeVotingEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("cumulativeVotingEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Weighted Voting by Class</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable different voting weights for different share classes</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.weightedVotingByClass || false}
                      onCheckedChange={(checked) => handleSwitchChange("weightedVotingByClass", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Voting Delegation</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Allow shareholders to delegate their voting rights</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.votingDelegationEnabled || false}
                      onCheckedChange={(checked) => handleSwitchChange("votingDelegationEnabled", checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quorumRequirements" className="flex items-center">
                    Quorum Requirements (JSON)
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Configure quorum requirements for different types of votes</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Textarea
                    id="quorumRequirements"
                    name="quorumRequirements"
                    placeholder='{"general": "50%", "special": "67%", "extraordinary": "75%"}'
                    value={typeof config.quorumRequirements === 'string' 
                      ? config.quorumRequirements 
                      : JSON.stringify(config.quorumRequirements || {}, null, 2)}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Institutional Governance */}
        <AccordionItem value="institutional">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle>Institutional Governance</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Institutional Voting Services</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Integration with institutional voting service providers</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.institutionalVotingServices || false}
                      onCheckedChange={(checked) => handleSwitchChange("institutionalVotingServices", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Board Election Support</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable board of directors election functionality</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={config.boardElectionSupport || false}
                      onCheckedChange={(checked) => handleSwitchChange("boardElectionSupport", checked)}
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

export default ERC1400AdvancedGovernanceForm;
