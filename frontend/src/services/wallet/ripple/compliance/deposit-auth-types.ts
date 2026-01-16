/**
 * XRPL Deposit Pre-Authorization Types
 * For KYC/AML compliance and authorized depositors
 */

export type AuthorizationType = 'address' | 'credential';
export type DepositAuthAction = 'authorize' | 'revoke' | 'modify';

/**
 * Parameters for enabling deposit authorization
 */
export interface EnableDepositAuthParams {
  requireDestinationTag?: boolean
}

/**
 * Parameters for authorizing a depositor by address
 */
export interface AuthorizeDepositorParams {
  authorizedAddress: string
  notes?: string
}

/**
 * Parameters for authorizing by credential
 */
export interface AuthorizeByCredentialParams {
  credentialIssuer: string
  credentialType: string
  notes?: string
}

/**
 * Parameters for revoking authorization
 */
export interface RevokeAuthorizationParams {
  unauthorizedAddress?: string
  credentialIssuer?: string
  credentialType?: string
  reason?: string
}

/**
 * Result from deposit auth operation
 */
export interface DepositAuthOperationResult {
  transactionHash: string
}

/**
 * Authorized depositor info
 */
export interface AuthorizedDepositor {
  address?: string
  credentialIssuer?: string
  credentialType?: string
  authorizedAt: string
  isActive: boolean
}

/**
 * Database record for deposit authorization
 */
export interface DepositAuthorizationRecord {
  id?: string
  project_id: string
  account_address: string
  authorized_address: string
  authorization_type: AuthorizationType
  credential_issuer?: string
  credential_type?: string
  is_active: boolean
  authorized_at?: string
  authorization_transaction_hash: string
  revoked_at?: string
  revocation_transaction_hash?: string
  authorized_by?: string
  revoked_by?: string
  notes?: string
  metadata?: Record<string, any>
}

/**
 * Database record for deposit authorization history
 */
export interface DepositAuthHistoryRecord {
  id?: string
  authorization_id: string
  action: DepositAuthAction
  transaction_hash: string
  performed_at?: string
  performed_by?: string
  notes?: string
}

/**
 * Database record for deposit auth requirements
 */
export interface DepositAuthRequirementsRecord {
  id?: string
  project_id: string
  account_address: string
  deposit_auth_enabled: boolean
  require_authorization: boolean
  require_destination_tag: boolean
  enabled_at?: string
  enabled_transaction_hash?: string
  disabled_at?: string
  disabled_transaction_hash?: string
  updated_at?: string
}
