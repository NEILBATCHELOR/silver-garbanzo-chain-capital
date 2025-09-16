/**
 * UTXO Manager Component
 * 
 * Provides interface for managing Bitcoin UTXOs
 * Features coin selection, UTXO consolidation, and dust management
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Coins, 
  RefreshCw, 
  Filter, 
  Merge, 
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react'
import { BitcoinAdapter } from '@/infrastructure/web3/adapters/bitcoin/BitcoinAdapter'

interface UTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
  scriptPubKey: string;
  height?: number;
  confirmations?: number;
  isDust: boolean;
  ageInBlocks: number;
  selected: boolean;
}

interface UTXOFilter {
  minAmount: number;
  maxAmount: number;
  minConfirmations: number;
  showDust: boolean;
  showUnconfirmed: boolean;
  sortBy: 'value' | 'age' | 'confirmations';
  sortOrder: 'asc' | 'desc';
}

interface ConsolidationPlan {
  inputUtxos: UTXO[];
  estimatedFee: number;
  estimatedSize: number;
  savingsInBytes: number;
  newUtxoValue: number;
  feeRate: number;
}

export function UTXOManager() {
  // State management
  const [address, setAddress] = useState('')
  const [utxos, setUtxos] = useState<UTXO[]>([])
  const [selectedUtxos, setSelectedUtxos] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<UTXOFilter>({
    minAmount: 0,
    maxAmount: 0,
    minConfirmations: 0,
    showDust: true,
    showUnconfirmed: true,
    sortBy: 'value',
    sortOrder: 'desc'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [consolidationPlan, setConsolidationPlan] = useState<ConsolidationPlan | null>(null)
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [currentBlock, setCurrentBlock] = useState(0)

  // Bitcoin adapter instance
  const bitcoinAdapter = new BitcoinAdapter()

  // Constants
  const DUST_THRESHOLD = 546 // satoshis
  const MIN_RELAY_FEE = 1000 // satoshis per kB

  // Load UTXOs for address
  const loadUtxos = useCallback(async (address: string) => {
    if (!address) return

    try {
      setIsLoading(true)
      setError('')
      
      // Connect adapter if not connected
      if (!bitcoinAdapter.isConnected) {
        await bitcoinAdapter.connect({
          rpcUrl: 'https://blockstream.info/api',
          networkId: 'mainnet'
        })
      }

      // Get current block height
      const blockHeight = await bitcoinAdapter.getCurrentBlockNumber()
      setCurrentBlock(blockHeight)

      // Fetch UTXOs
      const fetchedUtxos = await bitcoinAdapter.getUTXOs(address)
      
      // Enhance UTXOs with additional data
      const enhancedUtxos: UTXO[] = await Promise.all(
        fetchedUtxos.map(async (utxo, index) => {
          let confirmations = 0
          let height = utxo.height || 0
          
          try {
            const txStatus = await bitcoinAdapter.getTransaction(utxo.txid)
            confirmations = txStatus.confirmations || 0
            if (txStatus.blockNumber) {
              height = txStatus.blockNumber
            }
          } catch (error) {
            console.warn(`Failed to get tx status for ${utxo.txid}:`, error)
          }

          const ageInBlocks = height > 0 ? blockHeight - height : 0
          const isDust = utxo.value <= DUST_THRESHOLD
          
          return {
            ...utxo,
            confirmations,
            height,
            ageInBlocks,
            isDust,
            selected: false
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

  // Filter and sort UTXOs
  const filteredUtxos = utxos
    .filter(utxo => {
      // Search filter
      if (searchTerm && !utxo.txid.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      
      // Amount filter
      if (filter.minAmount > 0 && utxo.value < filter.minAmount) return false
      if (filter.maxAmount > 0 && utxo.value > filter.maxAmount) return false
      
      // Confirmations filter
      if (utxo.confirmations < filter.minConfirmations) return false
      
      // Dust filter
      if (!filter.showDust && utxo.isDust) return false
      
      // Unconfirmed filter
      if (!filter.showUnconfirmed && utxo.confirmations === 0) return false
      
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (filter.sortBy) {
        case 'value':
          comparison = a.value - b.value
          break
        case 'age':
          comparison = a.ageInBlocks - b.ageInBlocks
          break
        case 'confirmations':
          comparison = a.confirmations - b.confirmations
          break
      }
      
      return filter.sortOrder === 'asc' ? comparison : -comparison
    })

  // Calculate UTXO statistics
  const stats = {
    total: utxos.length,
    confirmed: utxos.filter(u => u.confirmations > 0).length,
    unconfirmed: utxos.filter(u => u.confirmations === 0).length,
    dust: utxos.filter(u => u.isDust).length,
    totalValue: utxos.reduce((sum, u) => sum + u.value, 0),
    dustValue: utxos.filter(u => u.isDust).reduce((sum, u) => sum + u.value, 0),
    selectedCount: selectedUtxos.size,
    selectedValue: utxos
      .filter(u => selectedUtxos.has(`${u.txid}-${u.vout}`))
      .reduce((sum, u) => sum + u.value, 0)
  }

  // Toggle UTXO selection
  const toggleUtxoSelection = (utxo: UTXO) => {
    const key = `${utxo.txid}-${utxo.vout}`
    const newSelected = new Set(selectedUtxos)
    
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    
    setSelectedUtxos(newSelected)
  }

  // Select all filtered UTXOs
  const selectAllFiltered = () => {
    const newSelected = new Set(selectedUtxos)
    filteredUtxos.forEach(utxo => {
      newSelected.add(`${utxo.txid}-${utxo.vout}`)
    })
    setSelectedUtxos(newSelected)
  }

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedUtxos(new Set())
  }

  // Create consolidation plan
  const createConsolidationPlan = useCallback(async () => {
    const selectedUtxosList = utxos.filter(u => 
      selectedUtxos.has(`${u.txid}-${u.vout}`)
    )

    if (selectedUtxosList.length < 2) {
      setError('Select at least 2 UTXOs to consolidate')
      return
    }

    try {
      // Estimate fee for consolidation transaction
      const feeRate = await bitcoinAdapter.getFeeRate()
      
      // Estimate transaction size
      // Base size + (number of inputs * input size) + (1 output * output size)
      const estimatedSize = 10 + (selectedUtxosList.length * 148) + 34
      const estimatedFee = Math.ceil(estimatedSize * feeRate)
      
      const totalInputValue = selectedUtxosList.reduce((sum, u) => sum + u.value, 0)
      const newUtxoValue = totalInputValue - estimatedFee

      if (newUtxoValue <= 0) {
        setError('Selected UTXOs have insufficient value to cover transaction fee')
        return
      }

      // Calculate space savings
      const currentTotalSize = selectedUtxosList.length * 148 // Each UTXO as input
      const newTotalSize = 34 // Single output
      const savingsInBytes = currentTotalSize - newTotalSize

      const plan: ConsolidationPlan = {
        inputUtxos: selectedUtxosList,
        estimatedFee,
        estimatedSize,
        savingsInBytes,
        newUtxoValue,
        feeRate
      }

      setConsolidationPlan(plan)
      setError('')
    } catch (error) {
      setError(`Failed to create consolidation plan: ${error}`)
    }
  }, [selectedUtxos, utxos])

  // Format functions
  const formatSats = (sats: number): string => {
    return `${sats.toLocaleString()} sats`
  }

  const formatBTC = (sats: number): string => {
    return `${(sats / 100000000).toFixed(8)} BTC`
  }

  const getConfirmationBadge = (confirmations: number) => {
    if (confirmations === 0) return <Badge variant="destructive">Unconfirmed</Badge>
    if (confirmations < 6) return <Badge variant="outline">{confirmations} conf</Badge>
    return <Badge variant="secondary">Confirmed</Badge>
  }

  // Effects
  useEffect(() => {
    if (address) {
      loadUtxos(address)
    }
  }, [address, loadUtxos])

  useEffect(() => {
    createConsolidationPlan()
  }, [selectedUtxos, createConsolidationPlan])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            UTXO Manager
          </CardTitle>
          <CardDescription>
            Manage Bitcoin UTXOs with advanced coin selection and consolidation features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Address Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="address">Bitcoin Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter Bitcoin address to analyze UTXOs"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => loadUtxos(address)} 
                disabled={isLoading || !address}
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Load
              </Button>
            </div>
          </div>

          {/* Statistics */}
          {stats.total > 0 && (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total UTXOs</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatBTC(stats.totalValue)}
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
                <div className="text-sm text-muted-foreground">Confirmed</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.unconfirmed} pending
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.dust}</div>
                <div className="text-sm text-muted-foreground">Dust UTXOs</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatSats(stats.dustValue)}
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.selectedCount}</div>
                <div className="text-sm text-muted-foreground">Selected</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatBTC(stats.selectedValue)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters and Controls */}
      {utxos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Quick Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by transaction ID..."
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filter.sortBy} onValueChange={(value) => 
                setFilter({...filter, sortBy: value as any})
              }>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">Sort by Value</SelectItem>
                  <SelectItem value="age">Sort by Age</SelectItem>
                  <SelectItem value="confirmations">Sort by Confirmations</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                onClick={() => setFilter({...filter, sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc'})}
              >
                {filter.sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>

            {/* Advanced Filters */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                Advanced
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
                disabled={filteredUtxos.length === 0}
              >
                Select All ({filteredUtxos.length})
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllSelections}
                disabled={selectedUtxos.size === 0}
              >
                Clear Selection
              </Button>
            </div>

            {showAdvanced && (
              <div className="grid gap-4 md:grid-cols-3 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Min Amount (sats)</Label>
                  <Input
                    type="number"
                    value={filter.minAmount}
                    onChange={(e) => setFilter({...filter, minAmount: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Amount (sats)</Label>
                  <Input
                    type="number"
                    value={filter.maxAmount}
                    onChange={(e) => setFilter({...filter, maxAmount: parseInt(e.target.value) || 0})}
                    placeholder="No limit"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Min Confirmations</Label>
                  <Input
                    type="number"
                    value={filter.minConfirmations}
                    onChange={(e) => setFilter({...filter, minConfirmations: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showDust"
                    checked={filter.showDust}
                    onCheckedChange={(checked) => setFilter({...filter, showDust: checked as boolean})}
                  />
                  <Label htmlFor="showDust">Show dust UTXOs</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showUnconfirmed"
                    checked={filter.showUnconfirmed}
                    onCheckedChange={(checked) => setFilter({...filter, showUnconfirmed: checked as boolean})}
                  />
                  <Label htmlFor="showUnconfirmed">Show unconfirmed</Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* UTXO Table */}
      {filteredUtxos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>UTXOs ({filteredUtxos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUtxos.map((utxo) => (
                    <TableRow 
                      key={`${utxo.txid}-${utxo.vout}`}
                      className={selectedUtxos.has(`${utxo.txid}-${utxo.vout}`) ? 'bg-blue-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedUtxos.has(`${utxo.txid}-${utxo.vout}`)}
                          onCheckedChange={() => toggleUtxoSelection(utxo)}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-mono text-sm">
                          {utxo.txid.slice(0, 8)}...:{utxo.vout}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Block: {utxo.height || 'Unconfirmed'}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-mono">{formatSats(utxo.value)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatBTC(utxo.value)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {utxo.ageInBlocks} blocks
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ~{Math.floor(utxo.ageInBlocks * 10 / 60)} hours
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getConfirmationBadge(utxo.confirmations)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-1">
                          {utxo.isDust && (
                            <Badge variant="outline" className="text-xs">
                              Dust
                            </Badge>
                          )}
                          {utxo.value > 100000000 && (
                            <Badge variant="secondary" className="text-xs">
                              Large
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consolidation Plan */}
      {consolidationPlan && selectedUtxos.size > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Merge className="w-5 h-5" />
              Consolidation Plan
            </CardTitle>
            <CardDescription>
              Merge selected UTXOs to reduce future transaction fees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">{consolidationPlan.inputUtxos.length}</div>
                <div className="text-sm text-muted-foreground">UTXOs to merge</div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {formatSats(consolidationPlan.newUtxoValue)}
                </div>
                <div className="text-sm text-muted-foreground">New UTXO value</div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold text-orange-600">
                  {formatSats(consolidationPlan.estimatedFee)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Fee ({consolidationPlan.feeRate} sat/vB)
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {consolidationPlan.savingsInBytes}
                </div>
                <div className="text-sm text-muted-foreground">Bytes saved</div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Transaction Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Estimated size:</span>
                  <span>{consolidationPlan.estimatedSize} vBytes</span>
                </div>
                <div className="flex justify-between">
                  <span>Fee rate:</span>
                  <span>{consolidationPlan.feeRate} sat/vB</span>
                </div>
                <div className="flex justify-between">
                  <span>Total input value:</span>
                  <span className="font-mono">
                    {formatBTC(consolidationPlan.inputUtxos.reduce((sum, u) => sum + u.value, 0))}
                  </span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Network fee:</span>
                  <span className="font-mono">{formatBTC(consolidationPlan.estimatedFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>New UTXO value:</span>
                  <span className="font-mono text-green-600">
                    {formatBTC(consolidationPlan.newUtxoValue)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  alert('Consolidation transaction created! (Demo mode)')
                  clearAllSelections()
                }}
                disabled={consolidationPlan.newUtxoValue <= 0}
              >
                Create Consolidation Transaction
                <Merge className="w-4 h-4 ml-2" />
              </Button>
              
              <Button variant="outline" onClick={clearAllSelections}>
                Cancel
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

      {/* Empty State */}
      {!isLoading && utxos.length === 0 && address && (
        <Card>
          <CardContent className="text-center py-12">
            <Coins className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No UTXOs Found</h3>
            <p className="text-muted-foreground">
              This address has no unspent transaction outputs.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
