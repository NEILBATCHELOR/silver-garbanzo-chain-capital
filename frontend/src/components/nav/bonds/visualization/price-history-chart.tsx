import { useMemo } from 'react'
import { format } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface PriceHistoryChartProps {
  data: Array<{
    priceDate: string
    cleanPrice: number
    bidPrice?: number
    askPrice?: number
    ytm?: number
  }>
  bondName: string
  showBidAsk?: boolean
}

export function PriceHistoryChart({
  data,
  bondName,
  showBidAsk = false,
}: PriceHistoryChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => new Date(a.priceDate).getTime() - new Date(b.priceDate).getTime())
      .map((item) => ({
        date: format(new Date(item.priceDate), 'MMM dd, yyyy'),
        price: item.cleanPrice,
        bid: item.bidPrice,
        ask: item.askPrice,
        ytm: item.ytm ? item.ytm * 100 : undefined, // Convert to percentage
      }))
  }, [data])

  const firstPrice = chartData[0]?.price || 0
  const lastPrice = chartData[chartData.length - 1]?.price || 0
  const change = lastPrice - firstPrice
  const changePercent = firstPrice !== 0 ? (change / firstPrice) * 100 : 0

  const minPrice = Math.min(...chartData.map((d) => d.price))
  const maxPrice = Math.max(...chartData.map((d) => d.price))
  const avgPrice = chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length

  const avgYTM = chartData
    .filter((d) => d.ytm !== undefined)
    .reduce((sum, d) => sum + (d.ytm || 0), 0) / chartData.filter((d) => d.ytm !== undefined).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Price History
            </CardTitle>
            <CardDescription>{bondName}</CardDescription>
          </div>
          <div className="text-right space-y-1">
            <div className="text-2xl font-bold">{lastPrice.toFixed(4)}%</div>
            <div className={`flex items-center gap-1 text-sm ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {change >= 0 ? '+' : ''}
                {change.toFixed(4)}%
              </span>
              <span className="text-muted-foreground">
                ({changePercent >= 0 ? '+' : ''}
                {changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Min Price</div>
            <div className="text-sm font-medium">{minPrice.toFixed(4)}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Avg Price</div>
            <div className="text-sm font-medium">{avgPrice.toFixed(4)}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Max Price</div>
            <div className="text-sm font-medium">{maxPrice.toFixed(4)}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Avg YTM</div>
            <div className="text-sm font-medium">
              {!isNaN(avgYTM) ? `${avgYTM.toFixed(3)}%` : '-'}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                yAxisId="price"
                orientation="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
              />
              <YAxis
                yAxisId="ytm"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <div className="font-medium mb-2">{data.date}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Clean Price:</span>
                            <span className="font-medium">{data.price.toFixed(4)}%</span>
                          </div>
                          {showBidAsk && data.bid && (
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Bid:</span>
                              <span className="font-medium">{data.bid.toFixed(4)}%</span>
                            </div>
                          )}
                          {showBidAsk && data.ask && (
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Ask:</span>
                              <span className="font-medium">{data.ask.toFixed(4)}%</span>
                            </div>
                          )}
                          {data.ytm && (
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">YTM:</span>
                              <span className="font-medium">{data.ytm.toFixed(3)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              
              {/* Bid-Ask Spread Area */}
              {showBidAsk && (
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="bid"
                  stroke="hsl(var(--muted))"
                  fill="hsl(var(--muted))"
                  fillOpacity={0.3}
                  name="Bid-Ask Spread"
                />
              )}
              {showBidAsk && (
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="ask"
                  stroke="hsl(var(--muted))"
                  fill="hsl(var(--muted))"
                  fillOpacity={0.3}
                />
              )}

              {/* Price Line */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Clean Price"
              />

              {/* YTM Line */}
              <Line
                yAxisId="ytm"
                type="monotone"
                dataKey="ytm"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                name="YTM"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="outline">Clean Price (Left Axis)</Badge>
          <Badge variant="outline">YTM (Right Axis)</Badge>
          {showBidAsk && <Badge variant="outline">Bid-Ask Spread (Area)</Badge>}
        </div>
      </CardContent>
    </Card>
  )
}
