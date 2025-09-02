/**
 * Example File Registry
 * 
 * Service for accessing token JSON examples from the examples folder using static imports
 */

import { TokenStandard } from '@/types/core/centralModels';

// Import all JSON files statically
// Alternative Assets - Asset Backed Receivables
import altAssetBackedErc1400SecurityToken from '../examples/alternative-assets/asset-backed-receivables/alternative/erc1400-security-token.json';
import altAssetBackedErc20EnhancedLiquidity from '../examples/alternative-assets/asset-backed-receivables/alternative/erc20-enhanced-liquidity-token.json';
import altAssetBackedErc3525SemiFungible from '../examples/alternative-assets/asset-backed-receivables/alternative/erc3525-semi-fungible-token.json';
import priAssetBackedErc1400SecurityToken from '../examples/alternative-assets/asset-backed-receivables/primary/erc1400-security-token.json';
import priAssetBackedErc20Liquidity from '../examples/alternative-assets/asset-backed-receivables/primary/erc20-liquidity-token.json';

// Alternative Assets - Carbon Credits  
import altCarbonErc20Fungible from '../examples/alternative-assets/carbon-credits/alternative/erc20-fungible-token.json';
import priCarbonErc1155Multi from '../examples/alternative-assets/carbon-credits/primary/erc1155-multi-token.json';
import priCarbonErc20Liquidity from '../examples/alternative-assets/carbon-credits/primary/erc20-liquidity-token.json';

// Alternative Assets - Collectibles Other
import altCollectiblesErc20DiamondLiquidity from '../examples/alternative-assets/collectibles-other/alternative/erc20-diamond-liquidity.json';
import altCollectiblesErc721DiamondCollection from '../examples/alternative-assets/collectibles-other/alternative/erc721-diamond-collection.json';
import priCollectiblesErc1155Premium from '../examples/alternative-assets/collectibles-other/primary/erc1155-premium-collectibles.json';
import priCollectiblesErc20Liquidity from '../examples/alternative-assets/collectibles-other/primary/erc20-collectibles-liquidity.json';
import priCollectiblesErc721LuxuryWatches from '../examples/alternative-assets/collectibles-other/primary/erc721-luxury-watches.json';

// Alternative Assets - Energy
import altEnergyErc1400SolarFarmInvestment from '../examples/alternative-assets/energy/alternative/erc1400-solar-farm-investment.json';
import altEnergyErc20SolarFarmLiquidity from '../examples/alternative-assets/energy/alternative/erc20-solar-farm-liquidity.json';
import priEnergyErc1155EnergyCertificates from '../examples/alternative-assets/energy/primary/erc1155-energy-certificates.json';
import priEnergyErc1400SolarFarmSecurity from '../examples/alternative-assets/energy/primary/erc1400-solar-farm-security-token.json';
import priEnergyErc20Liquidity from '../examples/alternative-assets/energy/primary/erc20-liquidity-token.json';

// Alternative Assets - Infrastructure
import altInfrastructureErc1400FiberNetwork from '../examples/alternative-assets/infrastructure/alternative/erc1400-fiber-network.json';
import altInfrastructureErc20FiberLiquidity from '../examples/alternative-assets/infrastructure/alternative/erc20-fiber-liquidity.json';
import priInfrastructureErc1400BridgeInfrastructure from '../examples/alternative-assets/infrastructure/primary/erc1400-bridge-infrastructure.json';
import priInfrastructureErc20BridgeLiquidity from '../examples/alternative-assets/infrastructure/primary/erc20-bridge-liquidity.json';
import priInfrastructureErc3525BridgePhases from '../examples/alternative-assets/infrastructure/primary/erc3525-bridge-phases.json';

// Alternative Assets - Private Debt
import altPrivateDebtErc1400Security from '../examples/alternative-assets/private-debt/alternative/erc1400-security-token.json';
import altPrivateDebtErc20Liquidity from '../examples/alternative-assets/private-debt/alternative/erc20-liquidity-token.json';
import altPrivateDebtErc3525SemiFungible from '../examples/alternative-assets/private-debt/alternative/erc3525-semi-fungible-token.json';
import priPrivateDebtErc1400Security from '../examples/alternative-assets/private-debt/primary/erc1400-security-token.json';
import priPrivateDebtErc20Liquidity from '../examples/alternative-assets/private-debt/primary/erc20-liquidity-token.json';

