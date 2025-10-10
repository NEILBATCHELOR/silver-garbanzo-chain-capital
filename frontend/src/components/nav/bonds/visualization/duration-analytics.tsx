import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, TrendingUp } from 'lucide-react'

interface DurationAnalyticsProps {
  data: Array<{
    calculationDate: string
    modifiedDuration?: number
    macaulayDuration?: number
    convexity?: number
    optionAdjustedDuration?: number
  }>
  bondName: string
}

export function DurationAnalytics({ data, bondName }: DurationAnalyticsProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => new Date(a.calculationDate).getTime() - new Date(b.calculationDate).getTime())
      .map((item) => ({
        date: new Date(item.calculationDate).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        modifiedDuration: item.modifiedDuration || 0,
        macaulayDuration: item.macaulayDuration || 0,
        convexity: item.convexity || 0,
        optionAdjustedDuration: item.optionAdjustedDuration || 0,
      }))
  }, [data])

  const latestData = data[data.length - 1]
  const avgModifiedDuration =
    chartData.reduce((sum, d) => sum + d.modifiedDuration, 0) / chartData.length
  const avgConvexity =
    chartData.reduce((sum, d) => sum + d.convexity, 0) / chartData.length

  const getDurationRiskColor = (duration: number) => {
    if (duration < 3) return 'hsl(var(--chart-1))' // Green - Low risk
    if (duration < 7) return 'hsl(var(--chart-2))' // Yellow - Moderate
    if (duration < 12) return 'hsl(var(--chart-3))' // Orange - High
    return 'hsl(var(--chart-4))' // Red - Very high
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Modified Duration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestData?.modifiedDuration?.toFixed(2) || '-'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg: {avgModifiedDuration.toFixed(2)} years
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Macaulay Duration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestData?.macaulayDuration?.toFixed(2) || '-'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">years</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Convexity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestData?.convexity?.toFixed(2) || '-'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg: {avgConvexity.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>OA Duration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestData?.optionAdjustedDuration?.toFixed(2) || '-'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Option-adjusted
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Duration History Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Duration History
              </CardTitle>
              <CardDescription>{bondName}</CardDescription>
            </div>
            <Badge
              variant={
                latestData?.modifiedDuration && latestData.modifiedDuration < 7
                  ? 'default'
                  : 'secondary'
              }
            >
              {latestData?.modifiedDuration && latestData.modifiedDuration < 3
                ? 'Low Risk'
                : latestData?.modifiedDuration && latestData.modifiedDuration < 7
                ? 'Moderate Risk'
                : latestData?.modifiedDuration && latestData.modifiedDuration < 12
                ? 'High Risk'
                : 'Very High Risk'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                  label={{
                    value: 'Years',
                    angle: -90,
                    position: 'insideLeft',
                  }}
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
                              <span className="text-muted-foreground">Modified:</span>
                              <span className="font-medium">
                                {data.modifiedDuration.toFixed(2)} years
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Macaulay:</span>
                              <span className="font-medium">
                                {data.macaulayDuration.toFixed(2)} years
                              </span>
                            </div>
                            {data.optionAdjustedDuration > 0 && (
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">OA Duration:</span>
                                <span className="font-medium">
                                  {data.optionAdjustedDuration.toFixed(2)} years
                                </span>
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
                <Bar dataKey="modifiedDuration" name="Modified Duration" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getDurationRiskColor(entry.modifiedDuration)}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="macaulayDuration"
                  fill="hsl(var(--muted))"
                  name="Macaulay Duration"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Convexity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Convexity Trend
          </CardTitle>
          <CardDescription>
            Measures price-yield curve curvature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <div className="font-medium mb-2">{data.date}</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Convexity:</span>
                              <span className="font-medium">
                                {data.convexity.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="convexity"
                  fill="hsl(var(--chart-2))"
                  name="Convexity"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
