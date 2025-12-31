/**
 * Token Service - API functions for token operations
 */
import { supabase } from '@/infrastructure/database/client';
import {
  TokenFormData,
  TokenOperationParams,
  TokenDeploymentConfig,
  TokenDeploymentResult
} from '../types';
import { TokenInsert, TokenUpdate } from '@/types/core/database';
import { TokenStandard } from '@/types/core/centralModels';
import { validateTokenData } from './tokenDataValidation';

/**
 * Create a new token with comprehensive logging and database validation
 */
export async function createToken(projectId: string, tokenData: Partial<TokenFormData>, skipValidation: boolean = false) {
  console.log('[TokenService] Creating token with data:', JSON.stringify(tokenData, null, 2));
  
  // Fix decimals value based on token standard BEFORE validation
  const originalDecimals = tokenData.decimals;
  if (tokenData.decimals === undefined || tokenData.decimals === null) {
    const standard = tokenData.standard;
    switch (standard) {
      case 'ERC-721':
      case TokenStandard.ERC721:
      case 'ERC-1155':
      case TokenStandard.ERC1155:
        tokenData.decimals = 0; // NFTs and semi-fungible tokens have 0 decimals
        break;
      default:
        tokenData.decimals = 18; // ERC-20, ERC-1400, ERC-3525, ERC-4626 default to 18
        break;
    }
    console.log(`[TokenService] Set decimals from ${originalDecimals} to ${tokenData.decimals} for standard ${standard}`);
  } else {
    console.log(`[TokenService] Using existing decimals value: ${tokenData.decimals} for standard ${tokenData.standard}`);
  }
  
  // VALIDATION REMOVED - Skip all validation as requested by user
  console.log('[TokenService] Validation disabled - proceeding without validation');
  
  // Extract standard fields vs. token standard-specific fields
  const { 
    name, 
    symbol, 
    description, 
    decimals, 
    standard, 
    blocks = {},
    metadata = {},
    totalSupply,
    configOptions,
    standardProperties, // Direct standard properties
    standardArrays,     // Direct array data
    status = 'DRAFT',   // Default status (uppercase to match database enum)
    ...standardSpecificFields 
  } = tokenData;

  // If data was processed by TokenMapperFactory, it's already in the right format
  // If not, process standardSpecificFields to move them to blocks
  const processedBlocks = blocks && Object.keys(blocks).length > 0 
    ? blocks 
    : {
        ...blocks,
        ...processStandardSpecificFields(standardSpecificFields, standard)
      };

  console.log('[TokenService] Processed blocks:', JSON.stringify(processedBlocks, null, 2));

  // Format token data for database
  // Always set config_mode for DB
  const configModeValue: 'min' | 'max' | 'basic' | 'advanced' =
    (typeof tokenData.config_mode === 'string' && ['min','max','basic','advanced'].includes(tokenData.config_mode))
      ? tokenData.config_mode as 'min' | 'max' | 'basic' | 'advanced'
      : (tokenData.advancedMode ? 'max' : 'min');

  // Ensure name and symbol are included in blocks data for database trigger validation
  const blocksWithRequiredFields = {
    ...processedBlocks,
    name: name || 'New Token',
    symbol: (symbol || 'TOKEN').toUpperCase(), // Ensure symbol is uppercase
    
    // ENHANCEMENT: For ERC-1400 tokens, include comprehensive array data from top-level JSON
    // This ensures the Manhattan REIT style JSON with top-level arrays flows to handlers properly
    ...(standard === TokenStandard.ERC1400 ? {
      // Include comprehensive ERC-1400 data arrays from top-level JSON
      partitions: tokenData.partitions || processedBlocks.partitions || [],
      controllers: tokenData.controllers || processedBlocks.controllers || [],
      corporateActions: tokenData.corporateActions || processedBlocks.corporateActions || [],
      documents: tokenData.documents || processedBlocks.documents || [],
      custodyProviders: tokenData.custodyProviders || processedBlocks.custodyProviders || [],
      regulatoryFilings: tokenData.regulatoryFilings || processedBlocks.regulatoryFilings || [],
      partitionBalances: tokenData.partitionBalances || processedBlocks.partitionBalances || [],
      partitionOperators: tokenData.partitionOperators || processedBlocks.partitionOperators || [],
      partitionTransfers: tokenData.partitionTransfers || processedBlocks.partitionTransfers || [],
      
      // Also include from standardArrays if provided  
      ...(standardArrays ? {
        partitions: standardArrays.partitions || tokenData.partitions || processedBlocks.partitions || [],
        controllers: standardArrays.controllers || tokenData.controllers || processedBlocks.controllers || [],
        corporateActions: standardArrays.corporateActions || tokenData.corporateActions || processedBlocks.corporateActions || [],
        documents: standardArrays.documents || tokenData.documents || processedBlocks.documents || [],
        custodyProviders: standardArrays.custodyProviders || tokenData.custodyProviders || processedBlocks.custodyProviders || [],
        regulatoryFilings: standardArrays.regulatoryFilings || tokenData.regulatoryFilings || processedBlocks.regulatoryFilings || [],
        partitionBalances: standardArrays.partitionBalances || tokenData.partitionBalances || processedBlocks.partitionBalances || [],
        partitionOperators: standardArrays.partitionOperators || tokenData.partitionOperators || processedBlocks.partitionOperators || [],
        partitionTransfers: standardArrays.partitionTransfers || tokenData.partitionTransfers || processedBlocks.partitionTransfers || []
      } : {})
    } : {})
  };

  // Set appropriate decimals based on token standard
  let finalDecimals = decimals;
  if (finalDecimals === undefined || finalDecimals === null) {
    // Set standard-specific default decimals
    switch (standard) {
      case 'ERC-721':
      case TokenStandard.ERC721:
      case 'ERC-1155':
      case TokenStandard.ERC1155:
        finalDecimals = 0; // NFTs and semi-fungible tokens have 0 decimals
        break;
      default:
        finalDecimals = 18; // ERC-20, ERC-1400, ERC-3525, ERC-4626 default to 18
        break;
    }
  }

  const tokenRecord = {
    project_id: projectId,
    name: name || 'New Token',
    symbol: (symbol || 'TOKEN').toUpperCase(), // Ensure symbol is uppercase
    standard: standard || 'ERC20',
    decimals: finalDecimals,
    total_supply: totalSupply?.toString() || '',
    blocks: blocksWithRequiredFields, // Include name and symbol in blocks for trigger validation
    status, // Add status field
    config_mode: configModeValue,
    metadata: {
      ...(typeof metadata === 'object' ? metadata : {}),
      configOptions,
      description, // Store description in metadata
      availableFeatures: Object.keys(standardSpecificFields) // Store available features for validation
    }
  };

  // Set total_supply equal to cap when cap is greater than 0
  if (blocksWithRequiredFields && 'cap' in blocksWithRequiredFields && 
      typeof blocksWithRequiredFields.cap === 'string' && 
      parseFloat(blocksWithRequiredFields.cap) > 0) {
    tokenRecord.total_supply = blocksWithRequiredFields.cap;
  }

  // Create token creation log container
  const creationResults: Record<string, any> = {
    mainToken: { status: 'pending' },
    standardProperties: { status: 'pending' },
    arrayData: {}
  };

  try {
    // 1. First, verify the standard-specific tables exist
    const standardTable = getStandardSpecificTable(standard);
    if (standardTable) {
      const { count, error: tableCheckError } = await supabase
        .from(standardTable as any) // Use type assertion
        .select('*', { count: 'exact', head: true });
      
      if (tableCheckError) {
        console.warn(`[TokenService] Token standard table ${standardTable} check failed:`, tableCheckError);
        creationResults.tableChecks = { success: false, error: tableCheckError.message };
      } else {
        console.log(`[TokenService] Token standard table ${standardTable} exists`);
        creationResults.tableChecks = { success: true };
      }
    }

    // 2. Insert main token record
    const { data: tokenData, error: tokenError } = await supabase
    .from('tokens')
    .insert({
      ...tokenRecord,
      standard: tokenRecord.standard as "ERC-20" | "ERC-721" | "ERC-1155" | "ERC-1400" | "ERC-3525" | "ERC-4626"
    })
    .select()
    .single();

    if (tokenError) {
      console.error('[TokenService] Failed to create token:', tokenError);
      creationResults.mainToken = { status: 'failed', error: tokenError.message };
      throw new Error(`Failed to create main token record: ${tokenError.message}`);
    }

    creationResults.mainToken = { status: 'success', id: tokenData.id };
    console.log('[TokenService] Main token record created:', tokenData.id);

    // 3. Now insert standard-specific records if token created successfully
    if (standard && tokenData.id) {
      try {
        let standardResults;
        
        // If direct standardProperties were provided, use them
        if (standardProperties) {
          console.log('[TokenService] Using provided standard properties:', standardProperties);
          standardResults = await createStandardPropertiesFromDirect(
            standard, 
            tokenData.id, 
            standardProperties
          );
        } else {
          // Otherwise create from processed blocks
          console.log('[TokenService] Creating standard properties from blocks');
          standardResults = await createStandardSpecificRecords(
            standard, 
            tokenData.id, 
            blocksWithRequiredFields
          );
        }
        
        creationResults.standardProperties = { status: 'success', ...standardResults };
        
        // 4. Handle array data
        let arrayResults = {};
        
        // If standard arrays were provided directly, use them
        if (standardArrays && Object.keys(standardArrays).length > 0) {
          console.log('[TokenService] Using provided standard arrays:', standardArrays);
          arrayResults = await createStandardArraysFromDirect(
            standard,
            tokenData.id,
            standardArrays
          );
        } 
        // Otherwise, extract array data from blocks if available
        else if (blocksWithRequiredFields) {
          console.log('[TokenService] Extracting array data from blocks');
          const extractedArrays = extractArraysFromBlocks(standard, blocksWithRequiredFields);
          if (Object.keys(extractedArrays).length > 0) {
            arrayResults = await createStandardArraysFromDirect(
              standard,
              tokenData.id,
              extractedArrays
            );
          }
        }
        
        creationResults.arrayData = { ...arrayResults };
        
        // Log success of standard-specific insertions
        console.log(`[TokenService] ${standard} properties created successfully:`, standardResults);
      } catch (standardError: any) {
        console.error(`[TokenService] Failed to create ${standard} properties:`, standardError);
        creationResults.standardProperties = { status: 'failed', error: standardError.message };
      }
    }

    // 5. Return the created token with full creation logs
    return {
      ...tokenData,
      standardInsertionResults: creationResults
    };
  } catch (error: any) {
    console.error('[TokenService] Token creation failed:', error);
    throw new Error(`Token creation failed: ${error.message}`);
  }
}

/**
 * Get the table name for a specific token standard
 */
function getStandardSpecificTable(standard?: string): string | null {
  if (!standard) return null;
  
  const standardsMap: Record<string, string> = {
    'ERC-20': 'token_erc20_properties',
    'ERC-721': 'token_erc721_properties',
    'ERC-1155': 'token_erc1155_properties',
    'ERC-1400': 'token_erc1400_properties',
    'ERC-3525': 'token_erc3525_properties',
    'ERC-4626': 'token_erc4626_properties'
  };
  
  return standardsMap[standard] || null;
}

/**
 * Create standard-specific records based on token standard
 */
