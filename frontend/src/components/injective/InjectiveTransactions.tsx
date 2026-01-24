/**
 * Injective Transactions
 * View and track all Injective TokenFactory transactions
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'

interface InjectiveTransactionsProps {
  projectId: string
}

export function InjectiveTransactions({ projectId }: InjectiveTransactionsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Transaction History
              </CardTitle>
              <CardDescription>
                View all Injective TokenFactory transactions for this project
              </CardDescription>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Transaction history will be displayed here</p>
            <p className="text-sm mt-2">
              Track token deployments, mints, burns, and market operations
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InjectiveTransactions
