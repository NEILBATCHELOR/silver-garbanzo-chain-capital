/**
 * Token Test Utility
 * 
 * A comprehensive utility component for testing CRUD operations on tokens
 * through a JSON editor interface. Supports all token standards and both
 * basic and advanced modes.
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Check, AlertCircle, Play, RefreshCw, Copy, X, FileText } from 'lucide-react';

import { TokenStandard } from '@/types/core/centralModels';
import { 
  createToken, 
  getToken, 
  updateToken, 
  deleteToken, 
  getCompleteToken,
  getTokensByProject 
} from '../services/tokenService';
import { validateTokenData } from '../services/tokenDataValidation';
import { getTemplateForStandard } from './tokenTemplates';
import { JsonViewer } from './JsonViewer';
import ProductSelector, { FileSelectionResult } from '../components/ProductSelector';

// Available modes for the editor
type EditorMode = 'create' | 'read' | 'update' | 'delete';

// Configuration modes
type ConfigMode = 'min' | 'max';

// Logger helper for consistent console logging
const logger = {
  error: (message: string, details: any) => {
    console.error(`[TokenTestUtility] ${message}`, details);
    return message;
  },
  info: (message: string, details?: any) => {
    console.info(`[TokenTestUtility] ${message}`, details || '');
    return message;
  }
};

const TokenTestUtility: React.FC = () => {
  const { projectId = '' } = useParams<{ projectId: string }>();
  
  // State for different aspects of the utility
  const [tokenId, setTokenId] = useState<string>('');
  const [tokens, setTokens] = useState<any[]>([]);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [configMode, setConfigMode] = useState<ConfigMode>('min');
  const [tokenStandard, setTokenStandard] = useState<TokenStandard>(TokenStandard.ERC20);
  const [jsonData, setJsonData] = useState<string>('');
  const [responseData, setResponseData] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Load existing token IDs when component mounts
  useEffect(() => {
    const fetchTokenIds = async () => {
      try {
        setIsLoading(true);
        logger.info(`Fetching tokens for project: ${projectId}`);
        // Use the token service to get tokens by project
        const tokens = await getTokensByProject(projectId);
        if (tokens && Array.isArray(tokens)) {
          setTokens(tokens);
          logger.info(`Found ${tokens.length} tokens for project`, tokens);
        } else {
          const message = "No tokens found or invalid response format";
          setError(message);
          logger.error(message, tokens);
        }
      } catch (err: any) {
        const errorMessage = `Failed to fetch token IDs: ${err.message}`;
        console.error('Full error details:', err);
        setError(errorMessage);
        logger.error(errorMessage, {
          error: err,
          stack: err.stack,
          projectId
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch if we have a valid project ID
    if (projectId) {
      fetchTokenIds();
    } else {
      const message = "No project ID provided. Please navigate to this page from a project context.";
      setError(message);
      logger.error(message, { projectId });
    }
  }, [projectId]);
  
  // Generate template data when standard or config mode changes
  useEffect(() => {
    const template = getTemplateForStandard(tokenStandard, configMode);
    setJsonData(JSON.stringify(template, null, 2));
    logger.info(`Template generated for standard: ${tokenStandard}, mode: ${configMode}`);
  }, [tokenStandard, configMode]);
  
  // Reset the form
  const handleReset = () => {
    const template = getTemplateForStandard(tokenStandard, configMode);
    setJsonData(JSON.stringify(template, null, 2));
    setResponseData('');
    setError(null);
    setSuccess(null);
    logger.info('Form reset to template defaults');
  };

  // Clear the response data
  const handleClearResponse = () => {
    setResponseData('');
    setError(null);
    setSuccess(null);
    logger.info('Response cleared');
  };
  


  // Handle loading a token
  const handleLoadToken = async () => {
    if (!tokenId) {
      const message = 'Please select a token ID to load';
      setError(message);
      logger.error(message, { tokenId });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      logger.info(`Loading token with ID: ${tokenId}`);
      const token = await getCompleteToken(tokenId);
      
      // For ERC-4626 tokens, ensure we have all the additional table data
      if (token.standard === TokenStandard.ERC4626 || token.standard === 'ERC-4626') {
        console.log('[TokenTestUtility] 🏛️ Loading ERC-4626 vault token data');
        console.log('[TokenTestUtility] DEBUG: Raw ERC-4626 token data:', token);
        
        // Ensure the additional arrays are present and properly formatted
        if (!token.vaultStrategies) token.vaultStrategies = [];
        if (!token.assetAllocations) token.assetAllocations = [];
        if (!token.feeTiers) token.feeTiers = [];
        if (!token.performanceMetrics) token.performanceMetrics = [];
        if (!token.strategyParams) token.strategyParams = [];
        
        // Also ensure standardArrays contains the data for backwards compatibility
        if (!token.standardArrays) token.standardArrays = {};
        if (!token.standardArrays.strategyParams) token.standardArrays.strategyParams = token.strategyParams;
        if (!token.standardArrays.assetAllocations) token.standardArrays.assetAllocations = token.assetAllocations;
        if (!token.standardArrays.vaultStrategies) token.standardArrays.vaultStrategies = token.vaultStrategies;
        if (!token.standardArrays.feeTiers) token.standardArrays.feeTiers = token.feeTiers;
        if (!token.standardArrays.performanceMetrics) token.standardArrays.performanceMetrics = token.performanceMetrics;
        
        console.log('[TokenTestUtility] ✅ ERC-4626 Additional Tables Loaded:', {
          vaultStrategies: `${token.vaultStrategies.length} strategies`,
          assetAllocations: `${token.assetAllocations.length} allocations`,
          feeTiers: `${token.feeTiers.length} fee tiers`,
          performanceMetrics: `${token.performanceMetrics.length} metrics`,
          strategyParams: `${token.strategyParams.length} parameters`
        });
      }
      
      setJsonData(JSON.stringify(token, null, 2));
      setSuccess('Token loaded successfully with all ERC-4626 data tables');
      logger.info('Token loaded successfully with comprehensive ERC-4626 support', token);
    } catch (err: any) {
      const errorMessage = `Failed to load token: ${err.message}`;
      setError(errorMessage);
      logger.error(errorMessage, {
        error: err,
        stack: err.stack,
        tokenId
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle loading a JSON file from the ProductSelector
  const handleLoadJsonFile = (result: FileSelectionResult) => {
    setJsonData(result.content);
    setResponseData('');
    setError(null);
    setSuccess(null);
    
    // Automatically set the token standard and configuration mode
    setTokenStandard(result.tokenStandard);
    setConfigMode(result.configMode);
    
    logger.info('JSON file loaded from product selector', {
      tokenStandard: result.tokenStandard,
      configMode: result.configMode
    });
  };
  
  // Parse, normalize, and validate JSON data
  const parseAndValidateJson = async (tokenStandard?: TokenStandard) => {
    try {
      const parsedData = JSON.parse(jsonData);
      let normalizedData = parsedData;
      
      // Enhanced JSON Format Handling
      // Skip strict validation for enhanced JSON format to prevent "Invalid JSON" errors
      const hasEnhancedFields = !!(
        parsedData.feeOnTransfer || 
        parsedData.rebasing || 
        parsedData.governanceFeatures || 
        parsedData.standardArrays ||
        parsedData.metadata ||
        parsedData.transferRestrictions ||
        parsedData.yieldStrategy ||
        parsedData.strategyParams ||
        parsedData.assetAllocations ||
        parsedData.performanceMetrics
      );
      
      // If enhanced format detected, use relaxed validation
      if (hasEnhancedFields) {
        console.log('[TokenTestUtility] Enhanced JSON format detected, using relaxed validation');
        
        // Basic validation only - ensure required fields are present
        const requiredFields = ['name', 'symbol', 'standard'];
        const missingFields = requiredFields.filter(field => !parsedData[field] && !parsedData.blocks?.[field]);
        
        if (missingFields.length > 0) {
          const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
          setError(errorMessage);
          logger.error(errorMessage, { missingFields, parsedData });
          return null;
        }
        
        // For enhanced format, just return the parsed data with minimal normalization
        const detectedStandard = parsedData.standard || tokenStandard;
        
        // Set appropriate decimals based on token standard
        let defaultDecimals;
        if (parsedData.decimals !== undefined) {
          defaultDecimals = parsedData.decimals;
        } else {
          // Set standard-specific default decimals
          switch (detectedStandard) {
            case 'ERC-721':
            case 'ERC721':
            case TokenStandard.ERC721:
              defaultDecimals = 0; // NFTs always have 0 decimals
              break;
            case 'ERC-1155':
            case 'ERC1155':  
            case TokenStandard.ERC1155:
              defaultDecimals = 0; // Semi-fungible tokens typically have 0 decimals
              break;
            default:
              defaultDecimals = 18; // ERC-20, ERC-1400, ERC-3525, ERC-4626 default to 18
              break;
          }
        }
        
        return {
          ...parsedData,
          // Ensure standard is in correct format
          standard: detectedStandard,
          // Set appropriate decimals based on token standard
          decimals: defaultDecimals
        };
      }
      
      // Legacy format - use full validation and normalization
      // If properties exist, use them as they are (assuming they're already normalized)
      // Robust normalization: ensure all required fields are present
      if (parsedData.properties) {
        normalizedData = {
          ...parsedData,
          ...parsedData.properties
        };
      }
      // Fallback: fill required fields from blocks if missing
      if (parsedData.blocks) {
        if (normalizedData.decimals === undefined && parsedData.blocks.decimals !== undefined) {
          normalizedData.decimals = parsedData.blocks.decimals;
        }
        if (!normalizedData.securityType && parsedData.blocks.security_type) {
          normalizedData.securityType = parsedData.blocks.security_type;
        }
        if (normalizedData.isIssuable === undefined && (parsedData.blocks.is_issuable !== undefined || parsedData.blocks.issuance_modules !== undefined)) {
          normalizedData.isIssuable = parsedData.blocks.is_issuable ?? parsedData.blocks.issuance_modules;
        }
      }
      
      // Set default decimals if not present (standard-specific)
      if (normalizedData.decimals === undefined) {
        const currentStandard = normalizedData.standard || tokenStandard;
        switch (currentStandard) {
          case 'ERC-721':
          case 'ERC721':
          case TokenStandard.ERC721:
            normalizedData.decimals = 0; // NFTs always have 0 decimals
            break;
          case 'ERC-1155':
          case 'ERC1155':
          case TokenStandard.ERC1155:
            normalizedData.decimals = 0; // Semi-fungible tokens typically have 0 decimals
            break;
          default:
            normalizedData.decimals = 18; // ERC-20, ERC-1400, ERC-3525, ERC-4626 default to 18
            break;
        }
      }
      
      // Fallback: fill required fields from top-level if missing in normalizedData
      if (normalizedData.issuanceModules !== undefined && normalizedData.isIssuable === undefined) {
        normalizedData.isIssuable = normalizedData.issuanceModules;
      }
      if (normalizedData.security_type && !normalizedData.securityType) {
        normalizedData.securityType = normalizedData.security_type;
      }
      
      // Always ensure standard is present at the top level and is a valid enum
      const standardString = parsedData.standard || parsedData.blocks?.standard;
      if (!normalizedData.standard && standardString) {
        // Map string to enum if needed
        const enumMap = {
          'ERC-20': TokenStandard.ERC20,
          'ERC-721': TokenStandard.ERC721,
          'ERC-1155': TokenStandard.ERC1155,
          'ERC-1400': TokenStandard.ERC1400,
          'ERC-3525': TokenStandard.ERC3525,
          'ERC-4626': TokenStandard.ERC4626
        };
        normalizedData.standard = enumMap[standardString] || standardString;
      }
      
      // Force standard value to be present
      if (!normalizedData.standard && tokenStandard) {
        normalizedData.standard = tokenStandard;
      }
      
      // Special handling for ERC-3525 slots
      if ((normalizedData.standard === TokenStandard.ERC3525 || normalizedData.standard === 'ERC-3525') && !normalizedData.slots) {
        // Try to get slots from standardArrays
        if (normalizedData.standardArrays?.slots && Array.isArray(normalizedData.standardArrays.slots)) {
          normalizedData.slots = normalizedData.standardArrays.slots.map(slot => ({
            id: slot.id,
            name: slot.name,
            description: slot.description || ''
          }));
        } else {
          // Add default slot if none exists
          normalizedData.slots = [{ id: "1", name: "Default Slot", description: "Default slot for basic token setup" }];
        }
      }
      
      // Special handling for ERC-1400 partitions
      if ((normalizedData.standard === TokenStandard.ERC1400 || normalizedData.standard === 'ERC-1400') && 
          normalizedData.partitions && Array.isArray(normalizedData.partitions)) {
        // Ensure each partition has an amount field
        normalizedData.partitions = normalizedData.partitions.map(partition => ({
          ...partition,
          amount: partition.amount || "0"
        }));
      }
      
      // Special handling for ERC-4626 validation issues
      if (normalizedData.standard === TokenStandard.ERC4626 || normalizedData.standard === 'ERC-4626') {
        // Default address for required address fields
        const defaultAddress = '0x0000000000000000000000000000000000000000';
        
        // Ensure assetAddress is present and valid
        if (!normalizedData.assetAddress || !/^0x[0-9a-fA-F]{40}$/.test(normalizedData.assetAddress)) {
          normalizedData.assetAddress = defaultAddress;
        }
        
        // Handle strategyController
        if (!normalizedData.strategyController || !/^0x[0-9a-fA-F]{40}$/.test(normalizedData.strategyController)) {
          normalizedData.strategyController = defaultAddress;
        }
        
        // Handle yieldStrategy - convert string to object if needed
        if (typeof normalizedData.yieldStrategy === 'string') {
          normalizedData.yieldStrategy = {
            protocol: [normalizedData.yieldStrategy],
            rebalancingFrequency: 'weekly'
          };
        } else if (!normalizedData.yieldStrategy) {
          normalizedData.yieldStrategy = {
            protocol: ['simple'],
            rebalancingFrequency: 'weekly'
          };
        }
        
        // Ensure vaultStrategy is valid
        const validStrategies = ['simple', 'compound', 'yearn', 'aave', 'custom', 'short_term_treasury', 'long_term_treasury'];
        if (!normalizedData.vaultStrategy || !validStrategies.includes(normalizedData.vaultStrategy)) {
          normalizedData.vaultStrategy = 'simple';
        }
      }
      
      // Validate the data only for legacy format
      const validation = validateTokenData(normalizedData, hasEnhancedFields);
      if (!validation.valid) {
        const validationErrors = validation.errors.map(e => `${e.field} - ${e.message}`).join(', ');
        const errorMessage = `Invalid JSON: ${validationErrors}`;
        setError(errorMessage);
        logger.error(errorMessage, {
          validationResult: validation,
          parsedData: normalizedData
        });
        return null;
      }
      return { data: normalizedData, hasEnhancedFields };
    } catch (err: any) {
      const errorMessage = `Invalid JSON: ${err.message}`;
      setError(errorMessage);
      logger.error(errorMessage, {
        error: err,
        jsonData,
        stack: err.stack
      });
      return null;
    }
  };

  
  // Execute the current operation
  const handleExecute = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setResponseData('');
    
    try {
      let result;
      logger.info(`Executing operation: ${editorMode}`);
      
      switch (editorMode) {
        case 'create':
          // Parse JSON first without validation to extract necessary fields
          try {
            const rawData = JSON.parse(jsonData);
            
            // Check for enhanced fields to determine if we should skip validation
            const hasEnhancedFields = !!(
              rawData.feeOnTransfer || 
              rawData.rebasing || 
              rawData.governanceFeatures || 
              rawData.standardArrays ||
              rawData.metadata ||
              rawData.transferRestrictions ||
              rawData.yieldStrategy ||
              rawData.strategyParams ||
              rawData.assetAllocations ||
              rawData.performanceMetrics ||
              rawData.dexIntegration ||
              rawData.defiFeatures ||
              rawData.bridging ||
              rawData.yieldStrategies ||
              rawData.reflection ||
              rawData.governance ||
              rawData.flashLoan ||
              rawData.stakingPrograms ||
              rawData.security ||
              rawData.fees ||
              rawData.supply ||
              rawData.performance ||
              rawData.analytics ||
              rawData.integrations
            );
            
            // Extract standard from the input data, fall back to UI-selected standard
            const standardStr = rawData.standard || tokenStandard;
            const isERC1400 = standardStr === 'ERC-1400' || standardStr === TokenStandard.ERC1400;
            const isERC3525 = standardStr === 'ERC-3525' || standardStr === TokenStandard.ERC3525;
            const isERC4626 = standardStr === 'ERC-4626' || standardStr === TokenStandard.ERC4626;
            const isERC1155 = standardStr === 'ERC-1155' || standardStr === TokenStandard.ERC1155;
            const isERC721 = standardStr === 'ERC-721' || standardStr === TokenStandard.ERC721;
            const isERC20 = standardStr === 'ERC-20' || standardStr === TokenStandard.ERC20;

            // Create a normalized copy with proper standard format
            const createData = {
              ...rawData,
              // Ensure proper standard format using TokenStandard enum
              standard: isERC1400 ? TokenStandard.ERC1400 : 
                       isERC3525 ? TokenStandard.ERC3525 : 
                       isERC4626 ? TokenStandard.ERC4626 :
                       isERC1155 ? TokenStandard.ERC1155 :
                       isERC721 ? TokenStandard.ERC721 :
                       isERC20 ? TokenStandard.ERC20 :
                       tokenStandard, // Final fallback to UI-selected standard
              // Ensure decimals is present - handle 0 correctly for NFTs
              decimals: rawData.decimals !== undefined ? rawData.decimals : 18,
              // Ensure config_mode is present
              config_mode: rawData.config_mode || 'max',
              // Ensure name is present
              name: rawData.name || rawData.blocks?.name || 'New Token',
              // Ensure symbol is present and uppercase
              symbol: (rawData.symbol || rawData.blocks?.symbol || 'TKN').toUpperCase(),
            };
            
            // Add special handling for ERC-1400 tokens
            if (isERC1400) {
              Object.assign(createData, {
                // Required fields for ERC-1400
                isIssuable: rawData.isIssuable || rawData.issuanceModules || true,
                initialSupply: rawData.initialSupply || rawData.blocks?.initial_supply || "1000000",
                isMintable: rawData.isMintable ?? rawData.blocks?.is_mintable ?? false,
                isBurnable: rawData.isBurnable ?? rawData.blocks?.is_burnable ?? true,
                isPausable: rawData.isPausable ?? rawData.blocks?.is_pausable ?? true,
                requireKyc: rawData.requireKyc ?? rawData.blocks?.require_kyc ?? true,
                securityType: rawData.securityType || rawData.blocks?.security_type || 'derivative',
                documentUri: rawData.documentUri || rawData.blocks?.document_uri || 'https://example.com/doc.pdf',
                controllerAddress: rawData.controllerAddress || rawData.blocks?.controller_address || '0x1111111111111111111111111111111111111111',
                
                // All ERC-1400 arrays - check top-level first, then standardArrays as fallback
                partitions: rawData.partitions || rawData.standardArrays?.partitions || [],
                controllers: rawData.controllers || rawData.standardArrays?.controllers || [],
                documents: rawData.documents || rawData.standardArrays?.documents || [],
                corporateActions: rawData.corporateActions || rawData.standardArrays?.corporateActions || [],
                custodyProviders: rawData.custodyProviders || rawData.standardArrays?.custodyProviders || [],
                regulatoryFilings: rawData.regulatoryFilings || rawData.standardArrays?.regulatoryFilings || [],
                partitionBalances: rawData.partitionBalances || rawData.standardArrays?.partitionBalances || [],
                partitionOperators: rawData.partitionOperators || rawData.standardArrays?.partitionOperators || [],
                partitionTransfers: rawData.partitionTransfers || rawData.standardArrays?.partitionTransfers || [],
              });
            }
            
            // Add special handling for ERC-3525 tokens
            if (isERC3525) {
              Object.assign(createData, {
                // Required fields for ERC-3525
                slots: rawData.slots || (rawData.standardArrays && rawData.standardArrays.slots 
                  ? rawData.standardArrays.slots.map(slot => ({
                      // Preserve all slot properties including additional data
                      id: slot.id || slot.slotId || slot.slot_id,
                      name: slot.name || slot.slotName || `Slot ${slot.id || 1}`,
                      description: slot.description || slot.slotDescription || '',
                      valueUnits: slot.valueUnits || slot.value_units || 'units',
                      transferable: slot.transferable ?? slot.slot_transferable ?? true,
                      properties: slot.properties || {},
                      // Preserve any additional metadata
                      ...Object.fromEntries(
                        Object.entries(slot).filter(([key]) => 
                          !['id', 'slotId', 'slot_id', 'name', 'slotName', 'description', 'slotDescription', 'valueUnits', 'value_units', 'transferable', 'slot_transferable', 'properties'].includes(key)
                        )
                      )
                    }))
                  : [{ id: "1", name: "Default Slot", description: "Default slot for basic token setup", valueUnits: "units", transferable: true, properties: {} }]),
                baseUri: rawData.baseUri || rawData.blocks?.base_uri || 'https://example.com/metadata/',
                metadataStorage: rawData.metadataStorage || rawData.blocks?.metadata_storage || 'ipfs',
                valueDecimals: rawData.valueDecimals || rawData.blocks?.value_decimals || 0,
                slotType: rawData.slotType || rawData.blocks?.slot_type || 'generic',
                
                // Basic boolean properties
                isBurnable: rawData.isBurnable ?? rawData.blocks?.is_burnable ?? false,
                isPausable: rawData.isPausable ?? rawData.blocks?.is_pausable ?? false,
                hasRoyalty: rawData.hasRoyalty ?? rawData.blocks?.has_royalty ?? false,
                royaltyPercentage: rawData.royaltyPercentage || rawData.blocks?.royalty_percentage,
                royaltyReceiver: rawData.royaltyReceiver || rawData.blocks?.royalty_receiver,
                slotApprovals: rawData.slotApprovals ?? rawData.blocks?.slot_approvals ?? true,
                valueApprovals: rawData.valueApprovals ?? rawData.blocks?.value_approvals ?? true,
                accessControl: rawData.accessControl || rawData.blocks?.access_control || 'ownable',
                updatableUris: rawData.updatableUris ?? rawData.blocks?.updatable_uris ?? false,
                updatableSlots: rawData.updatableSlots ?? rawData.blocks?.updatable_slots ?? false,
                valueTransfersEnabled: rawData.valueTransfersEnabled ?? rawData.blocks?.value_transfers_enabled ?? true,
                dynamicMetadata: rawData.dynamicMetadata ?? rawData.blocks?.dynamic_metadata ?? false,
                allowsSlotEnumeration: rawData.allowsSlotEnumeration ?? rawData.blocks?.allows_slot_enumeration ?? true,
                
                // Financial Instrument Properties
                financialInstrumentType: rawData.financialInstrumentType || rawData.blocks?.financial_instrument_type,
                principalAmount: rawData.principalAmount || rawData.blocks?.principal_amount,
                interestRate: rawData.interestRate || rawData.blocks?.interest_rate,
                maturityDate: rawData.maturityDate || rawData.blocks?.maturity_date,
                couponFrequency: rawData.couponFrequency || rawData.blocks?.coupon_frequency,
                paymentSchedule: rawData.paymentSchedule || rawData.blocks?.payment_schedule,
                earlyRedemptionEnabled: rawData.earlyRedemptionEnabled ?? rawData.blocks?.early_redemption_enabled,
                redemptionPenaltyRate: rawData.redemptionPenaltyRate || rawData.blocks?.redemption_penalty_rate,
                
                // Derivative Properties
                derivativeType: rawData.derivativeType || rawData.blocks?.derivative_type,
                underlyingAsset: rawData.underlyingAsset || rawData.blocks?.underlying_asset,
                underlyingAssetAddress: rawData.underlyingAssetAddress || rawData.blocks?.underlying_asset_address,
                strikePrice: rawData.strikePrice || rawData.blocks?.strike_price,
                expirationDate: rawData.expirationDate || rawData.blocks?.expiration_date,
                settlementType: rawData.settlementType || rawData.blocks?.settlement_type,
                marginRequirements: rawData.marginRequirements || rawData.blocks?.margin_requirements,
                leverageRatio: rawData.leverageRatio || rawData.blocks?.leverage_ratio,
                
                // Advanced Slot Management
                slotCreationEnabled: rawData.slotCreationEnabled ?? rawData.blocks?.slot_creation_enabled,
                dynamicSlotCreation: rawData.dynamicSlotCreation ?? rawData.blocks?.dynamic_slot_creation,
                slotAdminRoles: rawData.slotAdminRoles || rawData.blocks?.slot_admin_roles,
                slotFreezeEnabled: rawData.slotFreezeEnabled ?? rawData.blocks?.slot_freeze_enabled,
                slotMergeEnabled: rawData.slotMergeEnabled ?? rawData.blocks?.slot_merge_enabled,
                slotSplitEnabled: rawData.slotSplitEnabled ?? rawData.blocks?.slot_split_enabled,
                crossSlotTransfers: rawData.crossSlotTransfers ?? rawData.blocks?.cross_slot_transfers,
                
                // Value Computation & Trading
                valueComputationMethod: rawData.valueComputationMethod || rawData.blocks?.value_computation_method,
                valueOracleAddress: rawData.valueOracleAddress || rawData.blocks?.value_oracle_address,
                valueCalculationFormula: rawData.valueCalculationFormula || rawData.blocks?.value_calculation_formula,
                accrualEnabled: rawData.accrualEnabled ?? rawData.blocks?.accrual_enabled,
                accrualRate: rawData.accrualRate || rawData.blocks?.accrual_rate,
                accrualFrequency: rawData.accrualFrequency || rawData.blocks?.accrual_frequency,
                valueAdjustmentEnabled: rawData.valueAdjustmentEnabled ?? rawData.blocks?.value_adjustment_enabled,
                
                // Marketplace & Trading Features
                slotMarketplaceEnabled: rawData.slotMarketplaceEnabled ?? rawData.blocks?.slot_marketplace_enabled,
                valueMarketplaceEnabled: rawData.valueMarketplaceEnabled ?? rawData.blocks?.value_marketplace_enabled,
                partialValueTrading: rawData.partialValueTrading ?? rawData.blocks?.partial_value_trading,
                minimumTradeValue: rawData.minimumTradeValue || rawData.blocks?.minimum_trade_value,
                tradingFeesEnabled: rawData.tradingFeesEnabled ?? rawData.blocks?.trading_fees_enabled,
                tradingFeePercentage: rawData.tradingFeePercentage || rawData.blocks?.trading_fee_percentage,
                marketMakerEnabled: rawData.marketMakerEnabled ?? rawData.blocks?.market_maker_enabled,
                
                // Governance & DeFi Features
                slotVotingEnabled: rawData.slotVotingEnabled ?? rawData.blocks?.slot_voting_enabled,
                valueWeightedVoting: rawData.valueWeightedVoting ?? rawData.blocks?.value_weighted_voting,
                votingPowerCalculation: rawData.votingPowerCalculation || rawData.blocks?.voting_power_calculation,
                quorumCalculationMethod: rawData.quorumCalculationMethod || rawData.blocks?.quorum_calculation_method,
                proposalValueThreshold: rawData.proposalValueThreshold || rawData.blocks?.proposal_value_threshold,
                delegateEnabled: rawData.delegateEnabled ?? rawData.blocks?.delegate_enabled,
                yieldFarmingEnabled: rawData.yieldFarmingEnabled ?? rawData.blocks?.yield_farming_enabled,
                liquidityProvisionEnabled: rawData.liquidityProvisionEnabled ?? rawData.blocks?.liquidity_provision_enabled,
                stakingYieldRate: rawData.stakingYieldRate || rawData.blocks?.staking_yield_rate,
                compoundInterestEnabled: rawData.compoundInterestEnabled ?? rawData.blocks?.compound_interest_enabled,
                flashLoanEnabled: rawData.flashLoanEnabled ?? rawData.blocks?.flash_loan_enabled,
                collateralFactor: rawData.collateralFactor || rawData.blocks?.collateral_factor,
                liquidationThreshold: rawData.liquidationThreshold || rawData.blocks?.liquidation_threshold,
                
                // Compliance & Security
                regulatoryComplianceEnabled: rawData.regulatoryComplianceEnabled ?? rawData.blocks?.regulatory_compliance_enabled,
                kycRequired: rawData.kycRequired ?? rawData.blocks?.kyc_required,
                accreditedInvestorOnly: rawData.accreditedInvestorOnly ?? rawData.blocks?.accredited_investor_only,
                holdingPeriodRestrictions: rawData.holdingPeriodRestrictions || rawData.blocks?.holding_period_restrictions,
                transferLimits: rawData.transferLimits || rawData.blocks?.transfer_limits,
                reportingRequirements: rawData.reportingRequirements || rawData.blocks?.reporting_requirements,
                multiSignatureRequired: rawData.multiSignatureRequired ?? rawData.blocks?.multi_signature_required,
                approvalWorkflowEnabled: rawData.approvalWorkflowEnabled ?? rawData.blocks?.approval_workflow_enabled,
                institutionalCustodySupport: rawData.institutionalCustodySupport ?? rawData.blocks?.institutional_custody_support,
                auditTrailEnhanced: rawData.auditTrailEnhanced ?? rawData.blocks?.audit_trail_enhanced,
                batchOperationsEnabled: rawData.batchOperationsEnabled ?? rawData.blocks?.batch_operations_enabled,
                emergencyPauseEnabled: rawData.emergencyPauseEnabled ?? rawData.blocks?.emergency_pause_enabled,
                recoveryMechanisms: rawData.recoveryMechanisms || rawData.blocks?.recovery_mechanisms,
                
                // Geographic & Whitelist Config
                useGeographicRestrictions: rawData.useGeographicRestrictions ?? rawData.blocks?.use_geographic_restrictions,
                defaultRestrictionPolicy: rawData.defaultRestrictionPolicy || rawData.blocks?.default_restriction_policy,
                geographicRestrictions: rawData.geographicRestrictions || rawData.blocks?.geographic_restrictions,
                whitelistConfig: rawData.whitelistConfig || rawData.blocks?.whitelist_config,
                salesConfig: rawData.salesConfig || rawData.blocks?.sales_config,
                
                // Complex Object Properties (JSONB fields)
                slotTransferRestrictions: rawData.slotTransferRestrictions || rawData.blocks?.slot_transfer_restrictions,
                valueTransferRestrictions: rawData.valueTransferRestrictions || rawData.blocks?.value_transfer_restrictions,
                customSlotProperties: rawData.customSlotProperties || rawData.blocks?.custom_slot_properties,
                
                // Handle additional ERC-3525 arrays
                allocations: rawData.allocations || [],
                paymentSchedules: rawData.paymentSchedules || rawData.payment_schedules || [],
                valueAdjustments: rawData.valueAdjustments || rawData.value_adjustments || [],
                slotConfigs: rawData.slotConfigs || rawData.slot_configs || []
              });
            }
            
            // Add special handling for ERC-4626 tokens
            if (isERC4626) {
              console.log('[TokenTestUtility] 🏛️ Processing ERC-4626 vault token creation');
              
              // Ensure we have a valid Ethereum address for assetAddress
              const defaultAddress = '0x0000000000000000000000000000000000000000';
              
              // Prepare standardArrays for ERC-4626
              const standardArrays = rawData.standardArrays || {};
              
              console.log('[TokenTestUtility] DEBUG: Raw ERC-4626 data received:', {
                vaultStrategies: rawData.vaultStrategies,
                assetAllocations: rawData.assetAllocations,
                feeTiers: rawData.feeTiers,
                performanceMetrics: rawData.performanceMetrics,
                strategyParams: rawData.strategyParams,
                standardArrays: standardArrays
              });
              
              // Handle strategy params
              let strategyParams = standardArrays.strategyParams || [];
              if (strategyParams.length === 0 && rawData.yieldStrategy?.protocol) {
                // Convert protocol array to strategyParams if needed
                if (Array.isArray(rawData.yieldStrategy.protocol)) {
                  strategyParams = rawData.yieldStrategy.protocol.map((p: string) => ({
                    name: 'protocol',
                    value: p,
                    description: `Protocol: ${p}`
                  }));
                } else if (typeof rawData.yieldStrategy === 'string') {
                  strategyParams = [{
                    name: 'protocol',
                    value: rawData.yieldStrategy,
                    description: `Protocol: ${rawData.yieldStrategy}`
                  }];
                }
              }
              
              // Handle asset allocations
              let assetAllocations = standardArrays.assetAllocations || [];
              if (assetAllocations.length === 0 && rawData.assetAllocation) {
                assetAllocations = Array.isArray(rawData.assetAllocation) 
                  ? rawData.assetAllocation 
                  : [];
              }
              
              console.log('[TokenTestUtility] ✅ ERC-4626 Additional Tables Summary:', {
                vaultStrategies: `${(rawData.vaultStrategies || []).length} strategies`,
                assetAllocations: `${(rawData.assetAllocations || assetAllocations || []).length} allocations`,
                feeTiers: `${(rawData.feeTiers || []).length} fee tiers`,
                performanceMetrics: `${(rawData.performanceMetrics || []).length} metrics`,
                strategyParams: `${(rawData.strategyParams || strategyParams || []).length} parameters`
              });
              
              Object.assign(createData, {
                // Required fields for ERC-4626
                assetAddress: rawData.assetAddress || rawData.blocks?.asset_address || defaultAddress,
                assetName: rawData.assetName || rawData.blocks?.asset_name || 'USDC',
                assetSymbol: (rawData.assetSymbol || rawData.blocks?.asset_symbol || 'USDC').toUpperCase(),
                assetDecimals: rawData.assetDecimals || rawData.blocks?.asset_decimals || 6,
                vaultType: rawData.vaultType || rawData.blocks?.vault_type || 'yield',
                isMintable: rawData.isMintable ?? rawData.blocks?.is_mintable ?? true,
                isBurnable: rawData.isBurnable ?? rawData.blocks?.is_burnable ?? true,
                isPausable: rawData.isPausable ?? rawData.blocks?.is_pausable ?? true,
                
                // Handle yieldStrategy - convert string to object if needed
                yieldStrategy: (() => {
                  if (typeof rawData.yieldStrategy === 'string') {
                    return { 
                      protocol: [rawData.yieldStrategy],
                      rebalancingFrequency: 'weekly'
                    };
                  } else if (rawData.yieldStrategy && typeof rawData.yieldStrategy === 'object') {
                    return rawData.yieldStrategy;
                  } else {
                    return { 
                      protocol: ['simple'],
                      rebalancingFrequency: 'weekly'
                    };
                  }
                })(),
                
                // Ensure valid vaultStrategy
                vaultStrategy: (() => {
                  const strategy = rawData.vaultStrategy || rawData.blocks?.vault_strategy;
                  // Check if the strategy is one of the allowed values
                  const validStrategies = ['simple', 'compound', 'yearn', 'aave', 'custom', 'short_term_treasury', 'long_term_treasury'];
                  return validStrategies.includes(strategy) ? strategy : 'simple';
                })(),
                
                // Ensure valid strategyController address
                strategyController: rawData.strategyController || rawData.blocks?.strategy_controller || defaultAddress,
                
                // Add comprehensive ERC-4626 additional table arrays
                vaultStrategies: rawData.vaultStrategies || [],
                assetAllocations: rawData.assetAllocations || assetAllocations,
                feeTiers: rawData.feeTiers || [],
                performanceMetrics: rawData.performanceMetrics || [],
                strategyParams: rawData.strategyParams || strategyParams,
                
                // Add standardArrays with properly named fields for backwards compatibility
                standardArrays: {
                  ...standardArrays,
                  strategyParams,
                  assetAllocations,
                  // Include additional arrays in standardArrays as well for flexibility
                  vaultStrategies: rawData.vaultStrategies || [],
                  feeTiers: rawData.feeTiers || [],
                  performanceMetrics: rawData.performanceMetrics || []
                }
              });
              
              console.log('[TokenTestUtility] 🚀 Final ERC-4626 data prepared for creation:', {
                hasVaultStrategies: !!(createData.vaultStrategies && createData.vaultStrategies.length > 0),
                hasAssetAllocations: !!(createData.assetAllocations && createData.assetAllocations.length > 0),
                hasFeeTiers: !!(createData.feeTiers && createData.feeTiers.length > 0),
                hasPerformanceMetrics: !!(createData.performanceMetrics && createData.performanceMetrics.length > 0),
                hasStrategyParams: !!(createData.strategyParams && createData.strategyParams.length > 0),
                assetAddress: createData.assetAddress,
                vaultStrategy: createData.vaultStrategy
              });
            }
            
            // Create the token
            logger.info('Creating token with data', createData);
            result = await createToken(projectId, createData, hasEnhancedFields);
            
            // Enhanced success logging for ERC-4626 tokens
            if (isERC4626) {
              console.log('[TokenTestUtility] 🎉 ERC-4626 Token Creation Results:', result);
              
              const additionalTablesInfo = [];
              if (createData.vaultStrategies?.length > 0) additionalTablesInfo.push(`${createData.vaultStrategies.length} vault strategies`);
              if (createData.assetAllocations?.length > 0) additionalTablesInfo.push(`${createData.assetAllocations.length} asset allocations`);
              if (createData.feeTiers?.length > 0) additionalTablesInfo.push(`${createData.feeTiers.length} fee tiers`);
              if (createData.performanceMetrics?.length > 0) additionalTablesInfo.push(`${createData.performanceMetrics.length} performance metrics`);
              if (createData.strategyParams?.length > 0) additionalTablesInfo.push(`${createData.strategyParams.length} strategy parameters`);
              
              const successMessage = `ERC-4626 vault token created successfully with ID: ${result.id}` + 
                (additionalTablesInfo.length > 0 ? ` (${additionalTablesInfo.join(', ')})` : '');
              setSuccess(successMessage);
              
              console.log('[TokenTestUtility] ✅ ERC-4626 Additional Tables Created:', additionalTablesInfo);
            } else {
              setSuccess(`Token created successfully with ID: ${result.id}`);
            }
            
            setTokenId(result.id);
            // Add the new token to the list
            setTokens(prev => [...prev, result]);
            logger.info('Token created successfully', result);
          } catch (parseErr: any) {
            const errorMessage = `Invalid JSON: ${parseErr.message}`;
            setError(errorMessage);
            logger.error(errorMessage, {
              error: parseErr,
              jsonData,
              stack: parseErr.stack
            });
            setIsLoading(false);
            return;
          }
          break;
          
        case 'read':
          if (!tokenId) {
            const message = 'Please select a token ID to read';
            setError(message);
            logger.error(message, { tokenId });
            setIsLoading(false);
            return;
          }
          
          // Read the token
          logger.info(`Reading token with ID: ${tokenId}`);
          result = await getCompleteToken(tokenId);
          
          // Enhanced logging for ERC-4626 tokens
          if (result && (result.standard === TokenStandard.ERC4626 || result.standard === 'ERC-4626')) {
            console.log('[TokenTestUtility] 🏛️ ERC-4626 Token Read Results:', result);
            
            const additionalTablesInfo = [];
            if (result.vaultStrategies?.length > 0) additionalTablesInfo.push(`${result.vaultStrategies.length} vault strategies`);
            if (result.assetAllocations?.length > 0) additionalTablesInfo.push(`${result.assetAllocations.length} asset allocations`);
            if (result.feeTiers?.length > 0) additionalTablesInfo.push(`${result.feeTiers.length} fee tiers`);
            if (result.performanceMetrics?.length > 0) additionalTablesInfo.push(`${result.performanceMetrics.length} performance metrics`);
            if (result.strategyParams?.length > 0) additionalTablesInfo.push(`${result.strategyParams.length} strategy parameters`);
            
            const successMessage = 'ERC-4626 vault token read successfully' + 
              (additionalTablesInfo.length > 0 ? ` (${additionalTablesInfo.join(', ')})` : '');
            setSuccess(successMessage);
            
            console.log('[TokenTestUtility] ✅ ERC-4626 Additional Tables Retrieved:', additionalTablesInfo);
          } else {
            setSuccess('Token read successfully');
          }
          
          logger.info('Token read successfully', result);
          break;
          
        case 'update':
          if (!tokenId) {
            const message = 'Please select a token ID to update';
            setError(message);
            logger.error(message, { tokenId });
            setIsLoading(false);
            return;
          }
          
          // Parse, normalize, and validate JSON
          let parseResult = await parseAndValidateJson(tokenStandard);
          if (!parseResult) {
            setIsLoading(false);
            return;
          }
          const updateData = parseResult.data;
          // Update the token
          logger.info(`Updating token with ID: ${tokenId}`, updateData);
          result = await updateToken(tokenId, updateData);
          
          // Enhanced logging for ERC-4626 tokens
          if (updateData.standard === TokenStandard.ERC4626 || updateData.standard === 'ERC-4626') {
            console.log('[TokenTestUtility] 🏛️ ERC-4626 Token Update Results:', result);
            
            const additionalTablesInfo = [];
            if (updateData.vaultStrategies?.length > 0) additionalTablesInfo.push(`${updateData.vaultStrategies.length} vault strategies updated`);
            if (updateData.assetAllocations?.length > 0) additionalTablesInfo.push(`${updateData.assetAllocations.length} asset allocations updated`);
            if (updateData.feeTiers?.length > 0) additionalTablesInfo.push(`${updateData.feeTiers.length} fee tiers updated`);
            if (updateData.performanceMetrics?.length > 0) additionalTablesInfo.push(`${updateData.performanceMetrics.length} performance metrics updated`);
            if (updateData.strategyParams?.length > 0) additionalTablesInfo.push(`${updateData.strategyParams.length} strategy parameters updated`);
            
            const successMessage = 'ERC-4626 vault token updated successfully' + 
              (additionalTablesInfo.length > 0 ? ` (${additionalTablesInfo.join(', ')})` : '');
            setSuccess(successMessage);
            
            console.log('[TokenTestUtility] ✅ ERC-4626 Additional Tables Updated:', additionalTablesInfo);
          } else {
            setSuccess('Token updated successfully');
          }
          
          logger.info('Token updated successfully', result);
          break;
          
        case 'delete':
          if (!tokenId) {
            const message = 'Please select a token ID to delete';
            setError(message);
            logger.error(message, { tokenId });
            setIsLoading(false);
            return;
          }
          
          // Delete the token
          logger.info(`Deleting token with ID: ${tokenId}`);
          result = await deleteToken(projectId, tokenId);
          setSuccess('Token deleted successfully');
          // Remove the token from the list
          setTokens(prev => prev.filter(token => token.id !== tokenId));
          setTokenId('');
          logger.info('Token deleted successfully', result);
          // Only display serializable fields for delete
          try {
            const { success, message, results } = result || {};
            setResponseData(JSON.stringify({ success, message, results }, null, 2));
          } catch (err) {
            setResponseData(typeof result === 'string' ? result : '[Unserializable result: circular structure]');
          }
          break;
      }
      
      // Set the response data, handling circular structure errors
      try {
        setResponseData(JSON.stringify(result, null, 2));
      } catch (err) {
        setResponseData(typeof result === 'string' ? result : '[Unserializable result: circular structure]');
      }
    } catch (err: any) {
      const errorMessage = `Operation failed: ${err.message}`;
      setError(errorMessage);
      logger.error(`${editorMode} operation failed`, {
        error: err,
        stack: err.stack,
        tokenId,
        projectId,
        mode: editorMode
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render helper for token selection
  const renderTokenSelection = () => {
    // Filter and sort tokens by standard and config_mode
    const filteredTokens = tokens
      .filter(token => token.standard === tokenStandard && (token.config_mode === configMode || token.config_mode === undefined))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    if (filteredTokens.length === 0) {
      return (
        <div className="mb-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No tokens available</AlertTitle>
            <AlertDescription>
              There are no tokens available for this project. Use the "Create Token" operation to create a new token.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    return (
      <div className="mb-4">
        <Label htmlFor="tokenId">Select Token</Label>
        <Select
          value={tokenId}
          onValueChange={setTokenId}
        >
          <SelectTrigger id="tokenId">
            <SelectValue placeholder="Select a token" />
          </SelectTrigger>
          <SelectContent>
            {filteredTokens.map(token => (
              <SelectItem key={token.id} value={token.id}>
                <div className="flex flex-col">
                  <span className="font-mono text-xs">{token.id}</span>
                  <span className="text-sm font-medium">{token.name} <span className="text-muted-foreground">({token.symbol})</span></span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-8">
      {/* Product Selector */}
      <ProductSelector onFileSelect={handleLoadJsonFile} />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Token Test Utility</CardTitle>
          <CardDescription>
            Test CRUD operations on tokens using a JSON editor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="editorMode">Operation</Label>
              <Select
                value={editorMode}
                onValueChange={(value) => setEditorMode(value as EditorMode)}
              >
                <SelectTrigger id="editorMode">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create">Create Token</SelectItem>
                  <SelectItem value="read">Read Token</SelectItem>
                  <SelectItem value="update">Update Token</SelectItem>
                  <SelectItem value="delete">Delete Token</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tokenStandard">Token Standard</Label>
              <Select
                value={tokenStandard}
                onValueChange={(value) => setTokenStandard(value as TokenStandard)}
              >
                <SelectTrigger id="tokenStandard">
                  <SelectValue placeholder="Select token standard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TokenStandard.ERC20}>ERC-20</SelectItem>
                  <SelectItem value={TokenStandard.ERC721}>ERC-721</SelectItem>
                  <SelectItem value={TokenStandard.ERC1155}>ERC-1155</SelectItem>
                  <SelectItem value={TokenStandard.ERC1400}>ERC-1400</SelectItem>
                  <SelectItem value={TokenStandard.ERC3525}>ERC-3525</SelectItem>
                  <SelectItem value={TokenStandard.ERC4626}>ERC-4626</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="configMode">Configuration Mode</Label>
              <Select
                value={configMode}
                onValueChange={(value) => setConfigMode(value as ConfigMode)}
              >
                <SelectTrigger id="configMode">
                  <SelectValue placeholder="Select configuration mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="min">Basic</SelectItem>
                  <SelectItem value="max">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {editorMode !== 'create' && renderTokenSelection()}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={handleReset} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Form
            </Button>
            
            {(editorMode === 'read' || editorMode === 'update') && (
              <Button onClick={handleLoadToken} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Load Token
              </Button>
            )}

            {(responseData || error || success) && (
              <Button onClick={handleClearResponse} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Clear Response
              </Button>
            )}
          </div>
          
          {/* JSON Editor */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <Label htmlFor="jsonData">Token Data (JSON)</Label>
              <Textarea
                id="jsonData"
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                className="font-mono h-80"
                disabled={isLoading}
              />
            </div>
            
            {/* Error display */}
            {error && (
              <Alert className="border-red-400 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-600">Error</AlertTitle>
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Success display */}
            {success && (
              <Alert className="border-green-400 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Success</AlertTitle>
                <AlertDescription className="text-green-600">
                  {success}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Processing...</span>
              </div>
            )}
            
            {/* Result display */}
            {responseData && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="responseData">Response Data</Label>
                  <Button onClick={handleClearResponse} variant="ghost" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
                <JsonViewer data={responseData} />
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="mr-2"
            >
              Reset
            </Button>
            
            {editorMode !== 'create' && (
              <Button
                variant="outline"
                onClick={handleLoadToken}
                disabled={isLoading || !tokenId}
                className="mr-2"
              >
                Load Token
              </Button>
            )}
          </div>
          
          <Button
            onClick={handleExecute}
            disabled={isLoading || (editorMode !== 'create' && !tokenId)}
            className="bg-primary hover:bg-primary/90"
          >
            <Play className="h-4 w-4 mr-2" />
            {editorMode === 'create' ? 'Create' : editorMode === 'read' ? 'Read' : editorMode === 'update' ? 'Update' : 'Delete'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TokenTestUtility;