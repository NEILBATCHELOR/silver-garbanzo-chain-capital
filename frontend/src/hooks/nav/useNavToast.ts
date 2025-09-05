/**
 * NAV Toast Notifications
 * Standardized notification system for NAV operations
 */

import React from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, Clock, Calculator } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { CalculationResult } from '@/types/nav'
import { NavCalculationResult } from '@/services/nav/NavService'
import { formatCurrency } from '@/utils/nav'

export type NavToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface NavToastOptions {
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
    altText?: string
  }
}

/**
 * Custom hook for NAV-specific toast notifications
 */
export function useNavToast() {
  const { toast } = useToast()

  const showNavToast = (type: NavToastType, options: NavToastOptions) => {
    const { title, description, duration = 5000, action } = options

    const getIcon = () => {
      switch (type) {
        case 'success':
          return React.createElement(CheckCircle, { className: "h-4 w-4 text-green-600" })
        case 'error':
          return React.createElement(XCircle, { className: "h-4 w-4 text-red-600" })
        case 'warning':
          return React.createElement(AlertCircle, { className: "h-4 w-4 text-yellow-600" })
        case 'info':
          return React.createElement(Info, { className: "h-4 w-4 text-blue-600" })
        case 'loading':
          return React.createElement(Clock, { className: "h-4 w-4 text-gray-600 animate-pulse" })
        default:
          return null
      }
    }

    const getVariant = () => {
      switch (type) {
        case 'error':
          return 'destructive' as const
        default:
          return 'default' as const
      }
    }

    // Enhanced description with action button if provided
    const enhancedDescription = React.createElement('div', { className: "space-y-2" }, [
      description ? React.createElement('div', { 
        key: 'content',
        className: "flex items-center space-x-2" 
      }, [
        getIcon(),
        React.createElement('span', { key: 'desc' }, description)
      ]) : getIcon(),
      
      action ? React.createElement('button', {
        key: 'action-btn',
        onClick: action.onClick,
        className: "text-sm text-blue-600 hover:text-blue-800 underline font-medium"
      }, action.label) : null
    ].filter(Boolean))

    toast({
      title: title,
      description: enhancedDescription,
      duration,
      variant: getVariant()
    })
  }

  // Convenience methods for specific NAV operations
  const calculationSuccess = (result: NavCalculationResult) => {
    showNavToast('success', {
      title: 'Calculation Complete',
      description: `NAV calculated: ${formatCurrency(result.navValue, result.currency)}`,
      action: {
        label: 'View Details',
        onClick: () => {
          // Navigate to calculation details or show modal
          console.log('View calculation details:', result.runId)
        }
      }
    })
  }

  const calculationError = (error: string) => {
    showNavToast('error', {
      title: 'Calculation Failed',
      description: error,
      duration: 8000
    })
  }

  const calculationStarted = (calculatorName: string) => {
    showNavToast('loading', {
      title: 'Calculation Started',
      description: `Running ${calculatorName} calculation...`,
      duration: 3000
    })
  }

  const valuationSaved = (valuationName: string) => {
    showNavToast('success', {
      title: 'Valuation Saved',
      description: `"${valuationName}" has been saved successfully.`,
      action: {
        label: 'View Valuations',
        onClick: () => {
          // Navigate to valuations page
          console.log('Navigate to valuations')
        }
      }
    })
  }

  const valuationDeleted = (valuationName: string) => {
    showNavToast('success', {
      title: 'Valuation Deleted',
      description: `"${valuationName}" has been removed.`,
      duration: 3000
    })
  }

  const permissionDenied = (action: string) => {
    showNavToast('warning', {
      title: 'Permission Required',
      description: `You don't have permission to ${action}.`,
      duration: 6000
    })
  }

  const dataLoadError = (dataType: string) => {
    showNavToast('error', {
      title: 'Loading Failed',
      description: `Failed to load ${dataType}. Please try again.`,
      action: {
        label: 'Retry',
        onClick: () => {
          // Trigger retry logic
          console.log('Retry loading:', dataType)
        }
      }
    })
  }

  const exportSuccess = (fileName: string) => {
    showNavToast('success', {
      title: 'Export Complete',
      description: `${fileName} has been downloaded successfully.`,
      duration: 4000
    })
  }

  const exportError = (error: string) => {
    showNavToast('error', {
      title: 'Export Failed',
      description: error,
      duration: 6000
    })
  }

  const validationError = (field: string, message: string) => {
    showNavToast('warning', {
      title: 'Validation Error',
      description: `${field}: ${message}`,
      duration: 5000
    })
  }

  const autosaveSuccess = () => {
    showNavToast('info', {
      title: 'Auto-saved',
      description: 'Your progress has been automatically saved.',
      duration: 2000
    })
  }

  const connectionLost = () => {
    showNavToast('warning', {
      title: 'Connection Lost',
      description: 'Attempting to reconnect...',
      duration: 10000
    })
  }

  const connectionRestored = () => {
    showNavToast('success', {
      title: 'Connection Restored',
      description: 'You are back online.',
      duration: 3000
    })
  }

  return {
    // Generic toast
    showNavToast,
    
    // Calculation-specific toasts
    calculationSuccess,
    calculationError,
    calculationStarted,
    
    // Valuation-specific toasts
    valuationSaved,
    valuationDeleted,
    
    // Permission and access toasts
    permissionDenied,
    
    // Data loading toasts
    dataLoadError,
    
    // Export toasts
    exportSuccess,
    exportError,
    
    // Validation toasts
    validationError,
    
    // System toasts
    autosaveSuccess,
    connectionLost,
    connectionRestored
  }
}

/**
 * Toast notification templates for common NAV operations
 */
export const NavToastTemplates = {
  calculationQueued: (calculatorName: string) => ({
    type: 'info' as NavToastType,
    title: 'Calculation Queued',
    description: `${calculatorName} calculation has been queued and will start shortly.`,
    duration: 4000
  }),

  calculationProgress: (progress: number) => ({
    type: 'loading' as NavToastType,
    title: 'Calculation in Progress',
    description: `${Math.round(progress)}% complete...`,
    duration: 2000
  }),

  bulkOperationComplete: (count: number, operation: string) => ({
    type: 'success' as NavToastType,
    title: 'Bulk Operation Complete',
    description: `Successfully ${operation} ${count} items.`,
    duration: 4000
  }),

  maintenanceMode: () => ({
    type: 'warning' as NavToastType,
    title: 'Maintenance Mode',
    description: 'NAV calculations are temporarily unavailable due to system maintenance.',
    duration: 10000
  }),

  quotaExceeded: (limit: number) => ({
    type: 'warning' as NavToastType,
    title: 'Usage Limit Reached',
    description: `You have reached your limit of ${limit} calculations for today.`,
    duration: 8000
  }),

  newFeatureAvailable: (feature: string) => ({
    type: 'info' as NavToastType,
    title: 'New Feature Available',
    description: `${feature} is now available in your NAV dashboard.`,
    duration: 6000
  })
}

export default useNavToast
