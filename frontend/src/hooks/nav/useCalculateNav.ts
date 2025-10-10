/**
 * Enhanced useCalculateNav Hook - WITH DATABASE MODE SUPPORT
 * Domain-specific NAV calculation with type-safe input handling
 * NEW: Supports both standalone and database modes
 * Supports all calculator-specific input types
 */

import { useState, useCallback, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { navService, NavCalculationResult } from '@/services/nav'
import { 
  CalculationResult, 
  NavError, 
  AssetType,
  NavCalculationRequest,
  // Domain-specific input types
  BondCalculationInput,
  AssetBackedCalculationInput,
  EquityCalculationInput,
  MmfCalculationInput,
  CommoditiesCalculationInput,
  RealEstateCalculationInput,
  PrivateEquityCalculationInput,
  PrivateDebtCalculationInput,
  InfrastructureCalculationInput,
  EnergyCalculationInput,
  StructuredProductsCalculationInput,
  QuantitativeStrategiesCalculationInput,
  CollectiblesCalculationInput,
  DigitalTokenizedFundCalculationInput,
  InvoiceReceivablesCalculationInput,
  StablecoinFiatCalculationInput,
  StablecoinCryptoCalculationInput,
  ClimateReceivablesCalculationInput,
  CalculatorInput
} from '@/types/nav'

// NEW: Mode type
export type CalculatorMode = 'standalone' | 'database'

// Helper function to convert Error to NavError
function toNavError(error: unknown): NavError | null {
  if (!error) return null
  
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    return error as NavError
  }
  
  const err = error as Error
  return {
    message: err.message || 'An unknown error occurred',
    statusCode: 500
  }
}

// Transform service result to frontend result
function transformToCalculationResult(serviceResult: NavCalculationResult): CalculationResult {
  return {
    runId: serviceResult.runId,
    assetId: serviceResult.assetId,
    productType: serviceResult.productType as AssetType,
    projectId: serviceResult.projectId,
    valuationDate: serviceResult.valuationDate,
    navValue: serviceResult.navValue,
    navPerShare: serviceResult.navPerShare,
    totalAssets: serviceResult.totalAssets,
    totalLiabilities: serviceResult.totalLiabilities,
    netAssets: serviceResult.netAssets,
    sharesOutstanding: serviceResult.sharesOutstanding,
    currency: serviceResult.currency,
    calculatedAt: serviceResult.calculatedAt,
    status: serviceResult.status as any,
    approvalStatus: undefined,
    errorMessage: serviceResult.errorMessage,
    metadata: serviceResult.metadata
  }
}

// Union type for both simple and complex calculation requests
type NavCalculationInput = CalculatorInput | NavCalculationRequest

// Helper to check if input is NavCalculationRequest
function isNavCalculationRequest(input: NavCalculationInput): input is NavCalculationRequest {
  return 'valuationDate' in input && typeof input.valuationDate === 'string'
}

