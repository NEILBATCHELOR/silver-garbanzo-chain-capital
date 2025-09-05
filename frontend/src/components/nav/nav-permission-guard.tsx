/**
 * NAV Permission Guard Component
 * Conditionally renders children based on NAV permissions
 */

import React, { useEffect, useState } from 'react'
import { AlertCircle, Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavPermissions, NavPermission, getNavPermissionDisplayName } from '@/utils/nav'

export interface NavPermissionGuardProps {
  children: React.ReactNode
  permission?: NavPermission
  permissions?: NavPermission[]
  requireAll?: boolean // If true, all permissions must be granted; if false, at least one
  fallback?: React.ReactNode
  showPermissionNotice?: boolean // Show friendly permission notice instead of hiding
  className?: string
}

export function NavPermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = true,
  fallback,
  showPermissionNotice = false,
  className = ''
}: NavPermissionGuardProps) {
  const { hasNavPermission, hasAllNavPermissions, hasAnyNavPermission, isChecking } = useNavPermissions()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  // Determine which permissions to check
  const permissionsToCheck = permission ? [permission] : permissions

  useEffect(() => {
    if (permissionsToCheck.length === 0) {
      setHasAccess(true)
      return
    }

    const checkPermissions = async () => {
      try {
        let access = false

        if (permissionsToCheck.length === 1) {
          access = await hasNavPermission(permissionsToCheck[0])
        } else if (requireAll) {
          access = await hasAllNavPermissions(permissionsToCheck)
        } else {
          access = await hasAnyNavPermission(permissionsToCheck)
        }

        setHasAccess(access)
      } catch (error) {
        console.error('Error checking NAV permissions:', error)
        setHasAccess(false)
      }
    }

    checkPermissions()
  }, [permissionsToCheck, requireAll, hasNavPermission, hasAllNavPermissions, hasAnyNavPermission])

  // Show loading state while checking permissions
  if (isChecking || hasAccess === null) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    )
  }

  // User has access - render children
  if (hasAccess) {
    return <div className={className}>{children}</div>
  }

  // User doesn't have access
  if (showPermissionNotice) {
    return (
      <div className={className}>
        <NavPermissionNotice 
          requiredPermissions={permissionsToCheck}
          requireAll={requireAll}
        />
      </div>
    )
  }

  // Return fallback or nothing
  return fallback ? <div className={className}>{fallback}</div> : null
}

/**
 * Permission Notice Component
 * Shows a friendly message when users lack required permissions
 */
export interface NavPermissionNoticeProps {
  requiredPermissions: NavPermission[]
  requireAll?: boolean
  className?: string
  title?: string
  showContactInfo?: boolean
}

export function NavPermissionNotice({
  requiredPermissions,
  requireAll = true,
  className = '',
  title,
  showContactInfo = true
}: NavPermissionNoticeProps) {
  const permissionNames = requiredPermissions.map(getNavPermissionDisplayName)
  
  const defaultTitle = requireAll 
    ? 'Additional Permissions Required'
    : 'Permission Required'

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Lock className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-orange-800">
            {title || defaultTitle}
          </CardTitle>
        </div>
        <CardDescription className="text-orange-700">
          {requireAll ? (
            <>You need <strong>all</strong> of the following permissions to access this feature:</>
          ) : (
            <>You need <strong>at least one</strong> of the following permissions to access this feature:</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm text-orange-700">
          {permissionNames.map((name, index) => (
            <li key={index} className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-2 flex-shrink-0"></span>
              {name}
            </li>
          ))}
        </ul>
        
        {showContactInfo && (
          <div className="mt-4 pt-3 border-t border-orange-200">
            <p className="text-xs text-orange-600">
              Contact your administrator to request access to these features.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Inline Permission Guard
 * For protecting smaller UI elements like buttons or links
 */
export interface InlineNavPermissionGuardProps {
  children: React.ReactNode
  permission?: NavPermission
  permissions?: NavPermission[]
  requireAll?: boolean
  disabled?: boolean // If true, shows disabled state instead of hiding
  disabledTitle?: string
  className?: string
}

export function InlineNavPermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = true,
  disabled = false,
  disabledTitle,
  className = ''
}: InlineNavPermissionGuardProps) {
  const { hasNavPermission, hasAllNavPermissions, hasAnyNavPermission, isChecking } = useNavPermissions()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  // Determine which permissions to check
  const permissionsToCheck = permission ? [permission] : permissions

  useEffect(() => {
    if (permissionsToCheck.length === 0) {
      setHasAccess(true)
      return
    }

    const checkPermissions = async () => {
      try {
        let access = false

        if (permissionsToCheck.length === 1) {
          access = await hasNavPermission(permissionsToCheck[0])
        } else if (requireAll) {
          access = await hasAllNavPermissions(permissionsToCheck)
        } else {
          access = await hasAnyNavPermission(permissionsToCheck)
        }

        setHasAccess(access)
      } catch (error) {
        console.error('Error checking NAV permissions:', error)
        setHasAccess(false)
      }
    }

    checkPermissions()
  }, [permissionsToCheck, requireAll, hasNavPermission, hasAllNavPermissions, hasAnyNavPermission])

  // Still checking permissions
  if (isChecking || hasAccess === null) {
    return disabled ? (
      <div className={`opacity-50 ${className}`} title="Checking permissions...">
        {children}
      </div>
    ) : null
  }

  // Has access - render normally
  if (hasAccess) {
    return <div className={className}>{children}</div>
  }

  // No access
  if (disabled) {
    const title = disabledTitle || `Requires: ${permissionsToCheck.map(getNavPermissionDisplayName).join(', ')}`
    return (
      <div className={`opacity-50 cursor-not-allowed ${className}`} title={title}>
        {children}
      </div>
    )
  }

  // Hide element
  return null
}

/**
 * Quick permission check hook for simple boolean checks
 */
export function useNavPermissionCheck(permission: NavPermission) {
  const { hasNavPermission } = useNavPermissions()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const access = await hasNavPermission(permission)
        setHasAccess(access)
      } catch (error) {
        console.error('Error checking NAV permission:', error)
        setHasAccess(false)
      }
    }

    checkPermission()
  }, [permission, hasNavPermission])

  return hasAccess
}

export default NavPermissionGuard
