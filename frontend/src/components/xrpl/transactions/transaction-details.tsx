import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ExternalLink, Copy, Check } from 'lucide-react'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPL_NETWORKS } from '@/services/wallet/ripple/config/XRPLConfig'

interface TransactionDetailsProps {
  txHash: string
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

export const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  txHash,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    loadDetails()
  }, [txHash, network])

  const loadDetails = async () => {
    setLoading(true)
    try {
      const client = await xrplClientManager.getClient(network)
      
      const response = await client.request({
        command: 'tx',
        transaction: txHash,
        binary: false
      })

      setDetails(response.result)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load transaction details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: 'Copied',
      description: 'Transaction hash copied to clipboard'
    })
  }

  const formatDate = (rippleTime?: number) => {
    if (!rippleTime) return 'N/A'
    return new Date((rippleTime + 946684800) * 1000).toLocaleString()
  }

  const formatAmount = (amount: any): string => {
    if (typeof amount === 'string') {
      return `${(parseInt(amount) / 1_000_000).toFixed(6)} XRP`
    }
    if (typeof amount === 'object') {
      return `${amount.value} ${amount.currency}`
    }
    return 'N/A'
  }

  const getStatusColor = (result: string) => {
    if (result === 'tesSUCCESS') return 'bg-green-500'
    if (result.startsWith('tec')) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!details) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          Transaction not found
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Detailed information about this transaction</CardDescription>
          </div>
          <a
            href={`${XRPL_NETWORKS[network].explorerUrl}/transactions/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
          <span className="font-medium">Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(details.meta?.TransactionResult)}`} />
            <Badge variant={details.meta?.TransactionResult === 'tesSUCCESS' ? 'default' : 'destructive'}>
              {details.meta?.TransactionResult}
            </Badge>
          </div>
        </div>

        {/* Hash */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Transaction Hash</span>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <code className="flex-1 text-xs break-all">{details.hash}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(details.hash)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Type */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Type</span>
          <Badge variant="outline">{details.TransactionType}</Badge>
        </div>

        {/* Account */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Account</span>
          <div className="p-3 bg-muted rounded-md">
            <code className="text-xs break-all">{details.Account}</code>
          </div>
        </div>

        {/* Destination (if applicable) */}
        {details.Destination && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Destination</span>
            <div className="p-3 bg-muted rounded-md">
              <code className="text-xs break-all">{details.Destination}</code>
            </div>
          </div>
        )}

        {/* Amount (if applicable) */}
        {details.Amount && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Amount</span>
            <span className="font-semibold">{formatAmount(details.Amount)}</span>
          </div>
        )}

        {/* Fee */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Fee</span>
          <span>{(parseInt(details.Fee) / 1_000_000).toFixed(6)} XRP</span>
        </div>

        {/* Sequence */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Sequence</span>
          <span>{details.Sequence}</span>
        </div>

        {/* Ledger Index */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Ledger Index</span>
          <span>{details.ledger_index}</span>
        </div>

        {/* Date */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Date</span>
          <span>{formatDate(details.date)}</span>
        </div>

        {/* Memos (if present) */}
        {details.Memos && details.Memos.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Memos</span>
            <div className="space-y-2">
              {details.Memos.map((memo: any, index: number) => (
                <div key={index} className="p-3 bg-muted rounded-md">
                  <code className="text-xs">
                    {Buffer.from(memo.Memo.MemoData, 'hex').toString('utf8')}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw JSON (collapsible) */}
        <details className="space-y-2">
          <summary className="text-sm font-medium cursor-pointer">Raw Transaction Data</summary>
          <pre className="p-4 bg-muted rounded-md overflow-auto text-xs">
            {JSON.stringify(details, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  )
}
