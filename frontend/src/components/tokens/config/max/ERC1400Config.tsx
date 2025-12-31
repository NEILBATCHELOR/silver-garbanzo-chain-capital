import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import sub-forms (CLEANED - removed institutional/enterprise forms)
import ERC1400BaseForm from "./ERC1400BaseForm";
import ERC1400PropertiesForm from "./ERC1400PropertiesForm";
import ERC1400PartitionsForm from "./ERC1400PartitionsForm";
import ERC1400ControllersForm from "./ERC1400ControllersForm";
import ERC1400DocumentsForm from "./ERC1400DocumentsForm"; // ERC-1643
import ERC1400CorporateActionsManagementForm from "./ERC1400CorporateActionsManagementForm"; // Basic corporate actions
import ERC1400CustodyProvidersForm from "./ERC1400CustodyProvidersForm";
import ERC1400RegulatoryFilingsForm from "./ERC1400RegulatoryFilingsForm";
import ERC1400PartitionOperatorsForm from "./ERC1400PartitionOperatorsForm";

// REMOVED per FORM_UPDATES_REQUIRED.md:
// - ERC1400EnhancedComplianceForm (excessive monitoring)
// - ERC1400AdvancedCorporateActionsForm (platform features)
// - ERC1400AdvancedGovernanceForm (over-specific)
// - ERC1400CrossBorderTradingForm (operational config)
// - ERC1400EnhancedReportingForm (analytics platform)
// - ERC1400TraditionalFinanceForm (external integration)
// - ERC1400RiskManagementForm (risk platform)

interface ERC1400ConfigProps {
  tokenForm: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setTokenForm: (form: any) => void;
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
}

interface ERC1400Document {
  id?: string;
  name: string;
  documentUri: string;
  documentType: string;
  documentHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CorporateAction {
  id?: string;
  actionType: string;
  announcementDate: string;
  recordDate?: string;
  effectiveDate?: string;
  paymentDate?: string;
  actionDetails: any;
  status: string;
}

interface CustodyProvider {
  id?: string;
  providerName: string;
  providerType: string;
  providerAddress?: string;
  isActive: boolean;
  jurisdiction?: string;
}

interface RegulatoryFiling {
  id?: string;
  filingType: string;
  filingDate: string;
  filingJurisdiction: string;
  filingReference?: string;
  documentHash?: string;
  documentUri?: string;
  complianceStatus: string;
}

interface PartitionOperator {
  id?: string;
  partitionId: string;
  holderAddress: string;
  operatorAddress: string;
  authorized: boolean;
  lastUpdated?: string;
}

interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  tab: string;
}

/**
 * ERC-1400 Configuration Component (CLEANED)
 * 
 * Security token configuration with core compliance features
 * Removed institutional platform features per FORM_UPDATES_REQUIRED.md
 */
