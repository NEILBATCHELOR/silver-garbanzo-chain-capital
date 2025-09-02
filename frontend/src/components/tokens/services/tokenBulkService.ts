/**
 * Token Bulk Service
 * 
 * Optimized service for bulk fetching token data with minimal database queries
 * Replaces individual getEnhancedTokenData calls for better performance
 */
import { supabase } from '@/infrastructure/database/client';
import { 
  TokenStandard,
  TokenERC20Properties,
  TokenERC721Properties,
  TokenERC1155Properties,
  TokenERC1400Properties,
  TokenERC3525Properties,
  TokenERC4626Properties
} from '@/types/core/centralModels';

export interface BulkTokenData {
  id: string;
  name: string;
  symbol: string;
  decimals?: number;
  standard: string;
  status: string;
  blocks?: Record<string, any>;
  metadata?: Record<string, any>;
  project_id: string;
  reviewers?: string[];
  approvals?: string[];
  contract_preview?: string;
  total_supply?: string;
  config_mode?: string;
  address?: string;
  blockchain?: string;
  deployment_status?: string;
  deployment_timestamp?: string;
  deployment_transaction?: string;
  deployment_error?: string;
  deployed_by?: string;
  deployment_environment?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  
  // Standard-specific properties
  erc20Properties?: TokenERC20Properties;
  erc721Properties?: TokenERC721Properties;
  erc1155Properties?: TokenERC1155Properties;
  erc1400Properties?: TokenERC1400Properties;
  erc3525Properties?: TokenERC3525Properties;
  erc4626Properties?: TokenERC4626Properties;
  
  // Array properties for complex standards
  erc721Attributes?: any[];
  erc1155Types?: any[];
  erc1155Balances?: any[];
  erc1155UriMappings?: any[];
  erc1400Controllers?: any[];
  erc1400Partitions?: any[];
  erc1400Documents?: any[];
  erc3525Slots?: any[];
  erc3525Allocations?: any[];
  erc4626StrategyParams?: any[];
  erc4626AssetAllocations?: any[];
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
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
      newObj[camelKey] = toCamelCase(obj[key]);
    }
  }

  return newObj as T;
}

/**
 * Bulk fetch all tokens for a project with their standard-specific properties
 * Makes only a few database queries instead of N queries per token
 */
