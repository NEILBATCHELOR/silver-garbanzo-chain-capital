/**
 * ERC1155ConfigUploadDialog.tsx
 * 
 * Comprehensive JSON configuration upload dialog specifically for ERC1155 tokens.
 * Covers ALL 69+ fields from TokenERC1155Properties table and related ERC1155 tables.
 * 
 * Supports:
 * - All ERC1155 core properties (baseUri, metadataStorage, batch operations, etc.)
 * - Token types and multi-token functionality
 * - Crafting recipes and gaming mechanics
 * - Discount tiers and pricing structures
 * - URI mappings and metadata management
 * - Container and batch configurations
 * - Supply tracking and balance management
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
  Package,
  Code,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenFormData } from "../../types";
import { TokenStandard } from "@/types/core/centralModels";
import { useToast } from "@/components/ui/use-toast";

interface ERC1155ConfigUploadDialogProps {
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
    hasERC1155Properties: boolean;
    hasTokenTypes: boolean;
    hasCraftingRecipes: boolean;
    hasDiscountTiers: boolean;
    hasUriMappings: boolean;
    hasBalanceData: boolean;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
  };
}

const ERC1155ConfigUploadDialog = ({
  open,
  onOpenChange,
  onUploadComplete,
}: ERC1155ConfigUploadDialogProps) => {
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
   * ERC1155-specific JSON processing with comprehensive field mapping
   * Covers all 69+ fields from TokenERC1155Properties and related tables
   */
  const processERC1155JsonData = (jsonData: any): ProcessingResult => {
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
    // CORE ERC1155 FIELD MAPPINGS (ALL 69+ FIELDS)
    // ==========================================

    // Core token information
    const coreFieldMappings = {
      name: [
        'name', 'tokenName', 'title', 'token_name', 'collectionName', 'multiTokenName'
      ],
      symbol: [
        'symbol', 'tokenSymbol', 'ticker', 'token_symbol', 'collectionSymbol'
      ],
      
      // Metadata and URI management
      baseUri: [
        'baseUri', 'base_uri', 'baseURL', 'metadataUri', 'tokenUri', 'uriBase'
      ],
      metadataStorage: [
        'metadataStorage', 'metadata_storage', 'storage', 'storageType', 'storageProvider'
      ],
      dynamicUris: [
        'dynamicUris', 'dynamic_uris', 'dynamicMetadata', 'mutableUris', 'updatableUris'
      ],
      updatableUris: [
        'updatableUris', 'updatable_uris', 'mutableMetadata', 'dynamicMetadata'
      ],
      
      // Royalty configuration (EIP-2981)
      hasRoyalty: [
        'hasRoyalty', 'has_royalty', 'royalty', 'royaltyEnabled', 'enableRoyalty'
      ],
      royaltyPercentage: [
        'royaltyPercentage', 'royalty_percentage', 'royaltyFee', 'royaltyRate'
      ],
      royaltyReceiver: [
        'royaltyReceiver', 'royalty_receiver', 'royaltyAddress', 'royaltyRecipient'
      ],
      
      // Access control
      accessControl: [
        'accessControl', 'access_control', 'permissions', 'controlType'
      ],
      
      // Batch operations
      batchMintingEnabled: [
        'batchMintingEnabled', 'batch_minting_enabled', 'batchMinting', 'bulkMinting'
      ],
      
      // Container support
      containerEnabled: [
        'containerEnabled', 'container_enabled', 'containerSupport', 'bundleSupport'
      ],
      
      // Compliance and restrictions
      transferRestrictions: [
        'transferRestrictions', 'transfer_restrictions', 'restrictions', 'transferLimits'
      ],
      
      // Supply management
      supplyTracking: [
        'supplyTracking', 'supply_tracking', 'trackSupply', 'supplyManagement'
      ],
      isBurnable: [
        'isBurnable', 'is_burnable', 'burnable', 'canBurn', 'allowBurning'
      ],
      isPausable: [
        'isPausable', 'is_pausable', 'pausable', 'canPause', 'allowPausing'
      ],
      
      // Advanced features
      enableApprovalForAll: [
        'enableApprovalForAll', 'enable_approval_for_all', 'approvalForAll'
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

    // Dynamic URI Configuration
    const dynamicUriConfigMappings = [
      'dynamicUriConfig', 'dynamic_uri_config', 'uriConfiguration', 'metadataConfig'
    ];
    
    for (const field of dynamicUriConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.dynamicUriConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Batch Minting Configuration
    const batchMintingConfigMappings = [
      'batchMintingConfig', 'batch_minting_config', 'batchConfig', 'bulkMintConfig'
    ];
    
    for (const field of batchMintingConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.batchMintingConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Batch Transfer Limits
    const batchTransferLimitsMappings = [
      'batchTransferLimits', 'batch_transfer_limits', 'transferLimits', 'batchLimits'
    ];
    
    for (const field of batchTransferLimitsMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.batchTransferLimits = value;
        fieldsDetected++;
        break;
      }
    }

    // Container Configuration
    const containerConfigMappings = [
      'containerConfig', 'container_config', 'bundleConfig', 'containerSettings'
    ];
    
    for (const field of containerConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.containerConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Whitelist Configuration
    const whitelistConfigMappings = [
      'whitelistConfig', 'whitelist_config', 'allowlist', 'accessList'
    ];
    
    for (const field of whitelistConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.whitelistConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // Sales Configuration
    const salesConfigMappings = [
      'salesConfig', 'sales_config', 'saleConfiguration', 'marketConfig'
    ];
    
    for (const field of salesConfigMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        mappedData.salesConfig = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC1155 RELATED ARRAYS AND OBJECTS
    // ==========================================

    // Token Types (token_erc1155_types table)
    const tokenTypesMappings = [
      'tokenTypes', 'types', 'erc1155Types', 'multiTokenTypes', 'tokenCategories',
      'categories', 'classes', 'variants', 'editions'
    ];
    
    for (const field of tokenTypesMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.tokenTypes = value;
        fieldsDetected++;
        break;
      }
    }

    // URI Mappings (token_erc1155_uri_mappings table)
    const uriMappingsMappings = [
      'uriMappings', 'uris', 'erc1155UriMappings', 'metadataUris', 'tokenUris',
      'mappings', 'links', 'references'
    ];
    
    for (const field of uriMappingsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.uriMappings = value;
        fieldsDetected++;
        break;
      }
    }

    // Initial Balances (token_erc1155_balances table)
    const initialBalancesMappings = [
      'initialBalances', 'balances', 'erc1155Balances', 'startingBalances',
      'allocations', 'distributions'
    ];
    
    for (const field of initialBalancesMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.initialBalances = value;
        fieldsDetected++;
        break;
      }
    }

    // Crafting Recipes (token_erc1155_crafting_recipes table)
    const craftingRecipesMappings = [
      'craftingRecipes', 'crafting_recipes', 'recipes', 'gameRecipes',
      'combinations', 'synthesis'
    ];
    
    for (const field of craftingRecipesMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.craftingRecipes = value;
        fieldsDetected++;
        break;
      }
    }

    // Discount Tiers (token_erc1155_discount_tiers table)
    const discountTiersMappings = [
      'discountTiers', 'discount_tiers', 'pricingTiers', 'priceReductions',
      'bulkDiscounts', 'volumeDiscounts'
    ];
    
    for (const field of discountTiersMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.discountTiers = value;
        fieldsDetected++;
        break;
      }
    }

    // Type Configs (token_erc1155_type_configs table)
    const typeConfigsMappings = [
      'typeConfigs', 'type_configs', 'tokenTypeConfigs', 'categoryConfigs'
    ];
    
    for (const field of typeConfigsMappings) {
      const value = getNestedValue(jsonData, field);
      if (Array.isArray(value)) {
        mappedData.typeConfigs = value;
        fieldsDetected++;
        break;
      }
    }

    // ==========================================
    // ERC1155 PROPERTIES OBJECT MAPPING
    // ==========================================
    
    const erc1155PropertiesMappings = [
      'erc1155Properties', 'erc1155', 'properties', 'multiTokenProperties', 'erc1155Config'
    ];
    
    for (const field of erc1155PropertiesMappings) {
      const value = getNestedValue(jsonData, field);
      if (value && typeof value === 'object') {
        // Map the entire ERC1155 properties object
        mappedData.erc1155Properties = value;
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
    mappedData.standard = TokenStandard.ERC1155;
    fieldsDetected++;

    // Automatically set to max config mode if complex features detected
    if (mappedData.tokenTypes || mappedData.craftingRecipes || 
        mappedData.discountTiers || mappedData.uriMappings ||
        mappedData.batchMintingConfig || mappedData.containerConfig ||
        mappedData.whitelistConfig || mappedData.salesConfig ||
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
      hasERC1155Properties: !!(mappedData.erc1155Properties || 
        Object.keys(coreFieldMappings).some(field => field in mappedData)),
      hasTokenTypes: !!mappedData.tokenTypes,
      hasCraftingRecipes: !!mappedData.craftingRecipes,
      hasDiscountTiers: !!mappedData.discountTiers,
      hasUriMappings: !!mappedData.uriMappings,
      hasBalanceData: !!mappedData.initialBalances,
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
    if (!mappedData.tokenTypes || !Array.isArray(mappedData.tokenTypes) || mappedData.tokenTypes.length === 0) {
      warnings.push("No token types detected - ERC1155 tokens typically define multiple token types");
    }
    if (fieldsDetected === 0) {
      warnings.push("No ERC1155-specific fields detected - uploading raw JSON data");
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
        
        const result = processERC1155JsonData(jsonData);
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
        description: "Please enter ERC1155 JSON configuration data."
      });
      return;
    }

    setIsProcessing(true);
    try {
      const jsonData = JSON.parse(jsonText);
      setRawJsonData(jsonData);
      
      const result = processERC1155JsonData(jsonData);
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
        description: "No ERC1155 configuration data to upload."
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
        title: "ERC1155 Configuration Loaded",
        description: `Successfully loaded ${processingResult.fieldsDetected || 'unknown number of'} ERC1155 fields into the form.`
      });
    }, 500);
  };

  // Download ERC1155 template
  const downloadERC1155Template = () => {
    const template = {
      name: "Example Multi-Token Collection",
      symbol: "EMC",
      standard: "ERC-1155",
      baseUri: "https://api.example.com/metadata/{id}.json",
      metadataStorage: "ipfs",
      dynamicUris: true,
      updatableUris: false,
      hasRoyalty: true,
      royaltyPercentage: "2.5",
      royaltyReceiver: "0x0000000000000000000000000000000000000000",
      accessControl: "roles",
      batchMintingEnabled: true,
      containerEnabled: true,
      transferRestrictions: false,
      supplyTracking: true,
      isBurnable: true,
      isPausable: false,
      enableApprovalForAll: true,
      
      // ERC1155 Properties
      erc1155Properties: {
        baseUri: "https://api.example.com/metadata/{id}.json",
        metadataStorage: "ipfs",
        dynamicUris: true,
        updatableUris: false,
        hasRoyalty: true,
        royaltyPercentage: "2.5",
        royaltyReceiver: "0x0000000000000000000000000000000000000000",
        accessControl: "roles",
        batchMintingEnabled: true,
        containerEnabled: true,
        transferRestrictions: false,
        supplyTracking: true,
        isBurnable: true,
        isPausable: false,
        enableApprovalForAll: true
      },
      
      // Token Types
      tokenTypes: [
        {
          tokenTypeId: "1",
          name: "Common Weapon",
          description: "A basic weapon for combat",
          maxSupply: "10000",
          fungibilityType: "fungible",
          metadata: {
            image: "https://example.com/weapons/common.png",
            attributes: [
              { "trait_type": "Rarity", "value": "Common" },
              { "trait_type": "Type", "value": "Weapon" },
              { "trait_type": "Damage", "value": 10 }
            ]
          }
        },
        {
          tokenTypeId: "2",
          name: "Rare Shield",
          description: "A rare defensive item",
          maxSupply: "1000",
          fungibilityType: "semi-fungible",
          metadata: {
            image: "https://example.com/shields/rare.png",
            attributes: [
              { "trait_type": "Rarity", "value": "Rare" },
              { "trait_type": "Type", "value": "Shield" },
              { "trait_type": "Defense", "value": 25 }
            ]
          }
        }
      ],
      
      // URI Mappings
      uriMappings: [
        {
          tokenTypeId: "1",
          uri: "https://api.example.com/metadata/weapons/common.json"
        },
        {
          tokenTypeId: "2",
          uri: "https://api.example.com/metadata/shields/rare.json"
        }
      ],
      
      // Initial Balances
      initialBalances: [
        {
          tokenTypeId: "1",
          address: "0x0000000000000000000000000000000000000000",
          amount: "1000"
        },
        {
          tokenTypeId: "2",
          address: "0x0000000000000000000000000000000000000000",
          amount: "100"
        }
      ],
      
      // Crafting Recipes (Gaming mechanics)
      craftingRecipes: [
        {
          outputTokenTypeId: "2",
          outputQuantity: 1,
          inputTokenTypes: [
            { tokenTypeId: "1", quantity: 3 }
          ],
          cooldownPeriod: 3600,
          enabled: true
        }
      ],
      
      // Discount Tiers (Bulk purchasing)
      discountTiers: [
        {
          tokenTypeId: "1",
          minimumQuantity: 10,
          discountPercentage: "5.0",
          tierName: "Bulk Discount"
        },
        {
          tokenTypeId: "1",
          minimumQuantity: 100,
          discountPercentage: "15.0",
          tierName: "Wholesale Discount"
        }
      ],
      
      // Type Configurations
      typeConfigs: [
        {
          tokenTypeId: "1",
          mintingEnabled: true,
          burningEnabled: true,
          transferEnabled: true,
          maxPerWallet: "1000"
        },
        {
          tokenTypeId: "2",
          mintingEnabled: true,
          burningEnabled: false,
          transferEnabled: true,
          maxPerWallet: "10"
        }
      ],
      
      // Configuration Objects
      dynamicUriConfig: {
        enabled: true,
        baseTemplate: "https://api.example.com/metadata/{id}.json",
        updateFrequency: "daily"
      },
      
      batchMintingConfig: {
        enabled: true,
        maxBatchSize: 100,
        gasOptimization: true
      },
      
      batchTransferLimits: {
        maxTokenTypesPerBatch: 10,
        maxQuantityPerType: "1000"
      },
      
      containerConfig: {
        enabled: true,
        allowNesting: true,
        maxContainerSize: 50
      },
      
      whitelistConfig: {
        enabled: false,
        addresses: [],
        whitelistType: "permissive"
      },
      
      salesConfig: {
        enabled: true,
        currency: "ETH",
        pricesPerType: {
          "1": "0.01",
          "2": "0.05"
        }
      }
    };

    const jsonContent = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ERC1155_comprehensive_template.json");
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
        description: "ERC1155 configuration data copied to clipboard."
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
            <Package className="h-5 w-5 text-primary" />
            <span>ERC1155 Multi-Token Configuration Upload</span>
            <Badge variant="outline">69+ Fields</Badge>
          </DialogTitle>
          <DialogDescription>
            Upload or paste JSON configuration data specifically for ERC1155 multi-tokens.
            Supports all TokenERC1155Properties fields, token types, crafting recipes, and gaming mechanics.
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
                <Label htmlFor="jsonFile">ERC1155 Multi-Token JSON Configuration File</Label>
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
                    onClick={downloadERC1155Template}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    ERC1155 Template
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Text Input Tab */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonText">ERC1155 Multi-Token JSON Configuration Data</Label>
                <Textarea
                  id="jsonText"
                  placeholder='{"name": "My Gaming Collection", "symbol": "MGC", "baseUri": "https://api.example.com/{id}.json", "tokenTypes": [...], ...}'
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
                  Process ERC1155 JSON
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Processing indicator */}
          {isProcessing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Processing ERC1155 multi-token configuration...
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
                <div className="font-medium mb-1 text-green-800">ERC1155 Configuration Ready!</div>
                <div className="text-sm text-green-700">
                  Successfully mapped {processingResult.fieldsDetected} ERC1155 fields.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Analysis */}
          {processingResult && processingResult.structureAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>ERC1155 Configuration Analysis</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">ERC-1155</Badge>
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
                    <span className="font-medium">ERC1155 Properties:</span>{" "}
                    {processingResult.structureAnalysis.hasERC1155Properties ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Token Types:</span>{" "}
                    {processingResult.structureAnalysis.hasTokenTypes ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Crafting Recipes:</span>{" "}
                    {processingResult.structureAnalysis.hasCraftingRecipes ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">Discount Tiers:</span>{" "}
                    {processingResult.structureAnalysis.hasDiscountTiers ? "✓" : "✗"}
                  </div>
                  <div>
                    <span className="font-medium">URI Mappings:</span>{" "}
                    {processingResult.structureAnalysis.hasUriMappings ? "✓" : "✗"}
                  </div>
                </div>

                {/* Sample mapped fields preview */}
                {processingResult.mappedData && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ERC1155 Fields Preview:</span>
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

          {/* ERC1155 Format information */}
          <div className="bg-muted/20 p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">ERC1155 Multi-Token Configuration Support</h3>
            <p className="text-sm text-muted-foreground mb-2">
              This upload dialog is optimized specifically for ERC1155 multi-tokens:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>All 69+ TokenERC1155Properties fields (baseUri, batchMinting, container support, etc.)</li>
              <li>Token types and multi-token functionality with metadata</li>
              <li>Crafting recipes and gaming mechanics for game tokens</li>
              <li>Discount tiers and bulk pricing structures</li>
              <li>URI mappings and dynamic metadata management</li>
              <li>Container and batch operation configurations</li>
              <li>Supply tracking and balance management</li>
              <li>Royalty configuration with EIP-2981 support</li>
              <li>Automatic detection of gaming features for max config mode</li>
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
                <Package className="mr-2 h-4 w-4" />
                Load ERC1155 Config
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ERC1155ConfigUploadDialog;