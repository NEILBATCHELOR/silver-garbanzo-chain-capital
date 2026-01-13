/**
 * Intelligent Routing for Token Operations
 * 
 * Decides whether to use Gateway (policy/compliance) or direct services (speed/nonce)
 * based on operation requirements and configuration.
 * 
 * @created January 13, 2026
 */

export type OperationType = 
  | 'mint' 
  | 'burn' 
  | 'transfer' 
  | 'pause' 
  | 'lock' 
  | 'unlock' 
  | 'block' 
  | 'unblock'
  | 'updateMaxSupply';

export type ExecutionMode = 'basic' | 'foundry' | 'enhanced' | 'direct';

export interface RoutingDecision {
  useGateway: boolean;
  executionMode: ExecutionMode;
  reason: string;
  features: string[];
}

export interface RoutingContext {
  operation: OperationType;
  requiresPolicy: boolean;
  requiresCompliance: boolean;
  requiresAudit: boolean;
  enableFoundry: boolean;
  isBatch: boolean;
  isInternal: boolean;
  userPreference?: ExecutionMode; // User-configured preference
}

export interface RoutingConfig {
  defaultMode: ExecutionMode;
  allowUserOverride: boolean;
  forceGatewayFor: OperationType[];
  forceDirectFor: OperationType[];
}

/**
 * Operation Router
 * 
 * Intelligent routing system that decides whether to use Gateway or direct services
 * based on operation requirements, compliance needs, and performance considerations.
 */
export class OperationRouter {
  private config: RoutingConfig;

  constructor(config?: Partial<RoutingConfig>) {
    this.config = {
      defaultMode: 'enhanced', // Recommended: Triple-layer security
      allowUserOverride: true,
      forceGatewayFor: [], // Operations that MUST use Gateway
      forceDirectFor: [], // Operations that MUST use direct services
      ...config
    };
  }

  /**
   * Decide routing strategy based on context
   * 
   * Decision tree:
   * 1. Check forced routing (config overrides)
   * 2. Check user preference (if allowed)
   * 3. Evaluate requirements (policy/compliance/audit)
   * 4. Consider operation type (batch vs single)
   * 5. Apply default mode
   */
  decide(context: RoutingContext): RoutingDecision {
    const { operation, requiresPolicy, requiresCompliance, requiresAudit, 
            enableFoundry, isBatch, isInternal, userPreference } = context;

    // 1. Forced routing from configuration
    if (this.config.forceGatewayFor.includes(operation)) {
      return {
        useGateway: true,
        executionMode: enableFoundry ? 'foundry' : 'enhanced',
        reason: 'Configuration: Operation must use Gateway',
        features: this.getGatewayFeatures(context)
      };
    }

    if (this.config.forceDirectFor.includes(operation)) {
      return {
        useGateway: false,
        executionMode: 'direct',
        reason: 'Configuration: Operation must use direct service',
        features: this.getDirectFeatures(context)
      };
    }

    // 2. User preference (if allowed and specified)
    if (this.config.allowUserOverride && userPreference) {
      return this.buildDecisionFromMode(userPreference, context);
    }

    // 3. Requirements-based routing
    if (requiresPolicy || requiresCompliance || requiresAudit || enableFoundry) {
      return {
        useGateway: true,
        executionMode: enableFoundry ? 'foundry' : 'enhanced',
        reason: 'Requirements: Policy/compliance/audit required',
        features: this.getGatewayFeatures(context)
      };
    }

    // 4. Batch operations prefer direct services (speed + nonce management)
    if (isBatch) {
      return {
        useGateway: false,
        executionMode: 'direct',
        reason: 'Performance: Batch operation requires sequential nonce management',
        features: ['nonce-management', 'sequential-processing', 'gap-detection', 'batch-optimization']
      };
    }

    // 5. Internal operations prefer direct services (no policy needed)
    if (isInternal) {
      return {
        useGateway: false,
        executionMode: 'direct',
        reason: 'Internal: System operation without policy requirements',
        features: ['nonce-management', 'fast-execution']
      };
    }

    // 6. Default mode from configuration
    return this.buildDecisionFromMode(this.config.defaultMode, context);
  }

  /**
   * Build routing decision from execution mode
   */
  private buildDecisionFromMode(mode: ExecutionMode, context: RoutingContext): RoutingDecision {
    switch (mode) {
      case 'basic':
        return {
          useGateway: true,
          executionMode: 'basic',
          reason: 'Mode: Basic Gateway execution',
          features: ['policy-validation', 'basic-logging']
        };

      case 'foundry':
        return {
          useGateway: true,
          executionMode: 'foundry',
          reason: 'Mode: Foundry on-chain validation',
          features: ['policy-validation', 'foundry-validation', 'on-chain-enforcement', 'audit-trail']
        };

      case 'enhanced':
        return {
          useGateway: true,
          executionMode: 'enhanced',
          reason: 'Mode: Enhanced (triple-layer security)',
          features: context.enableFoundry 
            ? ['policy-validation', 'foundry-validation', 'nonce-management', 'compliance-logging']
            : ['policy-validation', 'nonce-management', 'compliance-logging', 'audit-trail']
        };

      case 'direct':
        return {
          useGateway: false,
          executionMode: 'direct',
          reason: 'Mode: Direct service execution',
          features: this.getDirectFeatures(context)
        };

      default:
        // Fallback to enhanced mode (safest)
        return {
          useGateway: true,
          executionMode: 'enhanced',
          reason: 'Default: Enhanced mode (triple-layer security)',
          features: ['policy-validation', 'nonce-management', 'audit-trail']
        };
    }
  }

  /**
   * Get Gateway features based on context
   */
  private getGatewayFeatures(context: RoutingContext): string[] {
    const features: string[] = [];

    if (context.requiresPolicy) features.push('policy-validation');
    if (context.requiresCompliance) features.push('compliance-logging');
    if (context.requiresAudit) features.push('audit-trail');
    if (context.enableFoundry) features.push('foundry-validation', 'on-chain-enforcement');
    
    // Enhanced mode always has nonce management
    features.push('nonce-management');

    return features;
  }

  /**
   * Get direct service features
   */
  private getDirectFeatures(context: RoutingContext): string[] {
    const features = ['nonce-management', 'fast-execution'];

    if (context.isBatch) {
      features.push('sequential-processing', 'gap-detection', 'batch-optimization');
    }

    return features;
  }

  /**
   * Get recommended mode for an operation
   */
  getRecommendedMode(context: RoutingContext): ExecutionMode {
    const decision = this.decide(context);
    return decision.executionMode;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RoutingConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): RoutingConfig {
    return { ...this.config };
  }
}

/**
 * Default router instance
 * 
 * Can be configured globally or per-component
 */
export const defaultRouter = new OperationRouter({
  defaultMode: 'enhanced', // Recommended: Triple-layer security
  allowUserOverride: true,
  forceGatewayFor: [], // No forced routing by default
  forceDirectFor: []
});

/**
 * Create a custom router with specific configuration
 */
export function createRouter(config: Partial<RoutingConfig>): OperationRouter {
  return new OperationRouter(config);
}
