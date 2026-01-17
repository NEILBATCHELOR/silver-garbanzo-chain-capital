/**
 * Compliance Dashboard Component
 * Overview of compliance status and controls
 */

import React, { useState, useEffect } from 'react'
import type { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Lock, Users, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ComplianceDashboardProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function ComplianceDashboard({ wallet, network, projectId }: ComplianceDashboardProps) {
  const [complianceStatus, setComplianceStatus] = useState({
    globalFreeze: false,
    depositAuth: false,
    authorizedCount: 0,
    frozenTrustLines: 0
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Dashboard</CardTitle>
        <CardDescription>
          Overview of compliance controls and status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Monitor and manage your compliance settings
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Global Freeze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {complianceStatus.globalFreeze ? 'Enabled' : 'Disabled'}
                </span>
                <Badge variant={complianceStatus.globalFreeze ? 'destructive' : 'secondary'}>
                  {complianceStatus.globalFreeze ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                All trust lines frozen
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Deposit Authorization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {complianceStatus.depositAuth ? 'Enabled' : 'Disabled'}
                </span>
                <Badge variant={complianceStatus.depositAuth ? 'default' : 'secondary'}>
                  {complianceStatus.authorizedCount} Authorized
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Whitelist-based deposits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Frozen Trust Lines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {complianceStatus.frozenTrustLines}
                </span>
                <Badge variant={complianceStatus.frozenTrustLines > 0 ? 'destructive' : 'secondary'}>
                  Individual Freezes
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Specific trust lines frozen
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Compliance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">
                  Good
                </span>
                <Badge variant="default">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                All controls operational
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
