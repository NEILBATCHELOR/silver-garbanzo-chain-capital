/**
 * NAV Valuation Table
 * Displays saved NAV valuations with management actions
 */

import { useState } from 'react'
import { formatDistance } from 'date-fns'
import { 
  Eye, 
  Edit, 
  Trash2, 
  Copy, 
  Download, 
  Star,
  StarOff,
  Search,
  Filter,
  MoreVertical
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  NavValuation,
  AssetType,
  assetTypeLabels
} from '@/types/nav'

interface NavValuationTableProps {
  data: NavValuation[]
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
  onView?: (valuation: NavValuation) => void
  onEdit?: (valuation: NavValuation) => void
  onDelete?: (valuation: NavValuation) => void
  onCopy?: (valuation: NavValuation) => void
  onExport?: (valuations: NavValuation[]) => void
  onToggleFavorite?: (valuation: NavValuation) => void
  className?: string
}

// Table skeleton
function ValuationTableSkeleton() {
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
              {Array.from({ length: 8 }, (_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }, (_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }, (_, j) => (
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

// Valuation details dialog
function ValuationDetailsDialog({ 
  valuation, 
  open, 
  onOpenChange 
}: { 
  valuation: NavValuation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!valuation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {valuation.name}
            {valuation.tags?.includes('favorite') && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}
            {valuation.isPublic && (
              <Badge variant="secondary">Public</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Saved on {new Date(valuation.savedAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Description */}
          {valuation.description && (
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground">{valuation.description}</p>
            </div>
          )}

          {/* NAV Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">NAV Calculation Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">NAV Value</label>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: valuation.calculationResult.currency
                    }).format(valuation.calculationResult.navValue)}
                  </p>
                </div>
                
                {valuation.calculationResult.navPerShare && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">NAV Per Share</label>
                    <p className="text-lg font-semibold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: valuation.calculationResult.currency
                      }).format(valuation.calculationResult.navPerShare)}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Net Assets</label>
                  <p className="text-lg">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: valuation.calculationResult.currency
                    }).format(valuation.calculationResult.netAssets)}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Assets</label>
                  <p>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: valuation.calculationResult.currency
                    }).format(valuation.calculationResult.totalAssets)}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Liabilities</label>
                  <p>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: valuation.calculationResult.currency
                    }).format(valuation.calculationResult.totalLiabilities)}
                  </p>
                </div>

                {valuation.calculationResult.sharesOutstanding && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Shares Outstanding</label>
                    <p>{valuation.calculationResult.sharesOutstanding.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {valuation.tags && valuation.tags.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {valuation.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Saved by: {valuation.savedBy}</p>
            <p>Run ID: {valuation.calculationResult.runId}</p>
            <p>Valuation Date: {new Date(valuation.calculationResult.valuationDate).toLocaleDateString()}</p>
            <p>Calculated: {new Date(valuation.calculationResult.calculatedAt).toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function NavValuationTable({
  data,
  isLoading = false,
  pagination,
  onPageChange,
  onLimitChange,
  onView,
  onEdit,
  onDelete,
  onCopy,
  onExport,
  onToggleFavorite,
  className = ''
}: NavValuationTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState<string>('')
  const [selectedValuations, setSelectedValuations] = useState<Set<string>>(new Set())
  const [selectedValuation, setSelectedValuation] = useState<NavValuation | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Handle row selection
  const handleSelectRow = (valuationId: string, checked: boolean) => {
    const newSelection = new Set(selectedValuations)
    if (checked) {
      newSelection.add(valuationId)
    } else {
      newSelection.delete(valuationId)
    }
    setSelectedValuations(newSelection)
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedValuations(new Set(data.map(v => v.id)))
    } else {
      setSelectedValuations(new Set())
    }
  }

  // Handle view details
  const handleViewDetails = (valuation: NavValuation) => {
    setSelectedValuation(valuation)
    setDetailsOpen(true)
    onView?.(valuation)
  }

  // Handle bulk export
  const handleBulkExport = () => {
    const selectedData = data.filter(v => selectedValuations.has(v.id))
    onExport?.(selectedData)
  }

  // Filter data based on search and visibility
  const filteredData = data.filter(valuation => {
    const matchesSearch = !searchQuery || 
      valuation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      valuation.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      valuation.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesVisibility = !visibilityFilter ||
      (visibilityFilter === 'public' && valuation.isPublic) ||
      (visibilityFilter === 'private' && !valuation.isPublic)
    
    return matchesSearch && matchesVisibility
  })

  if (isLoading) {
    return <ValuationTableSkeleton />
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search valuations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All visibility</SelectItem>
              <SelectItem value="public">Public only</SelectItem>
              <SelectItem value="private">Private only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {selectedValuations.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleBulkExport}>
              <Download className="h-4 w-4 mr-2" />
              Export ({selectedValuations.size})
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
                  checked={data.length > 0 && selectedValuations.size === data.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>NAV Value</TableHead>
              <TableHead>Asset Type</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Saved</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchQuery || visibilityFilter 
                    ? "No valuations match your filters." 
                    : "No saved valuations found. Create a calculation to save your first valuation."
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((valuation) => (
                <TableRow 
                  key={valuation.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleViewDetails(valuation)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedValuations.has(valuation.id)}
                      onCheckedChange={(checked) => handleSelectRow(valuation.id, checked as boolean)}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{valuation.name}</p>
                        {valuation.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {valuation.description}
                          </p>
                        )}
                      </div>
                      {valuation.tags?.includes('favorite') && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: valuation.calculationResult.currency,
                        notation: 'compact'
                      }).format(valuation.calculationResult.navValue)}
                    </div>
                    {valuation.calculationResult.navPerShare && (
                      <div className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: valuation.calculationResult.currency
                        }).format(valuation.calculationResult.navPerShare)} per share
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {valuation.calculationResult.productType && (
                      <Badge variant="outline">
                        {assetTypeLabels[valuation.calculationResult.productType as AssetType] || 
                         valuation.calculationResult.productType}
                      </Badge>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={valuation.isPublic ? "default" : "secondary"}>
                      {valuation.isPublic ? "Public" : "Private"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(valuation.savedAt).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistance(new Date(valuation.savedAt), new Date(), { addSuffix: true })}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {valuation.tags && valuation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {valuation.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {valuation.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{valuation.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(valuation)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(valuation)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCopy?.(valuation)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onToggleFavorite?.(valuation)}>
                          {valuation.tags?.includes('favorite') ? (
                            <><StarOff className="h-4 w-4 mr-2" /> Remove Favorite</>
                          ) : (
                            <><Star className="h-4 w-4 mr-2" /> Add to Favorites</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Valuation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{valuation.name}"? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => onDelete?.(valuation)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && filteredData.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} valuations
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
      <ValuationDetailsDialog
        valuation={selectedValuation}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  )
}

export default NavValuationTable
