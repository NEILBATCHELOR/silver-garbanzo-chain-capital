/**
 * Use PSP API Keys Hook
 * React hook for managing PSP API keys
 */

import { useState, useEffect, useCallback } from 'react'
import { pspApiKeysService } from '@/services/psp'
import {
  PspApiKey,
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
  ApiKeyListFilters
} from '@/types/psp'
import { useToast } from '@/components/ui/use-toast'

export function useApiKeys(projectId?: string, filters?: ApiKeyListFilters) {
  const [apiKeys, setApiKeys] = useState<PspApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspApiKeysService.listApiKeys({
        project_id: projectId,
        ...filters
      })

      if (response.success && response.data) {
        setApiKeys(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch API keys')
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
  }, [projectId, filters, toast])

  // Create a new API key
  const createApiKey = useCallback(async (data: CreateApiKeyRequest) => {
    try {
      setLoading(true)
      setError(null)

      const response = await pspApiKeysService.createApiKey(data)

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'API key created successfully'
        })
        
        // Refresh the list
        await fetchApiKeys()
        
        return response.data
      } else {
        throw new Error(response.error || 'Failed to create API key')
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
  }, [fetchApiKeys, toast])

  // Update an existing API key
  const updateApiKey = useCallback(async (id: string, data: UpdateApiKeyRequest) => {
    try {
      setLoading(true)
      setError(null)

      const response = await pspApiKeysService.updateApiKey(id, data)

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'API key updated successfully'
        })
        
        // Refresh the list
        await fetchApiKeys()
        
        return response.data
      } else {
        throw new Error(response.error || 'Failed to update API key')
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
  }, [fetchApiKeys, toast])

  // Revoke an API key
  const revokeApiKey = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await pspApiKeysService.revokeApiKey(id)

      if (response.success) {
        toast({
          title: 'Success',
          description: 'API key revoked successfully'
        })
        
        // Refresh the list
        await fetchApiKeys()
        
        return true
      } else {
        throw new Error(response.error || 'Failed to revoke API key')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
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
  }, [fetchApiKeys, toast])

  // Add IP to whitelist
  const addIpToWhitelist = useCallback(async (id: string, ipAddress: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await pspApiKeysService.addIpToWhitelist(id, ipAddress)

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'IP address added to whitelist'
        })
        
        // Refresh the list
        await fetchApiKeys()
        
        return response.data
      } else {
        throw new Error(response.error || 'Failed to add IP to whitelist')
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
  }, [fetchApiKeys, toast])

  // Remove IP from whitelist
  const removeIpFromWhitelist = useCallback(async (id: string, ipAddress: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await pspApiKeysService.removeIpFromWhitelist(id, ipAddress)

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'IP address removed from whitelist'
        })
        
        // Refresh the list
        await fetchApiKeys()
        
        return response.data
      } else {
        throw new Error(response.error || 'Failed to remove IP from whitelist')
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
  }, [fetchApiKeys, toast])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  return {
    apiKeys,
    loading,
    error,
    fetchApiKeys,
    createApiKey,
    updateApiKey,
    revokeApiKey,
    addIpToWhitelist,
    removeIpFromWhitelist
  }
}
