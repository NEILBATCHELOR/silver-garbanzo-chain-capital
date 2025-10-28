/**
 * PSP Webhooks Hook
 * React hook for webhook management and event handling
 */

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { pspWebhooksService } from '@/services/psp/webhooks.service'
import type {
  PspWebhook,
  PspWebhookEvent,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookWithEvents
} from '@/types/psp/webhooks'

interface UseWebhooksReturn {
  webhooks: PspWebhook[]
  selectedWebhook: WebhookWithEvents | null
  events: PspWebhookEvent[]
  totalEvents: number
  loading: boolean
  error: string | null
  
  // Webhook operations
  fetchWebhooks: () => Promise<void>
  fetchWebhook: (id: string) => Promise<void>
  createWebhook: (data: CreateWebhookRequest) => Promise<PspWebhook | null>
  updateWebhook: (id: string, data: UpdateWebhookRequest) => Promise<boolean>
  deleteWebhook: (id: string) => Promise<boolean>
  testWebhook: (id: string) => Promise<boolean>
  
  // Event operations
  fetchEvents: (filters?: {
    webhook_id?: string
    event_name?: string
    status?: string
    limit?: number
    offset?: number
  }) => Promise<void>
  retryEvent: (eventId: string) => Promise<boolean>
}

export function useWebhooks(projectId: string): UseWebhooksReturn {
  const [webhooks, setWebhooks] = useState<PspWebhook[]>([])
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookWithEvents | null>(null)
  const [events, setEvents] = useState<PspWebhookEvent[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  /**
   * Fetch all webhooks for the project
   */
  const fetchWebhooks = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    setError(null)
    try {
      const response = await pspWebhooksService.getWebhooks(projectId)
      if (response.success && response.data) {
        setWebhooks(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch webhooks')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch webhooks'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  /**
   * Fetch a specific webhook with details
   */
  const fetchWebhook = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await pspWebhooksService.getWebhook(id)
      if (response.success && response.data) {
        setSelectedWebhook(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch webhook details')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch webhook details'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  /**
   * Create a new webhook
   */
  const createWebhook = useCallback(
    async (data: CreateWebhookRequest): Promise<PspWebhook | null> => {
      setLoading(true)
      setError(null)
      try {
        const response = await pspWebhooksService.createWebhook(projectId, data)
        if (response.success && response.data) {
          await fetchWebhooks() // Refresh list
          toast({
            title: 'Success',
            description: 'Webhook registered successfully'
          })
          return response.data
        } else {
          throw new Error(response.error || 'Failed to create webhook')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create webhook'
        setError(message)
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [projectId, fetchWebhooks, toast]
  )

  /**
   * Update a webhook
   */
  const updateWebhook = useCallback(
    async (id: string, data: UpdateWebhookRequest): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const response = await pspWebhooksService.updateWebhook(id, data)
        if (response.success) {
          await fetchWebhooks() // Refresh list
          toast({
            title: 'Success',
            description: 'Webhook updated successfully'
          })
          return true
        } else {
          throw new Error(response.error || 'Failed to update webhook')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update webhook'
        setError(message)
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        })
        return false
      } finally {
        setLoading(false)
      }
    },
    [fetchWebhooks, toast]
  )

  /**
   * Delete a webhook
   */
  const deleteWebhook = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const response = await pspWebhooksService.deleteWebhook(id)
        if (response.success) {
          await fetchWebhooks() // Refresh list
          toast({
            title: 'Success',
            description: 'Webhook deleted successfully'
          })
          return true
        } else {
          throw new Error(response.error || 'Failed to delete webhook')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete webhook'
        setError(message)
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        })
        return false
      } finally {
        setLoading(false)
      }
    },
    [fetchWebhooks, toast]
  )

  /**
   * Test a webhook
   */
  const testWebhook = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const response = await pspWebhooksService.testWebhook(id)
        if (response.success && response.data) {
          toast({
            title: response.data.success ? 'Success' : 'Warning',
            description: response.data.message,
            variant: response.data.success ? 'default' : 'destructive'
          })
          return response.data.success
        } else {
          throw new Error(response.error || 'Failed to test webhook')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to test webhook'
        setError(message)
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        })
        return false
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  /**
   * Fetch webhook events
   */
  const fetchEvents = useCallback(
    async (filters?: {
      webhook_id?: string
      event_name?: string
      status?: string
      limit?: number
      offset?: number
    }) => {
      setLoading(true)
      setError(null)
      try {
        const response = await pspWebhooksService.getWebhookEvents({
          project_id: projectId,
          ...filters
        })
        if (response.success && response.data) {
          setEvents(response.data.events)
          setTotalEvents(response.data.total)
        } else {
          throw new Error(response.error || 'Failed to fetch events')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch events'
        setError(message)
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    },
    [projectId, toast]
  )

  /**
   * Retry a failed event
   */
  const retryEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const response = await pspWebhooksService.retryEvent(eventId)
        if (response.success) {
          await fetchEvents() // Refresh events
          toast({
            title: 'Success',
            description: 'Event retry initiated'
          })
          return true
        } else {
          throw new Error(response.error || 'Failed to retry event')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to retry event'
        setError(message)
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        })
        return false
      } finally {
        setLoading(false)
      }
    },
    [fetchEvents, toast]
  )

  // Fetch webhooks on mount and when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchWebhooks()
    }
  }, [projectId, fetchWebhooks])

  return {
    webhooks,
    selectedWebhook,
    events,
    totalEvents,
    loading,
    error,
    fetchWebhooks,
    fetchWebhook,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    fetchEvents,
    retryEvent
  }
}
