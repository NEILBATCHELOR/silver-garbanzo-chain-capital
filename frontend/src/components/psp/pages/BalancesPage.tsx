/**
 * Balances Management Page
 * Simple interface for viewing and syncing balances
 */

import React from 'react'
import { useBalances } from '@/hooks/psp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Wallet, DollarSign, Coins } from 'lucide-react'
import { cn } from '@/utils/utils'

interface BalancesPageProps {
  projectId: string
}

export default function BalancesPage({ projectId }: BalancesPageProps) {
  const {
    balances,
    summary,
    loading,
    error,
    fetchBalances,
    syncBalances
  } = useBalances(projectId)

  const handleSync = async () => {
    await syncBalances({ project_id: projectId })
  }

  const formatCurrency = (amount: string, symbol: string) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return `0 ${symbol}`
    
    if (symbol === 'USD' || symbol.includes('USD')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num)
    }
    
    return `${num.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 8 
    })} ${symbol}`
  }

  // Safely filter balances (ensure it's an array)
  const safeBalances = Array.isArray(balances) ? balances : []
  const fiatBalances = safeBalances.filter(b => b.asset_type === 'fiat')
  const cryptoBalances = safeBalances.filter(b => b.asset_type === 'crypto')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Balances</h1>
          <p className="text-muted-foreground">View and sync multi-asset balances</p>
        </div>
        <Button onClick={handleSync} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Sync Balances
        </Button>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardDescription>Total Balance (USD)</CardDescription>
          <CardTitle className="text-4xl">
            {summary?.total_usd_value !== undefined && summary.total_usd_value !== null
              ? formatCurrency(summary.total_usd_value.toString(), 'USD')
              : '$0.00'}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fiat Balances</CardDescription>
            <CardTitle className="text-2xl">{fiatBalances.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Crypto Balances</CardDescription>
            <CardTitle className="text-2xl">{cryptoBalances.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Assets</CardDescription>
            <CardTitle className="text-2xl">{balances.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Fiat Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fiat Balances
          </CardTitle>
          <CardDescription>Traditional currency balances</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Locked</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Wallet ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && fiatBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : fiatBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No fiat balances found
                  </TableCell>
                </TableRow>
              ) : (
                fiatBalances.map((balance) => (
                  <TableRow key={balance.id}>
                    <TableCell className="font-medium">{balance.asset_symbol}</TableCell>
                    <TableCell>{formatCurrency(balance.available_balance, balance.asset_symbol)}</TableCell>
                    <TableCell>{formatCurrency(balance.locked_balance, balance.asset_symbol)}</TableCell>
                    <TableCell>{formatCurrency(balance.pending_balance, balance.asset_symbol)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(balance.total_balance, balance.asset_symbol)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {balance.warp_wallet_id?.substring(0, 12) || '-'}...
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Crypto Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Crypto Balances
          </CardTitle>
          <CardDescription>Cryptocurrency balances across networks</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Locked</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Wallet Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && cryptoBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : cryptoBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No crypto balances found
                  </TableCell>
                </TableRow>
              ) : (
                cryptoBalances.map((balance) => (
                  <TableRow key={balance.id}>
                    <TableCell className="font-medium">{balance.asset_symbol}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{balance.network}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(balance.available_balance, balance.asset_symbol)}</TableCell>
                    <TableCell>{formatCurrency(balance.locked_balance, balance.asset_symbol)}</TableCell>
                    <TableCell>{formatCurrency(balance.pending_balance, balance.asset_symbol)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(balance.total_balance, balance.asset_symbol)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {balance.wallet_address ? (
                        <span>{balance.wallet_address.substring(0, 6)}...{balance.wallet_address.substring(balance.wallet_address.length - 4)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
