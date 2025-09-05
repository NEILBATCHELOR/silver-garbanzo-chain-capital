/**
 * NAV Empty State Components
 * User-friendly empty states with accessibility and call-to-action
 */

import React from 'react'
import { 
  Calculator, 
  Clock, 
  FileText, 
  Activity, 
  Search, 
  TrendingUp,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface EmptyStateProps {
  className?: string
  title: string
  description: string
  icon?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
}

/**
 * Base Empty State Component
 */
export function EmptyState({
  className = '',
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}: EmptyStateProps) {
  return (
    <div 
      className={`text-center py-12 px-6 ${className}`}
      role="status"
      aria-label={`${title} - ${description}`}
    >
      {icon && (
        <div className="mx-auto mb-4 opacity-50">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex justify-center space-x-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} className="focus-visible:ring-2 focus-visible:ring-offset-2">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction} className="focus-visible:ring-2 focus-visible:ring-offset-2">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * No Calculations Empty State
 */
export function NoCalculationsEmpty({ 
  onStartCalculation,
  onViewCalculators
}: { 
  onStartCalculation?: () => void
  onViewCalculators?: () => void 
}) {
  return (
    <EmptyState
      icon={<Calculator className="h-16 w-16" />}
      title="No calculations yet"
      description="Start your first NAV calculation to see results and history here."
      actionLabel="Start Calculation"
      onAction={onStartCalculation}
      secondaryActionLabel="Browse Calculators"
      onSecondaryAction={onViewCalculators}
    />
  )
}

/**
 * No History Empty State
 */
export function NoHistoryEmpty({ 
  onStartCalculation 
}: { 
  onStartCalculation?: () => void 
}) {
  return (
    <EmptyState
      icon={<Clock className="h-16 w-16" />}
      title="No calculation history"
      description="Your calculation history will appear here once you start running NAV calculations."
      actionLabel="Run First Calculation"
      onAction={onStartCalculation}
    />
  )
}

/**
 * No Valuations Empty State
 */
export function NoValuationsEmpty({ 
  onCreateValuation,
  onStartCalculation 
}: { 
  onCreateValuation?: () => void
  onStartCalculation?: () => void 
}) {
  return (
    <EmptyState
      icon={<FileText className="h-16 w-16" />}
      title="No saved valuations"
      description="Save calculation results as valuations to track and manage your NAV records over time."
      actionLabel="Create Valuation"
      onAction={onCreateValuation}
      secondaryActionLabel="Start Calculation"
      onSecondaryAction={onStartCalculation}
    />
  )
}

/**
 * No Search Results Empty State
 */
export function NoSearchResultsEmpty({ 
  searchTerm,
  onClearSearch,
  onViewAll 
}: { 
  searchTerm?: string
  onClearSearch?: () => void
  onViewAll?: () => void 
}) {
  return (
    <EmptyState
      icon={<Search className="h-16 w-16" />}
      title={searchTerm ? `No results for "${searchTerm}"` : "No results found"}
      description="Try adjusting your search terms or browse all available calculators."
      actionLabel="Clear Search"
      onAction={onClearSearch}
      secondaryActionLabel="View All"
      onSecondaryAction={onViewAll}
    />
  )
}

/**
 * No Audit Data Empty State
 */
export function NoAuditDataEmpty({ 
  onRefresh 
}: { 
  onRefresh?: () => void 
}) {
  return (
    <EmptyState
      icon={<Activity className="h-16 w-16" />}
      title="No audit data"
      description="Audit trail information will appear here as NAV activities are performed."
      actionLabel="Refresh"
      onAction={onRefresh}
    />
  )
}

/**
 * No Trending Data Empty State
 */
export function NoTrendingDataEmpty({ 
  onStartCalculation 
}: { 
  onStartCalculation?: () => void 
}) {
  return (
    <EmptyState
      icon={<TrendingUp className="h-16 w-16" />}
      title="No trending data yet"
      description="Run some calculations to see trending asset types and popular calculators."
      actionLabel="Start Calculating"
      onAction={onStartCalculation}
    />
  )
}

/**
 * Error State Component
 */
export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  onRetry,
  onGoBack,
  className = ''
}: {
  title?: string
  description?: string
  onRetry?: () => void
  onGoBack?: () => void
  className?: string
}) {
  return (
    <Card className={`border-red-200 bg-red-50 ${className}`}>
      <CardContent className="pt-6">
        <EmptyState
          icon={<AlertCircle className="h-16 w-16 text-red-500" />}
          title={title}
          description={description}
          actionLabel={onRetry ? "Try Again" : undefined}
          onAction={onRetry}
          secondaryActionLabel={onGoBack ? "Go Back" : undefined}
          onSecondaryAction={onGoBack}
        />
      </CardContent>
    </Card>
  )
}

/**
 * Loading Failed State
 */
export function LoadingFailedState({
  what = "data",
  onRetry,
  className = ''
}: {
  what?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <EmptyState
      className={className}
      icon={<RefreshCw className="h-16 w-16 text-gray-400" />}
      title={`Failed to load ${what}`}
      description="There was a problem loading this information. Please try again."
      actionLabel="Retry"
      onAction={onRetry}
    />
  )
}

/**
 * Permission Denied State
 */
export function PermissionDeniedState({
  feature = "this feature",
  requiredPermissions = [],
  className = ''
}: {
  feature?: string
  requiredPermissions?: string[]
  className?: string
}) {
  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center text-orange-800">
          <AlertCircle className="h-5 w-5 mr-2" />
          Access Denied
        </CardTitle>
        <CardDescription className="text-orange-700">
          You don't have permission to access {feature}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requiredPermissions.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-orange-700 mb-2">Required permissions:</p>
            <ul className="list-disc list-inside text-sm text-orange-600 space-y-1">
              {requiredPermissions.map((permission, index) => (
                <li key={index}>{permission}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-orange-600">
          Contact your administrator to request access.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Coming Soon State
 */
export function ComingSoonState({
  feature = "This feature",
  description = "We're working hard to bring you this feature. Stay tuned!",
  className = ''
}: {
  feature?: string
  description?: string
  className?: string
}) {
  return (
    <EmptyState
      className={className}
      icon={<Plus className="h-16 w-16 text-gray-400" />}
      title={`${feature} Coming Soon`}
      description={description}
    />
  )
}

export default {
  EmptyState,
  NoCalculationsEmpty,
  NoHistoryEmpty,
  NoValuationsEmpty,
  NoSearchResultsEmpty,
  NoAuditDataEmpty,
  NoTrendingDataEmpty,
  ErrorState,
  LoadingFailedState,
  PermissionDeniedState,
  ComingSoonState
}
