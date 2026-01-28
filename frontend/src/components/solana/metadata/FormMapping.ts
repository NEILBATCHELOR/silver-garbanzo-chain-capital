/**
 * Form Mapping Configuration
 * 
 * Maps asset classes and instrument types to their corresponding forms
 * Used by AssetMetadataWizard to route to correct form component
 */

import type { AssetClass } from '@/services/tokens/metadata';

// ============================================================================
// FORM COMPONENT TYPE
// ============================================================================

export interface FormComponentInfo {
  component: string; // Component name (for dynamic import)
  label: string;     // Display name
  description: string;
}

// ============================================================================
// INSTRUMENT TYPE MAPPINGS BY ASSET CLASS
// ============================================================================

export interface InstrumentTypeOption {
  value: string;
  label: string;
  description: string;
  formComponent: string;
}

// Structured Products
export const STRUCTURED_PRODUCT_TYPES: InstrumentTypeOption[] = [
  {
    value: 'autocallable',
    label: 'Autocallable',
    description: 'Early redemption with barrier protection',
    formComponent: 'AutocallableForm'
  },
  {
    value: 'principal_protected_note',
    label: 'Principal Protected Note',
    description: '100% capital guarantee at maturity',
    formComponent: 'PrincipalProtectedNoteForm'
  },
  {
    value: 'reverse_convertible',
    label: 'Reverse Convertible',
    description: 'High yield with potential equity conversion',
    formComponent: 'ReverseConvertibleForm'
  }
];

// Equity
export const EQUITY_TYPES: InstrumentTypeOption[] = [
  {
    value: 'common_stock',
    label: 'Common Stock',
    description: 'Public company equity',
    formComponent: 'CommonStockForm'
  },
  {
    value: 'private_equity',
    label: 'Private Equity',
    description: 'Private company ownership',
    formComponent: 'PrivateEquityForm'
  }
];

// Fixed Income
export const FIXED_INCOME_TYPES: InstrumentTypeOption[] = [
  {
    value: 'corporate_bond',
    label: 'Corporate Bond',
    description: 'Corporate debt securities',
    formComponent: 'CorporateBondForm'
  },
  {
    value: 'government_bond',
    label: 'Government Bond',
    description: 'Sovereign debt securities',
    formComponent: 'GovernmentBondForm'
  },
  {
    value: 'commercial_paper',
    label: 'Commercial Paper',
    description: 'Short-term corporate debt',
    formComponent: 'CommercialPaperForm'
  },
  {
    value: 'credit_linked_note',
    label: 'Credit-Linked Note',
    description: 'Debt with credit derivative',
    formComponent: 'CreditLinkedNoteForm'
  }
];

// Funds
export const FUND_TYPES: InstrumentTypeOption[] = [
  {
    value: 'mutual_fund',
    label: 'Mutual Fund',
    description: 'Pooled investment fund',
    formComponent: 'MutualFundForm'
  },
  {
    value: 'money_market_fund',
    label: 'Money Market Fund',
    description: 'Short-term money market fund',
    formComponent: 'MoneyMarketFundForm'
  },
  {
    value: 'etf',
    label: 'ETF',
    description: 'Exchange-traded fund',
    formComponent: 'ETFForm'
  },
  {
    value: 'actively_managed_certificate',
    label: 'Actively Managed Certificate',
    description: 'Actively traded certificate',
    formComponent: 'ActivelyManagedCertificateForm'
  }
];

// Commodities
export const COMMODITY_TYPES: InstrumentTypeOption[] = [
  {
    value: 'commodity_spot',
    label: 'Commodity Spot',
    description: 'Physical commodity ownership',
    formComponent: 'CommoditySpotForm'
  },
  {
    value: 'commodity_futures',
    label: 'Commodity Futures',
    description: 'Commodity futures contract',
    formComponent: 'CommodityFuturesForm'
  },
  {
    value: 'tracker_certificate',
    label: 'Tracker Certificate',
    description: 'Basket tracking certificate',
    formComponent: 'TrackerCertificateForm'
  }
];

