import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { 
  Loader2, 
  Users, 
  ExternalLink,
  Copy,
  RefreshCw 
} from 'lucide-react'
import { XRPLMPTService } from '@/services/wallet/ripple/mpt/XRPLMPTService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Holder {
  address: string
  balance: string
  percentage: number
}

interface MPTHoldersProps {
  mptIssuanceId: string
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

export const MPTHolders: React.FC<MPTHoldersProps> = ({
  mptIssuanceId,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const [holders, setHolders] = useState<Holder[]>([])
  const [loading, setLoading] = useState(false)
  const [totalSupply, setTotalSupply] = useState('0')
  const [tokenInfo, setTokenInfo] = useState<{
    ticker: string
    name: string
    assetScale: number
  } | null>(null)

  useEffect(() => {
    loadHolders()
  }, [mptIssuanceId])

  const loadHolders = async () => {
    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)

      // Get token details
      const details = await mptService.getMPTIssuanceDetails(mptIssuanceId)
      setTokenInfo({
        ticker: details.metadata.ticker,
        name: details.metadata.name,
        assetScale: details.assetScale
      })
      setTotalSupply(details.outstandingAmount)

      // Get holders
      const holdersList = await mptService.getMPTHolders(mptIssuanceId)

      // Calculate percentages
      const totalSupplyNum = parseFloat(details.outstandingAmount)
      const holdersWithPercentage = holdersList.map(holder => ({
        address: holder.address,
        balance: holder.balance,
        percentage: (parseFloat(holder.balance) / totalSupplyNum) * 100
      }))

      // Sort by balance descending
      holdersWithPercentage.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))

      setHolders(holdersWithPercentage)
    } catch (error) {
      console.error('Failed to load holders:', error)
      toast({
        title: 'Error',
        description: 'Failed to load token holders',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatBalance = (balance: string, assetScale: number): string => {
    const num = parseFloat(balance) / Math.pow(10, assetScale)
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 0,
      maximumFractionDigits: assetScale
    })
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast({
      title: 'Copied',
      description: 'Address copied to clipboard'
    })
  }

  const getExplorerUrl = (address: string): string => {
    const baseUrls = {
      MAINNET: 'https://livenet.xrpl.org',
      TESTNET: 'https://testnet.xrpl.org',
      DEVNET: 'https://devnet.xrpl.org'
    }
    return `${baseUrls[network]}/accounts/${address}`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Holders</CardTitle>
          <CardDescription>Loading holder information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Token Holders</CardTitle>
            {tokenInfo && (
              <CardDescription>
                {tokenInfo.name} ({tokenInfo.ticker}) • {holders.length} holders
              </CardDescription>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHolders}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {holders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No holders found for this token
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Holders</p>
                <p className="text-2xl font-bold">{holders.length}</p>
              </div>
              {tokenInfo && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Supply</p>
                    <p className="text-2xl font-bold">
                      {formatBalance(totalSupply, tokenInfo.assetScale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Token</p>
                    <p className="text-2xl font-bold">{tokenInfo.ticker}</p>
                  </div>
                </>
              )}
            </div>

            {/* Holders Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holders.map((holder, index) => (
                    <TableRow key={holder.address}>
                      <TableCell className="font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs">
                            {holder.address.slice(0, 8)}...{holder.address.slice(-6)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyAddress(holder.address)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tokenInfo && formatBalance(holder.balance, tokenInfo.assetScale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {holder.percentage.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(getExplorerUrl(holder.address), '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Top Holders Summary */}
            {holders.length >= 3 && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-semibold mb-2">
                  <Users className="h-4 w-4 inline mr-2" />
                  Top 3 Holders Control
                </h4>
                <div className="text-2xl font-bold">
                  {(holders.slice(0, 3).reduce((sum, h) => sum + h.percentage, 0)).toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  of total supply
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
