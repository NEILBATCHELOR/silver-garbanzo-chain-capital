/**
 * useTokens Hook
 * React hook for fetching tokens for a specific project
 */

import { useQuery } from '@tanstack/react-query'
import { getTokens } from '@/components/tokens/services/tokenService'

export interface UseTokensOptions {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
  gcTime?: number
}

/**
 * Hook to fetch tokens for a project
 * @param projectId The project ID to fetch tokens for
 * @param options Query options
 */
export function useTokens(
  projectId: string | null | undefined,
  options: UseTokensOptions = {}
) {
  const {
    enabled = true,
    refetchInterval,
    staleTime = 30000, // 30 seconds
    gcTime = 300000, // 5 minutes
  } = options

  return useQuery({
    queryKey: ['tokens', projectId],
    queryFn: () => getTokens(projectId),
    enabled: enabled && !!projectId && projectId !== 'undefined',
    refetchInterval,
    staleTime,
    gcTime,
  })
}

export default useTokens
