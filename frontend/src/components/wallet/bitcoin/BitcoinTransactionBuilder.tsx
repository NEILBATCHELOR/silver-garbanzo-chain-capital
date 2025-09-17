/**
 * Bitcoin Transaction Builder Component
 * 
 * Provides interface for building Bitcoin transactions with multiple address types
 * Supports UTXO selection, fee estimation, and transaction preview
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bitcoin, 
  Send, 
  Eye, 
  Calculator, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Zap,
  Target,
  Coins
} from 'lucide-react'
import { BitcoinAdapter, BitcoinAddressType, type BitcoinAddressInfo } from '@/infrastructure/web3/adapters/bitcoin/BitcoinAdapter'
import { rpcManager } from '@/infrastructure/web3/rpc'

interface UTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
  scriptPubKey: string;
  height?: number;
  confirmations?: number;
}

interface TransactionOutput {
  address: string;
  amount: number; // satoshis
  isChange: boolean;
}

interface TransactionPreview {
  inputs: UTXO[];
  outputs: TransactionOutput[];
  fee: number;
  totalInput: number;
  totalOutput: number;
  feeRate: number; // sat/vB
  estimatedSize: number; // vBytes
  rbfEnabled: boolean;
}

interface FeeEstimate {
  slow: number;     // sat/vB
  standard: number; // sat/vB
  fast: number;     // sat/vB
  urgent: number;   // sat/vB
}

export function BitcoinTransactionBuilder() {
  // State management
  const [fromAddress, setFromAddress] = useState('')
  const [fromAddressType, setFromAddressType] = useState<BitcoinAddressType>(BitcoinAddressType.P2WPKH)
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [customFeeRate, setCustomFeeRate] = useState('')
  const [selectedFeeType, setSelectedFeeType] = useState<'slow' | 'standard' | 'fast' | 'urgent' | 'custom'>('standard')
  const [memo, setMemo] = useState('')
  
  // Transaction state
  const [utxos, setUtxos] = useState<UTXO[]>([])
  const [selectedUtxos, setSelectedUtxos] = useState<Set<string>>(new Set())
  const [transactionPreview, setTransactionPreview] = useState<TransactionPreview | null>(null)
  const [feeEstimates, setFeeEstimates] = useState<FeeEstimate | null>(null)
  const [rawTransaction, setRawTransaction] = useState('')
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentTab, setCurrentTab] = useState('build')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Bitcoin adapter instance
  const bitcoinAdapter = new BitcoinAdapter()

  // Load UTXOs for address
  const loadUtxos = useCallback(async (address: string) => {
    if (!address) return

    try {
      setIsLoading(true)
      setError('')
      
      // Connect adapter if not connected
      if (!bitcoinAdapter.isConnected) {
        const bitcoinRpcUrl = rpcManager.getRPCUrl('bitcoin', 'mainnet')
        if (!bitcoinRpcUrl) {
          throw new Error('Bitcoin RPC URL not configured. Please set VITE_BITCOIN_RPC_URL in environment variables.')
        }
        
        await bitcoinAdapter.connect({
          rpcUrl: bitcoinRpcUrl,
          networkId: 'mainnet'
        })
      }

      const fetchedUtxos = await bitcoinAdapter.getUTXOs(address)
      
      // Enhance UTXOs with confirmations
      const enhancedUtxos = await Promise.all(
        fetchedUtxos.map(async (utxo) => {
          try {
            const txStatus = await bitcoinAdapter.getTransaction(utxo.txid)
            return {
              ...utxo,
              confirmations: txStatus.confirmations || 0
            }
          } catch (error) {
            return { ...utxo, confirmations: 0 }
          }
        })
      )

      setUtxos(enhancedUtxos)
    } catch (error) {
      setError(`Failed to load UTXOs: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load fee estimates
  const loadFeeEstimates = useCallback(async () => {
    try {
      const feeRate = await bitcoinAdapter.getFeeRate()
      
      // Create fee estimates based on current network conditions
      const estimates: FeeEstimate = {
        slow: Math.max(1, Math.floor(feeRate * 0.5)),     // 50% of current rate
        standard: feeRate,                                 // Current rate
        fast: Math.ceil(feeRate * 1.5),                   // 150% of current rate
        urgent: Math.ceil(feeRate * 2.0)                  // 200% of current rate
      }
      
      setFeeEstimates(estimates)
    } catch (error) {
      console.warn('Failed to load fee estimates:', error)
      // Set default estimates
      setFeeEstimates({
        slow: 1,
        standard: 10,
        fast: 20,
        urgent: 40
      })
    }
  }, [])

  // Build transaction preview
  const buildTransactionPreview = useCallback(() => {
    if (!toAddress || !amount || !fromAddress) return

    try {
      const amountSats = Math.floor(parseFloat(amount) * 100000000) // BTC to satoshis
      if (amountSats <= 0) {
        setError('Invalid amount')
        return
      }

      const selectedFeeRate = selectedFeeType === 'custom' 
        ? parseFloat(customFeeRate) || 10
        : feeEstimates?.[selectedFeeType] || 10

      // Simple UTXO selection (largest first)
      const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value)
      const selectedUtxosList: UTXO[] = []
      let totalInput = 0

      // Estimate transaction size
      const estimatedSize = 10 + (sortedUtxos.length * 148) + (2 * 34) // Base + inputs + outputs
      const estimatedFee = Math.ceil(estimatedSize * selectedFeeRate)
      const totalNeeded = amountSats + estimatedFee

      for (const utxo of sortedUtxos) {
        selectedUtxosList.push(utxo)
        totalInput += utxo.value
        if (totalInput >= totalNeeded) break
      }

      if (totalInput < totalNeeded) {
        setError(`Insufficient funds. Need ${totalNeeded} sats, have ${totalInput} sats`)
        return
      }

      // Create outputs
      const outputs: TransactionOutput[] = [
        {
          address: toAddress,
          amount: amountSats,
          isChange: false
        }
      ]

      const change = totalInput - amountSats - estimatedFee
      if (change > 546) { // Dust threshold
        outputs.push({
          address: fromAddress,
          amount: change,
          isChange: true
        })
      }

      const preview: TransactionPreview = {
        inputs: selectedUtxosList,
        outputs,
        fee: estimatedFee,
        totalInput,
        totalOutput: outputs.reduce((sum, output) => sum + output.amount, 0),
        feeRate: selectedFeeRate,
        estimatedSize,
        rbfEnabled: true
      }

      setTransactionPreview(preview)
      setError('')
    } catch (error) {
      setError(`Failed to build transaction: ${error}`)
    }
  }, [toAddress, amount, fromAddress, utxos, selectedFeeType, customFeeRate, feeEstimates])

  // Create raw transaction
  const createRawTransaction = async () => {
    if (!transactionPreview) return

    try {
      setIsLoading(true)
      setError('')

      // This would normally use a private key, but for demo we'll just show the process
      const addressInfo: BitcoinAddressInfo = {
        address: fromAddress,
        type: fromAddressType
      }

      // In production, this would require actual private key signing
      const tx = await bitcoinAdapter.createTransactionWithAddressType(
        addressInfo,
        toAddress,
        parseInt(amount) * 100000000, // BTC to sats
        'dummy_private_key', // This would be actual private key
        transactionPreview.feeRate
      )

      setRawTransaction(tx)
      setCurrentTab('review')
    } catch (error) {
      setError(`Failed to create transaction: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Effects
  useEffect(() => {
    loadFeeEstimates()
  }, [loadFeeEstimates])

  useEffect(() => {
    if (fromAddress) {
      loadUtxos(fromAddress)
    }
  }, [fromAddress, loadUtxos])

  useEffect(() => {
    buildTransactionPreview()
  }, [buildTransactionPreview])

  // Helper functions
  const formatSats = (sats: number): string => {
    return `${sats.toLocaleString()} sats`
  }

  const formatBTC = (sats: number): string => {
    return `${(sats / 100000000).toFixed(8)} BTC`
  }

  const getAddressTypeIcon = (type: BitcoinAddressType) => {
    switch (type) {
      case BitcoinAddressType.P2PKH: return '1️⃣'
      case BitcoinAddressType.P2SH: return '3️⃣'
      case BitcoinAddressType.P2WPKH: return '🔗'
      case BitcoinAddressType.P2WSH: return '📜'
      case BitcoinAddressType.P2TR: return '🌲'
      default: return '💰'
    }
  }

  const getConfirmationBadge = (confirmations: number) => {
    if (confirmations === 0) return <Badge variant="destructive">Unconfirmed</Badge>
    if (confirmations < 6) return <Badge variant="outline">{confirmations} conf</Badge>
    return <Badge variant="secondary">Confirmed</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="w-5 h-5" />
            Bitcoin Transaction Builder
          </CardTitle>
          <CardDescription>
            Create Bitcoin transactions with support for all address types and advanced features
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="build">Build Transaction</TabsTrigger>
          <TabsTrigger value="preview">Preview & Sign</TabsTrigger>
          <TabsTrigger value="review">Review & Broadcast</TabsTrigger>
        </TabsList>

        {/* Build Transaction Tab */}
        <TabsContent value="build" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* From Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">From</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Address Type</Label>
                  <Select 
                    value={fromAddressType} 
                    onValueChange={(value) => setFromAddressType(value as BitcoinAddressType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BitcoinAddressType.P2PKH}>
                        {getAddressTypeIcon(BitcoinAddressType.P2PKH)} Legacy (P2PKH)
                      </SelectItem>
                      <SelectItem value={BitcoinAddressType.P2SH}>
                        {getAddressTypeIcon(BitcoinAddressType.P2SH)} Script Hash (P2SH)
                      </SelectItem>
                      <SelectItem value={BitcoinAddressType.P2WPKH}>
                        {getAddressTypeIcon(BitcoinAddressType.P2WPKH)} Native SegWit (P2WPKH)
                      </SelectItem>
                      <SelectItem value={BitcoinAddressType.P2WSH}>
                        {getAddressTypeIcon(BitcoinAddressType.P2WSH)} SegWit Script (P2WSH)
                      </SelectItem>
                      <SelectItem value={BitcoinAddressType.P2TR}>
                        {getAddressTypeIcon(BitcoinAddressType.P2TR)} Taproot (P2TR)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromAddress">Bitcoin Address</Label>
                  <Input
                    id="fromAddress"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder="Enter your Bitcoin address"
                  />
                </div>

                {utxos.length > 0 && (
                  <div className="space-y-2">
                    <Label>Available UTXOs ({utxos.length})</Label>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-2">
                      {utxos.map((utxo, index) => (
                        <div key={`${utxo.txid}-${utxo.vout}`} 
                             className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">
                                {utxo.txid.slice(0, 8)}...:{utxo.vout}
                              </span>
                              {getConfirmationBadge(utxo.confirmations || 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatSats(utxo.value)} ({formatBTC(utxo.value)})
                            </div>
                          </div>
                          <Coins className="w-4 h-4 text-orange-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* To Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="toAddress">Recipient Address</Label>
                  <Input
                    id="toAddress"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="Enter recipient Bitcoin address"
                  />
                  {toAddress && bitcoinAdapter.detectAddressType(toAddress) && (
                    <div className="text-sm text-muted-foreground">
                      Address type: {bitcoinAdapter.detectAddressType(toAddress)}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (BTC)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.00000001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00000000"
                  />
                  {amount && (
                    <div className="text-sm text-muted-foreground">
                      = {formatSats(Math.floor(parseFloat(amount) * 100000000))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memo">Memo (Optional)</Label>
                  <Input
                    id="memo"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Transaction memo"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fee Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Fee Selection
              </CardTitle>
              <CardDescription>
                Choose transaction fee based on confirmation speed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {feeEstimates && Object.entries(feeEstimates).map(([type, rate]) => (
                  <Button
                    key={type}
                    variant={selectedFeeType === type ? 'default' : 'outline'}
                    onClick={() => setSelectedFeeType(type as any)}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <div className="flex items-center gap-1">
                      {type === 'slow' && <Clock className="w-4 h-4" />}
                      {type === 'standard' && <Target className="w-4 h-4" />}
                      {type === 'fast' && <Zap className="w-4 h-4" />}
                      {type === 'urgent' && <AlertTriangle className="w-4 h-4" />}
                      <span className="capitalize">{type}</span>
                    </div>
                    <div className="text-sm opacity-70">
                      {rate} sat/vB
                    </div>
                    {type === 'slow' && <div className="text-xs">~60 min</div>}
                    {type === 'standard' && <div className="text-xs">~30 min</div>}
                    {type === 'fast' && <div className="text-xs">~10 min</div>}
                    {type === 'urgent' && <div className="text-xs">~5 min</div>}
                  </Button>
                ))}
                
                <Button
                  variant={selectedFeeType === 'custom' ? 'default' : 'outline'}
                  onClick={() => setSelectedFeeType('custom')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <div className="flex items-center gap-1">
                    <Calculator className="w-4 h-4" />
                    <span>Custom</span>
                  </div>
                  {selectedFeeType === 'custom' && (
                    <Input
                      type="number"
                      value={customFeeRate}
                      onChange={(e) => setCustomFeeRate(e.target.value)}
                      placeholder="sat/vB"
                      className="w-20 h-8 text-center"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Preview */}
          {transactionPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Transaction Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Total Input</Label>
                    <div className="font-mono">{formatBTC(transactionPreview.totalInput)}</div>
                    <div className="text-sm text-muted-foreground">{formatSats(transactionPreview.totalInput)}</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Total Output</Label>
                    <div className="font-mono">{formatBTC(transactionPreview.totalOutput)}</div>
                    <div className="text-sm text-muted-foreground">{formatSats(transactionPreview.totalOutput)}</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Network Fee</Label>
                    <div className="font-mono text-orange-600">{formatBTC(transactionPreview.fee)}</div>
                    <div className="text-sm text-muted-foreground">
                      {transactionPreview.feeRate} sat/vB ({transactionPreview.estimatedSize} vB)
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Using {transactionPreview.inputs.length} inputs, creating {transactionPreview.outputs.length} outputs
                  </div>
                  
                  <Button onClick={createRawTransaction} disabled={isLoading}>
                    {isLoading ? 'Building...' : 'Build Transaction'}
                    <Send className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Preview</CardTitle>
              <CardDescription>
                Review transaction details before signing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionPreview ? (
                <div className="space-y-6">
                  {/* Transaction Summary */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Transaction Summary</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sending:</span>
                        <span className="font-mono">{formatBTC(parseInt(amount) * 100000000)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Network Fee:</span>
                        <span className="font-mono text-orange-600">{formatBTC(transactionPreview.fee)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span className="font-mono">{formatBTC(parseInt(amount) * 100000000 + transactionPreview.fee)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Raw Transaction */}
                  {rawTransaction && (
                    <div className="space-y-2">
                      <Label>Raw Transaction (Hex)</Label>
                      <div className="p-3 bg-muted rounded font-mono text-xs break-all">
                        {rawTransaction}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentTab('build')}>
                      Back to Build
                    </Button>
                    <Button 
                      onClick={() => setCurrentTab('review')} 
                      disabled={!rawTransaction}
                      className="ml-auto"
                    >
                      Sign & Continue
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transaction to preview. Please build a transaction first.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review & Broadcast</CardTitle>
              <CardDescription>
                Final review before broadcasting to the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <h3 className="text-lg font-medium mb-2">Transaction Ready</h3>
                <p className="text-muted-foreground mb-6">
                  Your Bitcoin transaction has been built and signed. 
                  Review the details below and click broadcast when ready.
                </p>
                
                {rawTransaction && (
                  <div className="text-left space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-sm font-medium">Transaction ID</Label>
                      <div className="font-mono text-sm mt-1">
                        {/* This would be calculated from the raw transaction */}
                        <span className="opacity-50">Will be generated after broadcast</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setCurrentTab('preview')}>
                        Back to Preview
                      </Button>
                      <Button className="ml-auto" onClick={() => {
                        // This would broadcast the transaction
                        alert('Broadcasting transaction... (Demo mode)')
                      }}>
                        Broadcast Transaction
                        <Send className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
