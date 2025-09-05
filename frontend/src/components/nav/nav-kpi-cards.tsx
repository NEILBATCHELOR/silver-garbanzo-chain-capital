/**
 * NAV KPI Cards
 * Dashboard KPI cards displaying key NAV metrics and trends
 */

import { TrendingUp, TrendingDown, Minus, DollarSign, Calculator, Clock, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { NavKpi } from '@/types/nav'

interface NavKpiCardsProps {
  kpis?: NavKpi[]
  isLoading?: boolean
}

// Default KPI structure for loading state
const defaultKpis: NavKpi[] = [
  {
    label: 'Total NAV',
    value: 0,
    format: 'currency',
    currency: 'USD'
  },
  {
    label: 'Active Calculations',
    value: 0,
    format: 'number'
  },
  {
    label: 'Last Calculated',
    value: '-',
    format: 'number'
  },
  {
    label: 'Average Change (24h)',
    value: 0,
    format: 'percentage'
  }
]

function formatValue(value: number | string, format?: NavKpi['format'], currency?: string): string {
  if (typeof value === 'string') return value

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value)
    
    case 'percentage':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value / 100)
    
    case 'number':
    default:
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value)
  }
}

function getTrendIcon(trend: 'up' | 'down' | 'neutral') {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />
    case 'neutral':
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />
  }
}

function getTrendColor(trend: 'up' | 'down' | 'neutral'): string {
  switch (trend) {
    case 'up':
      return 'text-green-600 dark:text-green-400'
    case 'down':
      return 'text-red-600 dark:text-red-400'
    case 'neutral':
    default:
      return 'text-muted-foreground'
  }
}

function getKpiIcon(label: string) {
  const lowercaseLabel = label.toLowerCase()
  
  if (lowercaseLabel.includes('total') || lowercaseLabel.includes('nav')) {
    return <DollarSign className="h-4 w-4 text-blue-500" />
  }
  if (lowercaseLabel.includes('calculation') || lowercaseLabel.includes('active')) {
    return <Calculator className="h-4 w-4 text-purple-500" />
  }
  if (lowercaseLabel.includes('time') || lowercaseLabel.includes('last')) {
    return <Clock className="h-4 w-4 text-orange-500" />
  }
  if (lowercaseLabel.includes('error') || lowercaseLabel.includes('failed')) {
    return <AlertTriangle className="h-4 w-4 text-red-500" />
  }
  
  return <DollarSign className="h-4 w-4 text-muted-foreground" />
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-20 mb-2" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

function KpiCard({ kpi }: { kpi: NavKpi }) {
  const formattedValue = formatValue(kpi.value, kpi.format, kpi.currency)
  const hasChange = kpi.change && kpi.change.trend !== 'neutral'
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {kpi.label}
        </CardTitle>
        {getKpiIcon(kpi.label)}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-2">
          {formattedValue}
        </div>
        
        {kpi.change && (
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1">
              {getTrendIcon(kpi.change.trend)}
              <span className={getTrendColor(kpi.change.trend)}>
                {formatValue(Math.abs(kpi.change.percentage), 'percentage')}
              </span>
            </div>
            
            {kpi.change.period && (
              <Badge variant="secondary" className="text-xs py-0">
                {kpi.change.period}
              </Badge>
            )}
            
            {hasChange && (
              <span className="text-muted-foreground">
                ({kpi.change.value > 0 ? '+' : ''}{formatValue(kpi.change.value, kpi.format, kpi.currency)})
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function NavKpiCards({ kpis, isLoading = false }: NavKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const displayKpis = kpis && kpis.length > 0 ? kpis : defaultKpis

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {displayKpis.map((kpi, index) => (
        <KpiCard key={`${kpi.label}-${index}`} kpi={kpi} />
      ))}
    </div>
  )
}

export default NavKpiCards
