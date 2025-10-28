/**
 * Use PSP Payment Settings Hook
 * React hook for managing payment automation settings
 */

import { useState, useEffect, useCallback } from 'react'
import { pspSettingsService } from '@/services/psp'
import type {
  PspPaymentSettings,
  UpdatePaymentSettingsRequest
} from '@/types/psp'
import { useToast } from '@/components/ui/use-toast'

export function usePaymentSettings(projectId?: string) {
  const [settings, setSettings] = useState<PspPaymentSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch settings
  const fetchSettings = useCallback(async (): Promise<void> => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspSettingsService.getSettings(projectId)

      if (response.success && response.data) {
        setSettings(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch settings')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
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

  // Update settings
  const updateSettings = useCallback(
    async (data: UpdatePaymentSettingsRequest): Promise<PspPaymentSettings | null> => {
      try {
        setLoading(true)
        setError(null)

        const response = await pspSettingsService.updateSettings(data)

        if (response.success && response.data) {
          toast({
            title: 'Success',
            description: 'Payment settings updated successfully'
          })
          
          setSettings(response.data)
          
          return response.data
        } else {
          throw new Error(response.error || 'Failed to update settings')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred'
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
    [toast]
  )

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings
  }
}