// Alternative Assets - Private Equity
import altPrivateEquityErc1400ApolloMaster from '../examples/alternative-assets/private-equity/alternative/erc1400-apollo-pe-master-fund.json';
import altPrivateEquityErc20ApolloLiquid from '../examples/alternative-assets/private-equity/alternative/erc20-apollo-pe-liquid-fractions.json';
import altPrivateEquityErc3525ApolloStrategy from '../examples/alternative-assets/private-equity/alternative/erc3525-apollo-pe-strategy-fractions.json';
import priPrivateEquityErc1400KkrFund from '../examples/alternative-assets/private-equity/primary/erc1400-kkr-pe-fund-xvi.json';
import priPrivateEquityErc20LiquidPe from '../examples/alternative-assets/private-equity/primary/erc20-liquid-pe-token.json';

// Alternative Assets - Real Estate
import altRealEstateErc1400Security from '../examples/alternative-assets/real-estate/alternative/erc1400-security-token.json';
import altRealEstateErc20Liquidity from '../examples/alternative-assets/real-estate/alternative/erc20-liquidity-token.json';
import priRealEstateErc1400Security from '../examples/alternative-assets/real-estate/primary/erc1400-security-token.json';
import priRealEstateErc20Liquidity from '../examples/alternative-assets/real-estate/primary/erc20-liquidity-token.json';
import priRealEstateErc3525SemiFungible from '../examples/alternative-assets/real-estate/primary/erc3525-semi-fungible-token.json';

// Alternative Assets - Solar Wind Energy Climate Receivables
import altSolarWindErc1400Security from '../examples/alternative-assets/solar-wind-energy-climate-receivables/alternative/erc1400-security-token.json';
import altSolarWindErc20Liquidity from '../examples/alternative-assets/solar-wind-energy-climate-receivables/alternative/erc20-liquidity-token.json';
import priSolarWindErc1155Multi from '../examples/alternative-assets/solar-wind-energy-climate-receivables/primary/erc1155-multi-token.json';
import priSolarWindErc1400Security from '../examples/alternative-assets/solar-wind-energy-climate-receivables/primary/erc1400-security-token.json';
import priSolarWindErc20Liquidity from '../examples/alternative-assets/solar-wind-energy-climate-receivables/primary/erc20-liquidity-token.json';

// Digital Assets - Digital Tokenised Fund
import altDigitalFundErc20Liquidity from '../examples/digital-assets/digital-tokenised-fund/alternative/erc20-liquidity-token.json';
import altDigitalFundErc4626Vault from '../examples/digital-assets/digital-tokenised-fund/alternative/erc4626-vault-token.json';
import priDigitalFundErc1400Security from '../examples/digital-assets/digital-tokenised-fund/primary/erc1400-security-token.json';
import priDigitalFundErc20Liquidity from '../examples/digital-assets/digital-tokenised-fund/primary/erc20-liquidity-token.json';
import priDigitalFundErc4626Vault from '../examples/digital-assets/digital-tokenised-fund/primary/erc4626-vault-token.json';

// Stablecoins - Algorithmic
import altAlgorithmicErc20Liquidity from '../examples/stablecoins/algorithmic/alternative/erc20-liquidity-token.json';
import altAlgorithmicErc20Seigniorage from '../examples/stablecoins/algorithmic/alternative/erc20-seigniorage-stablecoin.json';
import altAlgorithmicErc4626Fractional from '../examples/stablecoins/algorithmic/alternative/erc4626-fractional-stablecoin.json';
import priAlgorithmicErc20Liquidity from '../examples/stablecoins/algorithmic/primary/erc20-liquidity-token.json';
import priAlgorithmicErc20Rebasing from '../examples/stablecoins/algorithmic/primary/erc20-rebasing-stablecoin.json';

