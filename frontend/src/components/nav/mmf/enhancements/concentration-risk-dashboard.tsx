/**
 * ENHANCEMENT 3: Concentration Risk Dashboard
 * Displays issuer exposure monitoring with 5% limit compliance
 * Following Bonds pattern - Zero hardcoded values
 */

import { useQuery } from '@tanstack/react-query'
import { MMFAPI } from '@/infrastructure/api/nav/mmf-api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

interface ConcentrationRiskDashboardProps {
  fundId: string
}

export function ConcentrationRiskDashboard({ fundId }: ConcentrationRiskDashboardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mmf-concentration-risk', fundId],
    queryFn: () => MMFAPI.getConcentrationRisk(fundId),
    staleTime: 5 * 60 * 1000
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
            Failed to load concentration risk data: {error instanceof Error ? error.message : 'Unknown error'}
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
      case 'violation': return 'destructive'
      case 'warning': return 'default'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Concentration Risk Dashboard</CardTitle>
              <CardDescription>Issuer exposure monitoring (SEC 5% limit)</CardDescription>
            </div>
            <Badge variant={getStatusColor(analysis.complianceStatus)}>
              {analysis.complianceStatus.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{analysis.totalExposedIssuers}</div>
              <div className="text-sm text-muted-foreground">Total Issuers</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-500">
                {analysis.alerts.filter((a) => a.severity === 'critical').length}
              </div>
              <div className="text-sm text-muted-foreground">Critical Violations</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-500">
                {analysis.alerts.filter((a) => a.severity === 'warning').length}
              </div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Concentration Alerts */}
      {analysis.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Concentration Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.alerts.map((alert, idx) => (
                <Alert
                  key={idx}
                  variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.issuer}</span>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                      {alert.currentExposure.toFixed(2)}% (Limit: {alert.limit}%)
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Exceeds by: <strong>+{alert.exceedBy.toFixed(2)}%</strong></div>
                      <div>Securities: <strong>{alert.numberOfSecurities}</strong></div>
                      <div>Total Value: <strong>${(alert.totalValue / 1_000_000).toFixed(2)}M</strong></div>
                      {alert.isAffiliated && (
                        <div className="col-span-2">
                          <Badge variant="secondary">Affiliated Issuer</Badge>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t">
                      <p className="font-medium text-sm">Suggested Action:</p>
                      <p className="text-sm">{alert.suggestedAction}</p>
                    </div>
                    {alert.alternativeIssuers && alert.alternativeIssuers.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="font-medium text-sm">Alternative Issuers:</p>
                        <div className="flex gap-2 flex-wrap mt-1">
                          {alert.alternativeIssuers.map((alt, i) => (
                            <Badge key={i} variant="outline">{alt}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 10 Issuers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Issuer Exposures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead className="text-right">Exposure</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Securities</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.topIssuers.map((issuer, idx) => {
                  const alert = analysis.alerts.find((a) => a.issuer === issuer.issuer)
                  return (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{issuer.issuer}</TableCell>
                      <TableCell className="text-right">
                        <span className={issuer.exposure > 5 ? 'text-red-500 font-bold' : ''}>
                          {issuer.exposure.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        ${(issuer.value / 1_000_000).toFixed(2)}M
                      </TableCell>
                      <TableCell className="text-right">{issuer.securities}</TableCell>
                      <TableCell>
                        {alert ? (
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                            {alert.severity === 'critical' ? 'Violation' : 'Warning'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Compliant</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                {rec.startsWith('✅') ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                )}
                <span className="text-sm">{rec.replace(/^(✅|⚠️)\s*/, '')}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
