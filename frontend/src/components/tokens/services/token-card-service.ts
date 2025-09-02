/**
 * Token Card Service
 * 
 * Optimized service for loading token data specifically for card display
 * Uses minimal queries and progressive loading for better performance
 */
import { supabase } from '@/infrastructure/database/client';

export interface TokenCardData {
  id: string;
  name: string;
  symbol: string;
  standard: string;
  status: string;
  project_id: string;
  blockchain?: string;
  address?: string;
  decimals?: number;
  total_supply?: string;
  config_mode?: string;
  created_at: string;
  updated_at: string;
  
  // JSONB fields from main tokens table
  blocks?: Record<string, any>;
  metadata?: Record<string, any>;
  
  // Basic properties for card display only
  tokenType?: string;
  cap?: string;
  basicFeatures?: string[];
  description?: string;
  
  // Metadata for tokenTier detection
  [key: string]: any;
}

export interface TokenDetailData extends TokenCardData {
  // JSONB fields from main tokens table (inherited from TokenCardData but explicitly defined)
  blocks?: Record<string, any>;
  metadata?: Record<string, any>;
  
  // Extended properties loaded on demand
  erc20Properties?: any;
  erc721Properties?: any;
  erc1155Properties?: any;
  erc1400Properties?: any;
  erc3525Properties?: any;
  erc4626Properties?: any;
  
  // Array properties for complex standards
  erc721Attributes?: any[];
  erc721MintPhases?: any[];
  erc721TraitDefinitions?: any[];
  
  erc1155Types?: any[];
  erc1155Balances?: any[];
  erc1155CraftingRecipes?: any[];
  erc1155DiscountTiers?: any[];
  erc1155UriMappings?: any[];
  erc1155TypeConfigs?: any[];
  
  erc1400Controllers?: any[];
  erc1400Partitions?: any[];
  erc1400Documents?: any[];
  erc1400CorporateActions?: any[];
  erc1400CustodyProviders?: any[];
  erc1400RegulatoryFilings?: any[];
  erc1400PartitionBalances?: any[];
  erc1400PartitionOperators?: any[];
  erc1400PartitionTransfers?: any[];
  
  erc3525Slots?: any[];
  erc3525Allocations?: any[];
  erc3525PaymentSchedules?: any[];
  erc3525ValueAdjustments?: any[];
  erc3525SlotConfigs?: any[];
  
  erc4626StrategyParams?: any[];
  erc4626AssetAllocations?: any[];
  erc4626VaultStrategies?: any[];
  erc4626FeeTiers?: any[];
  erc4626PerformanceMetrics?: any[];
}

/**
 * Fast fetch for token cards - minimal data only
 * Uses a single optimized query with basic properties
 */
export async function getTokenCardsForProject(projectId: string): Promise<TokenCardData[]> {
  console.log(`[TokenCardService] Fetching card data for project: ${projectId}`);
  
  // Validate projectId to prevent "undefined" string from being passed to database
  if (!projectId || projectId === 'undefined' || projectId.trim() === '') {
    console.warn(`[TokenCardService] Invalid projectId provided: ${projectId}`);
    return [];
  }
  
  // Additional UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    console.warn(`[TokenCardService] ProjectId is not a valid UUID format: ${projectId}`);
    return [];
  }
  
  try {
    // Single query for base token data with essential card fields
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select(`
        id,
        name,
        symbol,
        standard,
        status,
        project_id,
        blockchain,
        address,
        decimals,
        total_supply,
        config_mode,
        created_at,
        updated_at,
        metadata,
        blocks
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching token cards: ${error.message}`);
    }

    if (!tokens || tokens.length === 0) {
      return [];
    }

    console.log(`[TokenCardService] Fetched ${tokens.length} token cards`);

    // Enhanced supply data fetching for tokens with empty total_supply
    const tokensWithEmptySupply = tokens.filter(token => 
      !token.total_supply || token.total_supply.trim() === ''
    );

    // Fetch supply data from properties tables for tokens with empty supply
    const supplyPromises = tokensWithEmptySupply.map(async (token) => {
      try {
        switch (token.standard) {
          case 'ERC-20':
            const { data: erc20Props } = await supabase
              .from('token_erc20_properties')
              .select('initial_supply, cap')
              .eq('token_id', token.id)
              .single();
            
            if (erc20Props?.initial_supply) {
              return { id: token.id, supply: erc20Props.initial_supply };
            }
            break;
            
          case 'ERC-1155':
            // For ERC-1155, we might want to show "Multi-Token" or get from types
            return { id: token.id, supply: 'Multi-Token' };
            
          case 'ERC-721':
            // For NFTs, we might want to show max supply or collection info
            const { data: erc721Props } = await supabase
              .from('token_erc721_properties')
              .select('max_supply')
              .eq('token_id', token.id)
              .single();
            
            if (erc721Props?.max_supply) {
              return { id: token.id, supply: erc721Props.max_supply };
            }
            return { id: token.id, supply: 'NFT Collection' };
            
          default:
            // For other standards, try to get from their properties
            return { id: token.id, supply: '' };
        }
      } catch (error) {
        console.warn(`Failed to fetch supply for token ${token.id}:`, error);
        return { id: token.id, supply: '' };
      }
      return { id: token.id, supply: '' };
    });

    const supplyResults = await Promise.all(supplyPromises);
    const supplyMap = supplyResults.reduce((acc, result) => {
      acc[result.id] = result.supply;
      return acc;
    }, {} as Record<string, string>);

    // Transform data for card display with enhanced supply information
    const cardData: TokenCardData[] = tokens.map(token => ({
      ...token,
      metadata: token.metadata as any || {},
      blocks: token.blocks as any || {},
      // Use fetched supply if original is empty
      total_supply: token.total_supply || supplyMap[token.id] || '',
    }));

    return cardData;

  } catch (error) {
    console.error('[TokenCardService] Error fetching token cards:', error);
    throw error;
  }
}

