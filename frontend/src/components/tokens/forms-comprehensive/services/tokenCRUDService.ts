// Comprehensive Token CRUD Service
// Handles all 51 token-related tables with complete CRUD operations
// Enhanced with module configuration management for JSONB columns

import { supabase } from '@/infrastructure/supabaseClient';
import { 
  TokenTableData, 
  TokensTableData, 
  TokenCRUDService,
  ConfigMode
} from '../types';
import { TokenStandard } from '@/types/core/centralModels';

// Module configuration types
type ModuleConfigValue = Record<string, any> | null;

class ComprehensiveTokenCRUDService implements TokenCRUDService {
  
  // ============ MODULE CONFIGURATION MAPPING ============
  // Maps module names to their database JSONB column names per token standard
  
  private readonly moduleConfigColumns: Record<TokenStandard, Record<string, string>> = {
    [TokenStandard.ERC20]: {
      'vesting': 'vesting_config',
      'document': 'document_config',
      'compliance': 'compliance_config',
      'policyEngine': 'policy_engine_config',
      'fees': 'fees_config',
      'flashMint': 'flash_mint_config',
      'permit': 'permit_config',
      'snapshot': 'snapshot_config',
      'timelock': 'timelock_config',
      'votes': 'votes_config',
      'payableToken': 'payable_token_config',
      'temporaryApproval': 'temporary_approval_config'
    },
    [TokenStandard.ERC721]: {
      'document': 'document_config',
      'consecutive': 'consecutive_config',
      'metadataEvents': 'metadata_events_config',
      'soulbound': 'soulbound_config',
      'rental': 'rental_config',
      'fractionalization': 'fractionalization_config',
      'compliance': 'compliance_config',
      'vesting': 'vesting_config',
      'royalty': 'royalty_config'
    },
    [TokenStandard.ERC1155]: {
      'document': 'document_config',
      'vesting': 'vesting_config',
      'compliance': 'compliance_config',
      'policyEngine': 'policy_engine_config',
      'granularApproval': 'granular_approval_config',
      'royalty': 'royalty_config',
      'supplyCap': 'supply_cap_config',
      'uriManagement': 'uri_management_config'
    },
    [TokenStandard.ERC3525]: {
      'slotManager': 'slot_manager_config',
      'slotApprovable': 'slot_approvable_config',
      'document': 'document_config',
      'compliance': 'compliance_config',
      'policyEngine': 'policy_engine_config',
      'valueExchange': 'value_exchange_config'
    },
    [TokenStandard.ERC4626]: {
      'document': 'document_config',
      'compliance': 'compliance_config',
      'policyEngine': 'policy_engine_config',
      'nativeVault': 'native_vault_config',
      'router': 'router_config',
      'feeStrategy': 'fee_strategy_config',
      'withdrawalQueue': 'withdrawal_queue_config',
      'yieldStrategy': 'yield_strategy_config',
      'asyncVault': 'async_vault_config',
      'multiAssetVault': 'multi_asset_vault_config'
    },
    [TokenStandard.ERC1400]: {
      'transferRestrictions': 'enhanced_transfer_restrictions_config',
      'document': 'enhanced_document_config',
      'partition': 'partition_config',
      'controller': 'controller_config',
      'compliance': 'compliance_config',
      'policyEngine': 'policy_engine_config'
    }
  };

  // Get properties table name for a token standard
  private getPropertiesTable(standard: TokenStandard): string {
    const tableMap: Record<TokenStandard, string> = {
      [TokenStandard.ERC20]: 'token_erc20_properties',
      [TokenStandard.ERC721]: 'token_erc721_properties',
      [TokenStandard.ERC1155]: 'token_erc1155_properties',
      [TokenStandard.ERC3525]: 'token_erc3525_properties',
      [TokenStandard.ERC4626]: 'token_erc4626_properties',
      [TokenStandard.ERC1400]: 'token_erc1400_properties'
    };
    return tableMap[standard];
  }

  // ============ MODULE CONFIGURATION METHODS ============

  /**
   * Get a specific module configuration from database
   */
  async getModuleConfig(
    tokenId: string,
    standard: TokenStandard,
    moduleName: string
  ): Promise<ModuleConfigValue> {
    const propertiesTable = this.getPropertiesTable(standard);
    const columnName = this.moduleConfigColumns[standard]?.[moduleName];

    if (!columnName) {
      throw new Error(`Unknown module '${moduleName}' for ${standard}`);
    }

    const { data, error } = await supabase
      .from(propertiesTable)
      .select(columnName)
      .eq('token_id', tokenId)
      .single();

    if (error) throw error;
    return data?.[columnName] || null;
  }