async function createStandardSpecificRecords(
  standard: string,
  tokenId: string,
  blocks: Record<string, any>
): Promise<Record<string, any>> {
  const results: Record<string, any> = {
    mainProperties: { status: 'pending' },
    arrayData: {}
  };
  
  try {
    const standardTable = getStandardSpecificTable(standard);
    if (!standardTable) {
      return { 
        status: 'failed', 
        error: `Unsupported token standard: ${standard}` 
      };
    }

    console.log(`[TokenService] Creating ${standard} records for token ${tokenId}`);
    
    // 1. Check if a token property record already exists
    const { data: existingRecord, error: checkError } = await supabase
      .from(standardTable as any)
      .select('*')
      .eq('token_id', tokenId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error if no record
      
    const recordExists = existingRecord !== null;
    
    // 2. Create main properties record
    const propertyRecord = createStandardPropertiesRecord(standard, tokenId, blocks);
    console.log(`[TokenService] ${recordExists ? 'Updating' : 'Inserting'} ${standardTable} record:`, JSON.stringify(propertyRecord, null, 2));
    
    let propertiesData;
    let propertiesError;
    
    // If the record exists, update it; otherwise, insert a new one
    if (recordExists) {
      const result = await supabase
        .from(standardTable as any)
        .update(propertyRecord)
        .eq('token_id', tokenId)
        .select()
        .single();
      
      propertiesData = result.data;
      propertiesError = result.error;
    } else {
      const result = await supabase
        .from(standardTable as any)
        .insert(propertyRecord)
        .select()
        .single();
      
      propertiesData = result.data;
      propertiesError = result.error;
    }
    
    if (propertiesError) {
      console.error(`[TokenService] Failed to ${recordExists ? 'update' : 'insert'} ${standardTable} record:`, propertiesError);
      results.mainProperties = { status: 'failed', error: propertiesError.message };
    } else {
      console.log(`[TokenService] ${recordExists ? 'Updated' : 'Inserted'} ${standardTable} record:`, propertiesData);
      results.mainProperties = { status: 'success', data: propertiesData };
    }
    
    // 3. Now handle any array/related data based on token standard
    switch(standard) {
      case 'ERC-721':
        await handleERC721Attributes(tokenId, blocks, results);
        break;
      case 'ERC-1155':
        await handleERC1155TokenTypes(tokenId, blocks, results);
        await handleERC1155CraftingRecipes(tokenId, blocks, results);
        await handleERC1155DiscountTiers(tokenId, blocks, results);
        await handleERC1155UriMappings(tokenId, blocks, results);
        await handleERC1155TypeConfigs(tokenId, blocks, results);
        await handleERC1155Balances(tokenId, blocks, results);
        break;
      case 'ERC-1400':
        await handleERC1400Partitions(tokenId, blocks, results);
        await handleERC1400Controllers(tokenId, blocks, results);
        await handleERC1400Documents(tokenId, blocks, results);
        await handleERC1400CorporateActions(tokenId, blocks, results);
        await handleERC1400CustodyProviders(tokenId, blocks, results);
        await handleERC1400RegulatoryFilings(tokenId, blocks, results);
        await handleERC1400PartitionBalances(tokenId, blocks, results);
        await handleERC1400PartitionOperators(tokenId, blocks, results);
        await handleERC1400PartitionTransfers(tokenId, blocks, results);
        break;
      case 'ERC-3525':
        await handleERC3525Slots(tokenId, blocks, results);
        await handleERC3525Allocations(tokenId, blocks, results);
        await handleERC3525PaymentSchedules(tokenId, blocks, results);
        await handleERC3525ValueAdjustments(tokenId, blocks, results);
        await handleERC3525SlotConfigs(tokenId, blocks, results);
        break;
      case 'ERC-4626':
        console.log('[TokenService] 🏛️ Processing ERC-4626 vault token with all additional tables');
        await handleERC4626Strategy(tokenId, blocks, results);
        await handleERC4626AssetAllocations(tokenId, blocks, results);
        await handleERC4626VaultStrategies(tokenId, blocks, results);
        await handleERC4626FeeTiers(tokenId, blocks, results);
        await handleERC4626PerformanceMetrics(tokenId, blocks, results);
        console.log('[TokenService] ✅ Completed ERC-4626 additional tables processing:', results.arrayData);
        break;
    }
    
    return results;
  } catch (error: any) {
    console.error('[TokenService] Failed to create standard-specific records:', error);
    return { 
      status: 'failed', 
      error: error.message,
      mainProperties: results.mainProperties,
      arrayData: results.arrayData
    };
  }
}

/**
 * Create a property record for the standard-specific table
 */
function createStandardPropertiesRecord(standard: string, tokenId: string, blocks: Record<string, any>): Record<string, any> {
  const baseRecord = { token_id: tokenId };
  
  switch(standard) {
    case 'ERC-20':
      // Enhanced feeOnTransfer handling
      let feeOnTransferValue = null;
      if (blocks.fee_on_transfer || blocks.feeOnTransfer) {
        const feeData = blocks.fee_on_transfer || blocks.feeOnTransfer;
        feeOnTransferValue = {
          enabled: !!feeData.enabled,
          fee: feeData.fee || "0",
          feeType: feeData.feeType || "percentage",
          // Only set recipient if it's a valid non-empty address
          recipient: feeData.recipient && feeData.recipient !== "" && feeData.recipient !== "0x0000000000000000000000000000000000000000"
            ? feeData.recipient
            : null
        };
      }
      
      return {
        ...baseRecord,
        initial_supply: blocks.initial_supply || blocks.initialSupply,
        cap: blocks.cap,
        is_mintable: blocks.is_mintable || blocks.isMintable || false,
        is_burnable: blocks.is_burnable || blocks.isBurnable || false,
        is_pausable: blocks.is_pausable || blocks.isPausable || false,
        token_type: blocks.token_type || blocks.tokenType || 'utility',
        
        // JSONB configurations
        transfer_config: blocks.transferConfig || blocks.transfer_config,
        gas_config: blocks.gasConfig || blocks.gas_config,
        compliance_config: blocks.complianceConfig || blocks.compliance_config,
        whitelist_config: blocks.whitelistConfig || blocks.whitelist_config,
        allow_management: blocks.allow_management || blocks.allowanceManagement || false,
        permit: blocks.permit || false,
        snapshot: blocks.snapshot || false,
        fee_on_transfer: feeOnTransferValue, // Use processed value
        rebasing: blocks.rebasing,
        governance_features: blocks.governance_features || blocks.governanceFeatures
      };
      
    case 'ERC-721':
      return {
        ...baseRecord,
        base_uri: blocks.base_uri || blocks.baseUri,
        metadata_storage: blocks.metadata_storage || blocks.metadataStorage || 'ipfs',
        max_supply: blocks.max_supply || blocks.maxSupply,
        has_royalty: blocks.has_royalty || blocks.hasRoyalty || false,
        royalty_percentage: blocks.royalty_percentage || blocks.royaltyPercentage,
        royalty_receiver: blocks.royalty_receiver || blocks.royaltyReceiver,
        is_burnable: blocks.is_burnable || blocks.isBurnable || false,
        is_pausable: blocks.is_pausable || blocks.isPausable || false,
        is_mintable: blocks.isMintable ?? blocks.is_mintable ?? true, // FIX: Add missing mintable field
        asset_type: blocks.asset_type || blocks.assetType || 'unique_asset',
        minting_method: blocks.minting_method || blocks.mintingMethod || 'open',
        auto_increment_ids: blocks.auto_increment_ids ?? blocks.autoIncrementIds ?? true,
        enumerable: blocks.enumerable ?? true,
        uri_storage: blocks.uri_storage || blocks.uriStorage || 'tokenId',
        updatable_uris: blocks.updatable_uris || blocks.updatableUris || false,
        
        // JSONB configurations
        sales_config: blocks.salesConfig || blocks.sales_config,
        whitelist_config: blocks.whitelistConfig || blocks.whitelist_config,
        permission_config: blocks.permissionConfig || blocks.permission_config,
        dynamic_uri_config: blocks.dynamicUriConfig || blocks.dynamic_uri_config,
        batch_minting_config: blocks.batchMintingConfig || blocks.batch_minting_config,
        transfer_restrictions: blocks.transferRestrictions || blocks.transfer_restrictions
      };
      
    case 'ERC-1155':
      return {
        ...baseRecord,
        base_uri: blocks.base_uri || blocks.baseUri,
        metadata_storage: blocks.metadata_storage || blocks.metadataStorage || 'ipfs',
        has_royalty: blocks.has_royalty || blocks.hasRoyalty || false,
        royalty_percentage: blocks.royalty_percentage || blocks.royaltyPercentage,
        royalty_receiver: blocks.royalty_receiver || blocks.royaltyReceiver,
        is_burnable: blocks.is_burnable || blocks.isBurnable || false,
        is_pausable: blocks.is_pausable || blocks.isPausable || false,
        updatable_uris: blocks.updatable_uris || blocks.updatableUris || false,
        supply_tracking: blocks.supply_tracking || blocks.supplyTracking || true,
        enable_approval_for_all: blocks.enable_approval_for_all || blocks.enableApprovalForAll || true,
        
        // FIX: Critical mapping for batchMinting UI field
        batch_minting_enabled: blocks.batchMinting ?? blocks.batch_minting_enabled ?? false,
        
        // FIX: Add missing container support
        container_enabled: blocks.containerEnabled ?? blocks.container_enabled ?? false,
        
        // JSONB configurations
        sales_config: blocks.sales_config || blocks.salesConfig,
        whitelist_config: blocks.whitelist_config || blocks.whitelistConfig,
        batch_transfer_limits: blocks.batch_transfer_limits || blocks.batchTransferLimits,
        dynamic_uri_config: blocks.dynamicUriConfig || blocks.dynamic_uri_config,
        batch_minting_config: blocks.batchMintingConfig || blocks.batch_minting_config,
        transfer_restrictions: blocks.transferRestrictions || blocks.transfer_restrictions,
        container_config: blocks.containerConfig || blocks.container_config,
        dynamic_uris: blocks.dynamicUris ?? blocks.dynamic_uris ?? false
      };
      
    case 'ERC-1400':
      // Handle string to integer conversions for validation fields
      const holdingPeriodInt = blocks.holdingPeriod ? parseInt(blocks.holdingPeriod) || null : null;
      const maxInvestorCountInt = blocks.maxInvestorCount ? parseInt(blocks.maxInvestorCount) || null : null;
      
      // Helper function to safely get boolean values, avoiding arrays
      const getBooleanValue = (value: any, defaultValue: boolean = false): boolean => {
        if (Array.isArray(value)) return defaultValue;
        if (value === null || value === undefined) return defaultValue;
        return Boolean(value);
      };
      
      return {
        ...baseRecord,
        initial_supply: blocks.initial_supply || blocks.initialSupply,
        cap: blocks.cap,
        is_mintable: getBooleanValue(blocks.is_mintable || blocks.isMintable, false),
        is_burnable: getBooleanValue(blocks.is_burnable || blocks.isBurnable, false),
        is_pausable: getBooleanValue(blocks.is_pausable || blocks.isPausable, false),
        
        // Document fields
        document_uri: blocks.document_uri || blocks.documentUri || blocks.legalTerms,
        document_hash: blocks.document_hash || blocks.documentHash,
        legal_terms: blocks.legalTerms || blocks.legal_terms,
        prospectus: blocks.prospectus,
        
        // Controller & compliance fields (FIX MAPPINGS)
        controller_address: blocks.controller_address || blocks.controllerAddress,
        enforce_kyc: getBooleanValue(blocks.enforceKYC ?? blocks.enforce_kyc ?? blocks.requireKYC, true),
        
        // FIX: Correct field name mappings - ensure boolean values only
        forced_transfers: getBooleanValue(blocks.forcedTransfersEnabled ?? blocks.forced_transfers, false),
        forced_redemption_enabled: getBooleanValue(blocks.forcedRedemptionEnabled ?? blocks.forced_redemption_enabled, false),
        whitelist_enabled: getBooleanValue(blocks.whitelistEnabled ?? blocks.whitelist_enabled, false),
        investor_accreditation: getBooleanValue(blocks.investorAccreditation ?? blocks.investor_accreditation, false),
        
        // FIX: Handle integer conversions
        holding_period: holdingPeriodInt,
        max_investor_count: maxInvestorCountInt,
        
        auto_compliance: getBooleanValue(blocks.autoCompliance ?? blocks.auto_compliance, false),
        manual_approvals: getBooleanValue(blocks.manualApprovals ?? blocks.manual_approvals, false),
        compliance_module: blocks.complianceModule || blocks.compliance_module,
        
        // Advanced features
        security_type: blocks.security_type || blocks.securityType || 'equity',
        issuing_jurisdiction: blocks.issuing_jurisdiction || blocks.issuingJurisdiction,
        issuing_entity_name: blocks.issuing_entity_name || blocks.issuingEntityName,
        issuing_entity_lei: blocks.issuing_entity_lei || blocks.issuingEntityLei,
        regulation_type: blocks.regulation_type || blocks.regulationType,
        is_multi_class: getBooleanValue(blocks.isMultiClass ?? blocks.is_multi_class, false),
        tranche_transferability: getBooleanValue(blocks.trancheTransferability ?? blocks.tranche_transferability, false),
        
        // Token management features - SET BOOLEAN FLAGS based on array existence, NOT array data
        is_issuable: getBooleanValue(blocks.isIssuable ?? blocks.is_issuable ?? blocks.issuance_modules, false),
        granular_control: getBooleanValue(blocks.granularControl ?? blocks.granular_control, false),
        dividend_distribution: getBooleanValue(blocks.dividendDistribution ?? blocks.dividend_distribution, false),
        
        // FIX: Set boolean flags based on array existence, not array data - NEVER assign arrays to boolean fields
        corporate_actions: !!(blocks.corporateActions && Array.isArray(blocks.corporateActions) && blocks.corporateActions.length > 0),
        document_management: !!(blocks.documents && Array.isArray(blocks.documents) && blocks.documents.length > 0) || 
                           getBooleanValue(blocks.documentManagement ?? blocks.document_management, false),
        
        // Array fields (JSONB) - these can accept arrays
        geographic_restrictions: Array.isArray(blocks.geographicRestrictions) ? blocks.geographicRestrictions : 
                               Array.isArray(blocks.geographic_restrictions) ? blocks.geographic_restrictions : [],
        
        // JSONB configurations - these can accept objects
        transfer_restrictions: (typeof blocks.transfer_restrictions === 'object' && !Array.isArray(blocks.transfer_restrictions)) ? blocks.transfer_restrictions :
                              (typeof blocks.transferRestrictions === 'object' && !Array.isArray(blocks.transferRestrictions)) ? blocks.transferRestrictions : null,
        kyc_settings: (typeof blocks.kyc_settings === 'object' && !Array.isArray(blocks.kyc_settings)) ? blocks.kyc_settings :
                     (typeof blocks.kycSettings === 'object' && !Array.isArray(blocks.kycSettings)) ? blocks.kycSettings : null,
        compliance_settings: (typeof blocks.compliance_settings === 'object' && !Array.isArray(blocks.compliance_settings)) ? blocks.compliance_settings :
                           (typeof blocks.complianceSettings === 'object' && !Array.isArray(blocks.complianceSettings)) ? blocks.complianceSettings : null,
        custom_features: (typeof blocks.customFeatures === 'object' && !Array.isArray(blocks.customFeatures)) ? blocks.customFeatures :
                        (typeof blocks.custom_features === 'object' && !Array.isArray(blocks.custom_features)) ? blocks.custom_features : null,
        
        // Add missing advanced fields - ensure boolean values only
        compliance_automation_level: blocks.complianceAutomationLevel || blocks.compliance_automation_level || 'manual',
        recovery_mechanism: getBooleanValue(blocks.recoveryMechanism || blocks.recovery_mechanism, false),
        token_details: (typeof blocks.tokenDetails === 'object' && !Array.isArray(blocks.tokenDetails)) ? blocks.tokenDetails :
                      (typeof blocks.token_details === 'object' && !Array.isArray(blocks.token_details)) ? blocks.token_details : null
      };
      
    case 'ERC-3525':
      return {
        ...baseRecord,
        value_decimals: blocks.value_decimals || blocks.valueDecimals || 0,
        base_uri: blocks.base_uri || blocks.baseUri,
        metadata_storage: blocks.metadata_storage || blocks.metadataStorage || 'ipfs',
        slot_type: blocks.slot_type || blocks.slotType || 'generic',
        is_burnable: blocks.is_burnable || blocks.isBurnable || false,
        is_pausable: blocks.is_pausable || blocks.isPausable || false,
        has_royalty: blocks.has_royalty || blocks.hasRoyalty || false,
        royalty_percentage: blocks.royalty_percentage || blocks.royaltyPercentage,
        royalty_receiver: blocks.royalty_receiver || blocks.royaltyReceiver,
        slot_approvals: blocks.slot_approvals || blocks.slotApprovals || true,
        value_approvals: blocks.value_approvals || blocks.valueApprovals || true,
        updatable_uris: blocks.updatable_uris || blocks.updatableUris || false,
        updatable_slots: blocks.updatable_slots || blocks.updatableSlots || false,
        value_transfers_enabled: blocks.value_transfers_enabled || blocks.valueTransfersEnabled || true,
        
        // FIX: Add missing advanced features
        fractional_ownership_enabled: blocks.fractionalOwnershipEnabled || blocks.fractional_ownership_enabled || false,
        mergable: blocks.mergable || false,
        splittable: blocks.splittable || false,
        dynamic_metadata: blocks.dynamicMetadata || blocks.dynamic_metadata || false,
        allows_slot_enumeration: blocks.allowsSlotEnumeration ?? blocks.allows_slot_enumeration ?? true,
        value_aggregation: blocks.valueAggregation ?? blocks.value_aggregation ?? false,
        permissioning_enabled: blocks.permissioningEnabled ?? blocks.permissioning_enabled ?? false,
        supply_tracking: blocks.supplyTracking ?? blocks.supply_tracking ?? false,
        updatable_values: blocks.updatableValues ?? blocks.updatable_values ?? false,
        fractionalizable: blocks.fractionalizable || false,
        
        // Complex configurations with validation
        sales_config: (() => {
          const salesConfig = blocks.sales_config || blocks.salesConfig;
          if (!salesConfig) return null;
          
          // Ensure sales_config meets database constraint: must have 'enabled' boolean field
          if (typeof salesConfig === 'object' && salesConfig !== null) {
            return {
              enabled: !!salesConfig.enabled,
              ...salesConfig
            };
          }
          
          // If it's not an object, create proper structure
          return { enabled: false };
        })(),
        slot_transfer_validation: (() => {
          const slotTransferValidation = blocks.slot_transfer_validation || blocks.slotTransferValidation;
          if (!slotTransferValidation) return null;
          
          // Ensure slot_transfer_validation meets database constraint: must have 'rules' field
          if (typeof slotTransferValidation === 'object' && slotTransferValidation !== null) {
            return {
              rules: slotTransferValidation.rules || [],
              ...slotTransferValidation
            };
          }
          
          // If it's not an object, create proper structure
          return { rules: [] };
        })(),
        custom_extensions: blocks.customExtensions || blocks.custom_extensions,
        metadata: blocks.metadata || null
      };
      
    case 'ERC-4626':
      // Enhanced fee handling for simple config form
      let managementFeeValue = blocks.managementFee || blocks.management_fee;
      let feeStructureValue = blocks.feeStructure || blocks.fee_structure;
      
      // FIX: Handle simple fee object from min config form
      if (blocks.fee && typeof blocks.fee === 'object' && blocks.fee.percentage !== undefined) {
        // Extract percentage from simple fee object and use as management fee
        managementFeeValue = blocks.fee.percentage.toString();
        // Store the full fee object in fee_structure for reference
        feeStructureValue = blocks.fee;
        console.log('[TokenService] Extracted ERC-4626 fee percentage from simple config:', managementFeeValue);
      } else if (blocks.fee && !feeStructureValue) {
        // Fallback: if fee is not an object but exists, store it in fee_structure
        feeStructureValue = blocks.fee;
      }
      
      return {
        ...baseRecord,
        // Core vault properties
        asset_address: blocks.asset_address || blocks.assetAddress,
        asset_name: blocks.asset_name || blocks.assetName,
        asset_symbol: (blocks.asset_symbol || blocks.assetSymbol || '').toUpperCase(),
        asset_decimals: blocks.asset_decimals || blocks.assetDecimals || 18,
        vault_type: blocks.vault_type || blocks.vaultType || 'yield',
        vault_strategy: blocks.vault_strategy || blocks.vaultStrategy || (blocks.yieldStrategy?.protocol ? blocks.yieldStrategy.protocol[0] : 'simple'),
        custom_strategy: blocks.custom_strategy || blocks.customStrategy || false,
        strategy_controller: blocks.strategy_controller || blocks.strategyController,
        
        // Standard features
        is_mintable: blocks.is_mintable || blocks.isMintable || false,
        is_burnable: blocks.is_burnable || blocks.isBurnable || false,
        is_pausable: blocks.is_pausable || blocks.isPausable || false,
        permit: blocks.permit || false,
        flash_loans: blocks.flash_loans || blocks.flashLoans || false,
        emergency_shutdown: blocks.emergency_shutdown || blocks.emergencyShutdown || false,
        performance_metrics: Boolean(blocks.performance_metrics || blocks.performanceMetrics || false),
        performance_tracking: blocks.performanceTracking || blocks.performance_tracking || false,
        
        // FIX: Add missing advanced features
        yield_optimization_enabled: blocks.yieldOptimizationEnabled || blocks.yield_optimization_enabled || false,
        automated_rebalancing: blocks.automatedRebalancing || blocks.automated_rebalancing || false,
        yield_source: blocks.yieldSource || blocks.yield_source || 'external',
        strategy_documentation: blocks.strategyDocumentation || blocks.strategy_documentation,
        rebalance_threshold: blocks.rebalanceThreshold || blocks.rebalance_threshold,
        liquidity_reserve: blocks.liquidityReserve || blocks.liquidity_reserve || '10',
        max_slippage: blocks.maxSlippage || blocks.max_slippage,
        
        // Deposit/withdrawal limits
        deposit_limit: blocks.depositLimit || blocks.deposit_limit,
        withdrawal_limit: blocks.withdrawalLimit || blocks.withdrawal_limit,
        min_deposit: blocks.minDeposit || blocks.min_deposit,
        max_deposit: blocks.maxDeposit || blocks.max_deposit,
        min_withdrawal: blocks.minWithdrawal || blocks.min_withdrawal,
        max_withdrawal: blocks.maxWithdrawal || blocks.max_withdrawal,
        
        // Fee structure - FIXED: Properly extract percentage from simple fee object
        deposit_fee: blocks.depositFee || blocks.deposit_fee,
        withdrawal_fee: blocks.withdrawalFee || blocks.withdrawal_fee,
        management_fee: managementFeeValue, // Use extracted value from fee object
        performance_fee: blocks.performanceFee || blocks.performance_fee,
        fee_recipient: blocks.feeRecipient || blocks.fee_recipient,
        
        // Complex configurations (JSONB)
        fee_structure: feeStructureValue || {}, // Use processed fee structure
        rebalancing_rules: blocks.rebalancingRules || blocks.rebalancing_rules,
        withdrawal_rules: blocks.withdrawalRules || blocks.withdrawal_rules
      };
      
    default:
      return baseRecord;
  }
}

// Helper functions for handling specific token standards' related data

// ERC-721 Attributes Handler
async function handleERC721Attributes(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const tokenAttributes = blocks.tokenAttributes || blocks.token_attributes;
  
  if (tokenAttributes && Array.isArray(tokenAttributes) && tokenAttributes.length > 0) {
    results.arrayData.tokenAttributes = { status: 'pending', count: tokenAttributes.length };
    
    try {
      const attributeRecords = tokenAttributes.map(attr => ({
        token_id: tokenId,
        trait_type: attr.name || attr.trait_type || 'unknown',
        values: Array.isArray(attr.values) ? attr.values : [attr.value || 'unknown']
      }));
      
      console.log('[TokenService] Inserting token_erc721_attributes records:', attributeRecords);
      
      const { data: attributesData, error: attributesError } = await supabase
        .from('token_erc721_attributes')
        .insert(attributeRecords);
      
      if (attributesError) {
        console.error('[TokenService] Failed to insert token_erc721_attributes records:', attributesError);
        results.arrayData.tokenAttributes = { 
          status: 'failed', 
          error: attributesError.message,
          attempted: attributeRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc721_attributes records:', attributesData);
        results.arrayData.tokenAttributes = { 
          status: 'success', 
          count: attributeRecords.length 
        };
      }
    } catch (attrError: any) {
      console.error('[TokenService] Error processing token attributes:', attrError);
      results.arrayData.tokenAttributes = { 
        status: 'failed', 
        error: attrError.message 
      };
    }
  }
}

// ERC-1155 Token Types Handler
async function handleERC1155TokenTypes(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const tokenTypes = blocks.tokenTypes || blocks.token_types;
  
  if (tokenTypes && Array.isArray(tokenTypes) && tokenTypes.length > 0) {
    results.arrayData.tokenTypes = { status: 'pending', count: tokenTypes.length };
    
    try {
      const typeRecords = tokenTypes.map((type, index) => ({
        token_id: tokenId,
        token_type_id: type.id || `${index + 1}`,
        name: type.name || `Token Type ${index + 1}`,
        description: type.description || '',
        max_supply: type.supply || type.maxSupply,
        // FIX: Convert boolean to proper fungibility_type string
        fungibility_type: type.fungible !== undefined 
          ? (type.fungible ? 'fungible' : 'non-fungible')
          : 'non-fungible', // Default to non-fungible if not specified
        metadata: {
          rarityLevel: type.rarityLevel || 'common',
          originalFungibleFlag: type.fungible // Preserve original for reference
        }
      }));
      
      console.log('[TokenService] Inserting token_erc1155_types records:', typeRecords);
      
      const { data: typesData, error: typesError } = await supabase
        .from('token_erc1155_types')
        .insert(typeRecords)
        .select();
      
      if (typesError) {
        console.error('[TokenService] Failed to insert token_erc1155_types records:', typesError);
        results.arrayData.tokenTypes = { 
          status: 'failed', 
          error: typesError.message,
          attempted: typeRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1155_types records:', typesData);
        results.arrayData.tokenTypes = { 
          status: 'success', 
          count: typesData.length,
          data: typesData 
        };
      }
    } catch (typeError: any) {
      console.error('[TokenService] Error processing token types:', typeError);
      results.arrayData.tokenTypes = { 
        status: 'failed', 
        error: typeError.message 
      };
    }
  }
}

// ERC-1155 Crafting Recipes Handler
async function handleERC1155CraftingRecipes(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const craftingRecipes = blocks.craftingRecipes;
  
  if (craftingRecipes && Array.isArray(craftingRecipes) && craftingRecipes.length > 0) {
    results.arrayData.craftingRecipes = { status: 'pending', count: craftingRecipes.length };
    
    try {
      const recipeRecords = craftingRecipes.map((recipe: any, index: number) => ({
        token_id: tokenId,
        recipe_name: recipe.name || recipe.recipeName || `Recipe ${index + 1}`,
        input_tokens: Array.isArray(recipe.inputs) ? recipe.inputs : (recipe.inputTokens || []),
        output_token_type_id: recipe.outputTokenTypeId || recipe.outputTypeId || '1',
        output_quantity: parseInt(recipe.outputQuantity) || 1,
        success_rate: parseInt(recipe.successRate) || 100,
        cooldown_period: parseInt(recipe.cooldown) || 0,
        required_level: parseInt(recipe.requiredLevel) || 0,
        is_active: recipe.isActive !== false && recipe.isEnabled !== false
      }));
      
      console.log('[TokenService] Inserting token_erc1155_crafting_recipes records:', recipeRecords);
      
      const { data: recipesData, error: recipesError } = await supabase
        .from('token_erc1155_crafting_recipes')
        .insert(recipeRecords)
        .select();
      
      if (recipesError) {
        console.error('[TokenService] Failed to insert token_erc1155_crafting_recipes records:', recipesError);
        results.arrayData.craftingRecipes = { 
          status: 'failed', 
          error: recipesError.message,
          attempted: recipeRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1155_crafting_recipes records:', recipesData);
        results.arrayData.craftingRecipes = { 
          status: 'success', 
          count: recipesData.length,
          data: recipesData 
        };
      }
    } catch (recipeError: any) {
      console.error('[TokenService] Error processing crafting recipes:', recipeError);
      results.arrayData.craftingRecipes = { 
        status: 'failed', 
        error: recipeError.message 
      };
    }
  }
}

// ERC-1155 Discount Tiers Handler
async function handleERC1155DiscountTiers(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const discountTiers = blocks.discountTiers;
  
  if (discountTiers && Array.isArray(discountTiers) && discountTiers.length > 0) {
    results.arrayData.discountTiers = { status: 'pending', count: discountTiers.length };
    
    try {
      const tierRecords = discountTiers.map((tier: any) => ({
        token_id: tokenId,
        min_quantity: parseInt(tier.minimumQuantity) || parseInt(tier.minQuantity) || 1,
        max_quantity: tier.maximumQuantity ? parseInt(tier.maximumQuantity) : (tier.maxQuantity ? parseInt(tier.maxQuantity) : null),
        discount_percentage: tier.discountPercentage || tier.discount || '0',
        tier_name: tier.name || tier.tier || tier.tierName,
        is_active: tier.isActive !== false
      }));
      
      console.log('[TokenService] Inserting token_erc1155_discount_tiers records:', tierRecords);
      
      const { data: tiersData, error: tiersError } = await supabase
        .from('token_erc1155_discount_tiers')
        .insert(tierRecords)
        .select();
      
      if (tiersError) {
        console.error('[TokenService] Failed to insert token_erc1155_discount_tiers records:', tiersError);
        results.arrayData.discountTiers = { 
          status: 'failed', 
          error: tiersError.message,
          attempted: tierRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1155_discount_tiers records:', tiersData);
        results.arrayData.discountTiers = { 
          status: 'success', 
          count: tiersData.length,
          data: tiersData 
        };
      }
    } catch (tierError: any) {
      console.error('[TokenService] Error processing discount tiers:', tierError);
      results.arrayData.discountTiers = { 
        status: 'failed', 
        error: tierError.message 
      };
    }
  }
}

// ERC-1400 Partitions Handler - WITH DUPLICATE PREVENTION
async function handleERC1400Partitions(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const partitions = blocks.partitions;
  
  if (partitions && Array.isArray(partitions) && partitions.length > 0) {
    results.arrayData.partitions = { status: 'pending', count: partitions.length };
    
    try {
      // FIX: Check for existing partitions first to prevent duplicates
      const { data: existingPartitions, error: checkError } = await supabase
        .from('token_erc1400_partitions')
        .select('partition_id')
        .eq('token_id', tokenId);
        
      if (checkError) {
        console.warn('[TokenService] Warning checking existing partitions:', checkError);
      }
      
      const existingPartitionIds = new Set(existingPartitions?.map(p => p.partition_id) || []);
      
      const partitionRecords = partitions
        .map((partition, index) => {
          // Include transferable field and put extra fields in metadata
          const { name, partitionId, transferable, amount, ...rest } = partition;
          const finalPartitionId = partitionId || `PARTITION-${index + 1}`;
          
          return {
            token_id: tokenId,
            name: name,
            partition_id: finalPartitionId,
            amount: amount || '',
            transferable: transferable ?? true, // FIX: Ensure transferable is captured, default to true
            metadata: Object.keys(rest).length > 0 ? rest : null
          };
        })
        .filter(record => {
          // FIX: Only insert if partition doesn't already exist
          if (existingPartitionIds.has(record.partition_id)) {
            console.log(`[TokenService] Skipping duplicate partition: ${record.partition_id}`);
            return false;
          }
          return true;
        });
      
      if (partitionRecords.length === 0) {
        console.log('[TokenService] No new partitions to insert (all already exist)');
        results.arrayData.partitions = { 
          status: 'success', 
          count: 0,
          message: 'All partitions already exist'
        };
        return;
      }
      
      console.log('[TokenService] Inserting token_erc1400_partitions records:', partitionRecords);
      
      const { data: partitionsData, error: partitionsError } = await supabase
        .from('token_erc1400_partitions')
        .insert(partitionRecords)
        .select();
      
      if (partitionsError) {
        console.error('[TokenService] Failed to insert token_erc1400_partitions records:', partitionsError);
        results.arrayData.partitions = { 
          status: 'failed', 
          error: partitionsError.message,
          attempted: partitionRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1400_partitions records:', partitionsData);
        results.arrayData.partitions = { 
          status: 'success', 
          count: partitionsData.length,
          data: partitionsData 
        };
      }
    } catch (partitionError: any) {
      console.error('[TokenService] Error processing partitions:', partitionError);
      results.arrayData.partitions = { 
        status: 'failed', 
        error: partitionError.message 
      };
    }
  }
}

// ERC-1400 Controllers Handler - WITH DUPLICATE PREVENTION
async function handleERC1400Controllers(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const controllers = blocks.controllers || blocks.standardArrays?.controllers;
  
  if (controllers && Array.isArray(controllers) && controllers.length > 0) {
    results.arrayData.controllers = { status: 'pending', count: controllers.length };
    
    try {
      // FIX: Check for existing controllers first to prevent duplicates
      const { data: existingControllers, error: checkError } = await supabase
        .from('token_erc1400_controllers')
        .select('address')
        .eq('token_id', tokenId);
        
      if (checkError) {
        console.warn('[TokenService] Warning checking existing controllers:', checkError);
      }
      
      const existingAddresses = new Set(existingControllers?.map(c => c.address) || []);
      
      const controllerRecords = controllers
        .map(controller => {
          let address;
          let permissions;
          
          // Handle both string addresses and object controllers
          if (typeof controller === 'string') {
            address = controller;
            permissions = ['ADMIN']; // Default permission for string addresses
          } else {
            // Handle controller objects with full structure
            address = controller.address || controller.controllerAddress || '0x0000000000000000000000000000000000000000';
            permissions = Array.isArray(controller.permissions) 
              ? controller.permissions 
              : (controller.role ? [controller.role] : ['ADMIN']);
          }
          
          return {
            token_id: tokenId,
            address,
            permissions
          };
        })
        .filter(record => {
          // FIX: Only insert if controller address doesn't already exist
          if (existingAddresses.has(record.address)) {
            console.log(`[TokenService] Skipping duplicate controller: ${record.address}`);
            return false;
          }
          return true;
        });
      
      if (controllerRecords.length === 0) {
        console.log('[TokenService] No new controllers to insert (all already exist)');
        results.arrayData.controllers = { 
          status: 'success', 
          count: 0,
          message: 'All controllers already exist'
        };
        return;
      }
      
      console.log('[TokenService] Inserting token_erc1400_controllers records:', controllerRecords);
      
      const { data: controllersData, error: controllersError } = await supabase
        .from('token_erc1400_controllers')
        .insert(controllerRecords)
        .select();
      
      if (controllersError) {
        console.error('[TokenService] Failed to insert token_erc1400_controllers records:', controllersError);
        results.arrayData.controllers = { 
          status: 'failed', 
          error: controllersError.message,
          attempted: controllerRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1400_controllers records:', controllersData);
        results.arrayData.controllers = { 
          status: 'success', 
          count: controllersData.length,
          data: controllersData
        };
      }
    } catch (controllerError: any) {
      console.error('[TokenService] Error processing controllers:', controllerError);
      results.arrayData.controllers = { 
        status: 'failed', 
        error: controllerError.message 
      };
    }
  }
}

// ERC-3525 Slots Handler
async function handleERC3525Slots(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const slots = blocks.slots;
  
  if (slots && Array.isArray(slots) && slots.length > 0) {
    results.arrayData.slots = { status: 'pending', count: slots.length };
    
    try {
      const slotRecords = slots.map((slot, index) => {
        console.log(`[TokenService] DEBUG: Processing ERC3525 slot in handleERC3525Slots ${index}:`, JSON.stringify(slot, null, 2));
        
        // Handle various slot_id field names and ensure it's never null/undefined
        // UPDATED: Added 'slot' field mapping for JSON compatibility
        let slotId = slot.slotId || slot.slot_id || slot.id || slot.slot;
        console.log(`[TokenService] DEBUG: Initial slot_id from handleERC3525Slots ${index}:`, slotId);
        
        // CRITICAL: Always ensure slot_id exists, no matter what
        if (!slotId || slotId === null || slotId === undefined || slotId === '') {
          slotId = `slot-${index + 1}`;
          console.warn(`[TokenService] Fixed missing slot_id in handleERC3525Slots ${index}:`, slotId);
        }
        
        // Ensure it's a string and not empty
        slotId = String(slotId).trim();
        
        // EXTRA SAFEGUARD: If somehow it's still empty, force a value
        if (!slotId || slotId === '' || slotId === 'null' || slotId === 'undefined') {
          slotId = `emergency-slot-${Date.now()}-${index}`;
          console.error(`[TokenService] EMERGENCY: Had to use emergency slot_id in handleERC3525Slots ${index}:`, slotId);
        }
        
        console.log(`[TokenService] DEBUG: Final slot_id from handleERC3525Slots ${index}:`, slotId);
        
        // Extract other fields (handle both camelCase and snake_case variants)
        // UPDATED: Added 'slot' field to destructuring for JSON compatibility
        const { slotId: _slotId, slot_id: _slot_id, id: _id, slot: _slot, name, slotName, description, slotDescription, valueUnits, transferable, ...rest } = slot;
        
        const record = {
          token_id: tokenId,
          slot_id: slotId, // Use our validated slot_id
          name: name || slotName || `Slot ${index + 1}`,                    // Handle both "name" and "slotName"
          description: description || slotDescription || '',                // Handle both "description" and "slotDescription"  
          value_units: valueUnits || slot.value_units || 'units',
          slot_transferable: transferable ?? slot.slot_transferable ?? true,
          metadata: Object.keys(rest).length > 0 ? {
            ...rest,
            properties: slot.properties || {}
          } : null
        };
        
        console.log(`[TokenService] DEBUG: Final ERC3525 slot record from handleERC3525Slots ${index}:`, JSON.stringify(record, null, 2));
        return record;
      });
      
      console.log('[TokenService] Inserting token_erc3525_slots records:', slotRecords);
      
      const { data: slotsData, error: slotsError } = await supabase
        .from('token_erc3525_slots')
        .insert(slotRecords)
        .select();
      
      if (slotsError) {
        console.error('[TokenService] Failed to insert token_erc3525_slots records:', slotsError);
        results.arrayData.slots = { 
          status: 'failed', 
          error: slotsError.message,
          attempted: slotRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc3525_slots records:', slotsData);
        results.arrayData.slots = { 
          status: 'success', 
          count: slotsData.length,
          data: slotsData 
        };
      }
    } catch (slotError: any) {
      console.error('[TokenService] Error processing slots:', slotError);
      results.arrayData.slots = { 
        status: 'failed', 
        error: slotError.message 
      };
    }
  }
}

// ERC-3525 Allocations Handler
async function handleERC3525Allocations(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const allocations = blocks.allocations;
  
  if (allocations && Array.isArray(allocations) && allocations.length > 0) {
    results.arrayData.allocations = { status: 'pending', count: allocations.length };
    
    try {
      const allocationRecords = allocations.map((allocation: any, index: number) => {
        // Extract and validate required fields with fallbacks
        let slotId = allocation.slotId || allocation.slot_id || allocation.slot;
        let tokenIdWithinSlot = allocation.tokenIdWithinSlot || allocation.token_id_within_slot || allocation.tokenId || allocation.id;
        
        // Ensure slot_id is not null/undefined
        if (!slotId || slotId === null || slotId === undefined || slotId === '') {
          slotId = `slot-${index + 1}`;
          console.warn(`[TokenService] Fixed missing slot_id for allocation ${index}:`, slotId);
        }
        
        // Ensure token_id_within_slot is not null/undefined
        if (!tokenIdWithinSlot || tokenIdWithinSlot === null || tokenIdWithinSlot === undefined || tokenIdWithinSlot === '') {
          tokenIdWithinSlot = `token-${index + 1}`;
          console.warn(`[TokenService] Fixed missing token_id_within_slot for allocation ${index}:`, tokenIdWithinSlot);
        }
        
        return {
          token_id: tokenId,
          slot_id: String(slotId).trim(),
          token_id_within_slot: String(tokenIdWithinSlot).trim(),
          value: allocation.value || allocation.valueAmount || '0',
          recipient: allocation.recipient || allocation.holderAddress || allocation.holder_address,
          linked_token_id: allocation.linkedTokenId || allocation.linked_token_id || null
        };
      });
      
      console.log('[TokenService] Inserting token_erc3525_allocations records:', allocationRecords);
      
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('token_erc3525_allocations')
        .insert(allocationRecords)
        .select();
      
      if (allocationsError) {
        console.error('[TokenService] Error inserting token_erc3525_allocations:', allocationsError);
        results.arrayData.allocations = {
          status: 'failed',
          error: allocationsError.message,
          attempted: allocationRecords.length
        };
      } else {
        console.log('[TokenService] Successfully inserted token_erc3525_allocations');
        results.arrayData.allocations = {
          status: 'success',
          count: allocationsData.length,
          data: allocationsData
        };
      }
    } catch (allocationError: any) {
      console.error('[TokenService] Error processing allocations:', allocationError);
      results.arrayData.allocations = {
        status: 'failed',
        error: allocationError.message
      };
    }
  }
}

// ERC-3525 Payment Schedules Handler
async function handleERC3525PaymentSchedules(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const paymentSchedules = blocks.paymentSchedules || blocks.payment_schedules;
  
  if (paymentSchedules && Array.isArray(paymentSchedules) && paymentSchedules.length > 0) {
    results.arrayData.paymentSchedules = { status: 'pending', count: paymentSchedules.length };
    
    try {
      const scheduleRecords = paymentSchedules.map((schedule: any, index: number) => {
        // Extract and validate required fields with fallbacks
        let slotId = schedule.slotId || schedule.slot_id || schedule.slot;
        
        // Ensure slot_id is not null/undefined
        if (!slotId || slotId === null || slotId === undefined || slotId === '') {
          slotId = `slot-${index + 1}`;
          console.warn(`[TokenService] Fixed missing slot_id for payment schedule ${index}:`, slotId);
        }
        
        return {
          token_id: tokenId,
          slot_id: String(slotId).trim(),
          payment_date: schedule.paymentDate || schedule.payment_date || new Date().toISOString(),
          payment_amount: schedule.paymentAmount || schedule.payment_amount || schedule.amount || '0',
          payment_type: schedule.paymentType || schedule.payment_type || 'interest',
          currency: schedule.currency || 'USD',
          is_completed: schedule.isCompleted || schedule.is_completed || false,
          transaction_hash: schedule.transactionHash || schedule.transaction_hash || null
        };
      });
      
      console.log('[TokenService] Inserting token_erc3525_payment_schedules records:', scheduleRecords);
      
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('token_erc3525_payment_schedules')
        .insert(scheduleRecords)
        .select();
      
      if (schedulesError) {
        console.error('[TokenService] Error inserting token_erc3525_payment_schedules:', schedulesError);
        results.arrayData.paymentSchedules = {
          status: 'failed',
          error: schedulesError.message,
          attempted: scheduleRecords.length
        };
      } else {
        console.log('[TokenService] Successfully inserted token_erc3525_payment_schedules');
        results.arrayData.paymentSchedules = {
          status: 'success',
          count: schedulesData.length,
          data: schedulesData
        };
      }
    } catch (scheduleError: any) {
      console.error('[TokenService] Error processing payment schedules:', scheduleError);
      results.arrayData.paymentSchedules = {
        status: 'failed',
        error: scheduleError.message
      };
    }
  }
}

// ERC-3525 Value Adjustments Handler  
async function handleERC3525ValueAdjustments(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const valueAdjustments = blocks.valueAdjustments || blocks.value_adjustments;
  
  if (valueAdjustments && Array.isArray(valueAdjustments) && valueAdjustments.length > 0) {
    results.arrayData.valueAdjustments = { status: 'pending', count: valueAdjustments.length };
    
    try {
      const adjustmentRecords = valueAdjustments.map((adjustment: any, index: number) => {
        // Validate and extract timestamp value with enhanced field name detection
        let adjustmentDate = adjustment.adjustmentDate || adjustment.adjustment_date || adjustment.effectiveDate || adjustment.effective_date;
        
        // Enhanced date field resolution - handle field name references
        if (typeof adjustmentDate === 'string') {
          // Check if it's a field name reference like "ex_dividend_date"
          if (adjustmentDate.includes('_date') || adjustmentDate.includes('Date') || 
              ['ex_dividend_date', 'record_date', 'payment_date', 'declaration_date'].includes(adjustmentDate)) {
            console.warn(`[TokenService] Field name instead of date value for adjustment ${index}:`, adjustmentDate, 'Using current timestamp');
            adjustmentDate = new Date().toISOString();
          } else if (!/^\d{4}-\d{2}-\d{2}/.test(adjustmentDate)) {
            // If it's not a valid ISO date format, use current timestamp
            console.warn(`[TokenService] Invalid date format for adjustment ${index}:`, adjustmentDate, 'Using current timestamp');
            adjustmentDate = new Date().toISOString();
          }
        } else if (!adjustmentDate || adjustmentDate === null || adjustmentDate === undefined) {
          console.warn(`[TokenService] Invalid adjustment_date for adjustment ${index}:`, adjustmentDate, 'Using current timestamp');
          adjustmentDate = new Date().toISOString();
        }
        
        // Validate slot_id with proper fallback
        let slotId = adjustment.slotId || adjustment.slot_id || adjustment.slot;
        if (!slotId || slotId === null || slotId === undefined || slotId === '') {
          slotId = `slot-${index + 1}`;
          console.warn(`[TokenService] Fixed missing slot_id for value adjustment ${index}:`, slotId);
        }
        
        return {
          token_id: tokenId,
          slot_id: String(slotId).trim(),
          adjustment_date: adjustmentDate,
          adjustment_type: adjustment.adjustmentType || adjustment.adjustment_type || 'revaluation',
          adjustment_amount: adjustment.adjustmentAmount || adjustment.adjustment_amount || adjustment.amount || '0',
          adjustment_reason: adjustment.adjustmentReason || adjustment.adjustment_reason || adjustment.reason || '',
          oracle_price: adjustment.oraclePrice || adjustment.oracle_price || null,
          oracle_source: adjustment.oracleSource || adjustment.oracle_source || null,
          approved_by: adjustment.approvedBy || adjustment.approved_by || null,
          transaction_hash: adjustment.transactionHash || adjustment.transaction_hash || null
        };
      });
      
      console.log('[TokenService] Inserting token_erc3525_value_adjustments records:', adjustmentRecords);
      
      const { data: adjustmentsData, error: adjustmentsError } = await supabase
        .from('token_erc3525_value_adjustments')
        .insert(adjustmentRecords)
        .select();
      
      if (adjustmentsError) {
        console.error('[TokenService] Error inserting token_erc3525_value_adjustments:', adjustmentsError);
        results.arrayData.valueAdjustments = {
          status: 'failed',
          error: adjustmentsError.message,
          attempted: adjustmentRecords.length
        };
      } else {
        console.log('[TokenService] Successfully inserted token_erc3525_value_adjustments');
        results.arrayData.valueAdjustments = {
          status: 'success',
          count: adjustmentsData.length,
          data: adjustmentsData
        };
      }
    } catch (adjustmentError: any) {
      console.error('[TokenService] Error processing value adjustments:', adjustmentError);
      results.arrayData.valueAdjustments = {
        status: 'failed',
        error: adjustmentError.message
      };
    }
  }
}

// ERC-3525 Slot Configs Handler
async function handleERC3525SlotConfigs(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const slotConfigs = blocks.slotConfigs || blocks.slot_configs;
  
  if (slotConfigs && Array.isArray(slotConfigs) && slotConfigs.length > 0) {
    results.arrayData.slotConfigs = { status: 'pending', count: slotConfigs.length };
    
    try {
      const configRecords = slotConfigs.map((config: any, index: number) => {
        // Extract and validate required slot_id field
        let slotId = config.slotId || config.slot_id || config.slot;
        
        // Ensure slot_id is not null/undefined
        if (!slotId || slotId === null || slotId === undefined || slotId === '') {
          slotId = `slot-${index + 1}`;
          console.warn(`[TokenService] Fixed missing slot_id for slot config ${index}:`, slotId);
        }
        
        return {
          token_id: tokenId,
          slot_id: String(slotId).trim(),
          slot_name: config.slotName || config.slot_name || config.name,
          slot_description: config.slotDescription || config.slot_description || config.description,
          value_units: config.valueUnits || config.value_units || 'units',
          slot_type: config.slotType || config.slot_type || 'generic',
          transferable: config.transferable !== false, // Default to true
          tradeable: config.tradeable !== false, // Default to true
          divisible: config.divisible !== false, // Default to true
          min_value: config.minValue || config.min_value || null,
          max_value: config.maxValue || config.max_value || null,
          value_precision: config.valuePrecision || config.value_precision || 18,
          slot_properties: config.slotProperties || config.slot_properties || config.metadata || null
        };
      });
      
      console.log('[TokenService] Inserting token_erc3525_slot_configs records:', configRecords);
      
      const { data: configsData, error: configsError } = await supabase
        .from('token_erc3525_slot_configs')
        .insert(configRecords)
        .select();
      
      if (configsError) {
        console.error('[TokenService] Error inserting token_erc3525_slot_configs:', configsError);
        results.arrayData.slotConfigs = {
          status: 'failed',
          error: configsError.message,
          attempted: configRecords.length
        };
      } else {
        console.log('[TokenService] Successfully inserted token_erc3525_slot_configs');
        results.arrayData.slotConfigs = {
          status: 'success',
          count: configsData.length,
          data: configsData
        };
      }
    } catch (configError: any) {
      console.error('[TokenService] Error processing slot configs:', configError);
      results.arrayData.slotConfigs = {
        status: 'failed',
        error: configError.message
      };
    }
  }
}

// ERC-4626 Strategy Parameters Handler
async function handleERC4626Strategy(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  // Handle both yieldStrategy.protocol and direct strategyParams
  const protocols = blocks.yieldStrategy?.protocol || [];
  const strategyParams = blocks.strategyParams || [];
  
  // Combine both sources
  const allStrategyParams = [...strategyParams];
  
  if (protocols.length > 0) {
    protocols.forEach((protocol: string, index: number) => {
      allStrategyParams.push({
        name: 'protocol',
        value: protocol,
        description: `Yield protocol ${index + 1}`
      });
    });
  }
  
  // Add rebalancing frequency if available
  if (blocks.yieldStrategy?.rebalancingFrequency) {
    allStrategyParams.push({
      name: 'rebalancingFrequency',
      value: blocks.yieldStrategy.rebalancingFrequency,
      description: 'Frequency of rebalancing'
    });
  }
  
  if (allStrategyParams.length > 0) {
    results.arrayData.strategyParams = { status: 'pending', count: allStrategyParams.length };
    
    try {
      const strategyParamRecords = allStrategyParams.map((param: any, index: number) => ({
        token_id: tokenId,
        name: param.name || param.paramName || `param-${index + 1}`,
        value: param.value || param.paramValue || '', // Ensure value is never null (NOT NULL constraint)
        param_type: param.type || param.paramType || 'string',
        description: param.description || ''
      }));
      
      console.log('[TokenService] 🏛️ Inserting ERC-4626 strategy params records:', strategyParamRecords);
      
      const { data: paramsData, error: paramsError } = await supabase
        .from('token_erc4626_strategy_params')
        .insert(strategyParamRecords);
      
      if (paramsError) {
        console.error('[TokenService] ❌ Failed to insert ERC-4626 strategy params:', paramsError);
        results.arrayData.strategyParams = { 
          status: 'failed', 
          error: paramsError.message,
          attempted: strategyParamRecords.length
        };
      } else {
        console.log('[TokenService] ✅ Successfully inserted ERC-4626 strategy params:', 
          (paramsData as any[] | null)?.length || strategyParamRecords.length);
        results.arrayData.strategyParams = { 
          status: 'success', 
          count: strategyParamRecords.length 
        };
      }
    } catch (paramError: any) {
      console.error('[TokenService] ❌ Error processing ERC-4626 strategy parameters:', paramError);
      results.arrayData.strategyParams = { 
        status: 'failed', 
        error: paramError.message 
      };
    }
  } else {
    console.log('[TokenService] ❌ No ERC-4626 strategy parameters found to insert');
    results.arrayData.strategyParams = { status: 'empty', count: 0 };
  }
}

// ERC-4626 Asset Allocations Handler
async function handleERC4626AssetAllocations(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const assetAllocations = blocks.assetAllocation || blocks.assetAllocations || [];
  
  if (assetAllocations.length > 0) {
    results.arrayData.assetAllocations = { status: 'pending', count: assetAllocations.length };
    
    try {
      // Filter out allocations with empty asset names and validate required fields
      const validAllocations = assetAllocations.filter((allocation: any, index: number) => {
        // Updated to include assetClass and benchmark as fallback options
        const assetName = allocation.asset || allocation.assetAddress || allocation.assetName || allocation.name || allocation.assetClass || allocation.benchmark;
        const percentage = allocation.percentage || allocation.targetAllocation || allocation.allocation;
        
        if (!assetName || assetName.trim() === '') {
          console.warn('[TokenService] ⚠️ Skipping asset allocation with empty asset name:', allocation);
          return false;
        }
        
        if (!percentage || percentage === '' || percentage === '0') {
          console.warn('[TokenService] ⚠️ Skipping asset allocation with zero percentage:', allocation);
          return false;
        }
        
        return true;
      });
      
      if (validAllocations.length === 0) {
        console.log('[TokenService] ❌ No valid ERC-4626 asset allocations to insert after validation');
        results.arrayData.assetAllocations = { status: 'empty', count: 0, message: 'No valid allocations found' };
        return;
      }
      
      const allocationRecords = validAllocations.map((allocation: any, index: number) => {
        const assetName = (allocation.asset || allocation.assetAddress || allocation.assetName || allocation.name || allocation.assetClass || allocation.benchmark || `Asset-${index + 1}`).trim();
        const percentage = (allocation.percentage || allocation.targetAllocation || allocation.allocation || '0').toString();
        
        return {
          token_id: tokenId,
          asset: assetName,
          percentage: percentage,
          description: allocation.description || allocation.desc || '',
          protocol: allocation.protocol || allocation.protocolName || '',
          expected_apy: allocation.expectedApy || allocation.expected_apy || allocation.targetApy || ''
        };
      });
      
      console.log('[TokenService] 🏛️ Inserting ERC-4626 asset allocations records:', allocationRecords);
      
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('token_erc4626_asset_allocations')
        .insert(allocationRecords);
      
      if (allocationsError) {
        console.error('[TokenService] ❌ Failed to insert ERC-4626 asset allocations:', allocationsError);
        results.arrayData.assetAllocations = { 
          status: 'failed', 
          error: allocationsError.message,
          attempted: allocationRecords.length
        };
      } else {
        console.log('[TokenService] ✅ Successfully inserted ERC-4626 asset allocations:', 
          (allocationsData as any[] | null)?.length || allocationRecords.length);
        results.arrayData.assetAllocations = { 
          status: 'success', 
          count: allocationRecords.length 
        };
      }
    } catch (allocationError: any) {
      console.error('[TokenService] ❌ Error processing ERC-4626 asset allocations:', allocationError);
      results.arrayData.assetAllocations = { 
        status: 'failed', 
        error: allocationError.message 
      };
    }
  } else {
    console.log('[TokenService] ❌ No ERC-4626 asset allocations found to insert');
    results.arrayData.assetAllocations = { status: 'empty', count: 0 };
  }
}

/**
 * Helper function to process standard-specific fields
 * Converts camelCase to snake_case and handles nested structures
 */
function processStandardSpecificFields(fields: Record<string, any>, standard?: string): Record<string, any> {
  if (!fields || Object.keys(fields).length === 0) return {};
  
  console.log(`[TokenService] Processing ${standard} specific fields:`, JSON.stringify(fields, null, 2));
  
  const result: Record<string, any> = {};
  
  // Process all fields, converting camelCase to snake_case
  for (const [key, value] of Object.entries(fields)) {
    // Skip array fields that have special handling for specific standards
    const arrayFieldsToSkip = {
      'ERC-721': ['tokenAttributes'],
      'ERC-1155': ['tokenTypes'],
      'ERC-1400': ['partitions', 'controllers', 'corporateActions', 'documents', 'custodyProviders', 'regulatoryFilings', 'partitionBalances', 'partitionOperators', 'partitionTransfers'],
      'ERC-3525': ['slots', 'allocations', 'paymentSchedules', 'valueAdjustments', 'slotConfigs'],
      'ERC-4626': ['yieldStrategy', 'assetAllocation', 'strategyParams', 'assetAllocations', 'vaultStrategies', 'feeTiers', 'performanceMetrics']
    };
    
    if (standard && arrayFieldsToSkip[standard as keyof typeof arrayFieldsToSkip]?.includes(key)) {
      continue; // Skip these fields as they're handled separately
    }
    
    // Convert camelCase to snake_case for the key
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    // Handle nested objects (but not arrays)
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = processStandardSpecificFields(value, standard);
    } else {
      result[snakeKey] = value;
    }
  }
  
  // Preserve array fields based on standard
  if (standard === 'ERC-721' && fields.tokenAttributes) {
    result.token_attributes = fields.tokenAttributes;
  } else if (standard === 'ERC-1155' && fields.tokenTypes) {
    result.token_types = fields.tokenTypes;
  } else if (standard === 'ERC-1400') {
    if (fields.partitions) result.partitions = fields.partitions;
    if (fields.controllers) result.controllers = fields.controllers;
    if (fields.corporateActions) result.corporateActions = fields.corporateActions;
    if (fields.documents) result.documents = fields.documents;
    if (fields.custodyProviders) result.custodyProviders = fields.custodyProviders;
    if (fields.regulatoryFilings) result.regulatoryFilings = fields.regulatoryFilings;
    if (fields.partitionBalances) result.partitionBalances = fields.partitionBalances;
    if (fields.partitionOperators) result.partitionOperators = fields.partitionOperators;
    if (fields.partitionTransfers) result.partitionTransfers = fields.partitionTransfers;
  } else if (standard === 'ERC-3525' && fields.slots) {
    result.slots = fields.slots;
  } else if (standard === 'ERC-4626') {
    if (fields.yieldStrategy) result.yield_strategy = fields.yieldStrategy;
    if (fields.assetAllocation) result.asset_allocation = fields.assetAllocation;
    if (fields.strategyParams) result.strategyParams = fields.strategyParams;
    if (fields.assetAllocations) result.assetAllocations = fields.assetAllocations;
    if (fields.vaultStrategies) result.vaultStrategies = fields.vaultStrategies;
    if (fields.feeTiers) result.feeTiers = fields.feeTiers;
    if (fields.performanceMetrics) result.performanceMetrics = fields.performanceMetrics;
  }
  
  // Map common field names regardless of token standard
  const commonMappings: Record<string, string> = {
    'initialSupply': 'initial_supply',
    'isMintable': 'is_mintable',
    'isBurnable': 'is_burnable',
    'isPausable': 'is_pausable',
    'baseUri': 'base_uri',
    'metadataStorage': 'metadata_storage',
    'hasRoyalty': 'has_royalty',
    'royaltyPercentage': 'royalty_percentage',
    'royaltyReceiver': 'royalty_receiver',
    'tokenType': 'token_type',
    'allowanceManagement': 'allow_management',
    'maxSupply': 'max_supply',
    'assetType': 'asset_type',
    'mintingMethod': 'minting_method',
    'autoIncrementIds': 'auto_increment_ids',
    'updatableUris': 'updatable_uris',
    'valueDecimals': 'value_decimals',
    'slotType': 'slot_type',
    'slotApprovals': 'slot_approvals',
    'valueApprovals': 'value_approvals',
    'updatableSlots': 'updatable_slots',
    'valueTransfersEnabled': 'value_transfers_enabled',
    'assetAddress': 'asset_address',
    'assetName': 'asset_name',
    'assetSymbol': 'asset_symbol',
    'assetDecimals': 'asset_decimals',
    'vaultType': 'vault_type',
    'customStrategy': 'custom_strategy',
    'strategyController': 'strategy_controller',
    'flashLoans': 'flash_loans',
    'emergencyShutdown': 'emergency_shutdown',
    'performanceMetrics': 'performance_metrics',
    'feeOnTransfer': 'fee_on_transfer',
    'supplyTracking': 'supply_tracking',
    'enableApprovalForAll': 'enable_approval_for_all',
    'securityType': 'security_type',
    'enforceKYC': 'require_kyc',
    'transferRestrictions': 'transfer_restrictions',
    'forcedTransfersEnabled': 'forced_transfers',
    'isIssuable': 'issuance_modules'
  };
  
  // Apply common mappings
  for (const [camelCase, snakeCase] of Object.entries(commonMappings)) {
    if (fields[camelCase] !== undefined) {
      result[snakeCase] = fields[camelCase];
    }
  }
  
  // Handle structured data for ERC-20 feeOnTransfer
  if (standard === 'ERC-20' && fields.feeOnTransfer) {
    const feeOnTransfer = fields.feeOnTransfer;
    
    // Ensure proper structure and validation
    result.fee_on_transfer = {
      enabled: !!feeOnTransfer.enabled,
      fee: feeOnTransfer.fee || "0",
      feeType: feeOnTransfer.feeType || "percentage",
      recipient: feeOnTransfer.recipient && feeOnTransfer.recipient !== "" 
        ? feeOnTransfer.recipient 
        : null // Use null instead of zero address for empty recipients
    };
  }
  
  // Handle structured data for ERC-4626
  if (standard === 'ERC-4626' && fields.fee) {
    result.fee_structure = typeof fields.fee === 'object' ? fields.fee : { enabled: true, managementFee: fields.fee };
  }
  
  // Handle special case for token metadata
  if (fields.metadata && typeof fields.metadata === 'object') {
    result.metadata = fields.metadata;
  }
  
  console.log(`[TokenService] Processed fields result:`, JSON.stringify(result, null, 2));
  
  return result;
}

/**
 * Update an existing token with comprehensive standard properties and array data
 */
export async function updateToken(tokenId: string, tokenData: Partial<TokenFormData>) {
  console.log('[TokenService] Updating token with data:', JSON.stringify(tokenData, null, 2));
  
  try {
    // 1. First, get the token to confirm it exists and get its standard
    const { data: existingToken, error: getError } = await supabase
      .from('tokens')
      .select('standard, project_id, metadata')
      .eq('id', tokenId)
      .single();
    
    if (getError) {
      throw new Error(`Failed to get token for update: ${getError.message}`);
    }
    
    const standard = tokenData.standard || existingToken.standard;
    
    // 2. Prepare main token data for update
    const tokenUpdate: TokenUpdate = {
      name: tokenData.name,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals,
      blocks: tokenData.blocks || {},
      metadata: {
        ...(existingToken.metadata as Record<string, any> || {}),
        ...(tokenData.description ? { description: tokenData.description } : {})
      },
    };

    // Add total_supply if provided
    if (tokenData.initialSupply) {
      tokenUpdate.total_supply = tokenData.initialSupply;
    }

    // Set total_supply equal to cap when cap is greater than 0
    if (tokenUpdate.blocks && 
        typeof tokenUpdate.blocks === 'object' && 
        'cap' in tokenUpdate.blocks && 
        tokenUpdate.blocks.cap && 
        typeof tokenUpdate.blocks.cap === 'string' && 
        parseFloat(tokenUpdate.blocks.cap) > 0) {
      tokenUpdate.total_supply = tokenUpdate.blocks.cap;
    }

    // 3. Update main token record in database
    const { data: updatedToken, error: updateError } = await supabase
      .from('tokens')
      .update(tokenUpdate)
      .eq('id', tokenId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update token: ${updateError.message}`);
    }
    
    // Create update results container
    const updateResults: Record<string, any> = {
      mainToken: { status: 'success', id: updatedToken.id },
      standardProperties: { status: 'pending' },
      arrayData: {}
    };
    
    // Return the full token data with results
    return {
      ...updatedToken,
      updateResults
    };
  } catch (error: any) {
    console.error('[TokenService] Token update failed:', error);
    throw new Error(`Token update failed: ${error.message}`);
  }
}

/**
 * Get a complete token with all its related properties and array data
 */
export async function getCompleteToken(tokenId: string): Promise<any> {
  if (!tokenId) {
    throw new Error('Token ID is required to fetch complete token data');
  }

  try {
    // 1. Get the main token record
    const { data: token, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (error) {
      throw new Error(`Failed to get token: ${error.message}`);
    }

    if (!token) {
      throw new Error(`Token not found with ID: ${tokenId}`);
    }

    // 2. Get standard-specific properties
    const standard = token.standard;
    const standardTable = getStandardSpecificTable(standard);
    let properties = null;
    
    if (standardTable) {
      const { data: propsData, error: propsError } = await supabase
        .from(standardTable as any)
        .select('*')
        .eq('token_id', tokenId)
        .maybeSingle();
        
      if (propsError) {
        console.warn(`Warning: Failed to get ${standardTable} properties:`, propsError);
      } else if (propsData) {
        properties = propsData;
      }
    }

    // 3. Get related array data
    const arrayData = await getTokenArrayData(standard, tokenId);

    // 4. Combine all data
    return {
      ...token,
      properties,
      ...arrayData
    };
  } catch (error: any) {
    console.error('Error getting complete token:', error);
    throw new Error(`Failed to get complete token: ${error.message}`);
  }
}

/**
 * Get token-related array data based on standard
 */
async function getTokenArrayData(standard: string, tokenId: string): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  
  // Define tables for each standard
  const tables: Record<string, Record<string, [string, string]>> = {
    'ERC-721': {
      'tokenAttributes': ['token_erc721_attributes', 'attributes']
    },
    'ERC-1155': {
      'tokenTypes': ['token_erc1155_types', 'types'],
      'initialBalances': ['token_erc1155_balances', 'balances'],
      'uriMappings': ['token_erc1155_uri_mappings', 'uriMappings']
    },
    'ERC-1400': {
      'partitions': ['token_erc1400_partitions', 'partitions'],
      'controllers': ['token_erc1400_controllers', 'controllers'],
      'documents': ['token_erc1400_documents', 'documents'],
      'corporateActions': ['token_erc1400_corporate_actions', 'corporateActions'],
      'custodyProviders': ['token_erc1400_custody_providers', 'custodyProviders'],
      'regulatoryFilings': ['token_erc1400_regulatory_filings', 'regulatoryFilings'],
      'partitionBalances': ['token_erc1400_partition_balances', 'partitionBalances'],
      'partitionOperators': ['token_erc1400_partition_operators', 'partitionOperators'],
      'partitionTransfers': ['token_erc1400_partition_transfers', 'partitionTransfers']
    },
    'ERC-3525': {
      'slots': ['token_erc3525_slots', 'slots'],
      'allocations': ['token_erc3525_allocations', 'allocations'],
      'paymentSchedules': ['token_erc3525_payment_schedules', 'paymentSchedules'],
      'valueAdjustments': ['token_erc3525_value_adjustments', 'valueAdjustments'],
      'slotConfigs': ['token_erc3525_slot_configs', 'slotConfigs']
    },
    'ERC-4626': {
      'strategyParams': ['token_erc4626_strategy_params', 'strategyParams'],
      'assetAllocations': ['token_erc4626_asset_allocations', 'assetAllocations'],
      'vaultStrategies': ['token_erc4626_vault_strategies', 'vaultStrategies'],
      'feeTiers': ['token_erc4626_fee_tiers', 'feeTiers'],
      'performanceMetrics': ['token_erc4626_performance_metrics', 'performanceMetrics']
    }
  };
  
  // Get relevant tables for this standard
  const tablesForStandard = tables[standard] || {};
  
  // Query each table and add to result
  for (const [resultName, [tableName, arrayName]] of Object.entries(tablesForStandard)) {
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .eq('token_id', tokenId);
        
      if (error) {
        console.warn(`Warning: Failed to get ${tableName} data:`, error);
      } else if (data && data.length > 0) {
        result[resultName] = data;
      }
    } catch (err: any) {
      console.error(`Error getting data from ${tableName}:`, err);
    }
  }
  
  return result;
}

/**
 * Get a token by ID
 */
export async function getToken(tokenId: string) {
  if (!tokenId) {
    throw new Error('Token ID is required to fetch token details');
  }

  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('id', tokenId)
    .single();

  if (error) {
    throw new Error(`Failed to get token: ${error.message}`);
  }

  return data;
}

/**
 * Get all tokens
 */
export async function getTokens(projectId: string | null | undefined) {
  if (!projectId || projectId === "undefined") {
    // Return empty array without a warning since this is a common case during routing
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error(`Failed to get tokens: ${error.message}`);
      throw new Error(`Failed to get tokens: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error fetching tokens:', error);
    return [];
  }
}

/**
 * Get tokens by project ID
 */
export async function getTokensByProject(projectId: string | null | undefined) {
  if (!projectId || projectId === "undefined") {
    console.warn('Invalid project ID provided when fetching tokens by project, returning empty array');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error(`Failed to get tokens: ${error.message}`);
      throw new Error(`Failed to get tokens: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error fetching tokens by project:', error);
    return [];
  }
}

/**
 * Update a token's deployment status and details
 */
export async function updateTokenDeployment(tokenId: string, deploymentData: {
  address: string;
  blockchain: string;
  transaction_hash: string;
  status: string;
}) {
  if (!tokenId) {
    throw new Error('Token ID is required to update deployment');
  }

  if (!deploymentData.address) {
    throw new Error('Token address is required for deployment');
  }

  // Update token with deployment information
  const { data, error } = await supabase
    .from('tokens')
    .update({
      address: deploymentData.address,
      blockchain: deploymentData.blockchain,
      status: deploymentData.status as "DRAFT" | "UNDER REVIEW" | "APPROVED" | "READY TO MINT" | "MINTED" | "DEPLOYED" | "PAUSED" | "DISTRIBUTED" | "REJECTED",
      metadata: { transaction_hash: deploymentData.transaction_hash }
    })
    .eq('id', tokenId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update token deployment: ${error.message}`);
  }

  return data;
}

/**
 * Deploy a token to the blockchain
 */
export async function deployToken(config: TokenDeploymentConfig): Promise<TokenDeploymentResult> {
  // First, create a deployment record in the database
  // Include both required fields
  const { data: deploymentRecord, error: deploymentError } = await supabase
    .from('token_deployments')
    .insert({
      token_id: config.tokenId,
      network: config.network,
      deployed_by: config.deployer || 'system',
      status: 'PENDING',
      // Add placeholder values for required fields
      contract_address: 'pending',
      transaction_hash: 'pending',
      deployment_data: {
        environment: config.environment
      }
    })
    .select()
    .single();

  if (deploymentError) {
    throw new Error(`Failed to create deployment record: ${deploymentError.message}`);
  }

  // In a real implementation, you'd make a call to a blockchain service here
  // This is a placeholder that simulates a successful deployment
  const simulatedBlockchainCall = async () => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock data
    return {
      contractAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    };
  };

  try {
    // Simulate the blockchain call
    const deploymentResult = await simulatedBlockchainCall();

    // Update the deployment record with the result
    const { data: updatedDeployment, error: updateError } = await supabase
      .from('token_deployments')
      .update({
        contract_address: deploymentResult.contractAddress,
        transaction_hash: deploymentResult.transactionHash,
        deployed_at: new Date().toISOString(),
        status: 'SUCCESSFUL'
      })
      .eq('id', deploymentRecord.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update deployment record: ${updateError.message}`);
    }

    // Format the result to match the expected return type
    return {
      tokenId: config.tokenId,
      network: config.network,
      environment: config.environment,
      contractAddress: deploymentResult.contractAddress,
      transactionHash: deploymentResult.transactionHash,
      deployedBy: config.deployer || 'system',
      deployedAt: new Date().toISOString(),
      status: 'SUCCESSFUL'
    };
  } catch (error: any) {
    // Update the deployment record with the error
    await supabase
      .from('token_deployments')
      .update({
        status: 'FAILED',
        error_message: error.message
      })
      .eq('id', deploymentRecord.id);

    throw new Error(`Deployment failed: ${error.message}`);
  }
}

/**
 * Execute a token operation (mint, burn, pause, etc.)
 */
export async function executeTokenOperation(params: TokenOperationParams) {
  // Create an operation record in the database
  const { data: operationRecord, error: operationError } = await supabase
    .from('token_operations')
    .insert({
      token_id: params.tokenId,
      operation_type: params.operationType,
      operator: 'current_user', // This would normally be the authenticated user
      recipient_address: params.recipient,
      amount: params.amount ? Number(params.amount) : undefined,
      sender_address: params.sender,
      target_address: params.targetAddress,
      nft_token_id: params.nftTokenId,
      token_type_id: params.tokenTypeId,
      slot_id: params.slotId,
      value: params.value ? Number(params.value) : undefined,
      partition: params.partition,
      asset_token_address: params.assetTokenAddress,
      lock_duration: params.lockDuration,
      lock_reason: params.lockReason,
      unlock_time: params.unlockTime,
      lock_id: params.lockId,
      status: 'PENDING',
      operation_data: {
        operationDetails: params
      }
    })
    .select()
    .single();

  if (operationError) {
    throw new Error(`Failed to create operation record: ${operationError.message}`);
  }

  // In a real implementation, you'd make a call to a blockchain service here
  // This is a placeholder that simulates a successful operation
  const simulatedBlockchainCall = async () => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock data
    return {
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      timestamp: new Date().toISOString(),
    };
  };

  try {
    // Simulate the blockchain call
    const operationResult = await simulatedBlockchainCall();

    // Update the operation record with the result
    const { data: updatedOperation, error: updateError } = await supabase
      .from('token_operations')
      .update({
        transaction_hash: operationResult.transactionHash,
        timestamp: operationResult.timestamp,
        status: 'SUCCESSFUL'
      })
      .eq('id', operationRecord.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update operation record: ${updateError.message}`);
    }

    return updatedOperation;
  } catch (error: any) {
    // Update the operation record with the error
    await supabase
      .from('token_operations')
      .update({
        status: 'FAILED',
        error_message: error.message
      })
      .eq('id', operationRecord.id);

    throw new Error(`Operation failed: ${error.message}`);
  }
}

/**
 * Create a token template
 */
export async function createTokenTemplate(projectId: string, templateData: any) {
  const { data, error } = await supabase
    .from('token_templates')
    .insert({
      project_id: projectId,
      name: templateData.name,
      description: templateData.description || '',
      standard: templateData.standard,
      blocks: templateData.blocks || {},
      metadata: templateData.metadata || {}
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create token template: ${error.message}`);
  }

  return data;
}

/**
 * Get token templates by project ID
 */
export async function getTokenTemplatesByProject(projectId: string) {
  const { data, error } = await supabase
    .from('token_templates')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to get token templates: ${error.message}`);
  }

  return data;
}

/**
 * Delete a token and all its associated resources
 */
export async function deleteToken(projectId: string, tokenId: string) {
  try {
    // Start with a check to ensure the token exists and belongs to the project
    const { data: token, error: getError } = await supabase
      .from('tokens')
      .select('standard, project_id')
      .eq('id', tokenId)
      .single();
    
    if (getError) {
      throw new Error(`Token not found: ${getError.message}`);
    }
    
    if (token.project_id !== projectId) {
      throw new Error('Token does not belong to this project');
    }
    
    const standard = token.standard;
    
    // Create deletion results container
    const results: Record<string, any> = {
      standardArrays: {},
      standardProperties: { status: 'pending' },
      mainToken: { status: 'pending' }
    };
    
    try {
      // 1. First delete any array data for the token
      const arrayResults = await deleteStandardArrayRecords(standard, tokenId, results);
      results.standardArrays = arrayResults;
      
      // 2. Now delete the standard properties record
      const standardTable = getStandardSpecificTable(standard);
      if (standardTable) {
        console.log(`[TokenService] Deleting ${standardTable} record for token ${tokenId}`);
        
        const { error: deletePropertiesError } = await supabase
          .from(standardTable as any)
          .delete()
          .eq('token_id', tokenId);
        
        if (deletePropertiesError) {
          console.error(`[TokenService] Failed to delete ${standardTable} record:`, deletePropertiesError);
          results.standardProperties = { status: 'failed', error: deletePropertiesError.message };
        } else {
          console.log(`[TokenService] Successfully deleted ${standardTable} record for token ${tokenId}`);
          results.standardProperties = { status: 'success' };
        }
      }
      
      // 3. Finally delete the main token record
      const { error: deleteTokenError } = await supabase
        .from('tokens')
        .delete()
        .eq('id', tokenId);
      
      if (deleteTokenError) {
        throw new Error(`Failed to delete token: ${deleteTokenError.message}`);
      }
      
      results.mainToken = { status: 'success' };
    } catch (error: any) {
      console.error('[TokenService] Error during token deletion:', error);
      throw error;
    }
    
    return {
      success: true,
      message: `Token ${tokenId} deleted successfully`,
      results
    };
  } catch (error: any) {
    console.error('[TokenService] Token deletion failed:', error);
    throw new Error(`Token deletion failed: ${error.message}`);
  }
}

/**
 * Delete standard-specific array records
 */
async function deleteStandardArrayRecords(
  standard: string, 
  tokenId: string,
  results: Record<string, any>
): Promise<Record<string, any>> {
  // Map of standard to array tables that need cleanup
  const arrayTables: Record<string, string[]> = {
    'ERC-721': ['token_erc721_attributes'],
    'ERC-1155': ['token_erc1155_types', 'token_erc1155_balances', 'token_erc1155_uri_mappings'],
    'ERC-1400': [
      'token_erc1400_partitions', 
      'token_erc1400_controllers',
      'token_erc1400_documents',
      'token_erc1400_corporate_actions',
      'token_erc1400_custody_providers',
      'token_erc1400_regulatory_filings',
      'token_erc1400_partition_balances',
      'token_erc1400_partition_operators',
      'token_erc1400_partition_transfers'
    ],
    'ERC-3525': ['token_erc3525_slots', 'token_erc3525_allocations', 'token_erc3525_payment_schedules', 'token_erc3525_value_adjustments', 'token_erc3525_slot_configs'],
    'ERC-4626': [
      'token_erc4626_strategy_params', 
      'token_erc4626_asset_allocations', 
      'token_erc4626_vault_strategies',
      'token_erc4626_fee_tiers',
      'token_erc4626_performance_metrics'
    ]
  };
  
  // Get array tables for this standard
  const tables = arrayTables[standard] || [];
  
  // Delete from each table and record results
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('token_id', tokenId);
      
      results[table] = {
        status: error ? 'failed' : 'success',
        error: error?.message
      };
      
      if (error) {
        console.warn(`Warning: Failed to delete records from ${table}: ${error.message}`);
      } else {
        console.log(`Deleted records from ${table}`);
      }
    } catch (err: any) {
      console.error(`Error deleting from ${table}:`, err);
      results[table] = { status: 'failed', error: err.message };
    }
  }
  
  return results;
}

/**
 * Create standard-specific properties from direct data
 */
async function createStandardPropertiesFromDirect(
  standard: string,
  tokenId: string,
  properties: any
): Promise<Record<string, any>> {
  const standardTable = getStandardSpecificTable(standard);
  if (!standardTable) {
    throw new Error(`Unsupported token standard: ${standard}`);
  }
  
  // Ensure token_id is set
  const propertyRecord = {
    token_id: tokenId,
    ...properties
  };
  
  console.log(`[TokenService] Inserting ${standardTable} record from direct data:`, propertyRecord);
  
  const { data: propertiesData, error: propertiesError } = await supabase
    .from(standardTable as any) // Use type assertion
    .insert(propertyRecord)
    .select()
    .single();
    
  if (propertiesError) {
    console.error(`[TokenService] Failed to insert ${standardTable} record:`, propertiesError);
    throw propertiesError;
  }
  
  return { data: propertiesData };
}

/**
 * Handle duplicate key constraint violations with multiple fallback strategies
 */
async function handleDuplicateConstraintError(
  supabase: any,
  tableName: string,
  records: any[],
  tokenId: string,
  error: any,
  arrayType: string
): Promise<{ status: string; count?: number; error?: string; strategy?: string; attempted?: number }> {
  
  console.warn(`[TokenService] Handling duplicate constraint for ${tableName}:`, error);
  
  // Define conflict resolution strategies for different tables
  const conflictStrategies: Record<string, string[]> = {
    'token_erc4626_performance_metrics': ['token_id', 'metric_date'],
    'token_erc1155_type_configs': ['token_id', 'token_type_id'],
    'token_erc1400_partition_balances': ['partition_id', 'holder_address'],
    'token_erc1400_partition_operators': ['partition_id', 'holder_address', 'operator_address'],
    'token_erc3525_slot_configs': ['token_id', 'slot_id'],
    'token_erc721_mint_phases': ['token_id', 'phase_order'],
    'token_erc721_trait_definitions': ['token_id', 'trait_name'],
    'token_geographic_restrictions': ['token_id', 'country_code'],
    'token_whitelists': ['token_id', 'wallet_address']
  };
  
  const conflictColumns = conflictStrategies[tableName];
  
  try {
    // Strategy 1: Use proper upsert with conflict resolution
    if (conflictColumns) {
      console.log(`[TokenService] Attempting upsert strategy for ${tableName} with columns: ${conflictColumns.join(', ')}`);
      
      const { data: upsertData, error: upsertError } = await supabase
        .from(tableName as any)
        .upsert(records, { 
          onConflict: conflictColumns.join(', '),
          ignoreDuplicates: false 
        });
        
      if (!upsertError) {
        console.log(`[TokenService] Successfully upserted ${tableName} records`);
        return { 
          status: 'success', 
          count: records.length,
          strategy: 'upsert'
        };
      }
      
      console.warn(`[TokenService] Upsert failed for ${tableName}:`, upsertError);
    }
    
    // Strategy 2: Delete existing records that would conflict, then insert
    console.log(`[TokenService] Attempting delete-and-insert strategy for ${tableName}`);
    
    if (tableName === 'token_erc4626_performance_metrics') {
      // Special handling for performance metrics
      const existingDates = records.map(r => r.metric_date);
      const { error: deleteError } = await supabase
        .from(tableName as any)
        .delete()
        .eq('token_id', tokenId)
        .in('metric_date', existingDates);
      
      if (deleteError) {
        console.error(`[TokenService] Failed to delete existing ${tableName} records:`, deleteError);
        return { 
          status: 'failed', 
          error: `Delete failed: ${deleteError.message}`,
          attempted: records.length
        };
      }
    } else {
      // General strategy: delete all records for this token from this table
      const { error: deleteError } = await supabase
        .from(tableName as any)
        .delete()
        .eq('token_id', tokenId);
      
      if (deleteError) {
        console.error(`[TokenService] Failed to delete existing ${tableName} records:`, deleteError);
        return { 
          status: 'failed', 
          error: `Delete failed: ${deleteError.message}`,
          attempted: records.length
        };
      }
    }
    
    // Now try to insert fresh records
    const { data: insertData, error: insertError } = await supabase
      .from(tableName as any)
      .insert(records);
      
    if (insertError) {
      console.error(`[TokenService] Failed to insert after delete:`, insertError);
      return { 
        status: 'failed', 
        error: `Insert after delete failed: ${insertError.message}`,
        attempted: records.length
      };
    }
    
    console.log(`[TokenService] Successfully inserted ${tableName} records after cleanup`);
    return { 
      status: 'success', 
      count: records.length,
      strategy: 'delete_and_insert'
    };
    
  } catch (err: any) {
    console.error(`[TokenService] All conflict resolution strategies failed for ${arrayType}:`, err);
    return { 
      status: 'failed', 
      error: `All strategies failed: ${err.message}`,
      attempted: records.length
    };
  }
}
async function createStandardArraysFromDirect(
  standard: string,
  tokenId: string,
  arrays: Record<string, any[]>
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  
  // Map standard-specific array tables
  const arrayTables: Record<string, string> = {
    'ERC-721': {
      token_attributes: 'token_erc721_attributes',
      tokenAttributes: 'token_erc721_attributes', // Handle camelCase variant
      mint_phases: 'token_erc721_mint_phases',
      mintPhases: 'token_erc721_mint_phases', // Handle camelCase variant
      trait_definitions: 'token_erc721_trait_definitions',
      traitDefinitions: 'token_erc721_trait_definitions' // Handle camelCase variant
    },
    'ERC-1155': {
      token_types: 'token_erc1155_types',
      tokenTypes: 'token_erc1155_types', // Handle camelCase variant
      types: 'token_erc1155_types', // Handle shorthand variant from templates
      uri_mappings: 'token_erc1155_uri_mappings',
      uriMappings: 'token_erc1155_uri_mappings', // Handle camelCase variant
      initial_balances: 'token_erc1155_balances',
      balances: 'token_erc1155_balances', // Handle shorthand variant
      crafting_recipes: 'token_erc1155_crafting_recipes',
      craftingRecipes: 'token_erc1155_crafting_recipes', // Handle camelCase variant
      discount_tiers: 'token_erc1155_discount_tiers',
      discountTiers: 'token_erc1155_discount_tiers', // Handle camelCase variant
      type_configs: 'token_erc1155_type_configs',
      typeConfigs: 'token_erc1155_type_configs' // Handle camelCase variant
    },
    'ERC-1400': {
      partitions: 'token_erc1400_partitions',
      controllers: 'token_erc1400_controllers',
      documents: 'token_erc1400_documents',
      corporateActions: 'token_erc1400_corporate_actions',
      custodyProviders: 'token_erc1400_custody_providers',
      regulatoryFilings: 'token_erc1400_regulatory_filings',
      partitionBalances: 'token_erc1400_partition_balances',
      partitionOperators: 'token_erc1400_partition_operators',
      partitionTransfers: 'token_erc1400_partition_transfers'
    },
    'ERC-3525': {
      slots: 'token_erc3525_slots',
      allocations: 'token_erc3525_allocations',
      paymentSchedules: 'token_erc3525_payment_schedules',
      valueAdjustments: 'token_erc3525_value_adjustments',
      slotConfigs: 'token_erc3525_slot_configs'
    },
    'ERC-4626': {
      strategyParams: 'token_erc4626_strategy_params',
      assetAllocations: 'token_erc4626_asset_allocations',
      vaultStrategies: 'token_erc4626_vault_strategies',
      feeTiers: 'token_erc4626_fee_tiers',
      performanceMetrics: 'token_erc4626_performance_metrics'
    }
  }[standard] || {};
  
  // Process each array type
  for (const [arrayType, items] of Object.entries(arrays)) {
    if (!items || !Array.isArray(items) || items.length === 0) continue;
    
    const tableName = arrayTables[arrayType];
    if (!tableName) {
      console.warn(`[TokenService] Unknown array type '${arrayType}' for standard ${standard}`);
      continue;
    }
    
    results[arrayType] = { status: 'pending', count: items.length };
    
    try {
      let records;
      if (tableName === 'token_erc1400_partitions') {
        // Only insert valid columns for partitions
        records = items.map((partition: any, index: number) => {
          const { name, partitionId, ...rest } = partition;
          return {
            token_id: tokenId,
            name: name,
            partition_id: partitionId || `PARTITION-${index + 1}`,
            metadata: Object.keys(rest).length > 0 ? rest : null
          };
        });
      } else if (tableName === 'token_erc1400_controllers') {
        // Only insert valid columns for controllers
        records = items.map((controller: any) => {
          return {
            token_id: tokenId,
            address: controller,
            permissions: ['ADMIN']
          };
        });
      } else if (tableName === 'token_erc1400_documents') {
        // Special handling for ERC-1400 documents
        records = items.map((doc: any) => ({
          token_id: tokenId,
          name: doc.name || doc.documentName || 'Legal Document',
          document_uri: doc.documentUri || doc.uri || doc.url || '',
          document_type: doc.documentType || doc.type || 'legal-agreement',
          document_hash: doc.documentHash || doc.hash || null
        }));
      } else if (tableName === 'token_erc1400_corporate_actions') {
        // Special handling for ERC-1400 corporate actions
        records = items.map((action: any) => ({
          token_id: tokenId,
          action_type: action.actionType || action.type || 'dividend',
          announcement_date: action.announcementDate || action.announceDate || new Date().toISOString().split('T')[0],
          record_date: action.recordDate || null,
          effective_date: action.effectiveDate || null,
          payment_date: action.paymentDate || null,
          action_details: action.actionDetails || action.details || { description: action.description || 'Corporate action' },
          impact_on_supply: action.impactOnSupply || null,
          impact_on_price: action.impactOnPrice || null,
          shareholder_approval_required: action.shareholderApprovalRequired || false,
          voting_deadline: action.votingDeadline || null,
          regulatory_approval_required: action.regulatoryApprovalRequired || false,
          status: action.status || 'announced'
        }));
      } else if (tableName === 'token_erc1400_custody_providers') {
        // Special handling for ERC-1400 custody providers
        records = items.map((provider: any, index: number) => {
          if (typeof provider === 'string') {
            return {
              token_id: tokenId,
              provider_name: `Custody Provider ${index + 1}`,
              provider_type: 'institutional',
              provider_address: provider,
              is_active: true,
              certification_level: 'standard',
              integration_status: 'pending'
            };
          } else {
            return {
              token_id: tokenId,
              provider_name: provider.providerName || provider.name || `Custody Provider ${index + 1}`,
              provider_type: provider.providerType || provider.type || 'institutional',
              provider_address: provider.providerAddress || provider.address || null,
              provider_lei: provider.providerLei || provider.lei || null,
              custody_agreement_hash: provider.custodyAgreementHash || provider.agreementHash || null,
              is_active: provider.isActive !== false,
              certification_level: provider.certificationLevel || provider.certification || 'standard',
              jurisdiction: provider.jurisdiction || null,
              regulatory_approvals: Array.isArray(provider.regulatoryApprovals) ? provider.regulatoryApprovals : null,
              integration_status: provider.integrationStatus || provider.status || 'pending'
            };
          }
        });
      } else if (tableName === 'token_erc1400_regulatory_filings') {
        // Special handling for ERC-1400 regulatory filings
        records = items.map((filing: any) => ({
          token_id: tokenId,
          filing_type: filing.filingType || filing.type || 'form-d',
          filing_date: filing.filingDate || filing.date || new Date().toISOString().split('T')[0],
          filing_jurisdiction: filing.filingJurisdiction || filing.jurisdiction || 'US',
          filing_reference: filing.filingReference || filing.reference || null,
          document_hash: filing.documentHash || filing.hash || null,
          document_uri: filing.documentUri || filing.uri || null,
          regulatory_body: filing.regulatoryBody || filing.body || 'SEC',
          compliance_status: filing.complianceStatus || filing.status || 'pending',
          due_date: filing.dueDate || null,
          auto_generated: filing.autoGenerated || false
        }));
      } else if (tableName === 'token_erc1400_partition_balances') {
        // Note: These require existing partition records - handled by the specific handler function
        records = items.map((balance: any) => ({
          partition_id: balance.partition_id, // Must be provided from partition lookup
          holder_address: balance.holderAddress || balance.address || balance.holder || '0x0000000000000000000000000000000000000000',
          balance: balance.balance || balance.amount || '0',
          metadata: balance.metadata || {}
        }));
      } else if (tableName === 'token_erc1400_partition_operators') {
        // Note: These require existing partition records - handled by the specific handler function
        records = items.map((operator: any) => ({
          partition_id: operator.partition_id, // Must be provided from partition lookup
          holder_address: operator.holderAddress || operator.holder || '0x0000000000000000000000000000000000000000',
          operator_address: operator.operatorAddress || operator.operator || '0x0000000000000000000000000000000000000000',
          authorized: operator.authorized !== false,
          metadata: operator.metadata || {}
        }));
      } else if (tableName === 'token_erc1400_partition_transfers') {
        // Note: These require existing partition records - handled by the specific handler function
        records = items.map((transfer: any) => ({
          partition_id: transfer.partition_id, // Must be provided from partition lookup
          from_address: transfer.fromAddress || transfer.from || '0x0000000000000000000000000000000000000000',
          to_address: transfer.toAddress || transfer.to || '0x0000000000000000000000000000000000000000',
          amount: transfer.amount || transfer.value || '0',
          operator_address: transfer.operatorAddress || transfer.operator || null,
          transaction_hash: transfer.transactionHash || transfer.txHash || null,
          metadata: transfer.metadata || {}
        }));
      } else if (tableName === 'token_erc3525_slots') {
        // Special handling for ERC-3525 slots - comprehensive field mapping
        records = items.map((slot: any, index: number) => {
          // Handle various slot_id field names and ensure it's never null/undefined
          // UPDATED: Added 'slot' field mapping for JSON compatibility
          let slotId = slot.slotId || slot.slot_id || slot.id || slot.slot;
          
          // CRITICAL: Always ensure slot_id exists, no matter what
          if (!slotId || slotId === null || slotId === undefined || slotId === '') {
            slotId = `slot-${index + 1}`;
            console.warn(`[TokenService] CRITICAL: Record ${index} has no slot_id! Generated: ${slotId}`, slot);
          }
          
          // Ensure it's a string and not empty
          slotId = String(slotId).trim();
          
          // EXTRA SAFEGUARD: If somehow it's still empty, force a value
          if (!slotId || slotId === '' || slotId === 'null' || slotId === 'undefined') {
            slotId = `emergency-slot-${Date.now()}-${index}`;
            console.warn(`[TokenService] CRITICAL: Emergency slot_id generated: ${slotId}`);
          }
          
          // Extract other fields (handle both camelCase and snake_case variants)
          // UPDATED: Added 'slot' field to destructuring for JSON compatibility
          const { slotId: _slotId, slot_id: _slot_id, id: _id, slot: _slot, name, slotName, description, slotDescription, valueUnits, transferable, properties, ...rest } = slot;
          
          const record = {
            token_id: tokenId,
            slot_id: slotId, // Use our validated slot_id
            name: name || slotName || `Slot ${slotId}`,                    // Handle both "name" and "slotName"
            description: description || slotDescription || '',                // Handle both "description" and "slotDescription"
            value_units: valueUnits || slot.value_units || 'units',
            slot_transferable: transferable ?? slot.slot_transferable ?? true,
            metadata: Object.keys(rest).length > 0 ? {
              ...rest,
              properties: properties || {}
            } : null
          };
          
          console.log(`[TokenService] Created ERC3525 slot record from createStandardArraysFromDirect:`, record);
          return record;
        });
      } else if (tableName === 'token_erc3525_allocations') {
        // Special handling for ERC-3525 allocations
        records = items.map((allocation: any) => ({
          token_id: tokenId,
          slot_id: allocation.slotId || allocation.slot_id || allocation.slot,
          token_id_within_slot: allocation.tokenIdWithinSlot || allocation.token_id_within_slot || allocation.tokenId,
          value: allocation.value || '0',
          recipient: allocation.recipient || allocation.holderAddress || allocation.holder_address,
          linked_token_id: allocation.linkedTokenId || allocation.linked_token_id || null
        }));
      } else if (tableName === 'token_erc3525_payment_schedules') {
        // Special handling for ERC-3525 payment schedules
        records = items.map((schedule: any) => ({
          token_id: tokenId,
          slot_id: schedule.slotId || schedule.slot_id || schedule.slot,
          payment_date: schedule.paymentDate || schedule.payment_date || new Date().toISOString(),
          payment_amount: schedule.paymentAmount || schedule.payment_amount || schedule.amount || '0',
          payment_type: schedule.paymentType || schedule.payment_type || 'interest',
          currency: schedule.currency || 'USD',
          is_completed: schedule.isCompleted || schedule.is_completed || false,
          transaction_hash: schedule.transactionHash || schedule.transaction_hash || null
        }));
      } else if (tableName === 'token_erc3525_value_adjustments') {
        // Special handling for ERC-3525 value adjustments
        records = items.map((adjustment: any) => ({
          token_id: tokenId,
          slot_id: adjustment.slotId || adjustment.slot_id || adjustment.slot,
          adjustment_date: adjustment.adjustmentDate || adjustment.adjustment_date || adjustment.effectiveDate || adjustment.effective_date || new Date().toISOString(),
          adjustment_type: adjustment.adjustmentType || adjustment.adjustment_type || 'revaluation',
          adjustment_amount: adjustment.adjustmentAmount || adjustment.adjustment_amount || adjustment.amount || '0',
          adjustment_reason: adjustment.adjustmentReason || adjustment.adjustment_reason || adjustment.reason || '',
          oracle_price: adjustment.oraclePrice || adjustment.oracle_price || null,
          oracle_source: adjustment.oracleSource || adjustment.oracle_source || null,
          approved_by: adjustment.approvedBy || adjustment.approved_by || null,
          transaction_hash: adjustment.transactionHash || adjustment.transaction_hash || null
        }));
      } else if (tableName === 'token_erc3525_slot_configs') {
        // Special handling for ERC-3525 slot configs
        records = items.map((config: any) => ({
          token_id: tokenId,
          slot_id: config.slotId || config.slot_id || config.slot,
          slot_name: config.slotName || config.slot_name || config.name,
          slot_description: config.slotDescription || config.slot_description || config.description,
          value_units: config.valueUnits || config.value_units || 'units',
          slot_type: config.slotType || config.slot_type || 'generic',
          transferable: config.transferable !== false, // Default to true
          tradeable: config.tradeable !== false, // Default to true
          divisible: config.divisible !== false, // Default to true
          min_value: config.minValue || config.min_value || null,
          max_value: config.maxValue || config.max_value || null,
          value_precision: config.valuePrecision || config.value_precision || 18,
          slot_properties: config.slotProperties || config.slot_properties || config.metadata || null
        }));
      } else if (tableName === 'token_erc1155_types') {
        // Special handling for ERC-1155 token types - transform structure
        records = items.map((type: any, index: number) => ({
          token_id: tokenId,
          token_type_id: type.type_id || type.id || `${index + 1}`,
          name: type.name || `Token Type ${index + 1}`,
          description: type.description || '',
          max_supply: type.supply || type.maxSupply,
          // Convert boolean fungible to fungibility_type string
          fungibility_type: type.fungible !== undefined 
            ? (type.fungible ? 'fungible' : 'non-fungible')
            : 'non-fungible', // Default to non-fungible if not specified
          metadata: {
            rarityLevel: type.rarityLevel || 'common',
            originalFungibleFlag: type.fungible, // Preserve original for reference
            metadataUri: type.metadataUri || type.metadata_uri || ''
          }
        }));
      } else if (tableName === 'token_erc1155_crafting_recipes') {
        // Special handling for ERC-1155 crafting recipes - map to database schema
        records = items.map((recipe: any, index: number) => ({
          token_id: tokenId,
          recipe_name: recipe.name || recipe.recipeName || `Recipe ${index + 1}`,
          input_tokens: Array.isArray(recipe.inputs) ? recipe.inputs : (recipe.inputTokens || []),
          output_token_type_id: recipe.outputTokenTypeId || recipe.outputTypeId || '1',
          output_quantity: parseInt(recipe.outputQuantity) || 1,
          success_rate: parseInt(recipe.successRate) || 100,
          cooldown_period: parseInt(recipe.cooldown) || 0,
          required_level: parseInt(recipe.requiredLevel) || 0,
          is_active: recipe.isActive !== false && recipe.isEnabled !== false
        }));
      } else if (tableName === 'token_erc1155_discount_tiers') {
        // Special handling for ERC-1155 discount tiers - map to database schema
        records = items.map((tier: any) => ({
          token_id: tokenId,
          min_quantity: parseInt(tier.minimumQuantity) || parseInt(tier.minQuantity) || 1,
          max_quantity: tier.maximumQuantity ? parseInt(tier.maximumQuantity) : (tier.maxQuantity ? parseInt(tier.maxQuantity) : null),
          discount_percentage: tier.discountPercentage || tier.discount || '0',
          tier_name: tier.name || tier.tier || tier.tierName,
          is_active: tier.isActive !== false
        }));
      } else if (tableName === 'token_erc1155_uri_mappings') {
        // Special handling for ERC-1155 URI mappings - map to database schema
        records = items.map((mapping: any) => ({
          token_id: tokenId,
          token_type_id: mapping.tokenTypeId || mapping.tokenId || mapping.id || '1',
          uri: mapping.uri || mapping.metadataUri || `https://api.example.com/metadata/${mapping.tokenTypeId || mapping.id || '1'}.json`
        }));
      } else if (tableName === 'token_erc1155_type_configs') {
        // Special handling for ERC-1155 type configs - map to database schema
        records = items.map((config: any) => ({
          token_id: tokenId,
          token_type_id: config.tokenTypeId || config.tokenId || config.id || '1',
          supply_cap: config.supplyCap || config.maxSupply,
          mint_price: config.mintPrice || config.price,
          is_tradeable: config.isTradeable !== false && config.tradeable !== false,
          is_transferable: config.isTransferable !== false && config.transferable !== false,
          utility_type: config.utilityType || config.type,
          rarity_tier: config.rarityTier || config.rarity,
          experience_value: parseInt(config.experienceValue) || parseInt(config.xp) || 0,
          crafting_materials: typeof config.craftingMaterials === 'object' ? config.craftingMaterials : {},
          burn_rewards: typeof config.burnRewards === 'object' ? config.burnRewards : {}
        }));
      } else if (tableName === 'token_erc1155_balances') {
        // Special handling for ERC-1155 balances - map to database schema
        records = items.map((balance: any) => ({
          token_id: tokenId,
          token_type_id: balance.tokenTypeId || balance.tokenId || balance.id || '1',
          address: balance.address || balance.holder || '0x0000000000000000000000000000000000000000',
          amount: balance.amount || balance.balance || '0'
        }));
      } else if (tableName === 'token_erc4626_strategy_params') {
        // Special handling for ERC-4626 strategy params - map to correct database schema
        records = items.map((param: any, index: number) => ({
          token_id: tokenId,
          name: param.name || param.paramName || param.key || `param-${index + 1}`,
          value: param.value || param.paramValue || param.val || '', // Ensure value is never null (NOT NULL constraint)
          description: param.description || param.desc || '',
          param_type: param.paramType || param.type || 'string',
          is_required: param.isRequired || param.required || false,
          default_value: param.defaultValue || param.default || null
        }));
      } else if (tableName === 'token_erc4626_asset_allocations') {
        // Special handling for ERC-4626 asset allocations - map to correct database schema
        records = items.map((allocation: any) => ({
          token_id: tokenId,
          asset: allocation.asset || allocation.assetAddress || allocation.assetName || allocation.name,
          percentage: allocation.percentage || allocation.targetAllocation || allocation.allocation || '0',
          description: allocation.description || allocation.desc || '',
          protocol: allocation.protocol || allocation.protocolName || '',
          expected_apy: allocation.expectedApy || allocation.expected_apy || allocation.targetApy || ''
        }));
      } else if (tableName === 'token_erc4626_vault_strategies') {
        // Helper function to convert risk level strings to integer scores
        const convertRiskLevelToScore = (riskLevel: any): number => {
          if (typeof riskLevel === 'number') {
            return riskLevel;
          }
          if (typeof riskLevel === 'string') {
            switch (riskLevel.toLowerCase()) {
              case 'low': return 2;
              case 'medium': return 5;
              case 'high': return 8;
              case 'very_low': return 1;
              case 'very_high': return 10;
              default: return 5; // Default to medium risk
            }
          }
          return 5; // Default fallback
        };

        // Special handling for ERC-4626 vault strategies - map to correct database schema
        records = items.map((strategy: any) => ({
          token_id: tokenId,
          strategy_name: strategy.strategyName || strategy.name || strategy.strategy_name,
          strategy_type: strategy.strategyType || strategy.type || strategy.strategy_type || 'yield',
          protocol_address: strategy.protocolAddress || strategy.protocol_address || strategy.address,
          protocol_name: strategy.protocolName || strategy.protocol_name || strategy.protocol,
          allocation_percentage: strategy.allocationPercentage || strategy.allocationPercent || strategy.allocation_percentage || strategy.allocation || '0',
          min_allocation_percentage: strategy.minAllocationPercentage || strategy.minAllocation || strategy.min_allocation_percentage,
          max_allocation_percentage: strategy.maxAllocationPercentage || strategy.maxAllocation || strategy.max_allocation_percentage,
          risk_score: convertRiskLevelToScore(strategy.riskScore || strategy.risk_score || strategy.riskLevel),
          expected_apy: strategy.expectedApy || strategy.expected_apy || strategy.targetApy || strategy.expectedAPY,
          actual_apy: strategy.actualApy || strategy.actual_apy || strategy.actualAPY,
          is_active: strategy.isActive !== false && strategy.is_active !== false,
          last_rebalance: strategy.lastRebalance || strategy.last_rebalance
        }));
      } else if (tableName === 'token_erc4626_fee_tiers') {
        // Special handling for ERC-4626 fee tiers - map to correct database schema
        records = items.map((tier: any) => ({
          token_id: tokenId,
          tier_name: tier.tierName || tier.name || tier.tier_name || tier.tier || 'Default Tier',
          min_balance: tier.minBalance || tier.min_balance || tier.minimum || '0',
          max_balance: tier.maxBalance || tier.max_balance || tier.maximum,
          management_fee_rate: tier.managementFeeRate || tier.management_fee_rate || tier.managementFee || '2.0',
          performance_fee_rate: tier.performanceFeeRate || tier.performance_fee_rate || tier.performanceFee || '20.0',
          deposit_fee_rate: tier.depositFeeRate || tier.deposit_fee_rate || tier.depositFee || '0',
          withdrawal_fee_rate: tier.withdrawalFeeRate || tier.withdrawal_fee_rate || tier.withdrawalFee || '0',
          tier_benefits: tier.tierBenefits || tier.tier_benefits || tier.benefits,
          is_active: tier.isActive !== false && tier.is_active !== false
        }));
      } else if (tableName === 'token_erc4626_performance_metrics') {
        // Special handling for ERC-4626 performance metrics - transform JSON structure to DB schema
        const usedDates = new Set<string>();
        
        records = items.map((metric: any, index: number) => {
          // Generate unique dates and ensure no duplicates within this batch
          let metricDate: string;
          
          if (metric.metricDate || metric.date) {
            // Use provided date first
            metricDate = metric.metricDate || metric.date;
          } else {
            // Generate unique date by going backwards from today
            const baseDate = new Date();
            baseDate.setDate(baseDate.getDate() - index);
            metricDate = baseDate.toISOString().split('T')[0];
          }
          
          // Ensure no duplicate dates within this batch
          let adjustedDate = metricDate;
          let dayOffset = 0;
          while (usedDates.has(adjustedDate)) {
            dayOffset++;
            const adjustedBaseDate = new Date(metricDate);
            adjustedBaseDate.setDate(adjustedBaseDate.getDate() - dayOffset);
            adjustedDate = adjustedBaseDate.toISOString().split('T')[0];
          }
          usedDates.add(adjustedDate);
          
          // Map from JSON structure to database columns
          return {
            token_id: tokenId,
            metric_date: adjustedDate,
            total_assets: metric.currentValue || metric.totalAssets || metric.total_assets || '0',
            share_price: metric.sharePrice || metric.share_price || '1.0',
            apy: metric.metricName?.includes('APY') ? metric.currentValue : metric.apy || '0',
            daily_yield: metric.dailyYield || metric.daily_yield || '0',
            benchmark_performance: metric.benchmarkPerformance || metric.benchmark_performance || '0',
            total_fees_collected: metric.totalFeesCollected || metric.total_fees_collected || '0',
            new_deposits: metric.newDeposits || metric.new_deposits || '0',
            withdrawals: metric.withdrawals || '0',
            net_flow: metric.netFlow || metric.net_flow || '0',
            sharpe_ratio: metric.metricName?.includes('Sharpe') ? metric.currentValue : metric.sharpeRatio || metric.sharpe_ratio || '0',
            volatility: metric.volatility || '0',
            max_drawdown: metric.metricName?.includes('Drawdown') ? metric.currentValue : metric.maxDrawdown || metric.max_drawdown || '0'
          };
        });
      } else if (tableName === 'token_erc3525_allocations') {
        // Special handling for ERC-3525 allocations - ensure required fields are present
        records = items.map((allocation: any, index: number) => {
          // Extract and validate required fields
          let slotId = allocation.slotId || allocation.slot_id || allocation.slot;
          let tokenIdWithinSlot = allocation.tokenIdWithinSlot || allocation.token_id_within_slot || allocation.tokenId || allocation.id;
          
          // Ensure slot_id is not null/undefined
          if (!slotId || slotId === null || slotId === undefined || slotId === '') {
            slotId = `slot-${index + 1}`;
            console.warn(`[TokenService] Fixed missing slot_id for allocation ${index}:`, slotId);
          }
          
          // Ensure token_id_within_slot is not null/undefined
          if (!tokenIdWithinSlot || tokenIdWithinSlot === null || tokenIdWithinSlot === undefined || tokenIdWithinSlot === '') {
            tokenIdWithinSlot = `token-${index + 1}`;
            console.warn(`[TokenService] Fixed missing token_id_within_slot for allocation ${index}:`, tokenIdWithinSlot);
          }
          
          return {
            token_id: tokenId,
            slot_id: String(slotId).trim(),
            token_id_within_slot: String(tokenIdWithinSlot).trim(),
            value: allocation.value || '0',
            recipient: allocation.recipient || allocation.holderAddress || allocation.holder_address,
            linked_token_id: allocation.linkedTokenId || allocation.linked_token_id || null
          };
        });
      } else if (tableName === 'token_erc3525_payment_schedules') {
        // Special handling for ERC-3525 payment schedules - ensure required fields are present
        records = items.map((schedule: any, index: number) => {
          // Extract and validate required fields
          let slotId = schedule.slotId || schedule.slot_id || schedule.slot;
          
          // Ensure slot_id is not null/undefined
          if (!slotId || slotId === null || slotId === undefined || slotId === '') {
            slotId = `slot-${index + 1}`;
            console.warn(`[TokenService] Fixed missing slot_id for payment schedule ${index}:`, slotId);
          }
          
          return {
            token_id: tokenId,
            slot_id: String(slotId).trim(),
            payment_date: schedule.paymentDate || schedule.payment_date || new Date().toISOString(),
            payment_amount: schedule.paymentAmount || schedule.payment_amount || schedule.amount || '0',
            payment_type: schedule.paymentType || schedule.payment_type || 'interest',
            currency: schedule.currency || 'USD',
            is_completed: schedule.isCompleted || schedule.is_completed || false,
            transaction_hash: schedule.transactionHash || schedule.transaction_hash || null
          };
        });
      } else if (tableName === 'token_erc3525_value_adjustments') {
        // Special handling for ERC-3525 value adjustments - ensure required fields are present
        records = items.map((adjustment: any, index: number) => {
          // Extract and validate required fields
          let slotId = adjustment.slotId || adjustment.slot_id || adjustment.slot;
          
          // Ensure slot_id is not null/undefined
          if (!slotId || slotId === null || slotId === undefined || slotId === '') {
            slotId = `slot-${index + 1}`;
            console.warn(`[TokenService] Fixed missing slot_id for value adjustment ${index}:`, slotId);
          }
          
          return {
            token_id: tokenId,
            slot_id: String(slotId).trim(),
            adjustment_type: adjustment.adjustmentType || adjustment.adjustment_type || 'manual',
            adjustment_amount: adjustment.adjustmentAmount || adjustment.adjustment_amount || adjustment.amount || '0',
            reason: adjustment.reason || '',
            effective_date: adjustment.effectiveDate || adjustment.effective_date || new Date().toISOString(),
            created_by: adjustment.createdBy || adjustment.created_by || null,
            approved_by: adjustment.approvedBy || adjustment.approved_by || null
          };
        });
      } else if (tableName === 'token_erc3525_slot_configs') {
        // Special handling for ERC-3525 slot configs - ensure required fields are present
        records = items.map((config: any, index: number) => {
          // Extract and validate required fields
          let slotId = config.slotId || config.slot_id || config.slot;
          
          // Ensure slot_id is not null/undefined
          if (!slotId || slotId === null || slotId === undefined || slotId === '') {
            slotId = `slot-${index + 1}`;
            console.warn(`[TokenService] Fixed missing slot_id for slot config ${index}:`, slotId);
          }
          
          return {
            token_id: tokenId,
            slot_id: String(slotId).trim(),
            transferable: config.transferable !== false,
            mergeable: config.mergeable !== false,
            splittable: config.splittable !== false,
            max_value: config.maxValue || config.max_value || null,
            min_value: config.minValue || config.min_value || null,
            value_decimal_places: config.valueDecimalPlaces || config.value_decimal_places || 18,
            metadata_uri: config.metadataUri || config.metadata_uri || null,
            slot_properties: typeof config.slotProperties === 'object' ? config.slotProperties : (typeof config.slot_properties === 'object' ? config.slot_properties : {})
          };
        });
      } else {
        // Default: add token_id to each item
        records = items.map((item, index) => {
          // For ERC3525 slots, handle slot_id BEFORE creating the record
          if (tableName === 'token_erc3525_slots') {
            console.log(`[TokenService] DEBUG: Processing ERC3525 slot item ${index}:`, JSON.stringify(item, null, 2));
            
            // Handle various slot_id field names and ensure it's never null/undefined
            let slotId = item.slotId || item.slot_id || item.id;
            console.log(`[TokenService] DEBUG: Initial slot_id for item ${index}:`, slotId);
            
            // CRITICAL: Always ensure slot_id exists, no matter what
            if (!slotId || slotId === null || slotId === undefined || slotId === '') {
              slotId = `slot-${index + 1}`;
              console.warn(`[TokenService] Fixed missing slot_id for ${tableName} item ${index}:`, slotId);
            }
            
            // Ensure it's a string and not empty
            slotId = String(slotId).trim();
            
            // EXTRA SAFEGUARD: If somehow it's still empty, force a value
            if (!slotId || slotId === '' || slotId === 'null' || slotId === 'undefined') {
              slotId = `emergency-slot-${Date.now()}-${index}`;
              console.error(`[TokenService] EMERGENCY: Had to use emergency slot_id for item ${index}:`, slotId);
            }
            
            console.log(`[TokenService] DEBUG: Final slot_id for item ${index}:`, slotId);
            
            // Create clean item without fields we're explicitly mapping
            const cleanItem = { ...item };
            delete cleanItem.slot_id;
            delete cleanItem.slotId; 
            delete cleanItem.id;
            delete cleanItem.name;
            delete cleanItem.slotName;
            delete cleanItem.description; 
            delete cleanItem.slotDescription;
            delete cleanItem.valueUnits;
            delete cleanItem.value_units;
            delete cleanItem.transferable;
            delete cleanItem.slot_transferable;
            
            // Create record with guaranteed slot_id and proper field mappings
            const record = {
              token_id: tokenId,
              slot_id: slotId, // Use our validated slot_id
              name: item.name || item.slotName || `Slot ${index + 1}`,                    // Handle both "name" and "slotName"
              description: item.description || item.slotDescription || '',                // Handle both "description" and "slotDescription"
              value_units: item.valueUnits || item.value_units || 'units',
              slot_transferable: item.transferable ?? item.slot_transferable ?? true,
              ...cleanItem // Spread the cleaned item for any additional fields
            };
            
            console.log(`[TokenService] DEBUG: Final ERC3525 slot record ${index}:`, JSON.stringify(record, null, 2));
            return record;
          } else {
            // Non-ERC3525 logic
            const record = {
              token_id: tokenId,
              ...item
            };
            
            // General validation: remove null/undefined required fields and warn
            Object.keys(record).forEach(key => {
              if (record[key] === null || record[key] === undefined) {
                console.warn(`[TokenService] Null/undefined value for ${key} in ${tableName} record ${index}, removing field`);
                delete record[key];
              }
            });
            
            return record;
          }
        });
      }
      
      console.log(`[TokenService] Inserting ${tableName} records:`, records);
      
      // DEBUG: Additional validation for ERC3525 slots before insert
      if (tableName === 'token_erc3525_slots') {
        console.log(`[TokenService] DEBUG: About to insert ${records.length} slot records`);
        records.forEach((record, index) => {
          console.log(`[TokenService] DEBUG: Slot record ${index}:`, JSON.stringify(record, null, 2));
          if (!record.slot_id) {
            console.error(`[TokenService] CRITICAL: Record ${index} has no slot_id!`, record);
          }
        });
      }
      
      const { data, error } = await supabase
        .from(tableName as any) // Use type assertion
        .insert(records);
        
      if (error) {
        // Enhanced duplicate constraint handling for all tables
        if (error.code === '23505') {
          console.warn(`[TokenService] Duplicate constraint detected for ${tableName}, attempting resolution:`, error);
          
          const resolution = await handleDuplicateConstraintError(
            supabase,
            tableName,
            records,
            tokenId,
            error,
            arrayType
          );
          
          results[arrayType] = resolution;
        } else {
          console.error(`[TokenService] Failed to insert ${tableName} records:`, error);
          results[arrayType] = { 
            status: 'failed', 
            error: error.message,
            attempted: records.length
          };
        }
      } else {
        console.log(`[TokenService] Inserted ${tableName} records successfully`);
        results[arrayType] = { 
          status: 'success', 
          count: records.length 
        };
      }
    } catch (error: any) {
      console.error(`[TokenService] Error processing ${arrayType}:`, error);
      results[arrayType] = { 
        status: 'failed', 
        error: error.message 
      };
    }
  }
  
  return results;
}

/**
 * Extract array data from blocks for a specific token standard
 */
function extractArraysFromBlocks(standard: string, blocks: Record<string, any>): Record<string, any[]> {
  const result: Record<string, any[]> = {};
  
  switch (standard) {
    case 'ERC-721':
      if (blocks.tokenAttributes && Array.isArray(blocks.tokenAttributes)) {
        result.token_attributes = blocks.tokenAttributes;
      }
      break;
    case 'ERC-1155':
      if (blocks.tokenTypes && Array.isArray(blocks.tokenTypes)) {
        result.token_types = blocks.tokenTypes;
      }
      // Extract crafting recipes
      if (blocks.craftingRecipes && Array.isArray(blocks.craftingRecipes)) {
        result.crafting_recipes = blocks.craftingRecipes;
      }
      // Extract discount tiers
      if (blocks.discountTiers && Array.isArray(blocks.discountTiers)) {
        result.discount_tiers = blocks.discountTiers;
      }
      // Extract URI mappings
      if (blocks.uriMappings && Array.isArray(blocks.uriMappings)) {
        result.uri_mappings = blocks.uriMappings;
      }
      // Extract type configurations
      if (blocks.typeConfigs && Array.isArray(blocks.typeConfigs)) {
        result.type_configs = blocks.typeConfigs;
      }
      // Extract initial balances
      if (blocks.balances && Array.isArray(blocks.balances)) {
        result.balances = blocks.balances;
      }
      break;
    case 'ERC-1400':
      // Handle partitions from multiple sources
      if (blocks.partitions && Array.isArray(blocks.partitions)) {
        result.partitions = blocks.partitions;
      }
      // Handle controllers from multiple sources  
      if (blocks.controllers && Array.isArray(blocks.controllers)) {
        result.controllers = blocks.controllers;
      }
      // Handle documents from multiple sources
      if (blocks.documents && Array.isArray(blocks.documents)) {
        result.documents = blocks.documents;
      }
      // Handle corporate actions from multiple sources
      if (blocks.corporateActions && Array.isArray(blocks.corporateActions)) {
        result.corporateActions = blocks.corporateActions;
      }
      // Handle custody providers from multiple sources
      if (blocks.custodyProviders && Array.isArray(blocks.custodyProviders)) {
        result.custodyProviders = blocks.custodyProviders;
      }
      // Handle regulatory filings from multiple sources
      if (blocks.regulatoryFilings && Array.isArray(blocks.regulatoryFilings)) {
        result.regulatoryFilings = blocks.regulatoryFilings;
      }
      // Handle partition balances from multiple sources
      if (blocks.partitionBalances && Array.isArray(blocks.partitionBalances)) {
        result.partitionBalances = blocks.partitionBalances;
      }
      // Handle partition operators from multiple sources
      if (blocks.partitionOperators && Array.isArray(blocks.partitionOperators)) {
        result.partitionOperators = blocks.partitionOperators;
      }
      // Handle partition transfers from multiple sources
      if (blocks.partitionTransfers && Array.isArray(blocks.partitionTransfers)) {
        result.partitionTransfers = blocks.partitionTransfers;
      }
      break;
    case 'ERC-3525':
      if (blocks.slots && Array.isArray(blocks.slots)) {
        result.slots = blocks.slots;
      }
      if (blocks.allocations && Array.isArray(blocks.allocations)) {
        result.allocations = blocks.allocations;
      }
      if (blocks.paymentSchedules && Array.isArray(blocks.paymentSchedules)) {
        result.paymentSchedules = blocks.paymentSchedules;
      }
      if (blocks.valueAdjustments && Array.isArray(blocks.valueAdjustments)) {
        result.valueAdjustments = blocks.valueAdjustments;
      }
      if (blocks.slotConfigs && Array.isArray(blocks.slotConfigs)) {
        result.slotConfigs = blocks.slotConfigs;
      }
      break;
    case 'ERC-4626':
      if (blocks.yieldStrategy?.protocol && Array.isArray(blocks.yieldStrategy.protocol)) {
        result.strategyParams = blocks.yieldStrategy.protocol.map((p: string) => ({
          name: 'protocol',
          value: p
        }));
      } else if (blocks.standardArrays?.strategyParams && Array.isArray(blocks.standardArrays.strategyParams)) {
        result.strategyParams = blocks.standardArrays.strategyParams;
      }
      
      if (blocks.assetAllocation && Array.isArray(blocks.assetAllocation)) {
        result.assetAllocations = blocks.assetAllocation;
      } else if (blocks.standardArrays?.assetAllocations && Array.isArray(blocks.standardArrays.assetAllocations)) {
        result.assetAllocations = blocks.standardArrays.assetAllocations;
      }
      
      // Handle performanceMetrics array data
      if (blocks.performanceMetrics && Array.isArray(blocks.performanceMetrics)) {
        result.performanceMetrics = blocks.performanceMetrics;
      } else if (blocks.standardArrays?.performanceMetrics && Array.isArray(blocks.standardArrays.performanceMetrics)) {
        result.performanceMetrics = blocks.standardArrays.performanceMetrics;
      }
      break;
  }
  
  return result;
}

/**
 * Update a token's status
 * @param tokenId The token ID to update
 * @param status The new status
 * @returns The updated token data
 */
export async function updateTokenStatus(tokenId: string, status: string) {
  if (!tokenId) {
    console.error('[TokenService] Error: No token ID provided');
    throw new Error('No token ID provided');
  }

  if (!status) {
    console.error('[TokenService] Error: No status provided');
    throw new Error('No status provided');
  }

  // Define the valid database status enum type
  type TokenStatusEnum = "DRAFT" | "UNDER REVIEW" | "APPROVED" | "READY TO MINT" | "MINTED" | "DEPLOYED" | "PAUSED" | "DISTRIBUTED" | "REJECTED";
  
  // Map frontend enum values to database enum values
  const statusMap: Record<string, TokenStatusEnum> = {
    'DRAFT': 'DRAFT',
    'REVIEW': 'UNDER REVIEW',
    'UNDER_REVIEW': 'UNDER REVIEW',
    'APPROVED': 'APPROVED',
    'REJECTED': 'REJECTED',
    'READY_TO_MINT': 'READY TO MINT',
    'READY TO MINT': 'READY TO MINT', // Direct match for database format
    'MINTED': 'MINTED',
    'DEPLOYED': 'DEPLOYED',
    'PAUSED': 'PAUSED',
    'DISTRIBUTED': 'DISTRIBUTED'
  };
  
  // Handle status with underscores (frontend format) or spaces (database format)
  let normalizedStatus = status;
  
  // Convert frontend enum format with underscores to database format with spaces
  if (status === 'READY_TO_MINT') {
    normalizedStatus = 'READY TO MINT';
    console.log(`[TokenService] Normalized READY_TO_MINT to 'READY TO MINT'`);
  } else if (status === 'UNDER_REVIEW' || status === 'REVIEW') {
    normalizedStatus = 'UNDER REVIEW';
    console.log(`[TokenService] Normalized ${status} to 'UNDER REVIEW'`);
  }
  
  // Get the mapped database status value, defaulting to DRAFT if not found
  let dbStatus: TokenStatusEnum;
  
  // First check if the normalized status is already a valid database enum value
  if (Object.values(statusMap).includes(normalizedStatus as TokenStatusEnum)) {
    dbStatus = normalizedStatus as TokenStatusEnum;
    console.log(`[TokenService] Using normalized status directly: ${dbStatus}`);
  } else {
    // Otherwise use the mapping
    dbStatus = statusMap[normalizedStatus] || 'DRAFT';
    console.log(`[TokenService] Mapped status ${normalizedStatus} to ${dbStatus}`);
  }
  
  console.log(`[TokenService] Updating token ${tokenId} status from ${status} to database value ${dbStatus}`);
  
  try {
    // First, check if the token exists
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('id, status')
      .eq('id', tokenId)
      .single();
    
    if (tokenError) {
      console.error(`[TokenService] Error finding token: ${tokenError.message}`);
      throw new Error(`Error finding token: ${tokenError.message}`);
    }
    
    if (!tokenData) {
      console.error(`[TokenService] Token not found with ID: ${tokenId}`);
      throw new Error(`Token not found with ID: ${tokenId}`);
    }
    
    console.log(`[TokenService] Found token with current status: ${tokenData.status}`);
    
    // Now update the token status
    const { data, error } = await supabase
      .from('tokens')
      .update({ status: dbStatus })
      .eq('id', tokenId)
      .select()
      .single();
    
    if (error) {
      console.error(`[TokenService] Error updating token status: ${error.message}`);
      console.error(`[TokenService] Error details:`, error);
      throw new Error(`Error updating token status: ${error.message}`);
    }
    
    if (!data) {
      console.error(`[TokenService] No data returned after update`);
      throw new Error('No data returned after update');
    }
  
    console.log(`[TokenService] Successfully updated token status to: ${data.status}`);
    return data;
  } catch (error) {
    console.error(`[TokenService] Unexpected error updating token status:`, error);
    throw error;
  }
}// ERC-1155 URI Mappings Handler
async function handleERC1155UriMappings(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const uriMappings = blocks.uriMappings;
  
  if (uriMappings && Array.isArray(uriMappings) && uriMappings.length > 0) {
    results.arrayData.uriMappings = { status: 'pending', count: uriMappings.length };
    
    try {
      const mappingRecords = uriMappings.map((mapping: any) => ({
        token_id: tokenId,
        token_type_id: mapping.tokenTypeId || mapping.tokenId || mapping.id || '1',
        uri: mapping.uri || mapping.metadataUri || `https://api.example.com/metadata/${mapping.tokenTypeId || mapping.id || '1'}.json`
      }));
      
      console.log('[TokenService] Inserting token_erc1155_uri_mappings records:', mappingRecords);
      
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('token_erc1155_uri_mappings')
        .insert(mappingRecords)
        .select();
      
      if (mappingsError) {
        console.error('[TokenService] Failed to insert token_erc1155_uri_mappings records:', mappingsError);
        results.arrayData.uriMappings = { 
          status: 'failed', 
          error: mappingsError.message,
          attempted: mappingRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1155_uri_mappings records:', mappingsData);
        results.arrayData.uriMappings = { 
          status: 'success', 
          count: mappingsData.length,
          data: mappingsData 
        };
      }
    } catch (mappingError: any) {
      console.error('[TokenService] Error processing URI mappings:', mappingError);
      results.arrayData.uriMappings = { 
        status: 'failed', 
        error: mappingError.message 
      };
    }
  }
}

// ERC-1155 Type Configurations Handler
async function handleERC1155TypeConfigs(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const typeConfigs = blocks.typeConfigs;
  
  if (typeConfigs && Array.isArray(typeConfigs) && typeConfigs.length > 0) {
    results.arrayData.typeConfigs = { status: 'pending', count: typeConfigs.length };
    
    try {
      const configRecords = typeConfigs.map((config: any) => ({
        token_id: tokenId,
        token_type_id: config.tokenTypeId || config.tokenId || config.id || '1',
        supply_cap: config.supplyCap || config.maxSupply,
        mint_price: config.mintPrice || config.price,
        is_tradeable: config.isTradeable !== false && config.tradeable !== false,
        is_transferable: config.isTransferable !== false && config.transferable !== false,
        utility_type: config.utilityType || config.type,
        rarity_tier: config.rarityTier || config.rarity,
        experience_value: parseInt(config.experienceValue) || parseInt(config.xp) || 0,
        crafting_materials: typeof config.craftingMaterials === 'object' ? config.craftingMaterials : {},
        burn_rewards: typeof config.burnRewards === 'object' ? config.burnRewards : {}
      }));
      
      console.log('[TokenService] Inserting token_erc1155_type_configs records:', configRecords);
      
      const { data: configsData, error: configsError } = await supabase
        .from('token_erc1155_type_configs')
        .insert(configRecords)
        .select();
      
      if (configsError) {
        console.error('[TokenService] Failed to insert token_erc1155_type_configs records:', configsError);
        results.arrayData.typeConfigs = { 
          status: 'failed', 
          error: configsError.message,
          attempted: configRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1155_type_configs records:', configsData);
        results.arrayData.typeConfigs = { 
          status: 'success', 
          count: configsData.length,
          data: configsData 
        };
      }
    } catch (configError: any) {
      console.error('[TokenService] Error processing type configs:', configError);
      results.arrayData.typeConfigs = { 
        status: 'failed', 
        error: configError.message 
      };
    }
  }
}

// ERC-1155 Balances Handler
async function handleERC1155Balances(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const balances = blocks.balances;
  
  if (balances && Array.isArray(balances) && balances.length > 0) {
    results.arrayData.balances = { status: 'pending', count: balances.length };
    
    try {
      const balanceRecords = balances.map((balance: any) => ({
        token_id: tokenId,
        token_type_id: balance.tokenTypeId || balance.tokenId || balance.id || '1',
        address: balance.address || balance.holder || '0x0000000000000000000000000000000000000000',
        amount: balance.amount || balance.balance || '0'
      }));
      
      console.log('[TokenService] Inserting token_erc1155_balances records:', balanceRecords);
      
      const { data: balancesData, error: balancesError } = await supabase
        .from('token_erc1155_balances')
        .insert(balanceRecords)
        .select();
      
      if (balancesError) {
        console.error('[TokenService] Failed to insert token_erc1155_balances records:', balancesError);
        results.arrayData.balances = { 
          status: 'failed', 
          error: balancesError.message,
          attempted: balanceRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1155_balances records:', balancesData);
        results.arrayData.balances = { 
          status: 'success', 
          count: balancesData.length,
          data: balancesData 
        };
      }
    } catch (balanceError: any) {
      console.error('[TokenService] Error processing balances:', balanceError);
      results.arrayData.balances = { 
        status: 'failed', 
        error: balanceError.message 
      };
    }
  }
}


// ================== ENHANCED ERC-1400 HANDLERS ==================
// These handlers support all 10 ERC-1400 database tables for comprehensive security token management

// ERC-1400 Documents Handler
async function handleERC1400Documents(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const documents = blocks.documents || blocks.standardArrays?.documents;
  
  if (documents && Array.isArray(documents) && documents.length > 0) {
    results.arrayData.documents = { status: 'pending', count: documents.length };
    
    try {
      const documentRecords = documents.map((doc: any) => ({
        token_id: tokenId,
        name: doc.name || doc.documentName || 'Legal Document',
        document_uri: doc.documentUri || doc.uri || doc.url || '',
        document_type: doc.documentType || doc.type || 'legal-agreement',
        document_hash: doc.documentHash || doc.hash || null
      }));
      
      console.log('[TokenService] Inserting token_erc1400_documents records:', documentRecords);
      
      const { data: documentsData, error: documentsError } = await supabase
        .from('token_erc1400_documents')
        .insert(documentRecords)
        .select();
      
      if (documentsError) {
        console.error('[TokenService] Failed to insert token_erc1400_documents records:', documentsError);
        results.arrayData.documents = { 
          status: 'failed', 
          error: documentsError.message,
          attempted: documentRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1400_documents records:', documentsData);
        results.arrayData.documents = { 
          status: 'success', 
          count: documentsData.length,
          data: documentsData 
        };
      }
    } catch (docError: any) {
      console.error('[TokenService] Error processing documents:', docError);
      results.arrayData.documents = { 
        status: 'failed', 
        error: docError.message 
      };
    }
  }
}

// ERC-1400 Corporate Actions Handler
async function handleERC1400CorporateActions(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const corporateActions = blocks.corporateActions || blocks.standardArrays?.corporateActions;
  
  if (corporateActions && Array.isArray(corporateActions) && corporateActions.length > 0) {
    results.arrayData.corporateActions = { status: 'pending', count: corporateActions.length };
    
    try {
      const actionRecords = corporateActions.map((action: any) => ({
        token_id: tokenId,
        action_type: action.actionType || action.type || 'dividend',
        announcement_date: action.announcementDate || action.announceDate || new Date().toISOString().split('T')[0],
        record_date: action.recordDate || null,
        effective_date: action.effectiveDate || null,
        payment_date: action.paymentDate || null,
        action_details: action.actionDetails || action.details || { description: action.description || 'Corporate action' },
        impact_on_supply: action.impactOnSupply || null,
        impact_on_price: action.impactOnPrice || null,
        shareholder_approval_required: action.shareholderApprovalRequired || false,
        voting_deadline: action.votingDeadline || null,
        regulatory_approval_required: action.regulatoryApprovalRequired || false,
        status: action.status || 'announced'
      }));
      
      console.log('[TokenService] Inserting token_erc1400_corporate_actions records:', actionRecords);
      
      const { data: actionsData, error: actionsError } = await supabase
        .from('token_erc1400_corporate_actions')
        .insert(actionRecords)
        .select();
      
      if (actionsError) {
        console.error('[TokenService] Failed to insert token_erc1400_corporate_actions records:', actionsError);
        results.arrayData.corporateActions = { 
          status: 'failed', 
          error: actionsError.message,
          attempted: actionRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1400_corporate_actions records:', actionsData);
        results.arrayData.corporateActions = { 
          status: 'success', 
          count: actionsData.length,
          data: actionsData 
        };
      }
    } catch (actionError: any) {
      console.error('[TokenService] Error processing corporate actions:', actionError);
      results.arrayData.corporateActions = { 
        status: 'failed', 
        error: actionError.message 
      };
    }
  }
}

// ERC-1400 Custody Providers Handler
// ERC-1400 Custody Providers Handler
async function handleERC1400CustodyProviders(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const custodyProviders = blocks.custodyProviders || blocks.thirdPartyCustodyAddresses || blocks.standardArrays?.custodyProviders;
  
  if (custodyProviders && Array.isArray(custodyProviders) && custodyProviders.length > 0) {
    results.arrayData.custodyProviders = { status: 'pending', count: custodyProviders.length };
    
    try {
      const providerRecords = custodyProviders.map((provider: any, index: number) => {
        // Handle both object format and simple address format
        if (typeof provider === 'string') {
          return {
            token_id: tokenId,
            provider_name: `Custody Provider ${index + 1}`,
            provider_type: 'institutional',
            provider_address: provider,
            is_active: true,
            certification_level: 'standard',
            integration_status: 'pending'
          };
        } else {
          return {
            token_id: tokenId,
            provider_name: provider.providerName || provider.name || `Custody Provider ${index + 1}`,
            provider_type: provider.providerType || provider.type || 'institutional',
            provider_address: provider.providerAddress || provider.address || null,
            provider_lei: provider.providerLei || provider.lei || null,
            custody_agreement_hash: provider.custodyAgreementHash || provider.agreementHash || null,
            is_active: provider.isActive !== false,
            certification_level: provider.certificationLevel || provider.certification || 'standard',
            jurisdiction: provider.jurisdiction || null,
            regulatory_approvals: Array.isArray(provider.regulatoryApprovals) ? provider.regulatoryApprovals : null,
            integration_status: provider.integrationStatus || provider.status || 'pending'
          };
        }
      });
      
      console.log('[TokenService] Inserting token_erc1400_custody_providers records:', providerRecords);
      
      const { data: providersData, error: providersError } = await supabase
        .from('token_erc1400_custody_providers')
        .insert(providerRecords)
        .select();
      
      if (providersError) {
        console.error('[TokenService] Failed to insert token_erc1400_custody_providers records:', providersError);
        results.arrayData.custodyProviders = { 
          status: 'failed', 
          error: providersError.message,
          attempted: providerRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1400_custody_providers records:', providersData);
        results.arrayData.custodyProviders = { 
          status: 'success', 
          count: providersData.length,
          data: providersData 
        };
      }
    } catch (providerError: any) {
      console.error('[TokenService] Error processing custody providers:', providerError);
      results.arrayData.custodyProviders = { 
        status: 'failed', 
        error: providerError.message 
      };
    }
  }
}

// ERC-1400 Regulatory Filings Handler
async function handleERC1400RegulatoryFilings(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const regulatoryFilings = blocks.regulatoryFilings || blocks.standardArrays?.regulatoryFilings;
  
  if (regulatoryFilings && Array.isArray(regulatoryFilings) && regulatoryFilings.length > 0) {
    results.arrayData.regulatoryFilings = { status: 'pending', count: regulatoryFilings.length };
    
    try {
      const filingRecords = regulatoryFilings.map((filing: any) => ({
        token_id: tokenId,
        filing_type: filing.filingType || filing.type || 'form-d',
        filing_date: filing.filingDate || filing.date || new Date().toISOString().split('T')[0],
        filing_jurisdiction: filing.filingJurisdiction || filing.jurisdiction || 'US',
        filing_reference: filing.filingReference || filing.reference || null,
        document_hash: filing.documentHash || filing.hash || null,
        document_uri: filing.documentUri || filing.uri || null,
        regulatory_body: filing.regulatoryBody || filing.body || 'SEC',
        compliance_status: filing.complianceStatus || filing.status || 'pending',
        due_date: filing.dueDate || null,
        auto_generated: filing.autoGenerated || false
      }));
      
      console.log('[TokenService] Inserting token_erc1400_regulatory_filings records:', filingRecords);
      
      const { data: filingsData, error: filingsError } = await supabase
        .from('token_erc1400_regulatory_filings')
        .insert(filingRecords)
        .select();
      
      if (filingsError) {
        console.error('[TokenService] Failed to insert token_erc1400_regulatory_filings records:', filingsError);
        results.arrayData.regulatoryFilings = { 
          status: 'failed', 
          error: filingsError.message,
          attempted: filingRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1400_regulatory_filings records:', filingsData);
        results.arrayData.regulatoryFilings = { 
          status: 'success', 
          count: filingsData.length,
          data: filingsData 
        };
      }
    } catch (filingError: any) {
      console.error('[TokenService] Error processing regulatory filings:', filingError);
      results.arrayData.regulatoryFilings = { 
        status: 'failed', 
        error: filingError.message 
      };
    }
  }
}

// ERC-1400 Partition Balances Handler  
async function handleERC1400PartitionBalances(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const partitionBalances = blocks.partitionBalances || blocks.standardArrays?.partitionBalances;
  
  if (partitionBalances && Array.isArray(partitionBalances) && partitionBalances.length > 0) {
    results.arrayData.partitionBalances = { status: 'pending', count: partitionBalances.length };
    
    try {
      // First get the partition IDs from the database to use as foreign keys
      const { data: partitions, error: partitionsError } = await supabase
        .from('token_erc1400_partitions')
        .select('id, partition_id')
        .eq('token_id', tokenId);
      
      if (partitionsError) {
        throw new Error(`Failed to get partitions for balance mapping: ${partitionsError.message}`);
      }
      
      const partitionMap = new Map(partitions?.map(p => [p.partition_id, p.id]) || []);
      
      const balanceRecords = partitionBalances.map((balance: any) => {
        const partitionDbId = partitionMap.get(balance.partitionId || balance.partition_id);
        if (!partitionDbId) {
          console.warn(`[TokenService] Partition ID ${balance.partitionId || balance.partition_id} not found, skipping balance record`);
          return null;
        }
        
        return {
          partition_id: partitionDbId,
          holder_address: balance.holderAddress || balance.address || balance.holder || '0x0000000000000000000000000000000000000000',
          balance: balance.balance || balance.amount || '0',
          metadata: balance.metadata || {}
        };
      }).filter(Boolean); // Remove null entries
      
      if (balanceRecords.length === 0) {
        console.warn('[TokenService] No valid partition balance records to insert');
        results.arrayData.partitionBalances = { 
          status: 'warning', 
          message: 'No valid partition references found for balances'
        };
        return;
      }
      
      console.log('[TokenService] Inserting token_erc1400_partition_balances records:', balanceRecords);
      
      const { data: balancesData, error: balancesError } = await supabase
        .from('token_erc1400_partition_balances')
        .insert(balanceRecords)
        .select();
      
      if (balancesError) {
        console.error('[TokenService] Failed to insert token_erc1400_partition_balances records:', balancesError);
        results.arrayData.partitionBalances = { 
          status: 'failed', 
          error: balancesError.message,
          attempted: balanceRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1400_partition_balances records:', balancesData);
        results.arrayData.partitionBalances = { 
          status: 'success', 
          count: balancesData.length,
          data: balancesData 
        };
      }
    } catch (balanceError: any) {
      console.error('[TokenService] Error processing partition balances:', balanceError);
      results.arrayData.partitionBalances = { 
        status: 'failed', 
        error: balanceError.message 
      };
    }
  }
}

// ERC-1400 Partition Operators Handler
async function handleERC1400PartitionOperators(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const partitionOperators = blocks.partitionOperators || blocks.standardArrays?.partitionOperators;
  
  if (partitionOperators && Array.isArray(partitionOperators) && partitionOperators.length > 0) {
    results.arrayData.partitionOperators = { status: 'pending', count: partitionOperators.length };
    
    try {
      // First get the partition IDs from the database to use as foreign keys
      const { data: partitions, error: partitionsError } = await supabase
        .from('token_erc1400_partitions')
        .select('id, partition_id')
        .eq('token_id', tokenId);
      
      if (partitionsError) {
        throw new Error(`Failed to get partitions for operator mapping: ${partitionsError.message}`);
      }
      
      const partitionMap = new Map(partitions?.map(p => [p.partition_id, p.id]) || []);
      
      const operatorRecords = partitionOperators.map((operator: any) => {
        const partitionDbId = partitionMap.get(operator.partitionId || operator.partition_id);
        if (!partitionDbId) {
          console.warn(`[TokenService] Partition ID ${operator.partitionId || operator.partition_id} not found, skipping operator record`);
          return null;
        }
        
        return {
          partition_id: partitionDbId,
          holder_address: operator.holderAddress || operator.holder || '0x0000000000000000000000000000000000000000',
          operator_address: operator.operatorAddress || operator.operator || '0x0000000000000000000000000000000000000000',
          authorized: operator.authorized !== false,
          metadata: operator.metadata || {}
        };
      }).filter(Boolean); // Remove null entries
      
      if (operatorRecords.length === 0) {
        console.warn('[TokenService] No valid partition operator records to insert');
        results.arrayData.partitionOperators = { 
          status: 'warning', 
          message: 'No valid partition references found for operators'
        };
        return;
      }
      
      console.log('[TokenService] Inserting token_erc1400_partition_operators records:', operatorRecords);
      
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('token_erc1400_partition_operators')
        .insert(operatorRecords)
        .select();
      
      if (operatorsError) {
        console.error('[TokenService] Failed to insert token_erc1400_partition_operators records:', operatorsError);
        results.arrayData.partitionOperators = { 
          status: 'failed', 
          error: operatorsError.message,
          attempted: operatorRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1400_partition_operators records:', operatorsData);
        results.arrayData.partitionOperators = { 
          status: 'success', 
          count: operatorsData.length,
          data: operatorsData 
        };
      }
    } catch (operatorError: any) {
      console.error('[TokenService] Error processing partition operators:', operatorError);
      results.arrayData.partitionOperators = { 
        status: 'failed', 
        error: operatorError.message 
      };
    }
  }
}

// ERC-1400 Partition Transfers Handler
async function handleERC1400PartitionTransfers(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const partitionTransfers = blocks.partitionTransfers || blocks.standardArrays?.partitionTransfers;
  
  if (partitionTransfers && Array.isArray(partitionTransfers) && partitionTransfers.length > 0) {
    results.arrayData.partitionTransfers = { status: 'pending', count: partitionTransfers.length };
    
    try {
      // First get the partition IDs from the database to use as foreign keys
      const { data: partitions, error: partitionsError } = await supabase
        .from('token_erc1400_partitions')
        .select('id, partition_id')
        .eq('token_id', tokenId);
      
      if (partitionsError) {
        throw new Error(`Failed to get partitions for transfer mapping: ${partitionsError.message}`);
      }
      
      const partitionMap = new Map(partitions?.map(p => [p.partition_id, p.id]) || []);
      
      const transferRecords = partitionTransfers.map((transfer: any) => {
        const partitionDbId = partitionMap.get(transfer.partitionId || transfer.partition_id);
        if (!partitionDbId) {
          console.warn(`[TokenService] Partition ID ${transfer.partitionId || transfer.partition_id} not found, skipping transfer record`);
          return null;
        }
        
        return {
          partition_id: partitionDbId,
          from_address: transfer.fromAddress || transfer.from || '0x0000000000000000000000000000000000000000',
          to_address: transfer.toAddress || transfer.to || '0x0000000000000000000000000000000000000000',
          amount: transfer.amount || transfer.value || '0',
          operator_address: transfer.operatorAddress || transfer.operator || null,
          transaction_hash: transfer.transactionHash || transfer.txHash || null,
          metadata: transfer.metadata || {}
        };
      }).filter(Boolean); // Remove null entries
      
      if (transferRecords.length === 0) {
        console.warn('[TokenService] No valid partition transfer records to insert');
        results.arrayData.partitionTransfers = { 
          status: 'warning', 
          message: 'No valid partition references found for transfers'
        };
        return;
      }
      
      console.log('[TokenService] Inserting token_erc1400_partition_transfers records:', transferRecords);
      
      const { data: transfersData, error: transfersError } = await supabase
        .from('token_erc1400_partition_transfers')
        .insert(transferRecords)
        .select();
      
      if (transfersError) {
        console.error('[TokenService] Failed to insert token_erc1400_partition_transfers records:', transfersError);
        results.arrayData.partitionTransfers = { 
          status: 'failed', 
          error: transfersError.message,
          attempted: transferRecords.length
        };
      } else {
        console.log('[TokenService] Inserted token_erc1400_partition_transfers records:', transfersData);
        results.arrayData.partitionTransfers = { 
          status: 'success', 
          count: transfersData.length,
          data: transfersData 
        };
      }
    } catch (transferError: any) {
      console.error('[TokenService] Error processing partition transfers:', transferError);
      results.arrayData.partitionTransfers = { 
        status: 'failed', 
        error: transferError.message 
      };
    }
  }
}

// ERC-4626 Vault Strategies Handler
async function handleERC4626VaultStrategies(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const vaultStrategies = blocks.vaultStrategies || blocks.strategies || [];
  
  if (vaultStrategies.length > 0) {
    results.arrayData.vaultStrategies = { status: 'pending', count: vaultStrategies.length };
    
    try {
      // Filter out invalid strategies and provide defaults for required fields
      const validStrategies = vaultStrategies.filter((strategy: any, index: number) => {
        const hasValidName = strategy.strategyName || strategy.name || strategy.strategy;
        const hasValidType = strategy.strategyType || strategy.type || strategy.category;
        
        if (!hasValidName) {
          console.warn('[TokenService] ⚠️ Skipping vault strategy with missing name:', strategy);
          return false;
        }
        
        return true;
      });

      if (validStrategies.length === 0) {
        console.log('[TokenService] ❌ No valid vault strategies to insert after validation');
        results.arrayData.vaultStrategies = { status: 'empty', count: 0, message: 'No valid strategies found' };
        return;
      }

      // Helper function to convert risk level strings to integer scores
      const convertRiskLevelToScore = (riskLevel: any): number => {
        if (typeof riskLevel === 'number') {
          return riskLevel;
        }
        if (typeof riskLevel === 'string') {
          switch (riskLevel.toLowerCase()) {
            case 'low': return 2;
            case 'medium': return 5;
            case 'high': return 8;
            case 'very_low': return 1;
            case 'very_high': return 10;
            default: return 5; // Default to medium risk
          }
        }
        return 5; // Default fallback
      };

      const strategyRecords = validStrategies.map((strategy: any, index: number) => ({
        token_id: tokenId,
        strategy_name: strategy.strategyName || strategy.name || strategy.strategy || `Strategy-${index + 1}`,
        strategy_type: strategy.strategyType || strategy.type || strategy.category || 'yield_farming',
        protocol_address: strategy.protocolAddress,
        protocol_name: strategy.protocolName || strategy.protocol,
        allocation_percentage: strategy.allocationPercent || strategy.allocationPercentage || strategy.allocation || '0',
        min_allocation_percentage: strategy.minAllocationPercentage || strategy.minAllocation,
        max_allocation_percentage: strategy.maxAllocationPercentage || strategy.maxAllocation,
        risk_score: convertRiskLevelToScore(strategy.riskScore || strategy.riskLevel),
        expected_apy: strategy.expectedApy || strategy.expectedAPY || strategy.targetReturn,
        actual_apy: strategy.actualApy || strategy.actualAPY,
        is_active: strategy.isActive !== false,
        last_rebalance: strategy.lastRebalance
      }));
      
      console.log('[TokenService] 🏛️ Inserting ERC-4626 vault strategies records:', strategyRecords);
      
      const { data: strategiesData, error: strategiesError } = await supabase
        .from('token_erc4626_vault_strategies')
        .insert(strategyRecords);
      
      if (strategiesError) {
        console.error('[TokenService] ❌ Failed to insert ERC-4626 vault strategies:', strategiesError);
        results.arrayData.vaultStrategies = { 
          status: 'failed', 
          error: strategiesError.message,
          attempted: strategyRecords.length
        };
      } else {
        console.log('[TokenService] ✅ Successfully inserted ERC-4626 vault strategies:', 
  (strategiesData as any[] | null)?.length || strategyRecords.length);
        results.arrayData.vaultStrategies = { 
          status: 'success', 
          count: strategyRecords.length 
        };
      }
    } catch (strategyError: any) {
      console.error('[TokenService] ❌ Error processing ERC-4626 vault strategies:', strategyError);
      results.arrayData.vaultStrategies = { 
        status: 'failed', 
        error: strategyError.message 
      };
    }
  } else {
    console.log('[TokenService] ❌ No ERC-4626 vault strategies found to insert');
    results.arrayData.vaultStrategies = { status: 'empty', count: 0 };
  }
}

// ERC-4626 Fee Tiers Handler
async function handleERC4626FeeTiers(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const feeTiers = blocks.feeTiers || blocks.feeStructure?.tiers || [];
  
  if (feeTiers.length > 0) {
    results.arrayData.feeTiers = { status: 'pending', count: feeTiers.length };
    
    try {
      const tierRecords = feeTiers.map((tier: any) => ({
        token_id: tokenId,
        tier_name: tier.tierName || tier.name || 'Default Tier',
        min_balance: tier.minBalance || tier.minimumBalance || '0',
        max_balance: tier.maxBalance || tier.maximumBalance,
        management_fee_rate: tier.managementFeeRate || tier.managementFee || '2.0',
        performance_fee_rate: tier.performanceFeeRate || tier.performanceFee || '20.0',
        deposit_fee_rate: tier.depositFeeRate || tier.depositFee || '0',
        withdrawal_fee_rate: tier.withdrawalFeeRate || tier.withdrawalFee || '0',
        tier_benefits: tier.tierBenefits || tier.benefits,
        is_active: tier.isActive !== false
      }));
      
      console.log('[TokenService] 🏛️ Inserting ERC-4626 fee tiers records:', tierRecords);
      
      const { data: tiersData, error: tiersError } = await supabase
        .from('token_erc4626_fee_tiers')
        .insert(tierRecords);
      
      if (tiersError) {
        console.error('[TokenService] ❌ Failed to insert ERC-4626 fee tiers:', tiersError);
        results.arrayData.feeTiers = { 
          status: 'failed', 
          error: tiersError.message,
          attempted: tierRecords.length
        };
      } else {
        console.log('[TokenService] ✅ Successfully inserted ERC-4626 fee tiers:', 
          (tiersData as any[] | null)?.length || tierRecords.length);
        results.arrayData.feeTiers = { 
          status: 'success', 
          count: tierRecords.length 
        };
      }
    } catch (tierError: any) {
      console.error('[TokenService] ❌ Error processing ERC-4626 fee tiers:', tierError);
      results.arrayData.feeTiers = { 
        status: 'failed', 
        error: tierError.message 
      };
    }
  } else {
    console.log('[TokenService] ❌ No ERC-4626 fee tiers found to insert');
    results.arrayData.feeTiers = { status: 'empty', count: 0 };
  }
}

async function handleERC4626PerformanceMetrics(tokenId: string, blocks: Record<string, any>, results: Record<string, any>) {
  const performanceMetrics = blocks.performanceMetrics || blocks.metrics || [];
  
  if (performanceMetrics.length > 0) {
    results.arrayData.performanceMetrics = { status: 'pending', count: performanceMetrics.length };
    
    try {
      // Check for existing performance metrics for this token to avoid duplicates
      const { data: existingMetrics, error: checkError } = await supabase
        .from('token_erc4626_performance_metrics')
        .select('metric_date')
        .eq('token_id', tokenId);

      if (checkError) {
        console.warn('[TokenService] ⚠️ Could not check existing performance metrics:', checkError);
      }

      const existingDates = new Set((existingMetrics || []).map((m: any) => m.metric_date));
      const uniqueDates = new Set([...existingDates]);
      const baseDate = new Date();
      
      const metricsRecords = performanceMetrics.map((metric: any, index: number) => {
        // Generate unique date for each metric to avoid constraint violations
        let metricDate = metric.metricDate || metric.date;
        
        if (!metricDate) {
          // If no date provided, use base date with offset for uniqueness
          const offsetDate = new Date(baseDate);
          offsetDate.setDate(baseDate.getDate() - index); // Use different dates going backwards
          metricDate = offsetDate.toISOString().split('T')[0];
        } else {
          // Parse the provided date
          const parsedDate = new Date(metricDate);
          metricDate = parsedDate.toISOString().split('T')[0];
        }
        
        // Ensure date uniqueness by adding offset if duplicate found
        let finalDate = metricDate;
        let dayOffset = 0;
        while (uniqueDates.has(finalDate)) {
          dayOffset++;
          const adjustedDate = new Date(metricDate);
          adjustedDate.setDate(adjustedDate.getDate() - dayOffset);
          finalDate = adjustedDate.toISOString().split('T')[0];
        }
        uniqueDates.add(finalDate);
        
        return {
          token_id: tokenId,
          metric_date: finalDate,
          total_assets: metric.totalAssets || metric.currentValue || '0',
          share_price: metric.sharePrice || '1.0',
          apy: metric.apy || metric.annualYield,
          daily_yield: metric.dailyYield,
          benchmark_performance: metric.benchmarkPerformance,
          total_fees_collected: metric.totalFeesCollected,
          new_deposits: metric.newDeposits,
          withdrawals: metric.withdrawals,
          net_flow: metric.netFlow,
          sharpe_ratio: metric.sharpeRatio,
          volatility: metric.volatility,
          max_drawdown: metric.maxDrawdown
        };
      });
      
      console.log('[TokenService] 🏛️ Inserting ERC-4626 performance metrics records:', metricsRecords);
      
      const { data: metricsData, error: metricsError } = await supabase
        .from('token_erc4626_performance_metrics')
        .insert(metricsRecords);
      
      if (metricsError) {
        console.error('[TokenService] ❌ Failed to insert ERC-4626 performance metrics:', metricsError);
        results.arrayData.performanceMetrics = { 
          status: 'failed', 
          error: metricsError.message,
          attempted: metricsRecords.length
        };
      } else {
        console.log('[TokenService] ✅ Successfully inserted ERC-4626 performance metrics:', 
          (metricsData as any[] | null)?.length || metricsRecords.length);
        results.arrayData.performanceMetrics = { 
          status: 'success', 
          count: metricsRecords.length 
        };
      }
    } catch (metricError: any) {
      console.error('[TokenService] ❌ Error processing ERC-4626 performance metrics:', metricError);
      results.arrayData.performanceMetrics = { 
        status: 'failed', 
        error: metricError.message 
      };
    }
  } else {
    console.log('[TokenService] ❌ No ERC-4626 performance metrics found to insert');
    results.arrayData.performanceMetrics = { status: 'empty', count: 0 };
  }
}
