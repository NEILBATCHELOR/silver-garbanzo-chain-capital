/**
 * Payments Management Page
 * Simple, functional CRUD interface for managing payments
 * NO FLUFF - just Create, Read, Update (status), Delete operations
 */

import React, { useState } from 'react'
import { usePayments } from '@/hooks/psp'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Plus, RefreshCw, Search, Trash2, Eye } from 'lucide-react'
import { PspPayment, CreateFiatPaymentRequest, CreateCryptoPaymentRequest } from '@/types/psp'
import { cn } from '@/utils/utils'

interface PaymentsPageProps {
  projectId: string
}

export default function PaymentsPage({ projectId }: PaymentsPageProps) {
  const {
    payments,
    summary,
    loading,
    error,
    fetchPayments,
    createFiatPayment,
    createCryptoPayment
  } = usePayments(projectId)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [paymentType, setPaymentType] = useState<'fiat' | 'crypto'>('fiat')
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PspPayment | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    sourceId: '',
    destinationId: '',
    paymentRail: 'ach',
    network: 'ethereum',
    memo: ''
  })

  const filteredPayments = Array.isArray(payments) 
    ? payments.filter((payment) => {
        const matchesSearch = payment.warp_payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.memo?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
        const matchesType = typeFilter === 'all' || payment.payment_type === typeFilter
        return matchesSearch && matchesStatus && matchesType
      })
    : []

  const handleCreatePayment = async () => {
    try {
      if (paymentType === 'fiat') {
        const request: CreateFiatPaymentRequest = {
          project_id: projectId,
          source_wallet_id: formData.sourceId,
          destination_account_id: formData.destinationId,
          amount: formData.amount,
          payment_rail: formData.paymentRail as any,
          memo: formData.memo || undefined,
          idempotency_key: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
        await createFiatPayment(request)
      } else {
        const request: CreateCryptoPaymentRequest = {
          project_id: projectId,
          source_wallet_id: formData.sourceId,
          destination_account_id: formData.destinationId,
          amount: formData.amount,
          network: formData.network,
          memo: formData.memo || undefined,
          idempotency_key: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
        await createCryptoPayment(request)
      }

      setCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error('Failed to create payment:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      amount: '',
      currency: 'USD',
      sourceId: '',
      destinationId: '',
      paymentRail: 'ach',
      network: 'ethereum',
      memo: ''
    })
  }

  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return `0 ${currency}`
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'success',
      failed: 'destructive',
      cancelled: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage all fiat and crypto payments</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Payment</DialogTitle>
              <DialogDescription>
                Create a new fiat or crypto payment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Payment Type Selection */}
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={paymentType} onValueChange={(value: 'fiat' | 'crypto') => setPaymentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiat">Fiat Payment (ACH, Wire, RTP, FedNow, Push-to-Card)</SelectItem>
                    <SelectItem value="crypto">Crypto Payment (Blockchain)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="100.00"
                />
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="USD, USDC, ETH, etc."
                />
              </div>

              {/* Source ID */}
              <div className="space-y-2">
                <Label htmlFor="sourceId">Source Account/Wallet ID</Label>
                <Input
                  id="sourceId"
                  value={formData.sourceId}
                  onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                  placeholder="UUID of source wallet or account"
                />
              </div>

              {/* Destination ID */}
              <div className="space-y-2">
                <Label htmlFor="destinationId">Destination Account/Wallet ID</Label>
                <Input
                  id="destinationId"
                  value={formData.destinationId}
                  onChange={(e) => setFormData({ ...formData, destinationId: e.target.value })}
                  placeholder="UUID of destination wallet or account"
                />
              </div>

              {/* Payment Rail (for fiat only) */}
              {paymentType === 'fiat' && (
                <div className="space-y-2">
                  <Label>Payment Rail</Label>
                  <Select value={formData.paymentRail} onValueChange={(value) => setFormData({ ...formData, paymentRail: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ach">ACH (Next-Day)</SelectItem>
                      <SelectItem value="wire">Wire Transfer</SelectItem>
                      <SelectItem value="rtp">RTP (Real-Time Payments)</SelectItem>
                      <SelectItem value="fednow">FedNow (Instant)</SelectItem>
                      <SelectItem value="push_to_card">Push-to-Card (Visa/Mastercard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Network (for crypto only) */}
              {paymentType === 'crypto' && (
                <div className="space-y-2">
                  <Label>Blockchain Network</Label>
                  <Select value={formData.network} onValueChange={(value) => setFormData({ ...formData, network: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="solana">Solana</SelectItem>
                      <SelectItem value="bitcoin">Bitcoin</SelectItem>
                      <SelectItem value="stellar">Stellar</SelectItem>
                      <SelectItem value="tron">Tron</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Memo */}
              <div className="space-y-2">
                <Label htmlFor="memo">Memo (Optional)</Label>
                <Input
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Payment description or reference"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePayment} disabled={!formData.amount || !formData.sourceId || !formData.destinationId}>
                Create Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Payments</CardDescription>
            <CardTitle className="text-2xl">{summary?.total_count || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl text-green-600">{summary?.by_status?.completed || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{summary?.by_status?.pending || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-2xl text-red-600">{summary?.by_status?.failed || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID or memo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fiat_payment">Fiat Payment</SelectItem>
                  <SelectItem value="crypto_payment">Crypto Payment</SelectItem>
                  <SelectItem value="fiat_withdrawal">Fiat Withdrawal</SelectItem>
                  <SelectItem value="fiat_deposit">Fiat Deposit</SelectItem>
                  <SelectItem value="crypto_withdrawal">Crypto Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => fetchPayments()}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payments List</CardTitle>
          <CardDescription>
            {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Rail/Network</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">
                      {payment.warp_payment_id?.substring(0, 8) || payment.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>{payment.payment_type}</TableCell>
                    <TableCell>{formatAmount(payment.amount, payment.currency)}</TableCell>
                    <TableCell>{payment.payment_rail || payment.network || '-'}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {new Date(payment.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment)
                            setViewDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Payment Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Complete payment information
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Payment ID</Label>
                  <p className="font-mono text-sm">{selectedPayment.warp_payment_id || selectedPayment.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p>{selectedPayment.payment_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Direction</Label>
                  <p>{selectedPayment.direction}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-semibold">{formatAmount(selectedPayment.amount, selectedPayment.currency)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Rail/Network</Label>
                  <p>{selectedPayment.payment_rail || selectedPayment.network || '-'}</p>
                </div>
                {selectedPayment.memo && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Memo</Label>
                    <p>{selectedPayment.memo}</p>
                  </div>
                )}
                {selectedPayment.error_message && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-destructive">Error</Label>
                    <p className="text-destructive text-sm">{selectedPayment.error_message}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{new Date(selectedPayment.created_at).toLocaleString()}</p>
                </div>
                {selectedPayment.completed_at && (
                  <div>
                    <Label className="text-muted-foreground">Completed</Label>
                    <p>{new Date(selectedPayment.completed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
