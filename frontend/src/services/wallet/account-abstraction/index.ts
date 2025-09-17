/**
 * Account Abstraction Services - Frontend Integration
 * 
 * Provides frontend interfaces to EIP-4337 account abstraction functionality:
 * - Bundler management and monitoring
 * - Paymaster configuration and sponsorship
 * - Session key management
 * - User operation building and execution
 */

export { bundlerService, BundlerService } from './BundlerService'
export type {
  BundlerConfiguration,
  BundleOperation,
  BundleStatus,
  BundleAnalytics
} from './BundlerService'

// TODO: Add other services as they're implemented
// export { paymasterService, PaymasterService } from './PaymasterService'
// export { sessionKeyService, SessionKeyService } from './SessionKeyService'
// export { userOperationService, UserOperationService } from './UserOperationService'
