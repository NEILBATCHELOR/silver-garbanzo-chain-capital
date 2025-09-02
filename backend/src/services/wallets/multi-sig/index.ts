// Multi-Signature Wallet Services - Phase 3C Implementation
// Fixed: Lazy initialization to prevent database timing issues

export * from './types'
export { MultiSigWalletService } from './MultiSigWalletService'
export { TransactionProposalService } from './TransactionProposalService'
export { MultiSigSigningService } from './MultiSigSigningService'
export { GnosisSafeService } from './GnosisSafeService'

// Service classes for lazy instantiation
import { MultiSigWalletService } from './MultiSigWalletService'
import { TransactionProposalService } from './TransactionProposalService'
import { MultiSigSigningService } from './MultiSigSigningService'
import { GnosisSafeService } from './GnosisSafeService'

// Lazy initialized service instances (created only when first accessed)
let _multiSigWalletService: MultiSigWalletService | null = null
let _transactionProposalService: TransactionProposalService | null = null
let _multiSigSigningService: MultiSigSigningService | null = null
let _gnosisSafeService: GnosisSafeService | null = null

// Lazy service getters - only instantiate when first called
export const multiSigWalletService = {
  get instance(): MultiSigWalletService {
    if (!_multiSigWalletService) {
      _multiSigWalletService = new MultiSigWalletService()
    }
    return _multiSigWalletService
  }
}

export const transactionProposalService = {
  get instance(): TransactionProposalService {
    if (!_transactionProposalService) {
      _transactionProposalService = new TransactionProposalService()
    }
    return _transactionProposalService
  }
}

export const multiSigSigningService = {
  get instance(): MultiSigSigningService {
    if (!_multiSigSigningService) {
      _multiSigSigningService = new MultiSigSigningService()
    }
    return _multiSigSigningService
  }
}

export const gnosisSafeService = {
  get instance(): GnosisSafeService {
    if (!_gnosisSafeService) {
      _gnosisSafeService = new GnosisSafeService()
    }
    return _gnosisSafeService
  }
}

// Service factory for multi-sig operations with lazy initialization
export class MultiSigServiceFactory {
  static getWalletService(): MultiSigWalletService {
    return multiSigWalletService.instance
  }

  static getProposalService(): TransactionProposalService {
    return transactionProposalService.instance
  }

  static getSigningService(): MultiSigSigningService {
    return multiSigSigningService.instance
  }

  static getGnosisSafeService(): GnosisSafeService {
    return gnosisSafeService.instance
  }

  static getAllServices() {
    return {
      walletService: multiSigWalletService.instance,
      proposalService: transactionProposalService.instance,
      signingService: multiSigSigningService.instance,
      gnosisSafeService: gnosisSafeService.instance
    }
  }

  // Reset services (useful for testing)
  static resetServices() {
    _multiSigWalletService = null
    _transactionProposalService = null
    _multiSigSigningService = null
    _gnosisSafeService = null
  }
}

// Default export for convenience
export default MultiSigServiceFactory