/**
 * Load detailed token data on demand for expanded cards
 * Only fetches when user expands a card
 */
export async function getTokenDetailData(tokenId: string, standard: string): Promise<TokenDetailData | null> {
  console.log(`[TokenCardService] Loading detail data for token: ${tokenId}, standard: ${standard}`);
  
  // Validate tokenId to prevent "undefined" string from being passed to database
  if (!tokenId || tokenId === 'undefined' || tokenId.trim() === '') {
    console.warn(`[TokenCardService] Invalid tokenId provided: ${tokenId}`);
    return null;
  }
  
  // Additional UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tokenId)) {
    console.warn(`[TokenCardService] TokenId is not a valid UUID format: ${tokenId}`);
    return null;
  }
  
  try {
    // Get base token data first
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (tokenError || !token) {
      throw new Error(`Error fetching token: ${tokenError?.message || 'Token not found'}`);
    }

    // Build the detail data object
    const detailData: TokenDetailData = {
      ...token,
      metadata: token.metadata as any || {},
      blocks: token.blocks as any || {},
    };

    // Fetch standard-specific properties based on token standard
    switch (standard) {
      case 'ERC-20':
        await loadERC20Details(tokenId, detailData);
        break;
      case 'ERC-721':
        await loadERC721Details(tokenId, detailData);
        break;
      case 'ERC-1155':
        await loadERC1155Details(tokenId, detailData);
        break;
      case 'ERC-1400':
        await loadERC1400Details(tokenId, detailData);
        break;
      case 'ERC-3525':
        await loadERC3525Details(tokenId, detailData);
        break;
      case 'ERC-4626':
        await loadERC4626Details(tokenId, detailData);
        break;
    }

    console.log(`[TokenCardService] Loaded detail data for ${standard} token`);
    return detailData;

  } catch (error) {
    console.error('[TokenCardService] Error loading token details:', error);
    return null;
  }
}

// Helper functions to load standard-specific details
async function loadERC20Details(tokenId: string, detailData: TokenDetailData): Promise<void> {
  const { data, error } = await supabase
    .from('token_erc20_properties')
    .select('*')
    .eq('token_id', tokenId)
    .single();

  if (!error && data) {
    detailData.erc20Properties = data;
  }
}

async function loadERC721Details(tokenId: string, detailData: TokenDetailData): Promise<void> {
  const [propertiesResult, attributesResult, mintPhasesResult, traitDefinitionsResult] = await Promise.all([
    supabase
      .from('token_erc721_properties')
      .select('*')
      .eq('token_id', tokenId)
      .single(),
    supabase
      .from('token_erc721_attributes')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc721_mint_phases')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc721_trait_definitions')
      .select('*')
      .eq('token_id', tokenId)
  ]);

  if (!propertiesResult.error && propertiesResult.data) {
    detailData.erc721Properties = propertiesResult.data;
  }

  if (!attributesResult.error && attributesResult.data) {
    detailData.erc721Attributes = attributesResult.data;
  }

  if (!mintPhasesResult.error && mintPhasesResult.data) {
    detailData.erc721MintPhases = mintPhasesResult.data;
  }

  if (!traitDefinitionsResult.error && traitDefinitionsResult.data) {
    detailData.erc721TraitDefinitions = traitDefinitionsResult.data;
  }
}

