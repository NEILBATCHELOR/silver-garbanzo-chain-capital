/**
 * XRPL Asset Freeze Types
 * For compliance and regulatory controls
 */

export type FreezeType = 'global' | 'individual' | 'no_freeze';
export type FreezeAction = 'enable' | 'disable' | 'set';

/**
 * Parameters for enabling global freeze
 */
export interface EnableGlobalFreezeParams {
  reason?: string
  notes?: string
}

/**
 * Parameters for disabling global freeze
 */
export interface DisableGlobalFreezeParams {
  reason?: string
  notes?: string
}

/**
 * Parameters for freezing individual trust line
 */
export interface FreezeTrustLineParams {
  holderAddress: string
  currency: string
  reason?: string
  notes?: string
}

/**
 * Parameters for unfreezing individual trust line
 */
export interface UnfreezeTrustLineParams {
  holderAddress: string
  currency: string
  reason?: string
  notes?: string
}

/**
 * Result from freeze operation
 */
export interface FreezeOperationResult {
  transactionHash: string
  warning?: string
}

/**
 * Freeze status for an account
 */
export interface FreezeStatus {
  globalFreezeEnabled: boolean
  noFreezeEnabled: boolean
  warning?: string
}

/**
 * Individual trust line freeze status
 */
export interface TrustLineFreezeStatus {
  isFrozen: boolean
  reason?: string
  frozenAt?: string
  frozenBy?: string
}

/**
 * Database record for freeze event
 */
export interface FreezeEventRecord {
  id?: string
  project_id: string
  issuer_address: string
  freeze_type: FreezeType
  holder_address?: string
  currency?: string
  action: FreezeAction
  reason?: string
  notes?: string
  transaction_hash: string
  created_at?: string
  metadata?: Record<string, any>
}

/**
 * Database record for frozen trust line
 */
export interface FrozenTrustLineRecord {
  id?: string
  project_id: string
  issuer_address: string
  holder_address: string
  currency: string
  is_frozen: boolean
  freeze_reason?: string
  frozen_at?: string
  frozen_transaction_hash: string
  unfrozen_at?: string
  unfrozen_transaction_hash?: string
  frozen_by?: string
  unfrozen_by?: string
}

/**
 * Database record for account freeze status
 */
export interface AccountFreezeStatusRecord {
  id?: string
  project_id: string
  account_address: string
  global_freeze_enabled: boolean
  no_freeze_enabled: boolean
  global_freeze_set_at?: string
  global_freeze_set_hash?: string
  global_freeze_cleared_at?: string
  global_freeze_cleared_hash?: string
  no_freeze_set_at?: string
  no_freeze_set_hash?: string
  updated_at?: string
}
