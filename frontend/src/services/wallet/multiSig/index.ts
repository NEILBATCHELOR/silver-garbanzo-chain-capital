/**
 * Multi-Signature Wallet Services
 * Export all multi-sig related services and types
 * Integrates with: validator, rpc, abi, adapter infrastructure
 */

export { 
  MultiSigTransactionService,
  multiSigTransactionService
} from './MultiSigTransactionService';

export { SignatureAggregator } from './SignatureAggregator';
export { LocalSigner } from './LocalSigner';

export {
  RoleManagementService,
  roleManagementService,
  COMMON_ROLES
} from './RoleManagementService';

// Supported blockchains for MultiSig wallet creation
// Re-export EVM chains from BlockchainValidator for consistency
import { BLOCKCHAIN_CATEGORIES } from '@/infrastructure/web3/utils/BlockchainValidator';

export const SUPPORTED_MULTISIG_BLOCKCHAINS = BLOCKCHAIN_CATEGORIES.evm;

// Type for MultiSig-supported chains (EVM chains only)
export type SupportedMultiSigChain = typeof SUPPORTED_MULTISIG_BLOCKCHAINS[number];

// Re-export types
export type {
  MultiSigProposal,
  ProposalSignature,
  MultiSigWallet,
  SignatureRequirement,
  SignedMultiSigTransaction,
  MultiSigBroadcastResult,
  WalletDeploymentResult
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

export type {
  RoleAssignment
} from './RoleManagementService';
