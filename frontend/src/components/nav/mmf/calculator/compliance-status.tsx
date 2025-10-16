import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'

interface ComplianceStatusProps {
  complianceStatus: {
    isCompliant: boolean
    wamCompliant: boolean
    walCompliant: boolean
    liquidityCompliant: boolean
    violations: string[]
  }
  wam: number
  wal: number
  dailyLiquidPercentage: number
  weeklyLiquidPercentage: number
  configLimits?: {
    wamLimit: number
    walLimit: number
    dailyLiquidMinimum: number
    weeklyLiquidMinimum: number
  } | null
}

export function ComplianceStatus({
  complianceStatus,
  wam,
  wal,
  dailyLiquidPercentage,
  weeklyLiquidPercentage,
  configLimits,
}: ComplianceStatusProps) {
  // Use config limits if provided, otherwise use defaults
  const wamLimit = configLimits?.wamLimit ?? 60
  const walLimit = configLimits?.walLimit ?? 120
  const dailyLiquidMin = configLimits?.dailyLiquidMinimum ?? 25
  const weeklyLiquidMin = configLimits?.weeklyLiquidMinimum ?? 50
  
  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals)
  }

  const getWAMStatus = () => {
    const percentage = (wam / wamLimit) * 100
    return {
      percentage: Math.min(percentage, 100),
      color: wam <= wamLimit ? 'bg-green-500' : 'bg-red-500',
      status: wam <= wamLimit ? 'Compliant' : 'Violation'
    }
  }

  const getWALStatus = () => {
    const percentage = (wal / walLimit) * 100
    return {
      percentage: Math.min(percentage, 100),
      color: wal <= walLimit ? 'bg-green-500' : 'bg-red-500',
      status: wal <= walLimit ? 'Compliant' : 'Violation'
    }
  }

  const wamStatus = getWAMStatus()
  const walStatus = getWALStatus()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              SEC Rule 2a-7 Compliance
            </CardTitle>
            <CardDescription>
              Regulatory compliance status and requirements
            </CardDescription>
          </div>
          <Badge
            variant={complianceStatus.isCompliant ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            {complianceStatus.isCompliant ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Compliant
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3" />
                Non-Compliant
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Violations Alert */}
        {!complianceStatus.isCompliant && complianceStatus.violations.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Compliance Violations Detected</div>
              <ul className="list-disc list-inside space-y-1">
                {complianceStatus.violations.map((violation, index) => (
                  <li key={index} className="text-sm">{violation}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* WAM Meter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Weighted Average Maturity (WAM)</div>
            <Badge
              variant={complianceStatus.wamCompliant ? 'default' : 'destructive'}
            >
              {wamStatus.status}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current</span>
              <span className="font-bold">{formatNumber(wam, 0)} days</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
              <div 
                className={cn("h-full transition-all", wamStatus.color)}
                style={{ width: `${Math.min(wamStatus.percentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0 days</span>
              <span>Limit: {wamLimit} days</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            {complianceStatus.wamCompliant ? (
              '✓ Within regulatory limit'
            ) : (
              `✗ Exceeds ${wamLimit}-day limit - immediate action required`
            )}
          </div>
        </div>

        {/* WAL Meter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Weighted Average Life (WAL)</div>
            <Badge
              variant={complianceStatus.walCompliant ? 'default' : 'destructive'}
            >
              {walStatus.status}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current</span>
              <span className="font-bold">{formatNumber(wal, 0)} days</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
              <div 
                className={cn("h-full transition-all", walStatus.color)}
                style={{ width: `${Math.min(walStatus.percentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0 days</span>
              <span>Limit: {walLimit} days</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            {complianceStatus.walCompliant ? (
              '✓ Within regulatory limit'
            ) : (
              `✗ Exceeds ${walLimit}-day limit - immediate action required`
            )}
          </div>
        </div>

        {/* Liquidity Compliance Summary */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Liquidity Requirements</div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg border ${
              dailyLiquidPercentage >= dailyLiquidMin
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
            }`}>
              <div className={`text-xs font-medium mb-1 ${
                dailyLiquidPercentage >= dailyLiquidMin
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                Daily Liquid Assets
              </div>
              <div className={`text-lg font-bold ${
                dailyLiquidPercentage >= dailyLiquidMin
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {formatNumber(dailyLiquidPercentage, 1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {dailyLiquidPercentage >= dailyLiquidMin ? `≥ ${dailyLiquidMin}% ✓` : `< ${dailyLiquidMin}% ✗`}
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${
              weeklyLiquidPercentage >= weeklyLiquidMin
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
            }`}>
              <div className={`text-xs font-medium mb-1 ${
                weeklyLiquidPercentage >= weeklyLiquidMin
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                Weekly Liquid Assets
              </div>
              <div className={`text-lg font-bold ${
                weeklyLiquidPercentage >= weeklyLiquidMin
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {formatNumber(weeklyLiquidPercentage, 1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {weeklyLiquidPercentage >= weeklyLiquidMin ? `≥ ${weeklyLiquidMin}% ✓` : `< ${weeklyLiquidMin}% ✗`}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Compliance Status */}
        <div className={`p-4 rounded-lg border ${
          complianceStatus.isCompliant
            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`text-sm font-medium ${
              complianceStatus.isCompliant
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              Overall Compliance Status
            </div>
            {complianceStatus.isCompliant ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div className={`text-xs ${
            complianceStatus.isCompliant
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {complianceStatus.isCompliant
              ? 'All SEC Rule 2a-7 requirements are met'
              : `${complianceStatus.violations.length} violation(s) require immediate attention`
            }
          </div>
        </div>

        {/* Regulatory Reference */}
        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium mb-1">SEC Rule 2a-7 Reference</div>
              <p>
                Money market funds must comply with diversification, quality, maturity,
                and liquidity requirements under Investment Company Act Rule 2a-7.
              </p>
            </div>
          </div>
          <Button
            variant="link"
            size="sm"
            className="mt-2 p-0 h-auto text-blue-600"
            onClick={() => window.open('https://www.sec.gov/rules/final/2023/ic-34959.pdf', '_blank')}
          >
            View Full Regulation
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
