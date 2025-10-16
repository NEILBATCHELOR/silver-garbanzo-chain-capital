/**
 * MMF Diagnostic Panel - Display detailed diagnostic information for NAV issues
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AlertTriangle, 
  XCircle, 
  Info, 
  TrendingDown, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react'

interface DiagnosticInfo {
  rootCause: string
  details: string[]
  recommendations: string[]
  severity: 'critical' | 'warning' | 'info'
}

interface MMFDiagnosticPanelProps {
  diagnostic?: DiagnosticInfo
  currentNAV?: number
}

export function MMFDiagnosticPanel({ diagnostic, currentNAV }: MMFDiagnosticPanelProps) {
  if (!diagnostic) return null

  const getSeverityIcon = () => {
    switch (diagnostic.severity) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default: return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityColor = () => {
    switch (diagnostic.severity) {
      case 'critical': return 'destructive'
      case 'warning': return 'default'
      default: return 'secondary'
    }
  }

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getSeverityIcon()}
            <div>
              <CardTitle className="text-lg">NAV Calculation Issue Detected</CardTitle>
              <CardDescription className="mt-1">
                {currentNAV && (
                  <span className="flex items-center gap-2 font-mono">
                    Current NAV: <span className="font-bold text-red-600">${currentNAV.toFixed(4)}</span>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Badge variant={getSeverityColor() as any}>
            {diagnostic.severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Root Cause */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold text-sm text-orange-700 dark:text-orange-400">
              🔍 Root Cause Identified
            </h3>
          </div>
          <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <AlertDescription className="font-medium text-orange-900 dark:text-orange-100">
              {diagnostic.rootCause}
            </AlertDescription>
          </Alert>
        </div>

        {/* Details */}
        {diagnostic.details && diagnostic.details.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                📊 Diagnostic Details
              </h3>
            </div>
            <div className="space-y-2">
              {diagnostic.details.map((detail, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                >
                  <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-blue-900 dark:text-blue-100 font-mono">
                    {detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {diagnostic.recommendations && diagnostic.recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <h3 className="font-semibold text-sm text-green-700 dark:text-green-400">
                💡 Recommended Actions
              </h3>
            </div>
            <div className="space-y-2">
              {diagnostic.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <span className="text-sm text-green-900 dark:text-green-100">
                    {rec}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Action Hint */}
        <Alert className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-purple-900 dark:text-purple-100">
            Need Help?
          </AlertTitle>
          <AlertDescription className="text-purple-700 dark:text-purple-300">
            Follow the recommended actions above to resolve this issue. If problems persist,
            review the MMF holdings in the database and verify all valuations are accurate.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
