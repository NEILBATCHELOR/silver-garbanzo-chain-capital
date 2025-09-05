/**
 * Calculator Registry Configuration
 * Dynamic registry for NAV calculator components with lazy loading
 * Maps backend calculators to frontend components
 */

import { lazy, LazyExoticComponent, ComponentType } from 'react'
import { AssetType } from '@/types/nav'

// Lazy-loaded calculator components (will be created in subsequent phases)
const EquityCalculatorForm = lazy(() => import('./equity-calculator-form'))
const BondCalculatorForm = lazy(() => import('./bonds-calculator-form'))
const MmfCalculatorForm = lazy(() => import('./mmf-calculator-form'))
const CommoditiesCalculatorForm = lazy(() => import('./commodities-calculator-form'))
const PrivateEquityCalculatorForm = lazy(() => import('./private-equity-calculator-form'))
const PrivateDebtCalculatorForm = lazy(() => import('./private-debt-calculator-form'))
const RealEstateCalculatorForm = lazy(() => import('./real-estate-calculator-form'))
const InfrastructureCalculatorForm = lazy(() => import('./infrastructure-calculator-form'))
const EnergyCalculatorForm = lazy(() => import('./energy-calculator-form'))
const CollectiblesCalculatorForm = lazy(() => import('./collectibles-calculator-form'))
const AssetBackedCalculatorForm = lazy(() => import('./asset-backed-calculator-form'))
const StructuredProductCalculatorForm = lazy(() => import('./structured-product-calculator-form'))
const QuantitativeStrategiesCalculatorForm = lazy(() => import('./quantitative-strategies-calculator-form'))
const InvoiceReceivablesCalculatorForm = lazy(() => import('./invoice-receivables-calculator-form'))
const ClimateReceivablesCalculatorForm = lazy(() => import('./climate-receivables-calculator-form'))
const DigitalTokenizedFundCalculatorForm = lazy(() => import('./digital-tokenized-fund-calculator-form'))
const CompositeFundCalculatorForm = lazy(() => import('./composite-fund-calculator-form'))
const StablecoinFiatCalculatorForm = lazy(() => import('./stablecoin-fiat-calculator-form'))
const StablecoinCryptoCalculatorForm = lazy(() => import('./stablecoin-crypto-calculator-form'))

// Calculator form component interface
export interface CalculatorFormProps {
  onSubmit: (data: any) => void
  onReset: () => void
  isLoading?: boolean
  initialData?: any
  error?: string
}

export type CalculatorFormComponent = ComponentType<CalculatorFormProps>

// Calculator registry entry
export interface CalculatorRegistryEntry {
  id: string // Unique identifier/slug
  name: string
  description: string
  assetTypes: AssetType[]
  component: LazyExoticComponent<CalculatorFormComponent>
  category: string
  priority: number // For sorting in UI (higher = more prominent)
  enabled: boolean
  requiredPermissions?: string[]
  tags?: string[]
  complexityLevel: 'basic' | 'intermediate' | 'advanced'
  estimatedDuration?: string // e.g., "< 1 min", "1-5 min"
  features?: string[]
}

/**
 * Main calculator registry
 * Ordered by priority (highest first) and category
 */