// Stablecoins - Commodity Backed
import altCommodityErc1400FractionalGold from '../examples/stablecoins/commodity-backed/alternative/erc1400-fractional-gold.json';
import altCommodityErc20Liquidity from '../examples/stablecoins/commodity-backed/alternative/erc20-liquidity-token.json';
import altCommodityErc3525GoldFractions from '../examples/stablecoins/commodity-backed/alternative/erc3525-gold-fractions.json';
import priCommodityErc1400GoldStablecoin from '../examples/stablecoins/commodity-backed/primary/erc1400-gold-stablecoin.json';
import priCommodityErc20Liquidity from '../examples/stablecoins/commodity-backed/primary/erc20-liquidity-token.json';

// Stablecoins - Crypto Backed
import altCryptoErc20Liquidity from '../examples/stablecoins/crypto-backed/alternative/erc20-liquidity-token.json';
import altCryptoErc4626YieldStablecoin from '../examples/stablecoins/crypto-backed/alternative/erc4626-yield-stablecoin.json';
import priCryptoErc1400CryptoStablecoin from '../examples/stablecoins/crypto-backed/primary/erc1400-crypto-stablecoin.json';
import priCryptoErc20Liquidity from '../examples/stablecoins/crypto-backed/primary/erc20-liquidity-token.json';
import priCryptoErc4626Vault from '../examples/stablecoins/crypto-backed/primary/erc4626-vault-token.json';

// Stablecoins - Fiat Backed
import altFiatErc1400RegulatedStablecoin from '../examples/stablecoins/fiat-backed/alternative/erc1400-regulated-stablecoin.json';
import altFiatErc20Liquidity from '../examples/stablecoins/fiat-backed/alternative/erc20-liquidity-token.json';
import priFiatErc20FiatStablecoin from '../examples/stablecoins/fiat-backed/primary/erc20-fiat-stablecoin.json';
import priFiatErc20Liquidity from '../examples/stablecoins/fiat-backed/primary/erc20-liquidity-token.json';

// Traditional Assets - Bonds
import altBondsErc1400CorporateBond from '../examples/traditional-assets/bonds/alternative/erc1400-corporate-bond.json';
import altBondsErc20LiquidCorporateBond from '../examples/traditional-assets/bonds/alternative/erc20-liquid-corporate-bond-token.json';
import altBondsErc3525BondTranches from '../examples/traditional-assets/bonds/alternative/erc3525-bond-tranches.json';
import priBondsErc1400UsTreasuryBond from '../examples/traditional-assets/bonds/primary/erc1400-us-treasury-bond.json';
import priBondsErc20LiquidTreasuryBond from '../examples/traditional-assets/bonds/primary/erc20-liquid-treasury-bond-token.json';

// Traditional Assets - Commodities
import altCommoditiesErc20CarbonCredits from '../examples/traditional-assets/commodities/alternative/erc20-carbon-credits-token.json';
import altCommoditiesErc20Oil from '../examples/traditional-assets/commodities/alternative/erc20-oil-token.json';
import priCommoditiesErc1155Token from '../examples/traditional-assets/commodities/primary/erc1155-token.json';
import priCommoditiesErc20Liquidity from '../examples/traditional-assets/commodities/primary/erc20-liquidity-token.json';

// Traditional Assets - Equity
import altEquityErc1400Base from '../examples/traditional-assets/equity/alternative/erc1400-base-token.json';
import altEquityErc20Liquidity from '../examples/traditional-assets/equity/alternative/erc20-liquidity-token.json';
import altEquityErc3525ShareClasses from '../examples/traditional-assets/equity/alternative/erc3525-share-classes-token.json';
import priEquityErc1400Token from '../examples/traditional-assets/equity/primary/erc1400-token.json';
import priEquityErc20Liquidity from '../examples/traditional-assets/equity/primary/erc20-liquidity-token.json';

// Traditional Assets - Funds ETFs ETPs
import altFundsErc20TreasuryVaultShare from '../examples/traditional-assets/funds-etfs-etps/alternative/erc20-treasury-vault-share-token.json';
import altFundsErc4626DigitalTreasuryVault from '../examples/traditional-assets/funds-etfs-etps/alternative/erc4626-digital-treasury-vault.json';
import priFundsErc1400InstitutionalTreasuryFund from '../examples/traditional-assets/funds-etfs-etps/primary/erc1400-institutional-treasury-fund.json';
import priFundsErc20LiquidTreasuryFund from '../examples/traditional-assets/funds-etfs-etps/primary/erc20-liquid-treasury-fund-token.json';
import priFundsErc4626TreasuryYieldVault from '../examples/traditional-assets/funds-etfs-etps/primary/erc4626-treasury-yield-vault.json';

