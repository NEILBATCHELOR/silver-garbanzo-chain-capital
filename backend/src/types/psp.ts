/**
 * PSP (Payment Service Provider) Types
 * 
 * Type definitions for Warp/Beam payment integration including:
 * - API Keys & Authentication
 * - Webhooks & Events
 * - Identity Verification (KYB/KYC)
 * - External Accounts (Fiat & Crypto)
 * - Virtual Accounts
 * - Payments & Transfers
 * - Trades & Currency Conversion
 * - Balances & Wallets
 * - Transactions & History
 * - Payment Settings & Automation
 */

// ==================== ENUMS ====================

export type PSPEnvironment = 'sandbox' | 'production';

export type PSPApiKeyStatus = 'active' | 'suspended' | 'revoked';

export type WebhookStatus = 'active' | 'suspended' | 'failed';

export type IdentityCaseType = 'individual' | 'business';

export type IdentityCaseStatus = 
  | 'pending' 
  | 'in_review' 
  | 'approved' 
  | 'rejected' 
  | 'review_required';

export type ExternalAccountType = 'ach' | 'wire' | 'crypto' | 'plaid';

export type CurrencyType = 'fiat' | 'crypto';

export type AccountClassification = 'checking' | 'savings';

export type TransferMethod = 'ach' | 'wire';

export type ExternalAccountStatus = 'active' | 'inactive' | 'suspended';

export type VirtualAccountType = 'individual' | 'business';

export type VirtualAccountStatus = 'active' | 'suspended' | 'closed';

export type PaymentType = 
  | 'fiat_payment' 
  | 'crypto_payment' 
  | 'trade'
  | 'fiat_withdrawal' 
  | 'fiat_deposit' 
  | 'crypto_withdrawal';

export type PaymentDirection = 'inbound' | 'outbound';

export type SourceDestinationType = 'wallet' | 'virtual_account' | 'external_account';

export type PaymentRail = 'ach' | 'wire' | 'rtp' | 'fednow' | 'push_to_card' | 'crypto';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type TradeStatus = 
  | 'pending' 
  | 'executing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type AssetType = 'fiat' | 'crypto';

export type WithdrawalFrequency = 'continuous' | 'on_demand' | 'daily' | 'weekly';

// ==================== API KEYS ====================

export interface PSPApiKey {
  id: string;
  project_id: string;
  key_hash: string;
  key_description: string;
  environment: PSPEnvironment;
  warp_api_key?: string; // Encrypted
  last_used_at?: Date;
  ip_whitelist?: string[];
  status: PSPApiKeyStatus;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
}

export interface CreateApiKeyRequest {
  project_id: string;
  key_description: string;
  environment: PSPEnvironment;
  warp_api_key: string;
  ip_whitelist?: string[];
  expires_at?: Date;
}

export interface ApiKeyResponse {
  id: string;
  api_key: string; // Shown only once during creation
  key_description: string;
  environment: PSPEnvironment;
  status: PSPApiKeyStatus;
  created_at: Date;
}

// ==================== WEBHOOKS ====================