// Alternative Investments
export const ALTERNATIVE_TYPES: InstrumentTypeOption[] = [
  {
    value: 'venture_capital_fund',
    label: 'Venture Capital Fund',
    description: 'Early-stage investment fund',
    formComponent: 'VentureCapitalFundForm'
  },
  {
    value: 'direct_lending',
    label: 'Direct Lending / Credit Fund',
    description: 'Private debt fund',
    formComponent: 'DirectLendingForm'
  },
  {
    value: 'commercial_real_estate',
    label: 'Commercial Real Estate',
    description: 'Commercial property token',
    formComponent: 'CommercialRealEstateForm'
  },
  {
    value: 'reit',
    label: 'REIT',
    description: 'Real estate investment trust',
    formComponent: 'REITForm'
  },
  {
    value: 'infrastructure_asset',
    label: 'Infrastructure Asset',
    description: 'Infrastructure project token',
    formComponent: 'InfrastructureAssetForm'
  },
  {
    value: 'renewable_energy_project',
    label: 'Renewable Energy Project',
    description: 'Solar/wind energy project',
    formComponent: 'RenewableEnergyProjectForm'
  },
  {
    value: 'oil_gas_asset',
    label: 'Oil & Gas Asset',
    description: 'Traditional energy asset',
    formComponent: 'OilGasAssetForm'
  },
  {
    value: 'collectible',
    label: 'Collectible',
    description: 'Art, wine, cars, etc.',
    formComponent: 'CollectibleForm'
  }
];

// Digital Native
export const DIGITAL_NATIVE_TYPES: InstrumentTypeOption[] = [
  {
    value: 'stablecoin_fiat',
    label: 'Fiat-Backed Stablecoin',
    description: '1:1 fiat currency backed',
    formComponent: 'FiatBackedStablecoinForm'
  },
  {
    value: 'stablecoin_crypto',
    label: 'Crypto-Backed Stablecoin',
    description: 'Overcollateralized by crypto',
    formComponent: 'CryptoBackedStablecoinForm'
  },
  {
    value: 'stablecoin_algorithmic',
    label: 'Algorithmic Stablecoin',
    description: 'Non-collateralized algorithmic',
    formComponent: 'AlgorithmicStablecoinForm'
  },
  {
    value: 'stablecoin_rebasing',
    label: 'Rebasing Stablecoin',
    description: 'Elastic supply stablecoin',
    formComponent: 'RebasingStablecoinForm'
  },
  {
    value: 'stablecoin_commodity',
    label: 'Commodity-Backed Stablecoin',
    description: 'Backed by physical commodities',
    formComponent: 'CommodityBackedStablecoinForm'
  },
  {
    value: 'carbon_credit',
    label: 'Carbon Credit',
    description: 'Verified carbon offset',
    formComponent: 'CarbonCreditForm'
  },
  {
    value: 'renewable_energy_certificate',
    label: 'Renewable Energy Certificate',
    description: 'Renewable energy credit',
    formComponent: 'RenewableEnergyCertificateForm'
  },
  {
    value: 'invoice_receivable',
    label: 'Invoice Receivable',
    description: 'Invoice factoring token',
    formComponent: 'InvoiceReceivableForm'
  }
];

// ============================================================================
// MASTER MAPPING
// ============================================================================

export const ASSET_CLASS_INSTRUMENT_TYPES: Record<AssetClass, InstrumentTypeOption[]> = {
  structured_product: STRUCTURED_PRODUCT_TYPES,
  equity: EQUITY_TYPES,
  fixed_income: FIXED_INCOME_TYPES,
  fund: FUND_TYPES,
  commodity: COMMODITY_TYPES,
  alternative: ALTERNATIVE_TYPES,
  digital_native: DIGITAL_NATIVE_TYPES
};

/**
 * Get available instrument types for an asset class
 */
export function getInstrumentTypes(assetClass: AssetClass): InstrumentTypeOption[] {
  return ASSET_CLASS_INSTRUMENT_TYPES[assetClass] || [];
}

/**
 * Get form component for an instrument type
 */
export function getFormComponent(assetClass: AssetClass, instrumentType: string): string | null {
  const types = ASSET_CLASS_INSTRUMENT_TYPES[assetClass];
  const type = types?.find(t => t.value === instrumentType);
  return type?.formComponent || null;
}

/**
 * Check if an asset class has multiple instrument types
 */
export function hasMultipleTypes(assetClass: AssetClass): boolean {
  const types = ASSET_CLASS_INSTRUMENT_TYPES[assetClass];
  return types ? types.length > 1 : false;
}
