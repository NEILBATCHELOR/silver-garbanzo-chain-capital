/**
 * Webhook Event Log Component
 * Displays webhook event history with details
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RefreshCw, Eye } from 'lucide-react'
import type { PspWebhookEvent, WebhookEventStatus } from '@/types/psp/webhooks'
import { formatDistanceToNow } from 'date-fns'

interface WebhookEventLogProps {
  events: PspWebhookEvent[]
  onRetry: (eventId: string) => void
  loading?: boolean
}

const statusColors: Record<WebhookEventStatus, string> = {
  pending: 'bg-yellow-500',
  delivered: 'bg-green-500',
  failed: 'bg-red-500'
}

const statusLabels: Record<WebhookEventStatus, string> = {
  pending: 'Pending',
  delivered: 'Delivered',
  failed: 'Failed'
}

export function WebhookEventLog({
  events,
  onRetry,
  loading
}: WebhookEventLogProps) {
  const [selectedEvent, setSelectedEvent] = useState<PspWebhookEvent | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading events...</div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-semibold">No events yet</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Webhook events will appear here once they are triggered
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="font-medium">{event.event_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {event.event_id}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(event.created_at), {
                      addSuffix: true
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`${statusColors[event.status]}/10 border-${statusColors[event.status]}`}
                  >
                    {statusLabels[event.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {event.delivery_attempts > 0 && (
                    <Badge variant="outline">{event.delivery_attempts}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {event.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRetry(event.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Event Name</Label>
                  <p className="text-sm">{selectedEvent.event_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Event ID</Label>
                  <p className="text-sm font-mono text-xs">{selectedEvent.event_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge
                    variant="outline"
                    className={`${statusColors[selectedEvent.status]}/10`}
                  >
                    {statusLabels[selectedEvent.status]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Delivery Attempts</Label>
                  <p className="text-sm">{selectedEvent.delivery_attempts}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Resource URLs</Label>
                <div className="mt-1 space-y-1">
                  {selectedEvent.resource_urls.map((url, i) => (
                    <code key={i} className="block text-xs bg-muted p-2 rounded">
                      {url}
                    </code>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Payload</Label>
                <ScrollArea className="h-64 w-full rounded border">
                  <pre className="p-4 text-xs">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}
