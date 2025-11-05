/**
 * Module Types Index
 * Central export point for all module-related type definitions
 */

export * from './ModuleTypes';

// Re-export commonly used types with more explicit names for convenience
export type {
  ComplianceConfig as ComplianceModuleConfig,
  VestingConfig as VestingModuleConfig,
  RoyaltyConfig as RoyaltyModuleConfig,
  RentalConfig as RentalModuleConfig,
  FractionalizationConfig as FractionalizationModuleConfig,
  FeesConfig as FeesModuleConfig,
  TimelockConfig as TimelockModuleConfig,
  TemporaryApprovalConfig as TemporaryApprovalModuleConfig,
} from './ModuleTypes';
