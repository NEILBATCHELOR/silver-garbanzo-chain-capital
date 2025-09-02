/**
 * Account Abstraction Services - EIP-4337 Implementation
 * 
 * Exports all Account Abstraction services for Chain Capital wallet infrastructure
 */

import { UserOperationService } from './UserOperationService'
import { PaymasterService } from './PaymasterService'
import { BatchOperationService } from './BatchOperationService'

export { UserOperationService } from './UserOperationService'
export { PaymasterService } from './PaymasterService'
export { BatchOperationService } from './BatchOperationService'

export * from './types'

// Service factory for dependency injection
export class AccountAbstractionServiceFactory {
  private static userOperationService: UserOperationService
  private static paymasterService: PaymasterService
  private static batchOperationService: BatchOperationService

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

  static getAllServices() {
    return {
      userOperation: this.getUserOperationService(),
      paymaster: this.getPaymasterService(),
      batchOperation: this.getBatchOperationService()
    }
  }
}
