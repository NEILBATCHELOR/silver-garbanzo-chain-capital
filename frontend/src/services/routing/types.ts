/**
 * Routing Types
 * 
 * Type definitions for the intelligent routing system.
 */

import type { RoutingContext, RoutingDecision, ExecutionMode } from './OperationRouter';

/**
 * Execution mode descriptions for UI display
 */
export const EXECUTION_MODE_DESCRIPTIONS: Record<ExecutionMode, {
  name: string;
  description: string;
  features: string[];
  recommended: boolean;
}> = {
  basic: {
    name: 'Basic Mode',
    description: 'Standard Gateway execution with policy validation',
    features: ['Off-chain policy validation', 'Basic transaction logging'],
    recommended: false
  },
  foundry: {
    name: 'Foundry Mode',
    description: 'On-chain policy validation via PolicyEngine.sol',
    features: [
      'Off-chain policy validation',
      'On-chain smart contract validation',
      'Dual-layer security',
      'Complete audit trail'
    ],
    recommended: false
  },
  enhanced: {
    name: 'Enhanced Mode',
    description: 'Triple-layer security with nonce management (RECOMMENDED)',
    features: [
      'Off-chain policy validation',
      'Automatic nonce management',
      'Nonce gap detection',
      'Sequential processing',
      'Complete diagnostics',
      'Optional: On-chain validation'
    ],
    recommended: true
  },
  direct: {
    name: 'Direct Mode',
    description: 'Direct service execution for speed and batch operations',
    features: [
      'Automatic nonce management',
      'Fast execution',
      'Sequential batch processing',
      'Nonce gap detection'
    ],
    recommended: false
  }
};

/**
 * Helper to determine if a routing decision uses Gateway
 */
export function usesGateway(decision: RoutingDecision): boolean {
  return decision.useGateway;
}

/**
 * Helper to determine if a routing decision uses Foundry validation
 */
export function usesFoundry(decision: RoutingDecision): boolean {
  return decision.features.includes('foundry-validation');
}

/**
 * Helper to determine if a routing decision uses nonce management
 */
export function usesNonceManagement(decision: RoutingDecision): boolean {
  return decision.features.includes('nonce-management');
}

/**
 * Helper to get user-friendly feature descriptions
 */
export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'policy-validation': 'Off-chain policy checks',
  'foundry-validation': 'On-chain smart contract validation',
  'nonce-management': 'Automatic nonce tracking',
  'compliance-logging': 'Regulatory compliance audit trail',
  'audit-trail': 'Complete operation history',
  'on-chain-enforcement': 'Blockchain-enforced policies',
  'fast-execution': 'Optimized for speed',
  'sequential-processing': 'One-by-one batch execution',
  'gap-detection': 'Stuck transaction detection',
  'batch-optimization': 'Batch operation enhancements',
  'basic-logging': 'Standard transaction logging'
};

/**
 * Helper to create a routing context for operations
 */
export function createRoutingContext(
  operation: RoutingContext['operation'],
  options: {
    requiresPolicy?: boolean;
    requiresCompliance?: boolean;
    requiresAudit?: boolean;
    enableFoundry?: boolean;
    isBatch?: boolean;
    isInternal?: boolean;
    userPreference?: ExecutionMode;
  } = {}
): RoutingContext {
  return {
    operation,
    requiresPolicy: options.requiresPolicy ?? true, // Default: require policy
    requiresCompliance: options.requiresCompliance ?? true, // Default: require compliance
    requiresAudit: options.requiresAudit ?? true, // Default: require audit
    enableFoundry: options.enableFoundry ?? false, // Default: no Foundry (optional)
    isBatch: options.isBatch ?? false,
    isInternal: options.isInternal ?? false,
    userPreference: options.userPreference
  };
}

/**
 * Helper to format routing decision for logging
 */
export function formatRoutingDecision(decision: RoutingDecision): string {
  const mode = decision.executionMode.toUpperCase();
  const path = decision.useGateway ? 'Gateway' : 'Direct Service';
  const features = decision.features.map(f => FEATURE_DESCRIPTIONS[f] || f).join(', ');
  
  return `${mode} via ${path} - ${decision.reason}\nFeatures: ${features}`;
}
