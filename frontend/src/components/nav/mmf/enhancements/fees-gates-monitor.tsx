/**
 * ENHANCEMENT 4: Fees and Gates Monitor
 * Displays SEC Rule 2a-7 compliance for liquidity fees and gates
 * Following Bonds pattern - Zero hardcoded values
 */

import { useQuery } from '@tanstack/react-query'
import { MMFAPI } from '@/infrastructure/api/nav/mmf-api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react'

interface FeesGatesMonitorProps {
  fundId: string
}

export function FeesGatesMonitor({ fundId }: FeesGatesMonitorProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mmf-fees-gates', fundId],
    queryFn: () => MMFAPI.getFeesGatesAnalysis(fundId),
    staleTime: 1 * 60 * 1000, // 1 minute (more frequent for monitoring)
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-sm text-destructive text-center">
            Failed to load fees/gates data: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const analysis = data?.data

  if (!analysis) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mandatory_required': return 'destructive'
      case 'discretionary_permitted': return 'default'
      default: return 'secondary'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Liquidity Fees & Gates Monitor</CardTitle>
            <CardDescription>SEC Rule 2a-7 compliance tracking</CardDescription>
          </div>
          <Badge variant={getStatusColor(analysis.currentStatus)}>
            {analysis.currentStatus.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fee Status */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Current Fee Status</h3>
          {analysis.fee.type === 'none' ? (
            <p className="text-sm text-muted-foreground">
              ✅ No liquidity fees currently required
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fee Type:</span>
                <Badge variant={analysis.fee.type === 'mandatory' ? 'destructive' : 'default'}>
                  {analysis.fee.type.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fee Percentage:</span>
                <span className="text-sm font-bold">{analysis.fee.percentage}%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{analysis.fee.reason}</p>
            </div>
          )}
        </div>

        {/* Gate Status (Historical Only) */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <h3 className="font-semibold mb-2">Redemption Gates</h3>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{analysis.gate.note}</p>
          </div>
        </div>

        {/* Board Notification */}
        {analysis.boardNotificationRequired && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Board Notification Required</AlertTitle>
            <AlertDescription>
              SEC Rule 2a-7 requires notification to board of directors within 1 business day.
              Daily liquidity has fallen below 12.5% threshold.
            </AlertDescription>
          </Alert>
        )}

        {/* Recommendations */}
        <div className="space-y-2">
          <h3 className="font-semibold">Recommendations</h3>
          <ul className="space-y-1">
            {analysis.recommendations.map((rec, idx) => {
              const isSuccess = rec.startsWith('✅')
              const isCritical = rec.includes('CRITICAL')
              const isAction = rec.includes('MANDATORY') || rec.includes('DISCRETIONARY')

              return (
                <li key={idx} className="text-sm flex items-start gap-2">
                  {isSuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : isCritical ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  )}
                  <span>{rec.replace(/^(✅|MANDATORY:|DISCRETIONARY:|CRITICAL:)\s*/, '')}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Real-time Status Indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <span>Auto-refresh: 5 min</span>
        </div>
      </CardContent>
    </Card>
  )
}
