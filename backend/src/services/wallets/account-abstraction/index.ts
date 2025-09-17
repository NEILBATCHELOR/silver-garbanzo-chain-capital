/**
 * Account Abstraction Services - EIP-4337 Implementation
 * 
 * Exports all Account Abstraction services for Chain Capital wallet infrastructure
 */

import { UserOperationService } from './UserOperationService'
import { PaymasterService } from './PaymasterService'
import { BatchOperationService } from './BatchOperationService'
import { BundlerService } from './BundlerService'
import { SessionKeyService } from './SessionKeyService'

export { UserOperationService } from './UserOperationService'
export { PaymasterService } from './PaymasterService'
export { BatchOperationService } from './BatchOperationService'
export { BundlerService } from './BundlerService'
export { SessionKeyService } from './SessionKeyService'

export * from './types'

// Service factory for dependency injection
export class AccountAbstractionServiceFactory {
  private static userOperationService: UserOperationService
  private static paymasterService: PaymasterService
  private static batchOperationService: BatchOperationService
  private static bundlerService: BundlerService
  private static sessionKeyService: SessionKeyService

  static getUserOperationService(): UserOperationService {
    if (!this.userOperationService) {
      this.userOperationService = new UserOperationService()
    }
    return this.userOperationService
  }

  static getPaymasterService(): PaymasterService {
    if (!this.paymasterService) {
      this.paymasterService = new PaymasterService()
    }
    return this.paymasterService
  }

  static getBatchOperationService(): BatchOperationService {
    if (!this.batchOperationService) {
      this.batchOperationService = new BatchOperationService()
    }
    return this.batchOperationService
  }

  static getBundlerService(): BundlerService {
    if (!this.bundlerService) {
      this.bundlerService = new BundlerService()
    }
    return this.bundlerService
  }

  static getSessionKeyService(): SessionKeyService {
    if (!this.sessionKeyService) {
      this.sessionKeyService = new SessionKeyService()
    }
    return this.sessionKeyService
  }

  static getAllServices() {
    return {
      userOperation: this.getUserOperationService(),
      paymaster: this.getPaymasterService(),
      batchOperation: this.getBatchOperationService(),
      bundler: this.getBundlerService(),
      sessionKey: this.getSessionKeyService()
    }
  }
}