export const CALCULATOR_REGISTRY: CalculatorRegistryEntry[] = [
  // BASIC ASSET CLASSES (Most commonly used)
  {
    id: 'equity',
    name: 'Equity Calculator',
    description: 'Calculate NAV for equity holdings with market price integration and corporate actions',
    assetTypes: [AssetType.EQUITY],
    component: EquityCalculatorForm,
    category: 'Basic Assets',
    priority: 100,
    enabled: true,
    requiredPermissions: ['nav:calculate'],
    tags: ['equity', 'stocks', 'shares'],
    complexityLevel: 'basic',
    estimatedDuration: '< 1 min',
    features: ['Market price lookup', 'Dividend adjustments', 'Corporate actions']
  },
  {
    id: 'bonds',
    name: 'Bond Calculator',
    description: 'Fixed income NAV with yield curve and credit spread adjustments',
    assetTypes: [AssetType.BONDS],
    component: BondCalculatorForm,
    category: 'Basic Assets', 
    priority: 95,
    enabled: true,
    requiredPermissions: ['nav:calculate'],
    tags: ['bonds', 'fixed-income', 'credit'],
    complexityLevel: 'intermediate',
    estimatedDuration: '1-2 min',
    features: ['Yield curve analysis', 'Credit spread adjustments', 'Accrued interest']
  },
  {
    id: 'mmf',
    name: 'Money Market Fund Calculator',
    description: 'MMF NAV calculation with SEC 2a-7 compliance and shadow pricing',
    assetTypes: [AssetType.MMF],
    component: MmfCalculatorForm,
    category: 'Basic Assets',
    priority: 90,
    enabled: true,
    requiredPermissions: ['nav:calculate'],
    tags: ['money-market', 'liquidity', 'SEC'],
    complexityLevel: 'intermediate',
    estimatedDuration: '1-2 min',
    features: ['SEC 2a-7 compliance', 'Shadow pricing', 'Weekly liquidity tests']
  },
  {
    id: 'commodities',
    name: 'Commodities Calculator', 
    description: 'Physical commodities NAV with storage costs and futures roll modeling',
    assetTypes: [AssetType.COMMODITIES],
    component: CommoditiesCalculatorForm,
    category: 'Basic Assets',
    priority: 85,
    enabled: true,
    requiredPermissions: ['nav:calculate'],
    tags: ['commodities', 'futures', 'storage'],
    complexityLevel: 'intermediate',
    estimatedDuration: '2-3 min',
    features: ['Storage cost modeling', 'Futures roll analysis', 'Contango/backwardation']
  },

  // ALTERNATIVE INVESTMENTS
  {
    id: 'private-equity',
    name: 'Private Equity Calculator',
    description: 'Private equity NAV with J-curve analysis and illiquidity adjustments',
    assetTypes: [AssetType.PRIVATE_EQUITY],
    component: PrivateEquityCalculatorForm,
    category: 'Alternative Investments',
    priority: 80,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:private_assets'],
    tags: ['private-equity', 'illiquid', 'j-curve'],
    complexityLevel: 'advanced',
    estimatedDuration: '3-5 min',
    features: ['J-curve modeling', 'Illiquidity discounts', 'Capital call projections']
  },
  {
    id: 'private-debt',
    name: 'Private Debt Calculator',
    description: 'Private debt NAV with credit risk and recovery rate analysis',
    assetTypes: [AssetType.PRIVATE_DEBT],
    component: PrivateDebtCalculatorForm,
    category: 'Alternative Investments',
    priority: 78,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:private_assets'],
    tags: ['private-debt', 'credit-risk', 'recovery'],
    complexityLevel: 'advanced',
    estimatedDuration: '3-5 min',
    features: ['Credit risk modeling', 'Recovery rate analysis', 'Default probability']
  },
  {
    id: 'real-estate',
    name: 'Real Estate Calculator',
    description: 'Real estate NAV using income, sales comparison, and cost approaches',
    assetTypes: [AssetType.REAL_ESTATE],
    component: RealEstateCalculatorForm,
    category: 'Alternative Investments', 
    priority: 75,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:real_estate'],
    tags: ['real-estate', 'property', 'cap-rate'],
    complexityLevel: 'intermediate',
    estimatedDuration: '2-4 min',
    features: ['Income approach', 'Sales comparison', 'Cost approach', 'Cap rate analysis']
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure Calculator',
    description: 'Infrastructure asset NAV with DCF modeling and regulatory assessment',
    assetTypes: [AssetType.INFRASTRUCTURE],
    component: InfrastructureCalculatorForm,
    category: 'Alternative Investments',
    priority: 72,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:infrastructure'],
    tags: ['infrastructure', 'dcf', 'regulatory'],
    complexityLevel: 'advanced',
    estimatedDuration: '4-6 min',
    features: ['DCF modeling', 'Regulatory risk assessment', 'Concession valuation']
  },

  // SPECIALIZED ASSETS
  {
    id: 'energy',
    name: 'Energy Calculator',
    description: 'Energy assets NAV with commodity exposure and weather risk modeling',
    assetTypes: [AssetType.ENERGY],
    component: EnergyCalculatorForm,
    category: 'Specialized Assets',
    priority: 70,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:energy'],
    tags: ['energy', 'commodities', 'weather'],
    complexityLevel: 'advanced',
    estimatedDuration: '3-5 min',
    features: ['Commodity price exposure', 'Weather risk modeling', 'Generation forecasting']
  },
  {
    id: 'structured-products',
    name: 'Structured Products Calculator',
    description: 'Structured products NAV with payoff modeling and scenario analysis',
    assetTypes: [AssetType.STRUCTURED_PRODUCTS],
    component: StructuredProductCalculatorForm,
    category: 'Specialized Assets',
    priority: 68,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:structured'],
    tags: ['structured', 'derivatives', 'payoff'],
    complexityLevel: 'advanced',
    estimatedDuration: '4-6 min',
    features: ['Payoff modeling', 'Scenario analysis', 'Barrier monitoring']
  },
  {
    id: 'quantitative-strategies',
    name: 'Quantitative Strategies Calculator',
    description: 'Quant strategies NAV with factor models and backtesting analysis',
    assetTypes: [AssetType.QUANT_STRATEGIES],
    component: QuantitativeStrategiesCalculatorForm,
    category: 'Specialized Assets',
    priority: 65,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:quant'],
    tags: ['quantitative', 'factors', 'backtesting'],
    complexityLevel: 'advanced',
    estimatedDuration: '3-5 min',
    features: ['Factor model analysis', 'Risk attribution', 'Performance attribution']
  },
  {
    id: 'collectibles',
    name: 'Collectibles Calculator',
    description: 'Collectibles NAV with auction data and authenticity assessment',
    assetTypes: [AssetType.COLLECTIBLES],
    component: CollectiblesCalculatorForm,
    category: 'Specialized Assets',
    priority: 60,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:collectibles'],
    tags: ['collectibles', 'auction', 'authenticity'],
    complexityLevel: 'intermediate',
    estimatedDuration: '2-3 min',
    features: ['Auction price analysis', 'Authenticity verification', 'Condition assessment']
  },

  // TOKENIZED & DIGITAL ASSETS
  {
    id: 'asset-backed',
    name: 'Asset-Backed Securities Calculator',
    description: 'ABS NAV with tranching analysis and credit enhancement modeling',
    assetTypes: [AssetType.ASSET_BACKED],
    component: AssetBackedCalculatorForm,
    category: 'Tokenized Assets',
    priority: 75,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:abs'],
    tags: ['abs', 'securitization', 'tranching'],
    complexityLevel: 'advanced',
    estimatedDuration: '4-6 min',
    features: ['Tranching analysis', 'Credit enhancement', 'Waterfall modeling']
  },
  {
    id: 'digital-tokenized-funds',
    name: 'Digital Tokenized Funds Calculator',
    description: 'Digital tokenized funds NAV with DeFi integration and smart contract risk',
    assetTypes: [AssetType.DIGITAL_TOKENIZED_FUNDS],
    component: DigitalTokenizedFundCalculatorForm,
    category: 'Tokenized Assets',
    priority: 70,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:digital'],
    tags: ['tokenized', 'defi', 'smart-contracts'],
    complexityLevel: 'advanced',
    estimatedDuration: '3-5 min',
    features: ['DeFi protocol integration', 'Smart contract risk', 'Token price oracles']
  },
  {
    id: 'stablecoin-fiat',
    name: 'Fiat-Backed Stablecoin Calculator',
    description: 'Fiat-backed stablecoin NAV with reserves analysis and regulatory compliance',
    assetTypes: [AssetType.STABLECOIN_FIAT_BACKED],
    component: StablecoinFiatCalculatorForm,
    category: 'Tokenized Assets',
    priority: 88,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:stablecoin'],
    tags: ['stablecoin', 'fiat', 'reserves'],
    complexityLevel: 'intermediate',
    estimatedDuration: '1-2 min',
    features: ['Reserve backing analysis', 'Regulatory compliance', 'Peg stability']
  },
  {
    id: 'stablecoin-crypto',
    name: 'Crypto-Backed Stablecoin Calculator',
    description: 'Crypto-backed stablecoin NAV with collateral analysis and liquidation risk',
    assetTypes: [AssetType.STABLECOIN_CRYPTO_BACKED],
    component: StablecoinCryptoCalculatorForm,
    category: 'Tokenized Assets',
    priority: 85,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:stablecoin'],
    tags: ['stablecoin', 'crypto', 'collateral'],
    complexityLevel: 'advanced',
    estimatedDuration: '2-4 min',
    features: ['Collateral analysis', 'Liquidation risk', 'Over-collateralization ratios']
  },

  // RECEIVABLES & CASH FLOWS
  {
    id: 'invoice-receivables',
    name: 'Invoice Receivables Calculator',
    description: 'Invoice receivables NAV with credit risk and collection timeline analysis',
    assetTypes: [AssetType.INVOICE_RECEIVABLES],
    component: InvoiceReceivablesCalculatorForm,
    category: 'Cash Flow Assets',
    priority: 65,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:receivables'],
    tags: ['receivables', 'invoices', 'credit-risk'],
    complexityLevel: 'intermediate',
    estimatedDuration: '2-3 min',
    features: ['Credit risk analysis', 'Collection modeling', 'Aging analysis']
  },
  {
    id: 'climate-receivables',
    name: 'Climate Receivables Calculator',
    description: 'Climate receivables NAV with carbon market data and ESG policy analysis',
    assetTypes: [AssetType.CLIMATE_RECEIVABLES],
    component: ClimateReceivablesCalculatorForm,
    category: 'Cash Flow Assets',
    priority: 62,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:climate'],
    tags: ['climate', 'carbon', 'esg'],
    complexityLevel: 'advanced',
    estimatedDuration: '3-5 min',
    features: ['Carbon price modeling', 'Policy risk assessment', 'ESG compliance']
  },

  // COMPOSITE STRATEGIES
  {
    id: 'composite-funds',
    name: 'Composite Funds Calculator',
    description: 'Multi-asset fund NAV with portfolio-level risk and correlation analysis',
    assetTypes: [AssetType.COMPOSITE_FUNDS],
    component: CompositeFundCalculatorForm,
    category: 'Composite Strategies',
    priority: 82,
    enabled: true,
    requiredPermissions: ['nav:calculate', 'nav:composite'],
    tags: ['composite', 'portfolio', 'correlation'],
    complexityLevel: 'advanced',
    estimatedDuration: '4-7 min',
    features: ['Multi-asset aggregation', 'Correlation analysis', 'Portfolio risk metrics']
  }
]

