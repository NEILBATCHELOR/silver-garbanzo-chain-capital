/**
 * Market Rates Component
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'

interface MarketRate {
  pair: string
  rate: string
  change24h: string
}

interface MarketRatesProps {
  rates: MarketRate[]
  loading?: boolean
}

export function MarketRates({ rates, loading }: MarketRatesProps) {
  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading rates...</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rates.map((rate) => (
        <Card key={rate.pair}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{rate.pair}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rate.rate}</div>
            <Badge variant="outline" className="mt-2 gap-1">
              <TrendingUp className="h-3 w-3" />
              {rate.change24h}%
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
