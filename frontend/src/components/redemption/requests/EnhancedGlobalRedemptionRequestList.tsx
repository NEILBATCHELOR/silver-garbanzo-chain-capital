// Enhanced Global Redemption Request Management with comprehensive filters and export
// Matches the UI design with Request ID/investor search, status, token type, date range, amount range filters
// Includes CSV/Excel export functionality, ignores bulk requests as specified

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
  Download,
  FileText,
  CalendarIcon,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useGlobalRedemptions } from '../hooks/useGlobalRedemptions';
import type { RedemptionRequest } from '../types';
import RedemptionApprovalConfigModal from '../components/RedemptionApprovalConfigModal';

interface FilterState {
  search: string;
  status: string;
  tokenType: string;
  dateRange: DateRange | undefined;
  amountMin: string;
  amountMax: string;
  investorId: string;
}

interface EnhancedGlobalRedemptionRequestListProps {
  onViewDetails?: (redemption: RedemptionRequest) => void;
  onCreateNew?: () => void;
  className?: string;
  pageSize?: number;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'settled':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-gray-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const getColorClass = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'settled':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <Badge variant="outline" className={getColorClass()}>
      <StatusIcon status={status} />
      <span className="ml-1 capitalize">{status}</span>
    </Badge>
  );
};

export function EnhancedGlobalRedemptionRequestList({
  onViewDetails,
  onCreateNew,
  className = '',
  pageSize = 20
}: EnhancedGlobalRedemptionRequestListProps) {
  // State for approval configuration modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'created_at' | 'token_amount' | 'usdc_amount'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Enhanced filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'All statuses',
    tokenType: 'All tokens',
    dateRange: undefined,
    amountMin: '',
    amountMax: '',
    investorId: ''
  });

  const {
    redemptions,
    loading,
    error,
    totalCount,
    hasMore,
    pagination,
    refresh,
    loadMore
  } = useGlobalRedemptions({
    page: currentPage,
    limit: pageSize,
    status: filters.status === 'All statuses' ? undefined : filters.status,
    tokenType: filters.tokenType === 'All tokens' ? undefined : filters.tokenType,
    excludeBulk: true, // Ignore bulk requests as specified
    enableRealtime: true
  });

  // Enhanced filtering logic
  const filteredRedemptions = useMemo(() => {
    return redemptions.filter(redemption => {
      // Skip bulk redemptions as specified
      if (redemption.isBulkRedemption) return false;

      // Search filter (Request ID or investor)
      if (filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase();
        const matchesId = redemption.id.toLowerCase().includes(searchTerm);
        const matchesInvestorName = redemption.investorName?.toLowerCase().includes(searchTerm) || false;
        const matchesInvestorId = redemption.investorId?.toLowerCase().includes(searchTerm) || false;
        
        if (!matchesId && !matchesInvestorName && !matchesInvestorId) return false;
      }

      // Status filter
      if (filters.status !== 'All statuses' && redemption.status !== filters.status.toLowerCase()) {
        return false;
      }

      // Token type filter  
      if (filters.tokenType !== 'All tokens' && redemption.tokenType !== filters.tokenType) {
        return false;
      }

      // Date range filter
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const requestDate = new Date(redemption.submittedAt || redemption.createdAt);
        
        if (filters.dateRange.from && requestDate < filters.dateRange.from) return false;
        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999); // Include full day
          if (requestDate > toDate) return false;
        }
      }

      // Amount range filter (USD)
      if (filters.amountMin || filters.amountMax) {
        const amount = redemption.usdcAmount || 0;
        const minAmount = filters.amountMin ? parseFloat(filters.amountMin) : 0;
        const maxAmount = filters.amountMax ? parseFloat(filters.amountMax) : Infinity;
        
        if (amount < minAmount || amount > maxAmount) return false;
      }

      // Investor ID filter
      if (filters.investorId.trim() && 
          !redemption.investorId?.toLowerCase().includes(filters.investorId.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [redemptions, filters]);

  // Sort redemptions
  const sortedRedemptions = useMemo(() => {
    return [...filteredRedemptions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.submittedAt || a.createdAt).getTime();
          bValue = new Date(b.submittedAt || b.createdAt).getTime();
          break;
        case 'token_amount':
          aValue = a.tokenAmount || 0;
          bValue = b.tokenAmount || 0;
          break;
        case 'usdc_amount':
          aValue = a.usdcAmount || 0;
          bValue = b.usdcAmount || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
  }, [filteredRedemptions, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'All statuses',
      tokenType: 'All tokens',
      dateRange: undefined,
      amountMin: '',
      amountMax: '',
      investorId: ''
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = filters.search || filters.status !== 'All statuses' || 
    filters.tokenType !== 'All tokens' || filters.dateRange || 
    filters.amountMin || filters.amountMax || filters.investorId;

  // Export functionality
  const exportToCSV = () => {
    const headers = [
      'Request ID',
      'Investor Name', 
      'Investor ID',
      'Token Type',
      'Token Amount',
      'USDC Amount (USD)',
      'Status',
      'Submission Date',
      'Source Wallet',
      'Destination Wallet'
    ];

    const csvData = sortedRedemptions.map(redemption => [
      redemption.id,
      redemption.investorName || 'N/A',
      redemption.investorId || 'N/A',
      redemption.tokenType,
      redemption.tokenAmount?.toString() || '0',
      redemption.usdcAmount?.toString() || '0',
      redemption.status,
      format(new Date(redemption.submittedAt || redemption.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      redemption.sourceWallet || 'N/A',
      redemption.destinationWallet || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `redemption-requests-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDetails = (redemption: RedemptionRequest) => {
    if (onViewDetails) {
      onViewDetails(redemption);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatTokenAmount = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  };

  return (
    <>
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                Request Management
                <Badge variant="outline">{sortedRedemptions.length} of {totalCount}</Badge>
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm" disabled={sortedRedemptions.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => setIsConfigModalOpen(true)} variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Enhanced Filters */}
          <div className="space-y-4 mt-4">
            {/* Filters Header */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium">Filters</Label>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2">
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-xs text-gray-600">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Request ID, investor"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All statuses">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Token Type */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Token Type</Label>
                <Select value={filters.tokenType} onValueChange={(value) => handleFilterChange('tokenType', value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All tokens">All tokens</SelectItem>
                    <SelectItem value="ERC-20">ERC-20</SelectItem>
                    <SelectItem value="ERC-721">ERC-721</SelectItem>
                    <SelectItem value="ERC-1155">ERC-1155</SelectItem>
                    <SelectItem value="ERC-1400">ERC-1400</SelectItem>
                    <SelectItem value="ERC-3525">ERC-3525</SelectItem>
                    <SelectItem value="ERC-4626">ERC-4626</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, 'MMM dd')} - {format(filters.dateRange.to, 'MMM dd')}
                          </>
                        ) : (
                          format(filters.dateRange.from, 'MMM dd, yyyy')
                        )
                      ) : (
                        'Select date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filters.dateRange?.from}
                      selected={filters.dateRange}
                      onSelect={(range) => handleFilterChange('dateRange', range)}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount Range */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Amount Range (USD)</Label>
                <div className="flex gap-1">
                  <Input
                    placeholder="Min"
                    type="number"
                    value={filters.amountMin}
                    onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                    className="h-10"
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={filters.amountMax}
                    onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Investor ID */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Investor ID</Label>
                <Input
                  placeholder="Enter investor ID"
                  value={filters.investorId}
                  onChange={(e) => handleFilterChange('investorId', e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">Error loading redemption requests: {error}</p>
              <Button onClick={refresh} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {!error && sortedRedemptions.length === 0 && !loading && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No redemption requests found</p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" className="mt-4">
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {(sortedRedemptions.length > 0 || loading) && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('token_amount')}>
                        Token Amount
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('usdc_amount')}>
                        USDC Value
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Token Type</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('created_at')}>
                        Date
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && sortedRedemptions.length === 0 ? (
                    // Loading skeleton
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    sortedRedemptions.map((redemption) => (
                      <TableRow key={redemption.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          {redemption.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">
                              {redemption.investorName || 'Anonymous'}
                            </div>
                            {redemption.investorId && (
                              <div className="text-xs text-gray-500 font-mono">
                                {redemption.investorId.substring(0, 12)}...
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-right">
                            <div className="font-medium text-sm">
                              {formatTokenAmount(redemption.tokenAmount || 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {redemption.tokenType}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-right">
                          {formatCurrency(redemption.usdcAmount || 0)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={redemption.status} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {redemption.tokenType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(redemption.submittedAt || redemption.createdAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(redemption)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, sortedRedemptions.length)} of {sortedRedemptions.length} filtered requests
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={pagination.page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Redemption Approval Configuration Modal */}
      <RedemptionApprovalConfigModal
        open={isConfigModalOpen}
        onOpenChange={setIsConfigModalOpen}
        onSuccess={refresh}
      />
    </>
  );
}