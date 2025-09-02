/**
 * ERC721ConfigUploadDialog.tsx
 * 
 * Comprehensive JSON configuration upload dialog specifically for ERC721 tokens.
 * Covers ALL 84+ fields from TokenERC721Properties table and related ERC721 tables.
 * 
 * Supports:
 * - All ERC721 core properties (baseUri, metadataStorage, maxSupply, etc.)
 * - Royalty configuration (EIP-2981)
 * - Minting phases and launch configurations
 * - Token attributes and trait definitions
 * - Sales and whitelist configurations
 * - Permission and access control settings
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
  Palette,
  Code,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenFormData } from "../../types";
import { TokenStandard } from "@/types/core/centralModels";
import { useToast } from "@/components/ui/use-toast";

interface ERC721ConfigUploadDialogProps {
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
    hasERC721Properties: boolean;
    hasTokenAttributes: boolean;
    hasMintPhases: boolean;
    hasRoyaltyConfig: boolean;
    hasTraitDefinitions: boolean;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
  };
}

const ERC721ConfigUploadDialog = ({
  open,
  onOpenChange,
  onUploadComplete,
}: ERC721ConfigUploadDialogProps) => {
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
   * ERC721-specific JSON processing with comprehensive field mapping
   * Covers all 84+ fields from TokenERC721Properties and related tables
   */
  const processERC721JsonData = (jsonData: any): ProcessingResult => {
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
    // CORE ERC721 FIELD MAPPINGS (ALL 84+ FIELDS)
    // ==========================================

    // Core token information
    const coreFieldMappings = {
      name: [
        'name', 'tokenName', 'title', 'token_name', 'collectionName', 'nftName'
      ],
      symbol: [
        'symbol', 'tokenSymbol', 'ticker', 'token_symbol', 'collectionSymbol', 'nftSymbol'
      ],
      
      // Metadata and URI management
      baseUri: [
        'baseUri', 'base_uri', 'baseURL', 'metadataUri', 'tokenUri', 'uriBase', 'metadataBaseUri'
      ],
      metadataStorage: [
        'metadataStorage', 'metadata_storage', 'storage', 'storageType', 'storageProvider',
        'storageMethod', 'hostingType', 'dataStorage'
      ],
      
      // Supply management
      maxSupply: [
        'maxSupply', 'max_supply', 'totalSupply', 'supply', 'cap', 'limit'
      ],
      
      // Royalty configuration (EIP-2981)
      hasRoyalty: [
        'hasRoyalty', 'has_royalty', 'royalty', 'royaltyEnabled', 'enableRoyalty', 'royaltySupport'
      ],
      royaltyPercentage: [
        'royaltyPercentage', 'royalty_percentage', 'royaltyFee', 'royaltyRate', 'royaltyBps'
      ],
      royaltyReceiver: [
        'royaltyReceiver', 'royalty_receiver', 'royaltyAddress', 'royaltyRecipient', 'feeRecipient'
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
      
      // Asset and minting configuration
      assetType: [
        'assetType', 'asset_type', 'tokenType', 'nftType', 'artworkType', 'collectibleType'
      ],
      mintingMethod: [
        'mintingMethod', 'minting_method', 'mintMethod', 'mintingStrategy', 'mintingType'
      ],
      autoIncrementIds: [
        'autoIncrementIds', 'auto_increment_ids', 'sequentialIds', 'incrementalIds', 'autoIds'
      ],
      
      // Enumeration and extensions
      enumerable: [
        'enumerable', 'supportsEnumeration', 'enumerationSupport', 'isEnumerable'
      ],
      supportsEnumeration: [
        'supportsEnumeration', 'enumerable', 'enumerationSupport', 'isEnumerable'
      ],
      
      // URI and metadata management
      uriStorage: [
        'uriStorage', 'uri_storage', 'metadataLocation', 'storageMethod', 'uriMethod'
      ],
      updatableUris: [
        'updatableUris', 'updatable_uris', 'mutableMetadata', 'dynamicMetadata', 'editableMetadata'
      ],
      
      // Access control
      accessControl: [
        'accessControl', 'access_control', 'permissions', 'controlType', 'permissionModel'
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

    // Sales Configuration
    const salesConfigMappings = [
      'salesConfig', 'sales_config', 'mintingConfig', 'saleConfiguration',
      'launchConfig', 'publicSale', 'preSale', 'mintConfig'
    ];
    
    for (const field of salesConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.salesConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Whitelist Configuration
    const whitelistConfigMappings = [
      'whitelistConfig', 'whitelist_config', 'allowlistConfig', 'presaleConfig',
      'whitelist', 'allowlist', 'permissionList', 'accessList'
    ];
    
    for (const field of whitelistConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.whitelistConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Permission Configuration
    const permissionConfigMappings = [
      'permissionConfig', 'permission_config', 'accessConfig', 'roleConfig',
      'permissions', 'roles', 'accessRoles'
    ];
    
    for (const field of permissionConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.permissionConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC721 RELATED ARRAYS AND OBJECTS
    // ==========================================

    // Token Attributes (token_erc721_attributes table)
    const tokenAttributesMappings = [
      'tokenAttributes', 'attributes', 'traits', 'metadata.attributes', 'nftAttributes',
      'properties', 'characteristics', 'features', 'specs', 'traitTypes'
    ];
    
    for (const field of tokenAttributesMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.tokenAttributes = value;
        fieldsDetected++;
        break;
      }
    }

    // Mint Phases (token_erc721_mint_phases table)
    const mintPhasesMappings = [
      'mintPhases', 'mint_phases', 'launchPhases', 'salePhases', 'phases',
      'mintingPhases', 'releasePhases', 'dropPhases'
    ];
    
    for (const field of mintPhasesMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.mintPhases = value;
        fieldsDetected++;
        break;
      }
    }

    // Trait Definitions (token_erc721_trait_definitions table)
    const traitDefinitionsMappings = [
      'traitDefinitions', 'trait_definitions', 'attributeDefinitions', 'metadataSchema',
      'traitSchema', 'attributeSchema', 'propertyDefinitions'
    ];
    
    for (const field of traitDefinitionsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.traitDefinitions = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC721 PROPERTIES OBJECT MAPPING
    // ==========================================
    
    const erc721PropertiesMappings = [
      'erc721Properties', 'erc721', 'properties', 'nftProperties', 'erc721Config'
    ];
    
    for (const field of erc721PropertiesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        // Map the entire ERC721 properties object
        mappedData.erc721Properties = value;
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
    // METADATA OBJECT PROCESSING
    // ==========================================

    // Process metadata for OpenSea and standard NFT metadata
    if (jsonData.metadata && typeof jsonData.metadata === 'object') {
      mappedData.metadata = jsonData.metadata;
      fieldsDetected++;
      
      // Extract common NFT metadata fields
      const metadata = jsonData.metadata;
      if (metadata.name && !mappedData.name) {
        mappedData.name = metadata.name;
        fieldsDetected++;
      }
      if (metadata.description && !mappedData.description) {
        mappedData.description = metadata.description;
        fieldsDetected++;
      }
      if (metadata.image && !mappedData.image) {
        mappedData.image = metadata.image;
        fieldsDetected++;
      }
      if (metadata.attributes && !mappedData.tokenAttributes) {
        mappedData.tokenAttributes = metadata.attributes;
        fieldsDetected++;
      }
    }

    // Map blocks configuration
    if (jsonData.blocks && typeof jsonData.blocks === 'object') {
      mappedData.blocks = jsonData.blocks;
      fieldsDetected++;
    }

    // Set standard and config mode
    mappedData.standard = TokenStandard.ERC721;
    fieldsDetected++;

    // Automatically set to max config mode if complex features detected
    if (mappedData.salesConfig || mappedData.whitelistConfig || 
        mappedData.permissionConfig || mappedData.tokenAttributes ||
        mappedData.mintPhases || mappedData.traitDefinitions ||
        fieldsDetected > 15) {
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
      hasERC721Properties: !!(mappedData.erc721Properties || 
        Object.keys(coreFieldMappings).some(field => field in mappedData)),
      hasTokenAttributes: !!mappedData.tokenAttributes,
      hasMintPhases: !!mappedData.mintPhases,
      hasRoyaltyConfig: !!(mappedData.hasRoyalty || mappedData.royaltyPercentage || mappedData.royaltyReceiver),
      hasTraitDefinitions: !!mappedData.traitDefinitions,
      estimatedComplexity: fieldsDetected < 10 ? 'simple' as const : 
                          fieldsDetected < 25 ? 'medium' as const : 'complex' as const
    };

    // Generate warnings (non-blocking)
    if (!mappedData.name && !mappedData.tokenName) {
      warnings.push("No collection name detected - consider adding 'name' field");
    }
    if (!mappedData.symbol && !mappedData.tokenSymbol) {
      warnings.push("No collection symbol detected - consider adding 'symbol' field");
    }
    if (!mappedData.baseUri && !mappedData.metadataUri) {
      warnings.push("No base URI detected - metadata may not be accessible");
    }
    if (fieldsDetected === 0) {
      warnings.push("No ERC721-specific fields detected - uploading raw JSON data");
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
        
        const result = processERC721JsonData(jsonData);
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
        description: "Please enter ERC721 JSON configuration data."
      });
      return;
    }

    setIsProcessing(true);
    try {
      const jsonData = JSON.parse(jsonText);
      setRawJsonData(jsonData);
      
      const result = processERC721JsonData(jsonData);
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
        description: "No ERC721 configuration data to upload."
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
        title: "ERC721 Configuration Loaded",
        description: `Successfully loaded ${processingResult.fieldsDetected || 'unknown number of'} ERC721 fields into the form.`
      });
    }, 500);
  };

  // Download ERC721 template
  const downloadERC721Template = () => {
    const template = {
      name: "Example NFT Collection",
      symbol: "ENC",
      standard: "ERC-721",
      baseUri: "https://api.example.com/metadata/",
      metadataStorage: "ipfs",
      maxSupply: "10000",
      hasRoyalty: true,
      royaltyPercentage: "2.5",
      royaltyReceiver: "0x0000000000000000000000000000000000000000",
      isMintable: true,
      isBurnable: false,
      isPausable: false,
      assetType: "unique_asset",
      mintingMethod: "open",
      autoIncrementIds: true,
      enumerable: true,
      supportsEnumeration: true,
      uriStorage: "tokenId",
      updatableUris: false,
      accessControl: "ownable",
      
      // ERC721 Properties
      erc721Properties: {
        baseUri: "https://api.example.com/metadata/",
        metadataStorage: "ipfs",
        maxSupply: "10000",
        hasRoyalty: true,
        royaltyPercentage: "2.5",
        royaltyReceiver: "0x0000000000000000000000000000000000000000",
        isMintable: true,
        isBurnable: false,
        isPausable: false,
        assetType: "unique_asset",
        mintingMethod: "open",
        autoIncrementIds: true,
        enumerable: true,
        uriStorage: "tokenId",
        accessControl: "ownable",
        updatableUris: false
      },
      
      // Token Attributes
      tokenAttributes: [
        {
          traitType: "rarity",
          values: ["common", "rare", "epic", "legendary"]
        },
        {
          traitType: "element",
          values: ["fire", "water", "earth", "air"]
        },
        {
          traitType: "power",
          values: ["1", "2", "3", "4", "5"]
        }
      ],
      
      // Mint Phases
      mintPhases: [
        {
          phaseName: "Private Sale",
          phaseOrder: 1,
          startTime: "2024-01-01T00:00:00Z",
          endTime: "2024-01-07T23:59:59Z",
          maxSupply: 1000,
          price: "0.05",
          maxPerWallet: 2,
          whitelistRequired: true
        },
        {
          phaseName: "Public Sale",
          phaseOrder: 2,
          startTime: "2024-01-08T00:00:00Z",
          endTime: "2024-01-31T23:59:59Z",
          maxSupply: 9000,
          price: "0.08",
          maxPerWallet: 10,
          whitelistRequired: false
        }
      ],
      
      // Trait Definitions
      traitDefinitions: [
        {
          traitName: "rarity",
          traitType: "string",
          possibleValues: {
            "common": 0.6,
            "rare": 0.25,
            "epic": 0.1,
            "legendary": 0.05
          },
          isRequired: true
        },
        {
          traitName: "element",
          traitType: "string",
          possibleValues: {
            "fire": 0.25,
            "water": 0.25,
            "earth": 0.25,
            "air": 0.25
          },
          isRequired: true
        }
      ],
      
      // Sales Configuration
      salesConfig: {
        enabled: true,
        preSaleEnabled: true,
        publicSaleEnabled: true,
        dutchAuction: false,
        blindAuction: false
      },
      
      // Whitelist Configuration
      whitelistConfig: {
        enabled: true,
        merkleTree: true,
        maxWhitelistSpots: 1000,
        whitelistPrice: "0.05"
      },
      
      // Permission Configuration
      permissionConfig: {
        minterRole: ["0x0000000000000000000000000000000000000000"],
        pauserRole: ["0x0000000000000000000000000000000000000000"],
        adminRole: ["0x0000000000000000000000000000000000000000"]
      },
      
      // Standard NFT Metadata
      metadata: {
        name: "Example NFT Collection",
        description: "A comprehensive example NFT collection with all features",
        image: "https://example.com/collection-image.png",
        external_url: "https://example.com",
        seller_fee_basis_points: 250,
        fee_recipient: "0x0000000000000000000000000000000000000000"
      }
    };

    const jsonContent = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ERC721_comprehensive_template.json");
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
        description: "ERC721 configuration data copied to clipboard."
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
            <Palette className="h-5 w-5 text-primary" />
            <span>ERC721 NFT Configuration Upload</span>
            <Badge variant="outline">84+ Fields</Badge>
          </DialogTitle>
          <DialogDescription>
            Upload or paste JSON configuration data specifically for ERC721 NFT tokens.
            Supports all TokenERC721Properties fields, attributes, mint phases, and trait definitions.
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
                <Label htmlFor="jsonFile">ERC721 NFT JSON Configuration File</Label>
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
                    onClick={downloadERC721Template}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    ERC721 Template
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Text Input Tab */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonText">ERC721 NFT JSON Configuration Data</Label>
                <Textarea
                  id="jsonText"
                  placeholder='{"name": "My NFT Collection", "symbol": "MNC", "baseUri": "https://api.example.com/", "maxSupply": "10000", ...}'
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
                  Process ERC721 JSON
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Processing indicator */}
          {isProcessing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Processing ERC721 NFT configuration...
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
                <div className="font-medium mb-1 text-green-800">ERC721 NFT Configuration Ready!</div>
                <div className="text-sm text-green-700">
                  Successfully mapped {processingResult.fieldsDetected} ERC721 fields.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Analysis */}
          {processingResult && processingResult.structureAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>ERC721 NFT Configuration Analysis</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">ERC-721</Badge>
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
                    <span className="font-medium">ERC721 Properties:</span>{" "}
                    {processingResult.structureAnalysis.hasERC721Properties ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Token Attributes:</span>{" "}
                    {processingResult.structureAnalysis.hasTokenAttributes ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Mint Phases:</span>{" "}
                    {processingResult.structureAnalysis.hasMintPhases ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Royalty Config:</span>{" "}
                    {processingResult.structureAnalysis.hasRoyaltyConfig ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Trait Definitions:</span>{" "}
                    {processingResult.structureAnalysis.hasTraitDefinitions ? "✓" : "✗"}
                  </div>
                </div>

                {/* Sample mapped fields preview */}
                {processingResult.mappedData && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ERC721 Fields Preview:</span>
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

          {/* ERC721 Format information */}
          <div className="bg-muted/20 p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">ERC721 NFT Configuration Support</h3>
            <p className="text-sm text-muted-foreground mb-2">
              This upload dialog is optimized specifically for ERC721 NFT tokens:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>All 84+ TokenERC721Properties fields (baseUri, metadataStorage, royalty, etc.)</li>
              <li>Token attributes and trait definitions for metadata schema</li>
              <li>Mint phases for complex launch configurations</li>
              <li>Royalty configuration with EIP-2981 support</li>
              <li>Sales and whitelist configurations for minting</li>
              <li>Permission and access control settings</li>
              <li>Support for OpenSea and standard NFT metadata formats</li>
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
                <Palette className="mr-2 h-4 w-4" />
                Load ERC721 Config
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ERC721ConfigUploadDialog;