async function loadERC1155Details(tokenId: string, detailData: TokenDetailData): Promise<void> {
  const [propertiesResult, typesResult, balancesResult, craftingRecipesResult, discountTiersResult, uriMappingsResult, typeConfigsResult] = await Promise.all([
    supabase
      .from('token_erc1155_properties')
      .select('*')
      .eq('token_id', tokenId)
      .single(),
    supabase
      .from('token_erc1155_types')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc1155_balances')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc1155_crafting_recipes')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc1155_discount_tiers')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc1155_uri_mappings')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc1155_type_configs')
      .select('*')
      .eq('token_id', tokenId)
  ]);

  if (!propertiesResult.error && propertiesResult.data) {
    detailData.erc1155Properties = propertiesResult.data;
  }

  if (!typesResult.error && typesResult.data) {
    detailData.erc1155Types = typesResult.data;
  }

  if (!balancesResult.error && balancesResult.data) {
    detailData.erc1155Balances = balancesResult.data;
  }

  if (!craftingRecipesResult.error && craftingRecipesResult.data) {
    detailData.erc1155CraftingRecipes = craftingRecipesResult.data;
  }

  if (!discountTiersResult.error && discountTiersResult.data) {
    detailData.erc1155DiscountTiers = discountTiersResult.data;
  }

  if (!uriMappingsResult.error && uriMappingsResult.data) {
    detailData.erc1155UriMappings = uriMappingsResult.data;
  }

  if (!typeConfigsResult.error && typeConfigsResult.data) {
    detailData.erc1155TypeConfigs = typeConfigsResult.data;
  }
}

async function loadERC1400Details(tokenId: string, detailData: TokenDetailData): Promise<void> {
  const [propertiesResult, controllersResult, partitionsResult, documentsResult, corporateActionsResult, custodyProvidersResult, regulatoryFilingsResult, partitionBalancesResult, partitionOperatorsResult, partitionTransfersResult] = await Promise.all([
    supabase
      .from('token_erc1400_properties')
      .select('*')
      .eq('token_id', tokenId)
      .single(),
    supabase
      .from('token_erc1400_controllers')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc1400_partitions')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc1400_documents')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc1400_corporate_actions')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc1400_custody_providers')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc1400_regulatory_filings')
      .select('*')
      .eq('token_id', tokenId),
    (supabase as any)
      .from('token_erc1400_partition_balances')
      .select('*')
      .eq('token_id', tokenId),
    (supabase as any)
      .from('token_erc1400_partition_operators')
      .select('*')
      .eq('token_id', tokenId),
    (supabase as any)
      .from('token_erc1400_partition_transfers')
      .select('*')
      .eq('token_id', tokenId)
  ]);

  if (!propertiesResult.error && propertiesResult.data) {
    detailData.erc1400Properties = propertiesResult.data;
  }

  if (!controllersResult.error && controllersResult.data) {
    detailData.erc1400Controllers = controllersResult.data;
  }

  if (!partitionsResult.error && partitionsResult.data) {
    detailData.erc1400Partitions = partitionsResult.data;
  }

  if (!documentsResult.error && documentsResult.data) {
    detailData.erc1400Documents = documentsResult.data;
  }

  if (!corporateActionsResult.error && corporateActionsResult.data) {
    detailData.erc1400CorporateActions = corporateActionsResult.data;
  }

  if (!custodyProvidersResult.error && custodyProvidersResult.data) {
    detailData.erc1400CustodyProviders = custodyProvidersResult.data;
  }

  if (!regulatoryFilingsResult.error && regulatoryFilingsResult.data) {
    detailData.erc1400RegulatoryFilings = regulatoryFilingsResult.data;
  }

  if (!partitionBalancesResult.error && partitionBalancesResult.data) {
    detailData.erc1400PartitionBalances = partitionBalancesResult.data;
  }

  if (!partitionOperatorsResult.error && partitionOperatorsResult.data) {
    detailData.erc1400PartitionOperators = partitionOperatorsResult.data;
  }

  if (!partitionTransfersResult.error && partitionTransfersResult.data) {
    detailData.erc1400PartitionTransfers = partitionTransfersResult.data;
  }
}

