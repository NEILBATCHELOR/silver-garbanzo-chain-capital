/**
 * Path Finder Component
 * Find payment paths for cross-currency transactions
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { XRPLPathFindingService } from '@/services/wallet/ripple/paths'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search, TrendingUp } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PathFinderProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

interface PathResult {
  paths: any[]
  alternatives: any[]
}

export function PathFinder({ wallet, network, projectId }: PathFinderProps) {
  const { toast } = useToast()
  const [isSearching, setIsSearching] = useState(false)
  const [paths, setPaths] = useState<PathResult | null>(null)
  const [formData, setFormData] = useState({
    destination: '',
    amount: '',
    currency: 'USD',
    issuer: ''
  })

  const handleSearch = async () => {
    try {
      setIsSearching(true)
      setPaths(null)

      const client = await xrplClientManager.getClient(network)
      const pathService = new XRPLPathFindingService(client)

      const result = await pathService.findPaths({
        sourceAccount: wallet.address,
        destinationAccount: formData.destination,
        destinationAmount: {
          currency: formData.currency,
          issuer: formData.issuer,
          value: formData.amount
        }
      })

      setPaths({
        paths: result.alternatives?.[0]?.paths_computed || [],
        alternatives: result.alternatives || []
      })

      toast({
        title: 'Paths Found',
        description: `Found ${result.alternatives?.length || 0} alternative payment routes`
      })

    } catch (error) {
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Path Finder</CardTitle>
        <CardDescription>
          Find optimal payment paths for cross-currency transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Path finding helps you send payments in different currencies by finding conversion routes through the DEX.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          <div>
            <Label>Destination Address</Label>
            <Input
              placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3HMfeeXX"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="100"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input
                placeholder="USD"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Issuer (for tokens)</Label>
            <Input
              placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3HMfeeXX"
              value={formData.issuer}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
            />
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={isSearching || !formData.destination || !formData.amount}
          className="w-full"
        >
          {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Search className="h-4 w-4 mr-2" />
          Find Paths
        </Button>

        {paths && (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Available Paths</h3>
              {paths.paths.length === 0 ? (
                <p className="text-sm text-muted-foreground">No direct paths found</p>
              ) : (
                <div className="space-y-2">
                  {paths.paths.slice(0, 3).map((path, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>Path {index + 1}: {JSON.stringify(path).slice(0, 100)}...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {paths.alternatives.length > 0 && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Alternative Paths</h3>
                <p className="text-sm text-muted-foreground">
                  {paths.alternatives.length} alternative routes available
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
