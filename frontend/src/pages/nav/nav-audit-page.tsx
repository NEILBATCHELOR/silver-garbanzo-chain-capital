/**
 * NAV Audit Page
 * Audit trail page for NAV operations and system events
 */

import React, { useState } from 'react'
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Activity, 
  Shield, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNavAudit, useNavAuditRealtime } from '@/hooks/nav'
import { formatDate, formatDateTime } from '@/utils/nav'

export default function NavAuditPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [page, setPage] = useState(1)
  const [isRealTime, setIsRealTime] = useState(false)

  // Main audit hook with filters
  const auditHook = isRealTime ? useNavAuditRealtime : useNavAudit
  const {
    events,
    pagination,
    isLoading,
    isError,
    error,
    stats,
    refetch
  } = auditHook({
    page,
    limit: 50,
    action: selectedAction !== 'all' ? selectedAction : undefined,
    entityType: selectedEntity !== 'all' ? selectedEntity as any : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  })

  // Filter events by search query
  const filteredEvents = React.useMemo(() => {
    if (!searchQuery.trim()) return events

    const lowercaseQuery = searchQuery.toLowerCase()
    return events.filter(event =>
      event.action.toLowerCase().includes(lowercaseQuery) ||
      event.username?.toLowerCase().includes(lowercaseQuery) ||
      event.entityId.toLowerCase().includes(lowercaseQuery) ||
      event.ipAddress?.toLowerCase().includes(lowercaseQuery)
    )
  }, [events, searchQuery])

  // Get unique actions for filter dropdown
  const uniqueActions = React.useMemo(() => {
    const actions = new Set(events.map(event => event.action))
    return Array.from(actions).sort()
  }, [events])

  // Get unique users for filter dropdown
  const uniqueUsers = React.useMemo(() => {
    const users = new Set(events.map(event => event.username).filter(Boolean))
    return Array.from(users).sort()
  }, [events])

  if (isLoading && page === 1) {
    return <AuditPageSkeleton />
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Audit Events</CardTitle>
            <CardDescription className="text-red-600">
              {error?.message || 'Failed to load audit events. Please try again.'}
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
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Shield className="h-8 w-8 text-primary" />
            <span>NAV Audit Trail</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor system events and user activities for NAV operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={isRealTime ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRealTime(!isRealTime)}
          >
            <Zap className="h-4 w-4 mr-2" />
            {isRealTime ? 'Real-time' : 'Standard'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.eventsToday}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">Unique Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">
              {Object.keys(stats.eventsByAction).length}
            </div>
            <p className="text-xs text-muted-foreground">Action Types</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {formatActionName(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger>
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="calculation">Calculations</SelectItem>
                <SelectItem value="valuation">Valuations</SelectItem>
                <SelectItem value="approval">Approvals</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user} value={user || ''}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1"
                  placeholder="To"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('')
                  setSelectedAction('all')
                  setSelectedEntity('all')
                  setSelectedUser('all')
                  setDateFrom('')
                  setDateTo('')
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All Events ({filteredEvents.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            Recent Activity ({stats.recentActivity.length})
          </TabsTrigger>
          <TabsTrigger value="actions">
            By Action ({Object.keys(stats.eventsByAction).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <EventsTable events={filteredEvents} />
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest {stats.recentActivity.length} events from the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.map(event => (
                  <div key={event.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <EventIcon action={event.action} />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{formatActionName(event.action)}</span>
                        <ActionBadge action={event.action} />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {event.username} • {event.entityType}:{event.entityId} • {formatDateTime(event.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.eventsByAction).map(([action, count]) => (
              <Card key={action}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <EventIcon action={action} />
                    <div>
                      <div className="font-medium">{formatActionName(action)}</div>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground">events</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, pagination.total)} of {pagination.total} results
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
    </div>
  )
}

interface EventsTableProps {
  events: any[]
}

function EventsTable({ events }: EventsTableProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No events found</h3>
          <p className="text-muted-foreground">
            No audit events match your current filters.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <EventIcon action={event.action} />
                    <div>
                      <div className="font-medium">{formatActionName(event.action)}</div>
                      <ActionBadge action={event.action} />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{event.username || event.userId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{event.entityType}</div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {event.entityId}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDateTime(event.timestamp)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-sm">
                    {event.ipAddress}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    {event.details && Object.keys(event.details).length > 0 && (
                      <details className="cursor-pointer">
                        <summary className="text-primary hover:underline">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded max-w-xs overflow-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function AuditPageSkeleton() {
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
      
      <div className="h-32 bg-gray-200 rounded"></div>
      <div className="h-96 bg-gray-200 rounded"></div>
    </div>
  )
}

function EventIcon({ action }: { action: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    calculation_created: <Zap className="h-4 w-4 text-blue-600" />,
    calculation_completed: <CheckCircle className="h-4 w-4 text-green-600" />,
    calculation_failed: <XCircle className="h-4 w-4 text-red-600" />,
    valuation_saved: <Activity className="h-4 w-4 text-purple-600" />,
    approval_requested: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
    approval_granted: <CheckCircle className="h-4 w-4 text-green-600" />
  }

  return iconMap[action] || <Activity className="h-4 w-4 text-gray-600" />
}

function ActionBadge({ action }: { action: string }) {
  const badgeMap: Record<string, { variant: string; color: string }> = {
    calculation_created: { variant: 'outline', color: 'text-blue-600 border-blue-200' },
    calculation_completed: { variant: 'outline', color: 'text-green-600 border-green-200' },
    calculation_failed: { variant: 'outline', color: 'text-red-600 border-red-200' },
    valuation_saved: { variant: 'outline', color: 'text-purple-600 border-purple-200' },
    approval_requested: { variant: 'outline', color: 'text-yellow-600 border-yellow-200' },
    approval_granted: { variant: 'outline', color: 'text-green-600 border-green-200' }
  }

  const badge = badgeMap[action] || { variant: 'outline', color: 'text-gray-600 border-gray-200' }

  return (
    <Badge className={`text-xs ${badge.color}`} variant="outline">
      {action.split('_')[0]}
    </Badge>
  )
}

function formatActionName(action: string): string {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
