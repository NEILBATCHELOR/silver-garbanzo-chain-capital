/**
 * Verification Service Index
 * 
 * Exports all verification-related types, services, and components
 */

// Main service
export { verificationService, ComprehensiveVerificationService } from './verificationService';

// Types
export * from './types';

// Verifiers
export { ERC20Verifier } from './verifiers/erc20Verifier';
export { ERC721Verifier } from './verifiers/erc721Verifier';
