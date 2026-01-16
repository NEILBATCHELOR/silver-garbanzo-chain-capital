/**
 * XRPL Phase 16: Enterprise & Advanced Features - Type Definitions (SDK Compliant)
 * 
 * This file contains all types for:
 * - Account Delegation
 * - Account Configuration
 * - Transaction Reliability (Tickets, Submission, Verification)
 */

import type { 
  AccountSet,
  TicketCreate,
  TransactionMetadata,
  TxResponse
} from 'xrpl'

// ============================================================================
// ACCOUNT DELEGATION TYPES
// ============================================================================

export interface DelegatePermission {
  Permission: {
    PermissionValue: string
  }
}

export interface DelegateSetParams {
  delegatorAddress: string
  delegateAddress: string
  permissions: DelegatePermission[]
}

export interface DelegationInfo {
  id: string
  projectId: string
  delegatorAddress: string
  delegateAddress: string
  permissions: DelegatePermission[]
  status: 'active' | 'revoked'
  setupTransactionHash: string
  revocationTransactionHash?: string
  createdAt: Date
  revokedAt?: Date
  updatedAt: Date
}

export interface DelegateUsageRecord {
  id: string
  delegatePermissionId: string
  transactionType: string
  transactionHash: string
  permissionUsed: string
  result: string
  errorMessage?: string
  ledgerIndex?: number
  timestamp: Date
}

// ============================================================================
// ACCOUNT CONFIGURATION TYPES
// ============================================================================

export interface AccountFlags {
  requireDestinationTag: boolean
  requireAuthorization: boolean
  disallowIncomingXRP: boolean
  disableMasterKey: boolean
  noFreeze: boolean
  globalFreeze: boolean
  defaultRipple: boolean
  depositAuth: boolean
  disallowIncomingNFTokenOffer: boolean
  disallowIncomingCheck: boolean
  disallowIncomingPayChan: boolean
  disallowIncomingTrustline: boolean
  allowTrustLineClawback: boolean // Correct casing
}

export interface SignerEntry {
  Account: string
  SignerWeight: number
}

export interface AccountSettings {
  domain?: string
  emailHash?: string
  messageKey?: string
  tickSize?: number // 3-15
  transferRate?: number // 1000000000-2000000000
}

export interface AccountConfiguration {
  id: string
  projectId: string
  accountAddress: string
  flags: AccountFlags
  settings: AccountSettings
  signerQuorum: number
  signerList: SignerEntry[]
  lastUpdatedTransactionHash?: string
  createdAt: Date
  updatedAt: Date
}

export interface AccountConfigurationParams {
  accountAddress: string
  flags?: Partial<AccountFlags>
  settings?: AccountSettings
  signerQuorum?: number
  signerList?: SignerEntry[]
}

export interface AccountConfigChange {
  id: string
  accountConfigId: string
  changeType: 'flag_set' | 'flag_clear' | 'domain_set' | 'signer_list_set' | 'settings_update'
  fieldChanged: string
  oldValue?: string
  newValue?: string
  transactionHash: string
  ledgerIndex?: number
  changedBy: string
  changedAt: Date
}

export interface BlackholeAccountInfo {
  id: string
  projectId: string
  accountAddress: string
  blackholeAddress: string
  setRegularKeyHash: string
  disableMasterKeyHash: string
  isBlackholed: boolean
  verificationLedgerIndex?: number
  reason?: string
  blackholedAt: Date
}

export interface BlackholeAccountParams {
  accountAddress: string
  reason?: string
}

// ============================================================================
// TRANSACTION RELIABILITY TYPES
// ============================================================================

// Transaction Tickets
export interface TransactionTicket {
  id: string
  projectId: string
  accountAddress: string
  ticketSequence: number
  status: 'available' | 'used' | 'expired'
  usedInTransactionHash?: string
  usedAt?: Date
  creationTransactionHash: string
  createdAt: Date
}

export interface TicketCreateParams {
  accountAddress: string
  ticketCount: number
}

