/**
 * Holdings Breakdown Chart
 * Pie/donut chart visualization of holdings by sector, asset class, or blockchain
 * Self-contained component that fetches its own data
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { etfService } from '@/services/nav/etfService'

export interface HoldingsBreakdownChartProps {
  etfId: string
  title?: string
  description?: string
}

type BreakdownType = 'sector' | 'asset_class' | 'blockchain' | 'country'

export function HoldingsBreakdownChart({
  etfId,
  title = 'Holdings Breakdown',
  description = 'Portfolio composition by category',
}: HoldingsBreakdownChartProps) {
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('sector')

  // Fetch holdings data
  const { data: holdingsData, isLoading } = useQuery({
    queryKey: ['etf-holdings', etfId],
    queryFn: () => etfService.getHoldings(etfId),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Loading holdings data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const holdings = holdingsData?.data || []

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>No holdings data available</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Calculate breakdown by selected type
  const getBreakdown = () => {
    const breakdown = new Map<string, number>()

    holdings.forEach(holding => {
      let key: string
      switch (breakdownType) {
        case 'sector':
          key = holding.sector || 'Unspecified'
          break
        case 'asset_class':
          key = holding.security_type
          break
        case 'blockchain':
          key = holding.blockchain || 'Non-Crypto'
          break
        case 'country':
          key = holding.country || 'Unspecified'
          break
        default:
          key = 'Unknown'
      }

      const current = breakdown.get(key) || 0
      breakdown.set(key, current + holding.market_value)
    })

    return Array.from(breakdown.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }

  const breakdownData = getBreakdown()
  const totalValue = breakdownData.reduce((sum, item) => sum + item.value, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return ((value / totalValue) * 100).toFixed(2)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Select value={breakdownType} onValueChange={(value) => setBreakdownType(value as BreakdownType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sector">By Sector</SelectItem>
              <SelectItem value="asset_class">By Asset Class</SelectItem>
              <SelectItem value="blockchain">By Blockchain</SelectItem>
              <SelectItem value="country">By Country</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart Placeholder */}
        <div className="h-64 border rounded-md flex items-center justify-center bg-muted/20">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Pie/Donut chart will be rendered here</p>
            <p className="text-sm text-muted-foreground">
              Integration with charting library (e.g., Recharts) pending
            </p>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Breakdown Details</h4>
          <div className="space-y-1">
            {breakdownData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ 
                      backgroundColor: `hsl(${(index * 360) / breakdownData.length}, 70%, 50%)` 
                    }}
                  />
                  <span>{item.name}</span>
                  <Badge variant="outline">{formatPercentage(item.value)}%</Badge>
                </div>
                <span className="font-mono">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="border-t pt-4">
          <div className="flex justify-between text-sm font-semibold">
            <span>Total Portfolio Value</span>
            <span className="font-mono">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
