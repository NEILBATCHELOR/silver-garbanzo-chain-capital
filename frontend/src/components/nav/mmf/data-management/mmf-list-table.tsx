/**
 * MMF List Table
 * Display and manage list of Money Market Funds
 * With filtering, sorting, and actions
 */

import { useState } from 'react'
import { 
  Eye, 
  Calculator, 
  Trash2, 
  MoreHorizontal,
  Filter,
  AlertCircle
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

import { useMMFs, useDeleteMMF } from '@/hooks/mmf'
import { MMFFundType, type MMFProduct } from '@/types/nav/mmf'

interface MMFListTableProps {
  projectId: string
  onViewDetails?: (mmf: MMFProduct) => void
  onCalculate?: (mmf: MMFProduct) => void
}

export function MMFListTable({ projectId, onViewDetails, onCalculate }: MMFListTableProps) {
  const [fundTypeFilter, setFundTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: mmfsData, isLoading } = useMMFs(projectId)
  const deleteMutation = useDeleteMMF()

  const mmfs = mmfsData?.data || []

  // Apply filters
  const filteredMMFs = mmfs.filter(mmf => {
    const matchesFundType = fundTypeFilter === 'all' || mmf.fund_type === fundTypeFilter
    const matchesStatus = statusFilter === 'all' || mmf.status === statusFilter
    const matchesSearch = searchTerm === '' || 
      mmf.fund_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mmf.fund_ticker?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFundType && matchesStatus && matchesSearch
  })

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this MMF? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(id)
    }
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
            <SelectValue placeholder="Fund Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value={MMFFundType.GOVERNMENT}>Government</SelectItem>
            <SelectItem value={MMFFundType.PRIME}>Prime</SelectItem>
            <SelectItem value={MMFFundType.RETAIL}>Retail</SelectItem>
            <SelectItem value={MMFFundType.INSTITUTIONAL}>Institutional</SelectItem>
            <SelectItem value={MMFFundType.MUNICIPAL}>Municipal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
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
              <TableHead className="text-right">AUM</TableHead>
              <TableHead className="text-right">Expense Ratio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading MMFs...
                </TableCell>
              </TableRow>
            ) : filteredMMFs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {mmfs.length === 0 
                    ? 'No MMFs found. Create your first Money Market Fund to get started.'
                    : 'No MMFs match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredMMFs.map((mmf) => (
                <TableRow key={mmf.id}>
                  <TableCell className="font-medium">{mmf.fund_name}</TableCell>
                  <TableCell>
                    {mmf.fund_ticker ? (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {mmf.fund_ticker}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {mmf.fund_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {mmf.net_asset_value !== null 
                      ? `$${mmf.net_asset_value.toFixed(4)}` 
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    {mmf.assets_under_management !== null
                      ? `$${(mmf.assets_under_management / 1_000_000).toFixed(2)}M`
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    {mmf.expense_ratio !== null 
                      ? `${mmf.expense_ratio.toFixed(2)}%` 
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={mmf.status === 'active' ? 'default' : 'secondary'}
                    >
                      {mmf.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewDetails?.(mmf)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCalculate?.(mmf)}>
                          <Calculator className="mr-2 h-4 w-4" />
                          Calculate NAV
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(mmf.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
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
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {filteredMMFs.length} of {mmfs.length} MMFs
        </div>
        <div>
          Total AUM: $
          {(filteredMMFs.reduce((sum, mmf) => {
            const aum = mmf.assets_under_management ?? 0
            return sum + aum
          }, 0) / 1_000_000).toFixed(2)}
          M
        </div>
      </div>
    </div>
  )
}
