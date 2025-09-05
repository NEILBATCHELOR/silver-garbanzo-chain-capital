/**
 * Async Calculation Progress Component
 * Shows progress, status, and controls for async NAV calculations
 */

import React from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatRelativeTime } from '@/utils/nav'
import { AsyncCalculationStatus } from '@/hooks/nav'

export interface AsyncCalculationProgressProps {
  status: AsyncCalculationStatus
  onCancel?: () => void
  onRetry?: () => void
  onReset?: () => void
  className?: string
}

export function AsyncCalculationProgress({
  status,
  onCancel,
  onRetry,
  onReset,
  className = ''
}: AsyncCalculationProgressProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
      case 'polling':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusLabel = () => {
    switch (status.status) {
      case 'pending':
        return 'Initializing calculation...'
      case 'polling':
        return 'Calculating NAV...'
      case 'completed':
        return 'Calculation complete'
      case 'failed':
        return 'Calculation failed'
      case 'cancelled':
        return 'Calculation cancelled'
      default:
        return 'Ready'
    }
  }

  const getStatusColor = () => {
    switch (status.status) {
      case 'pending':
      case 'polling':
        return 'blue'
      case 'completed':
        return 'green'
      case 'failed':
        return 'red'
      case 'cancelled':
        return 'yellow'
      default:
        return 'gray'
    }
  }

  const isActive = status.status === 'pending' || status.status === 'polling'
  const canCancel = isActive && onCancel
  const showProgress = isActive && typeof status.progress === 'number'

  return (
    <Card className={`${className} ${isActive ? 'border-blue-200 bg-blue-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-sm font-medium">
                {getStatusLabel()}
              </CardTitle>
              {status.lastUpdated && (
                <CardDescription className="text-xs">
                  {formatRelativeTime(status.lastUpdated)}
                </CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={`text-${getStatusColor()}-700 border-${getStatusColor()}-200`}>
              {status.status}
            </Badge>
            
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Progress Bar */}
        {showProgress && (
          <div className="space-y-2">
            <Progress value={status.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(status.progress || 0)}% complete</span>
              {status.estimatedTimeRemaining && (
                <span>~{Math.round(status.estimatedTimeRemaining / 1000)}s remaining</span>
              )}
            </div>
          </div>
        )}

        {/* Run ID */}
        {status.runId && (
          <div className="mt-3 text-xs text-muted-foreground">
            Run ID: <code className="bg-gray-100 px-1 rounded">{status.runId}</code>
          </div>
        )}

        {/* Action Buttons */}
        {(status.status === 'failed' || status.status === 'cancelled') && (
          <div className="mt-4 flex space-x-2">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry Calculation
              </Button>
            )}
            {onReset && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Success Actions */}
        {status.status === 'completed' && onReset && (
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={onReset}>
              Run New Calculation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact Progress Indicator for inline use
 */
export function AsyncCalculationProgressCompact({
  status,
  onCancel,
  className = ''
}: Pick<AsyncCalculationProgressProps, 'status' | 'onCancel' | 'className'>) {
  const isActive = status.status === 'pending' || status.status === 'polling'
  
  if (status.status === 'idle') {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isActive ? (
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      ) : status.status === 'completed' ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : status.status === 'failed' ? (
        <XCircle className="h-4 w-4 text-red-600" />
      ) : (
        <AlertCircle className="h-4 w-4 text-yellow-600" />
      )}
      
      <span className="text-sm">
        {status.status === 'pending' && 'Starting...'}
        {status.status === 'polling' && `Calculating... ${Math.round(status.progress || 0)}%`}
        {status.status === 'completed' && 'Complete'}
        {status.status === 'failed' && 'Failed'}
        {status.status === 'cancelled' && 'Cancelled'}
      </span>

      {isActive && typeof status.progress === 'number' && (
        <div className="w-16">
          <Progress value={status.progress} className="h-1" />
        </div>
      )}

      {isActive && onCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

export default AsyncCalculationProgress