async function loadERC3525Details(tokenId: string, detailData: TokenDetailData): Promise<void> {
  const [propertiesResult, slotsResult, allocationsResult, paymentSchedulesResult, valueAdjustmentsResult, slotConfigsResult] = await Promise.all([
    supabase
      .from('token_erc3525_properties')
      .select('*')
      .eq('token_id', tokenId)
      .single(),
    supabase
      .from('token_erc3525_slots')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc3525_allocations')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc3525_payment_schedules')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc3525_value_adjustments')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc3525_slot_configs')
      .select('*')
      .eq('token_id', tokenId)
  ]);

  if (!propertiesResult.error && propertiesResult.data) {
    detailData.erc3525Properties = propertiesResult.data;
  }

  if (!slotsResult.error && slotsResult.data) {
    detailData.erc3525Slots = slotsResult.data;
  }

  if (!allocationsResult.error && allocationsResult.data) {
    detailData.erc3525Allocations = allocationsResult.data;
  }

  if (!paymentSchedulesResult.error && paymentSchedulesResult.data) {
    detailData.erc3525PaymentSchedules = paymentSchedulesResult.data;
  }

  if (!valueAdjustmentsResult.error && valueAdjustmentsResult.data) {
    detailData.erc3525ValueAdjustments = valueAdjustmentsResult.data;
  }

  if (!slotConfigsResult.error && slotConfigsResult.data) {
    detailData.erc3525SlotConfigs = slotConfigsResult.data;
  }
}

async function loadERC4626Details(tokenId: string, detailData: TokenDetailData): Promise<void> {
  const [propertiesResult, strategyParamsResult, assetAllocationsResult, vaultStrategiesResult, feetiersResult, performanceMetricsResult] = await Promise.all([
    supabase
      .from('token_erc4626_properties')
      .select('*')
      .eq('token_id', tokenId)
      .single(),
    supabase
      .from('token_erc4626_strategy_params')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc4626_asset_allocations')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc4626_vault_strategies')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc4626_fee_tiers')
      .select('*')
      .eq('token_id', tokenId),
    supabase
      .from('token_erc4626_performance_metrics')
      .select('*')
      .eq('token_id', tokenId)
  ]);

  if (!propertiesResult.error && propertiesResult.data) {
    detailData.erc4626Properties = propertiesResult.data;
  }

  if (!strategyParamsResult.error && strategyParamsResult.data) {
    detailData.erc4626StrategyParams = strategyParamsResult.data;
  }

  if (!assetAllocationsResult.error && assetAllocationsResult.data) {
    detailData.erc4626AssetAllocations = assetAllocationsResult.data;
  }

  if (!vaultStrategiesResult.error && vaultStrategiesResult.data) {
    detailData.erc4626VaultStrategies = vaultStrategiesResult.data;
  }

  if (!feetiersResult.error && feetiersResult.data) {
    detailData.erc4626FeeTiers = feetiersResult.data;
  }

  if (!performanceMetricsResult.error && performanceMetricsResult.data) {
    detailData.erc4626PerformanceMetrics = performanceMetricsResult.data;
  }
}

/**
 * Get token status counts for dashboard summary
 */
export async function getTokenStatusCounts(projectId: string): Promise<Record<string, number>> {
  console.log(`[TokenCardService] Fetching status counts for project: ${projectId}`);
  
  // Validate projectId to prevent "undefined" string from being passed to database
  if (!projectId || projectId === 'undefined' || projectId.trim() === '') {
    console.warn(`[TokenCardService] Invalid projectId provided: ${projectId}`);
    return {};
  }
  
  // Additional UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    console.warn(`[TokenCardService] ProjectId is not a valid UUID format: ${projectId}`);
    return {};
  }
  
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('status')
      .eq('project_id', projectId);

    if (error) {
      throw new Error(`Error fetching status counts: ${error.message}`);
    }

    // Count tokens by status
    const counts: Record<string, number> = {};
    data?.forEach(token => {
      const status = token.status;
      counts[status] = (counts[status] || 0) + 1;
    });

    return counts;

  } catch (error) {
    console.error('[TokenCardService] Error fetching status counts:', error);
    return {};
  }
}
