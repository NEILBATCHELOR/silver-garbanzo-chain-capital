/**
 * ERC1400ConfigUploadDialog.tsx
 * 
 * Comprehensive JSON configuration upload dialog specifically for ERC1400 security tokens.
 * Covers ALL 119+ fields from TokenERC1400Properties table and related ERC1400 tables.
 * 
 * Supports:
 * - All ERC1400 core properties (security type, compliance, KYC, etc.)
 * - Partitions and partition management
 * - Controllers and access control
 * - Legal documents and regulatory filings
 * - Corporate actions and custody providers
 * - Geographic and investor restrictions
 * - Compliance automation and settings
 * - Advanced institutional features
 * - No validation blocking - accepts any valid JSON structure
 */

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Download, 
  CheckCircle, 
  Info,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Code,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenFormData } from "../../types";
import { TokenStandard } from "@/types/core/centralModels";
import { useToast } from "@/components/ui/use-toast";

interface ERC1400ConfigUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (tokenData: Partial<TokenFormData>) => void;
}

interface ProcessingResult {
  isValid: boolean;
  warnings: string[];
  mappedData?: Partial<TokenFormData>;
  fieldsDetected?: number;
  structureAnalysis?: {
    hasERC1400Properties: boolean;
    hasPartitions: boolean;
    hasControllers: boolean;
    hasDocuments: boolean;
    hasComplianceConfig: boolean;
    hasCorporateActions: boolean;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
  };
}

