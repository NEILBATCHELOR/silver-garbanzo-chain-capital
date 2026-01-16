/**
 * XRPL Key Rotation Types
 * Phase 14.2: Regular Key Management
 */

// Rotation Types
export type RotationType =
  | 'set_regular'
  | 'rotate'
  | 'remove'
  | 'disable_master'
  | 'enable_master'

// Key Configuration
export interface KeyConfiguration {
  regularKey?: string
  masterKeyDisabled: boolean
}

// Key Rotation Parameters
export interface KeyRotationParams {
  regularKey: string
  notes?: string
  rotationReason?: string
}

// Key Rotation Result
export interface KeyRotationResult {
  transactionHash: string
  newRegularKey?: string
  oldRegularKey?: string
  rotationType: RotationType
}

// Key Rotation History Entry
export interface KeyRotationHistory {
  id: string
  projectId: string
  accountAddress: string
  rotationType: RotationType
  oldRegularKey?: string
  newRegularKey?: string
  masterKeyDisabled: boolean
  transactionHash: string
  ledgerIndex?: number
  rotatedAt: Date
  notes?: string
  rotationReason?: string
}

// Key Rotation Policy
export interface KeyRotationPolicy {
  id: string
  projectId: string
  accountAddress: string
  rotationIntervalDays: number
  lastRotation?: Date
  nextRotationDue?: Date
  autoRotationEnabled: boolean
  notificationDaysBefore: number
  notificationSent: boolean
  createdAt: Date
  updatedAt: Date
}

// Account Key Configuration (database record)
export interface AccountKeyConfig {
  id: string
  projectId: string
  accountAddress: string
  hasRegularKey: boolean
  currentRegularKey?: string
  masterKeyDisabled: boolean
  lastVerified: Date
  createdAt: Date
  updatedAt: Date
}

// Policy Update Parameters
export interface PolicyUpdateParams {
  rotationIntervalDays?: number
  autoRotationEnabled?: boolean
  notificationDaysBefore?: number
}

// Rotation Due Alert
export interface RotationDueAlert {
  accountAddress: string
  policyId: string
  nextRotationDue: Date
  daysUntilDue: number
  autoRotationEnabled: boolean
}

// Key Rotation Stats
export interface KeyRotationStats {
  totalRotations: number
  lastRotationDate?: Date
  averageRotationInterval?: number
  accountsWithPolicies: number
  accountsWithRegularKeys: number
  accountsWithDisabledMaster: number
}
