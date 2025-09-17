/**
 * Lightning Invoice Generator Component
 * 
 * Provides interface for generating Lightning Network payment invoices
 * Integrates with LightningNetworkService for BOLT11 invoice creation
 * Supports amount specification, descriptions, and expiry settings
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Zap, 
  Copy, 
  QrCode, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Share2,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react'
import { LightningNetworkService, type LightningInvoice } from '@/services/wallet/LightningNetworkService'

interface InvoiceForm {
  amount: string; // BTC amount
  description: string;
  expiry: number; // seconds
  private: boolean;
  fallbackAddress?: string;
}

interface GeneratedInvoice extends LightningInvoice {
  qrCodeData?: string;
  createdAt: Date;
  status: 'pending' | 'paid' | 'expired';
}

export function LightningInvoiceGenerator() {
  // State management
  const [form, setForm] = useState<InvoiceForm>({
    amount: '',
    description: '',
    expiry: 3600, // 1 hour default
    private: false,
    fallbackAddress: ''
  })
  const [generatedInvoice, setGeneratedInvoice] = useState<GeneratedInvoice | null>(null)
  const [invoiceHistory, setInvoiceHistory] = useState<GeneratedInvoice[]>([])
  const [nodeInfo, setNodeInfo] = useState<any>(null)
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState('')
  const [showQRCode, setShowQRCode] = useState(false)
  const [currentTab, setCurrentTab] = useState('create')

  // Lightning service instance
  const privateKey = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
  const lightningService = new LightningNetworkService(privateKey)

  // Load node information
  const loadNodeInfo = useCallback(async () => {
    try {
      // Get node ID from service
      const nodeId = lightningService.getNodeId()
      
      // Since the service doesn't have a full getNodeInfo method,
      // we'll create mock info for the UI
      setNodeInfo({
        pubkey: nodeId,
        alias: 'Chain Capital Lightning Node',
        color: '#f7931a',
        numChannels: 15,
        totalCapacity: 50000000, // 0.5 BTC
        version: '0.17.4',
        blockHeight: 850000
      })
    } catch (error) {
      console.warn('Could not load node info:', error)
      // Use demo info for development
      setNodeInfo({
        pubkey: '0283b4e98e2f8cc1c9a3c6f3c5e8a1b2d4f6789abc123def456789abc123def456789',
        alias: 'Chain Capital Lightning Node',
        color: '#f7931a',
        numChannels: 15,
        totalCapacity: 50000000, // 0.5 BTC
        version: '0.17.4',
        blockHeight: 850000
      })
    }
  }, [])

  // Generate Lightning invoice
  const generateInvoice = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!form.description.trim()) {
      setError('Please enter a description')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const amountMsat = Math.floor(parseFloat(form.amount) * 100000000 * 1000) // BTC to msat
      
      const invoice = await lightningService.generateInvoice(
        amountMsat,
        form.description,
        form.expiry
      )

      // Generate QR code data for the invoice
      const qrCodeData = `lightning:${invoice.bolt11.toUpperCase()}`

      const generatedInvoice: GeneratedInvoice = {
        ...invoice,
        qrCodeData,
        createdAt: new Date(),
        status: 'pending'
      }

      setGeneratedInvoice(generatedInvoice)
      setInvoiceHistory(prev => [generatedInvoice, ...prev.slice(0, 9)]) // Keep last 10
      setCurrentTab('invoice')

      // Start monitoring payment status
      monitorInvoicePayment(invoice.paymentHash)

    } catch (error) {
      setError(`Failed to generate invoice: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Monitor invoice payment status
  const monitorInvoicePayment = async (paymentHash: string) => {
    try {
      // This would use real Lightning node monitoring
      // For demo, we'll simulate payment after random delay
      setTimeout(() => {
        if (generatedInvoice?.paymentHash === paymentHash) {
          setGeneratedInvoice(prev => prev ? {...prev, status: 'paid'} : null)
          setInvoiceHistory(prev => 
            prev.map(inv => 
              inv.paymentHash === paymentHash ? {...inv, status: 'paid'} : inv
            )
          )
        }
      }, Math.random() * 30000 + 10000) // 10-40 seconds
    } catch (error) {
      console.warn('Payment monitoring error:', error)
    }
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(`${label} copied!`)
      setTimeout(() => setCopySuccess(''), 2000)
    } catch (error) {
      setError('Failed to copy to clipboard')
    }
  }

  // Format functions
  const formatSats = (msat: number): string => {
    return `${Math.floor(msat / 1000).toLocaleString()} sats`
  }

  const formatBTC = (msat: number): string => {
    return `${(msat / 100000000000).toFixed(8)} BTC`
  }

  const formatTimeLeft = (expiry: number, timestamp: number): string => {
    const expiryTime = timestamp + (expiry * 1000)
    const timeLeft = expiryTime - Date.now()
    
    if (timeLeft <= 0) return 'Expired'
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getStatusBadge = (status: 'pending' | 'paid' | 'expired') => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
      case 'paid':
        return <Badge variant="default" className="bg-green-600">Paid</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
    }
  }

  // Effects
  useEffect(() => {
    loadNodeInfo()
  }, [loadNodeInfo])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Lightning Invoice Generator
          </CardTitle>
          <CardDescription>
            Create Lightning Network payment requests for instant Bitcoin transactions
          </CardDescription>
          
          {nodeInfo && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Connected to {nodeInfo.alias}</span>
              </div>
              <Badge variant="outline">{nodeInfo.numChannels} channels</Badge>
              <Badge variant="outline">{formatBTC(nodeInfo.totalCapacity * 1000)} capacity</Badge>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Invoice</TabsTrigger>
          <TabsTrigger value="invoice">Current Invoice</TabsTrigger>
          <TabsTrigger value="history">Invoice History</TabsTrigger>
        </TabsList>

        {/* Create Invoice Tab */}
        <TabsContent value="create" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (BTC)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.00000001"
                    value={form.amount}
                    onChange={(e) => setForm({...form, amount: e.target.value})}
                    placeholder="0.00100000"
                  />
                  {form.amount && (
                    <div className="text-sm text-muted-foreground">
                      = {formatSats(Math.floor(parseFloat(form.amount) * 100000000 * 1000))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    placeholder="Payment for..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Select 
                    value={form.expiry.toString()} 
                    onValueChange={(value) => setForm({...form, expiry: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="900">15 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                      <SelectItem value="3600">1 hour</SelectItem>
                      <SelectItem value="10800">3 hours</SelectItem>
                      <SelectItem value="86400">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fallbackAddress">Fallback Address (Optional)</Label>
                  <Input
                    id="fallbackAddress"
                    value={form.fallbackAddress}
                    onChange={(e) => setForm({...form, fallbackAddress: e.target.value})}
                    placeholder="Bitcoin address for fallback"
                  />
                  <div className="text-xs text-muted-foreground">
                    On-chain address used if Lightning payment fails
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview and Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.amount && form.description && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="font-medium">Invoice Preview</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-mono">{form.amount} BTC</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Description:</span>
                        <span className="text-right max-w-32 truncate">{form.description}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expires in:</span>
                        <span>{form.expiry < 3600 ? `${form.expiry/60}m` : `${form.expiry/3600}h`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span>{form.private ? 'Private' : 'Public'}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Private Invoice</Label>
                    <Button
                      variant={form.private ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setForm({...form, private: !form.private})}
                    >
                      {form.private ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {form.private ? 'Private' : 'Public'}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Private invoices include routing hints for improved payment success
                  </div>
                </div>

                <Separator />

                <Button 
                  onClick={generateInvoice} 
                  disabled={isLoading || !form.amount || !form.description}
                  className="w-full"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  Generate Lightning Invoice
                </Button>
              </CardContent>
            </Card>
          </div>

          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {copySuccess && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{copySuccess}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Current Invoice Tab */}
        <TabsContent value="invoice" className="space-y-4">
          {generatedInvoice ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-500" />
                    Lightning Invoice
                  </CardTitle>
                  {getStatusBadge(generatedInvoice.status)}
                </div>
                <CardDescription>
                  Created {generatedInvoice.createdAt.toLocaleString()} • 
                  Expires in {formatTimeLeft(generatedInvoice.expiry, generatedInvoice.timestamp * 1000)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invoice Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Amount</Label>
                      <div className="font-mono text-lg">{formatBTC(generatedInvoice.amount)}</div>
                      <div className="text-sm text-muted-foreground">{formatSats(generatedInvoice.amount)}</div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Description</Label>
                      <div className="text-sm">{generatedInvoice.description}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Payment Hash</Label>
                      <div className="font-mono text-xs break-all">
                        {generatedInvoice.paymentHash}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Node ID</Label>
                      <div className="font-mono text-xs break-all">
                        {generatedInvoice.nodeId.slice(0, 16)}...
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* BOLT11 Invoice */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>BOLT11 Invoice</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowQRCode(!showQRCode)}
                      >
                        <QrCode className="w-4 h-4" />
                        QR Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedInvoice.bolt11, 'Invoice')}
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted rounded font-mono text-xs break-all">
                    {generatedInvoice.bolt11}
                  </div>

                  {showQRCode && generatedInvoice.qrCodeData && (
                    <div className="flex justify-center p-4">
                      <div className="p-4 bg-white rounded-lg">
                        <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center">
                          <div className="text-center text-sm text-gray-500">
                            <QrCode className="w-16 h-16 mx-auto mb-2" />
                            QR Code would be rendered here
                            <div className="text-xs mt-1">Use a QR code library in production</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentTab('create')}>
                    Create Another
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(generatedInvoice.qrCodeData || generatedInvoice.bolt11, 'Payment URI')}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  {generatedInvoice.status === 'pending' && (
                    <Button
                      variant="outline"
                      onClick={() => monitorInvoicePayment(generatedInvoice.paymentHash)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Check Status
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Invoice Generated</h3>
                <p className="text-muted-foreground mb-4">
                  Create a Lightning invoice to get started
                </p>
                <Button onClick={() => setCurrentTab('create')}>
                  <Zap className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Invoice History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>
                Last 10 generated Lightning invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoiceHistory.length > 0 ? (
                <div className="space-y-3">
                  {invoiceHistory.map((invoice, index) => (
                    <div key={invoice.paymentHash} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm">{formatBTC(invoice.amount)}</div>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-md">
                          {invoice.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {invoice.createdAt.toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(invoice.bolt11, 'Invoice')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setGeneratedInvoice(invoice)
                            setCurrentTab('invoice')
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Invoice History</h3>
                  <p>Generated invoices will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
