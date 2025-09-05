/**
 * useCalculators Hook
 * React hook for managing calculator registry, availability, and permissions
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  CALCULATOR_REGISTRY,
  getEnabledCalculators,
  getCalculatorsByCategory,
  searchCalculators,
  type CalculatorRegistryEntry 
} from '@/components/nav/calculators/calculators.config'
import { AssetType, NavError, convertToNavError } from '@/types/nav'

export interface UseCalculatorsResult {
  // Data
  allCalculators: CalculatorRegistryEntry[]
  availableCalculators: CalculatorRegistryEntry[]
  priorityCalculators: CalculatorRegistryEntry[]
  extendedCalculators: CalculatorRegistryEntry[]
  
  // State
  isLoading: boolean
  isError: boolean
  error: NavError | null
  
  // Actions
  searchCalculators: (query: string) => CalculatorRegistryEntry[]
  getCalculatorsByAssetType: (assetType: AssetType) => CalculatorRegistryEntry[]
  getCalculatorById: (id: string) => CalculatorRegistryEntry | undefined
  
  // Stats
  stats: {
    total: number
    enabled: number
    disabled: number
    priority: number
    extended: number
    byComplexity: {
      basic: number
      intermediate: number
      advanced: number
    }
  }
  
  // Permissions
  hasPermissionFor: (calculatorId: string) => boolean
  getPermissionsForCalculator: (calculatorId: string) => string[]
}

interface UseCalculatorsOptions {
  userPermissions?: string[]
  enabled?: boolean
  includeDisabled?: boolean
  category?: 'priority' | 'extended' | 'all'
  complexity?: 'basic' | 'intermediate' | 'advanced'
}

export function useCalculators(options: UseCalculatorsOptions = {}): UseCalculatorsResult {
  const {
    userPermissions = [],
    enabled = true,
    includeDisabled = false,
    category = 'all',
    complexity
  } = options

  // Query for any dynamic calculator data from backend (if needed in future)
  const query = useQuery({
    queryKey: ['nav', 'calculators', { userPermissions: userPermissions.sort() }],
    queryFn: async () => {
      // For now, return the static registry
      // In the future, this could fetch dynamic calculator configurations from backend
      try {
        // TODO: When backend provides dynamic calculator registry, fetch it here
        // const calculators = await navService.listCalculators()
        
        // For now, return static registry with permission filtering
        const filteredCalculators = CALCULATOR_REGISTRY.filter(calc => {
          // Check enabled state
          if (!includeDisabled && !calc.enabled) return false
          
          // Check permissions
          if (calc.requiredPermissions && calc.requiredPermissions.length > 0) {
            return calc.requiredPermissions.every(permission => 
              userPermissions.includes(permission)
            )
          }
          
          return true
        })
        
        return filteredCalculators
      } catch (error) {
        // Transform service errors into NavError format
        throw convertToNavError(error)
      }
    },
    enabled,
    staleTime: 300000, // 5 minutes - calculator registry doesn't change often
    gcTime: 600000, // 10 minutes
    retry: 1 // Single retry for calculator registry
  })

  // Memoized calculator data with filtering
  const calculatorData = useMemo(() => {
    const availableCalculators = query.data || []
    
    // Filter by category based on priority
    let filteredByCategory = availableCalculators
    if (category === 'priority') {
      filteredByCategory = availableCalculators.filter(calc => calc.priority >= 80) // High priority calculators
    } else if (category === 'extended') {
      filteredByCategory = availableCalculators.filter(calc => calc.priority < 80) // Lower priority calculators
    }
    
    // Filter by complexity
    let finalCalculators = filteredByCategory
    if (complexity) {
      finalCalculators = filteredByCategory.filter(calc => calc.complexityLevel === complexity)
    }
    
    // Sort by priority
    finalCalculators = finalCalculators.sort((a, b) => a.priority - b.priority)
    
    return {
      all: availableCalculators,
      filtered: finalCalculators,
      priority: availableCalculators.filter(calc => calc.priority >= 80).sort((a, b) => b.priority - a.priority),
      extended: availableCalculators.filter(calc => calc.priority < 80).sort((a, b) => b.priority - a.priority)
    }
  }, [query.data, category, complexity])

  // Helper functions
  const searchCalculatorsFunction = useMemo(() => {
    return (searchQuery: string) => {
      if (!searchQuery.trim()) return calculatorData.all
      
      const lowercaseQuery = searchQuery.toLowerCase()
      return calculatorData.all.filter(calc => {
        const matchesName = calc.name.toLowerCase().includes(lowercaseQuery)
        const matchesDescription = calc.description.toLowerCase().includes(lowercaseQuery)
        const matchesId = calc.id.toLowerCase().includes(lowercaseQuery)
        const matchesTags = calc.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery)) || false
        
        return matchesName || matchesDescription || matchesId || matchesTags
      })
    }
  }, [calculatorData.all])

  const getCalculatorsByAssetType = useMemo(() => {
    return (assetType: AssetType) => {
      return calculatorData.all.filter(calc => calc.assetTypes.includes(assetType))
    }
  }, [calculatorData.all])

  const getCalculatorById = useMemo(() => {
    return (id: string) => {
      return calculatorData.all.find(calc => calc.id === id)
    }
  }, [calculatorData.all])

  // Permission helpers
  const hasPermissionFor = useMemo(() => {
    return (calculatorId: string) => {
      const calculator = getCalculatorById(calculatorId)
      if (!calculator || !calculator.requiredPermissions?.length) return true
      
      return calculator.requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      )
    }
  }, [getCalculatorById, userPermissions])

  const getPermissionsForCalculator = useMemo(() => {
    return (calculatorId: string) => {
      const calculator = getCalculatorById(calculatorId)
      return calculator?.requiredPermissions || []
    }
  }, [getCalculatorById])

  // Calculate stats
  const stats = useMemo(() => {
    const allCalcs = CALCULATOR_REGISTRY // Use full registry for stats
    const availableCalcs = calculatorData.all
    
    return {
      total: allCalcs.length,
      enabled: availableCalcs.length,
      disabled: allCalcs.length - availableCalcs.length,
      priority: availableCalcs.filter(calc => calc.category === 'priority').length,
      extended: availableCalcs.filter(calc => calc.category === 'extended').length,
      byComplexity: {
        basic: availableCalcs.filter(calc => calc.complexityLevel === 'basic').length,
        intermediate: availableCalcs.filter(calc => calc.complexityLevel === 'intermediate').length,
        advanced: availableCalcs.filter(calc => calc.complexityLevel === 'advanced').length
      }
    }
  }, [calculatorData.all])

  return {
    // Data
    allCalculators: calculatorData.filtered,
    availableCalculators: calculatorData.all,
    priorityCalculators: calculatorData.priority,
    extendedCalculators: calculatorData.extended,
    
    // State
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? convertToNavError(query.error) : null,
    
    // Actions
    searchCalculators: searchCalculatorsFunction,
    getCalculatorsByAssetType,
    getCalculatorById,
    
    // Stats
    stats,
    
    // Permissions
    hasPermissionFor,
    getPermissionsForCalculator
  }
}

/**
 * Hook for priority calculators only
 */
export function usePriorityCalculators(options: Omit<UseCalculatorsOptions, 'category'> = {}) {
  return useCalculators({
    ...options,
    category: 'priority'
  })
}

/**
 * Hook for extended calculators only
 */
export function useExtendedCalculators(options: Omit<UseCalculatorsOptions, 'category'> = {}) {
  return useCalculators({
    ...options,
    category: 'extended'
  })
}

/**
 * Hook for calculators by complexity level
 */
export function useCalculatorsByComplexity(
  complexity: 'basic' | 'intermediate' | 'advanced',
  options: Omit<UseCalculatorsOptions, 'complexity'> = {}
) {
  return useCalculators({
    ...options,
    complexity
  })
}

/**
 * Hook for a specific calculator by ID
 */
export function useCalculator(calculatorId: string, options: UseCalculatorsOptions = {}) {
  const calculators = useCalculators(options)
  
  return {
    calculator: calculators.getCalculatorById(calculatorId),
    hasPermission: calculators.hasPermissionFor(calculatorId),
    requiredPermissions: calculators.getPermissionsForCalculator(calculatorId),
    isLoading: calculators.isLoading,
    isError: calculators.isError,
    error: calculators.error
  }
}

export default useCalculators
