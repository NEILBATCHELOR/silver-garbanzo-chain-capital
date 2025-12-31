// Comprehensive Token Edit Form Types
// Supporting all 51 token-related tables with complete field coverage

import { TokenStandard, TokenConfigMode } from '@/types/core/centralModels';

// Configuration modes - use the enum from centralModels
export type ConfigMode = 'min' | 'max' | 'basic' | 'advanced';

// Token status enum matching database values
export type TokenStatus = 
  | 'DRAFT'
  | 'UNDER REVIEW'
  | 'APPROVED'
  | 'READY TO MINT'
  | 'MINTED'
  | 'DEPLOYED'
  | 'PAUSED'
  | 'DISTRIBUTED'
  | 'REJECTED';

// Tab definitions for each token standard
export interface TabDefinition {
  id: string;
  label: string;
  description?: string;
  table: string;
  component: React.ComponentType<any>;
}

// Master form configuration
export interface TokenEditConfig {
  tokenId?: string;
  standard: TokenStandard;
  configMode: ConfigMode;
  availableTabs: TabDefinition[];
  enableDebug?: boolean;
}

// Base table interface
export interface BaseTableData {
  id?: string;
  token_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Common tokens table fields (25 columns)
export interface TokensTableData extends BaseTableData {
  project_id: string;
  name: string;
  symbol: string;
  decimals: number;
  standard: TokenStandard;
  blocks: any; // jsonb - required field
  metadata?: any; // jsonb
  status: TokenStatus;
  reviewers?: string[];
  approvals?: string[];
  contract_preview?: string;
  total_supply?: string;
  config_mode?: ConfigMode;
  address?: string;
  blockchain?: string;
  deployment_status?: string;
  deployment_timestamp?: string;
  deployment_transaction?: string;
  deployment_error?: string;
  deployed_by?: string;
  deployment_environment?: string;
  description?: string;
}

// ERC-20 Tables
export interface TokenERC20PropertiesData extends BaseTableData {
  initial_supply?: string;
  cap?: string;
  is_mintable?: boolean;
  is_burnable?: boolean;
  is_pausable?: boolean;
  token_type?: string;
  access_control?: string;
  allow_management?: boolean;
  permit?: boolean;
  snapshot?: boolean;
  fee_on_transfer?: any; // jsonb
  rebasing?: any; // jsonb
  governance_features?: any; // jsonb
  transfer_config?: any; // jsonb
  gas_config?: any; // jsonb
  compliance_config?: any; // jsonb
  [key: string]: any; // For additional fields
}

// ERC-721 Tables
export interface TokenERC721PropertiesData extends BaseTableData {
  base_uri?: string;
  metadata_storage?: string;
  max_supply?: string;
  has_royalty?: boolean;
  royalty_percentage?: number;
  royalty_receiver?: string;
  asset_type?: string;
  minting_method?: string;
  auto_increment_ids?: boolean;
  uri_storage?: string;
  updatable_uris?: boolean;
  is_mintable?: boolean;
  is_burnable?: boolean;
  is_pausable?: boolean;
  [key: string]: any;
}

export interface TokenERC721AttributesData extends BaseTableData {
  attribute_name: string;
  attribute_type: string;
  is_required?: boolean;
  default_value?: string;
  validation_rules?: any; // jsonb
  display_order?: number;
  _deleted?: boolean; // For soft delete functionality
}

export interface TokenERC721MintPhasesData extends BaseTableData {
  phase_name: string;
  start_time?: string;
  end_time?: string;
  max_mint_per_address?: number;
  price?: string;
  merkle_root?: string;
  is_active?: boolean;
  _deleted?: boolean; // For soft delete functionality
}

export interface TokenERC721TraitDefinitionsData extends BaseTableData {
  trait_name: string;
  trait_type: string;
  possible_values?: string[];
  rarity_weights?: any; // jsonb
  is_required?: boolean;
  _deleted?: boolean; // For soft delete functionality
}

// ERC-1155 Tables  
export interface TokenERC1155PropertiesData extends BaseTableData {
  base_uri?: string;
  metadata_storage?: string;
  is_mintable?: boolean;
  is_burnable?: boolean;
  is_pausable?: boolean;
  batch_operations?: boolean;
  dynamic_uri_config?: any; // jsonb
  batch_minting_config?: any; // jsonb
  container_config?: any; // jsonb
  [key: string]: any;
}

export interface TokenERC1155TypesData extends BaseTableData {
  token_type_id: string;
  name?: string;
  description?: string;
  max_supply?: string;
  metadata?: any; // jsonb
  fungibility_type?: string;
}

export interface TokenERC1155BalancesData extends BaseTableData {
  token_type_id: string;
  address: string;
  amount: string;
  last_updated?: string;
}

export interface TokenERC1155CraftingRecipesData extends BaseTableData {
  recipe_name: string;
  input_tokens: any; // jsonb - object mapping token type IDs to quantities
  output_token_type_id: string;
  output_quantity?: number;
  success_rate?: number;
  cooldown_period?: number;
  required_level?: number;
  is_active?: boolean;
}

export interface TokenERC1155DiscountTiersData extends BaseTableData {
  tier_name?: string;
  min_quantity: number;
  max_quantity?: number;
  discount_percentage: string;
  applies_to_types?: number[];
  is_active?: boolean;
}

export interface TokenERC1155UriMappingsData extends BaseTableData {
  token_type_id: string;
  uri: string;
  metadata_template?: any; // jsonb
}

export interface TokenERC1155TypeConfigsData extends BaseTableData {
  token_type_id: string;
  supply_cap?: string;
  mint_price?: string;
  is_tradeable?: boolean;
  is_transferable?: boolean;
  utility_type?: string;
  rarity_tier?: string;
  experience_value?: number;
  crafting_materials?: any; // jsonb
  burn_rewards?: any; // jsonb
}

// ERC-1400 Tables (Security Tokens)
export interface TokenERC1400PropertiesData extends BaseTableData {
  is_mintable?: boolean;
  is_burnable?: boolean;
  is_pausable?: boolean;
  investor_count_limit?: number;
  transfer_restrictions?: any; // jsonb
  compliance_config?: any; // jsonb
  [key: string]: any;
}

export interface TokenERC1400PartitionsData extends BaseTableData {
  name: string;
  partition_id: string;
  metadata?: any; // jsonb
  total_supply?: string;
  partition_type?: string;
  amount?: string;
  corporate_actions?: boolean;
  custom_features?: any; // jsonb
  transferable?: boolean;
}

export interface TokenERC1400ControllersData extends BaseTableData {
  controller_address: string;
  controller_type: string;
  permissions: string[];
  is_active?: boolean;
}

export interface TokenERC1400DocumentsData extends BaseTableData {
  name: string;
  document_uri: string;
  document_type?: string;
  document_hash?: string;
  version?: string; // Keep for backward compatibility
  document_name?: string; // Keep for backward compatibility
}

export interface TokenERC1400PartitionBalancesData extends BaseTableData {
  partition_id: string;
  holder_address: string;
  balance: string;
  last_updated?: string;
  metadata?: any; // jsonb
  partition_name?: string; // Keep for backward compatibility
  address?: string; // Keep for backward compatibility
}

export interface TokenERC1400PartitionOperatorsData extends BaseTableData {
  partition_id: string;
  holder_address: string;
  operator_address: string;
  authorized?: boolean;
  last_updated?: string;
  metadata?: any; // jsonb
  partition_name?: string; // Keep for backward compatibility
  permissions?: string[]; // Keep for backward compatibility
  is_active?: boolean; // Keep for backward compatibility
}

export interface TokenERC1400PartitionTransfersData extends BaseTableData {
  partition_id: string;
  from_address: string;
  to_address: string;
  amount: string;
  operator_address?: string;
  timestamp?: string;
  transaction_hash?: string;
  metadata?: any; // jsonb
  partition_name?: string; // Keep for backward compatibility
}

// ERC-3525 Tables (Semi-Fungible)
export interface TokenERC3525PropertiesData extends BaseTableData {
  value_decimals?: number;
  slot_value_total?: string;
  is_mintable?: boolean;
  is_burnable?: boolean;
  is_pausable?: boolean;
  [key: string]: any;
}

export interface TokenERC3525SlotsData extends BaseTableData {
  slot_id: string;
  name?: string;
  description?: string;
  metadata?: any; // jsonb
  value_units?: string;
  slot_transferable?: boolean;
  slot_uri?: string; // Keep for backward compatibility
  total_value?: string; // Keep for backward compatibility
}

export interface TokenERC3525AllocationsData {
  id?: string;
  token_id?: string; // Base table token_id (UUID)
  created_at?: string;
  updated_at?: string;
  slot_id: string;
  token_id_within_slot: string;
  value: string;
  recipient?: string;
  linked_token_id?: string;
  owner_address?: string; // Keep for backward compatibility
}

export interface TokenERC3525PaymentSchedulesData extends BaseTableData {
  slot_id: string;
  payment_date: string;
  payment_amount: string;
  payment_type: string;
  currency?: string;
  is_completed?: boolean;
  transaction_hash?: string;
  status?: string; // Keep for backward compatibility
}

export interface TokenERC3525ValueAdjustmentsData {
  id?: string;
  token_id?: string; // Base table token_id (UUID)  
  created_at?: string;
  updated_at?: string;
  slot_id: string;
  adjustment_date?: string;
  adjustment_type: string;
  adjustment_amount: string;
  adjustment_reason?: string;
  oracle_price?: string;
  oracle_source?: string;
  approved_by?: string;
  transaction_hash?: string;
  old_value?: string; // Keep for backward compatibility
  new_value?: string; // Keep for backward compatibility
  reason?: string; // Keep for backward compatibility
}

export interface TokenERC3525SlotConfigsData extends BaseTableData {
  slot_id: string;
  slot_name?: string;
  slot_description?: string;
  value_units?: string;
  slot_type?: string;
  transferable?: boolean;
  tradeable?: boolean;
  divisible?: boolean;
  min_value?: string;
  max_value?: string;
  value_precision?: number;
  slot_properties?: any; // jsonb
  config_name?: string; // Keep for backward compatibility
  config_value?: any; // Keep for backward compatibility
}

// ERC-4626 Tables (Vault Tokens)
export interface TokenERC4626PropertiesData extends BaseTableData {
  underlying_asset?: string;
  vault_type?: string;
  strategy_type?: string;
  is_mintable?: boolean;
  is_burnable?: boolean;
  is_pausable?: boolean;
  [key: string]: any;
}

export interface TokenERC4626VaultStrategiesData extends BaseTableData {
  strategy_name: string;
  strategy_type: string;
  protocol_address?: string;
  protocol_name?: string;
  allocation_percentage: string;
  min_allocation_percentage?: string;
  max_allocation_percentage?: string;
  risk_score?: number;
  expected_apy?: string;
  actual_apy?: string;
  is_active?: boolean;
  last_rebalance?: string;
  strategy_description?: string; // Keep for backward compatibility
  target_allocation?: number; // Keep for backward compatibility
  risk_level?: string; // Keep for backward compatibility
}

export interface TokenERC4626AssetAllocationsData extends BaseTableData {
  asset: string;
  percentage: string;
  description?: string;
  protocol?: string;
  expected_apy?: string;
  asset_address?: string; // Keep for backward compatibility
  allocation_percentage?: number; // Keep for backward compatibility
  min_allocation?: number; // Keep for backward compatibility
  max_allocation?: number; // Keep for backward compatibility
}

export interface TokenERC4626FeeTiersData extends BaseTableData {
  tier_name: string;
  min_balance: string;
  max_balance?: string;
  management_fee_rate: string;
  performance_fee_rate: string;
  deposit_fee_rate?: string;
  withdrawal_fee_rate?: string;
  tier_benefits?: any; // jsonb
  is_active?: boolean;
  deposit_fee?: number; // Keep for backward compatibility
  withdrawal_fee?: number; // Keep for backward compatibility
  performance_fee?: number; // Keep for backward compatibility
}

export interface TokenERC4626PerformanceMetricsData extends BaseTableData {
  metric_date: string;
  total_assets: string;
  share_price: string;
  apy?: string;
  daily_yield?: string;
  benchmark_performance?: string;
  total_fees_collected?: string;
  new_deposits?: string;
  withdrawals?: string;
  net_flow?: string;
  sharpe_ratio?: string;
  volatility?: string;
  max_drawdown?: string;
  metric_name?: string; // Keep for backward compatibility
  metric_value?: string; // Keep for backward compatibility
  calculation_date?: string; // Keep for backward compatibility
  metric_type?: string; // Keep for backward compatibility
}

export interface TokenERC4626StrategyParamsData extends BaseTableData {
  name: string;
  value: string;
  description?: string;
  param_type?: string;
  is_required?: boolean;
  default_value?: string;
  strategy_id?: string; // Keep for backward compatibility
  param_name?: string; // Keep for backward compatibility
  param_value?: any; // Keep for backward compatibility
}

// Union types for all table data
export type TokenTableData = 
  | TokensTableData
  | TokenERC20PropertiesData
  | TokenERC721PropertiesData
  | TokenERC721AttributesData
  | TokenERC721MintPhasesData
  | TokenERC721TraitDefinitionsData
  | TokenERC1155PropertiesData
  | TokenERC1155TypesData
  | TokenERC1155BalancesData
  | TokenERC1155CraftingRecipesData
  | TokenERC1155DiscountTiersData
  | TokenERC1155UriMappingsData
  | TokenERC1155TypeConfigsData
  | TokenERC1400PropertiesData
  | TokenERC1400PartitionsData
  | TokenERC1400ControllersData
  | TokenERC1400DocumentsData
  | TokenERC1400PartitionBalancesData
  | TokenERC1400PartitionOperatorsData
  | TokenERC1400PartitionTransfersData
  | TokenERC3525PropertiesData
  | TokenERC3525SlotsData
  | TokenERC3525AllocationsData
  | TokenERC3525PaymentSchedulesData
  | TokenERC3525ValueAdjustmentsData
  | TokenERC3525SlotConfigsData
  | TokenERC4626PropertiesData
  | TokenERC4626VaultStrategiesData
  | TokenERC4626AssetAllocationsData
  | TokenERC4626FeeTiersData
  | TokenERC4626PerformanceMetricsData
  | TokenERC4626StrategyParamsData;

// Form state management
export interface FormTabState {
  isModified: boolean;
  hasErrors: boolean;
  data: TokenTableData;
  validationErrors: Record<string, string[]>;
}

export interface ComprehensiveFormState {
  tokenId?: string;
  standard: TokenStandard;
  configMode: ConfigMode;
  activeTab: string;
  tabs: Record<string, FormTabState>;
  globalErrors: string[];
  isSubmitting: boolean;
  lastSaved?: string;
}

// CRUD operations interface
export interface TokenCRUDService {
  // Read operations
  getTokenData(tokenId: string): Promise<TokensTableData>;
  getTableData(table: string, tokenId: string): Promise<TokenTableData[]>;
  
