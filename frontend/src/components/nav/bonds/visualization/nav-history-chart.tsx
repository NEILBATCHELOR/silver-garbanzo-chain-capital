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
  ReferenceLine,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface NAVHistoryChartProps {
  data: Array<{
    calculationDate: string
    netAssetValue: number
    calculationMethod: string
    confidenceLevel: string
  }>
  bondName: string
}

export function NAVHistoryChart({ data, bondName }: NAVHistoryChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => new Date(a.calculationDate).getTime() - new Date(b.calculationDate).getTime())
      .map((item) => ({
        date: format(new Date(item.calculationDate), 'MMM dd, yyyy'),
        nav: item.netAssetValue,
        method: item.calculationMethod,
        confidence: item.confidenceLevel,
      }))
  }, [data])

  const firstValue = chartData[0]?.nav || 0
  const lastValue = chartData[chartData.length - 1]?.nav || 0
  const change = lastValue - firstValue
  const changePercent = firstValue !== 0 ? (change / firstValue) * 100 : 0

  const minValue = Math.min(...chartData.map((d) => d.nav))
  const maxValue = Math.max(...chartData.map((d) => d.nav))
  const avgValue = chartData.reduce((sum, d) => sum + d.nav, 0) / chartData.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>NAV History</CardTitle>
            <CardDescription>{bondName}</CardDescription>
          </div>
          <div className="text-right space-y-1">
            <div className="text-2xl font-bold">
              ${lastValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
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
                ${Math.abs(change).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
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
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Minimum</div>
            <div className="text-sm font-medium">
              ${minValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Average</div>
            <div className="text-sm font-medium">
              ${avgValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Maximum</div>
            <div className="text-sm font-medium">
              ${maxValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
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
                            <span className="text-muted-foreground">NAV:</span>
                            <span className="font-medium">
                              ${data.nav.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Method:</span>
                            <Badge variant="outline" className="text-xs">
                              {data.method}
                            </Badge>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Confidence:</span>
                            <Badge
                              variant={
                                data.confidence === 'high'
                                  ? 'default'
                                  : data.confidence === 'medium'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className="text-xs"
                            >
                              {data.confidence}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <ReferenceLine
                y={avgValue}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{
                  value: 'Average',
                  position: 'right',
                  fontSize: 12,
                  fill: 'hsl(var(--muted-foreground))',
                }}
              />
              <Line
                type="monotone"
                dataKey="nav"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Net Asset Value"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