const ERC1400ConfigUploadDialog = ({
  open,
  onOpenChange,
  onUploadComplete,
}: ERC1400ConfigUploadDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [rawJsonData, setRawJsonData] = useState<any>(null);
  const [jsonText, setJsonText] = useState<string>("");
  const [showRawData, setShowRawData] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  /**
   * ERC1400-specific JSON processing with comprehensive field mapping
   * Covers all 119+ fields from TokenERC1400Properties and related tables
   */
  const processERC1400JsonData = (jsonData: any): ProcessingResult => {
    const warnings: string[] = [];
    const mappedData: Partial<TokenFormData> = {};
    let fieldsDetected = 0;

    // Helper function to get nested values safely
    const getNestedValue = (obj: any, path: string): any => {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
      }, obj);
    };

    // ==========================================
    // CORE ERC1400 FIELD MAPPINGS (ALL 119+ FIELDS)
    // ==========================================

    // Core token information
    const coreFieldMappings = {
      name: [
        'name', 'tokenName', 'title', 'token_name', 'securityName', 'instrumentName'
      ],
      symbol: [
        'symbol', 'tokenSymbol', 'ticker', 'token_symbol', 'securitySymbol'
      ],
      
      // Supply management
      initialSupply: [
        'initialSupply', 'initial_supply', 'supply', 'totalSupply', 'issuedShares'
      ],
      cap: [
        'cap', 'maxSupply', 'max_supply', 'authorizedShares', 'shareLimit'
      ],
      decimals: [
        'decimals', 'decimal', 'precision', 'decimalPlaces'
      ],
      
      // Security token type
      securityType: [
        'securityType', 'security_type', 'tokenCategory', 'instrumentType', 'assetClass'
      ],
      tokenDetails: [
        'tokenDetails', 'token_details', 'description', 'securityDescription'
      ],
      
      // Document management
      documentUri: [
        'documentUri', 'document_uri', 'legalDocumentUri', 'prospectusUri'
      ],
      documentHash: [
        'documentHash', 'document_hash', 'legalDocumentHash', 'documentChecksum'
      ],
      legalTerms: [
        'legalTerms', 'legal_terms', 'terms', 'termsAndConditions'
      ],
      prospectus: [
        'prospectus', 'offeringDocument', 'offeringMemorandum'
      ],
      documentManagement: [
        'documentManagement', 'document_management', 'enableDocuments', 'documentSupport'
      ],
      
      // Controller operations
      controllerAddress: [
        'controllerAddress', 'controller_address', 'controller', 'adminAddress'
      ],
      enforceKYC: [
        'enforceKYC', 'enforce_kyc', 'requireKyc', 'kycRequired', 'kycEnforcement'
      ],
      requireKyc: [
        'requireKyc', 'require_kyc', 'enforceKYC', 'kycRequired'
      ],
      forcedTransfers: [
        'forcedTransfers', 'forced_transfers', 'adminTransfers', 'compelledTransfers'
      ],
      forcedRedemptionEnabled: [
        'forcedRedemptionEnabled', 'forced_redemption_enabled', 'adminRedemption', 'compelledRedemption'
      ],
      
      // Issuer details
      issuingJurisdiction: [
        'issuingJurisdiction', 'issuing_jurisdiction', 'jurisdiction', 'issuanceJurisdiction'
      ],
      issuingEntityName: [
        'issuingEntityName', 'issuing_entity_name', 'issuer', 'issuingCompany'
      ],
      issuingEntityLei: [
        'issuingEntityLei', 'issuing_entity_lei', 'lei', 'legalEntityIdentifier'
      ],
      
      // Transfer restrictions
      transferRestrictions: [
        'transferRestrictions', 'transfer_restrictions', 'restrictions', 'transferLimits'
      ],
      whitelistEnabled: [
        'whitelistEnabled', 'whitelist_enabled', 'allowlistEnabled', 'accessControlEnabled'
      ],
      holdingPeriod: [
        'holdingPeriod', 'holding_period', 'lockupPeriod', 'restrictionPeriod'
      ],
      maxInvestorCount: [
        'maxInvestorCount', 'max_investor_count', 'investorLimit', 'shareholderLimit'
      ],
      investorAccreditation: [
        'investorAccreditation', 'investor_accreditation', 'accreditationRequired', 'qualifiedInvestorOnly'
      ],
      
      // Geographic restrictions
      geographicRestrictions: [
        'geographicRestrictions', 'geographic_restrictions', 'geoRestrictions', 'countryRestrictions'
      ],
      
      // Compliance
      autoCompliance: [
        'autoCompliance', 'auto_compliance', 'automatedCompliance', 'complianceAutomation'
      ],
      manualApprovals: [
        'manualApprovals', 'manual_approvals', 'requireApproval', 'approvalRequired'
      ],
      complianceModule: [
        'complianceModule', 'compliance_module', 'complianceContract', 'complianceProvider'
      ],
      complianceAutomationLevel: [
        'complianceAutomationLevel', 'compliance_automation_level', 'automationLevel'
      ],
      
      // Advanced features
      isIssuable: [
        'isIssuable', 'is_issuable', 'issuable', 'canIssue'
      ],
      isMintable: [
        'isMintable', 'is_mintable', 'mintable', 'canMint'
      ],
      isBurnable: [
        'isBurnable', 'is_burnable', 'burnable', 'canBurn'
      ],
      isPausable: [
        'isPausable', 'is_pausable', 'pausable', 'canPause'
      ],
      granularControl: [
        'granularControl', 'granular_control', 'finegrainedControl', 'detailedControl'
      ],
      dividendDistribution: [
        'dividendDistribution', 'dividend_distribution', 'dividends', 'payoutDistribution'
      ],
      corporateActions: [
        'corporateActions', 'corporate_actions', 'corporateEvents', 'companyActions'
      ],
      issuanceModules: [
        'issuanceModules', 'issuance_modules', 'modules', 'extensions'
      ],
      recoveryMechanism: [
        'recoveryMechanism', 'recovery_mechanism', 'recovery', 'emergencyRecovery'
      ],
      customFeatures: [
        'customFeatures', 'custom_features', 'extensions', 'additionalFeatures'
      ],
      isMultiClass: [
        'isMultiClass', 'is_multi_class', 'multiClass', 'multipleClasses'
      ],
      trancheTransferability: [
        'trancheTransferability', 'tranche_transferability', 'partitionTransfers'
      ],
      regulationType: [
        'regulationType', 'regulation_type', 'regulatoryFramework', 'complianceType'
      ]
    };

    // Map core fields
    Object.entries(coreFieldMappings).forEach(([targetField, sourceFields]) => {
      for (const sourceField of sourceFields) {
        const value = getNestedValue(jsonData, sourceField);
        if (value !== undefined && value !== null) {
          (mappedData as any)[targetField] = value;
          fieldsDetected++;
          break;
        }
      }
    });

    // ==========================================
    // COMPLEX CONFIGURATION OBJECTS
    // ==========================================

    // Compliance Settings
    const complianceSettingsMappings = [
      'complianceSettings', 'compliance_settings', 'complianceConfig', 'regulatoryConfig'
    ];
    
    for (const field of complianceSettingsMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.complianceSettings = value;
        fieldsDetected++;
        break;
      }
    }

    // KYC Settings
    const kycSettingsMappings = [
      'kycSettings', 'kyc_settings', 'kycConfig', 'kycRequirements'
    ];
    
    for (const field of kycSettingsMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.kycSettings = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC1400 RELATED ARRAYS AND OBJECTS
    // ==========================================

    // Partitions (token_erc1400_partitions table)
    const partitionsMappings = [
      'partitions', 'tranches', 'erc1400Partitions', 'tokenClasses', 'shareClasses',
      'segments', 'divisions'
    ];
    
    for (const field of partitionsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.partitions = value;
        fieldsDetected++;
        break;
      }
    }

    // Controllers (token_erc1400_controllers table)
    const controllersMappings = [
      'controllers', 'erc1400Controllers', 'tokenControllers', 'adminAddresses',
      'managers', 'operators'
    ];
    
    for (const field of controllersMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.controllers = value;
        fieldsDetected++;
        break;
      }
    }

    // Documents (token_erc1400_documents table)
    const documentsMappings = [
      'documents', 'erc1400Documents', 'legalDocuments', 'regulatoryDocs',
      'filings', 'attachments'
    ];
    
    for (const field of documentsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.documents = value;
        fieldsDetected++;
        break;
      }
    }

    // Corporate Actions
    const corporateActionsMappings = [
      'corporateActionsData', 'corporateActionsList', 'companyActions', 'corporateEvents'
    ];
    
    for (const field of corporateActionsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.corporateActionsData = value;
        fieldsDetected++;
        break;
      }
    }

    // Custody Providers
    const custodyProvidersMappings = [
      'custodyProviders', 'custodians', 'custodialServices', 'assetCustodians'
    ];
    
    for (const field of custodyProvidersMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.custodyProviders = value;
        fieldsDetected++;
        break;
      }
    }

    // Regulatory Filings
    const regulatoryFilingsMappings = [
      'regulatoryFilings', 'filings', 'regulatoryDocuments', 'complianceFilings'
    ];
    
    for (const field of regulatoryFilingsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.regulatoryFilings = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC1400 PROPERTIES OBJECT MAPPING
    // ==========================================
    
    const erc1400PropertiesMappings = [
      'erc1400Properties', 'erc1400', 'properties', 'securityProperties', 'erc1400Config'
    ];
    
    for (const field of erc1400PropertiesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        // Map the entire ERC1400 properties object
        mappedData.erc1400Properties = value;
        fieldsDetected++;
        
        // Also extract individual fields from the properties object
        Object.entries(coreFieldMappings).forEach(([targetField, _]) => {
          if (value[targetField] !== undefined && !(targetField in mappedData)) {
            (mappedData as any)[targetField] = value[targetField];
            fieldsDetected++;
          }
        });
        break;
      }
    }

    // ==========================================
    // METADATA AND CONFIGURATION OBJECTS
    // ==========================================

    // Map metadata object
    if (jsonData.metadata && typeof jsonData.metadata === 'object') {
      mappedData.metadata = jsonData.metadata;
      fieldsDetected++;
    }

    // Map blocks configuration
    if (jsonData.blocks && typeof jsonData.blocks === 'object') {
      mappedData.blocks = jsonData.blocks;
      fieldsDetected++;
    }

    // Set standard and config mode
    mappedData.standard = TokenStandard.ERC1400;
    fieldsDetected++;

    // Automatically set to max config mode (ERC1400 is inherently complex)
    mappedData.configMode = 'max';
    fieldsDetected++;

    // Map any remaining custom fields
    Object.entries(jsonData).forEach(([key, value]) => {
      if (!(key in mappedData) && value !== undefined && value !== null) {
        (mappedData as any)[key] = value;
        fieldsDetected++;
      }
    });

    // Structure analysis
    const structureAnalysis = {
      hasERC1400Properties: !!(mappedData.erc1400Properties || 
        Object.keys(coreFieldMappings).some(field => field in mappedData)),
      hasPartitions: !!mappedData.partitions,
      hasControllers: !!mappedData.controllers,
      hasDocuments: !!mappedData.documents,
      hasComplianceConfig: !!(mappedData.complianceSettings || mappedData.kycSettings),
      hasCorporateActions: !!mappedData.corporateActionsData,
      estimatedComplexity: fieldsDetected < 20 ? 'medium' as const : 'complex' as const
    };

    // Generate warnings (non-blocking)
    if (!mappedData.name && !mappedData.securityName) {
      warnings.push("No security name detected - consider adding 'name' field");
    }
    if (!mappedData.symbol && !mappedData.securitySymbol) {
      warnings.push("No security symbol detected - consider adding 'symbol' field");
    }
    if (!mappedData.securityType) {
      warnings.push("No security type detected - consider specifying equity, debt, derivative, etc.");
    }
    if (!mappedData.issuingJurisdiction) {
      warnings.push("No issuing jurisdiction detected - regulatory compliance may be affected");
    }
    if (!mappedData.enforceKYC && !mappedData.requireKyc) {
      warnings.push("KYC enforcement not specified - consider enabling for regulatory compliance");
    }
    if (fieldsDetected === 0) {
      warnings.push("No ERC1400-specific fields detected - uploading raw JSON data");
    }

    return {
      isValid: true, // Never block uploads
      warnings,
      mappedData,
      fieldsDetected,
      structureAnalysis
    };
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProcessingResult(null);
    setRawJsonData(null);

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  // Process file upload
  const processFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const jsonData = JSON.parse(text);
        setRawJsonData(jsonData);
        setJsonText(JSON.stringify(jsonData, null, 2));
        
        const result = processERC1400JsonData(jsonData);
        setProcessingResult(result);
        setIsProcessing(false);
      } catch (error) {
        const textContent = e.target?.result as string;
        const fallbackData = { rawContent: textContent };
        setRawJsonData(fallbackData);
        setJsonText(textContent);
        setProcessingResult({
          isValid: true,
          warnings: ["Invalid JSON format detected - will upload raw content"],
          mappedData: fallbackData,
          fieldsDetected: 1
        });
        setIsProcessing(false);
      }
    };

    reader.readAsText(file);
  };

  // Handle text input processing
  const handleTextSubmit = () => {
    if (!jsonText.trim()) {
      toast({
        variant: "destructive",
        title: "Empty Input",
        description: "Please enter ERC1400 JSON configuration data."
      });
      return;
    }

    setIsProcessing(true);
    try {
      const jsonData = JSON.parse(jsonText);
      setRawJsonData(jsonData);
      
      const result = processERC1400JsonData(jsonData);
      setProcessingResult(result);
      setIsProcessing(false);
    } catch (error) {
      const fallbackData = { rawContent: jsonText };
      setRawJsonData(fallbackData);
      setProcessingResult({
        isValid: true,
        warnings: ["Invalid JSON format detected - will upload raw content"],
        mappedData: fallbackData,
        fieldsDetected: 1
      });
      setIsProcessing(false);
    }
  };

  // Handle upload
  const handleUpload = () => {
    if (!processingResult?.mappedData) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No ERC1400 configuration data to upload."
      });
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      onUploadComplete(processingResult.mappedData!);
      setIsProcessing(false);
      resetForm();
      onOpenChange(false);
      
      toast({
        title: "ERC1400 Configuration Loaded",
        description: `Successfully loaded ${processingResult.fieldsDetected || 'unknown number of'} ERC1400 fields into the form.`
      });
    }, 500);
  };

  // Download ERC1400 template
  const downloadERC1400Template = () => {
    const template = {
      name: "Example Security Token",
      symbol: "EST",
      standard: "ERC-1400",
      initialSupply: "10000000",
      cap: "50000000",
      decimals: 18,
      securityType: "equity",
      tokenDetails: "Common shares of Example Company Inc.",
      documentUri: "https://example.com/legal/prospectus.pdf",
      documentHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      legalTerms: "Standard equity terms and conditions apply",
      prospectus: "https://example.com/legal/offering-memorandum.pdf",
      documentManagement: true,
      controllerAddress: "0x0000000000000000000000000000000000000000",
      enforceKYC: true,
      requireKyc: true,
      forcedTransfers: true,
      forcedRedemptionEnabled: true,
      issuingJurisdiction: "US",
      issuingEntityName: "Example Company Inc.",
      issuingEntityLei: "123456789012345678XX",
      transferRestrictions: true,
      whitelistEnabled: true,
      holdingPeriod: 365,
      maxInvestorCount: 2000,
      investorAccreditation: true,
      geographicRestrictions: ["US", "CA", "UK"],
      autoCompliance: true,
      manualApprovals: false,
      complianceModule: "0x0000000000000000000000000000000000000000",
      complianceAutomationLevel: "full",
      isIssuable: true,
      isMintable: true,
      isBurnable: true,
      isPausable: true,
      granularControl: true,
      dividendDistribution: true,
      corporateActions: true,
      issuanceModules: true,
      recoveryMechanism: true,
      customFeatures: {},
      isMultiClass: false,
      trancheTransferability: true,
      regulationType: "SEC",
      
      // ERC1400 Properties
      erc1400Properties: {
        initialSupply: "10000000",
        cap: "50000000",
        decimals: 18,
        securityType: "equity",
        tokenDetails: "Common shares of Example Company Inc.",
        documentUri: "https://example.com/legal/prospectus.pdf",
        documentHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        legalTerms: "Standard equity terms and conditions apply",
        prospectus: "https://example.com/legal/offering-memorandum.pdf",
        documentManagement: true,
        controllerAddress: "0x0000000000000000000000000000000000000000",
        enforceKYC: true,
        forcedTransfers: true,
        forcedRedemptionEnabled: true,
        issuingJurisdiction: "US",
        issuingEntityName: "Example Company Inc.",
        issuingEntityLei: "123456789012345678XX",
        transferRestrictions: true,
        whitelistEnabled: true,
        holdingPeriod: 365,
        maxInvestorCount: 2000,
        investorAccreditation: true,
        geographicRestrictions: ["US", "CA", "UK"],
        autoCompliance: true,
        manualApprovals: false,
        complianceModule: "0x0000000000000000000000000000000000000000",
        complianceAutomationLevel: "full",
        isIssuable: true,
        isMintable: true,
        isBurnable: true,
        isPausable: true,
        granularControl: true,
        dividendDistribution: true,
        corporateActions: true,
        issuanceModules: true,
        recoveryMechanism: true,
        isMultiClass: false,
        trancheTransferability: true,
        regulationType: "SEC"
      },
      
      // Partitions
      partitions: [
        {
          name: "Common Shares",
          partitionId: "COMMON",
          amount: "8000000",
          isLockable: false,
          partitionType: "common"
        },
        {
          name: "Preferred Shares",
          partitionId: "PREFERRED",
          amount: "2000000",
          isLockable: true,
          partitionType: "preferred"
        }
      ],
      
      // Controllers
      controllers: [
        {
          address: "0x0000000000000000000000000000000000000000",
          permissions: ["mint", "burn", "pause", "forceTransfer"]
        },
        {
          address: "0x1111111111111111111111111111111111111111",
          permissions: ["compliance", "kyc"]
        }
      ],
      
      // Documents
      documents: [
        {
          name: "Prospectus",
          documentUri: "https://example.com/legal/prospectus.pdf",
          documentType: "prospectus",
          documentHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
        },
        {
          name: "Terms and Conditions",
          documentUri: "https://example.com/legal/terms.pdf",
          documentType: "terms",
          documentHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        }
      ],
      
      // Corporate Actions
      corporateActionsData: [
        {
          actionType: "dividend",
          recordDate: "2024-12-31",
          paymentDate: "2025-01-15",
          amountPerShare: "0.25",
          currency: "USD"
        }
      ],
      
      // Custody Providers
      custodyProviders: [
        {
          name: "Example Custody Services",
          address: "0x2222222222222222222222222222222222222222",
          jurisdiction: "US",
          regulatoryLicense: "SEC-123456"
        }
      ],
      
      // Regulatory Filings
      regulatoryFilings: [
        {
          filingType: "Form D",
          filingDate: "2024-01-15",
          regulatorAgency: "SEC",
          filingNumber: "021-123456",
          documentUri: "https://example.com/filings/form-d.pdf"
        }
      ],
      
      // Compliance Settings
      complianceSettings: {
        kycRequired: true,
        amlRequired: true,
        accreditationRequired: true,
        geographicRestrictions: true,
        investorLimits: true,
        transferRestrictions: true,
        holdingPeriodEnforcement: true,
        automaticCompliance: true
      },
      
      // KYC Settings
      kycSettings: {
        provider: "Jumio",
        requiredDocuments: ["passport", "proofOfAddress"],
        verificationLevel: "enhanced",
        renewalPeriod: 365,
        automaticRenewal: false
      }
    };

    const jsonContent = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ERC1400_comprehensive_template.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy JSON to clipboard
  const copyJsonToClipboard = () => {
    if (processingResult?.mappedData) {
      navigator.clipboard.writeText(JSON.stringify(processingResult.mappedData, null, 2));
      toast({
        title: "Copied to clipboard",
        description: "ERC1400 configuration data copied to clipboard."
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFile(null);
    setProcessingResult(null);
    setRawJsonData(null);
    setJsonText("");
    setShowRawData(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>ERC1400 Security Token Configuration Upload</span>
            <Badge variant="outline">119+ Fields</Badge>
          </DialogTitle>
          <DialogDescription>
            Upload or paste JSON configuration data specifically for ERC1400 security tokens.
            Supports all TokenERC1400Properties fields, partitions, controllers, compliance, and regulatory features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload Tabs */}
          <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as 'file' | 'text')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Text Input
              </TabsTrigger>
            </TabsList>

            {/* File Upload Tab */}
            <TabsContent value="file" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonFile">ERC1400 Security Token JSON Configuration File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="jsonFile"
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadERC1400Template}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    ERC1400 Template
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Text Input Tab */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonText">ERC1400 Security Token JSON Configuration Data</Label>
                <Textarea
                  id="jsonText"
                  placeholder='{"name": "My Security Token", "symbol": "MST", "securityType": "equity", "enforceKYC": true, "partitions": [...], ...}'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <Button
                  type="button"
                  onClick={handleTextSubmit}
                  disabled={!jsonText.trim()}
                  className="w-full"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Process ERC1400 JSON
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Processing indicator */}
          {isProcessing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Processing ERC1400 security token configuration...
              </AlertDescription>
            </Alert>
          )}

          {/* Processing warnings */}
          {processingResult && processingResult.warnings.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Processing Notes:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {processingResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success preview */}
          {processingResult && processingResult.mappedData && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="font-medium mb-1 text-green-800">ERC1400 Configuration Ready!</div>
                <div className="text-sm text-green-700">
                  Successfully mapped {processingResult.fieldsDetected} ERC1400 fields.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Analysis */}
          {processingResult && processingResult.structureAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>ERC1400 Security Token Analysis</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">ERC-1400</Badge>
                    <Badge 
                      variant={processingResult.structureAnalysis.estimatedComplexity === 'simple' ? 'default' : 
                              processingResult.structureAnalysis.estimatedComplexity === 'medium' ? 'secondary' : 'destructive'}
                    >
                      {processingResult.structureAnalysis.estimatedComplexity}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Fields Detected:</span> {processingResult.fieldsDetected}
                  </div>
                  <div>
                    <span className="font-medium">ERC1400 Properties:</span>{" "}
                    {processingResult.structureAnalysis.hasERC1400Properties ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Partitions:</span>{" "}
                    {processingResult.structureAnalysis.hasPartitions ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Controllers:</span>{" "}
                    {processingResult.structureAnalysis.hasControllers ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Documents:</span>{" "}
                    {processingResult.structureAnalysis.hasDocuments ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Compliance Config:</span>{" "}
                    {processingResult.structureAnalysis.hasComplianceConfig ? "✓" : "✗"}
                  </div>
                </div>

                {/* Sample mapped fields preview */}
                {processingResult.mappedData && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ERC1400 Fields Preview:</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowRawData(!showRawData)}
                        >
                          {showRawData ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {showRawData ? "Hide" : "Show"} Raw
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyJsonToClipboard}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto">
                      {showRawData ? (
                        <pre>{JSON.stringify(rawJsonData, null, 2)}</pre>
                      ) : (
                        <div className="space-y-1">
                          {Object.entries(processingResult.mappedData)
                            .slice(0, 10)
                            .map(([key, value]) => (
                              <div key={key}>
                                <span className="text-blue-600">{key}:</span>{" "}
                                <span className="text-green-600">
                                  {typeof value === 'object' && value !== null
                                    ? Array.isArray(value) 
                                      ? `[${value.length} items]`
                                      : "{object}"
                                    : String(value).slice(0, 50) + (String(value).length > 50 ? "..." : "")
                                  }
                                </span>
                              </div>
                            ))}
                          {Object.keys(processingResult.mappedData).length > 10 && (
                            <div className="text-muted-foreground">
                              ... and {Object.keys(processingResult.mappedData).length - 10} more fields
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ERC1400 Format information */}
          <div className="bg-muted/20 p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">ERC1400 Security Token Configuration Support</h3>
            <p className="text-sm text-muted-foreground mb-2">
              This upload dialog is optimized specifically for ERC1400 security tokens:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>All 119+ TokenERC1400Properties fields (compliance, KYC, partitions, etc.)</li>
              <li>Partitions and partition management for multi-class securities</li>
              <li>Controllers and granular access control</li>
              <li>Legal documents and regulatory filings management</li>
              <li>Corporate actions and custody provider integration</li>
              <li>Geographic and investor restrictions for compliance</li>
              <li>Automated compliance and KYC/AML settings</li>
              <li>Advanced institutional features and recovery mechanisms</li>
              <li>Regulatory framework support (SEC, MiFID, etc.)</li>
              <li>Zero validation blocking - any valid JSON accepted</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!processingResult?.mappedData || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Load ERC1400 Config
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ERC1400ConfigUploadDialog;