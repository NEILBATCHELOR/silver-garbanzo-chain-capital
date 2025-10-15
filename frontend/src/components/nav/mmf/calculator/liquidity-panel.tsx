import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Droplets, TrendingUp, Clock, Target } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/utils/utils'

interface LiquidityPanelProps {
  dailyLiquidPercentage: number
  weeklyLiquidPercentage: number
  wam: number
  wal: number
}

export function LiquidityPanel({
  dailyLiquidPercentage,
  weeklyLiquidPercentage,
  wam,
  wal,
}: LiquidityPanelProps) {
  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals)
  }

  const getDailyLiquidityStatus = (percentage: number) => {
    if (percentage >= 25) return { level: 'Compliant', color: 'bg-green-500', variant: 'default' as const }
    if (percentage >= 12.5) return { level: 'Warning', color: 'bg-yellow-500', variant: 'secondary' as const }
    return { level: 'Critical', color: 'bg-red-500', variant: 'destructive' as const }
  }

  const getWeeklyLiquidityStatus = (percentage: number) => {
    if (percentage >= 50) return { level: 'Compliant', color: 'bg-green-500', variant: 'default' as const }
    if (percentage >= 30) return { level: 'Warning', color: 'bg-yellow-500', variant: 'secondary' as const }
    return { level: 'Critical', color: 'bg-red-500', variant: 'destructive' as const }
  }

  const dailyStatus = getDailyLiquidityStatus(dailyLiquidPercentage)
  const weeklyStatus = getWeeklyLiquidityStatus(weeklyLiquidPercentage)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Liquidity Metrics
        </CardTitle>
        <CardDescription>
          SEC Rule 2a-7 liquidity requirements and maturity metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Liquid Assets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Daily Liquid Assets</div>
            <Badge variant={dailyStatus.variant}>
              {dailyStatus.level}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current</span>
              <span className="font-bold">{formatNumber(dailyLiquidPercentage, 1)}%</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
              <div 
                className={cn("h-full transition-all", dailyStatus.color)}
                style={{ width: `${Math.min(dailyLiquidPercentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Minimum: 25%</span>
              <span>Critical: 12.5%</span>
            </div>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded cursor-help">
                  ℹ️ Assets that can be converted to cash within 1 business day
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Daily liquid assets include cash, direct obligations of the U.S. Government,
                  and securities that mature within 1 business day. Must maintain ≥ 25% to comply
                  with SEC Rule 2a-7. If below 12.5%, must notify the board within 1 business day.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Weekly Liquid Assets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Weekly Liquid Assets</div>
            <Badge variant={weeklyStatus.variant}>
              {weeklyStatus.level}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current</span>
              <span className="font-bold">{formatNumber(weeklyLiquidPercentage, 1)}%</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
              <div 
                className={cn("h-full transition-all", weeklyStatus.color)}
                style={{ width: `${Math.min(weeklyLiquidPercentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Minimum: 50%</span>
              <span>Warning: 30%</span>
            </div>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded cursor-help">
                  ℹ️ Assets that can be converted to cash within 5 business days
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Weekly liquid assets include daily liquid assets plus securities that mature
                  within 5 business days. Must maintain ≥ 50% to comply with SEC Rule 2a-7.
                  If below 30%, may impose liquidity fees or redemption gates.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Maturity Metrics */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Maturity Metrics</div>
          <div className="grid grid-cols-2 gap-4">
            {/* WAM */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-help">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      WAM
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(wam, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      days (max: 60)
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <p className="font-medium">Weighted Average Maturity</p>
                    <p className="text-sm">
                      Dollar-weighted average maturity of all holdings. Must be ≤ 60 days
                      for retail and prime MMFs. Measures interest rate risk and portfolio
                      sensitivity to rate changes.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* WAL */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-help">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      WAL
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(wal, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      days (max: 120)
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <p className="font-medium">Weighted Average Life</p>
                    <p className="text-sm">
                      Dollar-weighted average life to final maturity, ignoring puts and calls.
                      Must be ≤ 120 days. Provides a measure of portfolio duration without
                      considering early redemption features.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Liquidity Coverage Info */}
        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3 w-3" />
            <span className="font-medium">Liquidity Coverage</span>
          </div>
          <p>
            Daily + Weekly liquid assets provide a cushion against redemption pressures.
            Higher liquidity allows the fund to meet redemptions without selling securities
            at unfavorable prices.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
