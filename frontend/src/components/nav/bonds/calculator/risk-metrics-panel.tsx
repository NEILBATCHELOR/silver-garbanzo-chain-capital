import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Shield, Activity, Target } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface RiskMetricsPanelProps {
  metrics: {
    duration?: number
    modifiedDuration?: number
    macaulayDuration?: number
    convexity?: number
    dv01?: number
    spreadDuration?: number
    optionAdjustedDuration?: number
  }
}

export function RiskMetricsPanel({ metrics }: RiskMetricsPanelProps) {
  const formatNumber = (value: number | undefined, decimals: number = 2) => {
    if (value === undefined) return '-'
    return value.toFixed(decimals)
  }

  const getDurationRiskLevel = (duration: number | undefined): {
    level: string
    color: string
    progress: number
  } => {
    if (duration === undefined) return { level: 'Unknown', color: 'bg-gray-500', progress: 0 }
    
    if (duration < 3) return { level: 'Low', color: 'bg-green-500', progress: 25 }
    if (duration < 7) return { level: 'Moderate', color: 'bg-yellow-500', progress: 50 }
    if (duration < 12) return { level: 'High', color: 'bg-orange-500', progress: 75 }
    return { level: 'Very High', color: 'bg-red-500', progress: 100 }
  }

  const getConvexityLevel = (convexity: number | undefined): {
    level: string
    color: string
  } => {
    if (convexity === undefined) return { level: 'Unknown', color: 'text-gray-500' }
    
    if (convexity < 50) return { level: 'Low', color: 'text-orange-600' }
    if (convexity < 150) return { level: 'Moderate', color: 'text-yellow-600' }
    return { level: 'High', color: 'text-green-600' }
  }

  const durationRisk = getDurationRiskLevel(metrics.duration)
  const convexityLevel = getConvexityLevel(metrics.convexity)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Metrics
        </CardTitle>
        <CardDescription>
          Interest rate sensitivity and risk measures
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Duration Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Duration Risk</div>
            <Badge className={durationRisk.color}>
              {durationRisk.level}
            </Badge>
          </div>
          
          <Progress value={durationRisk.progress} className="h-2" />

          <div className="grid grid-cols-2 gap-4">
            {/* Modified Duration */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-help">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Modified Duration
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(metrics.modifiedDuration, 2)}
                    </div>
                    <div className="text-xs text-muted-foreground">years</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs space-y-2">
                    <p className="font-medium">Modified Duration</p>
                    <p className="text-sm">
                      Measures price sensitivity to yield changes. A duration of{' '}
                      {formatNumber(metrics.modifiedDuration)} means the bond price changes{' '}
                      approximately {formatNumber(metrics.modifiedDuration)}% for every 1% change in yield.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Macaulay Duration */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-help">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Macaulay Duration
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(metrics.macaulayDuration, 2)}
                    </div>
                    <div className="text-xs text-muted-foreground">years</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs space-y-2">
                    <p className="font-medium">Macaulay Duration</p>
                    <p className="text-sm">
                      Weighted average time to receive cash flows. Represents the bond's{' '}
                      effective maturity in years.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Convexity Section */}
        {metrics.convexity !== undefined && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Convexity</div>
              <Badge variant="outline" className={convexityLevel.color}>
                {convexityLevel.level}
              </Badge>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors cursor-help">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Convexity Value
                        </div>
                        <div className="text-3xl font-bold">
                          {formatNumber(metrics.convexity, 2)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {metrics.convexity > 0 ? 'Positive' : 'Negative'}
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs space-y-2">
                    <p className="font-medium">Convexity</p>
                    <p className="text-sm">
                      Measures the curvature of the price-yield relationship. Higher convexity{' '}
                      means the bond benefits more from falling rates and suffers less from rising rates.{' '}
                      Positive convexity is generally favorable for bondholders.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Advanced Metrics */}
        {(metrics.dv01 || metrics.spreadDuration || metrics.optionAdjustedDuration) && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Advanced Metrics</div>
            <div className="grid grid-cols-2 gap-3">
              {metrics.dv01 !== undefined && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-help">
                        <div className="text-xs text-muted-foreground">DV01</div>
                        <div className="text-lg font-bold">
                          ${formatNumber(metrics.dv01, 0)}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        Dollar value of a 1 basis point change in yield
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {metrics.spreadDuration !== undefined && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-help">
                        <div className="text-xs text-muted-foreground">Spread Duration</div>
                        <div className="text-lg font-bold">
                          {formatNumber(metrics.spreadDuration, 2)}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        Sensitivity to credit spread changes
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {metrics.optionAdjustedDuration !== undefined && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors col-span-2 cursor-help">
                        <div className="text-xs text-muted-foreground">Option-Adjusted Duration</div>
                        <div className="text-lg font-bold">
                          {formatNumber(metrics.optionAdjustedDuration, 2)} years
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        Duration adjusted for embedded call/put options
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