  /**
   * Update a specific module configuration in database
   */
  async updateModuleConfig(
    tokenId: string,
    standard: TokenStandard,
    moduleName: string,
    config: ModuleConfigValue
  ): Promise<void> {
    const propertiesTable = this.getPropertiesTable(standard);
    const columnName = this.moduleConfigColumns[standard]?.[moduleName];

    if (!columnName) {
      throw new Error(`Unknown module '${moduleName}' for ${standard}`);
    }

    // Validate JSON structure if config is not null
    if (config !== null) {
      this.validateModuleConfig(moduleName, config);
    }

    const { error } = await supabase
      .from(propertiesTable)
      .update({
        [columnName]: config,
        updated_at: new Date().toISOString()
      })
      .eq('token_id', tokenId);

    if (error) throw error;
  }

  /**
   * Save all module configurations at once
   */
  async saveAllModuleConfigs(
    tokenId: string,
    standard: TokenStandard,
    configs: Record<string, ModuleConfigValue>
  ): Promise<void> {
    const propertiesTable = this.getPropertiesTable(standard);
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    // Build update object with all module configs
    for (const [moduleName, config] of Object.entries(configs)) {
      const columnName = this.moduleConfigColumns[standard]?.[moduleName];
      if (columnName) {
        // Validate if not null
        if (config !== null) {
          this.validateModuleConfig(moduleName, config);
        }
        updateData[columnName] = config;
      } else {
        console.warn(`Unknown module '${moduleName}' for ${standard}, skipping`);
      }
    }

    const { error } = await supabase
      .from(propertiesTable)
      .update(updateData)
      .eq('token_id', tokenId);

    if (error) throw error;
  }

  /**
   * Load all module configurations for a token
   */
  async loadAllModuleConfigs(
    tokenId: string,
    standard: TokenStandard
  ): Promise<Record<string, ModuleConfigValue>> {
    const propertiesTable = this.getPropertiesTable(standard);
    const moduleMap = this.moduleConfigColumns[standard];

    if (!moduleMap) {
      throw new Error(`No module mappings found for ${standard}`);
    }

    // Get all config columns for this standard
    const columnNames = Object.values(moduleMap);
    const selectColumns = columnNames.join(',');

    const { data, error } = await supabase
      .from(propertiesTable)
      .select(selectColumns)
      .eq('token_id', tokenId)
      .single();

    if (error) throw error;

    // Map database columns back to module names
    const configs: Record<string, ModuleConfigValue> = {};
    for (const [moduleName, columnName] of Object.entries(moduleMap)) {
      configs[moduleName] = data?.[columnName] || null;
    }

    return configs;
  }

  /**
   * Basic validation for module configurations
   */
  private validateModuleConfig(moduleName: string, config: ModuleConfigValue): void {
    if (!config || typeof config !== 'object') {
      throw new Error(`Invalid config for module '${moduleName}': must be an object`);
    }

    // Module-specific validation
    switch (moduleName) {
      case 'vesting':
        if (config.schedules && !Array.isArray(config.schedules)) {
          throw new Error('vesting.schedules must be an array');
        }
        break;

      case 'document':
        if (config.documents && !Array.isArray(config.documents)) {
          throw new Error('document.documents must be an array');
        }
        break;

      case 'slotManager':
        if (config.initialSlots && !Array.isArray(config.initialSlots)) {
          throw new Error('slotManager.initialSlots must be an array');
        }
        break;

      case 'transferRestrictions':
        if (config.restrictions && !Array.isArray(config.restrictions)) {
          throw new Error('transferRestrictions.restrictions must be an array');
        }
        break;

      case 'policyEngine':
        if (config.rules && !Array.isArray(config.rules)) {
          throw new Error('policyEngine.rules must be an array');
        }
        break;
    }
  }
  
  // ============ EXISTING CRUD METHODS ============
  
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
      if (record.id) {
        // Update existing record
        const { data, error } = await (supabase as any)
          .from(table)
          .update({
            ...record,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.id)
          .select()
          .single();
        
        if (error) throw error;
        results.push(data);
      } else {
        // Insert new record
        const recordToInsert = {
          ...record,
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
