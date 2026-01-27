/**
 * Transaction Details Dialog
 * Dialog for viewing detailed information about a transaction
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

interface Transaction {
  id: string
  denom: string
  token_name?: string
  token_symbol?: string
  transaction_type: string
  from_address?: string
  to_address?: string
  amount: string
  tx_hash: string
  status: string
  network: 'mainnet' | 'testnet'
  batch_id?: string
  batch_index?: number
  batch_total?: number
  created_at: string
  transaction_timestamp?: string
}

interface TransactionDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
}

export function TransactionDetailsDialog({ 
  open, 
  onOpenChange, 
  transaction 
}: TransactionDetailsDialogProps) {
  const { toast } = useToast()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!transaction) return null

  const explorerUrl = transaction.network === 'mainnet'
    ? `https://explorer.injective.network/transaction/${transaction.tx_hash}`
    : `https://testnet.explorer.injective.network/transaction/${transaction.tx_hash}`

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
      
      toast({
        title: 'Copied',
        description: `${field} copied to clipboard`
      })
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      })
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transaction Details
            <Badge 
              variant={
                transaction.status === 'confirmed' ? 'success' :
                transaction.status === 'pending' ? 'secondary' :
                'destructive'
              }
            >
              {transaction.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            View complete transaction information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Type</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{transaction.transaction_type}</Badge>
              {transaction.batch_id && (
                <Badge variant="secondary">
                  Batch {transaction.batch_index! + 1} of {transaction.batch_total}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Token Information */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Token</div>
            <div>
              <div className="font-medium">
                {transaction.token_symbol || 'Unknown'} - {transaction.token_name || 'Unknown Token'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1 rounded">{transaction.denom}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(transaction.denom, 'Denom')}
                >
                  {copiedField === 'Denom' ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Amount */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Amount</div>
            <div className="font-mono text-lg font-semibold">{transaction.amount}</div>
          </div>

          {/* Addresses */}
          {(transaction.from_address || transaction.to_address) && (
            <>
              <Separator />
              <div className="space-y-3">
                {transaction.from_address && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">From Address</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {transaction.from_address}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transaction.from_address!, 'From Address')}
                      >
                        {copiedField === 'From Address' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {transaction.to_address && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">To Address</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {transaction.to_address}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transaction.to_address!, 'To Address')}
                      >
                        {copiedField === 'To Address' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Transaction Hash */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Transaction Hash</div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                {transaction.tx_hash}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(transaction.tx_hash, 'Transaction Hash')}
              >
                {copiedField === 'Transaction Hash' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(explorerUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Network */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Network</div>
            <Badge variant={transaction.network === 'mainnet' ? 'default' : 'secondary'}>
              {transaction.network.toUpperCase()}
            </Badge>
          </div>

          {/* Timestamps */}
          <Separator />
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Created At</div>
              <div className="text-sm">{formatDate(transaction.created_at)}</div>
            </div>
            
            {transaction.transaction_timestamp && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Confirmed At</div>
                <div className="text-sm">{formatDate(transaction.transaction_timestamp)}</div>
              </div>
            )}
          </div>

          {/* Batch Information */}
          {transaction.batch_id && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Batch Information</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Batch ID:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{transaction.batch_id}</code>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Position:</span>
                    <span>{transaction.batch_index! + 1} of {transaction.batch_total}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Explorer Link */}
          <div className="pt-4">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => window.open(explorerUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View in Explorer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
