/**
 * Token Data Service
 * 
 * This service is responsible for fetching and managing token data from the various token-related tables.
 */
import { supabase } from '@/infrastructure/database/client';
import { 
  TokenStandard,
  TokenERC20Properties,
  TokenERC721Properties,
  TokenERC721Attribute,
  TokenERC1155Properties,
  TokenERC1155Type,
  TokenERC1155Balance,
  TokenERC1155UriMapping,
  TokenERC1400Properties,
  TokenERC1400Partition,
  TokenERC1400Controller,
  TokenERC3525Properties,
  TokenERC3525Slot,
  TokenERC3525Allocation,
  TokenERC4626Properties,
  TokenERC4626StrategyParam,
  TokenERC4626AssetAllocation,
  TokenERC4626VaultStrategy,
  TokenERC4626FeeTier,
  TokenERC4626PerformanceMetric
} from '@/types/core/centralModels';
import { EnhancedTokenData } from '../types';

/**
 * Maps database token standard format to the TokenStandard enum
 * This resolves type compatibility issues between database values and our enum
 */
function mapDatabaseStandardToEnum(standard: string): TokenStandard {
  switch(standard) {
    case 'ERC-20': return TokenStandard.ERC20;
    case 'ERC-721': return TokenStandard.ERC721;
    case 'ERC-1155': return TokenStandard.ERC1155;
    case 'ERC-1400': return TokenStandard.ERC1400;
    case 'ERC-3525': return TokenStandard.ERC3525;
    case 'ERC-4626': return TokenStandard.ERC4626;
    default:
      // If we can't match, use a type assertion as fallback
      // This should be rare since we control the database values
      console.warn(`Unknown token standard: ${standard}, using as-is`);
      return standard as unknown as TokenStandard;
  }
}

/**
 * Helper function to convert database snake_case to camelCase for properties
 */
function toCamelCase<T>(obj: any): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item)) as any;
  }

  const newObj: any = {};
  
  // Common field mapping to ensure consistent property names
  const fieldMappings: Record<string, string> = {
    'token_id': 'tokenId',
    'slot_id': 'slotId',
    'token_type_id': 'tokenTypeId',
    'partition_id': 'partitionId',
    'trait_type': 'traitType',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'is_mintable': 'isMintable',
    'is_burnable': 'isBurnable',
    'is_pausable': 'isPausable',
    'has_royalty': 'hasRoyalty',
    'initial_supply': 'initialSupply',
    'max_supply': 'maxSupply',
    'base_uri': 'baseUri',
    'metadata_storage': 'metadataStorage',
    'royalty_percentage': 'royaltyPercentage',
    'royalty_receiver': 'royaltyReceiver',
    'token_type': 'tokenType',
    'auto_increment_ids': 'autoIncrementIds',
    'uri_storage': 'uriStorage',
    'updatable_uris': 'updatableUris',
    'sales_config': 'salesConfig',
    'whitelist_config': 'whitelistConfig',
    'permission_config': 'permissionConfig',
    'fee_on_transfer': 'feeOnTransfer',
    'governance_features': 'governanceFeatures',
    'allow_management': 'allowanceManagement',
    'value_decimals': 'valueDecimals',
    'asset_token_address': 'assetTokenAddress',
    'asset_token_type': 'assetTokenType',
    'deposit_limit': 'depositLimit',
    'withdrawal_limit': 'withdrawalLimit',
    'fee_percentage': 'feePercentage',
    'fee_recipient': 'feeRecipient',
    'strategy_params': 'strategyParams',
    'strategy_type': 'strategyType',
    'yield_strategy': 'yieldStrategy',
    'expected_apy': 'expectedAPY'
  };
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Check if we have a specific mapping for this field
      if (fieldMappings[key]) {
        newObj[fieldMappings[key]] = toCamelCase(obj[key]);
      } else {
        // Otherwise convert snake_case to camelCase
        const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
        newObj[camelKey] = toCamelCase(obj[key]);
      }
    }
  }
  
  return newObj as T;
}

/**
 * Fetch enhanced token data including all standard-specific properties
 * @param tokenId The token ID to fetch data for
 * @returns EnhancedTokenData object with all token data
 */
