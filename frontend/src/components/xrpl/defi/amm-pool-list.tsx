/**
 * AMM Pool List Component
 * Displays list of AMM pools with ability to add/remove liquidity
 */

import React, { useState, useEffect, useMemo } from 'react'
import type { AMMPoolListProps, AMMPoolData } from './types'
import { XRPLAMMDatabaseService, type DBAMMPool } from '@/services/wallet/ripple/defi'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Droplets, TrendingUp, RefreshCw } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function AMMPoolList({ wallet, network, projectId, onSelectPool }: AMMPoolListProps) {
  const { toast } = useToast()
  const [pools, setPools] = useState<AMMPoolData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Initialize database service
  const databaseService = useMemo(() => {
    return new XRPLAMMDatabaseService(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
  }, [])

  useEffect(() => {
    loadPools()
  }, [projectId, wallet.address])

  const loadPools = async () => {
    if (!projectId) return

    try {
      setIsLoading(true)
      const dbPools = await databaseService.getProjectPools(projectId)
      
      // Convert DBAMMPool to AMMPoolData
      const poolData: AMMPoolData[] = dbPools.map((dbPool: DBAMMPool) => ({
        poolId: dbPool.id,
        ammId: dbPool.amm_id,
        lpTokenCurrency: dbPool.lp_token_currency,
        asset1Currency: dbPool.asset1_currency,
        asset1Issuer: dbPool.asset1_issuer || undefined,
        asset1Balance: dbPool.asset1_balance,
        asset2Currency: dbPool.asset2_currency,
        asset2Issuer: dbPool.asset2_issuer || undefined,
        asset2Balance: dbPool.asset2_balance,
        lpTokenSupply: dbPool.lp_token_supply,
        tradingFee: dbPool.trading_fee,
        auctionSlotHolder: dbPool.auction_slot_holder || undefined,
        auctionSlotPrice: dbPool.auction_slot_price || undefined,
        auctionSlotExpiration: dbPool.auction_slot_expiration || undefined,
        status: dbPool.status,
        createdAt: dbPool.created_at,
        updatedAt: dbPool.updated_at
      }))
      
      setPools(poolData)
    } catch (error) {
      console.error('Error loading pools:', error)
      toast({
        title: 'Error',
        description: 'Failed to load AMM pools',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }

  const formatFee = (fee: number) => {
    return `${(fee / 10).toFixed(2)}%`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (pools.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Droplets className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No AMM Pools</h3>
          <p className="text-muted-foreground mb-4">
            Create your first AMM pool to start earning trading fees
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              AMM Pools
            </CardTitle>
            <CardDescription>
              {pools.length} pool{pools.length !== 1 ? 's' : ''} available
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadPools}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pool</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead>Liquidity</TableHead>
              <TableHead>Trading Fee</TableHead>
              <TableHead>LP Tokens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pools.map((pool) => (
              <TableRow key={pool.poolId}>
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <div className="font-mono text-xs">{pool.ammId.slice(0, 8)}...</div>
                    <div className="text-xs text-muted-foreground">{pool.lpTokenCurrency}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm">{pool.asset1Currency} / {pool.asset2Currency}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBalance(pool.asset1Balance)} / {formatBalance(pool.asset2Balance)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-medium">
                      ${(parseFloat(pool.asset1Balance) + parseFloat(pool.asset2Balance)).toLocaleString()}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{formatFee(pool.tradingFee)}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{formatBalance(pool.lpTokenSupply)}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={pool.status === 'active' ? 'default' : 'secondary'}>
                    {pool.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectPool?.(pool)}
                  >
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
