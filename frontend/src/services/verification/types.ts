/**
 * Comprehensive Verification Types
 * 
 * Defines types for verifying any token deployment with modules, extensions, and configurations
 */

import { TokenStandard } from '@/types/core/centralModels';

/**
 * Verification status for individual checks
 */
export enum VerificationStatus {
  PENDING = 'PENDING',
  CHECKING = 'CHECKING',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

/**
 * Overall verification result
 */
export enum OverallVerificationStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED'
}

/**
 * Types of verifications that can be performed
 */
export enum VerificationType {
  // Token verifications
  TOKEN_DEPLOYMENT = 'TOKEN_DEPLOYMENT',
  TOKEN_CONFIGURATION = 'TOKEN_CONFIGURATION',
  TOKEN_STATE = 'TOKEN_STATE',
  
  // Module verifications
  MODULE_DEPLOYMENT = 'MODULE_DEPLOYMENT',
  MODULE_LINKAGE = 'MODULE_LINKAGE',
  MODULE_CONFIGURATION = 'MODULE_CONFIGURATION',
  
  // Extension verifications
  EXTENSION_ATTACHMENT = 'EXTENSION_ATTACHMENT',
  EXTENSION_CONFIGURATION = 'EXTENSION_CONFIGURATION',
  
  // Transaction verifications
  TRANSACTION_SEQUENCE = 'TRANSACTION_SEQUENCE',
  TRANSACTION_COMPLETENESS = 'TRANSACTION_COMPLETENESS'
}

/**
 * Individual verification check result
 */
export interface VerificationCheck {
  type: VerificationType;
  name: string;
  description: string;
  status: VerificationStatus;
  expected?: any;
  actual?: any;
  error?: string;
  timestamp: number;
  transactionHash?: string;
  blockNumber?: number;
  details?: Record<string, any>;
}

/**
 * Module-specific verification result
 */
export interface ModuleVerificationResult {
  moduleType: string;
  moduleAddress: string;
  deploymentVerified: boolean;
  linkageVerified: boolean;
  configurationVerified: boolean;
  checks: VerificationCheck[];
  issues: string[];
  warnings: string[];
}

/**
 * Extension-specific verification result
 */
export interface ExtensionVerificationResult {
  extensionType: string;
  extensionAddress: string;
  attachmentVerified: boolean;
  configurationVerified: boolean;
  checks: VerificationCheck[];
  issues: string[];
  warnings: string[];
}

/**
 * Complete verification result
 */
export interface ComprehensiveVerificationResult {
  tokenId: string;
  tokenAddress: string;
  network: string;
  standard: TokenStandard;
  overallStatus: OverallVerificationStatus;
  
  // Token verification
  tokenDeploymentVerified: boolean;
  tokenConfigurationVerified: boolean;
  tokenChecks: VerificationCheck[];
  
  // Module verifications
  modulesVerified: boolean;
  moduleResults: ModuleVerificationResult[];
  
  // Extension verifications
  extensionsVerified: boolean;
  extensionResults: ExtensionVerificationResult[];
  
  // Transaction sequence
  transactionSequenceVerified: boolean;
  transactionChecks: VerificationCheck[];
  
  // Summary
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  skippedChecks: number;
  
  issues: string[];
  warnings: string[];
  recommendations: string[];
  
  verificationTimestamp: number;
  verificationDuration: number;
}

/**
 * Verification options
 */
export interface VerificationOptions {
  // What to verify
  verifyToken?: boolean;
  verifyModules?: boolean;
  verifyExtensions?: boolean;
  verifyTransactionSequence?: boolean;
  
  // How to verify
  deepCheck?: boolean; // Perform comprehensive on-chain checks
  compareWithExpected?: boolean; // Compare with stored configuration
  checkModuleLinkage?: boolean; // Verify modules are properly linked to token
  
  // Network options
  rpcUrl?: string;
  timeout?: number;
  
  // UI options
  onProgress?: (progress: VerificationProgress) => void;
}

/**
 * Verification progress for UI updates
 */
export interface VerificationProgress {
  phase: string;
  currentCheck: string;
  completedChecks: number;
  totalChecks: number;
  percentage: number;
  recentChecks: VerificationCheck[];
}

/**
 * Token deployment data from database
 */
export interface TokenDeploymentData {
  tokenId: string;
  contractAddress: string;
  transactionHash: string;
  network: string;
  standard: TokenStandard;
  deploymentData?: any;
  factoryAddress?: string;
  masterAddress?: string;
  deployedAt: string;
  deployedBy: string;
}

/**
 * Module deployment data from database
 */
export interface ModuleDeploymentData {
  moduleType: string;
  moduleAddress: string;
  masterAddress?: string;
  deploymentTxHash?: string;
  configuration?: any;
  isActive: boolean;
  attachedAt?: string;
  deployedAt?: string;
}

/**
 * Extension deployment data from database
 */
export interface ExtensionDeploymentData {
  extensionType: string;
  extensionAddress: string;
  configuration: any;
  isActive: boolean;
  attachedTxHash?: string;
  attachedAt?: string;
}

/**
 * Verification context - all data needed for verification
 */
export interface VerificationContext {
  deployment: TokenDeploymentData;
  modules: ModuleDeploymentData[];
  extensions: ExtensionDeploymentData[];
  expectedConfiguration?: any;
  provider?: any; // ethers.js Provider for on-chain queries
}

/**
 * Standard-specific verifier interface
 */
export interface ITokenStandardVerifier {
  standard: TokenStandard;
  
  verifyToken(
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]>;
  
  verifyModules(
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<ModuleVerificationResult[]>;
}

/**
 * Module-specific verifier interface
 */
export interface IModuleVerifier {
  moduleType: string;
  
  verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]>;
  
  verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]>;
  
  verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]>;
}