  // Write operations
  updateTokenData(tokenId: string, data: Partial<TokensTableData>): Promise<TokensTableData>;
  updateTableData(table: string, tokenId: string, data: TokenTableData[]): Promise<TokenTableData[]>;
  
  // Validation
  validateTableData(table: string, data: TokenTableData): Promise<Record<string, string[]>>;
}

// Event handlers
export interface FormEventHandlers {
  onTabChange: (tabId: string) => void;
  onFieldChange: (table: string, field: string, value: any, recordIndex?: number) => void;
  onSave: (table?: string) => Promise<void>;
  onSaveAll: () => Promise<void>;
  onReset: (table?: string) => void;
  onValidate: (table?: string) => Promise<boolean>;
}

// Phase 3: Enhanced Validation Types
export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'range' | 'cross_field' | 'business' | 'custom';
  severity?: 'error' | 'warning' | 'info';
  ruleId?: string;
  category?: 'business' | 'technical' | 'regulatory' | 'security';
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validator: (value: any, context?: any) => ValidationError[];
  isActive: boolean;
}

// Phase 3: Bulk Operations Types
export interface BulkImportOptions {
  format: 'json' | 'csv' | 'excel';
  overwrite: boolean;
  validateBeforeImport: boolean;
  skipErrors: boolean;
}