// Traditional Assets - Quantitative Strategies
import altQuantErc20LiquidAlpha from '../examples/traditional-assets/quantitative-strategies/alternative/erc20-liquid-alpha-token.json';
import altQuantErc4626MlAlphaVault from '../examples/traditional-assets/quantitative-strategies/alternative/erc4626-ml-alpha-vault.json';
import priQuantErc1400SystematicMultiFactor from '../examples/traditional-assets/quantitative-strategies/primary/erc1400-systematic-multi-factor-fund.json';
import priQuantErc20LiquidQuantitative from '../examples/traditional-assets/quantitative-strategies/primary/erc20-liquid-quantitative-token.json';
import priQuantErc4626QuantitativeYieldVault from '../examples/traditional-assets/quantitative-strategies/primary/erc4626-quantitative-yield-vault.json';

// Traditional Assets - Structured Products
import altStructuredErc1400Base from '../examples/traditional-assets/structured-products/alternative/erc1400-base-token.json';
import altStructuredErc20Liquidity from '../examples/traditional-assets/structured-products/alternative/erc20-liquidity-token.json';
import altStructuredErc3525Tranches from '../examples/traditional-assets/structured-products/alternative/erc3525-tranches-token.json';
import priStructuredErc1400SwissAutoCallable from '../examples/traditional-assets/structured-products/primary/erc1400-swiss-auto-callable-note.json';
import priStructuredErc1400Token from '../examples/traditional-assets/structured-products/primary/erc1400-token.json';
import priStructuredErc20Liquidity from '../examples/traditional-assets/structured-products/primary/erc20-liquidity-token.json';
import priStructuredErc20LiquidityWrapper from '../examples/traditional-assets/structured-products/primary/erc20-liquidity-wrapper.json';

// Types
export interface ExampleFileItem {
  name: string;
  path: string;
  assetType: string;
  category: 'primary' | 'alternative';
  tokenStandard: TokenStandard;
  displayName: string;
  content: any;
}

export interface ExampleFileResult {
  content: string;
  tokenStandard: TokenStandard;
  configMode: 'min' | 'max';
}

