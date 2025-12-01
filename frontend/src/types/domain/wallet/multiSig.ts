/**
 * Multi-Signature Wallet Domain Types
 * Defines interfaces for multi-sig wallets, proposals, signatures, and related entities
 */

import { ChainType } from '@/services/wallet/AddressUtils';

// ============================================================================
// WALLET TYPES
// ============================================================================

export interface MultiSigWallet {
  id: string;
  name: string;
  blockchain: string;
  address: string;
  owners: string[];
  threshold: number;
  status: 'active' | 'blocked';
  createdAt: Date;
  contractType: 'custom' | 'gnosis_safe';
  deploymentTx?: string;
  factoryAddress?: string;
  projectId?: string;
  investorId?: string;
}

export interface ProjectWallet {
  id: string;
  projectId: string;
  projectWalletName?: string;
  address?: string;
  walletAddress?: string;
  publicKey: string;
  privateKey?: string;
  privateKeyVaultId?: string;
  mnemonicVaultId?: string;
  chainId?: string;
  nonEvmNetwork?: string;
  bitcoinNetworkType?: string;
  hasDirectKey?: boolean;
  hasVaultKey?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WalletDeploymentResult {
  id: string;
  address: string;
  transactionHash: string;
  factoryAddress: string;
}

// ============================================================================
// PROPOSAL TYPES
// ============================================================================

export interface MultiSigProposal {
  id: string;
  walletId: string;
  transactionHash: string;
  rawTransaction: any;
  chainType: ChainType;
  status: 'pending' | 'submitted' | 'signed' | 'executed' | 'expired' | 'rejected';
  signaturesCollected: number;
  signaturesRequired: number;
  expiresAt: Date;
  executedAt?: Date;
  executionHash?: string;
  createdBy: string;
  createdAt: Date;
  onChainTxId?: number;
  onChainTxHash?: string;
  submittedOnChain: boolean;
}

export interface ProposalSignature {
  id: string;
  proposalId: string;
  signerAddress: string;
  signature: string;
  signatureType: 'ecdsa' | 'schnorr' | 'eddsa';
  signedAt: Date;
  isValid: boolean;
  onChainConfirmationTx?: string;
  confirmedOnChain: boolean;
}

export interface SignatureRequirement {
  required: number;
  collected: number;
  remaining: number;
  signers: string[];
  hasSigned: string[];
  canSign: string[];
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface SignedMultiSigTransaction {
  proposalId: string;
  rawTransaction: string;
  signatures: string[];
  chainType: ChainType;
  readyToBroadcast: boolean;
}

export interface MultiSigBroadcastResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  confirmations?: number;
  error?: string;
  proposalId: string;
}

// ============================================================================
// DEPLOYMENT OPTIONS
// ============================================================================

export interface MultiSigDeploymentOptions {
  name: string;
  owners: string[];
  threshold: number;
  blockchain: string;
  projectId: string;
  fundingWalletId?: string;
  ownerUsers?: Array<{
    userId: string;
    roleId: string;
    address: string;
  }>;
}

export interface MultiSigSignerOptions {
  projectId?: string;
  blockchain?: string;
  walletAddress?: string;
}
