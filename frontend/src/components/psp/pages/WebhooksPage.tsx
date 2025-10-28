/**
 * Webhooks Page
 * Main page for webhook management and event monitoring
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Plus } from 'lucide-react'
import { useWebhooks } from '@/hooks/psp/useWebhooks'
import { WebhooksList } from '../webhooks/WebhooksList'
import { WebhookDialog } from '../webhooks/WebhookDialog'
import { WebhookEventLog } from '../webhooks/WebhookEventLog'
import type { PspWebhook, CreateWebhookRequest } from '@/types/psp/webhooks'

interface WebhooksPageProps {
  projectId: string
}

function WebhooksPage({ projectId }: WebhooksPageProps) {
  const {
    webhooks,
    events,
    loading,
    createWebhook,
    deleteWebhook,
    testWebhook,
    fetchEvents,
    retryEvent
  } = useWebhooks(projectId)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null)

  const handleCreateWebhook = async (data: CreateWebhookRequest) => {
    const result = await createWebhook(data)
    if (result) {
      setCreateDialogOpen(false)
    }
  }

  const handleViewWebhook = (webhook: PspWebhook) => {
    // Fetch events for this specific webhook
    fetchEvents({ webhook_id: webhook.id })
  }

  const handleTestWebhook = async (id: string) => {
    await testWebhook(id)
  }

  const handleDeleteClick = (id: string) => {
    setWebhookToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (webhookToDelete) {
      await deleteWebhook(webhookToDelete)
      setDeleteDialogOpen(false)
      setWebhookToDelete(null)
    }
  }

  const handleRetryEvent = async (eventId: string) => {
    await retryEvent(eventId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhooks</h2>
          <p className="text-muted-foreground">
            Manage webhook endpoints and view event history
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Register Webhook
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="events">Event Log</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Webhooks</CardTitle>
              <CardDescription>
                Webhook endpoints that receive payment notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebhooksList
                webhooks={webhooks}
                onView={handleViewWebhook}
                onTest={handleTestWebhook}
                onDelete={handleDeleteClick}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Events</CardTitle>
              <CardDescription>
                History of all webhook events sent to your endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebhookEventLog
                events={events}
                onRetry={handleRetryEvent}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Webhook Dialog */}
      <WebhookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateWebhook}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone
              and you will stop receiving events at this endpoint.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default WebhooksPage
