/**
 * Multi-Sig Wallet Components
 * Centralized exports for role-based multi-sig wallet management
 */

export { default as MultiSigManager } from './MultiSigManager';
export { default as MultiSigRoleManager } from './MultiSigRoleManager';
export { default as RoleCreationForm } from './RoleCreationForm';
export { default as RoleOwnerManager } from './RoleOwnerManager';
export { default as MultiSigWalletForm } from './MultiSigWalletForm';
export { default as MultiSigTransactionProposal } from './MultiSigTransactionProposal';
export { default as MultiSigTransactionList } from './MultiSigTransactionList';

// Re-export types
export type { RoleAddress } from '@/services/wallet/multiSig/RoleAddressService';
export type { WalletRoleOwner, RoleAssignment } from '@/services/wallet/multiSig/RoleManagementService';
