/**
 * ETF Products Table
 * Display and manage list of ETF products
 * With filtering, sorting, and actions
 */

import { useState } from 'react'
import { 
  Eye, 
  Calculator, 
  Trash2, 
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
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

import { ETFType, type ETFProduct, type ETFWithLatestNAV } from '@/types/nav/etf'
import { toast } from 'sonner'

interface ETFProductsTableProps {
  products: ETFProduct[] | ETFWithLatestNAV[]
  isLoading?: boolean
  onViewDetails?: (product: ETFProduct | ETFWithLatestNAV) => void
  onCalculate?: (product: ETFProduct | ETFWithLatestNAV) => void
  onEdit?: (product: ETFProduct | ETFWithLatestNAV) => void
  onDelete?: (productId: string) => void
  onCreateNew?: () => void
}

export function ETFProductsTable({
  products,
  isLoading,
  onViewDetails,
  onCalculate,
  onEdit,
  onDelete,
  onCreateNew,
}: ETFProductsTableProps) {
  const [fundTypeFilter, setFundTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Apply filters
  const filteredProducts = products.filter(product => {
    const matchesFundType = fundTypeFilter === 'all' || product.fund_type === fundTypeFilter
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter
    const matchesSearch = searchTerm === '' || 
      product.fund_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.fund_ticker?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFundType && matchesStatus && matchesSearch
  })

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      onDelete?.(id)
    }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercentage = (value: number | null | undefined, decimals: number = 2) => {
    if (value === null || value === undefined) return '-'
    return `${value.toFixed(decimals)}%`
  }

  const getPremiumDiscountBadge = (premiumDiscountPct: number | null | undefined) => {
    if (premiumDiscountPct === null || premiumDiscountPct === undefined) {
      return <Badge variant="secondary">No Data</Badge>
    }

    if (Math.abs(premiumDiscountPct) < 0.25) {
      return (
        <Badge variant="default">
          Fair Value
        </Badge>
      )
    }

    if (premiumDiscountPct > 0) {
      return (
        <Badge variant="default" className="bg-green-500">
          <TrendingUp className="mr-1 h-3 w-3" />
          {formatPercentage(premiumDiscountPct)}
        </Badge>
      )
    }

    return (
      <Badge variant="destructive">
        <TrendingDown className="mr-1 h-3 w-3" />
        {formatPercentage(premiumDiscountPct)}
      </Badge>
    )
  }

  const getETFTypeBadge = (fundType: string) => {
    const typeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      [ETFType.EQUITY]: { label: 'Equity', variant: 'default' },
      [ETFType.BOND]: { label: 'Bond', variant: 'secondary' },
      [ETFType.CRYPTO]: { label: 'Crypto', variant: 'default' },
      [ETFType.COMMODITY]: { label: 'Commodity', variant: 'secondary' },
      [ETFType.SECTOR]: { label: 'Sector', variant: 'outline' },
      [ETFType.THEMATIC]: { label: 'Thematic', variant: 'outline' },
      [ETFType.SMART_BETA]: { label: 'Smart Beta', variant: 'outline' },
    }

    const config = typeMap[fundType] || { label: fundType, variant: 'outline' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or ticker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <Select value={fundTypeFilter} onValueChange={setFundTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ETF Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value={ETFType.EQUITY}>Equity</SelectItem>
            <SelectItem value={ETFType.BOND}>Bond</SelectItem>
            <SelectItem value={ETFType.CRYPTO}>Crypto</SelectItem>
            <SelectItem value={ETFType.COMMODITY}>Commodity</SelectItem>
            <SelectItem value={ETFType.SECTOR}>Sector</SelectItem>
            <SelectItem value={ETFType.THEMATIC}>Thematic</SelectItem>
            <SelectItem value={ETFType.SMART_BETA}>Smart Beta</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_sec">Pending SEC</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="liquidating">Liquidating</SelectItem>
          </SelectContent>
        </Select>

        {onCreateNew && (
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            New ETF
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fund Name</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">NAV</TableHead>
              <TableHead className="text-right">Market Price</TableHead>
              <TableHead className="text-center">Premium/Discount</TableHead>
              <TableHead className="text-right">AUM</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Loading ETFs...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  {products.length === 0 
                    ? 'No ETFs found. Create your first ETF to get started.'
                    : 'No ETFs match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.fund_name}</span>
                      {product.share_class_name && (
                        <span className="text-xs text-muted-foreground">
                          {product.share_class_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm">{product.fund_ticker}</code>
                  </TableCell>
                  <TableCell>
                    {getETFTypeBadge(product.fund_type)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(product.net_asset_value)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(product.market_price)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getPremiumDiscountBadge(product.premium_discount_pct)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(product.assets_under_management)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
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
                        
                        {onViewDetails && (
                          <DropdownMenuItem onClick={() => onViewDetails(product)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        
                        {onCalculate && (
                          <DropdownMenuItem onClick={() => onCalculate(product)}>
                            <Calculator className="mr-2 h-4 w-4" />
                            Calculate NAV
                          </DropdownMenuItem>
                        )}
                        
                        {onEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEdit(product)}>
                              Edit
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(product.id, product.fund_name)}
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

      {/* Results Summary */}
      {filteredProducts.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {products.length} ETF{products.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