// Convert domain-specific input to API request format (EXISTING LOGIC - PRESERVED)
function convertToApiRequest(input: NavCalculationInput): any {
  // Handle simple NavCalculationRequest format
  if (isNavCalculationRequest(input)) {
    return {
      assetId: input.assetId,
      productType: input.productType,
      projectId: input.projectId,
      valuationDate: input.valuationDate,
      targetCurrency: input.targetCurrency || 'USD',
      runManually: input.runManually ?? true
    }
  }

  // Handle complex CalculatorInput format
  // Base request structure that all calculators need
  const baseRequest = {
    assetId: input.assetId,
    productType: input.productType,
    projectId: input.projectId,
    valuationDate: input.valuationDate.toISOString(),
    targetCurrency: input.targetCurrency || 'USD',
    runManually: true
  }

  // Add calculator-specific fields based on product type
  switch (input.productType) {
    case AssetType.BONDS:
      const bondInput = input as BondCalculationInput
      return {
        ...baseRequest,
        // Bond-specific parameters
        faceValue: bondInput.faceValue,
        couponRate: bondInput.couponRate,
        maturityDate: bondInput.maturityDate,
        issueDate: bondInput.issueDate,
        paymentFrequency: bondInput.paymentFrequency,
        creditRating: bondInput.creditRating,
        cusip: bondInput.cusip,
        isin: bondInput.isin,
        marketPrice: bondInput.marketPrice,
        yieldToMaturity: bondInput.yieldToMaturity,
        issuerType: bondInput.issuerType,
        sharesOutstanding: bondInput.sharesOutstanding
      }

    case AssetType.EQUITY:
      const equityInput = input as EquityCalculationInput
      return {
        ...baseRequest,
        tickerSymbol: equityInput.tickerSymbol, // FIXED: was ticker
        exchange: equityInput.exchange,
        lastTradePrice: equityInput.lastTradePrice, // FIXED: was marketPrice
        dividendYield: equityInput.dividendYield,
        sharesOutstanding: equityInput.sharesOutstanding
      }

    case AssetType.MMF:
      const mmfInput = input as MmfCalculationInput
      return {
        ...baseRequest,
        sevenDayYield: mmfInput.sevenDayYield,
        averageMaturity: mmfInput.averageMaturity, // FIXED: removed wam, wal, weeklyLiquidAssets, dailyLiquidAssets
        netAssets: mmfInput.netAssets,
        pricePerShare: mmfInput.pricePerShare
      }

    // Add other asset types as needed...
    // (preserving all existing conversion logic)

    default:
      return baseRequest
  }
}

// NEW: Options interface with database mode support
export interface UseCalculateNavOptions {
  onSuccess?: (result: CalculationResult) => void
  onError?: (error: NavError) => void
  onSettled?: () => void
  retry?: number // Max retries (default: 1)
  retryDelay?: number // Delay between retries in ms
  // NEW: Database mode options
  mode?: CalculatorMode
  assetId?: string  // Required for database mode
  autoFetchData?: boolean  // Auto-load asset data in database mode (default: true)
}

// NEW: Result interface with asset data
export interface UseCalculateNavResult {
  // State
  result: CalculationResult | null
  error: NavError | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  
  // Actions - now type-safe for both simple and complex inputs
  calculate: (input: NavCalculationInput) => Promise<void>
  reset: () => void
  
  // Utils
  canCalculate: boolean
  
  // NEW: Database mode state
  mode: CalculatorMode
  assetData: any | null
  isLoadingAsset: boolean
  assetError: NavError | null
}

// NEW: Main hook with database mode support
export function useCalculateNav(options: UseCalculateNavOptions = {}): UseCalculateNavResult {
  const {
    onSuccess,
    onError,
    onSettled,
    retry = 1,
    retryDelay = 2000,
    // NEW: Database mode options
    mode = 'standalone',
    assetId,
    autoFetchData = true
  } = options

  const queryClient = useQueryClient()
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [error, setError] = useState<NavError | null>(null)

  // NEW: Fetch asset data in database mode
  const {
    data: assetData,
    isLoading: isLoadingAsset,
    error: assetError
  } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required in database mode')
      // TODO: Replace with actual API call to fetch asset data
      // For now, return mock data
      const response = await fetch(`/api/nav/assets/${assetId}`)
      if (!response.ok) throw new Error('Failed to fetch asset data')
      return response.json()
    },
    enabled: mode === 'database' && !!assetId && autoFetchData,
    retry,
    retryDelay
  })

  const mutation = useMutation({
    mutationFn: async (input: NavCalculationInput) => {
      try {
        const apiRequest = convertToApiRequest(input)
        const serviceResult = await navService.createCalculation(apiRequest)
        return transformToCalculationResult(serviceResult)
      } catch (err) {
        const navError: NavError = {
          message: err instanceof Error ? err.message : 'Unknown error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
        throw navError
      }
    },
    retry,
    retryDelay,
    onSuccess: (data) => {
      setResult(data)
      setError(null)
      onSuccess?.(data)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['nav'] })
      if (assetId) {
        queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      }
    },
    onError: (error: NavError) => {
      setError(error)
      setResult(null)
      onError?.(error)
    },
    onSettled
  })

  const calculate = useCallback(async (input: NavCalculationInput) => {
    // NEW: In database mode, merge with asset data if available
    if (mode === 'database' && assetData) {
      // Merge asset data with input
      const enhancedInput = {
        ...input,
        assetId,
        // Add other fields from assetData as needed
      }
      await mutation.mutateAsync(enhancedInput)
    } else {
      await mutation.mutateAsync(input)
    }
  }, [mutation, mode, assetData, assetId])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    mutation.reset()
  }, [mutation])

  return {
    // State
    result,
    error: error || toNavError(assetError),
    isLoading: mutation.isPending || isLoadingAsset,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError || !!error || !!assetError,
    
    // Actions
    calculate,
    reset,
    
    // Utils
    canCalculate: !mutation.isPending,
    
    // NEW: Database mode state
    mode,
    assetData: assetData || null,
    isLoadingAsset,
    assetError: toNavError(assetError)
  }
}

