/**
 * NAV Audit Table
 * Displays NAV-related audit events and activity logs
 */

import { useState } from 'react'
import { formatDistance } from 'date-fns'
import { 
  Shield, 
  User, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Info,
  Search,
  Filter,
  Download,
  Eye,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NavAuditEvent } from '@/types/nav'

interface NavAuditTableProps {
  data: NavAuditEvent[]
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
  onRefresh?: () => void
  onExport?: () => void
  onViewDetails?: (event: NavAuditEvent) => void
  className?: string
}

// Action type mappings
const actionTypeMap = {
  'calculation_created': { 
    label: 'Calculation Created', 
    icon: Activity, 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
  },
  'calculation_completed': { 
    label: 'Calculation Completed', 
    icon: CheckCircle, 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
  },
  'calculation_failed': { 
    label: 'Calculation Failed', 
    icon: XCircle, 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
  },
  'valuation_saved': { 
    label: 'Valuation Saved', 
    icon: CheckCircle, 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
  },
  'valuation_updated': { 
    label: 'Valuation Updated', 
    icon: Activity, 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' 
  },
  'valuation_deleted': { 
    label: 'Valuation Deleted', 
    icon: XCircle, 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
  },
  'approval_granted': { 
    label: 'Approval Granted', 
    icon: CheckCircle, 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
  },
  'approval_denied': { 
    label: 'Approval Denied', 
    icon: XCircle, 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
  },
  'data_export': { 
    label: 'Data Export', 
    icon: Download, 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
  },
  'user_login': { 
    label: 'User Login', 
    icon: User, 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' 
  },
  'permission_change': { 
    label: 'Permission Change', 
    icon: Shield, 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' 
  },
  'system_alert': { 
    label: 'System Alert', 
    icon: AlertTriangle, 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' 
  }
}

// Entity type mappings
const entityTypeMap = {
  'calculation': { label: 'Calculation', icon: Activity },
  'valuation': { label: 'Valuation', icon: CheckCircle },
  'approval': { label: 'Approval', icon: Shield },
  'user': { label: 'User', icon: User },
  'system': { label: 'System', icon: AlertTriangle }
}

// Table skeleton
function AuditTableSkeleton() {
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
              {Array.from({ length: 6 }, (_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 15 }, (_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }, (_, j) => (
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

// Audit event details dialog
function AuditEventDetailsDialog({ 
  event, 
  open, 
  onOpenChange 
}: { 
  event: NavAuditEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!event) return null

  const actionInfo = actionTypeMap[event.action as keyof typeof actionTypeMap] || {
    label: event.action,
    icon: Info,
    color: 'bg-gray-100 text-gray-800'
  }

  const entityInfo = entityTypeMap[event.entityType as keyof typeof entityTypeMap] || {
    label: event.entityType,
    icon: Info
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <actionInfo.icon className="h-5 w-5" />
            {actionInfo.label}
          </DialogTitle>
          <DialogDescription>
            Event ID: {event.id} • {new Date(event.timestamp).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Action:</span>
                  <p className="flex items-center gap-2">
                    <actionInfo.icon className="h-4 w-4" />
                    {actionInfo.label}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity Type:</span>
                  <p className="flex items-center gap-2">
                    <entityInfo.icon className="h-4 w-4" />
                    {entityInfo.label}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity ID:</span>
                  <p className="font-mono text-xs">{event.entityId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">User:</span>
                  <p>{event.username || 'System'} ({event.userId})</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <p>{new Date(event.timestamp).toLocaleString()}</p>
                </div>
                {event.ipAddress && (
                  <div>
                    <span className="text-muted-foreground">IP Address:</span>
                    <p className="font-mono text-xs">{event.ipAddress}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          {event.details && Object.keys(event.details).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Event Details</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-64">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* User Agent */}
          {event.userAgent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {event.userAgent}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function NavAuditTable({
  data,
  isLoading = false,
  pagination,
  onPageChange,
  onLimitChange,
  onRefresh,
  onExport,
  onViewDetails,
  className = ''
}: NavAuditTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('')
  const [userFilter, setUserFilter] = useState<string>('')
  const [selectedEvent, setSelectedEvent] = useState<NavAuditEvent | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Handle view details
  const handleViewDetails = (event: NavAuditEvent) => {
    setSelectedEvent(event)
    setDetailsOpen(true)
    onViewDetails?.(event)
  }

  // Filter data based on search and filters
  const filteredData = data.filter(event => {
    const matchesSearch = !searchQuery || 
      event.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(event.details || {}).toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesAction = !actionFilter || event.action === actionFilter
    const matchesEntityType = !entityTypeFilter || event.entityType === entityTypeFilter
    const matchesUser = !userFilter || event.userId === userFilter
    
    return matchesSearch && matchesAction && matchesEntityType && matchesUser
  })

  // Get unique values for filters
  const uniqueActions = [...new Set(data.map(event => event.action))]
  const uniqueEntityTypes = [...new Set(data.map(event => event.entityType))]
  const uniqueUsers = [...new Set(data.map(event => event.userId).filter(Boolean))]

  if (isLoading) {
    return <AuditTableSkeleton />
  }

  return (
    <TooltipProvider>
      <div className={`space-y-4 ${className}`}>
        {/* Filters and Actions */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {actionTypeMap[action as keyof typeof actionTypeMap]?.label || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All entities</SelectItem>
                {uniqueEntityTypes.map(entityType => (
                  <SelectItem key={entityType} value={entityType}>
                    {entityTypeMap[entityType as keyof typeof entityTypeMap]?.label || entityType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All users</SelectItem>
                {uniqueUsers.map(userId => (
                  <SelectItem key={userId} value={userId}>
                    {data.find(e => e.userId === userId)?.username || userId}
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
                <TableHead className="w-32">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="w-20">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery || actionFilter || entityTypeFilter || userFilter
                      ? "No audit events match your filters."
                      : "No audit events found."
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((event) => {
                  const actionInfo = actionTypeMap[event.action as keyof typeof actionTypeMap] || {
                    label: event.action,
                    icon: Info,
                    color: 'bg-gray-100 text-gray-800'
                  }

                  const entityInfo = entityTypeMap[event.entityType as keyof typeof entityTypeMap] || {
                    label: event.entityType,
                    icon: Info
                  }

                  return (
                    <TableRow 
                      key={event.id} 
                      className="hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(event.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistance(new Date(event.timestamp), new Date(), { addSuffix: true })}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <actionInfo.icon className="h-4 w-4" />
                          <Badge className={actionInfo.color}>
                            {actionInfo.label}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <entityInfo.icon className="h-4 w-4" />
                            <span className="text-sm">{entityInfo.label}</span>
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {event.entityId.slice(0, 12)}...
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">
                            {event.username || 'System'}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {event.userId}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {event.ipAddress ? (
                          <code className="text-xs">{event.ipAddress}</code>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(event)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View details</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })
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
              {pagination.total} events
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
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
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
        <AuditEventDetailsDialog
          event={selectedEvent}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      </div>
    </TooltipProvider>
  )
}

export default NavAuditTable