// File registry mapping
const FILE_REGISTRY: Record<string, any> = {
  // Alternative Assets - Asset Backed Receivables
  'alternative-assets/asset-backed-receivables/alternative/erc1400-security-token.json': altAssetBackedErc1400SecurityToken,
  'alternative-assets/asset-backed-receivables/alternative/erc20-enhanced-liquidity-token.json': altAssetBackedErc20EnhancedLiquidity,
  'alternative-assets/asset-backed-receivables/alternative/erc3525-semi-fungible-token.json': altAssetBackedErc3525SemiFungible,
  'alternative-assets/asset-backed-receivables/primary/erc1400-security-token.json': priAssetBackedErc1400SecurityToken,
  'alternative-assets/asset-backed-receivables/primary/erc20-liquidity-token.json': priAssetBackedErc20Liquidity,
  
  // Alternative Assets - Carbon Credits
  'alternative-assets/carbon-credits/alternative/erc20-fungible-token.json': altCarbonErc20Fungible,
  'alternative-assets/carbon-credits/primary/erc1155-multi-token.json': priCarbonErc1155Multi,
  'alternative-assets/carbon-credits/primary/erc20-liquidity-token.json': priCarbonErc20Liquidity,
  
  // Alternative Assets - Collectibles Other
  'alternative-assets/collectibles-other/alternative/erc20-diamond-liquidity.json': altCollectiblesErc20DiamondLiquidity,
  'alternative-assets/collectibles-other/alternative/erc721-diamond-collection.json': altCollectiblesErc721DiamondCollection,
  'alternative-assets/collectibles-other/primary/erc1155-premium-collectibles.json': priCollectiblesErc1155Premium,
  'alternative-assets/collectibles-other/primary/erc20-collectibles-liquidity.json': priCollectiblesErc20Liquidity,
  'alternative-assets/collectibles-other/primary/erc721-luxury-watches.json': priCollectiblesErc721LuxuryWatches,
  
  // Alternative Assets - Energy
  'alternative-assets/energy/alternative/erc1400-solar-farm-investment.json': altEnergyErc1400SolarFarmInvestment,
  'alternative-assets/energy/alternative/erc20-solar-farm-liquidity.json': altEnergyErc20SolarFarmLiquidity,
  'alternative-assets/energy/primary/erc1155-energy-certificates.json': priEnergyErc1155EnergyCertificates,
  'alternative-assets/energy/primary/erc1400-solar-farm-security-token.json': priEnergyErc1400SolarFarmSecurity,
  'alternative-assets/energy/primary/erc20-liquidity-token.json': priEnergyErc20Liquidity,
  
  // Alternative Assets - Infrastructure
  'alternative-assets/infrastructure/alternative/erc1400-fiber-network.json': altInfrastructureErc1400FiberNetwork,
  'alternative-assets/infrastructure/alternative/erc20-fiber-liquidity.json': altInfrastructureErc20FiberLiquidity,
  'alternative-assets/infrastructure/primary/erc1400-bridge-infrastructure.json': priInfrastructureErc1400BridgeInfrastructure,
  'alternative-assets/infrastructure/primary/erc20-bridge-liquidity.json': priInfrastructureErc20BridgeLiquidity,
  'alternative-assets/infrastructure/primary/erc3525-bridge-phases.json': priInfrastructureErc3525BridgePhases,
  
  // Alternative Assets - Private Debt
  'alternative-assets/private-debt/alternative/erc1400-security-token.json': altPrivateDebtErc1400Security,
  'alternative-assets/private-debt/alternative/erc20-liquidity-token.json': altPrivateDebtErc20Liquidity,
  'alternative-assets/private-debt/alternative/erc3525-semi-fungible-token.json': altPrivateDebtErc3525SemiFungible,
  'alternative-assets/private-debt/primary/erc1400-security-token.json': priPrivateDebtErc1400Security,
  'alternative-assets/private-debt/primary/erc20-liquidity-token.json': priPrivateDebtErc20Liquidity,
  
  // Alternative Assets - Private Equity
  'alternative-assets/private-equity/alternative/erc1400-apollo-pe-master-fund.json': altPrivateEquityErc1400ApolloMaster,
  'alternative-assets/private-equity/alternative/erc20-apollo-pe-liquid-fractions.json': altPrivateEquityErc20ApolloLiquid,
  'alternative-assets/private-equity/alternative/erc3525-apollo-pe-strategy-fractions.json': altPrivateEquityErc3525ApolloStrategy,
  'alternative-assets/private-equity/primary/erc1400-kkr-pe-fund-xvi.json': priPrivateEquityErc1400KkrFund,
  'alternative-assets/private-equity/primary/erc20-liquid-pe-token.json': priPrivateEquityErc20LiquidPe,
  
  // Alternative Assets - Real Estate
  'alternative-assets/real-estate/alternative/erc1400-security-token.json': altRealEstateErc1400Security,
  'alternative-assets/real-estate/alternative/erc20-liquidity-token.json': altRealEstateErc20Liquidity,
  'alternative-assets/real-estate/primary/erc1400-security-token.json': priRealEstateErc1400Security,
  'alternative-assets/real-estate/primary/erc20-liquidity-token.json': priRealEstateErc20Liquidity,
  'alternative-assets/real-estate/primary/erc3525-semi-fungible-token.json': priRealEstateErc3525SemiFungible,
  
  // Alternative Assets - Solar Wind Energy Climate Receivables
  'alternative-assets/solar-wind-energy-climate-receivables/alternative/erc1400-security-token.json': altSolarWindErc1400Security,
  'alternative-assets/solar-wind-energy-climate-receivables/alternative/erc20-liquidity-token.json': altSolarWindErc20Liquidity,
  'alternative-assets/solar-wind-energy-climate-receivables/primary/erc1155-multi-token.json': priSolarWindErc1155Multi,
  'alternative-assets/solar-wind-energy-climate-receivables/primary/erc1400-security-token.json': priSolarWindErc1400Security,
  'alternative-assets/solar-wind-energy-climate-receivables/primary/erc20-liquidity-token.json': priSolarWindErc20Liquidity,
  
  // Digital Assets - Digital Tokenised Fund
  'digital-assets/digital-tokenised-fund/alternative/erc20-liquidity-token.json': altDigitalFundErc20Liquidity,
  'digital-assets/digital-tokenised-fund/alternative/erc4626-vault-token.json': altDigitalFundErc4626Vault,
  'digital-assets/digital-tokenised-fund/primary/erc1400-security-token.json': priDigitalFundErc1400Security,
  'digital-assets/digital-tokenised-fund/primary/erc20-liquidity-token.json': priDigitalFundErc20Liquidity,
  'digital-assets/digital-tokenised-fund/primary/erc4626-vault-token.json': priDigitalFundErc4626Vault,
  
  // Stablecoins - Algorithmic
  'stablecoins/algorithmic/alternative/erc20-liquidity-token.json': altAlgorithmicErc20Liquidity,
  'stablecoins/algorithmic/alternative/erc20-seigniorage-stablecoin.json': altAlgorithmicErc20Seigniorage,
  'stablecoins/algorithmic/alternative/erc4626-fractional-stablecoin.json': altAlgorithmicErc4626Fractional,
  'stablecoins/algorithmic/primary/erc20-liquidity-token.json': priAlgorithmicErc20Liquidity,
  'stablecoins/algorithmic/primary/erc20-rebasing-stablecoin.json': priAlgorithmicErc20Rebasing,
  
  // Stablecoins - Commodity Backed
  'stablecoins/commodity-backed/alternative/erc1400-fractional-gold.json': altCommodityErc1400FractionalGold,
  'stablecoins/commodity-backed/alternative/erc20-liquidity-token.json': altCommodityErc20Liquidity,
  'stablecoins/commodity-backed/alternative/erc3525-gold-fractions.json': altCommodityErc3525GoldFractions,
  'stablecoins/commodity-backed/primary/erc1400-gold-stablecoin.json': priCommodityErc1400GoldStablecoin,
  'stablecoins/commodity-backed/primary/erc20-liquidity-token.json': priCommodityErc20Liquidity,
  
  // Stablecoins - Crypto Backed
  'stablecoins/crypto-backed/alternative/erc20-liquidity-token.json': altCryptoErc20Liquidity,
  'stablecoins/crypto-backed/alternative/erc4626-yield-stablecoin.json': altCryptoErc4626YieldStablecoin,
  'stablecoins/crypto-backed/primary/erc1400-crypto-stablecoin.json': priCryptoErc1400CryptoStablecoin,
  'stablecoins/crypto-backed/primary/erc20-liquidity-token.json': priCryptoErc20Liquidity,
  'stablecoins/crypto-backed/primary/erc4626-vault-token.json': priCryptoErc4626Vault,
  
  // Stablecoins - Fiat Backed
  'stablecoins/fiat-backed/alternative/erc1400-regulated-stablecoin.json': altFiatErc1400RegulatedStablecoin,
  'stablecoins/fiat-backed/alternative/erc20-liquidity-token.json': altFiatErc20Liquidity,
  'stablecoins/fiat-backed/primary/erc20-fiat-stablecoin.json': priFiatErc20FiatStablecoin,
  'stablecoins/fiat-backed/primary/erc20-liquidity-token.json': priFiatErc20Liquidity,
  
  // Traditional Assets - Bonds
  'traditional-assets/bonds/alternative/erc1400-corporate-bond.json': altBondsErc1400CorporateBond,
  'traditional-assets/bonds/alternative/erc20-liquid-corporate-bond-token.json': altBondsErc20LiquidCorporateBond,
  'traditional-assets/bonds/alternative/erc3525-bond-tranches.json': altBondsErc3525BondTranches,
  'traditional-assets/bonds/primary/erc1400-us-treasury-bond.json': priBondsErc1400UsTreasuryBond,
  'traditional-assets/bonds/primary/erc20-liquid-treasury-bond-token.json': priBondsErc20LiquidTreasuryBond,
  
  // Traditional Assets - Commodities
  'traditional-assets/commodities/alternative/erc20-carbon-credits-token.json': altCommoditiesErc20CarbonCredits,
  'traditional-assets/commodities/alternative/erc20-oil-token.json': altCommoditiesErc20Oil,
  'traditional-assets/commodities/primary/erc1155-token.json': priCommoditiesErc1155Token,
  'traditional-assets/commodities/primary/erc20-liquidity-token.json': priCommoditiesErc20Liquidity,
  
  // Traditional Assets - Equity
  'traditional-assets/equity/alternative/erc1400-base-token.json': altEquityErc1400Base,
  'traditional-assets/equity/alternative/erc20-liquidity-token.json': altEquityErc20Liquidity,
  'traditional-assets/equity/alternative/erc3525-share-classes-token.json': altEquityErc3525ShareClasses,
  'traditional-assets/equity/primary/erc1400-token.json': priEquityErc1400Token,
  'traditional-assets/equity/primary/erc20-liquidity-token.json': priEquityErc20Liquidity,
  
  // Traditional Assets - Funds ETFs ETPs
  'traditional-assets/funds-etfs-etps/alternative/erc20-treasury-vault-share-token.json': altFundsErc20TreasuryVaultShare,
  'traditional-assets/funds-etfs-etps/alternative/erc4626-digital-treasury-vault.json': altFundsErc4626DigitalTreasuryVault,
  'traditional-assets/funds-etfs-etps/primary/erc1400-institutional-treasury-fund.json': priFundsErc1400InstitutionalTreasuryFund,
  'traditional-assets/funds-etfs-etps/primary/erc20-liquid-treasury-fund-token.json': priFundsErc20LiquidTreasuryFund,
  'traditional-assets/funds-etfs-etps/primary/erc4626-treasury-yield-vault.json': priFundsErc4626TreasuryYieldVault,
  
  // Traditional Assets - Quantitative Strategies
  'traditional-assets/quantitative-strategies/alternative/erc20-liquid-alpha-token.json': altQuantErc20LiquidAlpha,
  'traditional-assets/quantitative-strategies/alternative/erc4626-ml-alpha-vault.json': altQuantErc4626MlAlphaVault,
  'traditional-assets/quantitative-strategies/primary/erc1400-systematic-multi-factor-fund.json': priQuantErc1400SystematicMultiFactor,
  'traditional-assets/quantitative-strategies/primary/erc20-liquid-quantitative-token.json': priQuantErc20LiquidQuantitative,
  'traditional-assets/quantitative-strategies/primary/erc4626-quantitative-yield-vault.json': priQuantErc4626QuantitativeYieldVault,
  
  // Traditional Assets - Structured Products
  'traditional-assets/structured-products/alternative/erc1400-base-token.json': altStructuredErc1400Base,
  'traditional-assets/structured-products/alternative/erc20-liquidity-token.json': altStructuredErc20Liquidity,
  'traditional-assets/structured-products/alternative/erc3525-tranches-token.json': altStructuredErc3525Tranches,
  'traditional-assets/structured-products/primary/erc1400-swiss-auto-callable-note.json': priStructuredErc1400SwissAutoCallable,
  'traditional-assets/structured-products/primary/erc1400-token.json': priStructuredErc1400Token,
  'traditional-assets/structured-products/primary/erc20-liquidity-token.json': priStructuredErc20Liquidity,
  'traditional-assets/structured-products/primary/erc20-liquidity-wrapper.json': priStructuredErc20LiquidityWrapper
};

