/**
 * PSP Type Converters
 * 
 * Utilities for converting between Prisma database types and PSP domain types.
 * Handles Decimal ↔ String conversions and nullable field transformations.
 */

import { Decimal } from 'decimal.js'
import type {
  psp_balances,
  psp_payments,
  psp_trades,
  psp_external_accounts,
  psp_virtual_accounts,
  psp_payment_settings
} from '@/infrastructure/database/generated'
import type {
  PSPBalance,
  PSPPayment,
  PSPTrade,
  PSPExternalAccount,
  PSPVirtualAccount,
  PSPPaymentSettings,
  PaymentRail,
  DepositInstructions
} from '@/types/psp'

// ==================== DECIMAL CONVERSION ====================

/**
 * Convert Prisma Decimal to string
 * Returns '0' if value is null/undefined
 */
export function decimalToString(value: Decimal | null | undefined): string {
  if (!value) return '0'
  return value.toString()
}

/**
 * Convert string to Decimal for database operations
 */
export function stringToDecimal(value: string): Decimal {
  return new Decimal(value)
}

/**
 * Convert nullable Decimal to optional string
 */
export function decimalToOptionalString(value: Decimal | null | undefined): string | undefined {
  if (!value) return undefined
  return value.toString()
}

// ==================== BALANCE CONVERSION ====================

/**
 * Convert database balance record to PSP Balance type
 */
export function convertDbBalanceToPSPBalance(dbBalance: psp_balances): PSPBalance {
  return {
    id: dbBalance.id,
    project_id: dbBalance.project_id,
    virtual_account_id: dbBalance.virtual_account_id ?? undefined,
    asset_type: dbBalance.asset_type as 'fiat' | 'crypto',
    asset_symbol: dbBalance.asset_symbol,
    network: dbBalance.network ?? undefined,
    available_balance: decimalToString(dbBalance.available_balance),
    locked_balance: decimalToString(dbBalance.locked_balance),
    pending_balance: decimalToString(dbBalance.pending_balance),
    total_balance: decimalToString(dbBalance.total_balance),
    warp_wallet_id: dbBalance.warp_wallet_id ?? undefined,
    wallet_address: dbBalance.wallet_address ?? undefined,
    last_synced_at: dbBalance.last_synced_at ?? undefined,
    created_at: dbBalance.created_at ?? new Date(),
    updated_at: dbBalance.updated_at ?? new Date()
  }
}

// ==================== PAYMENT CONVERSION ====================

/**
 * Convert database payment record to PSP Payment type
 */
export function convertDbPaymentToPSPPayment(dbPayment: psp_payments): PSPPayment {
  return {
    id: dbPayment.id,
    project_id: dbPayment.project_id,
    warp_payment_id: dbPayment.warp_payment_id ?? undefined,
    payment_type: dbPayment.payment_type as PSPPayment['payment_type'],
    direction: dbPayment.direction as PSPPayment['direction'],
    source_type: dbPayment.source_type as PSPPayment['source_type'],
    source_id: dbPayment.source_id ?? undefined,
    destination_type: dbPayment.destination_type as PSPPayment['destination_type'],
    destination_id: dbPayment.destination_id ?? undefined,
    amount: decimalToString(dbPayment.amount),
    currency: dbPayment.currency,
    network: dbPayment.network ?? undefined,
    asset_symbol: dbPayment.asset_symbol ?? undefined,
    payment_rail: dbPayment.payment_rail as PaymentRail | undefined,
    status: dbPayment.status as PSPPayment['status'],
    error_code: dbPayment.error_code ?? undefined,
    error_message: dbPayment.error_message ?? undefined,
    memo: dbPayment.memo ?? undefined,
    idempotency_key: dbPayment.idempotency_key ?? undefined,
    metadata: dbPayment.metadata ?? undefined,
    initiated_at: dbPayment.initiated_at ?? new Date(),
    completed_at: dbPayment.completed_at ?? undefined,
    failed_at: dbPayment.failed_at ?? undefined,
    created_at: dbPayment.created_at ?? new Date(),
    updated_at: dbPayment.updated_at ?? new Date()
  }
}

// ==================== TRADE CONVERSION ====================

/**
 * Convert database trade record to PSP Trade type
 */
export function convertDbTradeToPSPTrade(dbTrade: psp_trades): PSPTrade {
  return {
    id: dbTrade.id,
    project_id: dbTrade.project_id,
    warp_trade_id: dbTrade.warp_trade_id ?? undefined,
    virtual_account_id: dbTrade.virtual_account_id ?? undefined,
    source_symbol: dbTrade.source_symbol,
    source_network: dbTrade.source_network ?? undefined,
    source_amount: decimalToString(dbTrade.source_amount),
    destination_symbol: dbTrade.destination_symbol,
    destination_network: dbTrade.destination_network ?? undefined,
    destination_amount: decimalToOptionalString(dbTrade.destination_amount),
    exchange_rate: decimalToOptionalString(dbTrade.exchange_rate),
    fee_amount: decimalToOptionalString(dbTrade.fee_amount),
    fee_currency: dbTrade.fee_currency ?? undefined,
    status: dbTrade.status as PSPTrade['status'],
    error_message: dbTrade.error_message ?? undefined,
    executed_at: dbTrade.executed_at ?? undefined,
    created_at: dbTrade.created_at ?? new Date(),
    updated_at: dbTrade.updated_at ?? new Date()
  }
}

