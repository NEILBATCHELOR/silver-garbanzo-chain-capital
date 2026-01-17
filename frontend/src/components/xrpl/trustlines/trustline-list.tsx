/**
 * Trust Line List Component
 * View all active trust lines
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, Trash2 } from 'lucide-react'

interface TrustLineListProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function TrustLineList({ wallet, network, projectId }: TrustLineListProps) {
  const [trustLines] = useState<any[]>([])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trust Lines</CardTitle>
        <CardDescription>
          View and manage your active trust lines
        </CardDescription>
      </CardHeader>
      <CardContent>
        {trustLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trust lines found</p>
        ) : (
          <div className="space-y-2">
            {trustLines.map((trustLine, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{trustLine.currency}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {trustLine.issuer.slice(0, 12)}...
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{trustLine.balance}</Badge>
                  <Badge variant="outline">{trustLine.limit}</Badge>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
