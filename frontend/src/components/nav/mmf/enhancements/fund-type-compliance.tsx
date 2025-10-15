/**
 * ENHANCEMENT 2: Fund-Type Specific Compliance
 * Displays fund-type specific regulatory requirements and validation
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
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface FundTypeComplianceProps {
  fundId: string
  fundType: string
}

export function FundTypeCompliance({ fundId, fundType }: FundTypeComplianceProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mmf-fund-type-validation', fundId],
    queryFn: () => MMFAPI.getFundTypeValidation(fundId),
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
            Failed to load compliance data: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const compliance = data?.data

  if (!compliance) {
    return null
  }

  const getRuleIcon = (isCompliant: boolean, severity: string) => {
    if (isCompliant) return <CheckCircle2 className="h-5 w-5 text-green-500" />
    if (severity === 'critical') return <XCircle className="h-5 w-5 text-red-500" />
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {fundType.charAt(0).toUpperCase() + fundType.slice(1)} MMF Compliance
            </CardTitle>
            <CardDescription>
              Fund-type specific regulatory requirements
            </CardDescription>
          </div>
          <Badge variant={compliance.allRulesMet ? 'secondary' : 'destructive'}>
            {compliance.allRulesMet ? 'Compliant' : 'Violations'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Rules List */}
          {compliance.specificRules.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
              {getRuleIcon(rule.isCompliant, rule.severity)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">{rule.rule}</h4>
                  <Badge variant={rule.isCompliant ? 'secondary' : 'destructive'}>
                    {rule.isCompliant ? 'Compliant' : 'Violation'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {rule.requirement}
                </p>
                <p className="text-sm font-medium">
                  Actual: {typeof rule.actualValue === 'number'
                    ? `${rule.actualValue.toFixed(2)}%`
                    : rule.actualValue
                  }
                </p>
              </div>
            </div>
          ))}

          {/* Violations Alert */}
          {compliance.violations.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Compliance Violations</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {compliance.violations.map((violation, idx) => (
                    <li key={idx}>{violation}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {compliance.allRulesMet && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                All {fundType} MMF regulatory requirements are met.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
