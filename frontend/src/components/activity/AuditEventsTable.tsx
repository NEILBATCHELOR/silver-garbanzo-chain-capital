/**
 * Audit Events Table
 * Advanced data table for viewing and filtering audit events
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  Eye,
  AlertTriangle,
  Clock,
  User,
  Settings,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { backendAuditService, AuditEvent, AuditQueryOptions } from '@/services/audit/BackendAuditService';

interface AuditEventsTableProps {
  projectId?: string;
  dateRange?: DateRange;
  refreshInterval?: number;
  className?: string;
}

export function AuditEventsTable({ 
  projectId, 
  dateRange,
  refreshInterval = 30000,
  className = '' 
}: AuditEventsTableProps) {
  const [data, setData] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');

  const getSeverityVariant = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'success': return 'success';
      case 'failure': 
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const columns: ColumnDef<AuditEvent>[] = useMemo(() => [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          <Clock className="h-4 w-4 mr-2" />
          Time
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const timestamp = row.getValue('timestamp') as string;
        return (
          <div className="text-sm">
            <div>{format(new Date(timestamp), 'MMM dd, yyyy')}</div>
            <div className="text-muted-foreground">{format(new Date(timestamp), 'HH:mm:ss')}</div>
          </div>
        );
      },
      size: 130,
    },
    {
      accessorKey: 'action',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          Action
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const action = row.getValue('action') as string;
        const severity = row.original.severity;
        return (
          <div className="flex items-center space-x-2">
            <Badge variant={getSeverityVariant(severity)} className="text-xs">
              {action}
            </Badge>
          </div>
        );
      },
      size: 180,
    },
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          <User className="h-4 w-4 mr-2" />
          User
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const username = row.getValue('username') as string;
        const userEmail = row.original.user_email;
        const isAutomated = row.original.is_automated;
        
        if (isAutomated) {
          return (
            <Badge variant="secondary" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              System
            </Badge>
          );
        }
        
        return (
          <div className="text-sm">
            <div className="font-medium">{username || 'Unknown'}</div>
            {userEmail && (
              <div className="text-muted-foreground text-xs">{userEmail}</div>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'entity_type',
      header: 'Entity Type',
      cell: ({ row }) => {
        const entityType = row.getValue('entity_type') as string;
        const entityId = row.original.entity_id;
        
        if (!entityType) return <span className="text-muted-foreground">-</span>;
        
        return (
          <div className="text-sm">
            <div className="font-medium">{entityType}</div>
            {entityId && (
              <div className="text-muted-foreground text-xs">
                {entityId.length > 20 ? `${entityId.substring(0, 20)}...` : entityId}
              </div>
            )}
          </div>
        );
      },
      size: 130,
    },
    {
      accessorKey: 'details',
      header: 'Details',
      cell: ({ row }) => {
        const details = row.getValue('details') as string;
        const metadata = row.original.metadata;
        
        return (
          <div className="text-sm max-w-xs">
            <div className="truncate">{details || 'No details'}</div>
            {metadata?.source && (
              <Badge variant="outline" className="text-xs mt-1">
                {metadata.source}
              </Badge>
            )}
          </div>
        );
      },
      size: 200,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const severity = row.original.severity;
        
        return (
          <div className="flex flex-col space-y-1">
            <Badge variant={getStatusVariant(status)} className="text-xs w-fit">
              {status || 'Unknown'}
            </Badge>
            {severity && (
              <Badge variant={getSeverityVariant(severity)} className="text-xs w-fit">
                {severity}
              </Badge>
            )}
          </div>
        );
      },
      size: 100,
    },
    {
      accessorKey: 'duration',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          Duration
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const duration = row.getValue('duration') as number;
        if (!duration) return <span className="text-muted-foreground">-</span>;
        
        return (
          <span className={`text-sm ${duration > 5000 ? 'text-red-500 font-medium' : ''}`}>
            {duration}ms
          </span>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'actions',
      header: '',
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO: Open audit event details modal
              console.log('View audit event:', row.original);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        );
      },
      size: 50,
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pagination.pageSize),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: AuditQueryOptions['filters'] = {};
      
      if (projectId) filters.project_id = projectId;
      if (categoryFilter !== 'all') filters.category = categoryFilter;
      if (severityFilter !== 'all') filters.severity = severityFilter;
      if (sourceFilter !== 'all') filters.source = sourceFilter;
      if (entityTypeFilter !== 'all') filters.entity_type = entityTypeFilter;
      if (dateRange?.from) filters.date_from = dateRange.from.toISOString();
      if (dateRange?.to) filters.date_to = dateRange.to.toISOString();

      const options: AuditQueryOptions = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sort: sorting[0]?.id || 'timestamp',
        order: sorting[0]?.desc ? 'desc' : 'asc',
        filters,
      };

      const result = await backendAuditService.getAuditEvents(options);

      if (result.success) {
        setData(result.data.data || []);
        setTotal(result.data.total || 0);
      } else {
        throw new Error('Failed to load audit events');
      }
    } catch (err) {
      console.error('Error loading audit events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    categoryFilter,
    severityFilter,
    sourceFilter,
    entityTypeFilter,
    dateRange,
    projectId,
  ]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const resetFilters = () => {
    setGlobalFilter('');
    setCategoryFilter('all');
    setSeverityFilter('all');
    setSourceFilter('all');
    setEntityTypeFilter('all');
    setColumnFilters([]);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={loadData}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`audit-events-table ${className}`}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Audit Events</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {(total || 0).toLocaleString()} events found
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="user_action">User Action</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="frontend">Frontend</SelectItem>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="external">External</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Columns
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={resetFilters}>
            <Filter className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} style={{ width: header.column.columnDef.size }}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={columns.length} className="h-24">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading audit events...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No audit events found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 p-4">
          <div className="flex-1 text-sm text-muted-foreground">
            Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, total || 0)} of{' '}
            {(total || 0).toLocaleString()} entries
          </div>
          <div className="flex items-center space-x-2">
            <Select 
              value={pagination.pageSize.toString()}
              onValueChange={(value) => 
                setPagination(prev => ({ ...prev, pageSize: parseInt(value), pageIndex: 0 }))
              }
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </div>
            
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
