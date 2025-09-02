import React from "react";
import { Label } from "@/components/ui/label";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Accordion } from "@/components/ui/accordion";

// Import our new UI components
import { SwitchField, AccordionSection } from "./ui";

interface ERC1400EnhancedComplianceFormProps {
  config: any;
  handleSwitchChange: (name: string, checked: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/**
 * ERC-1400 Enhanced Compliance Form Component
 * Updated with improved UI components for better spacing and visual hierarchy
 */
export const ERC1400EnhancedComplianceForm: React.FC<ERC1400EnhancedComplianceFormProps> = ({
  config,
  handleSwitchChange,
  handleInputChange,
}) => {
  return (
    <TooltipProvider>
      <Accordion type="multiple" className="space-y-4">
        
        {/* Real-time Compliance Monitoring */}
        <AccordionSection
          value="monitoring"
          title="Real-time Compliance Monitoring"
          badge={{ type: "compliance", text: "Compliance" }}
        >
          <div className="space-y-6">
            <SwitchField
              label="Real-time Monitoring"
              description="Enable real-time compliance monitoring for all transactions"
              checked={config.realTimeComplianceMonitoring || false}
              onCheckedChange={(checked) => handleSwitchChange("realTimeComplianceMonitoring", checked)}
            />

            <SwitchField
              label="Compliance Officer Notifications"
              description="Send notifications to compliance officers for flagged activities"
              checked={config.complianceOfficerNotifications || false}
              onCheckedChange={(checked) => handleSwitchChange("complianceOfficerNotifications", checked)}
            />

            <SwitchField
              label="Regulatory Reporting Automation"
              description="Automatically generate and submit regulatory reports"
              checked={config.regulatoryReportingAutomation || false}
              onCheckedChange={(checked) => handleSwitchChange("regulatoryReportingAutomation", checked)}
            />

            <SwitchField
              label="Suspicious Activity Reporting"
              description="Automatically detect and report suspicious activities"
              checked={config.suspiciousActivityReporting || false}
              onCheckedChange={(checked) => handleSwitchChange("suspiciousActivityReporting", checked)}
            />

            <div className="space-y-2">
              <Label htmlFor="transactionMonitoringRules" className="flex items-center">
                Transaction Monitoring Rules (JSON)
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Configure transaction monitoring rules in JSON format</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Textarea
                id="transactionMonitoringRules"
                name="transactionMonitoringRules"
                placeholder='{"maxTransactionAmount": 100000, "dailyTransactionLimit": 500000}'
                value={typeof config.transactionMonitoringRules === 'string' 
                  ? config.transactionMonitoringRules 
                  : JSON.stringify(config.transactionMonitoringRules || {}, null, 2)}
                onChange={handleInputChange}
                rows={4}
              />
            </div>
          </div>
        </AccordionSection>

        {/* AML & Sanctions Screening */}
        <AccordionSection
          value="aml"
          title="AML & Sanctions Screening"
          badge={{ type: "compliance", text: "Compliance" }}
        >
          <div className="space-y-6">
            <SwitchField
              label="AML Monitoring"
              description="Enable Anti-Money Laundering monitoring"
              checked={config.amlMonitoringEnabled || false}
              onCheckedChange={(checked) => handleSwitchChange("amlMonitoringEnabled", checked)}
            />

            <SwitchField
              label="Automated Sanctions Screening"
              description="Automatically screen against sanctions lists"
              checked={config.automatedSanctionsScreening || false}
              onCheckedChange={(checked) => handleSwitchChange("automatedSanctionsScreening", checked)}
            />

            <SwitchField
              label="PEP Screening"
              description="Screen for Politically Exposed Persons"
              checked={config.pepScreeningEnabled || false}
              onCheckedChange={(checked) => handleSwitchChange("pepScreeningEnabled", checked)}
            />
          </div>
        </AccordionSection>

      </Accordion>
    </TooltipProvider>
  );
};

export default ERC1400EnhancedComplianceForm;