export interface BulkExportOptions {
  format: 'json' | 'csv' | 'excel';
  includeEmptyFields: boolean;
  includeSensitiveData: boolean;
  compressOutput: boolean;
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  errors: number;
  warnings: number;
  skipped: number;
  details: {
    succeeded: any[];
    failed: any[];
    warnings: any[];
  };
}

// Phase 3: Template System Types
export interface TokenTemplate {
  id: string;
  name: string;
  description: string;
  standard: TokenStandard;
  category: 'defi' | 'nft' | 'security' | 'gaming' | 'utility' | 'custom';
  tags: string[];
  configuration: Record<string, any>;
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    version: string;
    isPublic: boolean;
    usageCount: number;
  };
  validationRules?: string[];
  previewData?: {
    icon?: string;
    color?: string;
    summary?: string;
  };
}

export interface TemplateLibrary {
  templates: TokenTemplate[];
  categories: string[];
  standards: TokenStandard[];
  totalCount: number;
}

export interface TemplateApplyOptions {
  overwriteExisting: boolean;
  mergeWithCurrent: boolean;
  excludeFields: string[];
  includeOnlyFields: string[];
}

// Phase 3: Advanced UI Types
export interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'date' | 'address';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
  defaultValue?: any;
  description?: string;
  category: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FieldDefinition[];
  order: number;
  collapsible: boolean;
  defaultCollapsed: boolean;
}

export interface DragDropContext {
  draggedItem: any | null;
  dropTarget: string | null;
  isDragging: boolean;
}

export interface VisualFormSettings {
  theme: 'default' | 'modern' | 'minimal';
  layout: 'single-column' | 'two-column';
  showProgress: boolean;
  allowSave: boolean;
  autoSave: boolean;
}

// Enhanced Form State with Phase 3 features
export interface EnhancedFormState extends ComprehensiveFormState {
  // Validation state
  crossFieldValidation: ValidationError[];
  validationEnabled: boolean;
  
  // Template state
  appliedTemplate?: string;
  templateModifications: Record<string, any>;
  
  // Bulk operations state
  bulkOperationInProgress: boolean;
  bulkOperationResult?: BulkOperationResult;
  
  // Visual designer state
  designerMode: boolean;
  formSections: FormSection[];
  visualSettings: VisualFormSettings;
}

// Re-export TokenStandard and TokenConfigMode from centralModels
export { TokenStandard, TokenConfigMode } from '@/types/core/centralModels';