export async function getEnhancedTokenData(tokenId: string): Promise<EnhancedTokenData> {
  try {
    console.log(`[TokenDataService] Fetching enhanced token data for token ID: ${tokenId}`);
    
    // First get the base token data
    const { data: tokenData, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();
    
    if (error) throw new Error(`Error fetching token: ${error.message}`);
    if (!tokenData) throw new Error(`Token with ID ${tokenId} not found`);
    
    console.log(`[TokenDataService] Found token: ${tokenData.name} (${tokenData.standard})`);
    
    // Initialize enhanced token data with the base token data
    const enhancedToken: EnhancedTokenData = {
      id: tokenData.id,
      name: tokenData.name,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals,
      // Map the database standard format to the TokenStandard enum
      standard: mapDatabaseStandardToEnum(tokenData.standard),
      status: tokenData.status,
      blocks: tokenData.blocks ? (tokenData.blocks as Record<string, any>) : {},
      metadata: tokenData.metadata ? (tokenData.metadata as Record<string, any>) : {},
      projectId: tokenData.project_id,
      reviewers: tokenData.reviewers || [],
      approvals: tokenData.approvals || [],
      contractPreview: tokenData.contract_preview,
      totalSupply: tokenData.total_supply,
      configMode: tokenData.config_mode,
      configurationLevel: tokenData.config_mode === 'max' || tokenData.config_mode === 'advanced' ? 
                          'advanced' : 'basic',
      // Include both snake_case and camelCase versions for compatibility
      created_at: tokenData.created_at,
      updated_at: tokenData.updated_at,
      createdAt: tokenData.created_at,
      updatedAt: tokenData.updated_at
    };
    
    // Extract description from metadata if available
    if (enhancedToken.metadata && enhancedToken.metadata.description) {
      enhancedToken.description = enhancedToken.metadata.description;
    }
    
    // Fetch standard-specific data based on token standard
    const standard = mapDatabaseStandardToEnum(tokenData.standard);
    
    // Use Promise.all to fetch all standard-specific data in parallel
    try {
      await Promise.all([
        standard === TokenStandard.ERC20 ? fetchERC20Data(tokenId, enhancedToken) : Promise.resolve(),
        standard === TokenStandard.ERC721 ? fetchERC721Data(tokenId, enhancedToken) : Promise.resolve(),
        standard === TokenStandard.ERC1155 ? fetchERC1155Data(tokenId, enhancedToken) : Promise.resolve(),
        standard === TokenStandard.ERC1400 ? fetchERC1400Data(tokenId, enhancedToken) : Promise.resolve(),
        standard === TokenStandard.ERC3525 ? fetchERC3525Data(tokenId, enhancedToken) : Promise.resolve(),
        standard === TokenStandard.ERC4626 ? fetchERC4626Data(tokenId, enhancedToken) : Promise.resolve()
      ]);
      
      console.log(`[TokenDataService] Successfully fetched all data for ${standard} token`);
    } catch (standardError) {
      console.error(`[TokenDataService] Error fetching standard-specific data for ${standard}:`, standardError);
      // Continue with base token data even if standard-specific data fails
    }
    
    return enhancedToken;
  } catch (error) {
    console.error('[TokenDataService] Error in getEnhancedTokenData:', error);
    throw error;
  }
}

/**
 * Fetch ERC20 token data
 */
async function fetchERC20Data(tokenId: string, tokenData: EnhancedTokenData): Promise<void> {
  console.log(`[TokenDataService] Fetching ERC20 data for token ID: ${tokenId}`);
  
  const { data, error } = await supabase
    .from('token_erc20_properties')
    .select('*')
    .eq('token_id', tokenId)
    .maybeSingle();
  
  if (error) {
    console.error('[TokenDataService] Error fetching ERC20 properties:', error);
    return;
  }
  
  if (!data) {
    console.log('[TokenDataService] No ERC20 properties found for this token');
    return;
  }
  
  if (data) {
    console.log('[TokenDataService] Found ERC20 properties:', data);
    tokenData.erc20Properties = toCamelCase<TokenERC20Properties>(data);
    
    // Ensure boolean properties are properly set
    if (tokenData.erc20Properties) {
      tokenData.erc20Properties.isMintable = !!tokenData.erc20Properties.isMintable;
      tokenData.erc20Properties.isBurnable = !!tokenData.erc20Properties.isBurnable;
      tokenData.erc20Properties.isPausable = !!tokenData.erc20Properties.isPausable;
      tokenData.erc20Properties.allowManagement = !!tokenData.erc20Properties.allowManagement;
      tokenData.erc20Properties.permit = !!tokenData.erc20Properties.permit;
      tokenData.erc20Properties.snapshot = !!tokenData.erc20Properties.snapshot;
    }
  }
}

/**
 * Fetch ERC721 token data
 */
async function fetchERC721Data(tokenId: string, tokenData: EnhancedTokenData): Promise<void> {
  console.log(`[TokenDataService] Fetching ERC721 data for token ID: ${tokenId}`);
  
  // Fetch ERC721 properties
  const { data: properties, error: propError } = await supabase
    .from('token_erc721_properties')
    .select('*')
    .eq('token_id', tokenId)
    .maybeSingle();
  
  if (propError) {
    console.error('[TokenDataService] Error fetching ERC721 properties:', propError);
  } else if (properties) {
    console.log('[TokenDataService] Found ERC721 properties:', properties);
    tokenData.erc721Properties = toCamelCase<TokenERC721Properties>(properties);
    
    // Ensure boolean properties are properly set
    if (tokenData.erc721Properties) {
      tokenData.erc721Properties.hasRoyalty = !!tokenData.erc721Properties.hasRoyalty;
      tokenData.erc721Properties.isMintable = !!tokenData.erc721Properties.isMintable;
      tokenData.erc721Properties.isBurnable = !!tokenData.erc721Properties.isBurnable;
      tokenData.erc721Properties.isPausable = !!tokenData.erc721Properties.isPausable;
      tokenData.erc721Properties.autoIncrementIds = tokenData.erc721Properties.autoIncrementIds !== false;
      tokenData.erc721Properties.enumerable = tokenData.erc721Properties.enumerable !== false;
      tokenData.erc721Properties.updatableUris = !!tokenData.erc721Properties.updatableUris;
    }
  } else {
    console.log('[TokenDataService] No ERC721 properties found for this token');
  }
  
  // Fetch ERC721 attributes
  const { data: attributes, error: attrError } = await supabase
    .from('token_erc721_attributes')
    .select('*')
    .eq('token_id', tokenId);
  
  if (attrError) {
    console.error('[TokenDataService] Error fetching ERC721 attributes:', attrError);
  } else if (attributes && attributes.length > 0) {
    console.log(`[TokenDataService] Found ${attributes.length} ERC721 attributes`);
    tokenData.erc721Attributes = toCamelCase<TokenERC721Attribute[]>(attributes);
  } else {
    console.log('[TokenDataService] No ERC721 attributes found');
    tokenData.erc721Attributes = []; // Initialize as empty array to avoid null checks
  }
}

/**
 * Fetch ERC1155 token data
 */
async function fetchERC1155Data(tokenId: string, tokenData: EnhancedTokenData): Promise<void> {
  console.log(`[TokenDataService] Fetching ERC1155 data for token ID: ${tokenId}`);
  
  // Fetch ERC1155 properties
  const { data: properties, error: propError } = await supabase
    .from('token_erc1155_properties')
    .select('*')
    .eq('token_id', tokenId)
    .maybeSingle();
  
  if (propError) {
    console.error('[TokenDataService] Error fetching ERC1155 properties:', propError);
  } else if (properties) {
    console.log('[TokenDataService] Found ERC1155 properties:', properties);
    tokenData.erc1155Properties = toCamelCase<TokenERC1155Properties>(properties);
    
    // Ensure boolean properties are properly set
    if (tokenData.erc1155Properties) {
      tokenData.erc1155Properties.hasRoyalty = !!tokenData.erc1155Properties.hasRoyalty;
      tokenData.erc1155Properties.isBurnable = !!tokenData.erc1155Properties.isBurnable;
      tokenData.erc1155Properties.isPausable = !!tokenData.erc1155Properties.isPausable;
      tokenData.erc1155Properties.dynamicUris = !!tokenData.erc1155Properties.dynamicUris;
      tokenData.erc1155Properties.updatableUris = !!tokenData.erc1155Properties.updatableUris;
      tokenData.erc1155Properties.supplyTracking = !!tokenData.erc1155Properties.supplyTracking;
      tokenData.erc1155Properties.enableApprovalForAll = !!tokenData.erc1155Properties.enableApprovalForAll;
      
      // Handle complex object properties properly
      if (properties.transfer_restrictions) {
        tokenData.erc1155Properties.transferRestrictions = properties.transfer_restrictions as Record<string, any>;
      }
    }
  } else {
    console.log('[TokenDataService] No ERC1155 properties found for this token');
  }
  
  // Fetch ERC1155 token types
  const { data: types, error: typesError } = await supabase
    .from('token_erc1155_types')
    .select('*')
    .eq('token_id', tokenId);
  
  if (typesError) {
    console.error('[TokenDataService] Error fetching ERC1155 types:', typesError);
  } else if (types && types.length > 0) {
    console.log(`[TokenDataService] Found ${types.length} ERC1155 types`);
    tokenData.erc1155Types = toCamelCase<TokenERC1155Type[]>(types);
  } else {
    console.log('[TokenDataService] No ERC1155 types found');
    tokenData.erc1155Types = []; // Initialize as empty array
  }
  
  // Fetch ERC1155 balances
  const { data: balances, error: balancesError } = await supabase
    .from('token_erc1155_balances')
    .select('*')
    .eq('token_id', tokenId);
  
  if (balancesError) {
    console.error('[TokenDataService] Error fetching ERC1155 balances:', balancesError);
  } else if (balances && balances.length > 0) {
    console.log(`[TokenDataService] Found ${balances.length} ERC1155 balances`);
    tokenData.erc1155Balances = toCamelCase<TokenERC1155Balance[]>(balances);
  } else {
    console.log('[TokenDataService] No ERC1155 balances found');
    tokenData.erc1155Balances = []; // Initialize as empty array
  }
  
  // Fetch ERC1155 URI mappings
  const { data: uriMappings, error: uriError } = await supabase
    .from('token_erc1155_uri_mappings')
    .select('*')
    .eq('token_id', tokenId);
  
  if (uriError) {
    console.error('[TokenDataService] Error fetching ERC1155 URI mappings:', uriError);
  } else if (uriMappings && uriMappings.length > 0) {
    console.log(`[TokenDataService] Found ${uriMappings.length} ERC1155 URI mappings`);
    tokenData.erc1155UriMappings = toCamelCase<TokenERC1155UriMapping[]>(uriMappings);
  } else {
    console.log('[TokenDataService] No ERC1155 URI mappings found');
    tokenData.erc1155UriMappings = []; // Initialize as empty array
  }
}

/**
 * Fetch ERC1400 token data
 */
async function fetchERC1400Data(tokenId: string, tokenData: EnhancedTokenData): Promise<void> {
  console.log(`[TokenDataService] Fetching ERC1400 data for token ID: ${tokenId}`);
  
  // Fetch ERC1400 properties
  const { data: properties, error: propError } = await supabase
    .from('token_erc1400_properties')
    .select('*')
    .eq('token_id', tokenId)
    .maybeSingle();
  
  if (propError) {
    console.error('[TokenDataService] Error fetching ERC1400 properties:', propError);
  } else if (properties) {
    console.log('[TokenDataService] Found ERC1400 properties:', properties);
    tokenData.erc1400Properties = toCamelCase<TokenERC1400Properties>(properties);
    
    // Ensure boolean properties are properly set
    if (tokenData.erc1400Properties) {
      tokenData.erc1400Properties.isMintable = !!tokenData.erc1400Properties.isMintable;
      tokenData.erc1400Properties.isBurnable = !!tokenData.erc1400Properties.isBurnable;
      tokenData.erc1400Properties.isPausable = !!tokenData.erc1400Properties.isPausable;
      tokenData.erc1400Properties.enforceKYC = !!tokenData.erc1400Properties.enforceKYC;
      tokenData.erc1400Properties.requireKyc = !!tokenData.erc1400Properties.requireKyc;
      tokenData.erc1400Properties.forcedTransfers = !!tokenData.erc1400Properties.forcedTransfers;
      tokenData.erc1400Properties.forcedRedemptionEnabled = !!tokenData.erc1400Properties.forcedRedemptionEnabled;
      tokenData.erc1400Properties.whitelistEnabled = !!tokenData.erc1400Properties.whitelistEnabled;
      tokenData.erc1400Properties.investorAccreditation = !!tokenData.erc1400Properties.investorAccreditation;
      tokenData.erc1400Properties.autoCompliance = !!tokenData.erc1400Properties.autoCompliance;
      tokenData.erc1400Properties.manualApprovals = !!tokenData.erc1400Properties.manualApprovals;
      tokenData.erc1400Properties.granularControl = !!tokenData.erc1400Properties.granularControl;
      tokenData.erc1400Properties.dividendDistribution = !!tokenData.erc1400Properties.dividendDistribution;
      tokenData.erc1400Properties.corporateActions = !!tokenData.erc1400Properties.corporateActions;
      tokenData.erc1400Properties.issuanceModules = !!tokenData.erc1400Properties.issuanceModules;
      tokenData.erc1400Properties.recoveryMechanism = !!tokenData.erc1400Properties.recoveryMechanism;
      tokenData.erc1400Properties.isMultiClass = tokenData.erc1400Properties.securityType === 'multi_class';
      tokenData.erc1400Properties.isIssuable = !!tokenData.erc1400Properties.isMintable;
      
      // Ensure complex objects are properly formatted
      if (properties.transfer_restrictions) {
        tokenData.erc1400Properties.transferRestrictions = properties.transfer_restrictions as Record<string, any>;
      }
      
      if (properties.kyc_settings) {
        tokenData.erc1400Properties.kycSettings = properties.kyc_settings as Record<string, any>;
      }
      
      if (properties.compliance_settings) {
        tokenData.erc1400Properties.complianceSettings = properties.compliance_settings as Record<string, any>;
      }
    }
  } else {
    console.log('[TokenDataService] No ERC1400 properties found for this token');
  }
  
  // Fetch ERC1400 partitions
  const { data: partitions, error: partError } = await supabase
    .from('token_erc1400_partitions')
    .select('*')
    .eq('token_id', tokenId);
  
  if (partError) {
    console.error('[TokenDataService] Error fetching ERC1400 partitions:', partError);
  } else if (partitions && partitions.length > 0) {
    console.log(`[TokenDataService] Found ${partitions.length} ERC1400 partitions`);
    tokenData.erc1400Partitions = toCamelCase<TokenERC1400Partition[]>(partitions);
    
    // Ensure boolean properties are properly set
    if (tokenData.erc1400Partitions) {
      tokenData.erc1400Partitions.forEach(partition => {
        partition.isLockable = !!partition.isLockable;
      });
    }
  } else {
    console.log('[TokenDataService] No ERC1400 partitions found');
    tokenData.erc1400Partitions = []; // Initialize as empty array
  }
  
  // Fetch ERC1400 controllers
  const { data: controllers, error: ctrlError } = await supabase
    .from('token_erc1400_controllers')
    .select('*')
    .eq('token_id', tokenId);
  
  if (ctrlError) {
    console.error('[TokenDataService] Error fetching ERC1400 controllers:', ctrlError);
  } else if (controllers && controllers.length > 0) {
    console.log(`[TokenDataService] Found ${controllers.length} ERC1400 controllers`);
    tokenData.erc1400Controllers = toCamelCase<TokenERC1400Controller[]>(controllers);
    
    // Ensure permissions array is properly formatted
    if (tokenData.erc1400Controllers) {
      tokenData.erc1400Controllers.forEach(controller => {
        if (!controller.permissions || !Array.isArray(controller.permissions)) {
          controller.permissions = ["ADMIN"]; // Default permission
        }
      });
    }
  } else {
    console.log('[TokenDataService] No ERC1400 controllers found');
    tokenData.erc1400Controllers = []; // Initialize as empty array
  }
}

/**
 * Fetch ERC3525 token data
 */
async function fetchERC3525Data(tokenId: string, tokenData: EnhancedTokenData): Promise<void> {
  console.log(`[TokenDataService] Fetching ERC3525 data for token ID: ${tokenId}`);
  
  // Fetch ERC3525 properties
  const { data: properties, error: propError } = await supabase
    .from('token_erc3525_properties')
    .select('*')
    .eq('token_id', tokenId)
    .maybeSingle();
  
  if (propError) {
    console.error('[TokenDataService] Error fetching ERC3525 properties:', propError);
  } else if (properties) {
    console.log('[TokenDataService] Found ERC3525 properties:', properties);
    tokenData.erc3525Properties = toCamelCase<TokenERC3525Properties>(properties);
    
    // Ensure boolean properties are properly set
    if (tokenData.erc3525Properties) {
      tokenData.erc3525Properties.hasRoyalty = !!tokenData.erc3525Properties.hasRoyalty;
      tokenData.erc3525Properties.isBurnable = !!tokenData.erc3525Properties.isBurnable;
      tokenData.erc3525Properties.isPausable = !!tokenData.erc3525Properties.isPausable;
      tokenData.erc3525Properties.isMintable = !!tokenData.erc3525Properties.isMintable;
      tokenData.erc3525Properties.dynamicMetadata = !!tokenData.erc3525Properties.dynamicMetadata;
      tokenData.erc3525Properties.updatableUris = !!tokenData.erc3525Properties.updatableUris;
      tokenData.erc3525Properties.allowsSlotEnumeration = !!tokenData.erc3525Properties.allowsSlotEnumeration;
      tokenData.erc3525Properties.slotTransferability = !!tokenData.erc3525Properties.slotTransferability;
      tokenData.erc3525Properties.supportsEnumeration = !!tokenData.erc3525Properties.supportsEnumeration;
      tokenData.erc3525Properties.fractionalTransfers = !!tokenData.erc3525Properties.fractionalTransfers;
      tokenData.erc3525Properties.supportsApprovalForAll = !!tokenData.erc3525Properties.supportsApprovalForAll;
      tokenData.erc3525Properties.valueTransfersEnabled = !!tokenData.erc3525Properties.valueTransfersEnabled;
      tokenData.erc3525Properties.updatableValues = !!tokenData.erc3525Properties.updatableValues;
      tokenData.erc3525Properties.supplyTracking = !!tokenData.erc3525Properties.supplyTracking;
      tokenData.erc3525Properties.permissioningEnabled = !!tokenData.erc3525Properties.permissioningEnabled;
      tokenData.erc3525Properties.valueAggregation = !!tokenData.erc3525Properties.valueAggregation;
      tokenData.erc3525Properties.slotApprovals = !!tokenData.erc3525Properties.slotApprovals;
    }
  } else {
    console.log('[TokenDataService] No ERC3525 properties found for this token');
  }
  
  // Fetch ERC3525 slots
  const { data: slots, error: slotError } = await supabase
    .from('token_erc3525_slots')
    .select('*')
    .eq('token_id', tokenId);
  
  if (slotError) {
    console.error('[TokenDataService] Error fetching ERC3525 slots:', slotError);
  } else if (slots && slots.length > 0) {
    console.log(`[TokenDataService] Found ${slots.length} ERC3525 slots`);
    tokenData.erc3525Slots = toCamelCase<TokenERC3525Slot[]>(slots);
  } else {
    console.log('[TokenDataService] No ERC3525 slots found');
    tokenData.erc3525Slots = []; // Initialize as empty array
  }
  
  // Fetch ERC3525 allocations
  const { data: allocations, error: allocError } = await supabase
    .from('token_erc3525_allocations')
    .select('*')
    .eq('token_id', tokenId);
  
  if (allocError) {
    console.error('[TokenDataService] Error fetching ERC3525 allocations:', allocError);
  } else if (allocations && allocations.length > 0) {
    console.log(`[TokenDataService] Found ${allocations.length} ERC3525 allocations`);
    tokenData.erc3525Allocations = toCamelCase<TokenERC3525Allocation[]>(allocations);
  } else {
    console.log('[TokenDataService] No ERC3525 allocations found');
    tokenData.erc3525Allocations = []; // Initialize as empty array
  }
}

/**
 * Fetch ERC4626 token data
 */
async function fetchERC4626Data(tokenId: string, tokenData: EnhancedTokenData): Promise<void> {
  console.log(`[TokenDataService] Fetching ERC4626 data for token ID: ${tokenId}`);
  
  // Fetch ERC4626 properties
  const { data: properties, error: propError } = await supabase
    .from('token_erc4626_properties')
    .select('*')
    .eq('token_id', tokenId)
    .maybeSingle();
  
  if (propError) {
    console.error('[TokenDataService] Error fetching ERC4626 properties:', propError);
  } else if (properties) {
    console.log('[TokenDataService] Found ERC4626 properties:', properties);
    tokenData.erc4626Properties = toCamelCase<TokenERC4626Properties>(properties);
    
    // Ensure boolean properties are properly set
    if (tokenData.erc4626Properties) {
      tokenData.erc4626Properties.isMintable = !!tokenData.erc4626Properties.isMintable;
      tokenData.erc4626Properties.isBurnable = !!tokenData.erc4626Properties.isBurnable;
      tokenData.erc4626Properties.isPausable = !!tokenData.erc4626Properties.isPausable;
      tokenData.erc4626Properties.enableFees = !!tokenData.erc4626Properties.enableFees;
      // Note: Fee amount fields (depositFee, withdrawalFee, performanceFee) should remain as strings
      // Only convert the boolean flag properties
      tokenData.erc4626Properties.compoundIntegration = !!tokenData.erc4626Properties.compoundIntegration;
      tokenData.erc4626Properties.aaveIntegration = !!tokenData.erc4626Properties.aaveIntegration;
      tokenData.erc4626Properties.uniswapIntegration = !!tokenData.erc4626Properties.uniswapIntegration;
      tokenData.erc4626Properties.curveIntegration = !!tokenData.erc4626Properties.curveIntegration;
      tokenData.erc4626Properties.enableAllowlist = !!tokenData.erc4626Properties.enableAllowlist;
      tokenData.erc4626Properties.customHooks = !!tokenData.erc4626Properties.customHooks;
      tokenData.erc4626Properties.autoReporting = !!tokenData.erc4626Properties.autoReporting;
      tokenData.erc4626Properties.previewFunctions = !!tokenData.erc4626Properties.previewFunctions;
      tokenData.erc4626Properties.limitFunctions = !!tokenData.erc4626Properties.limitFunctions;
      
      // Add form compatibility properties - these are derived from fee amounts
      tokenData.erc4626Properties.hasDepositFee = !!(tokenData.erc4626Properties.depositFee && parseFloat(tokenData.erc4626Properties.depositFee) > 0);
      tokenData.erc4626Properties.hasWithdrawalFee = !!(tokenData.erc4626Properties.withdrawalFee && parseFloat(tokenData.erc4626Properties.withdrawalFee) > 0);
      tokenData.erc4626Properties.hasPerformanceFee = !!(tokenData.erc4626Properties.performanceFee && parseFloat(tokenData.erc4626Properties.performanceFee) > 0);
      tokenData.erc4626Properties.hasCustomStrategy = !!tokenData.erc4626Properties.hasCustomStrategy;
    }
  } else {
    console.log('[TokenDataService] No ERC4626 properties found for this token');
  }
  
  // Fetch ERC4626 strategy parameters
  const { data: strategyParams, error: stratError } = await supabase
    .from('token_erc4626_strategy_params')
    .select('*')
    .eq('token_id', tokenId);
  
  if (stratError) {
    console.error('[TokenDataService] Error fetching ERC4626 strategy parameters:', stratError);
  } else if (strategyParams && strategyParams.length > 0) {
    console.log(`[TokenDataService] ✅ Found ${strategyParams.length} ERC4626 strategy parameters:`, strategyParams);
    tokenData.erc4626StrategyParams = toCamelCase<TokenERC4626StrategyParam[]>(strategyParams);
    console.log('[TokenDataService] DEBUG: Processed ERC4626 strategy parameters:', tokenData.erc4626StrategyParams);
  } else {
    console.log('[TokenDataService] ❌ No ERC4626 strategy parameters found');
    tokenData.erc4626StrategyParams = []; // Initialize as empty array
  }
  
  // Fetch ERC4626 asset allocations
  const { data: assetAllocations, error: allocError } = await supabase
    .from('token_erc4626_asset_allocations')
    .select('*')
    .eq('token_id', tokenId);
  
  if (allocError) {
    console.error('[TokenDataService] Error fetching ERC4626 asset allocations:', allocError);
  } else if (assetAllocations && assetAllocations.length > 0) {
    console.log(`[TokenDataService] ✅ Found ${assetAllocations.length} ERC4626 asset allocations:`, assetAllocations);
    tokenData.erc4626AssetAllocations = toCamelCase<TokenERC4626AssetAllocation[]>(assetAllocations);
    console.log('[TokenDataService] DEBUG: Processed ERC4626 asset allocations:', tokenData.erc4626AssetAllocations);
  } else {
    console.log('[TokenDataService] ❌ No ERC4626 asset allocations found');
    tokenData.erc4626AssetAllocations = []; // Initialize as empty array
  }
  
  // Fetch ERC4626 vault strategies
  const { data: vaultStrategies, error: vaultError } = await supabase
    .from('token_erc4626_vault_strategies')
    .select('*')
    .eq('token_id', tokenId);
  
  if (vaultError) {
    console.error('[TokenDataService] Error fetching ERC4626 vault strategies:', vaultError);
  } else if (vaultStrategies && vaultStrategies.length > 0) {
    console.log(`[TokenDataService] ✅ Found ${vaultStrategies.length} ERC4626 vault strategies:`, vaultStrategies);
    tokenData.erc4626VaultStrategies = toCamelCase<TokenERC4626VaultStrategy[]>(vaultStrategies);
    console.log('[TokenDataService] DEBUG: Processed ERC4626 vault strategies:', tokenData.erc4626VaultStrategies);
  } else {
    console.log('[TokenDataService] ❌ No ERC4626 vault strategies found');
    tokenData.erc4626VaultStrategies = []; // Initialize as empty array
  }
  
  // Fetch ERC4626 fee tiers
  const { data: feeTiers, error: feeError } = await supabase
    .from('token_erc4626_fee_tiers')
    .select('*')
    .eq('token_id', tokenId);
  
  if (feeError) {
    console.error('[TokenDataService] Error fetching ERC4626 fee tiers:', feeError);
  } else if (feeTiers && feeTiers.length > 0) {
    console.log(`[TokenDataService] ✅ Found ${feeTiers.length} ERC4626 fee tiers:`, feeTiers);
    tokenData.erc4626FeeTiers = toCamelCase<TokenERC4626FeeTier[]>(feeTiers);
    console.log('[TokenDataService] DEBUG: Processed ERC4626 fee tiers:', tokenData.erc4626FeeTiers);
  } else {
    console.log('[TokenDataService] ❌ No ERC4626 fee tiers found');
    tokenData.erc4626FeeTiers = []; // Initialize as empty array
  }
  
  // Fetch ERC4626 performance metrics
  const { data: performanceMetrics, error: metricsError } = await supabase
    .from('token_erc4626_performance_metrics')
    .select('*')
    .eq('token_id', tokenId);
  
  if (metricsError) {
    console.error('[TokenDataService] Error fetching ERC4626 performance metrics:', metricsError);
  } else if (performanceMetrics && performanceMetrics.length > 0) {
    console.log(`[TokenDataService] ✅ Found ${performanceMetrics.length} ERC4626 performance metrics:`, performanceMetrics);
    tokenData.erc4626PerformanceMetrics = toCamelCase<TokenERC4626PerformanceMetric[]>(performanceMetrics);
    console.log('[TokenDataService] DEBUG: Processed ERC4626 performance metrics:', tokenData.erc4626PerformanceMetrics);
  } else {
    console.log('[TokenDataService] ❌ No ERC4626 performance metrics found');
    tokenData.erc4626PerformanceMetrics = []; // Initialize as empty array
  }
}

/**
 * Update supporting infrastructure table data
 */
async function updateSupportingInfrastructureData(tokenId: string, data: any): Promise<void> {
  // Update whitelists
  if (data.whitelistConfig && typeof data.whitelistConfig === 'object') {
    // First delete existing whitelists
    const { error: deleteError } = await supabase
      .from('token_whitelists')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing token whitelists: ${deleteError.message}`);
    }
    
    // Insert whitelist configuration
    if (data.whitelistConfig.addresses && Array.isArray(data.whitelistConfig.addresses)) {
      const whitelistsWithTokenId = data.whitelistConfig.addresses.map((address: any) => ({
        token_id: tokenId,
        address: typeof address === 'string' ? address : address.address,
        whitelist_type: data.whitelistConfig.whitelistType || 'transfer',
        is_active: true,
        added_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('token_whitelists')
        .insert(whitelistsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting token whitelists: ${insertError.message}`);
      }
    }
  }

  // Update geographic restrictions
  if (data.geographicRestrictions && Array.isArray(data.geographicRestrictions)) {
    // First delete existing geographic restrictions
    const { error: deleteError } = await supabase
      .from('token_geographic_restrictions')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing geographic restrictions: ${deleteError.message}`);
    }
    
    // Then insert new geographic restrictions
    if (data.geographicRestrictions.length > 0) {
      const restrictionsWithTokenId = data.geographicRestrictions.map((restriction: any) => ({
        token_id: tokenId,
        country_code: typeof restriction === 'string' ? restriction : restriction.countryCode,
        restriction_type: typeof restriction === 'object' ? restriction.restrictionType || 'blocked' : 'blocked',
        is_active: true
      }));
      
      const { error: insertError } = await supabase
        .from('token_geographic_restrictions')
        .insert(restrictionsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting geographic restrictions: ${insertError.message}`);
      }
    }
  }

  // Update sanctions rules
  if (data.sanctionsConfig && typeof data.sanctionsConfig === 'object') {
    // First delete existing sanctions rules
    const { error: deleteError } = await supabase
      .from('token_sanctions_rules')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing sanctions rules: ${deleteError.message}`);
    }
    
    // Insert sanctions configuration
    const sanctionsRule = {
      token_id: tokenId,
      sanctions_regime: data.sanctionsConfig.sanctionsRegime || 'ofac',
      screening_enabled: data.sanctionsConfig.enabled !== false,
      auto_block_sanctioned_entities: data.sanctionsConfig.autoBlock !== false,
      enhanced_due_diligence_required: data.sanctionsConfig.enhancedDueDiligence || false,
      screening_frequency: data.sanctionsConfig.screeningFrequency || 'daily',
      created_at: new Date().toISOString()
    };
    
    const { error: insertError } = await supabase
      .from('token_sanctions_rules')
      .insert(sanctionsRule);
    
    if (insertError) {
      throw new Error(`Error inserting sanctions rules: ${insertError.message}`);
    }
  }

  // Update token allocations
  if (data.allocations && Array.isArray(data.allocations)) {
    // First delete existing allocations
    const { error: deleteError } = await supabase
      .from('token_allocations')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing token allocations: ${deleteError.message}`);
    }
    
    // Then insert new allocations
    if (data.allocations.length > 0) {
      const allocationsWithTokenId = data.allocations.map((allocation: any) => ({
        token_id: tokenId,
        investor_id: allocation.investorId || allocation.investor_id,
        allocation_amount: allocation.allocationAmount || allocation.amount,
        allocation_type: allocation.allocationType || allocation.type || 'initial',
        vesting_schedule: allocation.vestingSchedule || null,
        cliff_period: allocation.cliffPeriod || 0,
        is_locked: allocation.isLocked || false,
        created_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('token_allocations')
        .insert(allocationsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting token allocations: ${insertError.message}`);
      }
    }
  }

  // Update token operations
  if (data.operations && Array.isArray(data.operations)) {
    // First delete existing operations
    const { error: deleteError } = await supabase
      .from('token_operations')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing token operations: ${deleteError.message}`);
    }
    
    // Then insert new operations
    if (data.operations.length > 0) {
      const operationsWithTokenId = data.operations.map((operation: any) => ({
        token_id: tokenId,
        operation_type: operation.operationType || operation.type,
        from_address: operation.fromAddress || operation.from,
        to_address: operation.toAddress || operation.to,
        amount: operation.amount,
        transaction_hash: operation.transactionHash || operation.txHash,
        block_number: operation.blockNumber,
        gas_used: operation.gasUsed || null,
        gas_price: operation.gasPrice || null,
        status: operation.status || 'completed',
        created_at: operation.timestamp || new Date().toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('token_operations')
        .insert(operationsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting token operations: ${insertError.message}`);
      }
    }
  }

  // Update token events
  if (data.events && Array.isArray(data.events)) {
    // First delete existing events
    const { error: deleteError } = await supabase
      .from('token_events')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing token events: ${deleteError.message}`);
    }
    
    // Then insert new events
    if (data.events.length > 0) {
      const eventsWithTokenId = data.events.map((event: any) => ({
        token_id: tokenId,
        event_type: event.eventType || event.type,
        event_data: event.eventData || event.data || {},
        transaction_hash: event.transactionHash || event.txHash,
        block_number: event.blockNumber,
        log_index: event.logIndex || 0,
        created_at: event.timestamp || new Date().toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('token_events')
        .insert(eventsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting token events: ${insertError.message}`);
      }
    }
  }
}


/**
 * Update token standard-specific data
 * @param tokenId The token ID
 * @param data The token data to update
 */
export async function updateTokenStandardData(tokenId: string, standard: TokenStandard, data: any): Promise<void> {
  try {
    // Update standard-specific data
    switch (standard) {
      case TokenStandard.ERC20:
        await updateERC20Data(tokenId, data);
        break;
      case TokenStandard.ERC721:
        await updateERC721Data(tokenId, data);
        break;
      case TokenStandard.ERC1155:
        await updateERC1155Data(tokenId, data);
        break;
      case TokenStandard.ERC1400:
        await updateERC1400Data(tokenId, data);
        break;
      case TokenStandard.ERC3525:
        await updateERC3525Data(tokenId, data);
        break;
      case TokenStandard.ERC4626:
        await updateERC4626Data(tokenId, data);
        break;
    }

    // Update supporting infrastructure data for all standards
    await updateSupportingInfrastructureData(tokenId, data);
  } catch (error) {
    console.error(`Error updating ${standard} data:`, error);
    throw error;
  }
}

/**
 * Update ERC20 token data
 */
async function updateERC20Data(tokenId: string, data: Partial<TokenERC20Properties>): Promise<void> {
  const { error } = await supabase
    .from('token_erc20_properties')
    .upsert({
      ...data,
      token_id: tokenId,
      updated_at: new Date().toISOString()
    });
  
  if (error) {
    throw new Error(`Error updating ERC20 properties: ${error.message}`);
  }
}

/**
 * Update ERC721 token data
 */
async function updateERC721Data(tokenId: string, data: any): Promise<void> {
  // Update properties
  if (data.properties) {
    const { error } = await supabase
      .from('token_erc721_properties')
      .upsert({
        ...data.properties,
        token_id: tokenId,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      throw new Error(`Error updating ERC721 properties: ${error.message}`);
    }
  }
  
  // Update attributes
  if (data.attributes && Array.isArray(data.attributes)) {
    // First, delete existing attributes
    const { error: deleteError } = await supabase
      .from('token_erc721_attributes')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC721 attributes: ${deleteError.message}`);
    }
    
    // Then insert new attributes
    if (data.attributes.length > 0) {
      const attributesWithTokenId = data.attributes.map((attr: any) => ({
        ...attr,
        token_id: tokenId
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc721_attributes')
        .insert(attributesWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC721 attributes: ${insertError.message}`);
      }
    }
  }

  // Update mint phases
  if (data.mintPhases && Array.isArray(data.mintPhases)) {
    // First delete existing mint phases
    const { error: deleteError } = await supabase
      .from('token_erc721_mint_phases')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC721 mint phases: ${deleteError.message}`);
    }
    
    // Then insert new mint phases
    if (data.mintPhases.length > 0) {
      const phasesWithTokenId = data.mintPhases.map((phase: any) => ({
        token_id: tokenId,
        phase_name: phase.phaseName || phase.name,
        start_time: phase.startTime || phase.start_time,
        end_time: phase.endTime || phase.end_time,
        price: phase.price,
        currency: phase.currency || 'ETH',
        max_per_wallet: phase.maxPerWallet || phase.max_per_wallet,
        max_supply: phase.maxSupply || phase.max_supply,
        whitelist_only: phase.whitelistOnly || phase.whitelist_only || false,
        tier: phase.tier
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc721_mint_phases')
        .insert(phasesWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC721 mint phases: ${insertError.message}`);
      }
    }
  }

  // Update trait definitions
  if (data.traitDefinitions && Array.isArray(data.traitDefinitions)) {
    // First delete existing trait definitions
    const { error: deleteError } = await supabase
      .from('token_erc721_trait_definitions')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC721 trait definitions: ${deleteError.message}`);
    }
    
    // Then insert new trait definitions
    if (data.traitDefinitions.length > 0) {
      const traitsWithTokenId = data.traitDefinitions.map((trait: any) => ({
        token_id: tokenId,
        trait_name: trait.traitName || trait.trait_name,
        trait_type: trait.traitType || trait.trait_type,
        possible_values: Array.isArray(trait.possibleValues) ? trait.possibleValues : 
                        Array.isArray(trait.possible_values) ? trait.possible_values : []
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc721_trait_definitions')
        .insert(traitsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC721 trait definitions: ${insertError.message}`);
      }
    }
  }
}

/**
 * Update ERC1155 token data
 */
async function updateERC1155Data(tokenId: string, data: any): Promise<void> {
  // Update properties
  if (data.properties) {
    // Convert camelCase properties to snake_case for database
    const dbProperties = {
      token_id: tokenId,
      base_uri: data.properties.baseUri,
      metadata_storage: data.properties.metadataStorage,
      has_royalty: data.properties.hasRoyalty,
      royalty_percentage: data.properties.royaltyPercentage,
      royalty_receiver: data.properties.royaltyReceiver,
      is_burnable: data.properties.isBurnable,
      is_pausable: data.properties.isPausable,
      updatable_uris: data.properties.updatableUris,
      supply_tracking: data.properties.supplyTracking,
      enable_approval_for_all: data.properties.enableApprovalForAll,
      sales_config: data.properties.salesConfig,
      whitelist_config: data.properties.whitelistConfig,
      batch_transfer_limits: data.properties.batchTransferLimits,
      dynamic_uri_config: typeof data.properties.dynamicUris === 'object' ? data.properties.dynamicUris : null,
      batch_minting_config: typeof data.properties.batchMinting === 'object' ? data.properties.batchMinting : null,
      container_config: typeof data.properties.containerEnabled === 'object' ? data.properties.containerEnabled : null,
      transfer_restrictions: data.properties.transferRestrictions ? {} : null,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('token_erc1155_properties')
      .upsert(dbProperties);
    
    if (error) {
      throw new Error(`Error updating ERC1155 properties: ${error.message}`);
    }
  }
  
  // Update token types
  if (data.types && Array.isArray(data.types)) {
    // For types, we'll use upsert with the token_type_id as the key
    for (const type of data.types) {
      const { error } = await supabase
        .from('token_erc1155_types')
        .upsert({
          ...type,
          token_id: tokenId
        });
      
      if (error) {
        throw new Error(`Error upserting ERC1155 type: ${error.message}`);
      }
    }
    
    // Handle deletes if needed (not implemented here)
  }
  
  // Update balances
  if (data.balances && Array.isArray(data.balances)) {
    for (const balance of data.balances) {
      const { error } = await supabase
        .from('token_erc1155_balances')
        .upsert({
          ...balance,
          token_id: tokenId
        });
      
      if (error) {
        throw new Error(`Error upserting ERC1155 balance: ${error.message}`);
      }
    }
  }
  
  // Update URI mappings
  if (data.uriMappings && Array.isArray(data.uriMappings)) {
    for (const mapping of data.uriMappings) {
      const { error } = await supabase
        .from('token_erc1155_uri_mappings')
        .upsert({
          ...mapping,
          token_id: tokenId
        });
      
      if (error) {
        throw new Error(`Error upserting ERC1155 URI mapping: ${error.message}`);
      }
    }
  }

  // Update crafting recipes
  if (data.craftingRecipes && Array.isArray(data.craftingRecipes)) {
    // First delete existing crafting recipes
    const { error: deleteError } = await supabase
      .from('token_erc1155_crafting_recipes')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1155 crafting recipes: ${deleteError.message}`);
    }
    
    // Then insert new crafting recipes
    if (data.craftingRecipes.length > 0) {
      const recipesWithTokenId = data.craftingRecipes.map((recipe: any) => ({
        token_id: tokenId,
        recipe_name: recipe.name || recipe.recipeName, // FIX: Use recipe_name instead of recipe_id
        input_tokens: Array.isArray(recipe.inputs) ? recipe.inputs : [], // FIX: Use input_tokens instead of inputs
        output_token_type_id: recipe.outputTokenTypeId || recipe.outputTypeId || '1', // FIX: Use output_token_type_id
        output_quantity: parseInt(recipe.outputQuantity) || 1, // FIX: Use output_quantity
        success_rate: parseInt(recipe.successRate) || 100, // FIX: Use success_rate
        cooldown_period: parseInt(recipe.cooldown) || 0, // FIX: Use cooldown_period instead of cooldown
        required_level: parseInt(recipe.requiredLevel) || 0, // FIX: Use required_level
        is_active: recipe.isEnabled !== false // FIX: Use is_active instead of is_enabled
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc1155_crafting_recipes')
        .insert(recipesWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1155 crafting recipes: ${insertError.message}`);
      }
    }
  }

  // Update discount tiers
  if (data.discountTiers && Array.isArray(data.discountTiers)) {
    // First delete existing discount tiers
    const { error: deleteError } = await supabase
      .from('token_erc1155_discount_tiers')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1155 discount tiers: ${deleteError.message}`);
    }
    
    // Then insert new discount tiers
    if (data.discountTiers.length > 0) {
      const tiersWithTokenId = data.discountTiers.map((tier: any) => ({
        token_id: tokenId,
        min_quantity: parseInt(tier.minimumQuantity) || parseInt(tier.minQuantity) || 1, // FIX: Use min_quantity
        max_quantity: tier.maximumQuantity ? parseInt(tier.maximumQuantity) : (tier.maxQuantity ? parseInt(tier.maxQuantity) : null), // FIX: Use max_quantity
        discount_percentage: tier.discountPercentage || tier.discount || '0',
        tier_name: tier.name || tier.tier || tier.tierName, // FIX: Use tier_name instead of description
        is_active: tier.isActive !== false // FIX: Use is_active
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc1155_discount_tiers')
        .insert(tiersWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1155 discount tiers: ${insertError.message}`);
      }
    }
  }

  // Update type configs
  if (data.typeConfigs && Array.isArray(data.typeConfigs)) {
    // First delete existing type configs
    const { error: deleteError } = await supabase
      .from('token_erc1155_type_configs')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1155 type configs: ${deleteError.message}`);
    }
    
    // Then insert new type configs
    if (data.typeConfigs.length > 0) {
      const configsWithTokenId = data.typeConfigs.map((config: any) => ({
        token_id: tokenId,
        token_type_id: config.tokenTypeId || config.tokenId || config.id || '1',
        supply_cap: config.supplyCap || config.maxSupply, // FIX: Use supply_cap
        mint_price: config.mintPrice || config.price, // FIX: Use mint_price
        is_tradeable: config.isTradeable !== false && config.tradeable !== false, // FIX: Use is_tradeable
        is_transferable: config.isTransferable !== false && config.transferable !== false, // FIX: Use is_transferable
        utility_type: config.utilityType || config.type, // FIX: Use utility_type
        rarity_tier: config.rarityTier || config.rarity, // FIX: Use rarity_tier
        experience_value: parseInt(config.experienceValue) || parseInt(config.xp) || 0, // FIX: Use experience_value
        crafting_materials: typeof config.craftingMaterials === 'object' ? config.craftingMaterials : {}, // FIX: Use crafting_materials
        burn_rewards: typeof config.burnRewards === 'object' ? config.burnRewards : {} // FIX: Use burn_rewards
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc1155_type_configs')
        .insert(configsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1155 type configs: ${insertError.message}`);
      }
    }
  }
}

/**
 * Update ERC1400 token data
 */
async function updateERC1400Data(tokenId: string, data: any): Promise<void> {
  // Update properties
  if (data.properties) {
    // Convert camelCase properties to snake_case for database
    const dbProperties = {
      token_id: tokenId,
      initial_supply: data.properties.initialSupply,
      cap: data.properties.cap,
      is_mintable: data.properties.isMintable,
      is_burnable: data.properties.isBurnable,
      is_pausable: data.properties.isPausable,
      document_uri: data.properties.documentUri,
      document_hash: data.properties.documentHash,
      controller_address: data.properties.controllerAddress,
      require_kyc: data.properties.requireKyc,
      security_type: data.properties.isMultiClass ? 'multi_class' : data.properties.securityType,
      issuing_jurisdiction: data.properties.issuingJurisdiction,
      issuing_entity_name: data.properties.issuingEntityName,
      issuing_entity_lei: data.properties.issuingEntityLei,
      transfer_restrictions: data.properties.transferRestrictions || null,
      kyc_settings: data.properties.kycSettings || null,
      compliance_settings: data.properties.complianceSettings || null,
      forced_transfers: data.properties.forcedTransfers,
      issuance_modules: data.properties.issuanceModules,
      document_management: data.properties.documentManagement,
      recovery_mechanism: data.properties.recoveryMechanism,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('token_erc1400_properties')
      .upsert(dbProperties);
    
    if (error) {
      throw new Error(`Error updating ERC1400 properties: ${error.message}`);
    }
  }
  
  // Update partitions
  if (data.partitions && Array.isArray(data.partitions)) {
    // For partitions, we'll use upsert with the partition_id as the key
    for (const partition of data.partitions) {
      // Ensure partition_id is set
      if (!partition.partitionId && partition.name) {
        partition.partitionId = partition.name.toLowerCase().replace(/\s+/g, '_');
      }
      
      const { error } = await supabase
        .from('token_erc1400_partitions')
        .upsert({
          token_id: tokenId,
          name: partition.name,
          partition_id: partition.partitionId,
          metadata: partition.metadata || {}
        });
      
      if (error) {
        throw new Error(`Error upserting ERC1400 partition: ${error.message}`);
      }
    }
  }
  
  // Update controllers
  if (data.controllers && Array.isArray(data.controllers)) {
    // First delete existing controllers
    const { error: deleteError } = await supabase
      .from('token_erc1400_controllers')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1400 controllers: ${deleteError.message}`);
    }
    
    // Then insert new controllers
    if (data.controllers.length > 0) {
      const controllersWithTokenId = data.controllers.map((ctrl: any) => ({
        token_id: tokenId,
        address: ctrl.address,
        permissions: Array.isArray(ctrl.permissions) ? ctrl.permissions : ["ADMIN"]
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc1400_controllers')
        .insert(controllersWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1400 controllers: ${insertError.message}`);
      }
    }
  }

  // Update documents
  if (data.documents && Array.isArray(data.documents)) {
    // First delete existing documents
    const { error: deleteError } = await supabase
      .from('token_erc1400_documents')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1400 documents: ${deleteError.message}`);
    }
    
    // Then insert new documents
    if (data.documents.length > 0) {
      const documentsWithTokenId = data.documents.map((doc: any) => ({
        token_id: tokenId,
        name: doc.name,
        document_uri: doc.documentUri || doc.uri,
        document_type: doc.documentType || doc.type || 'general',
        document_hash: doc.documentHash || doc.hash || null
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc1400_documents')
        .insert(documentsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1400 documents: ${insertError.message}`);
      }
    }
  }

  // Update corporate actions
  if (data.corporateActionsData && Array.isArray(data.corporateActionsData)) {
    // First delete existing corporate actions
    const { error: deleteError } = await supabase
      .from('token_erc1400_corporate_actions')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1400 corporate actions: ${deleteError.message}`);
    }
    
    // Then insert new corporate actions
    if (data.corporateActionsData.length > 0) {
      const actionsWithTokenId = data.corporateActionsData.map((action: any) => ({
        token_id: tokenId,
        action_type: action.actionType || action.type,
        record_date: action.recordDate,
        payment_date: action.paymentDate,
        amount_per_share: action.amountPerShare,
        currency: action.currency || 'USD',
        description: action.description || null
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc1400_corporate_actions')
        .insert(actionsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1400 corporate actions: ${insertError.message}`);
      }
    }
  }

  // Update custody providers
  if (data.custodyProviders && Array.isArray(data.custodyProviders)) {
    // First delete existing custody providers
    const { error: deleteError } = await supabase
      .from('token_erc1400_custody_providers')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1400 custody providers: ${deleteError.message}`);
    }
    
    // Then insert new custody providers
    if (data.custodyProviders.length > 0) {
      const providersWithTokenId = data.custodyProviders.map((provider: any) => ({
        token_id: tokenId,
        name: provider.name,
        address: provider.address,
        jurisdiction: provider.jurisdiction,
        regulatory_license: provider.regulatoryLicense || provider.license
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc1400_custody_providers')
        .insert(providersWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1400 custody providers: ${insertError.message}`);
      }
    }
  }

  // Update regulatory filings
  if (data.regulatoryFilings && Array.isArray(data.regulatoryFilings)) {
    // First delete existing regulatory filings
    const { error: deleteError } = await supabase
      .from('token_erc1400_regulatory_filings')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1400 regulatory filings: ${deleteError.message}`);
    }
    
    // Then insert new regulatory filings
    if (data.regulatoryFilings.length > 0) {
      const filingsWithTokenId = data.regulatoryFilings.map((filing: any) => ({
        token_id: tokenId,
        filing_type: filing.filingType || filing.type,
        filing_date: filing.filingDate || filing.date,
        regulator: filing.regulator,
        reference_number: filing.referenceNumber || filing.reference,
        description: filing.description || null
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc1400_regulatory_filings')
        .insert(filingsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1400 regulatory filings: ${insertError.message}`);
      }
    }
  }

  // Update partition balances
  if (data.partitionBalances && Array.isArray(data.partitionBalances)) {
    // First delete existing partition balances
    const { error: deleteError } = await (supabase as any)
      .from('token_erc1400_partition_balances')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1400 partition balances: ${deleteError.message}`);
    }
    
    // Then insert new partition balances
    if (data.partitionBalances.length > 0) {
      const balancesWithTokenId: any[] = data.partitionBalances.map((balance: any): any => ({
        token_id: tokenId,
        partition_id: balance.partitionId,
        holder_address: balance.holderAddress || balance.address,
        balance: balance.balance,
        locked_balance: balance.lockedBalance || '0',
        updated_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await (supabase as any)
        .from('token_erc1400_partition_balances')
        .insert(balancesWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1400 partition balances: ${insertError.message}`);
      }
    }
  }

  // Update partition operators
  if (data.partitionOperators && Array.isArray(data.partitionOperators)) {
    // First delete existing partition operators
    const { error: deleteError } = await (supabase as any)
      .from('token_erc1400_partition_operators')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1400 partition operators: ${deleteError.message}`);
    }
    
    // Then insert new partition operators
    if (data.partitionOperators.length > 0) {
      const operatorsWithTokenId: any[] = data.partitionOperators.map((operator: any): any => ({
        token_id: tokenId,
        partition_id: operator.partitionId,
        operator_address: operator.operatorAddress || operator.address,
        operator_type: operator.operatorType || 'default',
        permissions: Array.isArray(operator.permissions) ? operator.permissions : []
      }));
      
      const { error: insertError } = await (supabase as any)
        .from('token_erc1400_partition_operators')
        .insert(operatorsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1400 partition operators: ${insertError.message}`);
      }
    }
  }

  // Update partition transfers
  if (data.partitionTransfers && Array.isArray(data.partitionTransfers)) {
    // First delete existing partition transfers
    const { error: deleteError } = await (supabase as any)
      .from('token_erc1400_partition_transfers')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC1400 partition transfers: ${deleteError.message}`);
    }
    
    // Then insert new partition transfers
    if (data.partitionTransfers.length > 0) {
      const transfersWithTokenId: any[] = data.partitionTransfers.map((transfer: any): any => ({
        token_id: tokenId,
        partition_id: transfer.partitionId,
        from_address: transfer.fromAddress || transfer.from,
        to_address: transfer.toAddress || transfer.to,
        amount: transfer.amount,
        transaction_hash: transfer.transactionHash || transfer.txHash,
        block_number: transfer.blockNumber,
        timestamp: transfer.timestamp || new Date().toISOString()
      }));
      
      const { error: insertError } = await (supabase as any)
        .from('token_erc1400_partition_transfers')
        .insert(transfersWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC1400 partition transfers: ${insertError.message}`);
      }
    }
  }
}

/**
 * Update ERC3525 token data
 */
async function updateERC3525Data(tokenId: string, data: any): Promise<void> {
  // Update properties
  if (data.properties) {
    const { error } = await supabase
      .from('token_erc3525_properties')
      .upsert({
        ...data.properties,
        token_id: tokenId,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      throw new Error(`Error updating ERC3525 properties: ${error.message}`);
    }
  }
  
  // Update slots
  if (data.slots && Array.isArray(data.slots)) {
    // For slots, we'll use upsert with the slot_id as the key
    for (const slot of data.slots) {
      const { error } = await supabase
        .from('token_erc3525_slots')
        .upsert({
          ...slot,
          token_id: tokenId
        });
      
      if (error) {
        throw new Error(`Error upserting ERC3525 slot: ${error.message}`);
      }
    }
  }
  
  // Update allocations
  if (data.allocations && Array.isArray(data.allocations)) {
    // For allocations, we'll just delete and re-insert
    const { error: deleteError } = await supabase
      .from('token_erc3525_allocations')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC3525 allocations: ${deleteError.message}`);
    }
    
    if (data.allocations.length > 0) {
      const allocationsWithTokenId = data.allocations.map((alloc: any) => ({
        ...alloc,
        token_id: tokenId
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc3525_allocations')
        .insert(allocationsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC3525 allocations: ${insertError.message}`);
      }
    }
  }

  // Update payment schedules
  if (data.paymentSchedules && Array.isArray(data.paymentSchedules)) {
    // First delete existing payment schedules
    const { error: deleteError } = await supabase
      .from('token_erc3525_payment_schedules')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC3525 payment schedules: ${deleteError.message}`);
    }
    
    // Then insert new payment schedules
    if (data.paymentSchedules.length > 0) {
      const schedulesWithTokenId = data.paymentSchedules.map((schedule: any) => ({
        token_id: tokenId,
        slot_id: schedule.slotId,
        payment_date: schedule.paymentDate,
        payment_amount: schedule.paymentAmount,
        payment_type: schedule.paymentType || 'interest',
        currency: schedule.currency || 'USD',
        is_completed: schedule.isCompleted || false
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc3525_payment_schedules')
        .insert(schedulesWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC3525 payment schedules: ${insertError.message}`);
      }
    }
  }

  // Update value adjustments
  if (data.valueAdjustments && Array.isArray(data.valueAdjustments)) {
    // First delete existing value adjustments
    const { error: deleteError } = await supabase
      .from('token_erc3525_value_adjustments')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC3525 value adjustments: ${deleteError.message}`);
    }
    
    // Then insert new value adjustments
    if (data.valueAdjustments.length > 0) {
      const adjustmentsWithTokenId = data.valueAdjustments.map((adjustment: any) => ({
        token_id: tokenId,
        slot_id: adjustment.slotId,
        adjustment_date: adjustment.adjustmentDate,
        adjustment_type: adjustment.adjustmentType,
        adjustment_amount: adjustment.adjustmentAmount,
        adjustment_reason: adjustment.adjustmentReason,
        oracle_price: adjustment.oraclePrice,
        oracle_source: adjustment.oracleSource,
        approved_by: adjustment.approvedBy
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc3525_value_adjustments')
        .insert(adjustmentsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC3525 value adjustments: ${insertError.message}`);
      }
    }
  }

  // Update slot configs
  if (data.slotConfigs && Array.isArray(data.slotConfigs)) {
    // First delete existing slot configs
    const { error: deleteError } = await supabase
      .from('token_erc3525_slot_configs')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      throw new Error(`Error deleting existing ERC3525 slot configs: ${deleteError.message}`);
    }
    
    // Then insert new slot configs
    if (data.slotConfigs.length > 0) {
      const configsWithTokenId = data.slotConfigs.map((config: any) => ({
        token_id: tokenId,
        slot_id: config.slotId,
        name: config.name,
        description: config.description,
        metadata: config.metadata || {},
        value_units: config.valueUnits,
        slot_transferable: config.slotTransferable || true
      }));
      
      const { error: insertError } = await supabase
        .from('token_erc3525_slot_configs')
        .insert(configsWithTokenId);
      
      if (insertError) {
        throw new Error(`Error inserting ERC3525 slot configs: ${insertError.message}`);
      }
    }
  }
}

/**
 * Update ERC4626 token data
 */
async function updateERC4626Data(tokenId: string, data: any): Promise<void> {
  // Update properties
  if (data.properties) {
    const { error } = await supabase
      .from('token_erc4626_properties')
      .upsert({
        ...data.properties,
        token_id: tokenId,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      throw new Error(`Error updating ERC4626 properties: ${error.message}`);
    }
  }
  
  // Update strategy parameters
  if (data.strategyParams && Array.isArray(data.strategyParams)) {
    console.log(`[TokenDataService] DEBUG: Processing ${data.strategyParams.length} ERC4626 strategy parameters for token ${tokenId}:`, data.strategyParams);
    
    // First delete existing parameters
    const { error: deleteError } = await supabase
      .from('token_erc4626_strategy_params')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      console.error('[TokenDataService] ERROR: Failed to delete existing ERC4626 strategy parameters:', deleteError);
      throw new Error(`Error deleting existing ERC4626 strategy parameters: ${deleteError.message}`);
    } else {
      console.log('[TokenDataService] ✅ Successfully deleted existing ERC4626 strategy parameters');
    }
    
    if (data.strategyParams.length > 0) {
      const paramsWithTokenId = data.strategyParams.map((param: any) => ({
        ...param,
        token_id: tokenId
      }));
      
      console.log('[TokenDataService] DEBUG: Inserting ERC4626 strategy parameters:', paramsWithTokenId);
      
      const { error: insertError } = await supabase
        .from('token_erc4626_strategy_params')
        .insert(paramsWithTokenId);
      
      if (insertError) {
        console.error('[TokenDataService] ERROR: Failed to insert ERC4626 strategy parameters:', insertError);
        throw new Error(`Error inserting ERC4626 strategy parameters: ${insertError.message}`);
      } else {
        console.log(`[TokenDataService] ✅ Successfully inserted ${data.strategyParams.length} ERC4626 strategy parameters`);
      }
    }
  } else {
    console.log('[TokenDataService] DEBUG: No ERC4626 strategy parameters to update');
  }
  
  // Update asset allocations
  if (data.assetAllocations && Array.isArray(data.assetAllocations)) {
    console.log(`[TokenDataService] DEBUG: Processing ${data.assetAllocations.length} ERC4626 asset allocations for token ${tokenId}:`, data.assetAllocations);
    
    // First delete existing asset allocations
    const { error: deleteError } = await supabase
      .from('token_erc4626_asset_allocations')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      console.error('[TokenDataService] ERROR: Failed to delete existing ERC4626 asset allocations:', deleteError);
      throw new Error(`Error deleting existing ERC4626 asset allocations: ${deleteError.message}`);
    } else {
      console.log('[TokenDataService] ✅ Successfully deleted existing ERC4626 asset allocations');
    }
    
    if (data.assetAllocations.length > 0) {
      const allocationsWithTokenId = data.assetAllocations.map((allocation: any) => ({
        token_id: tokenId,
        asset: allocation.asset,
        percentage: allocation.percentage,
        description: allocation.description || null,
        protocol: allocation.protocol || null,
        expected_apy: allocation.expectedApy || allocation.expected_apy || null
      }));
      
      console.log('[TokenDataService] DEBUG: Inserting ERC4626 asset allocations:', allocationsWithTokenId);
      
      const { error: insertError } = await supabase
        .from('token_erc4626_asset_allocations')
        .insert(allocationsWithTokenId);
      
      if (insertError) {
        console.error('[TokenDataService] ERROR: Failed to insert ERC4626 asset allocations:', insertError);
        throw new Error(`Error inserting ERC4626 asset allocations: ${insertError.message}`);
      } else {
        console.log(`[TokenDataService] ✅ Successfully inserted ${data.assetAllocations.length} ERC4626 asset allocations`);
      }
    }
  } else {
    console.log('[TokenDataService] DEBUG: No ERC4626 asset allocations to update');
  }

  // Update vault strategies
  if (data.vaultStrategies && Array.isArray(data.vaultStrategies)) {
    console.log(`[TokenDataService] DEBUG: Processing ${data.vaultStrategies.length} ERC4626 vault strategies for token ${tokenId}:`, data.vaultStrategies);
    
    // First delete existing vault strategies
    const { error: deleteError } = await supabase
      .from('token_erc4626_vault_strategies')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      console.error('[TokenDataService] ERROR: Failed to delete existing ERC4626 vault strategies:', deleteError);
      throw new Error(`Error deleting existing ERC4626 vault strategies: ${deleteError.message}`);
    } else {
      console.log('[TokenDataService] ✅ Successfully deleted existing ERC4626 vault strategies');
    }
    
    // Then insert new vault strategies
    if (data.vaultStrategies.length > 0) {
      const strategiesWithTokenId = data.vaultStrategies.map((strategy: any) => ({
        token_id: tokenId,
        strategy_name: strategy.strategyName || strategy.name,
        strategy_type: strategy.strategyType,
        protocol_address: strategy.protocolAddress || null,
        protocol_name: strategy.protocolName || strategy.protocol || null,
        allocation_percentage: strategy.allocationPercentage || strategy.allocation,
        min_allocation_percentage: strategy.minAllocationPercentage || null,
        max_allocation_percentage: strategy.maxAllocationPercentage || null,
        risk_score: strategy.riskScore || null,
        expected_apy: strategy.expectedApy || strategy.expectedAPY || null,
        actual_apy: strategy.actualApy || strategy.actualAPY || null,
        is_active: strategy.isActive !== undefined ? strategy.isActive : true,
        last_rebalance: strategy.lastRebalance || null
      }));
      
      console.log('[TokenDataService] DEBUG: Inserting ERC4626 vault strategies:', strategiesWithTokenId);
      
      const { error: insertError } = await supabase
        .from('token_erc4626_vault_strategies')
        .insert(strategiesWithTokenId);
      
      if (insertError) {
        console.error('[TokenDataService] ERROR: Failed to insert ERC4626 vault strategies:', insertError);
        throw new Error(`Error inserting ERC4626 vault strategies: ${insertError.message}`);
      } else {
        console.log(`[TokenDataService] ✅ Successfully inserted ${data.vaultStrategies.length} ERC4626 vault strategies`);
      }
    }
  } else {
    console.log('[TokenDataService] DEBUG: No ERC4626 vault strategies to update');
  }

  // Update fee tiers
  if (data.feeTiers && Array.isArray(data.feeTiers)) {
    console.log(`[TokenDataService] DEBUG: Processing ${data.feeTiers.length} ERC4626 fee tiers for token ${tokenId}:`, data.feeTiers);
    
    // First delete existing fee tiers
    const { error: deleteError } = await supabase
      .from('token_erc4626_fee_tiers')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      console.error('[TokenDataService] ERROR: Failed to delete existing ERC4626 fee tiers:', deleteError);
      throw new Error(`Error deleting existing ERC4626 fee tiers: ${deleteError.message}`);
    } else {
      console.log('[TokenDataService] ✅ Successfully deleted existing ERC4626 fee tiers');
    }
    
    // Then insert new fee tiers
    if (data.feeTiers.length > 0) {
      const tiersWithTokenId = data.feeTiers.map((tier: any) => ({
        token_id: tokenId,
        tier_name: tier.tierName,
        min_balance: tier.minBalance,
        max_balance: tier.maxBalance || null,
        management_fee_rate: tier.managementFeeRate || tier.managementFee,
        performance_fee_rate: tier.performanceFeeRate || tier.performanceFee,
        deposit_fee_rate: tier.depositFeeRate || tier.depositFee || '0',
        withdrawal_fee_rate: tier.withdrawalFeeRate || tier.withdrawalFee || '0',
        tier_benefits: tier.tierBenefits || null,
        is_active: tier.isActive !== undefined ? tier.isActive : true
      }));
      
      console.log('[TokenDataService] DEBUG: Inserting ERC4626 fee tiers:', tiersWithTokenId);
      
      const { error: insertError } = await supabase
        .from('token_erc4626_fee_tiers')
        .insert(tiersWithTokenId);
      
      if (insertError) {
        console.error('[TokenDataService] ERROR: Failed to insert ERC4626 fee tiers:', insertError);
        throw new Error(`Error inserting ERC4626 fee tiers: ${insertError.message}`);
      } else {
        console.log(`[TokenDataService] ✅ Successfully inserted ${data.feeTiers.length} ERC4626 fee tiers`);
      }
    }
  } else {
    console.log('[TokenDataService] DEBUG: No ERC4626 fee tiers to update');
  }

  // Update performance metrics
  if (data.performanceMetrics && Array.isArray(data.performanceMetrics)) {
    console.log(`[TokenDataService] DEBUG: Processing ${data.performanceMetrics.length} ERC4626 performance metrics for token ${tokenId}:`, data.performanceMetrics);
    
    // First delete existing performance metrics
    const { error: deleteError } = await supabase
      .from('token_erc4626_performance_metrics')
      .delete()
      .eq('token_id', tokenId);
    
    if (deleteError) {
      console.error('[TokenDataService] ERROR: Failed to delete existing ERC4626 performance metrics:', deleteError);
      throw new Error(`Error deleting existing ERC4626 performance metrics: ${deleteError.message}`);
    } else {
      console.log('[TokenDataService] ✅ Successfully deleted existing ERC4626 performance metrics');
    }
    
    // Then insert new performance metrics
    if (data.performanceMetrics.length > 0) {
      const metricsWithTokenId = data.performanceMetrics.map((metric: any) => ({
        token_id: tokenId,
        metric_date: metric.metricDate || new Date().toISOString().split('T')[0],
        total_assets: metric.totalAssets,
        share_price: metric.sharePrice,
        apy: metric.apy || null,
        daily_yield: metric.dailyYield || null,
        benchmark_performance: metric.benchmarkPerformance || null,
        total_fees_collected: metric.totalFeesCollected || null,
        new_deposits: metric.newDeposits || null,
        withdrawals: metric.withdrawals || null,
        net_flow: metric.netFlow || null,
        sharpe_ratio: metric.sharpeRatio || null,
        volatility: metric.volatility || null,
        max_drawdown: metric.maxDrawdown || null
      }));
      
      console.log('[TokenDataService] DEBUG: Inserting ERC4626 performance metrics:', metricsWithTokenId);
      
      const { error: insertError } = await supabase
        .from('token_erc4626_performance_metrics')
        .insert(metricsWithTokenId);
      
      if (insertError) {
        console.error('[TokenDataService] ERROR: Failed to insert ERC4626 performance metrics:', insertError);
        throw new Error(`Error inserting ERC4626 performance metrics: ${insertError.message}`);
      } else {
        console.log(`[TokenDataService] ✅ Successfully inserted ${data.performanceMetrics.length} ERC4626 performance metrics`);
      }
    }
  } else {
    console.log('[TokenDataService] DEBUG: No ERC4626 performance metrics to update');
  }
}
