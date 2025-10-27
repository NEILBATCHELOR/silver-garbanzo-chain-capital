/**
 * PSP Model Mappers
 * 
 * Utilities for converting database models to API types
 * Handles Decimal to string conversions for type safety
 */

import { Decimal } from '@prisma/client/runtime/library'
import { decimalToString, decimalToStringOrNull } from '../../../utils/decimal-helpers'
import type { PSPPayment, PSPTrade } from '../../../types/psp'

/**
 * Database payment type (from Prisma)
 */
interface DatabasePayment {
  id: string
  project_id: string
  warp_payment_id: string | null
  payment_type: string
  direction: string
  source_type: string | null
  source_id: string | null
  destination_type: string | null
  destination_id: string | null
  amount: Decimal
  currency: string
  network: string | null
  asset_symbol: string | null
  payment_rail: string | null
  status: string
  error_code: string | null
  error_message: string | null
  memo: string | null
  idempotency_key: string | null
  metadata: any
  initiated_at: Date | null
  completed_at: Date | null
  failed_at: Date | null
  created_at: Date | null
  updated_at: Date | null
}

/**
 * Database trade type (from Prisma)
 */
interface DatabaseTrade {
  id: string
  project_id: string
  warp_trade_id: string | null
  virtual_account_id: string | null
  source_symbol: string
  source_network: string | null
  source_amount: Decimal
  destination_symbol: string
  destination_network: string | null
  destination_amount: Decimal | null
  exchange_rate: Decimal | null
  fee_amount: Decimal | null
  fee_currency: string | null
  status: string
  error_message: string | null
  created_at: Date | null
  updated_at: Date | null
  executed_at: Date | null
}

/**
 * Convert database payment model to API PSPPayment type
 */
export function mapPaymentToApiType(dbPayment: DatabasePayment): PSPPayment {
  return {
    id: dbPayment.id,
    project_id: dbPayment.project_id,
    warp_payment_id: dbPayment.warp_payment_id || undefined,
    payment_type: dbPayment.payment_type as any,
    direction: dbPayment.direction as any,
    source_type: dbPayment.source_type as any,
    source_id: dbPayment.source_id || undefined,
    destination_type: dbPayment.destination_type as any,
    destination_id: dbPayment.destination_id || undefined,
    amount: decimalToString(dbPayment.amount),
    currency: dbPayment.currency,
    network: dbPayment.network || undefined,
    asset_symbol: dbPayment.asset_symbol || undefined,
    payment_rail: dbPayment.payment_rail as any,
    status: dbPayment.status as any,
    error_code: dbPayment.error_code || undefined,
    error_message: dbPayment.error_message || undefined,
    memo: dbPayment.memo || undefined,
    idempotency_key: dbPayment.idempotency_key || undefined,
    metadata: dbPayment.metadata,
    initiated_at: dbPayment.initiated_at || new Date(),
    completed_at: dbPayment.completed_at || undefined,
    failed_at: dbPayment.failed_at || undefined,
    created_at: dbPayment.created_at || new Date(),
    updated_at: dbPayment.updated_at || new Date()
  }
}

/**
 * Convert array of database payments to API types
 */
export function mapPaymentsToApiType(dbPayments: DatabasePayment[]): PSPPayment[] {
  return dbPayments.map(mapPaymentToApiType)
}

/**
 * Convert database trade model to API PSPTrade type
 */
export function mapTradeToApiType(dbTrade: DatabaseTrade): PSPTrade {
  return {
    id: dbTrade.id,
    project_id: dbTrade.project_id,
    warp_trade_id: dbTrade.warp_trade_id || undefined,
    virtual_account_id: dbTrade.virtual_account_id || undefined,
    source_symbol: dbTrade.source_symbol,
    source_network: dbTrade.source_network || undefined,
    source_amount: decimalToString(dbTrade.source_amount),
    destination_symbol: dbTrade.destination_symbol,
    destination_network: dbTrade.destination_network || undefined,
    destination_amount: decimalToStringOrNull(dbTrade.destination_amount) || undefined,
    exchange_rate: decimalToStringOrNull(dbTrade.exchange_rate) || undefined,
    fee_amount: decimalToStringOrNull(dbTrade.fee_amount) || undefined,
    fee_currency: dbTrade.fee_currency || undefined,
    status: dbTrade.status as any,
    error_message: dbTrade.error_message || undefined,
    created_at: dbTrade.created_at || new Date(),
    updated_at: dbTrade.updated_at || new Date(),
    executed_at: dbTrade.executed_at || undefined
  }
}

/**
 * Convert array of database trades to API types
 */
export function mapTradesToApiType(dbTrades: DatabaseTrade[]): PSPTrade[] {
  return dbTrades.map(mapTradeToApiType)
}
