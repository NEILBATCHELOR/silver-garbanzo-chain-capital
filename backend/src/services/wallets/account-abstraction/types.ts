/**
 * Account Abstraction Types
 * 
 * EIP-4337 Account Abstraction type definitions for UserOperations,
 * Paymasters, and EntryPoint interactions
 */

export interface UserOperation {
  sender: string                   // Smart contract wallet address
  nonce: string                   // Anti-replay nonce (hex string)
  initCode: string                // Wallet creation code (if not deployed)
  callData: string                // Function call data
  callGasLimit: string            // Gas limit for execution (hex string)
  verificationGasLimit: string    // Gas limit for verification (hex string)
  preVerificationGas: string      // Gas for pre-verification (hex string)
  maxFeePerGas: string           // EIP-1559 fee cap (hex string)
  maxPriorityFeePerGas: string   // EIP-1559 priority fee (hex string)
  paymasterAndData: string       // Paymaster info (for gasless txns)
  signature: string              // Signature data
}

export interface UserOperationReceipt {
  userOpHash: string
  entryPoint: string
  sender: string
  nonce: string
  paymaster?: string
  actualGasCost: string
  actualGasUsed: string
  success: boolean
  reason?: string
  receipt: {
    transactionHash: string
    transactionIndex: number
    blockHash: string
    blockNumber: number
    from: string
    to?: string
    cumulativeGasUsed: string
    gasUsed: string
    contractAddress?: string
    logs: any[]
    status: number
  }
}

export interface PaymasterData {
  paymaster: string
  paymasterVerificationGasLimit: string
  paymasterPostOpGasLimit: string
  paymasterData?: string
}

export interface GasEstimate {
  callGasLimit: string
  verificationGasLimit: string
  preVerificationGas: string
  paymasterVerificationGasLimit?: string
  paymasterPostOpGasLimit?: string
}

export interface BatchOperation {
  target: string
  value: string
  data: string
}

export interface BatchUserOperationRequest {
  walletAddress: string
  operations: BatchOperation[]
  paymasterPolicy?: PaymasterPolicy
  gasPolicy?: GasPolicy
}

export interface PaymasterPolicy {
  type: 'sponsor_all' | 'sponsor_partial' | 'user_pays'
  sponsorAddress?: string
  maxGasSponsored?: string
  conditions?: PaymasterCondition[]
}

export interface PaymasterCondition {
  type: 'max_value' | 'allowed_targets' | 'time_limit'
  value: string | string[] | number
}

export interface GasPolicy {
  priorityLevel: 'low' | 'medium' | 'high' | 'urgent'
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  gasLimitMultiplier?: number
}

export interface UserOperationStatus {
  userOpHash: string
  status: 'pending' | 'included' | 'failed' | 'cancelled'
  transactionHash?: string
  blockNumber?: number
  gasUsed?: string
  actualGasCost?: string
  reason?: string
  createdAt: Date
  updatedAt: Date
}

export interface EntryPointConfig {
  address: string
  version: string
  chainId: number
  supportedWalletFactories: string[]
  supportedPaymasters: string[]
}

export interface SmartAccountConfig {
  factoryAddress: string
  implementationAddress: string
  initCodeHash: string
  upgradeability: boolean
  modules: string[]
}

export interface UserOperationBuilder {
  walletAddress: string
  operations: BatchOperation[]
  paymasterPolicy?: PaymasterPolicy
  gasPolicy?: GasPolicy
  nonceKey?: number
}

export interface UserOperationValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  gasEstimate?: GasEstimate
  paymasterData?: PaymasterData
}

export interface ValidationError {
  code: string
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  code: string
  field: string
  message: string
  suggestion?: string
}

export interface AccountAbstractionMetrics {
  totalUserOps: number
  successfulUserOps: number
  failedUserOps: number
  averageGasUsed: string
  totalGasSponsored: string
  paymasterUsage: Record<string, number>
  walletTypes: Record<string, number>
}

// Database entities

export interface UserOperationRecord {
  id: string
  user_op_hash: string
  wallet_id: string
  sender_address: string
  nonce: string
  init_code: string
  call_data: string
  call_gas_limit: string
  verification_gas_limit: string
  pre_verification_gas: string
  max_fee_per_gas: string
  max_priority_fee_per_gas: string
  paymaster_and_data: string
  signature_data: string
  status: 'pending' | 'included' | 'failed' | 'cancelled'
  transaction_hash?: string
  block_number?: number
  gas_used?: string
  actual_gas_cost?: string
  failure_reason?: string
  created_at: Date
  updated_at: Date
}

export interface PaymasterOperationRecord {
  id: string
  user_operation_id: string
  paymaster_address: string
  paymaster_data: string
  verification_gas_limit: string
  post_op_gas_limit: string
  gas_sponsored: string
  sponsor_address?: string
  policy_applied: string
  created_at: Date
}

export interface BatchOperationRecord {
  id: string
  user_operation_id: string
  operation_index: number
  target_address: string
  value: string
  call_data: string
  success: boolean
  return_data?: string
  gas_used?: string
  created_at: Date
}

// Service response types

export interface CreateUserOperationResponse {
  userOpHash: string
  userOperation: UserOperation
  gasEstimate: GasEstimate
  paymasterData?: PaymasterData
  validUntil?: number
}

export interface SendUserOperationResponse {
  userOpHash: string
  status: 'submitted' | 'failed'
  transactionHash?: string
  estimatedConfirmationTime?: number
}

export interface UserOperationAnalytics {
  walletId: string
  totalOperations: number
  successRate: number
  averageGasUsed: string
  totalGasSponsored: string
  operationTypes: Record<string, number>
  timeframe: {
    from: Date
    to: Date
  }
}
