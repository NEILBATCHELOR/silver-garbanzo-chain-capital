import React, { useState, useEffect, useMemo } from 'react'
import { Wallet } from 'xrpl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, DollarSign, Info, TrendingUp, Calendar } from 'lucide-react'
import { supabase } from '@/infrastructure/database/client'
import { AMMPool } from './types'

interface FeeData {
  id: string
  asset1Fees: string
  asset2Fees: string
  collectionDate: string
  ledgerIndex: number
}

interface AMMFeeCollectionProps {
  pool: AMMPool
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
}

export function AMMFeeCollection({ 
  pool, 
  wallet, 
  network,
  projectId 
}: AMMFeeCollectionProps) {
  const [fees, setFees] = useState<FeeData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalFees, setTotalFees] = useState({
    asset1: '0',
    asset2: '0'
  })

  useEffect(() => {
    loadFeeData()
  }, [pool.id, projectId])

  const loadFeeData = async () => {
    setIsLoading(true)
    try {
      // Load fee collection history from database
      const { data, error } = await supabase
        .from('xrpl_amm_fees_collected')
        .select('*')
        .eq('pool_id', pool.id)
        .order('collection_date', { ascending: false })
        .limit(30)

      if (error) throw error

      const feeData: FeeData[] = (data || []).map(row => ({
        id: row.id,
        asset1Fees: row.asset1_fees,
        asset2Fees: row.asset2_fees,
        collectionDate: row.collection_date,
        ledgerIndex: row.ledger_index
      }))

      setFees(feeData)

      // Calculate total fees collected
      const totals = feeData.reduce(
        (acc, fee) => ({
          asset1: (parseFloat(acc.asset1) + parseFloat(fee.asset1Fees)).toFixed(6),
          asset2: (parseFloat(acc.asset2) + parseFloat(fee.asset2Fees)).toFixed(6)
        }),
        { asset1: '0', asset2: '0' }
      )

      setTotalFees(totals)

    } catch (error) {
      console.error('Failed to load fee data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate average daily fees
  const avgDailyFees = useMemo(() => {
    if (fees.length === 0) return { asset1: '0', asset2: '0' }

    const days = fees.length
    return {
      asset1: (parseFloat(totalFees.asset1) / days).toFixed(6),
      asset2: (parseFloat(totalFees.asset2) / days).toFixed(6)
    }
  }, [fees, totalFees])

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Fees Collected */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Fees Collected
            </CardTitle>
            <CardDescription>All-time fee earnings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">{pool.asset1Currency}</div>
              <div className="text-2xl font-bold">{totalFees.asset1}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{pool.asset2Currency}</div>
              <div className="text-2xl font-bold">{totalFees.asset2}</div>
            </div>
          </CardContent>
        </Card>

        {/* Average Daily Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Average Daily Fees
            </CardTitle>
            <CardDescription>Based on {fees.length} days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">{pool.asset1Currency}</div>
              <div className="text-2xl font-bold">{avgDailyFees.asset1}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{pool.asset2Currency}</div>
              <div className="text-2xl font-bold">{avgDailyFees.asset2}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Collection History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fee Collection History
          </CardTitle>
          <CardDescription>
            Daily fee collection for the last {fees.length} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fees.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No fee collection data available yet. Fees are collected and recorded daily.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-4 pb-2 border-b font-semibold text-sm">
                <div>Date</div>
                <div className="text-right">{pool.asset1Currency} Fees</div>
                <div className="text-right">{pool.asset2Currency} Fees</div>
                <div className="text-right">Ledger</div>
              </div>

              <div className="space-y-1">
                {fees.map((fee) => (
                  <div 
                    key={fee.id} 
                    className="grid grid-cols-4 gap-4 py-2 text-sm hover:bg-muted/50 rounded-lg px-2"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(fee.collectionDate)}
                    </div>
                    <div className="text-right font-mono">
                      {parseFloat(fee.asset1Fees).toFixed(6)}
                    </div>
                    <div className="text-right font-mono">
                      {parseFloat(fee.asset2Fees).toFixed(6)}
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {fee.ledgerIndex.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1 text-xs">
            <p><strong>How fees work:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li>Trading fees are charged on every swap through the pool</li>
              <li>Fees are automatically added to the pool's liquidity reserves</li>
              <li>Your LP tokens represent a proportional share of the pool, including accumulated fees</li>
              <li>When you withdraw liquidity, you receive your share of the accumulated fees</li>
              <li>Current fee rate: {(pool.tradingFee / 10).toFixed(2)}%</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default AMMFeeCollection