const ERC1400Config: React.FC<ERC1400ConfigProps> = ({
  tokenForm,
  handleInputChange,
  setTokenForm,
  onConfigChange,
  initialConfig = {}
}) => {
  // Internal state for configuration
  const [config, setConfig] = useState({
    // Base token fields
    name: initialConfig.name || "",
    symbol: initialConfig.symbol || "",
    decimals: initialConfig.decimals ?? 18,
    initialSupply: initialConfig.initialSupply || "",
    cap: initialConfig.cap || "",
    tokenDetails: initialConfig.tokenDetails || "",
    securityType: initialConfig.securityType || "",
    regulationType: initialConfig.regulationType || "",
    issuingEntityName: initialConfig.issuingEntityName || "",
    issuingJurisdiction: initialConfig.issuingJurisdiction || "",
    issuingEntityLei: initialConfig.issuingEntityLei || "",
    
    // Basic features
    isMintable: initialConfig.isMintable ?? true,
    isBurnable: initialConfig.isBurnable ?? false,
    isPausable: initialConfig.isPausable ?? true,
    isIssuable: initialConfig.isIssuable ?? true,
    
    // Compliance features - KEPT
    requireKyc: (initialConfig.requireKyc || initialConfig.enforceKyc) ?? true,
    whitelistEnabled: initialConfig.whitelistEnabled ?? true,
    investorWhitelistEnabled: initialConfig.investorWhitelistEnabled ?? true,
    accreditedInvestorOnly: initialConfig.accreditedInvestorOnly ?? false,
    
    // Transfer restrictions
    holdingPeriod: initialConfig.holdingPeriod || "",
    maxInvestorCount: initialConfig.maxInvestorCount || "",
    maxSharesPerInvestor: initialConfig.maxSharesPerInvestor || "",
    
    // Compliance module
    complianceModule: initialConfig.complianceModule || "",
    
    // Partition system (ERC-1410)
    isMultiClass: initialConfig.isMultiClass ?? false,
    trancheTransferability: initialConfig.trancheTransferability || "unrestricted",
    granularControl: initialConfig.granularControl ?? false,
    
    // Recovery (ERC-1644)
    forcedTransfers: initialConfig.forcedTransfers ?? false,
    forcedRedemptionEnabled: initialConfig.forcedRedemptionEnabled ?? false,
    recoveryMechanism: initialConfig.recoveryMechanism || "none",
    
    // Related data
    partitions: initialConfig.partitions || [],
    documents: initialConfig.documents || [],
    controllers: initialConfig.controllers || [],
    corporateActions: initialConfig.corporateActions || [],
    custodyProviders: initialConfig.custodyProviders || [],
    regulatoryFilings: initialConfig.regulatoryFilings || [],
    partitionOperators: initialConfig.partitionOperators || []
  });

  const [activeTab, setActiveTab] = useState("base");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  // Update parent when config changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config);
    }
    setTokenForm({ ...tokenForm, ...config });
  }, [config]);

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentsChange = (documents: ERC1400Document[]) => {
    setConfig(prev => ({ ...prev, documents }));
  };

  const handleCorporateActionsChange = (actions: CorporateAction[]) => {
    setConfig(prev => ({ ...prev, corporateActions: actions }));
  };

  const handleCustodyProvidersChange = (providers: CustodyProvider[]) => {
    setConfig(prev => ({ ...prev, custodyProviders: providers }));
  };

  const handleRegulatoryFilingsChange = (filings: RegulatoryFiling[]) => {
    setConfig(prev => ({ ...prev, regulatoryFilings: filings }));
  };

  const handlePartitionOperatorsChange = (operators: PartitionOperator[]) => {
    setConfig(prev => ({ ...prev, partitionOperators: operators }));
  };

  const handlePartitionsChange = (partitions: any[]) => {
    setConfig(prev => ({ ...prev, partitions }));
  };

  const handleControllersChange = (controllers: any[]) => {
    setConfig(prev => ({ ...prev, controllers }));
  };

  // Validation
  const validateConfig = () => {
    const issues: ValidationIssue[] = [];

    // Required fields
    if (!config.name?.trim()) {
      issues.push({
        field: 'name',
        message: 'Token name is required',
        severity: 'error',
        tab: 'base'
      });
    }

    if (!config.symbol?.trim()) {
      issues.push({
        field: 'symbol',
        message: 'Token symbol is required',
        severity: 'error',
        tab: 'base'
      });
    }

    if (config.requireKyc && !config.whitelistEnabled) {
      issues.push({
        field: 'whitelistEnabled',
        message: 'Whitelist should be enabled when KYC is required',
        severity: 'warning',
        tab: 'properties'
      });
    }

    setValidationIssues(issues);
    return issues.filter(i => i.severity === 'error').length === 0;
  };

  const getCompletionPercentage = () => {
    const totalFields = 15; // Core required fields
    let completed = 0;

    if (config.name?.trim()) completed++;
    if (config.symbol?.trim()) completed++;
    if (config.securityType) completed++;
    if (config.regulationType) completed++;
    if (config.issuingEntityName?.trim()) completed++;
    if (config.issuingJurisdiction) completed++;
    if (config.documents.length > 0) completed++;
    if (config.partitions.length > 0) completed++;
    
    return Math.round((completed / totalFields) * 100);
  };

  const completionPercentage = getCompletionPercentage();
  const hasErrors = validationIssues.some(i => i.severity === 'error');
  const hasWarnings = validationIssues.some(i => i.severity === 'warning');

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">ERC-1400 Security Token</h2>
              <p className="text-sm text-muted-foreground">
                Configure your compliant security token with partition support
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasErrors && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {validationIssues.filter(i => i.severity === 'error').length} Errors
                </Badge>
              )}
              {hasWarnings && !hasErrors && (
                <Badge variant="outline">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {validationIssues.filter(i => i.severity === 'warning').length} Warnings
                </Badge>
              )}
              {!hasErrors && !hasWarnings && completionPercentage === 100 && (
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Configuration Progress</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9">
          <TabsTrigger value="base">Base</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="partitions">Partitions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="controllers">Controllers</TabsTrigger>
          <TabsTrigger value="corporate-actions">Corporate Actions</TabsTrigger>
          <TabsTrigger value="custody">Custody</TabsTrigger>
          <TabsTrigger value="regulatory">Regulatory</TabsTrigger>
          <TabsTrigger value="operators">Operators</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="space-y-4">
          <ERC1400BaseForm
            config={config}
            handleInputChange={(e) => handleConfigChange(e.target.name, e.target.value)}
            handleSelectChange={(name, value) => handleConfigChange(name, value)}
            handleSwitchChange={(name, checked) => handleConfigChange(name, checked)}
          />
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <ERC1400PropertiesForm
            config={config}
            handleInputChange={(e) => handleConfigChange(e.target.name, e.target.value)}
            handleSelectChange={(name, value) => handleConfigChange(name, value)}
            handleSwitchChange={(name, checked) => handleConfigChange(name, checked)}
          />
        </TabsContent>

        <TabsContent value="partitions" className="space-y-4">
          <ERC1400PartitionsForm
            config={config}
            partitions={config.partitions}
            onPartitionsChange={handlePartitionsChange}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <ERC1400DocumentsForm
            config={config}
            documents={config.documents}
            onDocumentsChange={handleDocumentsChange}
          />
        </TabsContent>

        <TabsContent value="controllers" className="space-y-4">
          <ERC1400ControllersForm
            config={config}
            controllers={config.controllers}
            onControllersChange={handleControllersChange}
          />
        </TabsContent>

        <TabsContent value="corporate-actions" className="space-y-4">
          <ERC1400CorporateActionsManagementForm
            config={config}
            corporateActions={config.corporateActions}
            onCorporateActionsChange={handleCorporateActionsChange}
          />
        </TabsContent>

        <TabsContent value="custody" className="space-y-4">
          <ERC1400CustodyProvidersForm
            config={config}
            custodyProviders={config.custodyProviders}
            onCustodyProvidersChange={handleCustodyProvidersChange}
          />
        </TabsContent>

        <TabsContent value="regulatory" className="space-y-4">
          <ERC1400RegulatoryFilingsForm
            config={config}
            regulatoryFilings={config.regulatoryFilings}
            onRegulatoryFilingsChange={handleRegulatoryFilingsChange}
          />
        </TabsContent>

        <TabsContent value="operators" className="space-y-4">
          <ERC1400PartitionOperatorsForm
            config={config}
            partitionOperators={config.partitionOperators}
            partitions={config.partitions}
            onPartitionOperatorsChange={handlePartitionOperatorsChange}
          />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {config.partitions.length} Partitions • {config.documents.length} Documents
              </span>
            </div>
            <Button onClick={validateConfig}>
              Validate Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ERC1400Config;
