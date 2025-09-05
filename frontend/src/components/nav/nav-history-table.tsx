/**
 * NAV History Table
 * Displays NAV calculation history with pagination, sorting, and filtering
 */

import { useState } from 'react'
import { formatDistance } from 'date-fns'
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  Download, 
  Eye,
  Calendar,
  Search,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CalculationResult, 
  CalculationStatus,
  AssetType,
  calculationStatusLabels,
  calculationStatusColors,
  assetTypeLabels 
} from '@/types/nav'

interface NavHistoryTableProps {
  data: CalculationResult[]
  isLoading?: boolean
  pagination?: {
    total: number
    page: number
    limit: number
    hasMore: boolean
    totalPages: number
  }
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  onFilterChange?: (filters: any) => void
  onRefresh?: () => void
  onExport?: () => void
  onViewDetails?: (runId: string) => void
}

// Table skeleton loader
function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 7 }, (_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }, (_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }, (_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// Calculation details dialog
function CalculationDetailsDialog({ 
  calculation, 
  open, 
  onOpenChange 
}: { 
  calculation: CalculationResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!calculation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calculation Details</DialogTitle>
          <DialogDescription>
            NAV calculation run {calculation.runId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Run ID:</span>
                  <p className="font-mono">{calculation.runId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>
                    <Badge className={calculationStatusColors[calculation.status]}>
                      {calculationStatusLabels[calculation.status]}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valuation Date:</span>
                  <p>{new Date(calculation.valuationDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Calculated At:</span>
                  <p>{new Date(calculation.calculatedAt).toLocaleString()}</p>
                </div>
                {calculation.assetId && (
                  <div>
                    <span className="text-muted-foreground">Asset ID:</span>
                    <p className="font-mono">{calculation.assetId}</p>
                  </div>
                )}
                {calculation.projectId && (
                  <div>
                    <span className="text-muted-foreground">Project ID:</span>
                    <p className="font-mono">{calculation.projectId}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* NAV Values */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">NAV Values</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">NAV Value:</span>
                  <p className="font-bold text-lg">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: calculation.currency
                    }).format(calculation.navValue)}
                  </p>
                </div>
                {calculation.navPerShare && (
                  <div>
                    <span className="text-muted-foreground">NAV Per Share:</span>
                    <p className="font-semibold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: calculation.currency
                      }).format(calculation.navPerShare)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Total Assets:</span>
                  <p>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: calculation.currency
                    }).format(calculation.totalAssets)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Liabilities:</span>
                  <p>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: calculation.currency
                    }).format(calculation.totalLiabilities)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Assets:</span>
                  <p>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: calculation.currency
                    }).format(calculation.netAssets)}
                  </p>
                </div>
                {calculation.sharesOutstanding && (
                  <div>
                    <span className="text-muted-foreground">Shares Outstanding:</span>
                    <p>{calculation.sharesOutstanding.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {calculation.errorMessage && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-sm text-destructive">Error Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-mono text-destructive">{calculation.errorMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          {calculation.metadata && Object.keys(calculation.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Additional Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(calculation.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function NavHistoryTable({
  data,
  isLoading = false,
  pagination,
  onPageChange,
  onLimitChange,
  onSortChange,
  onFilterChange,
  onRefresh,
  onExport,
  onViewDetails
}: NavHistoryTableProps) {
  const [sortBy, setSortBy] = useState<string>('calculatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCalculation, setSelectedCalculation] = useState<CalculationResult | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleSort = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortBy(column)
    setSortOrder(newSortOrder)
    onSortChange?.(column, newSortOrder)
  }

  const handleFilterChange = (key: string, value: string) => {
    const filters = {
      status: statusFilter,
      productType: assetTypeFilter,
      search: searchQuery,
      [key]: value
    }
    
    if (key === 'status') setStatusFilter(value)
    if (key === 'productType') setAssetTypeFilter(value)
    if (key === 'search') setSearchQuery(value)
    
    onFilterChange?.(filters)
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const handleViewDetails = (calculation: CalculationResult) => {
    setSelectedCalculation(calculation)
    setDetailsOpen(true)
    onViewDetails?.(calculation.runId)
  }

  if (isLoading) {
    return <TableSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search calculations..."
              value={searchQuery}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {Object.values(CalculationStatus).map(status => (
                <SelectItem key={status} value={status}>
                  {calculationStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assetTypeFilter} onValueChange={(value) => handleFilterChange('productType', value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All asset types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All asset types</SelectItem>
              {Object.values(AssetType).map(assetType => (
                <SelectItem key={assetType} value={assetType}>
                  {assetTypeLabels[assetType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">
                <Button variant="ghost" size="sm" onClick={() => handleSort('calculatedAt')}>
                  Date {getSortIcon('calculatedAt')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('productType')}>
                  Asset Type {getSortIcon('productType')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('navValue')}>
                  NAV Value {getSortIcon('navValue')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('navPerShare')}>
                  NAV/Share {getSortIcon('navPerShare')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('status')}>
                  Status {getSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead>Run ID</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No calculations found. Try adjusting your filters or create a new calculation.
                </TableCell>
              </TableRow>
            ) : (
              data.map((calculation) => (
                <TableRow key={calculation.runId} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(calculation.calculatedAt).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistance(new Date(calculation.calculatedAt), new Date(), { addSuffix: true })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {calculation.productType && (
                      <Badge variant="outline">
                        {assetTypeLabels[calculation.productType as AssetType] || calculation.productType}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: calculation.currency,
                        notation: 'compact'
                      }).format(calculation.navValue)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {calculation.navPerShare ? (
                      <div>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: calculation.currency
                        }).format(calculation.navPerShare)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={calculationStatusColors[calculation.status]}>
                      {calculationStatusLabels[calculation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">{calculation.runId.slice(0, 8)}...</code>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(calculation)}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={pagination.limit.toString()}
              onValueChange={(value) => onLimitChange?.(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    const pageNum = Math.max(1, pagination.page - 2) + i
                    if (pageNum > pagination.totalPages) return null
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange?.(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  }
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={!pagination.hasMore}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <CalculationDetailsDialog
        calculation={selectedCalculation}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  )
}

export default NavHistoryTable
