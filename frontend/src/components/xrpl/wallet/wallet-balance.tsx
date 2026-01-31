import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, RefreshCw, Eye, EyeOff, Coins, TrendingUp } from 'lucide-react'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import type { ProjectWalletData } from '@/services/project/project-wallet-service'

interface WalletBalanceProps {
  wallet: ProjectWalletData & { decryptedPrivateKey?: string }
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

interface Balance {
  xrp: string
  reserve: string
  available: string
  tokens: Array<{
    currency: string
    issuer: string
    balance: string
  }>
}

export const WalletBalance: React.FC<WalletBalanceProps> = ({
  wallet,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showFullAddress, setShowFullAddress] = useState(false)
  const [balance, setBalance] = useState<Balance>({
    xrp: '0',
    reserve: '0',
    available: '0',
    tokens: []
  })

  useEffect(() => {
    loadBalance()
  }, [wallet.wallet_address, network])

  const loadBalance = async () => {
    setLoading(true)
    try {
      const client = await xrplClientManager.getClient(network)

      // Get account info
      const accountInfo = await client.request({
        command: 'account_info',
        account: wallet.wallet_address,
        ledger_index: 'validated'
      })

      const xrpBalance = parseFloat(accountInfo.result.account_data.Balance) / 1_000_000

      // Get account objects to calculate reserve
      const objects = await client.request({
        command: 'account_objects',
        account: wallet.wallet_address,
        ledger_index: 'validated'
      })

      const objectCount = objects.result.account_objects.length
      const baseReserve = 10 // Base reserve in XRP
      const ownerReserve = 2 // Reserve per object in XRP
      const totalReserve = baseReserve + (objectCount * ownerReserve)
      const availableBalance = Math.max(0, xrpBalance - totalReserve)

      // Get trust lines (tokens)
      const lines = await client.request({
        command: 'account_lines',
        account: wallet.wallet_address,
        ledger_index: 'validated'
      })

      const tokens = lines.result.lines.map((line: any) => ({
        currency: line.currency,
        issuer: line.account,
        balance: line.balance
      }))

      setBalance({
        xrp: xrpBalance.toFixed(6),
        reserve: totalReserve.toFixed(6),
        available: availableBalance.toFixed(6),
        tokens
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load wallet balance',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyAddress = async () => {
    await navigator.clipboard.writeText(wallet.wallet_address)
    toast({
      title: 'Copied',
      description: 'Wallet address copied to clipboard'
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Wallet Balance
            </CardTitle>
            <CardDescription>View your XRP and token balances</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadBalance}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Address */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Address</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullAddress(!showFullAddress)}
            >
              {showFullAddress ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <div
            onClick={copyAddress}
            className="p-3 bg-muted rounded-md cursor-pointer hover:bg-accent transition-colors"
          >
            <code className="text-xs break-all">
              {showFullAddress ? wallet.wallet_address : `${wallet.wallet_address.substring(0, 20)}...`}
            </code>
          </div>
        </div>

        {/* XRP Balance */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-6">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total XRP Balance</div>
                <div className="text-3xl font-bold">{balance.xrp}</div>
                <div className="text-sm text-muted-foreground">XRP</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Reserve</div>
                  <div className="text-lg font-semibold">{balance.reserve}</div>
                  <div className="text-xs text-muted-foreground">XRP</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Available</div>
                  <div className="text-lg font-semibold text-green-600">{balance.available}</div>
                  <div className="text-xs text-muted-foreground">XRP</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reserve Info */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            ℹ️ <strong>Reserve:</strong> Minimum XRP balance required by the network.
            Base reserve (10 XRP) + Owner reserve (2 XRP per object).
          </p>
        </div>

        {/* Token Balances */}
        {balance.tokens.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <h3 className="text-sm font-medium">Token Holdings</h3>
              <Badge variant="outline">{balance.tokens.length}</Badge>
            </div>

            <div className="space-y-2">
              {balance.tokens.map((token, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold">{token.currency}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {token.issuer.substring(0, 12)}...
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{parseFloat(token.balance).toFixed(6)}</div>
                        <div className="text-xs text-muted-foreground">{token.currency}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
