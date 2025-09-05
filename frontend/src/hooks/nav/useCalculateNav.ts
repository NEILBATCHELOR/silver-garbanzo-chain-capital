/**
 * Enhanced useCalculateNav Hook
 * Domain-specific NAV calculation with type-safe input handling
 * Supports all calculator-specific input types
 */

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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

// Convert domain-specific input to API request format
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
        maturityDate: bondInput.maturityDate?.toISOString(),
        issueDate: bondInput.issueDate?.toISOString(),
        paymentFrequency: bondInput.paymentFrequency,
        creditRating: bondInput.creditRating,
        cusip: bondInput.cusip,
        isin: bondInput.isin,
        yieldToMaturity: bondInput.yieldToMaturity,
        marketPrice: bondInput.marketPrice,
        accruedInterest: bondInput.accruedInterest,
        sector: bondInput.sector,
        issuerType: bondInput.issuerType,
        sharesOutstanding: bondInput.sharesOutstanding
      }

    case AssetType.ASSET_BACKED:
      const absInput = input as AssetBackedCalculationInput
      return {
        ...baseRequest,
        // Asset-backed specific parameters
        assetNumber: absInput.assetNumber,
        assetType: absInput.assetType,
        originalAmount: absInput.originalAmount,
        currentBalance: absInput.currentBalance,
        maturityDate: absInput.maturityDate?.toISOString(),
        interestRate: absInput.interestRate,
        lienPosition: absInput.lienPosition,
        paymentFrequency: absInput.paymentFrequency,
        delinquencyStatus: absInput.delinquencyStatus,
        creditQuality: absInput.creditQuality,
        recoveryRate: absInput.recoveryRate,
        servicerName: absInput.servicerName,
        poolSize: absInput.poolSize,
        subordinationLevel: absInput.subordinationLevel,
        creditEnhancement: absInput.creditEnhancement,
        sharesOutstanding: absInput.sharesOutstanding
      }

    case AssetType.EQUITY:
      const equityInput = input as EquityCalculationInput
      return {
        ...baseRequest,
        // Equity-specific parameters
        tickerSymbol: equityInput.tickerSymbol,
        exchange: equityInput.exchange,
        lastTradePrice: equityInput.lastTradePrice,
        bidPrice: equityInput.bidPrice,
        askPrice: equityInput.askPrice,
        marketCap: equityInput.marketCap,
        dividendYield: equityInput.dividendYield,
        peRatio: equityInput.peRatio,
        beta: equityInput.beta,
        sector: equityInput.sector,
        industry: equityInput.industry,
        sharesOutstanding: equityInput.sharesOutstanding
      }

    case AssetType.MMF:
      const mmfInput = input as MmfCalculationInput
      return {
        ...baseRequest,
        // MMF-specific parameters
        fundName: mmfInput.fundName,
        fundFamily: mmfInput.fundFamily,
        sevenDayYield: mmfInput.sevenDayYield,
        expenseRatio: mmfInput.expenseRatio,
        averageMaturity: mmfInput.averageMaturity,
        netAssets: mmfInput.netAssets,
        pricePerShare: mmfInput.pricePerShare,
        dividendRate: mmfInput.dividendRate,
        complianceType: mmfInput.complianceType,
        sharesOutstanding: mmfInput.sharesOutstanding
      }

    case AssetType.COMMODITIES:
      const commoditiesInput = input as CommoditiesCalculationInput
      return {
        ...baseRequest,
        // Commodities-specific parameters
        commodityType: commoditiesInput.commodityType,
        contractSize: commoditiesInput.contractSize,
        deliveryMonth: commoditiesInput.deliveryMonth,
        deliveryYear: commoditiesInput.deliveryYear,
        spotPrice: commoditiesInput.spotPrice,
        futuresPrice: commoditiesInput.futuresPrice,
        storageCosting: commoditiesInput.storageCosting,
        convenienceYield: commoditiesInput.convenienceYield,
        riskFreeRate: commoditiesInput.riskFreeRate,
        volatility: commoditiesInput.volatility
      }

    case AssetType.REAL_ESTATE:
      const realEstateInput = input as RealEstateCalculationInput
      return {
        ...baseRequest,
        // Real estate-specific parameters
        propertyType: realEstateInput.propertyType,
        squareFootage: realEstateInput.squareFootage,
        location: realEstateInput.location,
        yearBuilt: realEstateInput.yearBuilt,
        lastAppraisalValue: realEstateInput.lastAppraisalValue,
        appraisalDate: realEstateInput.appraisalDate?.toISOString(),
        rentalIncome: realEstateInput.rentalIncome,
        operatingExpenses: realEstateInput.operatingExpenses,
        capRate: realEstateInput.capRate,
        occupancyRate: realEstateInput.occupancyRate,
        marketRentPsf: realEstateInput.marketRentPsf
      }

    case AssetType.PRIVATE_EQUITY:
      const privateEquityInput = input as PrivateEquityCalculationInput
      return {
        ...baseRequest,
        // Private equity-specific parameters
        fundName: privateEquityInput.fundName,
        fundType: privateEquityInput.fundType,
        vintage: privateEquityInput.vintage,
        fundSize: privateEquityInput.fundSize,
        commitmentAmount: privateEquityInput.commitmentAmount,
        calledAmount: privateEquityInput.calledAmount,
        distributedAmount: privateEquityInput.distributedAmount,
        navReported: privateEquityInput.navReported,
        lastReportingDate: privateEquityInput.lastReportingDate?.toISOString(),
        generalPartner: privateEquityInput.generalPartner,
        investmentStrategy: privateEquityInput.investmentStrategy,
        geographicFocus: privateEquityInput.geographicFocus,
        industryFocus: privateEquityInput.industryFocus,
        irr: privateEquityInput.irr,
        multiple: privateEquityInput.multiple,
        dpi: privateEquityInput.dpi,
        rvpi: privateEquityInput.rvpi,
        tvpi: privateEquityInput.tvpi
      }

    case AssetType.PRIVATE_DEBT:
      const privateDebtInput = input as PrivateDebtCalculationInput
      return {
        ...baseRequest,
        // Private debt-specific parameters
        debtType: privateDebtInput.debtType,
        principalAmount: privateDebtInput.principalAmount,
        interestRate: privateDebtInput.interestRate,
        maturityDate: privateDebtInput.maturityDate?.toISOString(),
        issueDate: privateDebtInput.issueDate?.toISOString(),
        paymentFrequency: privateDebtInput.paymentFrequency,
        creditRating: privateDebtInput.creditRating,
        seniority: privateDebtInput.seniority,
        security: privateDebtInput.security,
        covenants: privateDebtInput.covenants,
        borrowerName: privateDebtInput.borrowerName,
        borrowerIndustry: privateDebtInput.borrowerIndustry,
        ltv: privateDebtInput.ltv,
        dscr: privateDebtInput.dscr,
        currentBalance: privateDebtInput.currentBalance
      }

    case AssetType.INFRASTRUCTURE:
      const infrastructureInput = input as InfrastructureCalculationInput
      return {
        ...baseRequest,
        // Infrastructure-specific parameters
        projectName: infrastructureInput.projectName,
        assetType: infrastructureInput.assetType,
        projectPhase: infrastructureInput.projectPhase,
        operatingHistory: infrastructureInput.operatingHistory,
        cashFlowProfile: infrastructureInput.cashFlowProfile,
        regulatoryFramework: infrastructureInput.regulatoryFramework,
        concessionPeriod: infrastructureInput.concessionPeriod,
        counterpartyRisk: infrastructureInput.counterpartyRisk,
        esgRating: infrastructureInput.esgRating,
        capex: infrastructureInput.capex,
        opex: infrastructureInput.opex,
        revenue: infrastructureInput.revenue,
        ebitda: infrastructureInput.ebitda,
        discountRate: infrastructureInput.discountRate,
        terminalValue: infrastructureInput.terminalValue
      }

    case AssetType.ENERGY:
      const energyInput = input as EnergyCalculationInput
      return {
        ...baseRequest,
        // Energy-specific parameters
        energyType: energyInput.energyType,
        capacity: energyInput.capacity,
        generation: energyInput.generation,
        capacity_factor: energyInput.capacity_factor,
        ppa_price: energyInput.ppa_price,
        ppa_term: energyInput.ppa_term,
        fuel_costs: energyInput.fuel_costs,
        o_and_m_costs: energyInput.o_and_m_costs,
        carbonPrice: energyInput.carbonPrice,
        renewable_certificates: energyInput.renewable_certificates,
        transmission_costs: energyInput.transmission_costs,
        development_risk: energyInput.development_risk,
        technology_risk: energyInput.technology_risk,
        merchant_risk: energyInput.merchant_risk
      }

    case AssetType.STRUCTURED_PRODUCTS:
      const structuredProductsInput = input as StructuredProductsCalculationInput
      return {
        ...baseRequest,
        // Structured products-specific parameters
        productType: structuredProductsInput.productType,
        underlying: structuredProductsInput.underlying,
        barrier: structuredProductsInput.barrier,
        knockIn: structuredProductsInput.knockIn,
        knockOut: structuredProductsInput.knockOut,
        coupon: structuredProductsInput.coupon,
        participation: structuredProductsInput.participation,
        leverage: structuredProductsInput.leverage,
        protection: structuredProductsInput.protection,
        maturityDate: structuredProductsInput.maturityDate?.toISOString(),
        payoffStructure: structuredProductsInput.payoffStructure,
        volatility: structuredProductsInput.volatility,
        correlation: structuredProductsInput.correlation,
        dividendYield: structuredProductsInput.dividendYield
      }

    case AssetType.QUANT_STRATEGIES:
      const quantStrategiesInput = input as QuantitativeStrategiesCalculationInput
      return {
        ...baseRequest,
        // Quantitative strategies-specific parameters
        strategyType: quantStrategiesInput.strategyType,
        strategyName: quantStrategiesInput.strategyName,
        aum: quantStrategiesInput.aum,
        performanceFee: quantStrategiesInput.performanceFee,
        managementFee: quantStrategiesInput.managementFee,
        highWaterMark: quantStrategiesInput.highWaterMark,
        leverage: quantStrategiesInput.leverage,
        sharpeRatio: quantStrategiesInput.sharpeRatio,
        maxDrawdown: quantStrategiesInput.maxDrawdown,
        beta: quantStrategiesInput.beta,
        alpha: quantStrategiesInput.alpha,
        correlation: quantStrategiesInput.correlation,
        volatility: quantStrategiesInput.volatility,
        var: quantStrategiesInput.var,
        frequency: quantStrategiesInput.frequency,
        dataSource: quantStrategiesInput.dataSource
      }

    case AssetType.COLLECTIBLES:
      const collectiblesInput = input as CollectiblesCalculationInput
      return {
        ...baseRequest,
        // Collectibles-specific parameters
        collectibleType: collectiblesInput.collectibleType,
        category: collectiblesInput.category,
        artist: collectiblesInput.artist,
        year: collectiblesInput.year,
        condition: collectiblesInput.condition,
        rarity: collectiblesInput.rarity,
        provenance: collectiblesInput.provenance,
        authenticity: collectiblesInput.authenticity,
        lastSalePrice: collectiblesInput.lastSalePrice,
        lastSaleDate: collectiblesInput.lastSaleDate?.toISOString(),
        appraisalValue: collectiblesInput.appraisalValue,
        appraisalDate: collectiblesInput.appraisalDate?.toISOString(),
        insuranceValue: collectiblesInput.insuranceValue,
        marketTrend: collectiblesInput.marketTrend,
        liquidity: collectiblesInput.liquidity
      }

    case AssetType.DIGITAL_TOKENIZED_FUNDS:
      const digitalTokenizedFundInput = input as DigitalTokenizedFundCalculationInput
      return {
        ...baseRequest,
        // Digital tokenized fund-specific parameters
        fundName: digitalTokenizedFundInput.fundName,
        tokenSymbol: digitalTokenizedFundInput.tokenSymbol,
        tokenStandard: digitalTokenizedFundInput.tokenStandard,
        blockchainNetwork: digitalTokenizedFundInput.blockchainNetwork,
        totalSupply: digitalTokenizedFundInput.totalSupply,
        circulatingSupply: digitalTokenizedFundInput.circulatingSupply,
        tokenPrice: digitalTokenizedFundInput.tokenPrice,
        underlyingNav: digitalTokenizedFundInput.underlyingNav,
        managementFee: digitalTokenizedFundInput.managementFee,
        performanceFee: digitalTokenizedFundInput.performanceFee,
        redemptionFee: digitalTokenizedFundInput.redemptionFee,
        liquidity: digitalTokenizedFundInput.liquidity,
        aum: digitalTokenizedFundInput.aum,
        yield: digitalTokenizedFundInput.yield,
        stakingRewards: digitalTokenizedFundInput.stakingRewards
      }

    case AssetType.INVOICE_RECEIVABLES:
      const invoiceReceivablesInput = input as InvoiceReceivablesCalculationInput
      return {
        ...baseRequest,
        // Invoice receivables-specific parameters
        invoiceNumber: invoiceReceivablesInput.invoiceNumber,
        invoiceAmount: invoiceReceivablesInput.invoiceAmount,
        invoiceDate: invoiceReceivablesInput.invoiceDate?.toISOString(),
        dueDate: invoiceReceivablesInput.dueDate?.toISOString(),
        payorName: invoiceReceivablesInput.payorName,
        payorRating: invoiceReceivablesInput.payorRating,
        discountRate: invoiceReceivablesInput.discountRate,
        advanceRate: invoiceReceivablesInput.advanceRate,
        factoring_fee: invoiceReceivablesInput.factoring_fee,
        recourse: invoiceReceivablesInput.recourse,
        dilution_reserve: invoiceReceivablesInput.dilution_reserve,
        concentration_limit: invoiceReceivablesInput.concentration_limit,
        aging_buckets: invoiceReceivablesInput.aging_buckets,
        collection_probability: invoiceReceivablesInput.collection_probability
      }

    case AssetType.STABLECOIN_FIAT_BACKED:
      const stablecoinFiatInput = input as StablecoinFiatCalculationInput
      return {
        ...baseRequest,
        // Stablecoin fiat-backed-specific parameters
        tokenSymbol: stablecoinFiatInput.tokenSymbol,
        tokenName: stablecoinFiatInput.tokenName,
        pegCurrency: stablecoinFiatInput.pegCurrency,
        collateralRatio: stablecoinFiatInput.collateralRatio,
        reserveAmount: stablecoinFiatInput.reserveAmount,
        circulating_supply: stablecoinFiatInput.circulating_supply,
        backing_assets: stablecoinFiatInput.backing_assets,
        custodian: stablecoinFiatInput.custodian,
        audit_frequency: stablecoinFiatInput.audit_frequency,
        regulatory_status: stablecoinFiatInput.regulatory_status,
        redemption_fee: stablecoinFiatInput.redemption_fee
      }

    case AssetType.STABLECOIN_CRYPTO_BACKED:
      const stablecoinCryptoInput = input as StablecoinCryptoCalculationInput
      return {
        ...baseRequest,
        // Stablecoin crypto-backed-specific parameters
        tokenSymbol: stablecoinCryptoInput.tokenSymbol,
        tokenName: stablecoinCryptoInput.tokenName,
        pegCurrency: stablecoinCryptoInput.pegCurrency,
        collateral_tokens: stablecoinCryptoInput.collateral_tokens,
        over_collateralization: stablecoinCryptoInput.over_collateralization,
        liquidation_ratio: stablecoinCryptoInput.liquidation_ratio,
        stability_fee: stablecoinCryptoInput.stability_fee,
        circulating_supply: stablecoinCryptoInput.circulating_supply,
        protocol: stablecoinCryptoInput.protocol,
        governance_token: stablecoinCryptoInput.governance_token,
        mint_fee: stablecoinCryptoInput.mint_fee,
        burn_fee: stablecoinCryptoInput.burn_fee
      }

    case AssetType.CLIMATE_RECEIVABLES:
      const climateInput = input as ClimateReceivablesCalculationInput
      return {
        ...baseRequest,
        // Climate receivables-specific parameters
        creditType: climateInput.creditType,
        vintageYear: climateInput.vintageYear,
        projectType: climateInput.projectType,
        geography: climateInput.geography,
        certificationStandard: climateInput.certificationStandard,
        creditVolume: climateInput.creditVolume,
        pricePerCredit: climateInput.pricePerCredit,
        deliverySchedule: climateInput.deliverySchedule,
        registryAccount: climateInput.registryAccount,
        carbonPrice: climateInput.carbonPrice,
        policyRisk: climateInput.policyRisk
      }

    default:
      // Fallback for unsupported types
      return baseRequest
  }
}

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
}

