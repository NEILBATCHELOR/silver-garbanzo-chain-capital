// Comprehensive Token CRUD Service
// Handles all 51 token-related tables with complete CRUD operations

import { supabase } from '@/infrastructure/supabaseClient';
import { 
  TokenTableData, 
  TokensTableData, 
  TokenCRUDService,
  ConfigMode
} from '../types';
import { TokenStandard } from '@/types/core/centralModels';
import { transformModuleSelectionToColumns } from './moduleSelectionTransformer';

class ComprehensiveTokenCRUDService implements TokenCRUDService {
  
  // Read operations
  async getTokenData(tokenId: string): Promise<TokensTableData> {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();
    
    if (error) throw error;
    return data as TokensTableData;
  }

  async getTableData(table: string, tokenId: string): Promise<TokenTableData[]> {
    let query = (supabase as any).from(table).select('*');
    
    // Handle ERC-1400 partition tables that use partition_id instead of token_id
    if (this.isERC1400PartitionTable(table)) {
      // For partition tables, we need to join through the partitions table
      // First get partition IDs for this token
      const { data: partitions, error: partitionError } = await supabase
        .from('token_erc1400_partitions')
        .select('id')
        .eq('token_id', tokenId);
      
      if (partitionError) throw partitionError;
      
      if (partitions && partitions.length > 0) {
        const partitionIds = partitions.map(p => p.id);
        query = query.in('partition_id', partitionIds);
      } else {
        // No partitions exist, return empty array
        return [];
      }
    } else if (this.hasTokenIdField(table)) {
      // Add token_id filter for tables that have it
      query = query.eq('token_id', tokenId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Create operations
  async createNewToken(tokenData: Partial<TokensTableData>): Promise<TokensTableData> {
    const { data, error } = await (supabase as any)
      .from('tokens')
      .insert({
        ...tokenData,
        blocks: tokenData.blocks || {}, // Ensure blocks field is provided
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as TokensTableData;
  }

  // Create new records
  async createTableData(table: string, tokenId: string, records: TokenTableData[]): Promise<TokenTableData[]>;
  async createTableData(table: string, record: TokenTableData): Promise<TokenTableData>;
  async createTableData(table: string, tokenIdOrRecord: string | TokenTableData, records?: TokenTableData[]): Promise<TokenTableData | TokenTableData[]> {
    if (typeof tokenIdOrRecord === 'string' && records) {
      // Multiple records with explicit tokenId
      const recordsToInsert = records.map(record => ({
        ...record,
        token_id: tokenIdOrRecord,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await (supabase as any)
        .from(table)
        .insert(recordsToInsert)
        .select();
      
      if (error) throw error;
      return data || [];
    } else {
      // Single record with tokenId in the record
      const record = tokenIdOrRecord as TokenTableData;
      const recordToInsert = {
        ...record,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await (supabase as any)
        .from(table)
        .insert(recordToInsert)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  }

  // Alternative method name for backward compatibility
  async loadTableData(table: string, tokenId: string): Promise<TokenTableData[]> {
    return this.getTableData(table, tokenId);
  }

  async deleteTableData(table: string, recordIds: string[]): Promise<void> {
    const { error } = await (supabase as any)
      .from(table)
      .delete()
      .in('id', recordIds);
    
    if (error) throw error;
  }
  async updateTokenData(tokenId: string, data: Partial<TokensTableData>): Promise<TokensTableData> {
    const { data: result, error } = await (supabase as any)
      .from('tokens')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenId)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  async updateTableData(table: string, tokenId: string, records: TokenTableData[]): Promise<TokenTableData[]> {
    const results: TokenTableData[] = [];
    
    for (const record of records) {
      // 🆕 HANDLE MODULE SELECTION TRANSFORMATION
      let recordToSave = { ...record } as any; // Cast to any to handle dynamic moduleSelection field
      
      // If this is a properties table and has moduleSelection field
      if (table.includes('_properties') && 'moduleSelection' in recordToSave && recordToSave.moduleSelection) {
        const tokenStandard = table.replace('token_', '').replace('_properties', '');
        
        // Transform moduleSelection to individual module address columns
        const moduleColumns = transformModuleSelectionToColumns(
          recordToSave.moduleSelection,
          tokenStandard
        );
        
        // Remove moduleSelection (not a database column) and add module addresses
        delete recordToSave.moduleSelection;
        recordToSave = { ...recordToSave, ...moduleColumns };
        
        console.log(`[tokenCRUDService] Transformed moduleSelection to columns for ${table}:`, moduleColumns);
      }
      
      if (recordToSave.id) {
        // Update existing record
        const { data, error } = await (supabase as any)
          .from(table)
          .update({
            ...recordToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', recordToSave.id)
          .select()
          .single();
        
        if (error) throw error;
        results.push(data);
      } else {
        // Insert new record
        const recordToInsert = {
          ...recordToSave,
          token_id: tokenId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await (supabase as any)
          .from(table)
          .insert(recordToInsert)
          .select()
          .single();
        
        if (error) throw error;
        results.push(data);
      }
    }
    
    return results;
  }

  async deleteTableRecord(table: string, recordId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(table)
      .delete()
      .eq('id', recordId);
    
    if (error) throw error;
  }

  // Validation
  async validateTableData(table: string, data: TokenTableData): Promise<Record<string, string[]>> {
    const errors: Record<string, string[]> = {};
    
    // Get table schema for validation
    const schema = this.getTableSchema(table);
    
    // Validate required fields
    for (const field of schema.required) {
      if (!data[field] || data[field] === '') {
        if (!errors[field]) errors[field] = [];
        errors[field].push(`${field} is required`);
      }
    }
    
    // Validate field types
    for (const [field, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        const fieldSchema = schema.fields[field];
        if (fieldSchema) {
          const typeErrors = this.validateFieldType(field, value, fieldSchema);
          if (typeErrors.length > 0) {
            errors[field] = [...(errors[field] || []), ...typeErrors];
          }
        }
      }
    }
    
    return errors;
  }

  // Get all tables for a token standard
  getTablesForStandard(standard: TokenStandard): string[] {
    const baseTables = ['tokens'];
    
    switch (standard) {
      case TokenStandard.ERC20:
        return [...baseTables, 'token_erc20_properties'];
      
      case TokenStandard.ERC721:
        return [
          ...baseTables,
          'token_erc721_properties',
          'token_erc721_attributes',
          'token_erc721_mint_phases',
          'token_erc721_trait_definitions'
        ];
      
      case TokenStandard.ERC1155:
        return [
          ...baseTables,
          'token_erc1155_properties',
          'token_erc1155_types',
          'token_erc1155_balances',
          'token_erc1155_crafting_recipes',
          'token_erc1155_discount_tiers',
          'token_erc1155_uri_mappings',
          'token_erc1155_type_configs'
        ];
      
      case TokenStandard.ERC1400:
        return [
          ...baseTables,
          'token_erc1400_properties',
          'token_erc1400_partitions',
          'token_erc1400_controllers',
          'token_erc1400_documents',
          'token_erc1400_corporate_actions',
          'token_erc1400_custody_providers',
          'token_erc1400_regulatory_filings',
          'token_erc1400_partition_balances',
          'token_erc1400_partition_operators',
          'token_erc1400_partition_transfers'
        ];
      
      case TokenStandard.ERC3525:
        return [
          ...baseTables,
          'token_erc3525_properties',
          'token_erc3525_slots',
          'token_erc3525_allocations',
          'token_erc3525_payment_schedules',
          'token_erc3525_value_adjustments',
          'token_erc3525_slot_configs'
        ];
      
      case TokenStandard.ERC4626:
        return [
          ...baseTables,
          'token_erc4626_properties',
          'token_erc4626_vault_strategies',
          'token_erc4626_asset_allocations',
          'token_erc4626_fee_tiers',
          'token_erc4626_performance_metrics',
          'token_erc4626_strategy_params'
        ];
      
      default:
        return baseTables;
    }
  }

  // Load all data for a token
  async loadAllTokenData(tokenId: string, standard: TokenStandard): Promise<Record<string, any>> {
    const tables = this.getTablesForStandard(standard);
    const allData: Record<string, any> = {};
    
    for (const table of tables) {
      try {
        if (table === 'tokens') {
          allData[table] = await this.getTokenData(tokenId);
        } else {
          allData[table] = await this.getTableData(table, tokenId);
        }
      } catch (error) {
        console.error(`Error loading data for table ${table}:`, error);
        allData[table] = table === 'tokens' ? {} : [];
      }
    }
    
    return allData;
  }

  // Helper methods
  private hasTokenIdField(table: string): boolean {
    // Tables that don't have token_id field or use different foreign keys
    const noTokenIdTables = [
      'tokens',
      'token_erc1400_partition_balances',
      'token_erc1400_partition_operators',
      'token_erc1400_partition_transfers'
    ];
    return !noTokenIdTables.includes(table);
  }

  private isERC1400PartitionTable(table: string): boolean {
    // Tables that use partition_id instead of token_id
    const partitionTables = [
      'token_erc1400_partition_balances',
      'token_erc1400_partition_operators',
      'token_erc1400_partition_transfers'
    ];
    return partitionTables.includes(table);
  }

  private getTableSchema(table: string): { required: string[]; fields: Record<string, any> } {
    // Define schema for each table
    const schemas: Record<string, any> = {
      tokens: {
        required: ['project_id', 'name', 'symbol', 'standard'],
        fields: {
          name: { type: 'string', maxLength: 255 },
          symbol: { type: 'string', maxLength: 50 },
          decimals: { type: 'number', min: 0, max: 18 },
          total_supply: { type: 'string' }
        }
      },
      token_erc20_properties: {
        required: ['token_id'],
        fields: {
          initial_supply: { type: 'string' },
          cap: { type: 'string' },
          is_mintable: { type: 'boolean' },
          is_burnable: { type: 'boolean' },
          is_pausable: { type: 'boolean' }
        }
      },
      token_erc721_properties: {
        required: ['token_id'],
        fields: {
          base_uri: { type: 'string' },
          max_supply: { type: 'string' },
          has_royalty: { type: 'boolean' },
          royalty_percentage: { type: 'number', min: 0, max: 100 }
        }
      },
      token_erc1155_properties: {
        required: ['token_id'],
        fields: {
          base_uri: { type: 'string' },
          is_mintable: { type: 'boolean' },
          is_burnable: { type: 'boolean' },
          is_pausable: { type: 'boolean' }
        }
      },
      token_erc1400_properties: {
        required: ['token_id'],
        fields: {
          is_mintable: { type: 'boolean' },
          is_burnable: { type: 'boolean' },
          is_pausable: { type: 'boolean' },
          investor_count_limit: { type: 'number', min: 1 }
        }
      },
      token_erc3525_properties: {
        required: ['token_id'],
        fields: {
          value_decimals: { type: 'number', min: 0, max: 18 },
          is_mintable: { type: 'boolean' },
          is_burnable: { type: 'boolean' }
        }
      },
      token_erc4626_properties: {
        required: ['token_id'],
        fields: {
          underlying_asset: { type: 'string' },
          vault_type: { type: 'string' },
          is_mintable: { type: 'boolean' }
        }
      }
    };
    
    return schemas[table] || { required: [], fields: {} };
  }

  private validateFieldType(field: string, value: any, schema: any): string[] {
    const errors: string[] = [];
    
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        } else {
          if (schema.maxLength && value.length > schema.maxLength) {
            errors.push(`${field} must be no more than ${schema.maxLength} characters`);
          }
        }
        break;
      
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${field} must be a valid number`);
        } else {
          if (schema.min !== undefined && value < schema.min) {
            errors.push(`${field} must be at least ${schema.min}`);
          }
          if (schema.max !== undefined && value > schema.max) {
            errors.push(`${field} must be no more than ${schema.max}`);
          }
        }
        break;
      
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${field} must be true or false`);
        }
        break;
    }
    
    return errors;
  }
}

// Singleton instance
export const tokenCRUDService = new ComprehensiveTokenCRUDService();
export default tokenCRUDService;
