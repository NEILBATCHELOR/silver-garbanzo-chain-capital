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
import { XRPLMPTBlockchainQuery } from '@/services/wallet/ripple/mpt/XRPLMPTBlockchainQuery'
import { formatMPTAmount } from '@/services/wallet/ripple/mpt/utils'
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
  authorized: boolean
  locked: boolean
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

  // Only re-load when issuance ID or network changes
  useEffect(() => {
    if (mptIssuanceId) {
      loadHolders()
    }
  }, [mptIssuanceId, network])

  const loadHolders = async () => {
    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)
      const blockchainQuery = new XRPLMPTBlockchainQuery(network)

      console.log('🔍 Loading MPT holder information...')
      console.log('Issuance ID:', mptIssuanceId)

      // Get token details from blockchain (includes issuer address)
      const details = await mptService.getMPTIssuanceDetails(mptIssuanceId)
      setTokenInfo({
        ticker: details.metadata.ticker,
        name: details.metadata.name,
        assetScale: details.assetScale
      })
      setTotalSupply(details.outstandingAmount)

      console.log('✅ Token details loaded:', {
        ticker: details.metadata.ticker,
        name: details.metadata.name,
        issuer: details.issuer,
        outstandingAmount: details.outstandingAmount
      })

      // Get holders using automatic method selection (mpt_holders API or transaction analysis)
      console.log('🔍 Fetching holders (auto-selecting best method)...')
      const holdersList = await blockchainQuery.getAllHolders(
        mptIssuanceId,
        details.issuer
      )

      console.log(`✅ Found ${holdersList.length} holders`)

      // Calculate percentages
      const totalSupplyNum = BigInt(details.outstandingAmount)
      const holdersWithPercentage = holdersList.map(holder => {
        const balance = BigInt(holder.balance)
        const percentage = totalSupplyNum > 0n 
          ? Number((balance * 10000n) / totalSupplyNum) / 100
          : 0
        
        return {
          address: holder.address,
          balance: holder.balance,
          percentage,
          authorized: holder.authorized,
          locked: holder.locked
        }
      })

      // Already sorted by balance in the query method
      setHolders(holdersWithPercentage)

      toast({
        title: 'Holders Loaded',
        description: `Found ${holdersList.length} holders for ${details.metadata.ticker}`
      })
    } catch (error) {
      console.error('❌ Failed to load holders:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load token holders',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatBalance = (balance: string, assetScale: number): string => {
    return formatMPTAmount(balance, assetScale, 2)
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
                    <TableHead className="text-center">Status</TableHead>
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
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          {holder.authorized && (
                            <Badge variant="outline" className="text-xs">
                              ✓ Auth
                            </Badge>
                          )}
                          {holder.locked && (
                            <Badge variant="destructive" className="text-xs">
                              🔒 Locked
                            </Badge>
                          )}
                          {!holder.authorized && !holder.locked && (
                            <Badge variant="secondary" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
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
