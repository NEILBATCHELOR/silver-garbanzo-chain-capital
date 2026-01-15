import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'
import type { Client } from 'xrpl'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'

interface TokenHolding {
  currency: string
  issuer: string
  balance: string
  limit: string
  value?: number
}

interface NFTHolding {
  nftId: string
  issuer: string
  taxon: number
  uri?: string
}

interface PortfolioData {
  xrpBalance: string
  tokens: TokenHolding[]
  nfts: NFTHolding[]
  totalValue: number
  change24h: number
}

interface XRPLPortfolioProps {
  walletAddress?: string
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

export const XRPLPortfolio: React.FC<XRPLPortfolioProps> = ({
  walletAddress,
  network = 'TESTNET'
}) => {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(false)
  const [client, setClient] = useState<Client | null>(null)

  useEffect(() => {
    initializeClient()
  }, [network])

  useEffect(() => {
    if (walletAddress && client) {
      loadPortfolio()
    }
  }, [walletAddress, client])

  const initializeClient = async () => {
    try {
      const xrplClient = await xrplClientManager.getClient(network)
      setClient(xrplClient)
    } catch (error) {
      console.error('Failed to initialize XRPL client:', error)
    }
  }

  const loadPortfolio = async () => {
    if (!walletAddress || !client) return

    setLoading(true)
    try {
      // Load XRP balance
      const accountInfo = await client.request({
        command: 'account_info',
        account: walletAddress,
        ledger_index: 'validated'
      })

      const xrpBalance = (
        parseInt(accountInfo.result.account_data.Balance) / 1_000_000
      ).toFixed(6)

      // Load trust line tokens
      const accountLines = await client.request({
        command: 'account_lines',
        account: walletAddress,
        ledger_index: 'validated'
      })

      const tokens: TokenHolding[] = accountLines.result.lines.map((line: any) => ({
        currency: line.currency,
        issuer: line.account,
        balance: line.balance,
        limit: line.limit
      }))

      // Load NFTs
      const accountNfts = await client.request({
        command: 'account_nfts',
        account: walletAddress,
        ledger_index: 'validated'
      })

      const nfts: NFTHolding[] = accountNfts.result.account_nfts.map((nft: any) => ({
        nftId: nft.NFTokenID,
        issuer: nft.Issuer,
        taxon: nft.NFTokenTaxon,
        uri: nft.URI ? Buffer.from(nft.URI, 'hex').toString('utf8') : undefined
      }))

      // Calculate total value (simplified - would need price oracle in production)
      const totalValue = parseFloat(xrpBalance) * 0.5 // Mock XRP price

      setPortfolio({
        xrpBalance,
        tokens,
        nfts,
        totalValue,
        change24h: 2.5 // Mock change percentage
      })
    } catch (error) {
      console.error('Failed to load portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
          <CardDescription>
            Connect a wallet to view your portfolio
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const isPositiveChange = portfolio.change24h >= 0

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
          <CardDescription>
            Total value of your XRPL assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                ${portfolio.totalValue.toFixed(2)}
              </span>
              <div className={`flex items-center gap-1 ${
                isPositiveChange ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPositiveChange ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {Math.abs(portfolio.change24h).toFixed(2)}%
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">XRP Balance</p>
                <p className="text-lg font-semibold">{portfolio.xrpBalance}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tokens</p>
                <p className="text-lg font-semibold">{portfolio.tokens.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">NFTs</p>
                <p className="text-lg font-semibold">{portfolio.nfts.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Holdings */}
      {portfolio.tokens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Token Holdings</CardTitle>
            <CardDescription>
              Your trust line token balances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolio.tokens.map((token, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.currency}</span>
                      <Badge variant="outline" className="text-xs">
                        Trust Line
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Issuer: {token.issuer.slice(0, 8)}...{token.issuer.slice(-6)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{parseFloat(token.balance).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      Limit: {token.limit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* NFT Holdings */}
      {portfolio.nfts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>NFT Collection</CardTitle>
            <CardDescription>
              Your XRPL NFTs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {portfolio.nfts.map((nft) => (
                <div 
                  key={nft.nftId}
                  className="border rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center">
                    {nft.uri ? (
                      <img 
                        src={nft.uri} 
                        alt="NFT" 
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No Image</span>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">
                    ID: {nft.nftId.slice(0, 8)}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Taxon: {nft.taxon}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