// ==================== EXTERNAL ACCOUNT CONVERSION ====================

/**
 * Convert database external account to PSP External Account type
 */
export function convertDbExternalAccountToPSPExternalAccount(
  dbAccount: psp_external_accounts
): PSPExternalAccount {
  return {
    id: dbAccount.id,
    project_id: dbAccount.project_id,
    warp_account_id: dbAccount.warp_account_id ?? undefined,
    account_type: dbAccount.account_type as PSPExternalAccount['account_type'],
    currency_type: dbAccount.currency_type as PSPExternalAccount['currency_type'],
    routing_number: undefined, // Encrypted in vault, not directly accessible
    account_number_last4: dbAccount.account_number_last4 ?? undefined,
    account_holder_name: dbAccount.account_holder_name ?? undefined,
    bank_name: dbAccount.bank_name ?? undefined,
    account_classification: dbAccount.account_classification as PSPExternalAccount['account_classification'],
    transfer_method: dbAccount.transfer_method as PSPExternalAccount['transfer_method'],
    network: dbAccount.network ?? undefined,
    wallet_address: dbAccount.wallet_address ?? undefined,
    description: dbAccount.description,
    status: dbAccount.status as PSPExternalAccount['status'],
    metadata: dbAccount.metadata ?? undefined,
    created_at: dbAccount.created_at ?? new Date(),
    updated_at: dbAccount.updated_at ?? new Date()
  }
}

// ==================== VIRTUAL ACCOUNT CONVERSION ====================

/**
 * Convert database virtual account to PSP Virtual Account type
 */
export function convertDbVirtualAccountToPSPVirtualAccount(
  dbAccount: psp_virtual_accounts
): PSPVirtualAccount {
  // Helper to safely convert JsonValue to DepositInstructions
  const parseDepositInstructions = (value: any): DepositInstructions | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    // Type-cast after validation
    return value as DepositInstructions;
  };

  return {
    id: dbAccount.id,
    project_id: dbAccount.project_id,
    warp_virtual_account_id: dbAccount.warp_virtual_account_id ?? undefined,
    identity_case_id: dbAccount.identity_case_id ?? undefined,
    account_name: dbAccount.account_name,
    account_type: dbAccount.account_type as PSPVirtualAccount['account_type'],
    status: dbAccount.status as PSPVirtualAccount['status'],
    balances: dbAccount.balances ?? undefined,
    deposit_instructions: parseDepositInstructions(dbAccount.deposit_instructions),
    created_at: dbAccount.created_at ?? new Date(),
    updated_at: dbAccount.updated_at ?? new Date()
  }
}

// ==================== PAYMENT SETTINGS CONVERSION ====================

/**
 * Convert database payment settings to PSP Payment Settings type
 */
export function convertDbPaymentSettingsToPSPPaymentSettings(
  dbSettings: psp_payment_settings
): PSPPaymentSettings {
  return {
    id: dbSettings.id,
    project_id: dbSettings.project_id,
    automation_enabled: dbSettings.automation_enabled ?? false,
    withdrawal_frequency: dbSettings.withdrawal_frequency as PSPPaymentSettings['withdrawal_frequency'],
    onramp_enabled: dbSettings.onramp_enabled ?? false,
    onramp_target_asset: dbSettings.onramp_target_asset ?? undefined,
    onramp_target_network: dbSettings.onramp_target_network ?? undefined,
    onramp_target_wallet_id: dbSettings.onramp_target_wallet_id ?? undefined,
    offramp_enabled: dbSettings.offramp_enabled ?? false,
    offramp_target_currency: dbSettings.offramp_target_currency ?? undefined,
    offramp_target_account_id: dbSettings.offramp_target_account_id ?? undefined,
    default_fiat_rail: dbSettings.default_fiat_rail as PaymentRail,
    created_at: dbSettings.created_at ?? new Date(),
    updated_at: dbSettings.updated_at ?? new Date()
  }
}

// ==================== JSON CONVERSION ====================

/**
 * Safely convert value to JSON-compatible format for Prisma InputJsonValue
 */
export function toInputJsonValue(value: any): any {
  if (value === null || value === undefined) {
    return null
  }
  
  // Convert objects to plain JSON
  return JSON.parse(JSON.stringify(value))
}

// ==================== BATCH CONVERSIONS ====================

/**
 * Convert array of database balances to PSP Balances
 */
export function convertDbBalancesToPSPBalances(dbBalances: psp_balances[]): PSPBalance[] {
  return dbBalances.map(convertDbBalanceToPSPBalance)
}

/**
 * Convert array of database payments to PSP Payments
 */
export function convertDbPaymentsToPSPPayments(dbPayments: psp_payments[]): PSPPayment[] {
  return dbPayments.map(convertDbPaymentToPSPPayment)
}

/**
 * Convert array of database trades to PSP Trades
 */
export function convertDbTradesToPSPTrades(dbTrades: psp_trades[]): PSPTrade[] {
  return dbTrades.map(convertDbTradeToPSPTrade)
}
