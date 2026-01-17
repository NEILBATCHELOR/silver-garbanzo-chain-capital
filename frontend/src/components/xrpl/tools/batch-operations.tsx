/**
 * Batch Operations Component
 * Execute multiple XRPL transactions in batches
 */

import React, { useState, useMemo } from 'react'
import type { Wallet, Payment } from 'xrpl'
import { XRPLBatchOperationsService } from '@/services/wallet/ripple/batch'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send, Plus, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BatchOperationsProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

interface BatchTransaction {
  id: string
  type: string
  destination?: string
  amount?: string
}

export function BatchOperations({ wallet, network, projectId }: BatchOperationsProps) {
  const { toast } = useToast()
  const [isExecuting, setIsExecuting] = useState(false)
  const [transactions, setTransactions] = useState<BatchTransaction[]>([
    { id: '1', type: 'Payment', destination: '', amount: '' }
  ])

  const handleAddTransaction = () => {
    setTransactions([
      ...transactions,
      { id: Date.now().toString(), type: 'Payment', destination: '', amount: '' }
    ])
  }

  const handleRemoveTransaction = (id: string) => {
    setTransactions(transactions.filter(tx => tx.id !== id))
  }

  const handleUpdateTransaction = (id: string, field: string, value: string) => {
    setTransactions(transactions.map(tx =>
      tx.id === id ? { ...tx, [field]: value } : tx
    ))
  }

  const handleExecuteBatch = async () => {
    try {
      setIsExecuting(true)

      const client = await xrplClientManager.getClient(network)
      const batchService = new XRPLBatchOperationsService(client)

      // Convert to XRPL Payment transactions with proper typing
      const paymentTxs: Payment[] = transactions
        .filter(tx => tx.destination && tx.amount)
        .map(tx => ({
          TransactionType: 'Payment' as const,
          Account: wallet.address,
          Destination: tx.destination!,
          Amount: tx.amount!
        }))

      if (paymentTxs.length === 0) {
        toast({
          title: 'Error',
          description: 'Please add at least one valid transaction',
          variant: 'destructive'
        })
        return
      }

      const result = await batchService.createSingleAccountBatch(wallet, {
        account: wallet.address,
        transactions: paymentTxs,
        allOrNothing: true
      })

      toast({
        title: 'Batch Complete',
        description: `Batch executed with ${paymentTxs.length} transactions. ${result.allSucceeded ? 'All succeeded!' : 'Some failed.'}`,
        variant: result.allSucceeded ? 'default' : 'destructive'
      })

      // Clear form
      setTransactions([{ id: '1', type: 'Payment', destination: '', amount: '' }])

    } catch (error) {
      toast({
        title: 'Batch Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Operations</CardTitle>
        <CardDescription>
          Execute multiple transactions efficiently
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Add multiple transactions to execute them in a single batch. This is more efficient than sending transactions one at a time.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {transactions.map((tx, index) => (
            <div key={tx.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <Label>Transaction {index + 1}</Label>
                {transactions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTransaction(tx.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4">
                <div>
                  <Label>Destination Address</Label>
                  <Input
                    placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3HMfeeXX"
                    value={tx.destination}
                    onChange={(e) => handleUpdateTransaction(tx.id, 'destination', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Amount (XRP)</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={tx.amount}
                    onChange={(e) => handleUpdateTransaction(tx.id, 'amount', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAddTransaction}
            disabled={isExecuting}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>

          <Button
            onClick={handleExecuteBatch}
            disabled={isExecuting || transactions.length === 0}
          >
            {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4 mr-2" />
            Execute Batch
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
