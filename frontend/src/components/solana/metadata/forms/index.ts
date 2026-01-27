/**
 * Asset Metadata Forms - Index
 * 
 * Export all asset-specific metadata forms
 * Organized by asset class per Chain Capital Metadata Specification v1.0.0
 */

// ============================================================================
// STRUCTURED PRODUCTS
// ============================================================================
export { AutocallableForm } from './AutocallableForm';
export { PrincipalProtectedNoteForm } from './PrincipalProtectedNoteForm';
export { ReverseConvertibleForm } from './ReverseConvertibleForm';

// ============================================================================
// EQUITY
// ============================================================================
export { CommonStockForm } from './CommonStockForm';
export { PrivateEquityForm } from './PrivateEquityForm';

// ============================================================================
// FIXED INCOME
// ============================================================================
export { CorporateBondForm } from './CorporateBondForm';
export { GovernmentBondForm } from './GovernmentBondForm';
export { CommercialPaperForm } from './CommercialPaperForm';
export { CreditLinkedNoteForm } from './CreditLinkedNoteForm';

// ============================================================================
// FUNDS
// ============================================================================
export { MutualFundForm } from './MutualFundForm';
export { MoneyMarketFundForm } from './MoneyMarketFundForm';
export { ETFForm } from './ETFForm';
export { ActivelyManagedCertificateForm } from './ActivelyManagedCertificateForm';

// ============================================================================
// COMMODITIES
// ============================================================================
export { CommoditySpotForm } from './CommoditySpotForm';
export { CommodityFuturesForm } from './CommodityFuturesForm';
export { TrackerCertificateForm } from './TrackerCertificateForm';

// ============================================================================
// ALTERNATIVE INVESTMENTS
// ============================================================================

// Private Equity & Debt
export { VentureCapitalFundForm } from './VentureCapitalFundForm';
export { DirectLendingForm } from './DirectLendingForm'; // Credit Fund

// Real Estate
export { CommercialRealEstateForm } from './CommercialRealEstateForm';
export { REITForm } from './REITForm';

// Infrastructure & Energy
export { InfrastructureAssetForm } from './InfrastructureAssetForm';
export { RenewableEnergyProjectForm } from './RenewableEnergyProjectForm';
export { OilGasAssetForm } from './OilGasAssetForm';

// Collectibles
export { CollectibleForm } from './CollectibleForm';

// ============================================================================
// DIGITAL NATIVE
// ============================================================================

// Stablecoins (5 types)
export { FiatBackedStablecoinForm } from './FiatBackedStablecoinForm';
export { CryptoBackedStablecoinForm } from './CryptoBackedStablecoinForm';
export { AlgorithmicStablecoinForm } from './AlgorithmicStablecoinForm';
export { RebasingStablecoinForm } from './RebasingStablecoinForm';
export { CommodityBackedStablecoinForm } from './CommodityBackedStablecoinForm';

// Climate Finance
export { CarbonCreditForm } from './CarbonCreditForm';
export { RenewableEnergyCertificateForm } from './RenewableEnergyCertificateForm';

// Invoice Receivables
export { InvoiceReceivableForm } from './InvoiceReceivableForm';

/**
 * Form Completion Status:
 * 
 * ✅ ALL FORMS IMPLEMENTED (32 forms total):
 * 
 * STRUCTURED PRODUCTS (3):
 * - Autocallable
 * - Principal Protected Note
 * - Reverse Convertible
 * 
 * EQUITY (2):
 * - Common Stock
 * - Private Equity
 * 
 * FIXED INCOME (4):
 * - Corporate Bond
 * - Government Bond ✅ NEW
 * - Commercial Paper ✅ NEW
 * - Credit-Linked Note ✅ NEW
 * 
 * FUNDS (4):
 * - Mutual Fund
 * - Money Market Fund
 * - ETF
 * - Actively Managed Certificate ✅ NEW
 * 
 * COMMODITIES (3):
 * - Commodity Spot
 * - Commodity Futures ✅ NEW
 * - Tracker Certificate ✅ NEW
 * 
 * ALTERNATIVE INVESTMENTS (8):
 * - Venture Capital Fund ✅ NEW
 * - Direct Lending (Credit Fund)
 * - Commercial Real Estate
 * - REIT ✅ NEW
 * - Infrastructure Asset ✅ NEW
 * - Renewable Energy Project ✅ NEW
 * - Oil & Gas Asset ✅ NEW
 * - Collectible ✅ NEW
 * 
 * DIGITAL NATIVE (8):
 * - Fiat-Backed Stablecoin
 * - Crypto-Backed Stablecoin ✅ NEW
 * - Algorithmic Stablecoin ✅ NEW
 * - Rebasing Stablecoin ✅ NEW
 * - Commodity-Backed Stablecoin ✅ NEW
 * - Carbon Credit
 * - Renewable Energy Certificate ✅ NEW
 * - Invoice Receivable
 * 
 * ✅ NEW: 17 forms added
 * ✅ COMPLETE: 100% coverage of all asset classes
 */
