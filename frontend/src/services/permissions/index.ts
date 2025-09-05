/**
 * =====================================================
 * PERMISSIONS SERVICE - INDEX
 * Enhanced to use new service with NAV support
 * Date: September 05, 2025
 * =====================================================
 */

// 🆕 Export enhanced service with NAV support
export { 
  DynamicPermissionsService, 
  dynamicPermissionsService 
} from './enhancedDynamicPermissionsService';

export type {
  DynamicPermission,
  PermissionCategory
} from './enhancedDynamicPermissionsService';

// Keep original export for backward compatibility
export { dynamicPermissionsService as permissionsService } from './enhancedDynamicPermissionsService';