export interface TicketCreateResult {
  transactionHash: string
  ticketSequences: number[]
  firstTicketSequence: number
  lastTicketSequence: number
}

// Transaction Submission
export interface TransactionSubmissionParams {
  transactionType: string
  accountAddress: string
  transactionJson: Record<string, any>
  ticketSequence?: number
  maxRetries?: number
  retryDelay?: number
}

export interface TransactionSubmission {
  id: string
  projectId: string
  transactionHash: string
  transactionType: string
  accountAddress: string
  sequenceNumber?: number
  ticketSequence?: number
  lastLedgerSequence?: number
  status: 'pending' | 'submitted' | 'validated' | 'failed' | 'expired'
  result?: string
  submissionAttempts: number
  firstSubmittedAt: Date
  lastSubmittedAt: Date
  validatedAt?: Date
  includedInLedger?: number
  ledgerSequence?: number
  transactionJson: Record<string, any>
  signedTransactionBlob?: string
  errorCode?: string
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

export interface TransactionRetryAttempt {
  id: string
  submissionId: string
  attemptNumber: number
  attemptedAt: Date
  result?: string
  errorCode?: string
  errorMessage?: string
  ledgerSequence?: number
  notes?: string
}

// Transaction Verification
export interface TransactionVerificationParams {
  transactionHash: string
  verificationMethod?: 'account_sequence' | 'ledger_scan' | 'tx_lookup'
}

export interface TransactionVerification {
  id: string
  submissionId: string
  verifiedAt: Date
  verificationMethod: 'account_sequence' | 'ledger_scan' | 'tx_lookup'
  isValidated: boolean
  isSuccessful?: boolean
  transactionResult?: string
  ledgerIndex?: number
  ledgerHash?: string
  metadata?: Record<string, any>
}

// Submit and Verify
export interface SubmitAndVerifyParams {
  transactionType: string
  accountAddress: string
  transactionJson: Record<string, any>
  waitForValidation?: boolean
  maxWaitTime?: number
  verificationMethod?: 'account_sequence' | 'ledger_scan' | 'tx_lookup'
}

export interface SubmitAndVerifyResult {
  submission: TransactionSubmission
  verification?: TransactionVerification
  isValidated: boolean
  isSuccessful: boolean
  transactionResult?: string
}

// ============================================================================
// SDK RESPONSE HELPERS
// ============================================================================

/**
 * Type guard to check if metadata contains TransactionResult
 */
export function hasTransactionResult(meta: any): meta is { TransactionResult: string } {
  return typeof meta === 'object' && meta !== null && 'TransactionResult' in meta
}

/**
 * Safely extract transaction result from metadata
 */
export function getTransactionResult(response: TxResponse<any>): string | undefined {
  const meta = response.result.meta
  if (hasTransactionResult(meta)) {
    return meta.TransactionResult
  }
  return undefined
}

// Account Set Flags (from XRPL)
export enum AccountSetAsfFlags {
  asfRequireDest = 1,
  asfRequireAuth = 2,
  asfDisallowXRP = 3,
  asfDisableMaster = 4,
  asfAccountTxnID = 5,
  asfNoFreeze = 6,
  asfGlobalFreeze = 7,
  asfDefaultRipple = 8,
  asfDepositAuth = 9,
  asfAuthorizedNFTokenMinter = 10,
  asfDisallowIncomingNFTokenOffer = 12,
  asfDisallowIncomingCheck = 13,
  asfDisallowIncomingPayChan = 14,
  asfDisallowIncomingTrustline = 15,
  asfAllowTrustLineClawback = 16
}

// Permission Values for Delegation
export enum DelegatePermissionValue {
  AccountDomainSet = 'AccountDomainSet',
  AccountEmailHashSet = 'AccountEmailHashSet',
  AccountMessageKeySet = 'AccountMessageKeySet',
  AccountTransferRateSet = 'AccountTransferRateSet',
  AccountTickSizeSet = 'AccountTickSizeSet',
  // Add more as needed
}
