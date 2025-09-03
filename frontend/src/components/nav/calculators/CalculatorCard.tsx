/**
 * CalculatorCard - Generic NAV calculator display component
 * 
 * Features:
 * - Displays calculation results with asset-specific formatting
 * - Shows pricing sources and data staleness
 * - Validates calculation status and error handling
 * - Provides real-time updates and refresh functionality
 * - Supports all calculator types through generic interface
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react'

// Types for calculator results (should match backend types)
interface CalculationResult {
  runId: string
  assetId: string
  productType: string
  projectId?: string
  valuationDate: Date
  totalAssets: number
  totalLiabilities: number
  netAssets: number
  navValue: number
  navPerShare?: number
  currency: string
  pricingSources: Record<string, string>
  calculatedAt: Date
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'PARTIAL'
  errorMessage?: string
  metadata?: Record<string, any>
}

interface CalculatorCardProps {
  calculation: CalculationResult
  title: string
  description?: string
  onRefresh?: () => void
  isLoading?: boolean
  className?: string
}

export function CalculatorCard({
  calculation,
  title,
  description,
  onRefresh,
  isLoading = false,
  className = ''
}: CalculatorCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'PARTIAL':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      case 'FAILED':
        return <AlertCircle className="h-4 w-4" />
      case 'PENDING':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value / 100)
  }

  const getDataAge = (calculatedAt: Date) => {
    const now = new Date()
    const ageMs = now.getTime() - calculatedAt.getTime()
    const ageMinutes = Math.floor(ageMs / (1000 * 60))
    
    if (ageMinutes < 1) return 'Just now'
    if (ageMinutes < 60) return `${ageMinutes}m ago`
    
    const ageHours = Math.floor(ageMinutes / 60)
    if (ageHours < 24) return `${ageHours}h ago`
    
    const ageDays = Math.floor(ageHours / 24)
    return `${ageDays}d ago`
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`${getStatusColor(calculation.status)} flex items-center gap-1`}
            >
              {getStatusIcon(calculation.status)}
              {calculation.status}
            </Badge>
            
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {calculation.status === 'FAILED' && calculation.errorMessage && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {calculation.errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {calculation.status === 'COMPLETED' && (
          <>
            {/* Main NAV Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-600">NAV Value</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(calculation.navValue, calculation.currency)}
                </div>
                {calculation.navPerShare && (
                  <div className="text-sm text-gray-500">
                    {formatCurrency(calculation.navPerShare, calculation.currency)} per share
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-600">Net Assets</div>
                <div className="text-xl font-semibold text-gray-900">
                  {formatCurrency(calculation.netAssets, calculation.currency)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <TrendingUp className="h-3 w-3" />
                  Assets: {formatCurrency(calculation.totalAssets, calculation.currency)}
                </div>
                {calculation.totalLiabilities > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <TrendingDown className="h-3 w-3" />
                    Liabilities: {formatCurrency(calculation.totalLiabilities, calculation.currency)}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Asset-Specific Metadata */}
            {calculation.metadata && Object.keys(calculation.metadata).length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-600">Asset Details</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(calculation.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-gray-900 font-medium">
                        {typeof value === 'number' 
                          ? formatCurrency(value, calculation.currency)
                          : String(value)
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Data Sources and Timestamps */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">Data Sources</div>
              <div className="space-y-1">
                {Object.entries(calculation.pricingSources).map(([source, provider]) => (
                  <div key={source} className="flex justify-between text-sm">
                    <span className="text-gray-500 capitalize">
                      {source.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {provider}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Valuation: {new Date(calculation.valuationDate).toLocaleDateString()}</span>
              <span>Calculated: {getDataAge(new Date(calculation.calculatedAt))}</span>
            </div>
          </>
        )}

        {calculation.status === 'PENDING' && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <div className="text-sm text-gray-500">Calculating NAV...</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Specialized calculator cards for different asset types
export function EquityCalculatorCard({ calculation, onRefresh, isLoading }: {
  calculation: CalculationResult
  onRefresh?: () => void
  isLoading?: boolean
}) {
  return (
    <CalculatorCard
      calculation={calculation}
      title="Equity Holdings"
      description="Stock portfolio valuation with corporate actions"
      onRefresh={onRefresh}
      isLoading={isLoading}
      className="border-blue-200"
    />
  )
}

export function BondCalculatorCard({ calculation, onRefresh, isLoading }: {
  calculation: CalculationResult
  onRefresh?: () => void
  isLoading?: boolean
}) {
  return (
    <CalculatorCard
      calculation={calculation}
      title="Fixed Income Securities"
      description="Bond valuation with yield curve integration"
      onRefresh={onRefresh}
      isLoading={isLoading}
      className="border-green-200"
    />
  )
}

export function MmfCalculatorCard({ calculation, onRefresh, isLoading }: {
  calculation: CalculationResult
  onRefresh?: () => void
  isLoading?: boolean
}) {
  return (
    <CalculatorCard
      calculation={calculation}
      title="Money Market Fund"
      description="SEC Rule 2a-7 compliant NAV calculation"
      onRefresh={onRefresh}
      isLoading={isLoading}
      className="border-purple-200"
    />
  )
}

export function StablecoinCalculatorCard({ calculation, onRefresh, isLoading }: {
  calculation: CalculationResult
  onRefresh?: () => void
  isLoading?: boolean
}) {
  return (
    <CalculatorCard
      calculation={calculation}
      title="Stablecoin Holdings"
      description="Peg validation and reserve analysis"
      onRefresh={onRefresh}
      isLoading={isLoading}
      className="border-cyan-200"
    />
  )
}