export async function getBulkTokensForProject(projectId: string): Promise<BulkTokenData[]> {
  console.log(`[TokenBulkService] Starting bulk fetch for project: ${projectId}`);
  
  try {
    // Step 1: Get all base token data for the project
    const { data: tokens, error: tokensError } = await supabase
      .from('tokens')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (tokensError) {
      throw new Error(`Error fetching tokens: ${tokensError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log('[TokenBulkService] No tokens found for project');
      return [];
    }

    console.log(`[TokenBulkService] Found ${tokens.length} tokens`);

    // Step 2: Group tokens by standard for efficient querying
    const tokensByStandard = tokens.reduce((acc, token) => {
      const standard = token.standard;
      if (!acc[standard]) {
        acc[standard] = [];
      }
      acc[standard].push(token.id);
      return acc;
    }, {} as Record<string, string[]>);

    // Step 3: Fetch all standard-specific properties in parallel
    const [
      erc20PropertiesMap,
      erc721PropertiesMap,
      erc1155PropertiesMap,
      erc1400PropertiesMap,
      erc3525PropertiesMap,
      erc4626PropertiesMap,
      erc721AttributesMap,
      erc1155TypesMap,
      erc1400ControllersMap,
      erc3525SlotsMap,
      erc4626StrategyParamsMap
    ] = await Promise.all([
      fetchERC20PropertiesBulk(tokensByStandard['ERC-20'] || []),
      fetchERC721PropertiesBulk(tokensByStandard['ERC-721'] || []),
      fetchERC1155PropertiesBulk(tokensByStandard['ERC-1155'] || []),
      fetchERC1400PropertiesBulk(tokensByStandard['ERC-1400'] || []),
      fetchERC3525PropertiesBulk(tokensByStandard['ERC-3525'] || []),
      fetchERC4626PropertiesBulk(tokensByStandard['ERC-4626'] || []),
      fetchERC721AttributesBulk(tokensByStandard['ERC-721'] || []),
      fetchERC1155TypesBulk(tokensByStandard['ERC-1155'] || []),
      fetchERC1400ControllersBulk(tokensByStandard['ERC-1400'] || []),
      fetchERC3525SlotsBulk(tokensByStandard['ERC-3525'] || []),
      fetchERC4626StrategyParamsBulk(tokensByStandard['ERC-4626'] || [])
    ]);

    // Step 4: Combine base token data with standard-specific properties
    const bulkTokenData: BulkTokenData[] = tokens.map(token => {
      const tokenData: BulkTokenData = {
        ...token,
        blocks: token.blocks ? (token.blocks as Record<string, any>) : {},
        metadata: token.metadata ? (token.metadata as Record<string, any>) : {},
      };

      // Add standard-specific properties based on token standard
      switch (token.standard) {
        case 'ERC-20':
          tokenData.erc20Properties = erc20PropertiesMap.get(token.id);
          break;
        case 'ERC-721':
          tokenData.erc721Properties = erc721PropertiesMap.get(token.id);
          tokenData.erc721Attributes = erc721AttributesMap.get(token.id) || [];
          break;
        case 'ERC-1155':
          tokenData.erc1155Properties = erc1155PropertiesMap.get(token.id);
          tokenData.erc1155Types = erc1155TypesMap.get(token.id) || [];
          break;
        case 'ERC-1400':
          tokenData.erc1400Properties = erc1400PropertiesMap.get(token.id);
          tokenData.erc1400Controllers = erc1400ControllersMap.get(token.id) || [];
          break;
        case 'ERC-3525':
          tokenData.erc3525Properties = erc3525PropertiesMap.get(token.id);
          tokenData.erc3525Slots = erc3525SlotsMap.get(token.id) || [];
          break;
        case 'ERC-4626':
          tokenData.erc4626Properties = erc4626PropertiesMap.get(token.id);
          tokenData.erc4626StrategyParams = erc4626StrategyParamsMap.get(token.id) || [];
          break;
      }

      return tokenData;
    });

    console.log(`[TokenBulkService] Successfully fetched bulk data for ${bulkTokenData.length} tokens`);
    return bulkTokenData;

  } catch (error) {
    console.error('[TokenBulkService] Error in bulk token fetch:', error);
    throw error;
  }
}

// Bulk fetch functions for each standard
async function fetchERC20PropertiesBulk(tokenIds: string[]): Promise<Map<string, TokenERC20Properties>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc20_properties')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC20 properties:', error);
    return new Map();
  }

  const map = new Map<string, TokenERC20Properties>();
  data?.forEach(item => {
    map.set(item.token_id, toCamelCase<TokenERC20Properties>(item));
  });
  
  return map;
}

async function fetchERC721PropertiesBulk(tokenIds: string[]): Promise<Map<string, TokenERC721Properties>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc721_properties')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC721 properties:', error);
    return new Map();
  }

  const map = new Map<string, TokenERC721Properties>();
  data?.forEach(item => {
    map.set(item.token_id, toCamelCase<TokenERC721Properties>(item));
  });
  
  return map;
}

async function fetchERC1155PropertiesBulk(tokenIds: string[]): Promise<Map<string, TokenERC1155Properties>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc1155_properties')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC1155 properties:', error);
    return new Map();
  }

  const map = new Map<string, TokenERC1155Properties>();
  data?.forEach(item => {
    map.set(item.token_id, toCamelCase<TokenERC1155Properties>(item));
  });
  
  return map;
}

async function fetchERC1400PropertiesBulk(tokenIds: string[]): Promise<Map<string, TokenERC1400Properties>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc1400_properties')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC1400 properties:', error);
    return new Map();
  }

  const map = new Map<string, TokenERC1400Properties>();
  data?.forEach(item => {
    map.set(item.token_id, toCamelCase<TokenERC1400Properties>(item));
  });
  
  return map;
}

async function fetchERC3525PropertiesBulk(tokenIds: string[]): Promise<Map<string, TokenERC3525Properties>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc3525_properties')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC3525 properties:', error);
    return new Map();
  }

  const map = new Map<string, TokenERC3525Properties>();
  data?.forEach(item => {
    map.set(item.token_id, toCamelCase<TokenERC3525Properties>(item));
  });
  
  return map;
}

async function fetchERC4626PropertiesBulk(tokenIds: string[]): Promise<Map<string, TokenERC4626Properties>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc4626_properties')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC4626 properties:', error);
    return new Map();
  }

  const map = new Map<string, TokenERC4626Properties>();
  data?.forEach(item => {
    map.set(item.token_id, toCamelCase<TokenERC4626Properties>(item));
  });
  
  return map;
}

// Bulk fetch functions for related data tables
async function fetchERC721AttributesBulk(tokenIds: string[]): Promise<Map<string, any[]>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc721_attributes')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC721 attributes:', error);
    return new Map();
  }

  const map = new Map<string, any[]>();
  data?.forEach(item => {
    const tokenId = item.token_id;
    if (!map.has(tokenId)) {
      map.set(tokenId, []);
    }
    map.get(tokenId)!.push(toCamelCase(item));
  });
  
  return map;
}

async function fetchERC1155TypesBulk(tokenIds: string[]): Promise<Map<string, any[]>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc1155_types')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC1155 types:', error);
    return new Map();
  }

  const map = new Map<string, any[]>();
  data?.forEach(item => {
    const tokenId = item.token_id;
    if (!map.has(tokenId)) {
      map.set(tokenId, []);
    }
    map.get(tokenId)!.push(toCamelCase(item));
  });
  
  return map;
}

async function fetchERC1400ControllersBulk(tokenIds: string[]): Promise<Map<string, any[]>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc1400_controllers')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC1400 controllers:', error);
    return new Map();
  }

  const map = new Map<string, any[]>();
  data?.forEach(item => {
    const tokenId = item.token_id;
    if (!map.has(tokenId)) {
      map.set(tokenId, []);
    }
    map.get(tokenId)!.push(toCamelCase(item));
  });
  
  return map;
}

async function fetchERC3525SlotsBulk(tokenIds: string[]): Promise<Map<string, any[]>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc3525_slots')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC3525 slots:', error);
    return new Map();
  }

  const map = new Map<string, any[]>();
  data?.forEach(item => {
    const tokenId = item.token_id;
    if (!map.has(tokenId)) {
      map.set(tokenId, []);
    }
    map.get(tokenId)!.push(toCamelCase(item));
  });
  
  return map;
}

async function fetchERC4626StrategyParamsBulk(tokenIds: string[]): Promise<Map<string, any[]>> {
  if (tokenIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('token_erc4626_strategy_params')
    .select('*')
    .in('token_id', tokenIds);

  if (error) {
    console.error('[TokenBulkService] Error fetching ERC4626 strategy params:', error);
    return new Map();
  }

  const map = new Map<string, any[]>();
  data?.forEach(item => {
    const tokenId = item.token_id;
    if (!map.has(tokenId)) {
      map.set(tokenId, []);
    }
    map.get(tokenId)!.push(toCamelCase(item));
  });
  
  return map;
}

/**
 * Get bulk token counts by status for dashboard metrics
 */
export async function getBulkTokenStatusCounts(projectId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('tokens')
    .select('status')
    .eq('project_id', projectId);

  if (error) {
    console.error('[TokenBulkService] Error fetching token status counts:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  data?.forEach(token => {
    const status = token.status || 'DRAFT';
    counts[status] = (counts[status] || 0) + 1;
  });

  return counts;
}
