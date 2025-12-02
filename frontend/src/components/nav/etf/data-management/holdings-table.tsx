/**
 * ETF Holdings Table
 * Display and manage ETF holdings
 * With filtering, sorting, bulk actions
 */

import { useState } from 'react'
import {
  Edit,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  Download,
  Plus
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

import { SecurityType, type ETFHolding } from '@/types/nav/etf'

interface HoldingsTableProps {
  holdings: ETFHolding[]
  isLoading?: boolean
  onEdit?: (holding: ETFHolding) => void
  onDelete?: (holdingId: string) => void
  onAdd?: () => void
  onBulkDelete?: (holdingIds: string[]) => void
  onExport?: () => void
}

export function HoldingsTable({
  holdings,
  isLoading,
  onEdit,
  onDelete,
  onAdd,
  onBulkDelete,
  onExport,
}: HoldingsTableProps) {
  const [securityTypeFilter, setSecurityTypeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedHoldings, setSelectedHoldings] = useState<Set<string>>(new Set())

  // Apply filters
  const filteredHoldings = holdings.filter(holding => {
    const matchesSecurityType = securityTypeFilter === 'all' || holding.security_type === securityTypeFilter
    const matchesSearch = searchTerm === '' || 
      holding.security_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      holding.security_ticker?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSecurityType && matchesSearch
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHoldings(new Set(filteredHoldings.map(h => h.id)))
    } else {
      setSelectedHoldings(new Set())
    }
  }

  const handleSelectOne = (holdingId: string, checked: boolean) => {
    const newSelection = new Set(selectedHoldings)
    if (checked) {
      newSelection.add(holdingId)
    } else {
      newSelection.delete(holdingId)
    }
    setSelectedHoldings(newSelection)
  }

  const handleBulkDelete = () => {
    if (selectedHoldings.size === 0) return
    
    const message = `Are you sure you want to delete ${selectedHoldings.size} holding${selectedHoldings.size > 1 ? 's' : ''}? This action cannot be undone.`
    if (confirm(message)) {
      onBulkDelete?.(Array.from(selectedHoldings))
      setSelectedHoldings(new Set())
    }
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      onDelete?.(id)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatQuantity = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  const getSecurityTypeBadge = (securityType: string) => {
    const typeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      [SecurityType.EQUITY]: { label: 'Equity', variant: 'default' },
      [SecurityType.BOND]: { label: 'Bond', variant: 'secondary' },
      [SecurityType.CRYPTO]: { label: 'Crypto', variant: 'default' },
      [SecurityType.COMMODITY]: { label: 'Commodity', variant: 'secondary' },
      [SecurityType.CASH]: { label: 'Cash', variant: 'outline' },
      [SecurityType.DERIVATIVE]: { label: 'Derivative', variant: 'outline' },
    }

    const config = typeMap[securityType] || { label: securityType, variant: 'outline' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const totalMarketValue = filteredHoldings.reduce((sum, h) => sum + h.market_value, 0)
  const allSelected = filteredHoldings.length > 0 && selectedHoldings.size === filteredHoldings.length

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or ticker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <Select value={securityTypeFilter} onValueChange={setSecurityTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Security Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value={SecurityType.EQUITY}>Equity</SelectItem>
            <SelectItem value={SecurityType.BOND}>Bond</SelectItem>
            <SelectItem value={SecurityType.CRYPTO}>Crypto</SelectItem>
            <SelectItem value={SecurityType.COMMODITY}>Commodity</SelectItem>
            <SelectItem value={SecurityType.CASH}>Cash</SelectItem>
            <SelectItem value={SecurityType.DERIVATIVE}>Derivative</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {selectedHoldings.size > 0 && onBulkDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedHoldings.size})
            </Button>
          )}

          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}

          {onAdd && (
            <Button onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Holding
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Security</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="text-right">Weight %</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Blockchain</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  Loading holdings...
                </TableCell>
              </TableRow>
            ) : filteredHoldings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  {holdings.length === 0 
                    ? 'No holdings found. Add your first holding to get started.'
                    : 'No holdings match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredHoldings.map((holding) => (
                <TableRow key={holding.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedHoldings.has(holding.id)}
                      onCheckedChange={(checked) => handleSelectOne(holding.id, !!checked)}
                      aria-label={`Select ${holding.security_name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{holding.security_name}</span>
                      {holding.security_ticker && (
                        <code className="text-xs text-muted-foreground">
                          {holding.security_ticker}
                        </code>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getSecurityTypeBadge(holding.security_type)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatQuantity(holding.quantity, holding.security_type === SecurityType.CRYPTO ? 8 : 2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(holding.price_per_unit)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(holding.market_value)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {holding.weight_percentage.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    {holding.sector && (
                      <Badge variant="outline">{holding.sector}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {holding.blockchain && (
                      <Badge variant="secondary">{holding.blockchain}</Badge>
                    )}
                    {holding.is_staked && (
                      <Badge variant="default" className="ml-1">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Staked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(holding)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(holding.id, holding.security_name)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {filteredHoldings.length > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {filteredHoldings.length} of {holdings.length} holding{holdings.length !== 1 ? 's' : ''}
          </span>
          <span className="font-semibold">
            Total Market Value: {formatCurrency(totalMarketValue)}
          </span>
        </div>
      )}
    </div>
  )
}
