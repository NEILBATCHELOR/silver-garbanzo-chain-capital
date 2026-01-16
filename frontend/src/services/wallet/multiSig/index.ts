/**
 * Multi-Signature Wallet Services
 * Export all multi-sig related services and types
 * Integrates with: validator, rpc, abi, adapter infrastructure
 * 
 * ARCHITECTURE:
 * - MultiSigWalletService: Wallet creation, deployment, queries
 * - MultiSigProposalService: Proposal creation, signing, execution
 * - MultiSigHelpers: Shared utilities for project wallets, signers, RPC
 */

// ============================================================================
// PRIMARY SERVICES (NEW ARCHITECTURE)
// ============================================================================

export {
  MultiSigWalletService
} from './MultiSigWalletService';

export {
  MultiSigProposalService,
  multiSigProposalService
} from './MultiSigProposalService';

export {
  EnhancedProposalService,
  enhancedProposalService
} from './EnhancedProposalService';

// Shared helpers for wallet and proposal services
export * from './MultiSigHelpers';

// ============================================================================
// LEGACY SERVICE (DEPRECATED - Use MultiSigWalletService + MultiSigProposalService)
// ============================================================================

// @deprecated - Split into MultiSigWalletService and MultiSigProposalService
// Kept for backward compatibility during migration
// TODO: Remove after all components migrated to new services
export { 
  MultiSigTransactionService,
  multiSigTransactionService
} from './MultiSigTransactionService.DEPRECATED';

// ============================================================================
// SUPPORTING SERVICES
// ============================================================================

export {
  MultiSigApprovalService,
  multiSigApprovalService
} from './MultiSigApprovalService';

export {
  MultiSigBlockchainIntegration,
  multiSigBlockchainIntegration
} from './MultiSigBlockchainIntegration';

export {
  MultiSigContractSubmitter,
  multiSigContractSubmitter
} from './MultiSigContractSubmitter';

export {
  MultiSigOnChainConfirmation,
  multiSigOnChainConfirmation
} from './MultiSigOnChainConfirmation';

export {
  MultiSigEventListener,
  multiSigEventListener
} from './MultiSigEventListener';

export {
  MultiSigListenerManager,
  multiSigListenerManager
} from './MultiSigListenerManager';

export {
  MultiSigABIService,
  multiSigABIService
} from './MultiSigABIService';

export {
  MultiSigOnChainService,
  multiSigOnChainService
} from './MultiSigOnChainService';

export {
  MultiSigMigrationService,
  multiSigMigrationService
} from './MultiSigMigrationService';

export { SignatureAggregator } from './SignatureAggregator';
export { LocalSigner } from './LocalSigner';

export {
  RoleManagementService,
  roleManagementService,
  COMMON_ROLES
} from './RoleManagementService';

// ============================================================================
// BLOCKCHAIN SUPPORT
// ============================================================================

import { BLOCKCHAIN_CATEGORIES } from '@/infrastructure/web3/utils/BlockchainValidator';

export const SUPPORTED_MULTISIG_BLOCKCHAINS = BLOCKCHAIN_CATEGORIES.evm;
export type SupportedMultiSigChain = typeof SUPPORTED_MULTISIG_BLOCKCHAINS[number];

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Primary types from domain layer
export type {
  MultiSigWallet,
  WalletDeploymentResult,
  MultiSigProposal,
  ProposalSignature,
  SignatureRequirement,
  SignedMultiSigTransaction,
  MultiSigBroadcastResult,
  MultiSigDeploymentOptions,
  MultiSigSignerOptions
} from '@/types/domain/wallet';

// Supporting service types
export type {
  TransferProposal,
  ProposalApproval,
  ProposalWithSignatures,
  CreateProposalParams,
  ApprovalResult,
  ExecutionResult
} from './MultiSigApprovalService';

export type {
  MultiSigProposal as TechnicalMultiSigProposal,
  OnChainTransaction,
  PrepareResult,
  SubmitResult
} from './MultiSigBlockchainIntegration';

export type {
  ContractSubmissionResult,
  SignerWallet
} from './MultiSigContractSubmitter';

export type {
  OnChainConfirmationResult,
  OnChainStatus
} from './MultiSigOnChainConfirmation';

export type {
  ListenerConfig,
  ListenerStatus
} from './MultiSigEventListener';

export type {
  HealthReport
} from './MultiSigListenerManager';

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
  OnChainTransactionWithConfirmations,
  CreateOnChainTransactionParams,
  CreateOnChainConfirmationParams,
  UpdateExecutionParams
} from './MultiSigOnChainService';

export type {
  RoleAssignment
} from './RoleManagementService';

// Enhanced types
export type {
  EnhancedProposalDetails,
  EnhancedProposalSigner
} from './EnhancedProposalService';