// Display name mappings
const DISPLAY_NAME_MAP: Record<string, string> = {
  'alternative-assets': 'Alternative Assets',
  'digital-assets': 'Digital Assets',
  'stablecoins': 'Stablecoins', 
  'traditional-assets': 'Traditional Assets',
  'asset-backed-receivables': 'Asset Backed Receivables',
  'carbon-credits': 'Carbon Credits',
  'collectibles-other': 'Collectibles & Other Assets',
  'energy': 'Energy',
  'infrastructure': 'Infrastructure',
  'private-debt': 'Private Debt', 
  'private-equity': 'Private Equity',
  'real-estate': 'Real Estate',
  'solar-wind-energy-climate-receivables': 'Solar & Wind Energy, Climate Receivables',
  'digital-tokenised-fund': 'Digital Tokenised Fund',
  'algorithmic': 'Algorithmic Stablecoins',
  'commodity-backed': 'Commodity-Backed Stablecoins',
  'crypto-backed': 'Crypto-Backed Stablecoins',
  'fiat-backed': 'Fiat-Backed Stablecoins',
  'bonds': 'Bonds',
  'commodities': 'Commodities',
  'equity': 'Equity',
  'funds-etfs-etps': 'Funds, ETFs, ETPs',
  'quantitative-strategies': 'Quantitative Strategies',
  'structured-products': 'Structured Products'
};

