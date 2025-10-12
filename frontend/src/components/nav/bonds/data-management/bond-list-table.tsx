import React, { useState, useMemo } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import {
  Eye,
  Edit,
  Trash2,
  Calculator,
  MoreVertical,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

// Helper function to safely format dates
const formatSafeDate = (dateValue: string | Date | null | undefined, formatString: string = 'MMM dd, yyyy'): string => {
  if (!dateValue) return 'N/A'
  
  try {
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue
    if (!isValid(date)) return 'Invalid Date'
    return format(date, formatString)
  } catch (error) {
    console.error('Date formatting error:', error, 'Value:', dateValue)
    return 'Invalid Date'
  }
}
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBonds, useDeleteBond } from '@/hooks/bonds/useBondData'
import type { BondProduct, AccountingClassification } from '@/types/nav/bonds'

interface BondListTableProps {
  projectId: string
  onSelect?: (bondId: string) => void
  onEdit?: (bondId: string) => void
  onCalculate?: (bondId: string) => void
}

type SortField = 'asset_name' | 'issuer_name' | 'face_value' | 'coupon_rate' | 'maturity_date'
type SortDirection = 'asc' | 'desc'

export function BondListTable({
  projectId,
  onSelect,
  onEdit,
  onCalculate,
}: BondListTableProps) {
  const { data: bondsResponse, isLoading } = useBonds(projectId)
  const deleteBondMutation = useDeleteBond()

  const [selectedBonds, setSelectedBonds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('asset_name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [filterClassification, setFilterClassification] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const bonds = bondsResponse?.data || []

  const filteredAndSortedBonds = useMemo(() => {
    let result = [...bonds]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (bond) =>
          bond.asset_name?.toLowerCase().includes(query) ||
          bond.issuer_name?.toLowerCase().includes(query) ||
          bond.isin?.toLowerCase().includes(query) ||
          bond.cusip?.toLowerCase().includes(query)
      )
    }

    // Classification filter
    if (filterClassification !== 'all') {
      result = result.filter((bond) => bond.accounting_treatment === filterClassification)
    }

    // Sort
    result.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'maturity_date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return result
  }, [bonds, searchQuery, sortField, sortDirection, filterClassification])

  const paginatedBonds = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedBonds.slice(startIndex, endIndex)
  }, [filteredAndSortedBonds, currentPage])

  const totalPages = Math.ceil(filteredAndSortedBonds.length / itemsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBonds(new Set(paginatedBonds.map((b) => b.id)))
    } else {
      setSelectedBonds(new Set())
    }
  }

  const handleSelectBond = (bondId: string, checked: boolean) => {
    const newSelected = new Set(selectedBonds)
    if (checked) {
      newSelected.add(bondId)
    } else {
      newSelected.delete(bondId)
    }
    setSelectedBonds(newSelected)
  }

  const handleDelete = async (bondId: string) => {
    if (confirm('Are you sure you want to delete this bond?')) {
      await deleteBondMutation.mutateAsync(bondId)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedBonds.size === 0) return
    if (confirm(`Delete ${selectedBonds.size} selected bonds?`)) {
      for (const bondId of selectedBonds) {
        await deleteBondMutation.mutateAsync(bondId)
      }
      setSelectedBonds(new Set())
    }
  }

  const handleExportCSV = () => {
    const headers = [
      'Name',
      'Issuer',
      'ISIN',
      'CUSIP',
      'Par Value',
      'Coupon Rate',
      'Maturity',
      'Classification',
    ]
    const rows = filteredAndSortedBonds.map((bond) => [
      bond.asset_name,
      bond.issuer_name,
      bond.isin || '',
      bond.cusip || '',
      bond.face_value || bond.par_value || 0,
      bond.coupon_rate,
      bond.maturity_date,
      bond.accounting_treatment,
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bonds-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    )
  }

  if (isLoading) {
    return <div>Loading bonds...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Bonds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, issuer, ISIN, or CUSIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterClassification} onValueChange={setFilterClassification}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                <SelectItem value="held_to_maturity">Held to Maturity</SelectItem>
                <SelectItem value="available_for_sale">Available for Sale</SelectItem>
                <SelectItem value="trading">Trading</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {selectedBonds.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
              <span className="text-sm">
                {selectedBonds.size} bond{selectedBonds.size > 1 ? 's' : ''} selected
              </span>
              <Button onClick={handleBatchDelete} variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedBonds.size === paginatedBonds.length && paginatedBonds.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent"
                    onClick={() => handleSort('asset_name')}
                  >
                    Bond Name
                    <SortIcon field="asset_name" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent"
                    onClick={() => handleSort('issuer_name')}
                  >
                    Issuer
                    <SortIcon field="issuer_name" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent"
                    onClick={() => handleSort('face_value')}
                  >
                    Face Value
                    <SortIcon field="face_value" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent"
                    onClick={() => handleSort('coupon_rate')}
                  >
                    Coupon
                    <SortIcon field="coupon_rate" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent"
                    onClick={() => handleSort('maturity_date')}
                  >
                    Maturity
                    <SortIcon field="maturity_date" />
                  </Button>
                </TableHead>
                <TableHead>Classification</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBonds.map((bond) => (
                <TableRow key={bond.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedBonds.has(bond.id)}
                      onCheckedChange={(checked) =>
                        handleSelectBond(bond.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal"
                      onClick={() => onSelect?.(bond.id)}
                    >
                      {bond.asset_name || bond.isin || bond.cusip}
                    </Button>
                    {bond.isin && (
                      <div className="text-xs text-muted-foreground">{bond.isin}</div>
                    )}
                  </TableCell>
                  <TableCell>{bond.issuer_name}</TableCell>
                  <TableCell>
                    {bond.currency} {((bond.face_value || bond.par_value) || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>{(bond.coupon_rate * 100).toFixed(2)}%</TableCell>
                  <TableCell>{formatSafeDate(bond.maturity_date)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        bond.accounting_treatment === 'held_to_maturity'
                          ? 'default'
                          : bond.accounting_treatment === 'available_for_sale'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {bond.accounting_treatment === 'held_to_maturity' && 'HTM'}
                      {bond.accounting_treatment === 'available_for_sale' && 'AFS'}
                      {bond.accounting_treatment === 'trading' && 'Trading'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelect?.(bond.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(bond.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCalculate?.(bond.id)}>
                          <Calculator className="mr-2 h-4 w-4" />
                          Calculate NAV
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(bond.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSortedBonds.length)} of{' '}
            {filteredAndSortedBonds.length} bonds
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1 + Math.max(0, currentPage - 3)
                if (page > totalPages) return null
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}


// Default export for lazy loading
export default BondListTable
