/**
 * Multi-Signature Wallet Services
 * Export all multi-sig related services and types
 */

export { 
  MultiSigTransactionService,
  multiSigTransactionService
} from './MultiSigTransactionService';

export { SignatureAggregator } from './SignatureAggregator';
export { LocalSigner } from './LocalSigner';

// Re-export types
export type {
  MultiSigProposal,
  ProposalSignature,
  MultiSigWallet,
  SignatureRequirement,
  SignedMultiSigTransaction,
  MultiSigBroadcastResult
} from './MultiSigTransactionService';

export type {
  AggregatedSignature,
  EVMMultiSigData,
  BitcoinMultiSigScript
} from './SignatureAggregator';

export type {
  SigningMethod,
  LocalSignatureResult,
  HardwareWalletConfig
} from './LocalSigner';