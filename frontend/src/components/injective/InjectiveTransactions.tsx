/**
 * Injective Transactions
 * View and execute mint, burn, transfer, and batch operations for TokenFactory tokens
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Plus, Minus, Send, Package, RefreshCw, Filter, Search } from 'lucide-react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { supabase } from '@/infrastructure/database/client'
import { MintDialog } from './dialogs/MintDialog'
import { BurnDialog } from './dialogs/BurnDialog'
import { TransferDialog } from './dialogs/TransferDialog'
import { BatchMintDialog } from './dialogs/BatchMintDialog'
import { BatchBurnDialog } from './dialogs/BatchBurnDialog'
import { BatchTransferDialog } from './dialogs/BatchTransferDialog'
import { TransactionDetailsDialog } from './dialogs/TransactionDetailsDialog'
import { useToast } from '@/components/ui/use-toast'

// ============================================================================
// TYPES
// ============================================================================

interface InjectiveTransaction {
  id: string
  denom: string
  token_name?: string
  token_symbol?: string
  transaction_type: 'mint' | 'burn' | 'transfer' | 'batch_mint' | 'batch_burn' | 'batch_transfer'
  from_address?: string
  to_address?: string
  amount: string
  tx_hash: string
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
  network: 'mainnet' | 'testnet'
  batch_id?: string
  batch_index?: number
  batch_total?: number
  created_at: string
  transaction_timestamp?: string
}

interface InjectiveToken {
  id: string
  denom: string
  name: string
  symbol: string
  decimals: number
  total_supply: string
  network: string
  admin_address: string
}

interface InjectiveTransactionsProps {
  projectId: string
  network?: 'mainnet' | 'testnet'
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InjectiveTransactions({ 
  projectId, 
  network = 'testnet' 
}: InjectiveTransactionsProps) {
  const { toast } = useToast()
  
  // State
  const [transactions, setTransactions] = useState<InjectiveTransaction[]>([])
  const [tokens, setTokens] = useState<InjectiveToken[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedToken, setSelectedToken] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('history')
  
  // Dialog states
  const [mintDialogOpen, setMintDialogOpen] = useState(false)
  const [burnDialogOpen, setBurnDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [batchMintDialogOpen, setBatchMintDialogOpen] = useState(false)
  const [batchBurnDialogOpen, setBatchBurnDialogOpen] = useState(false)
  const [batchTransferDialogOpen, setBatchTransferDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<InjectiveTransaction | null>(null)

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadData()
  }, [projectId, network])

  async function loadData() {
    setLoading(true)
    try {
      await Promise.all([
        loadTransactions(),
        loadTokens()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load transaction data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadTransactions() {
    // Load transactions with token details
    const { data, error } = await supabase
      .from('v_injective_recent_transactions')
      .select('*')
      .eq('network', network)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw error
    }

    setTransactions(data || [])
  }

  async function loadTokens() {
    const { data, error } = await supabase
      .from('injective_native_tokens')
      .select('id, denom, name, symbol, decimals, total_supply, network, admin_address')
      .eq('network', network)
      .eq('status', 'active')
      .order('name')

    if (error) {
      throw error
    }

    setTokens(data || [])
  }

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredTransactions = transactions.filter(tx => {
    // Token filter
    if (selectedToken !== 'all' && tx.denom !== selectedToken) {
      return false
    }

    // Type filter
    if (selectedType !== 'all' && tx.transaction_type !== selectedType) {
      return false
    }

    // Status filter
    if (selectedStatus !== 'all' && tx.status !== selectedStatus) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        tx.tx_hash.toLowerCase().includes(query) ||
        tx.denom.toLowerCase().includes(query) ||
        tx.from_address?.toLowerCase().includes(query) ||
        tx.to_address?.toLowerCase().includes(query) ||
        tx.token_name?.toLowerCase().includes(query) ||
        tx.token_symbol?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // ============================================================================
  // HANDLERS
  // ============================================================================

  function handleViewDetails(tx: InjectiveTransaction) {
    setSelectedTransaction(tx)
    setDetailsDialogOpen(true)
  }

  function handleOperationSuccess() {
    loadTransactions()
    toast({
      title: 'Success',
      description: 'Transaction submitted successfully'
    })
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Token Operations
              </CardTitle>
              <CardDescription>
                Execute mint, burn, transfer, and batch operations
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history">Transaction History</TabsTrigger>
              <TabsTrigger value="single">Single Operations</TabsTrigger>
              <TabsTrigger value="batch">Batch Operations</TabsTrigger>
            </TabsList>

            {/* Transaction History Tab */}
            <TabsContent value="history" className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={selectedToken} onValueChange={setSelectedToken}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Tokens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tokens</SelectItem>
                    {tokens.map(token => (
                      <SelectItem key={token.id} value={token.denom}>
                        {token.symbol} - {token.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="mint">Mint</SelectItem>
                    <SelectItem value="burn">Burn</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="batch_mint">Batch Mint</SelectItem>
                    <SelectItem value="batch_burn">Batch Burn</SelectItem>
                    <SelectItem value="batch_transfer">Batch Transfer</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>From/To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {loading ? 'Loading...' : 'No transactions found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <Badge variant="outline">{tx.transaction_type}</Badge>
                            {tx.batch_id && (
                              <Badge variant="secondary" className="ml-1">
                                Batch {tx.batch_index! + 1}/{tx.batch_total}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{tx.token_symbol || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {tx.denom}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{tx.amount}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {tx.from_address && (
                                <div className="truncate max-w-[120px]">
                                  From: {tx.from_address}
                                </div>
                              )}
                              {tx.to_address && (
                                <div className="truncate max-w-[120px]">
                                  To: {tx.to_address}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                tx.status === 'confirmed' ? 'success' :
                                tx.status === 'pending' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(tx.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(tx)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Single Operations Tab */}
            <TabsContent value="single" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Plus className="h-5 w-5" />
                      Mint Tokens
                    </CardTitle>
                    <CardDescription>
                      Create new tokens and send to recipient
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full" 
                      onClick={() => setMintDialogOpen(true)}
                    >
                      Open Mint Dialog
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Minus className="h-5 w-5" />
                      Burn Tokens
                    </CardTitle>
                    <CardDescription>
                      Permanently destroy tokens from supply
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full" 
                      variant="destructive"
                      onClick={() => setBurnDialogOpen(true)}
                    >
                      Open Burn Dialog
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Send className="h-5 w-5" />
                      Transfer Tokens
                    </CardTitle>
                    <CardDescription>
                      Send tokens to another address
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full"
                      onClick={() => setTransferDialogOpen(true)}
                    >
                      Open Transfer Dialog
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Batch Operations Tab */}
            <TabsContent value="batch" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5" />
                      Batch Mint
                    </CardTitle>
                    <CardDescription>
                      Mint tokens to multiple recipients
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full"
                      onClick={() => setBatchMintDialogOpen(true)}
                    >
                      Open Batch Mint
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5" />
                      Batch Burn
                    </CardTitle>
                    <CardDescription>
                      Burn tokens in multiple amounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full"
                      variant="destructive"
                      onClick={() => setBatchBurnDialogOpen(true)}
                    >
                      Open Batch Burn
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5" />
                      Batch Transfer
                    </CardTitle>
                    <CardDescription>
                      Send to multiple recipients at once
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full"
                      onClick={() => setBatchTransferDialogOpen(true)}
                    >
                      Open Batch Transfer
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <MintDialog
        open={mintDialogOpen}
        onOpenChange={setMintDialogOpen}
        tokens={tokens}
        network={network}
        onSuccess={handleOperationSuccess}
      />
      
      <BurnDialog
        open={burnDialogOpen}
        onOpenChange={setBurnDialogOpen}
        tokens={tokens}
        network={network}
        onSuccess={handleOperationSuccess}
      />
      
      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        tokens={tokens}
        network={network}
        onSuccess={handleOperationSuccess}
      />
      
      <BatchMintDialog
        open={batchMintDialogOpen}
        onOpenChange={setBatchMintDialogOpen}
        tokens={tokens}
        network={network}
        onSuccess={handleOperationSuccess}
      />
      
      <BatchBurnDialog
        open={batchBurnDialogOpen}
        onOpenChange={setBatchBurnDialogOpen}
        tokens={tokens}
        network={network}
        onSuccess={handleOperationSuccess}
      />
      
      <BatchTransferDialog
        open={batchTransferDialogOpen}
        onOpenChange={setBatchTransferDialogOpen}
        tokens={tokens}
        network={network}
        onSuccess={handleOperationSuccess}
      />
      
      <TransactionDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        transaction={selectedTransaction}
      />
    </div>
  )
}

export default InjectiveTransactions
