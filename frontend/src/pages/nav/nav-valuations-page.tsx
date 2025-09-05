/**
 * NAV Valuations Page
 * Page for managing saved NAV valuations with CRUD operations
 */

import React, { useState } from 'react'
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Filter, 
  Download, 
  Share, 
  Calendar,
  DollarSign,
  TrendingUp,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNavValuations } from '@/hooks/nav'
import { formatCurrency, formatDate, formatPercentage } from '@/utils/nav'

export default function NavValuationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'savedAt' | 'name' | 'navValue'>('savedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selectedValuation, setSelectedValuation] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)

  // Get valuations with pagination
  const {
    valuations,
    pagination,
    isLoading,
    isError,
    error,
    deleteValuation,
    isDeleting,
    deleteError,
    refetch
  } = useNavValuations({
    page,
    limit: 20,
    sortBy,
    sortOrder
  })

  // Filter valuations by search query
  const filteredValuations = React.useMemo(() => {
    if (!searchQuery.trim()) return valuations

    const lowercaseQuery = searchQuery.toLowerCase()
    return valuations.filter(valuation =>
      valuation.name.toLowerCase().includes(lowercaseQuery) ||
      valuation.description?.toLowerCase().includes(lowercaseQuery) ||
      valuation.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }, [valuations, searchQuery])

  const handleDeleteClick = (valuationId: string) => {
    setSelectedValuation(valuationId)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedValuation) return
    
    try {
      await deleteValuation(selectedValuation)
      setShowDeleteDialog(false)
      setSelectedValuation(null)
    } catch (error) {
      console.error('Failed to delete valuation:', error)
    }
  }

  const handleShare = (valuationId: string) => {
    setSelectedValuation(valuationId)
    setShowShareDialog(true)
  }

  const selectedValuationData = selectedValuation 
    ? valuations.find(v => v.id === selectedValuation)
    : null

  if (isLoading && page === 1) {
    return <ValuationsPageSkeleton />
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Valuations</CardTitle>
            <CardDescription className="text-red-600">
              {error?.message || 'Failed to load valuations. Please try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Saved Valuations</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view your saved NAV calculations
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Calculation
        </Button>
      </div>

      {/* Stats */}
      {pagination && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold">{pagination.total}</div>
              <p className="text-xs text-muted-foreground">Total Saved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold">
                {valuations.filter(v => v.isPublic).length}
              </div>
              <p className="text-xs text-muted-foreground">Public</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold">
                {formatCurrency(
                  valuations.reduce((sum, v) => sum + v.calculationResult.navValue, 0) / valuations.length || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Avg NAV</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold">
                {valuations.filter(v => 
                  new Date(v.savedAt).toDateString() === new Date().toDateString()
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search valuations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savedAt">Date Saved</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="navValue">NAV Value</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Valuations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Valuations ({filteredValuations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredValuations.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No valuations found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No valuations match your search criteria.' : 'You haven\'t saved any valuations yet.'}
              </p>
              {!searchQuery && (
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Valuation
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>NAV Value</TableHead>
                  <TableHead>Per Share</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredValuations.map((valuation) => (
                  <TableRow key={valuation.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{valuation.name}</div>
                        {valuation.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {valuation.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono">
                        {formatCurrency(valuation.calculationResult.navValue)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono">
                        {valuation.calculationResult.navPerShare 
                          ? formatCurrency(valuation.calculationResult.navPerShare)
                          : '-'
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(valuation.savedAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={valuation.calculationResult.status} />
                        {valuation.isPublic && (
                          <Badge variant="outline" className="text-xs">
                            Public
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {valuation.tags?.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {valuation.tags && valuation.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{valuation.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleShare(valuation.id)}
                        >
                          <Share className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteClick(valuation.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} results
          </p>
          <div className="space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Valuation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedValuationData?.name}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Valuation</DialogTitle>
            <DialogDescription>
              Share "{selectedValuationData?.name}" with others
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sharing functionality will be implemented in a future update.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowShareDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ValuationsPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded"></div>
        ))}
      </div>
      
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  )
}

interface StatusBadgeProps {
  status: string
}

function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
    running: { color: 'bg-blue-100 text-blue-800', label: 'Running' },
    queued: { color: 'bg-yellow-100 text-yellow-800', label: 'Queued' }
  }

  const variant = variants[status as keyof typeof variants] || variants.completed

  return (
    <Badge className={`${variant.color} text-xs`} variant="outline">
      {variant.label}
    </Badge>
  )
}
