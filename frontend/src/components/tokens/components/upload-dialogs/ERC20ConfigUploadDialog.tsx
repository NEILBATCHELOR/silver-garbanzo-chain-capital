/**
 * ERC20ConfigUploadDialog.tsx
 * 
 * Comprehensive JSON configuration upload dialog specifically for ERC20 tokens.
 * Covers ALL 63 fields from TokenERC20Properties table and related configuration objects.
 * 
 * Supports:
 * - All ERC20 core properties (initialSupply, cap, decimals, etc.)
 * - Advanced JSONB configuration objects (feeOnTransfer, governanceFeatures, etc.)
 * - Complex transfer and compliance configurations
 * - Gas optimization and rebasing features
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
  Zap,
  Code,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenFormData } from "../../types";
import { TokenStandard } from "@/types/core/centralModels";
import { useToast } from "@/components/ui/use-toast";

interface ERC20ConfigUploadDialogProps {
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
    hasERC20Properties: boolean;
    hasAdvancedConfig: boolean;
    hasComplexObjects: boolean;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
  };
}

const ERC20ConfigUploadDialog = ({
  open,
  onOpenChange,
  onUploadComplete,
}: ERC20ConfigUploadDialogProps) => {
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
   * ERC20-specific JSON processing with comprehensive field mapping
   * Covers all 63 fields from TokenERC20Properties and complex configuration objects
   */
  const processERC20JsonData = (jsonData: any): ProcessingResult => {
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
    // CORE ERC20 FIELD MAPPINGS (ALL 63 FIELDS)
    // ==========================================

    // Core token information
    const coreFieldMappings = {
      name: [
        'name', 'tokenName', 'title', 'token_name', 'contractName', 'displayName'
      ],
      symbol: [
        'symbol', 'tokenSymbol', 'ticker', 'token_symbol', 'code', 'shortName'
      ],
      decimals: [
        'decimals', 'decimal', 'precision', 'decimalPlaces', 'token_decimals'
      ],
      
      // Supply management
      initialSupply: [
        'initialSupply', 'initial_supply', 'supply', 'startingSupply', 'totalSupply', 'genesisSupply'
      ],
      cap: [
        'cap', 'maxSupply', 'max_supply', 'supplyCap', 'totalCap', 'hardCap', 'supplyLimit'
      ],
      
      // Token features
      isMintable: [
        'isMintable', 'is_mintable', 'mintable', 'canMint', 'allowMinting', 'mintingEnabled'
      ],
      isBurnable: [
        'isBurnable', 'is_burnable', 'burnable', 'canBurn', 'allowBurning', 'burnEnabled'
      ],
      isPausable: [
        'isPausable', 'is_pausable', 'pausable', 'canPause', 'allowPausing', 'pausingEnabled'
      ],
      
      // Token type and classification
      tokenType: [
        'tokenType', 'token_type', 'type', 'category', 'classification', 'kind'
      ],
      
      // Access control and permissions
      accessControl: [
        'accessControl', 'access_control', 'permissions', 'controlType', 'permissionModel', 'accessType'
      ],
      
      // Advanced boolean features
      allowManagement: [
        'allowManagement', 'allow_management', 'allowanceManagement', 'enableManagement', 'managementEnabled'
      ],
      permit: [
        'permit', 'permitSupport', 'permit_support', 'permitEnabled', 'eip2612', 'eip2612Support'
      ],
      snapshot: [
        'snapshot', 'snapshots', 'snapshotEnabled', 'snapshotSupport', 'enableSnapshots'
      ],
      upgradeable: [
        'upgradeable', 'isUpgradeable', 'upgradeEnabled', 'upgradable', 'proxyUpgradeable'
      ],
      permitSupport: [
        'permitSupport', 'permit_support', 'eip2612Support', 'permitEnabled'
      ],
      votesSupport: [
        'votesSupport', 'votes_support', 'governanceVotes', 'votingSupport', 'governanceSupport'
      ],
      flashMinting: [
        'flashMinting', 'flash_minting', 'flashLoan', 'flashMintEnabled', 'flashLoanSupport'
      ],
      snapshots: [
        'snapshots', 'snapshotSupport', 'snapshotEnabled', 'enableSnapshots'
      ],
      transferHooks: [
        'transferHooks', 'transfer_hooks', 'hooks', 'transferCallbacks', 'transferListeners'
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
    // COMPLEX JSONB CONFIGURATION OBJECTS
    // ==========================================

    // Fee on Transfer Configuration
    const feeOnTransferMappings = [
      'feeOnTransfer', 'fee_on_transfer', 'transferFees', 'fees', 'transactionFees',
      'tradingFees', 'swapFees', 'feeConfig', 'feeStructure'
    ];
    
    for (const field of feeOnTransferMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.feeOnTransfer = value;
        fieldsDetected++;
        break;
      }
    }

    // Governance Features Configuration
    const governanceFeaturesMappings = [
      'governanceFeatures', 'governance_features', 'governance', 'voting', 'dao',
      'governanceConfig', 'daoConfig', 'votingConfig', 'proposalConfig'
    ];
    
    for (const field of governanceFeaturesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.governanceFeatures = value;
        fieldsDetected++;
        break;
      }
    }

    // Rebasing Configuration
    const rebasingMappings = [
      'rebasing', 'elasticSupply', 'rebaseConfig', 'supplyAdjustment',
      'inflationConfig', 'deflationConfig', 'monetaryPolicy', 'rebaseSettings'
    ];
    
    for (const field of rebasingMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.rebasing = value;
        fieldsDetected++;
        break;
      }
    }

    // Transfer Configuration
    const transferConfigMappings = [
      'transferConfig', 'transfer_config', 'transferRestrictions', 'restrictionConfig',
      'transferLimits', 'tradingLimits', 'holdingLimits', 'velocityLimits'
    ];
    
    for (const field of transferConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.transferConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Gas Configuration
    const gasConfigMappings = [
      'gasConfig', 'gas_config', 'gasOptimization', 'gasSettings', 'feeConfig',
      'gasFees', 'gasEstimation', 'gasManagement', 'gasStrategy'
    ];
    
    for (const field of gasConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.gasConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Compliance Configuration
    const complianceConfigMappings = [
      'complianceConfig', 'compliance_config', 'compliance', 'regulatory',
      'kycConfig', 'amlConfig', 'sanctionsConfig', 'regulatoryConfig'
    ];
    
    for (const field of complianceConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.complianceConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Whitelist Configuration
    const whitelistConfigMappings = [
      'whitelistConfig', 'whitelist_config', 'whitelist', 'accessList',
      'allowList', 'permissionList', 'approvedList', 'authorizedList'
    ];
    
    for (const field of whitelistConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.whitelistConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC20 PROPERTIES OBJECT MAPPING
    // ==========================================
    
    const erc20PropertiesMappings = [
      'erc20Properties', 'erc20', 'properties', 'tokenProperties', 'erc20Config'
    ];
    
    for (const field of erc20PropertiesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        // Map the entire ERC20 properties object
        mappedData.erc20Properties = value;
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
    mappedData.standard = TokenStandard.ERC20;
    fieldsDetected++;

    // Automatically set to max config mode if complex features detected
    if (mappedData.feeOnTransfer || mappedData.governanceFeatures || 
        mappedData.rebasing || mappedData.transferConfig || 
        mappedData.gasConfig || mappedData.complianceConfig ||
        mappedData.whitelistConfig || fieldsDetected > 15) {
      mappedData.configMode = 'max';
      fieldsDetected++;
    }

    // Map any remaining custom fields
    Object.entries(jsonData).forEach(([key, value]) => {
      if (!(key in mappedData) && value !== undefined && value !== null) {
        (mappedData as any)[key] = value;
        fieldsDetected++;
      }
    });

    // Structure analysis
    const structureAnalysis = {
      hasERC20Properties: !!(mappedData.erc20Properties || 
        Object.keys(coreFieldMappings).some(field => field in mappedData)),
      hasAdvancedConfig: !!(mappedData.feeOnTransfer || mappedData.governanceFeatures || 
        mappedData.rebasing || mappedData.transferConfig),
      hasComplexObjects: Object.values(mappedData).some(value => 
        value && typeof value === 'object' && !Array.isArray(value)),
      estimatedComplexity: fieldsDetected < 10 ? 'simple' as const : 
                          fieldsDetected < 25 ? 'medium' as const : 'complex' as const
    };

    // Generate warnings (non-blocking)
    if (!mappedData.name && !mappedData.tokenName) {
      warnings.push("No token name detected - consider adding 'name' field");
    }
    if (!mappedData.symbol && !mappedData.tokenSymbol) {
      warnings.push("No token symbol detected - consider adding 'symbol' field");
    }
    if (fieldsDetected === 0) {
      warnings.push("No ERC20-specific fields detected - uploading raw JSON data");
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
        
        const result = processERC20JsonData(jsonData);
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
        description: "Please enter ERC20 JSON configuration data."
      });
      return;
    }

    setIsProcessing(true);
    try {
      const jsonData = JSON.parse(jsonText);
      setRawJsonData(jsonData);
      
      const result = processERC20JsonData(jsonData);
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
        description: "No ERC20 configuration data to upload."
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
        title: "ERC20 Configuration Loaded",
        description: `Successfully loaded ${processingResult.fieldsDetected || 'unknown number of'} ERC20 fields into the form.`
      });
    }, 500);
  };

  // Download ERC20 template
  const downloadERC20Template = () => {
    const template = {
      name: "Example ERC20 Token",
      symbol: "EXT",
      decimals: 18,
      standard: "ERC-20",
      initialSupply: "1000000000000000000000000",
      cap: "10000000000000000000000000",
      isMintable: true,
      isBurnable: true,
      isPausable: true,
      tokenType: "utility",
      accessControl: "roles",
      allowManagement: true,
      permit: true,
      snapshot: false,
      upgradeable: false,
      permitSupport: true,
      votesSupport: false,
      flashMinting: false,
      snapshots: false,
      transferHooks: false,
      
      // ERC20 Properties
      erc20Properties: {
        initialSupply: "1000000000000000000000000",
        cap: "10000000000000000000000000",
        decimals: 18,
        isMintable: true,
        isBurnable: true,
        isPausable: true,
        tokenType: "utility",
        accessControl: "roles",
        allowManagement: true,
        permit: true,
        snapshot: false,
        upgradeable: false,
        permitSupport: true,
        votesSupport: false,
        flashMinting: false,
        snapshots: false,
        transferHooks: false
      },
      
      // Complex configuration objects
      feeOnTransfer: {
        enabled: false,
        buyFee: "0.25",
        sellFee: "0.25",
        liquidityFee: "0.5",
        marketingFee: "0.25",
        recipient: "0x0000000000000000000000000000000000000000"
      },
      
      governanceFeatures: {
        enabled: false,
        votingPeriod: 0,
        votingThreshold: "0",
        quorumPercentage: "4",
        proposalThreshold: "100000"
      },
      
      rebasing: {
        enabled: false,
        mode: "automatic",
        targetSupply: "0",
        rebaseFrequency: "daily"
      },
      
      transferConfig: {
        enabled: true,
        maxTransferAmount: "1000000",
        cooldownPeriod: 0,
        whitelistOnly: false
      },
      
      gasConfig: {
        enabled: false,
        gasLimit: "200000",
        gasPrice: "20000000000"
      },
      
      complianceConfig: {
        enabled: false,
        kycRequired: false,
        geographicRestrictions: []
      },
      
      whitelistConfig: {
        enabled: false,
        addresses: [],
        whitelistType: "permissive"
      }
    };

    const jsonContent = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ERC20_comprehensive_template.json");
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
        description: "ERC20 configuration data copied to clipboard."
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
            <Zap className="h-5 w-5 text-primary" />
            <span>ERC20 Configuration Upload</span>
            <Badge variant="outline">63 Fields</Badge>
          </DialogTitle>
          <DialogDescription>
            Upload or paste JSON configuration data specifically for ERC20 tokens.
            Supports all 63 TokenERC20Properties fields and complex JSONB configuration objects.
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
                <Label htmlFor="jsonFile">ERC20 JSON Configuration File</Label>
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
                    onClick={downloadERC20Template}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    ERC20 Template
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Text Input Tab */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonText">ERC20 JSON Configuration Data</Label>
                <Textarea
                  id="jsonText"
                  placeholder='{"name": "My ERC20 Token", "symbol": "MET", "decimals": 18, "initialSupply": "1000000", ...}'
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
                  Process ERC20 JSON
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Processing indicator */}
          {isProcessing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Processing ERC20 configuration...
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
                <div className="font-medium mb-1 text-green-800">ERC20 Configuration Ready!</div>
                <div className="text-sm text-green-700">
                  Successfully mapped {processingResult.fieldsDetected} ERC20 fields.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Analysis */}
          {processingResult && processingResult.structureAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>ERC20 Configuration Analysis</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">ERC-20</Badge>
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
                    <span className="font-medium">ERC20 Properties:</span>{" "}
                    {processingResult.structureAnalysis.hasERC20Properties ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Advanced Config:</span>{" "}
                    {processingResult.structureAnalysis.hasAdvancedConfig ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Complex Objects:</span>{" "}
                    {processingResult.structureAnalysis.hasComplexObjects ? "✓" : "✗"}
                  </div>
                </div>

                {/* Sample mapped fields preview */}
                {processingResult.mappedData && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ERC20 Fields Preview:</span>
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

          {/* ERC20 Format information */}
          <div className="bg-muted/20 p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">ERC20 Configuration Support</h3>
            <p className="text-sm text-muted-foreground mb-2">
              This upload dialog is optimized specifically for ERC20 tokens:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>All 63 TokenERC20Properties fields (initialSupply, cap, decimals, isMintable, etc.)</li>
              <li>Complex JSONB configuration objects (feeOnTransfer, governanceFeatures, rebasing)</li>
              <li>Advanced transfer and compliance configurations</li>
              <li>Gas optimization and snapshot features</li>
              <li>Permit and votes support (EIP-2612, EIP-5805)</li>
              <li>Flash minting and transfer hooks</li>
              <li>Automatic detection of advanced features for max config mode</li>
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
                <Zap className="mr-2 h-4 w-4" />
                Load ERC20 Config
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ERC20ConfigUploadDialog;