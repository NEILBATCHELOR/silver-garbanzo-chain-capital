/**
 * Use PSP External Accounts Hook
 * React hook for managing external fiat and crypto accounts
 */

import { useState, useEffect, useCallback } from 'react'
import { pspExternalAccountsService } from '@/services/psp'
import type {
  PspExternalAccount,
  ExternalAccountsSummary,
  CreateAchAccountRequest,
  CreateWireAccountRequest,
  CreateCryptoAccountRequest,
  CreatePlaidAccountRequest
} from '@/types/psp'
import { useToast } from '@/components/ui/use-toast'

export function useExternalAccounts(projectId?: string) {
  const [accounts, setAccounts] = useState<PspExternalAccount[]>([])
  const [fiatAccounts, setFiatAccounts] = useState<PspExternalAccount[]>([])
  const [cryptoAccounts, setCryptoAccounts] = useState<PspExternalAccount[]>([])
  const [summary, setSummary] = useState<ExternalAccountsSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch fiat accounts
  const fetchFiatAccounts = useCallback(async (): Promise<void> => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspExternalAccountsService.listFiatAccounts(projectId)

      if (response.success && response.data) {
        setFiatAccounts(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch fiat accounts')
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

  // Fetch crypto accounts
  const fetchCryptoAccounts = useCallback(async (): Promise<void> => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspExternalAccountsService.listCryptoAccounts(projectId)

      if (response.success && response.data) {
        setCryptoAccounts(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch crypto accounts')
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

  // Fetch all accounts
  const fetchAllAccounts = useCallback(async (): Promise<void> => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspExternalAccountsService.listAccounts({
        project_id: projectId
      })

      if (response.success && response.data) {
        setAccounts(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch accounts')
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
      
      const response = await pspExternalAccountsService.getAccountsSummary(projectId)

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

  // Create ACH account
  const createAchAccount = useCallback(
    async (data: CreateAchAccountRequest): Promise<PspExternalAccount | null> => {
      try {
        setLoading(true)
        setError(null)

        const response = await pspExternalAccountsService.createAchAccount(data)

        if (response.success && response.data) {
          toast({
            title: 'Success',
            description: 'ACH account added successfully'
          })
          
          await fetchAllAccounts()
          await fetchFiatAccounts()
          
          return response.data
        } else {
          throw new Error(response.error || 'Failed to create ACH account')
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
    [fetchAllAccounts, fetchFiatAccounts, toast]
  )

  // Create Wire account
  const createWireAccount = useCallback(
    async (data: CreateWireAccountRequest): Promise<PspExternalAccount | null> => {
      try {
        setLoading(true)
        setError(null)

        const response = await pspExternalAccountsService.createWireAccount(data)

        if (response.success && response.data) {
          toast({
            title: 'Success',
            description: 'Wire account added successfully'
          })
          
          await fetchAllAccounts()
          await fetchFiatAccounts()
          
          return response.data
        } else {
          throw new Error(response.error || 'Failed to create Wire account')
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
    [fetchAllAccounts, fetchFiatAccounts, toast]
  )

  // Create Crypto account
  const createCryptoAccount = useCallback(
    async (data: CreateCryptoAccountRequest): Promise<PspExternalAccount | null> => {
      try {
        setLoading(true)
        setError(null)

        const response = await pspExternalAccountsService.createCryptoAccount(data)

        if (response.success && response.data) {
          toast({
            title: 'Success',
            description: 'Crypto account added successfully'
          })
          
          await fetchAllAccounts()
          await fetchCryptoAccounts()
          
          return response.data
        } else {
          throw new Error(response.error || 'Failed to create crypto account')
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
    [fetchAllAccounts, fetchCryptoAccounts, toast]
  )

  // Create Plaid account
  const createPlaidAccount = useCallback(
    async (data: CreatePlaidAccountRequest): Promise<PspExternalAccount | null> => {
      try {
        setLoading(true)
        setError(null)

        const response = await pspExternalAccountsService.createPlaidAccount(data)

        if (response.success && response.data) {
          toast({
            title: 'Success',
            description: 'Plaid account connected successfully'
          })
          
          await fetchAllAccounts()
          await fetchFiatAccounts()
          
          return response.data
        } else {
          throw new Error(response.error || 'Failed to connect Plaid account')
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
    [fetchAllAccounts, fetchFiatAccounts, toast]
  )

  // Deactivate account
  const deactivateAccount = useCallback(
    async (accountId: string): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const response = await pspExternalAccountsService.deactivateAccount(accountId)

        if (response.success) {
          toast({
            title: 'Success',
            description: 'Account deactivated successfully'
          })
          
          await fetchAllAccounts()
          await fetchFiatAccounts()
          await fetchCryptoAccounts()
        } else {
          throw new Error(response.error || 'Failed to deactivate account')
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
    [fetchAllAccounts, fetchFiatAccounts, fetchCryptoAccounts, toast]
  )

  useEffect(() => {
    fetchAllAccounts()
    fetchFiatAccounts()
    fetchCryptoAccounts()
    fetchSummary()
  }, [fetchAllAccounts, fetchFiatAccounts, fetchCryptoAccounts, fetchSummary])

  return {
    accounts,
    fiatAccounts,
    cryptoAccounts,
    summary,
    loading,
    error,
    fetchAllAccounts,
    fetchFiatAccounts,
    fetchCryptoAccounts,
    fetchSummary,
    createAchAccount,
    createWireAccount,
    createCryptoAccount,
    createPlaidAccount,
    deactivateAccount
  }
}
