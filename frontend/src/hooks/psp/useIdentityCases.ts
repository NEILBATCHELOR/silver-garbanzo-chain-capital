/**
 * Use PSP Identity Hook
 * React hook for managing KYB/KYC identity verification
 */

import { useState, useEffect, useCallback } from 'react'
import { pspIdentityService } from '@/services/psp'
import type {
  PspIdentityCase,
  IdentityCasesSummary,
  CreateIdentityCaseRequest,
  UpdatePersonRequest,
  UpdateBusinessRequest
} from '@/types/psp'
import { useToast } from '@/components/ui/use-toast'

export function useIdentityCases(projectId?: string) {
  const [cases, setCases] = useState<PspIdentityCase[]>([])
  const [summary, setSummary] = useState<IdentityCasesSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch cases
  const fetchCases = useCallback(async (): Promise<void> => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspIdentityService.listCases(projectId)

      if (response.success && response.data) {
        setCases(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch cases')
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

  // Fetch summary
  const fetchSummary = useCallback(async (): Promise<void> => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspIdentityService.getCasesSummary(projectId)

      if (response.success && response.data) {
        setSummary(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch summary')
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

  // Create case
  const createCase = useCallback(
    async (data: CreateIdentityCaseRequest): Promise<PspIdentityCase | null> => {
      try {
        setLoading(true)
        setError(null)

        const response = await pspIdentityService.createCase(data)

        if (response.success && response.data) {
          toast({
            title: 'Success',
            description: 'Identity case created successfully'
          })
          
          await fetchCases()
          
          return response.data
        } else {
          throw new Error(response.error || 'Failed to create case')
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
    [fetchCases, toast]
  )

  // Update person
  const updatePerson = useCallback(
    async (
      caseId: string,
      personIndex: number,
      data: UpdatePersonRequest
    ): Promise<PspIdentityCase | null> => {
      try {
        setLoading(true)
        setError(null)

        const response = await pspIdentityService.updatePerson(caseId, personIndex, data)

        if (response.success && response.data) {
          toast({
            title: 'Success',
            description: 'Person information updated successfully'
          })
          
          await fetchCases()
          
          return response.data
        } else {
          throw new Error(response.error || 'Failed to update person')
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
    [fetchCases, toast]
  )

  // Update business
  const updateBusiness = useCallback(
    async (
      caseId: string,
      data: UpdateBusinessRequest
    ): Promise<PspIdentityCase | null> => {
      try {
        setLoading(true)
        setError(null)

        const response = await pspIdentityService.updateBusiness(caseId, data)

        if (response.success && response.data) {
          toast({
            title: 'Success',
            description: 'Business information updated successfully'
          })
          
          await fetchCases()
          
          return response.data
        } else {
          throw new Error(response.error || 'Failed to update business')
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
    [fetchCases, toast]
  )

  // Deactivate case
  const deactivateCase = useCallback(
    async (caseId: string): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const response = await pspIdentityService.deactivateCase(caseId)

        if (response.success) {
          toast({
            title: 'Success',
            description: 'Identity case deactivated successfully'
          })
          
          await fetchCases()
        } else {
          throw new Error(response.error || 'Failed to deactivate case')
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
    },
    [fetchCases, toast]
  )

  useEffect(() => {
    fetchCases()
    fetchSummary()
  }, [fetchCases, fetchSummary])

  return {
    cases,
    summary,
    loading,
    error,
    fetchCases,
    fetchSummary,
    createCase,
    updatePerson,
    updateBusiness,
    deactivateCase
  }
}
