/**
 * NAV Permissions
 * Defines and manages NAV-specific permissions and access control
 */

import { usePermissionsContext } from '@/hooks/auth/usePermissions'
import { useCallback, useMemo } from 'react'

// NAV Permission Constants
export const NAV_PERMISSIONS = {
  VIEW_DASHBOARD: 'nav:view_dashboard',
  VIEW_CALCULATORS: 'nav:view_calculators', 
  RUN_CALCULATION: 'nav:run_calculation',
  VIEW_HISTORY: 'nav:view_history',
  MANAGE_VALUATIONS: 'nav:manage_valuations',
  VIEW_AUDIT: 'nav:view_audit',
  // Additional granular permissions
  CREATE_VALUATION: 'nav:create_valuation',
  DELETE_VALUATION: 'nav:delete_valuation',
  APPROVE_VALUATION: 'nav:approve_valuation',
  EXPORT_DATA: 'nav:export_data',
  MANAGE_CALCULATOR_CONFIG: 'nav:manage_calculator_config'
} as const

export type NavPermission = typeof NAV_PERMISSIONS[keyof typeof NAV_PERMISSIONS]

// Permission groups for easier management - defined after NAV_PERMISSIONS
const VIEWER_PERMISSIONS = [
  NAV_PERMISSIONS.VIEW_DASHBOARD,
  NAV_PERMISSIONS.VIEW_CALCULATORS,
  NAV_PERMISSIONS.VIEW_HISTORY
]

const CALCULATOR_PERMISSIONS = [
  ...VIEWER_PERMISSIONS,
  NAV_PERMISSIONS.RUN_CALCULATION,
  NAV_PERMISSIONS.CREATE_VALUATION
]

const MANAGER_PERMISSIONS = [
  ...CALCULATOR_PERMISSIONS,
  NAV_PERMISSIONS.MANAGE_VALUATIONS,
  NAV_PERMISSIONS.DELETE_VALUATION,
  NAV_PERMISSIONS.EXPORT_DATA
]

const ADMIN_PERMISSIONS = [
  ...MANAGER_PERMISSIONS,
  NAV_PERMISSIONS.VIEW_AUDIT,
  NAV_PERMISSIONS.APPROVE_VALUATION,
  NAV_PERMISSIONS.MANAGE_CALCULATOR_CONFIG
]

export const NAV_PERMISSION_GROUPS = {
  VIEWER: VIEWER_PERMISSIONS,
  CALCULATOR: CALCULATOR_PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS
} as const

// Permission descriptions for UI
export const NAV_PERMISSION_DESCRIPTIONS = {
  [NAV_PERMISSIONS.VIEW_DASHBOARD]: 'View NAV dashboard and overview',
  [NAV_PERMISSIONS.VIEW_CALCULATORS]: 'Browse available NAV calculators',
  [NAV_PERMISSIONS.RUN_CALCULATION]: 'Execute NAV calculations',
  [NAV_PERMISSIONS.VIEW_HISTORY]: 'View calculation history',
  [NAV_PERMISSIONS.MANAGE_VALUATIONS]: 'Create, edit, and manage valuations',
  [NAV_PERMISSIONS.VIEW_AUDIT]: 'View audit trail and compliance logs',
  [NAV_PERMISSIONS.CREATE_VALUATION]: 'Save calculations as valuations',
  [NAV_PERMISSIONS.DELETE_VALUATION]: 'Delete existing valuations',
  [NAV_PERMISSIONS.APPROVE_VALUATION]: 'Approve valuations for official use',
  [NAV_PERMISSIONS.EXPORT_DATA]: 'Export NAV data and reports',
  [NAV_PERMISSIONS.MANAGE_CALCULATOR_CONFIG]: 'Configure calculator settings'
} as const

/**
 * Hook for NAV-specific permission checking
 */
export function useNavPermissions() {
  const { hasPermission, isChecking, cachedPermissions } = usePermissionsContext()

  // Check a single NAV permission
  const hasNavPermission = useCallback(async (permission: NavPermission): Promise<boolean> => {
    return await hasPermission(permission)
  }, [hasPermission])

  // Check multiple NAV permissions (all must be true)
  const hasAllNavPermissions = useCallback(async (permissions: NavPermission[]): Promise<boolean> => {
    const results = await Promise.all(permissions.map(p => hasPermission(p)))
    return results.every(Boolean)
  }, [hasPermission])

  // Check multiple NAV permissions (at least one must be true)
  const hasAnyNavPermission = useCallback(async (permissions: NavPermission[]): Promise<boolean> => {
    const results = await Promise.all(permissions.map(p => hasPermission(p)))
    return results.some(Boolean)
  }, [hasPermission])

  // Check if user has a permission group
  const hasNavPermissionGroup = useCallback(async (group: keyof typeof NAV_PERMISSION_GROUPS): Promise<boolean> => {
    return await hasAllNavPermissions(NAV_PERMISSION_GROUPS[group])
  }, [hasAllNavPermissions])

  // Get cached permission states for NAV
  const navPermissionStates = useMemo(() => {
    const states: Record<string, boolean> = {}
    Object.values(NAV_PERMISSIONS).forEach(permission => {
      if (permission in cachedPermissions) {
        states[permission] = cachedPermissions[permission]
      }
    })
    return states
  }, [cachedPermissions])

  return {
    hasNavPermission,
    hasAllNavPermissions,
    hasAnyNavPermission,
    hasNavPermissionGroup,
    navPermissionStates,
    isChecking
  }
}

/**
 * Utility function to get user-friendly permission name
 */
export function getNavPermissionDisplayName(permission: NavPermission): string {
  return NAV_PERMISSION_DESCRIPTIONS[permission] || permission
}

/**
 * Utility function to check if a permission is for a specific area
 */
export function isNavPermissionForArea(permission: NavPermission, area: 'dashboard' | 'calculators' | 'history' | 'valuations' | 'audit'): boolean {
  const calculatorPermissions = [NAV_PERMISSIONS.VIEW_CALCULATORS, NAV_PERMISSIONS.RUN_CALCULATION, NAV_PERMISSIONS.MANAGE_CALCULATOR_CONFIG]
  const valuationPermissions = [NAV_PERMISSIONS.MANAGE_VALUATIONS, NAV_PERMISSIONS.CREATE_VALUATION, NAV_PERMISSIONS.DELETE_VALUATION, NAV_PERMISSIONS.APPROVE_VALUATION]
  
  switch (area) {
    case 'dashboard':
      return permission === NAV_PERMISSIONS.VIEW_DASHBOARD
    case 'calculators':
      return calculatorPermissions.some(p => p === permission)
    case 'history':
      return permission === NAV_PERMISSIONS.VIEW_HISTORY
    case 'valuations':
      return valuationPermissions.some(p => p === permission)
    case 'audit':
      return permission === NAV_PERMISSIONS.VIEW_AUDIT
    default:
      return false
  }
}

export default useNavPermissions