export interface PSPWebhook {
  id: string;
  project_id: string;
  warp_webhook_id?: string; // ID from Warp
  callback_url: string;
  auth_username: string;
  auth_password_hash: string; // Encrypted
  status: WebhookStatus;
  retry_count: number;
  last_success_at?: Date;
  last_failure_at?: Date;
  failure_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterWebhookRequest {
  project_id: string;
  callback_url: string;
  auth_username: string;
  auth_password: string;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  project_id: string;
  event_id: string; // From Warp
  event_name: string; // Payment.Initiated, Payment.Completed, etc.
  resource_urls: string[];
  payload: any;
  status: 'pending' | 'delivered' | 'failed';
  delivery_attempts: number;
  delivered_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type WebhookEventName = 
  | 'Payment.Initiated'
  | 'Payment.Completed'
  | 'Payment.Failed'
  | 'Account.Status.Changed'
  | 'DEPOSIT_STATUS_CHANGE'
  | 'DEPOSIT_RECEIVED'
  | 'DEPOSIT_REJECTED';

// ==================== IDENTITY (KYB/KYC) ====================

export interface BusinessData {
  name?: string;
  legalName: string;
  description: string;
  taxId: string;
  registrationNumber: string;
  industry?: string;
  phoneNumber?: string;
  email: string;
  website?: string;
  legalEntityType: string;
  incorporationDate: string;
  stateOfFormation: string;
  countryOfFormation: string;
  regulatoryStatus?: string;
  regulatoryAuthority?: string;
  regulatorJurisdiction?: string;
  regulatorRegisterNumber?: string;
  nicCode?: string;
  tradingType?: string;
  monthlyTransactionVolume?: string;
  registeredAddress: Address;
  physicalAddress: Address;
}

export interface PersonData {
  firstName?: string;
  firstName2?: string;
  middleName?: string;
  lastName?: string;
  lastName2?: string;
  email: string;
  phoneNumber?: string;
  ssn?: string;
  idNumber?: string;
  birthdate?: string;
  employmentStatus?: string;
  industry?: string;
  occupation?: string;
  annualIncome?: number;
  incomeSource?: string;
  wealthSource?: string;
  address: Address;
  role: string; // BeneficialOwner, ControlPerson, etc.
}

export interface Address {
  street1: string;
  street2?: string;
  district?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PSPIdentityCase {
  id: string;
  project_id: string;
  warp_case_id?: string; // ID from Warp
  case_type: IdentityCaseType;
  status: IdentityCaseStatus;
  business_data?: BusinessData;
  persons_data?: PersonData[];
  verification_results?: any;
  next_steps?: string[];
  missing_fields?: string[];
  rejection_reasons?: string[];
  submitted_at?: Date;
  approved_at?: Date;
  rejected_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateIdentityCaseRequest {
  project_id: string;
  case_type: IdentityCaseType;
  business?: BusinessData;
  persons: PersonData[];
}

// ==================== EXTERNAL ACCOUNTS ====================

export interface PSPExternalAccount {
  id: string;
  project_id: string;
  warp_account_id?: string; // ID from Warp
  account_type: ExternalAccountType;
  currency_type: CurrencyType;
  
  // Fiat account details
  routing_number?: string;
  account_number_last4?: string;
  account_holder_name?: string;
  bank_name?: string;
  account_classification?: AccountClassification;
  transfer_method?: TransferMethod;
  
  // Crypto account details
  network?: string;
  wallet_address?: string;
  
  // Common fields
  description: string;
  status: ExternalAccountStatus;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateExternalAchAccountRequest {
  project_id: string;
  routing_number: string;
  account_number: string;
  account_classification: AccountClassification;
  account_holder_name?: string;
  bank_name?: string;
  description: string;
}

export interface CreateExternalWireAccountRequest {
  project_id: string;
  routing_number: string;
  account_number: string;
  receiver_name: string;
  receiver_address: Address;
  receiver_bank_name: string;
  receiver_bank_address: Address;
  description: string;
}

export interface CreateExternalCryptoAccountRequest {
  project_id: string;
  description: string;
  wallet_address: string;
  network: string;
}

// ==================== VIRTUAL ACCOUNTS ====================

export interface PSPVirtualAccount {
  id: string;
  project_id: string;
  warp_virtual_account_id?: string; // ID from Warp
  identity_case_id?: string;
  account_name: string;
  account_type: VirtualAccountType;
  status: VirtualAccountStatus;
  balances?: any; // Multi-currency balances
  deposit_instructions?: DepositInstructions;
  created_at: Date;
  updated_at: Date;
}

export interface DepositInstructions {
  fiat?: {
    account_number: string;
    routing_number: string;
    account_holder_name: string;
    bank_name: string;
    bank_details: string;
    ref_code: string; // Important for tracking deposits
  };
  crypto?: CryptoDepositAddress[];
}

export interface CryptoDepositAddress {
  asset_symbol: string;
  network: string;
  address: string;
}

export interface CreateVirtualAccountRequest {
  project_id: string;
  identity_case_id?: string;
  account_name: string;
  account_type: VirtualAccountType;
}

// ==================== PAYMENTS ====================

export interface PSPPayment {
  id: string;
  project_id: string;
  warp_payment_id?: string; // ID from Warp
  payment_type: PaymentType;
  direction: PaymentDirection;
  
  // Source and destination
  source_type?: SourceDestinationType;
  source_id?: string;
  destination_type?: SourceDestinationType;
  destination_id?: string;
  
  // Payment details
  amount: string; // Using string for precision
  currency: string; // USD, USDC, ETH, etc.
  network?: string; // For crypto: ethereum, polygon, etc.
  asset_symbol?: string; // For crypto trades
  
  // Payment rail
  payment_rail?: PaymentRail;
  
  // Status tracking
  status: PaymentStatus;
  error_code?: string;
  error_message?: string;
  
  // Metadata
  memo?: string;
  idempotency_key?: string;
  metadata?: any;
  
  // Timestamps
  initiated_at: Date;
  completed_at?: Date;
  failed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFiatPaymentRequest {
  project_id: string;
  source: {
    wallet_id: string;
    virtual_account_id?: string;
  };
  destination: {
    external_account_id: string;
  };
  amount: string;
  payment_rail?: PaymentRail;
  memo?: string;
  idempotency_key?: string;
}

export interface CreateCryptoPaymentRequest {
  project_id: string;
  source: {
    wallet_id: string;
    virtual_account_id?: string;
  };
  destination: {
    external_account_id: string;
  };
  amount: string;
  asset: string;
  network: string;
  memo?: string;
  idempotency_key?: string;
}

// ==================== TRADES ====================

export interface PSPTrade {
  id: string;
  project_id: string;
  warp_trade_id?: string; // ID from Warp
  virtual_account_id?: string;
  
  // Source (what we're trading from)
  source_symbol: string; // USD, USDC, ETH, etc.
  source_network?: string; // For crypto
  source_amount: string;
  
  // Destination (what we're trading to)
  destination_symbol: string;
  destination_network?: string; // For crypto
  destination_amount?: string;
  
  // Exchange rate and fees
  exchange_rate?: string;
  fee_amount?: string;
  fee_currency?: string;
  
  // Status
  status: TradeStatus;
  error_message?: string;
  
  executed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTradeRequest {
  project_id: string;
  virtual_account_id?: string;
  source: {
    symbol: string;
    network?: string;
    amount: string;
  };
  destination: {
    symbol: string;
    network?: string;
  };
}

export interface MarketRate {
  from_symbol: string;
  to_symbol: string;
  rate: string;
  timestamp: Date;
}

// ==================== BALANCES ====================

export interface PSPBalance {
  id: string;
  project_id: string;
  virtual_account_id?: string;
  
  asset_type: AssetType;
  asset_symbol: string; // USD, USDC, ETH, BTC, etc.
  network?: string; // For crypto: ethereum, polygon, stellar, etc.
  
  // Balance breakdown
  available_balance: string;
  locked_balance: string;
  pending_balance: string;
  total_balance: string;
  
  // Warp wallet info
  warp_wallet_id?: string;
  wallet_address?: string;
  
  last_synced_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface WalletInfo {
  id: string;
  asset_symbol: string;
  network?: string;
  balance: string;
  locked: string;
  pending: string;
  total: string;
  address?: string; // For crypto wallets
  deposit_instructions?: any; // For fiat wallets
}

// ==================== PAYMENT SETTINGS ====================

export interface PSPPaymentSettings {
  id: string;
  project_id: string;
  
  // Automation settings
  automation_enabled: boolean;
  withdrawal_frequency: WithdrawalFrequency;
  
  // On-ramp instructions (USD to Crypto)
  onramp_enabled: boolean;
  onramp_target_asset?: string; // USDC, ETH, etc.
  onramp_target_network?: string; // ethereum, polygon, etc.
  onramp_target_wallet_id?: string;
  
  // Off-ramp instructions (Crypto to USD)
  offramp_enabled: boolean;
  offramp_target_currency?: string; // USD
  offramp_target_account_id?: string;
  
  // Default payment rails
  default_fiat_rail: PaymentRail;
  
  created_at: Date;
  updated_at: Date;
}

export interface UpdatePaymentSettingsRequest {
  project_id: string;
  automation_enabled?: boolean;
  withdrawal_frequency?: WithdrawalFrequency;
  onramp_enabled?: boolean;
  onramp_target_asset?: string;
  onramp_target_network?: string;
  onramp_target_wallet_id?: string;
  offramp_enabled?: boolean;
  offramp_target_currency?: string;
  offramp_target_account_id?: string;
  default_fiat_rail?: PaymentRail;
}

// ==================== TRANSACTIONS ====================

export interface TransactionHistoryQuery {
  project_id: string;
  virtual_account_id?: string;
  payment_type?: PaymentType;
  status?: PaymentStatus;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}

export interface TransactionSummary {
  id: string;
  type: PaymentType;
  direction: PaymentDirection;
  amount: string;
  currency: string;
  status: PaymentStatus;
  created_at: Date;
}

/**
 * Unified transaction type combining payments and trades
 * Used for transaction history and reporting
 */
export interface UnifiedTransaction {
  id: string;
  type: 'payment' | 'trade';
  subtype?: PaymentType | 'trade';
  direction?: PaymentDirection;
  status: string;
  amount: string;
  currency: string;
  source?: string;
  destination?: string;
  payment_rail?: PaymentRail;
  network?: string;
  memo?: string;
  created_at: Date;
  completed_at?: Date;
  failed_at?: Date;
  // Original record reference
  payment?: PSPPayment;
  trade?: PSPTrade;
}

// ==================== SERVICE RESPONSES ====================

export interface PSPServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface WarpApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}

// ==================== ENCRYPTION ====================

export interface EncryptedReference {
  vault_id: string; // UUID in key_vault_keys table
  key_id: string; // Human-readable identifier
}

export type PIIType = 'ssn' | 'id_number' | 'tax_id' | 'passport' | 'drivers_license';

// ==================== WARP API REQUEST/RESPONSE TYPES ====================

/**
 * Warp API responses follow this structure
 */
export interface WarpApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Warp webhook event payload structure
 */
export interface WarpWebhookEventPayload {
  id: string;
  eventName: WebhookEventName;
  createdAt: string;
  resources: string[];
}