interface UseCalculateNavOptions {
  onSuccess?: (result: CalculationResult) => void
  onError?: (error: NavError) => void
  onSettled?: () => void
  retry?: number // Max retries (default: 1)
  retryDelay?: number // Delay between retries in ms
}

export function useCalculateNav(options: UseCalculateNavOptions = {}): UseCalculateNavResult {
  const {
    onSuccess,
    onError,
    onSettled,
    retry = 1,
    retryDelay = 2000
  } = options

  const queryClient = useQueryClient()
  const [result, setResult] = useState<CalculationResult | null>(null)

  // Reset state
  const reset = useCallback(() => {
    setResult(null)
    mutation.reset()
  }, [])

  // Main calculation mutation with both simple and complex input support
  const mutation = useMutation({
    mutationFn: async (input: NavCalculationInput): Promise<CalculationResult> => {
      try {
        // Convert domain-specific input to API request format
        const apiRequest = convertToApiRequest(input)
        
        // Call the backend service
        const serviceResult = await navService.createCalculation(apiRequest)
        return transformToCalculationResult(serviceResult)
      } catch (error) {
        // Transform service errors into NavError format
        if (error instanceof Error) {
          throw {
            message: error.message,
            statusCode: 500,
            timestamp: new Date().toISOString()
          } as NavError
        }
        throw {
          message: 'Unknown calculation error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        } as NavError
      }
    },
    retry: (failureCount, error) => {
      // Don't retry client errors (4xx)
      const navError = error as NavError
      if (navError?.statusCode && navError.statusCode >= 400 && navError.statusCode < 500) {
        return false
      }
      return failureCount < retry
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, retryDelay),
    onSuccess: (data) => {
      setResult(data)
      onSuccess?.(data)
      
      // Invalidate related queries to refresh nav data
      queryClient.invalidateQueries({ queryKey: ['nav', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['nav', 'runs'] })
      queryClient.invalidateQueries({ queryKey: ['nav', 'overview'] })
    },
    onError: (error: NavError) => {
      onError?.(error)
    },
    onSettled: () => {
      onSettled?.()
    }
  })

  // Type-safe wrapper function for both simple and complex inputs
  const calculate = useCallback(async (input: NavCalculationInput) => {
    await mutation.mutateAsync(input)
  }, [mutation])

  // Validation for calculate button state
  const canCalculate = !mutation.isPending

  return {
    // State
    result: result || mutation.data || null,
    error: mutation.error as NavError | null,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    
    // Actions
    calculate,
    reset,
    
    // Utils
    canCalculate
  }
}

/**
 * Hook for batch NAV calculations
 * Useful for calculating multiple assets at once
 */
export function useBatchCalculateNav(options: UseCalculateNavOptions = {}) {
  const queryClient = useQueryClient()
  const [results, setResults] = useState<CalculationResult[]>([])
  const [errors, setErrors] = useState<NavError[]>([])

  const mutation = useMutation({
    mutationFn: async (requests: NavCalculationRequest[]): Promise<CalculationResult[]> => {
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

// Domain-specific hooks for different calculator types
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

export default useCalculateNav
