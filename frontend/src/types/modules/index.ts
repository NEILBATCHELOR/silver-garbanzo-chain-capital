/**
 * Module Types Index
 * Central export point for all module configuration types
 */

export * from './ModuleTypes';

// Re-export commonly used types for convenience
export type {
  // Most commonly used
  VestingSchedule,
  Document,
  VestingConfig,
  DocumentConfig,
  ComplianceConfig,
  FeesConfig,
  RoyaltyConfig,
  
  // Complete configuration
  CompleteModuleConfiguration,
  
  // Deployment
  ModuleDeploymentResult,
  DeploymentProgress,
  
  // UI helpers
  ModuleConfigProps,
  ValidationResult,
} from './ModuleTypes';
