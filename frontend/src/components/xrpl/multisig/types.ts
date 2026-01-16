/**
 * XRPL Multi-Signature Component Types
 * Component-level types for XRPL multi-sig UI
 */

import { Signer, MultiSigTransaction } from '@/services/wallet/ripple/security/types';

export interface XRPLMultiSigManagerProps {
  projectId: string;
  walletAddress?: string;
  defaultTab?: 'setup' | 'transactions' | 'signers';
}

export interface XRPLMultiSigSetupFormProps {
  projectId: string;
  walletAddress: string;
  onSuccess?: (signerQuorum: number, signers: Signer[]) => void;
  onCancel?: () => void;
}

export interface XRPLMultiSigTransactionProposalProps {
  projectId: string;
  walletAddress: string;
  onSuccess?: (proposalId: string) => void;
}

export interface XRPLMultiSigTransactionListProps {
  projectId: string;
  walletAddress: string;
  onTransactionClick?: (transactionId: string) => void;
}

export interface XRPLMultiSigSignerManagerProps {
  projectId: string;
  walletAddress: string;
  onSignersUpdate?: (signers: Signer[]) => void;
}

export interface PendingTransactionDisplay {
  id: string;
  transactionType: string;
  transactionBlob: string;
  requiredWeight: number;
  currentWeight: number;
  status: 'pending' | 'ready' | 'submitted' | 'completed' | 'expired';
  signaturesCount: number;
  createdAt: string;
  expiresAt?: string;
}

export interface SignerDisplay extends Signer {
  hasAddress: boolean;
  email?: string;
}