/**
 * Helper functions for calculator registry
 */

// Get calculator by ID
export const getCalculatorById = (id: string): CalculatorRegistryEntry | undefined => {
  return CALCULATOR_REGISTRY.find(calc => calc.id === id)
}

// Get calculator component by slug/ID
export const getCalculatorComponent = (slug: string): LazyExoticComponent<CalculatorFormComponent> | null => {
  const calculator = getCalculatorById(slug)
  return calculator ? calculator.component : null
}

// Get calculators by category
export const getCalculatorsByCategory = (category: string): CalculatorRegistryEntry[] => {
  return CALCULATOR_REGISTRY.filter(calc => calc.category === category && calc.enabled)
}

// Get calculators by asset type
export const getCalculatorsByAssetType = (assetType: AssetType): CalculatorRegistryEntry[] => {
  return CALCULATOR_REGISTRY.filter(calc => 
    calc.assetTypes.includes(assetType) && calc.enabled
  )
}

// Get all enabled calculators sorted by priority
export const getEnabledCalculators = (): CalculatorRegistryEntry[] => {
  return CALCULATOR_REGISTRY
    .filter(calc => calc.enabled)
    .sort((a, b) => b.priority - a.priority)
}

// Get calculators by complexity level
export const getCalculatorsByComplexity = (level: 'basic' | 'intermediate' | 'advanced'): CalculatorRegistryEntry[] => {
  return CALCULATOR_REGISTRY.filter(calc => 
    calc.complexityLevel === level && calc.enabled
  )
}

// Get all unique categories
export const getCalculatorCategories = (): string[] => {
  const categories = new Set(CALCULATOR_REGISTRY.map(calc => calc.category))
  return Array.from(categories).sort()
}

// Search calculators by name or tags
export const searchCalculators = (query: string): CalculatorRegistryEntry[] => {
  const lowercaseQuery = query.toLowerCase()
  return CALCULATOR_REGISTRY.filter(calc => {
    const matchesName = calc.name.toLowerCase().includes(lowercaseQuery)
    const matchesDescription = calc.description.toLowerCase().includes(lowercaseQuery)
    const matchesTags = calc.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    return calc.enabled && (matchesName || matchesDescription || matchesTags)
  })
}

// Check if user has permissions for calculator
export const hasCalculatorPermissions = (
  calculator: CalculatorRegistryEntry,
  userPermissions: string[]
): boolean => {
  if (!calculator.requiredPermissions?.length) return true
  return calculator.requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  )
}

// Get calculators available to user based on permissions
export const getAvailableCalculators = (userPermissions: string[]): CalculatorRegistryEntry[] => {
  return getEnabledCalculators().filter(calc => 
    hasCalculatorPermissions(calc, userPermissions)
  )
}

export default CALCULATOR_REGISTRY
