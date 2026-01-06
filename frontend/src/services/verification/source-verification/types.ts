/**
 * Source Code Verification Types
 * 
 * Types for block explorer source code verification (Etherscan/Blockscout)
 * Replicates patterns from verify-hoodi-complete.sh
 */

/**
 * Status of source code verification
 */
export enum SourceVerificationStatus {
  NOT_VERIFIED = 'not_verified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  ALREADY_VERIFIED = 'already_verified'
}

/**
 * Request to verify a contract's source code
 */
export interface SourceVerificationRequest {
  contractAddress: string;
  contractPath: string;        // e.g., "src/masters/ERC20Master.sol:ERC20Master"
  sourceCode: string;          // Full Solidity source code
  compilerVersion: string;      // e.g., "v0.8.19+commit.7dd6d404"
  optimizationEnabled: boolean;
  optimizationRuns: number;
  constructorArgs?: string;     // ABI-encoded hex (no '0x' prefix)
  network: string;
}

/**
 * Result of source code verification attempt
 */
export interface SourceVerificationResult {
  success: boolean;
  status: SourceVerificationStatus;
  message: string;
  explorerUrl?: string;         // Link to verified contract
  guid?: string;                // Verification GUID (for tracking)
  retryAfter?: number;          // Seconds to wait before retry
}

/**
 * Request to verify beacon with constructor args
 */
export interface BeaconVerificationRequest {
  beaconAddress: string;
  implementationAddress: string;
  ownerAddress: string;
  network: string;
}

/**
 * Contract verification result with metadata
 */
export interface ContractVerificationResult {
  name: string;
  address: string;
  result: SourceVerificationResult;
}

/**
 * Phase verification results (matches bash script phases)
 */
export interface PhaseVerificationResults {
  phase: string;
  total: number;
  verified: number;
  failed: number;
  skipped: number;
  contracts: ContractVerificationResult[];
}

/**
 * Block explorer configuration
 */
export interface BlockExplorerConfig {
  name: string;                 // 'Blockscout', 'Etherscan'
  apiUrl: string;
  apiKey?: string;              // Etherscan requires key
  rateLimit: number;            // Milliseconds between requests
}
