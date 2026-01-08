/**
 * Token Owner Service
 * 
 * Helper service to fetch initial_owner from standard-specific properties tables
 */

import { supabase } from '@/infrastructure/database/client';

/**
 * Fetch the initial_owner address for a token from its properties table
 * 
 * @param tokenId - UUID of the token
 * @param standard - Token standard (e.g., 'ERC-20', 'ERC-721')
 * @returns initial_owner address
 * @throws Error if owner not found or query fails
 */
export async function getTokenOwnerFromDatabase(
  tokenId: string,
  standard: string
): Promise<string> {
  // Map standard to table name
  const tableMap: Record<string, string> = {
    'ERC-20': 'token_erc20_properties',
    'ERC-721': 'token_erc721_properties',
    'ERC-1155': 'token_erc1155_properties',
    'ERC-1400': 'token_erc1400_properties',
    'ERC-3525': 'token_erc3525_properties',
    'ERC-4626': 'token_erc4626_properties',
  };

  const tableName = tableMap[standard];
  
  if (!tableName) {
    throw new Error(`Unsupported token standard: ${standard}`);
  }

  console.log(`📋 Fetching initial_owner from ${tableName} for token ${tokenId}`);

  const { data, error } = await supabase
    .from(tableName)
    .select('initial_owner')
    .eq('token_id', tokenId)
    .single();

  if (error) {
    console.error(`❌ Error fetching initial_owner from ${tableName}:`, error);
    throw new Error(
      `Failed to fetch initial_owner from ${tableName}: ${error.message}`
    );
  }

  if (!data?.initial_owner) {
    throw new Error(
      `initial_owner not found in ${tableName} for token ${tokenId}. ` +
      `Please set initial_owner in the token configuration before deployment.`
    );
  }

  console.log(`✅ Found initial_owner: ${data.initial_owner}`);
  return data.initial_owner;
}

/**
 * Validate that initial_owner is set for a token
 * 
 * @param tokenId - UUID of the token
 * @param standard - Token standard
 * @returns true if initial_owner is set, false otherwise
 */
export async function hasTokenOwner(
  tokenId: string,
  standard: string
): Promise<boolean> {
  try {
    await getTokenOwnerFromDatabase(tokenId, standard);
    return true;
  } catch {
    return false;
  }
}
