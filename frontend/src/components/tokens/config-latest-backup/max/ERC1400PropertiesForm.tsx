import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion } from "@/components/ui/accordion";

// Import our new UI components
import { SwitchField, AccordionSection, MultiEntryField, validateCountryCode } from "./ui";

interface ERC1400PropertiesFormProps {
  config: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSwitchChange: (name: string, checked: boolean) => void;
}

/**
 * ERC-1400 Properties Form Component
 * Updated with improved UI components for better spacing and multi-entry fields
 */
export const ERC1400PropertiesForm: React.FC<ERC1400PropertiesFormProps> = ({
  config,
  handleInputChange,
  handleSelectChange,
  handleSwitchChange,
}) => {
  return (
    <TooltipProvider>
      <Accordion type="multiple" className="space-y-4">
        
        {/* Compliance & KYC */}
        <AccordionSection
          value="compliance"
          title="Compliance & KYC"
          badge={{ type: "compliance", text: "Compliance" }}
        >
          <div className="space-y-6">
            <SwitchField
              label="Require KYC"
              description="Enforce Know Your Customer verification for all investors"
              checked={config.requireKyc || config.enforceKyc || false}
              onCheckedChange={(checked) => handleSwitchChange("requireKyc", checked)}
            />

            <SwitchField
              label="Whitelist Enabled"
              description="Only allow transfers to pre-approved addresses"
              checked={config.whitelistEnabled || false}
              onCheckedChange={(checked) => handleSwitchChange("whitelistEnabled", checked)}
            />

            <SwitchField
              label="Investor Accreditation"
              description="Require proof of accredited investor status"
              checked={config.investorAccreditation || config.accreditedInvestorOnly || false}
              onCheckedChange={(checked) => handleSwitchChange("investorAccreditation", checked)}
            />

            <SwitchField
              label="Auto Compliance"
              description="Automatically enforce compliance rules on transfers"
              checked={config.autoCompliance || false}
              onCheckedChange={(checked) => handleSwitchChange("autoCompliance", checked)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="complianceAutomationLevel" className="flex items-center">
                  Automation Level
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Level of compliance automation</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select
                  value={config.complianceAutomationLevel || ""}
                  onValueChange={(value) => handleSelectChange("complianceAutomationLevel", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select automation level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Review</SelectItem>
                    <SelectItem value="semi-automated">Semi-Automated</SelectItem>
                    <SelectItem value="fully-automated">Fully Automated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complianceModule" className="flex items-center">
                  Compliance Module
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">External compliance module address</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="complianceModule"
                  name="complianceModule"
                  placeholder="0x... (optional)"
                  value={config.complianceModule || ""}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <SwitchField
              label="Manual Approvals"
              description="Require manual approval for certain transactions"
              checked={config.manualApprovals || false}
              onCheckedChange={(checked) => handleSwitchChange("manualApprovals", checked)}
            />
          </div>
        </AccordionSection>

        {/* Transfer Restrictions */}
        <AccordionSection
          value="restrictions"
          title="Transfer Restrictions"
          badge={{ type: "compliance", text: "Compliance" }}
        >
          <div className="space-y-6">
            <SwitchField
              label="Transfer Restrictions"
              description="Enable regulatory transfer restrictions"
              checked={config.transferRestrictions || false}
              onCheckedChange={(checked) => handleSwitchChange("transferRestrictions", checked)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="holdingPeriod" className="flex items-center">
                  Holding Period (days)
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Minimum holding period before tokens can be transferred</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="holdingPeriod"
                  name="holdingPeriod"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={config.holdingPeriod || ""}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxInvestorCount" className="flex items-center">
                  Max Investor Count
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Maximum number of token holders allowed</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="maxInvestorCount"
                  name="maxInvestorCount"
                  type="number"
                  min="1"
                  placeholder="499"
                  value={config.maxInvestorCount || ""}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <SwitchField
              label="Geographic Restrictions"
              description="Restrict transfers based on investor location"
              checked={config.useGeographicRestrictions || false}
              onCheckedChange={(checked) => handleSwitchChange("useGeographicRestrictions", checked)}
            />

            {config.useGeographicRestrictions && (
              <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="defaultRestrictionPolicy" className="flex items-center">
                    Default Restriction Policy
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Default policy for handling restricted transfers</p>
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
                      <SelectItem value="reject">Reject Transfer</SelectItem>
                      <SelectItem value="queue">Queue for Review</SelectItem>
                      <SelectItem value="freeze">Freeze Tokens</SelectItem>
                      <SelectItem value="burn">Burn Tokens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <MultiEntryField
                  label="Restricted Country Codes"
                  description="ISO 3166-1 alpha-2 country codes to restrict (e.g., US, CN, RU)"
                  placeholder="US"
                  values={config.geographicRestrictions || []}
                  onValuesChange={(values) => handleSelectChange("geographicRestrictions", JSON.stringify(values))}
                  validation={validateCountryCode}
                  validationError="Please enter a valid 2-letter country code (e.g., US, GB, DE)"
                  maxItems={50}
                />
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Controller Features */}
        <AccordionSection
          value="controllers"
          title="Controller Features"
          badge={{ type: "advanced", text: "Advanced" }}
        >
          <div className="space-y-6">
            <SwitchField
              label="Forced Transfers"
              description="Allow controllers to force transfers for compliance"
              checked={config.forcedTransfers || false}
              onCheckedChange={(checked) => handleSwitchChange("forcedTransfers", checked)}
            />

            <SwitchField
              label="Forced Redemption"
              description="Allow controllers to force redemption of tokens"
              checked={config.forcedRedemptionEnabled || false}
              onCheckedChange={(checked) => handleSwitchChange("forcedRedemptionEnabled", checked)}
            />

            <SwitchField
              label="Granular Control"
              description="Enable granular control features for controllers"
              checked={config.granularControl || false}
              onCheckedChange={(checked) => handleSwitchChange("granularControl", checked)}
            />

            <SwitchField
              label="Recovery Mechanism"
              description="Enable token recovery for lost/stolen wallets"
              checked={config.recoveryMechanism || false}
              onCheckedChange={(checked) => handleSwitchChange("recoveryMechanism", checked)}
            />
          </div>
        </AccordionSection>

        {/* Partition Features */}
        <AccordionSection
          value="partitions"
          title="Partition Features"
          badge={{ type: "enterprise", text: "Enterprise" }}
        >
          <div className="space-y-6">
            <SwitchField
              label="Multi-Class Token"
              description="Enable multiple classes/partitions of tokens"
              checked={config.isMultiClass || false}
              onCheckedChange={(checked) => handleSwitchChange("isMultiClass", checked)}
            />

            <SwitchField
              label="Partition Transferability"
              description="Allow transfers between different partitions"
              checked={config.trancheTransferability || false}
              onCheckedChange={(checked) => handleSwitchChange("trancheTransferability", checked)}
            />
          </div>
        </AccordionSection>

        {/* Corporate Actions */}
        <AccordionSection
          value="corporate"
          title="Corporate Actions"
          badge={{ type: "enterprise", text: "Enterprise" }}
        >
          <div className="space-y-6">
            <SwitchField
              label="Corporate Actions"
              description="Enable corporate action functionality"
              checked={config.corporateActions || false}
              onCheckedChange={(checked) => handleSwitchChange("corporateActions", checked)}
            />

            <SwitchField
              label="Dividend Distribution"
              description="Enable automated dividend distribution"
              checked={config.dividendDistribution || false}
              onCheckedChange={(checked) => handleSwitchChange("dividendDistribution", checked)}
            />
          </div>
        </AccordionSection>

        {/* Document Management */}
        <AccordionSection
          value="documents"
          title="Document Management"
          badge={{ type: "compliance", text: "Compliance" }}
        >
          <div className="space-y-6">
            <SwitchField
              label="Document Management"
              description="Enable on-chain document management"
              checked={config.documentManagement || false}
              onCheckedChange={(checked) => handleSwitchChange("documentManagement", checked)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="documentUri" className="flex items-center">
                  Document URI
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">URI pointing to token documentation</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="documentUri"
                  name="documentUri"
                  placeholder="https://... or ipfs://..."
                  value={config.documentUri || ""}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentHash" className="flex items-center">
                  Document Hash
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">SHA-256 hash of the document for integrity</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="documentHash"
                  name="documentHash"
                  placeholder="SHA-256 hash (optional)"
                  value={config.documentHash || ""}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalTerms" className="flex items-center">
                Legal Terms
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Legal terms and conditions for the security</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Textarea
                id="legalTerms"
                name="legalTerms"
                placeholder="Legal terms and conditions..."
                value={config.legalTerms || ""}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prospectus" className="flex items-center">
                Prospectus
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Investment prospectus information</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Textarea
                id="prospectus"
                name="prospectus"
                placeholder="Prospectus information..."
                value={config.prospectus || ""}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </div>
        </AccordionSection>

      </Accordion>
    </TooltipProvider>
  );
};

export default ERC1400PropertiesForm;