/**
 * Extract token standard from filename
 */
function extractTokenStandard(filename: string): TokenStandard {
  const upperFilename = filename.toUpperCase();
  
  if (upperFilename.includes('ERC20')) return TokenStandard.ERC20;
  if (upperFilename.includes('ERC721')) return TokenStandard.ERC721;
  if (upperFilename.includes('ERC1155')) return TokenStandard.ERC1155;
  if (upperFilename.includes('ERC1400')) return TokenStandard.ERC1400;
  if (upperFilename.includes('ERC3525')) return TokenStandard.ERC3525;
  if (upperFilename.includes('ERC4626')) return TokenStandard.ERC4626;
  
  // Default to ERC20 if no standard detected
  return TokenStandard.ERC20;
}

/**
 * Create display name for file
 */
function createDisplayName(assetType: string, subcategory: string, filename: string): string {
  const assetDisplayName = DISPLAY_NAME_MAP[assetType] || assetType;
  const subcategoryDisplayName = DISPLAY_NAME_MAP[subcategory] || subcategory;
  
  // Clean up filename for display
  const cleanFilename = filename
    .replace('.json', '')
    .replace(/erc\d+/gi, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return `${subcategoryDisplayName} - ${cleanFilename}`;
}

/**
 * Discover all example files
 */
export async function discoverExampleFiles(): Promise<ExampleFileItem[]> {
  const files: ExampleFileItem[] = [];
  
  // Process all registered files
  for (const [filePath, content] of Object.entries(FILE_REGISTRY)) {
    const pathParts = filePath.split('/');
    if (pathParts.length >= 4) {
      const assetType = pathParts[0];
      const subcategory = pathParts[1];
      const category = pathParts[2] as 'primary' | 'alternative';
      const filename = pathParts[3];
      
      const tokenStandard = extractTokenStandard(filename);
      const displayName = createDisplayName(assetType, subcategory, filename);
      
      files.push({
        name: filename,
        path: `src/components/tokens/examples/${filePath}`,
        assetType: `${assetType}/${subcategory}`,
        category,
        tokenStandard,
        displayName,
        content
      });
    }
  }
  
  return files;
}

/**
 * Load a JSON file from the examples registry
 */
export async function loadExampleFile(filePath: string): Promise<string> {
  try {
    // Extract the relative path from the full path
    let registryPath = filePath;
    
    // Remove the 'src/components/tokens/examples/' prefix if present
    const prefix = 'src/components/tokens/examples/';
    if (registryPath.startsWith(prefix)) {
      registryPath = registryPath.substring(prefix.length);
    }
    
    // Look up the content in the registry
    const content = FILE_REGISTRY[registryPath];
    
    if (!content) {
      throw new Error(`File not found in registry: ${registryPath}`);
    }
    
    // Return the JSON content as string
    return JSON.stringify(content, null, 2);
  } catch (error) {
    console.error(`Failed to load example file: ${filePath}`, error);
    throw new Error(`Failed to load example file: ${filePath}`);
  }
}

/**
 * Get unique asset types for filtering
 */
export function getAssetTypes(): string[] {
  const assetTypes = new Set<string>();
  
  for (const [filePath] of Object.entries(FILE_REGISTRY)) {
    const pathParts = filePath.split('/');
    if (pathParts.length >= 2) {
      const assetType = pathParts[0];
      const subcategory = pathParts[1];
      assetTypes.add(`${assetType}/${subcategory}`);
    }
  }
  
  return Array.from(assetTypes).map(type => {
    const [assetType, subcategory] = type.split('/');
    const assetDisplayName = DISPLAY_NAME_MAP[assetType] || assetType;
    const subcategoryDisplayName = DISPLAY_NAME_MAP[subcategory] || subcategory;
    return `${assetDisplayName} / ${subcategoryDisplayName}`;
  });
}

/**
 * Get categories for filtering
 */
export function getCategories(): string[] {
  return ['primary', 'alternative'];
}