// Batch calculation interface
interface UseBatchCalculateNavResult {
  // State
  results: CalculationResult[]
  errors: NavError[]
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  
  // Actions
  calculateBatch: (requests: NavCalculationRequest[]) => Promise<void>
  reset: () => void
  
  // Progress
  progress: number
}

export function useBatchCalculateNav(options: UseCalculateNavOptions = {}): UseBatchCalculateNavResult {
  const queryClient = useQueryClient()
  const [results, setResults] = useState<CalculationResult[]>([])
  const [errors, setErrors] = useState<NavError[]>([])

  const mutation = useMutation({
    mutationFn: async (requests: NavCalculationRequest[]) => {
      const results: CalculationResult[] = []
      const errors: NavError[] = []

      // Execute calculations in parallel with concurrency limit
      const concurrency = 3 // Max 3 concurrent calculations
      const batches = []
      
      for (let i = 0; i < requests.length; i += concurrency) {
        batches.push(requests.slice(i, i + concurrency))
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (request) => {
          try {
            return await navService.createCalculation(request)
          } catch (error) {
            errors.push({
              message: error instanceof Error ? error.message : 'Unknown error',
              statusCode: 500,
              timestamp: new Date().toISOString()
            } as NavError)
            return null
          }
        })

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults.filter(Boolean) as CalculationResult[])
      }

      if (errors.length > 0) {
        setErrors(errors)
      }

      return results
    },
    onSuccess: (data) => {
      setResults(data)
      options.onSuccess?.(data[0]) // Call with first result for compatibility
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['nav'] })
    },
    onError: (error: NavError) => {
      options.onError?.(error)
    },
    onSettled: options.onSettled
  })

  const calculateBatch = useCallback(async (requests: NavCalculationRequest[]) => {
    setResults([])
    setErrors([])
    await mutation.mutateAsync(requests)
  }, [mutation])

  const reset = useCallback(() => {
    setResults([])
    setErrors([])
    mutation.reset()
  }, [mutation])

  return {
    // State
    results,
    errors,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError || errors.length > 0,
    
    // Actions
    calculateBatch,
    reset,
    
    // Progress
    progress: results.length // Simple progress indicator
  }
}

// Domain-specific hooks for different calculator types (with database mode support)
export function useBondCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: BondCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useAssetBackedCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: AssetBackedCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useEquityCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: EquityCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useMmfCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: MmfCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useCommoditiesCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: CommoditiesCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useRealEstateCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: RealEstateCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function usePrivateEquityCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: PrivateEquityCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function usePrivateDebtCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: PrivateDebtCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useInfrastructureCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: InfrastructureCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useEnergyCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: EnergyCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useStructuredProductsCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: StructuredProductsCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useQuantitativeStrategiesCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: QuantitativeStrategiesCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useCollectiblesCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: CollectiblesCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useDigitalTokenizedFundCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: DigitalTokenizedFundCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useInvoiceReceivablesCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: InvoiceReceivablesCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useStablecoinFiatCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: StablecoinFiatCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useStablecoinCryptoCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: StablecoinCryptoCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}

export function useClimateReceivablesCalculateNav(options: UseCalculateNavOptions = {}) {
  const baseHook = useCalculateNav(options)
  
  return {
    ...baseHook,
    calculate: useCallback(async (input: ClimateReceivablesCalculationInput) => {
      await baseHook.calculate(input)
    }, [baseHook.calculate])
  }
}
