/**
 * Webhooks List Component
 * Displays all registered webhooks with status and actions
 */

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Webhook, ExternalLink, Play, Trash2 } from 'lucide-react'
import type { PspWebhook, WebhookStatus } from '@/types/psp/webhooks'
import { formatDistanceToNow } from 'date-fns'

interface WebhooksListProps {
  webhooks: PspWebhook[]
  onView: (webhook: PspWebhook) => void
  onTest: (id: string) => void
  onDelete: (id: string) => void
  loading?: boolean
}

const statusColors: Record<WebhookStatus, string> = {
  active: 'bg-green-500',
  suspended: 'bg-yellow-500',
  failed: 'bg-red-500'
}

const statusLabels: Record<WebhookStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  failed: 'Failed'
}

export function WebhooksList({
  webhooks,
  onView,
  onTest,
  onDelete,
  loading
}: WebhooksListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading webhooks...</div>
      </div>
    )
  }

  if (webhooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Webhook className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No webhooks registered</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Register a webhook to receive real-time payment notifications
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>URL</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Success</TableHead>
            <TableHead>Retries</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {webhooks.map((webhook) => (
            <TableRow
              key={webhook.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onView(webhook)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="max-w-xs truncate font-medium">
                    {webhook.callback_url}
                  </div>
                  {webhook.warp_webhook_id && (
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <code className="text-xs">{webhook.auth_username}</code>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`${statusColors[webhook.status]}/10 border-${statusColors[webhook.status]}`}
                >
                  {statusLabels[webhook.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {webhook.last_success_at ? (
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(webhook.last_success_at), {
                      addSuffix: true
                    })}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Never</span>
                )}
              </TableCell>
              <TableCell>
                {webhook.retry_count > 0 && (
                  <Badge variant="outline">{webhook.retry_count}</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      onView(webhook)
                    }}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      onTest(webhook.id)
                    }}>
                      <Play className="mr-2 h-4 w-4" />
                      Test Webhook
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(webhook.id)
                      }}
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
    </div>
  )
}
