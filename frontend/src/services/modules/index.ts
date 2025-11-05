// Module Services Index
// 
// Phase 1: Template Deployment (Admin)
export { TemplateDeploymentService } from './TemplateDeploymentService';

// Phase 2: Instance Deployment & Configuration (User)
export { InstanceDeploymentService } from './InstanceDeploymentService';
export { InstanceConfigurationService } from './InstanceConfigurationService';
export type { 
  ConfigurationResult, 
  ConfigurationProgress,
  EnhancedModuleDeploymentResult 
} from './InstanceConfigurationService';

// Registry Services (Shared)
export { ModuleRegistryService } from './ModuleRegistryService';
export type { ModuleRegistryEntry, ModuleSelection } from './ModuleRegistryService';

// React Hooks
export { useModuleRegistry } from './useModuleRegistry';
export type { UseModuleRegistryResult } from './useModuleRegistry';

// Deployment Types
export type { ModuleDeploymentConfig, ModuleDeploymentResult } from './InstanceDeploymentService';
