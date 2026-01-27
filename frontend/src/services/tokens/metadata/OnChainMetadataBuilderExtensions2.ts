/**
 * On-Chain Metadata Builder Extensions 2 - Part 3/3
 * Alternative Investments & Digital Native Assets Builders
 * 
 * Completes the metadata builder system with:
 * - Alternative Investments: VC Funds, Direct Lending, Real Estate, REITs, Infrastructure, Energy, Collectibles
 * - Digital Native: Stablecoins (5 types), Carbon Credits, RECs, Invoice Receivables
 */

import { OnChainMetadataBuilder } from './OnChainMetadataBuilder';
import type {
  VentureCapitalFundInput,
  DirectLendingInput,
  CommercialRealEstateInput,
  REITInput,
  InfrastructureAssetInput,
  RenewableEnergyProjectInput,
  OilGasAssetInput,
  CollectibleInput,
  FiatBackedStablecoinInput,
  CryptoBackedStablecoinInput,
  AlgorithmicStablecoinInput,
  RebasingStablecoinInput,
  CommodityBackedStablecoinInput,
  CarbonCreditInput,
  RenewableEnergyCertificateInput,
  InvoiceReceivableInput,
  OnChainMetadataResult
} from './OnChainMetadataTypes';

// Extend the OnChainMetadataBuilder class with additional methods
declare module './OnChainMetadataBuilder' {
  interface OnChainMetadataBuilder {
    // Alternative Investments
    buildVentureCapitalFund(params: VentureCapitalFundInput): OnChainMetadataResult;
    buildDirectLending(params: DirectLendingInput): OnChainMetadataResult;
    buildCommercialRealEstate(params: CommercialRealEstateInput): OnChainMetadataResult;
    buildREIT(params: REITInput): OnChainMetadataResult;
    buildInfrastructureAsset(params: InfrastructureAssetInput): OnChainMetadataResult;
    buildRenewableEnergyProject(params: RenewableEnergyProjectInput): OnChainMetadataResult;
    buildOilGasAsset(params: OilGasAssetInput): OnChainMetadataResult;
    buildCollectible(params: CollectibleInput): OnChainMetadataResult;
    
    // Digital Native
    buildFiatBackedStablecoin(params: FiatBackedStablecoinInput): OnChainMetadataResult;
    buildCryptoBackedStablecoin(params: CryptoBackedStablecoinInput): OnChainMetadataResult;
    buildAlgorithmicStablecoin(params: AlgorithmicStablecoinInput): OnChainMetadataResult;
    buildRebasingStablecoin(params: RebasingStablecoinInput): OnChainMetadataResult;
    buildCommodityBackedStablecoin(params: CommodityBackedStablecoinInput): OnChainMetadataResult;
    buildCarbonCredit(params: CarbonCreditInput): OnChainMetadataResult;
    buildRenewableEnergyCertificate(params: RenewableEnergyCertificateInput): OnChainMetadataResult;
    buildInvoiceReceivable(params: InvoiceReceivableInput): OnChainMetadataResult;
  }
}

// ==========================================================================
// ALTERNATIVE INVESTMENTS BUILDERS
// ==========================================================================

OnChainMetadataBuilder.prototype.buildVentureCapitalFund = function(
  params: VentureCapitalFundInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'alternative');
  metadata.set('instrumentType', 'private_equity');
  metadata.set('fundType', params.fundType);
  metadata.set('stage', params.stage);
  
  // Fund Details
  metadata.set('fundManager', (this as any).truncate(params.fundManager, 50));
  metadata.set('vintageYear', params.vintageYear);
  metadata.set('fundSize', (this as any).formatNumber(params.fundSize));
  metadata.set('capitalCalled', (this as any).formatNumber(params.capitalCalled));
  metadata.set('distributedReturns', (this as any).formatNumber(params.distributedReturns));
  
  // Strategy
  metadata.set('sector', params.sector);
  metadata.set('geography', params.geography);
  if (params.checkSize) metadata.set('checkSize', params.checkSize);
  if (params.targetCompanies) metadata.set('targetCompanies', params.targetCompanies);
  
  // Fees & Carry
  metadata.set('managementFee', (this as any).formatNumber(params.managementFee));
  metadata.set('carriedInterest', (this as any).formatNumber(params.carriedInterest));
  metadata.set('hurdleRate', (this as any).formatNumber(params.hurdleRate));
  if (params.gpCommitment) metadata.set('gpCommitment', (this as any).formatNumber(params.gpCommitment));
  
  // Term
  metadata.set('fundLife', params.fundLife.toString());
  metadata.set('investmentPeriod', params.investmentPeriod.toString());
  metadata.set('inceptionDate', (this as any).formatDate(params.inceptionDate));
  if (params.expectedExit) metadata.set('expectedExit', (this as any).formatDate(params.expectedExit));
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  metadata.set('lastValuationDate', (this as any).formatDate(params.lastValuationDate));
  metadata.set('currentNav', (this as any).formatNumber(params.currentNav));
  if (params.irr) metadata.set('irr', (this as any).formatNumber(params.irr));
  if (params.moic) metadata.set('moic', (this as any).formatNumber(params.moic));
  
  // Distributions
  metadata.set('distributionFrequency', params.distributionFrequency);
  if (params.preferredReturn) metadata.set('preferredReturn', (this as any).formatNumber(params.preferredReturn));
  
  // Documents
  if (params.lpAgreementUri) metadata.set('lpAgreementUri', params.lpAgreementUri);
  if (params.subscriptionDocsUri) metadata.set('subscriptionDocsUri', params.subscriptionDocsUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildDirectLending = function(
  params: DirectLendingInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'alternative');
  metadata.set('instrumentType', 'private_debt');
  metadata.set('debtType', params.debtType);
  metadata.set('borrowerType', params.borrowerType);
  
  // Portfolio
  metadata.set('loanCount', params.loanCount.toString());
  metadata.set('totalCommitment', (this as any).formatNumber(params.totalCommitment));
  metadata.set('outstandingPrincipal', (this as any).formatNumber(params.outstandingPrincipal));
  metadata.set('weightedAvgMaturity', (this as any).formatNumber(params.weightedAvgMaturity));
  
  // Pricing
  metadata.set('interestRate', params.interestRate);
  if (params.currentSofr) metadata.set('currentSofr', (this as any).formatNumber(params.currentSofr));
  metadata.set('allInRate', (this as any).formatNumber(params.allInRate));
  metadata.set('paymentFrequency', params.paymentFrequency);
  
  // Credit Metrics
  if (params.weightedAvgLtv) metadata.set('weightedAvgLtv', (this as any).formatNumber(params.weightedAvgLtv));
  if (params.defaultRate) metadata.set('defaultRate', (this as any).formatNumber(params.defaultRate));
  if (params.recoveryRate) metadata.set('recoveryRate', (this as any).formatNumber(params.recoveryRate));
  if (params.creditRatingAvg) metadata.set('creditRatingAvg', params.creditRatingAvg);
  
  // Collateral
  metadata.set('collateralType', params.collateralType);
  metadata.set('collateralCoverage', (this as any).formatNumber(params.collateralCoverage));
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  metadata.set('currentNav', (this as any).formatNumber(params.currentNav));
  if (params.yieldToMaturity) metadata.set('yieldToMaturity', (this as any).formatNumber(params.yieldToMaturity));
  
  // Distributions
  metadata.set('distributionFrequency', params.distributionFrequency);
  if (params.lastDistribution) metadata.set('lastDistribution', (this as any).formatDate(params.lastDistribution));
  metadata.set('annualizedYield', (this as any).formatNumber(params.annualizedYield));
  
  // Documents
  if (params.creditAgreementUri) metadata.set('creditAgreementUri', params.creditAgreementUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildCommercialRealEstate = function(
  params: CommercialRealEstateInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'alternative');
  metadata.set('instrumentType', 'real_estate');
  metadata.set('propertyType', params.propertyType);
  metadata.set('propertyClass', params.propertyClass);
  
  // Property Details
  metadata.set('propertyName', (this as any).truncate(params.propertyName, 50));
  metadata.set('address', (this as any).truncate(params.address, 100));
  metadata.set('squareFeet', params.squareFeet.toString());
  if (params.floors) metadata.set('floors', params.floors.toString());
  metadata.set('yearBuilt', params.yearBuilt);
  if (params.yearRenovated) metadata.set('yearRenovated', params.yearRenovated);
  
  // Financial Metrics
  metadata.set('purchasePrice', (this as any).formatNumber(params.purchasePrice));
  metadata.set('currentValue', (this as any).formatNumber(params.currentValue));
  metadata.set('ltv', (this as any).formatNumber(params.ltv));
  metadata.set('debt', (this as any).formatNumber(params.debt));
  metadata.set('equity', (this as any).formatNumber(params.equity));
  
  // Operating Metrics
  metadata.set('occupancyRate', (this as any).formatNumber(params.occupancyRate));
  if (params.tenantCount) metadata.set('tenantCount', params.tenantCount.toString());
  if (params.avgLeaseYears) metadata.set('avgLeaseYears', (this as any).formatNumber(params.avgLeaseYears));
  metadata.set('annualNoi', (this as any).formatNumber(params.annualNoi));
  metadata.set('capRate', (this as any).formatNumber(params.capRate));
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  metadata.set('lastAppraisalDate', (this as any).formatDate(params.lastAppraisalDate));
  if (params.appraiserUri) metadata.set('appraiserUri', params.appraiserUri);
  
  // Distributions
  metadata.set('distributionFrequency', params.distributionFrequency);
  metadata.set('annualizedYield', (this as any).formatNumber(params.annualizedYield));
  if (params.lastDistribution) metadata.set('lastDistribution', (this as any).formatDate(params.lastDistribution));
  if (params.distributionPerToken) metadata.set('distributionPerToken', (this as any).formatNumber(params.distributionPerToken));
  
  // Tenants
  if (params.anchorTenants) metadata.set('anchorTenants', params.anchorTenants);
  
  // Documents
  if (params.propertyDeedsUri) metadata.set('propertyDeedsUri', params.propertyDeedsUri);
  if (params.leaseSummaryUri) metadata.set('leaseSummaryUri', params.leaseSummaryUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildREIT = function(
  params: REITInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'alternative');
  metadata.set('instrumentType', 'reit');
  metadata.set('reitType', params.reitType);
  metadata.set('sector', params.sector);
  
  // Portfolio
  metadata.set('propertyCount', params.propertyCount.toString());
  if (params.totalSquareFeet) metadata.set('totalSquareFeet', params.totalSquareFeet.toString());
  metadata.set('geography', params.geography);
  if (params.propertyTypes) metadata.set('propertyTypes', params.propertyTypes);
  
  // Financial Metrics
  metadata.set('aum', (this as any).formatNumber(params.aum));
  metadata.set('totalDebt', (this as any).formatNumber(params.totalDebt));
  metadata.set('debtToEquity', (this as any).formatNumber(params.debtToEquity));
  metadata.set('occupancyRate', (this as any).formatNumber(params.occupancyRate));
  if (params.avgLeaseTerm) metadata.set('avgLeaseTerm', (this as any).formatNumber(params.avgLeaseTerm));
  
  // REIT-Specific
  metadata.set('ffo', (this as any).formatNumber(params.ffo));
  metadata.set('affo', (this as any).formatNumber(params.affo));
  metadata.set('ffoPerShare', (this as any).formatNumber(params.ffoPerShare));
  metadata.set('dividendYield', (this as any).formatNumber(params.dividendYield));
  metadata.set('payoutRatio', (this as any).formatNumber(params.payoutRatio));
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  if (params.priceToNav) metadata.set('priceToNav', (this as any).formatNumber(params.priceToNav));
  metadata.set('currentNav', (this as any).formatNumber(params.currentNav));
  
  // Distributions
  metadata.set('distributionFrequency', params.distributionFrequency);
  if (params.lastDistribution) metadata.set('lastDistribution', (this as any).formatDate(params.lastDistribution));
  metadata.set('annualizedDividend', (this as any).formatNumber(params.annualizedDividend));
  
  // Legal
  metadata.set('reitQualified', params.reitQualified ? 'true' : 'false');

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildInfrastructureAsset = function(
  params: InfrastructureAssetInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'alternative');
  metadata.set('instrumentType', 'infrastructure');
  metadata.set('sector', params.sector);
  metadata.set('assetType', params.assetType);
  
  // Project Details
  metadata.set('projectName', (this as any).truncate(params.projectName, 50));
  metadata.set('location', (this as any).truncate(params.location, 50));
  if (params.concessionStart) metadata.set('concessionStart', (this as any).formatDate(params.concessionStart));
  if (params.concessionEnd) metadata.set('concessionEnd', (this as any).formatDate(params.concessionEnd));
  if (params.concessionYears) metadata.set('concessionYears', params.concessionYears.toString());
  
  // Financial Structure
  metadata.set('projectValue', (this as any).formatNumber(params.projectValue));
  metadata.set('equityInvestment', (this as any).formatNumber(params.equityInvestment));
  metadata.set('debtFinancing', (this as any).formatNumber(params.debtFinancing));
  if (params.sponsorEquity) metadata.set('sponsorEquity', (this as any).formatNumber(params.sponsorEquity));
  
  // Revenue Model
  metadata.set('revenueType', params.revenueType);
  metadata.set('annualRevenue', (this as any).formatNumber(params.annualRevenue));
  metadata.set('annualOpex', (this as any).formatNumber(params.annualOpex));
  metadata.set('ebitda', (this as any).formatNumber(params.ebitda));
  if (params.debtService) metadata.set('debtService', (this as any).formatNumber(params.debtService));
  
  // Returns
  metadata.set('projectedIrr', (this as any).formatNumber(params.projectedIrr));
  if (params.projectedEquityMultiple) metadata.set('projectedEquityMultiple', params.projectedEquityMultiple);
  metadata.set('cashYield', (this as any).formatNumber(params.cashYield));
  
  // Distributions
  metadata.set('distributionFrequency', params.distributionFrequency);
  if (params.distributionWaterfall) metadata.set('distributionWaterfall', params.distributionWaterfall);
  if (params.lastDistribution) metadata.set('lastDistribution', (this as any).formatDate(params.lastDistribution));
  
  // Risk
  if (params.trafficRisk) metadata.set('trafficRisk', params.trafficRisk);
  if (params.regulatoryRisk) metadata.set('regulatoryRisk', params.regulatoryRisk);
  if (params.competitionRisk) metadata.set('competitionRisk', params.competitionRisk);
  
  // Documents
  if (params.concessionAgreementUri) metadata.set('concessionAgreementUri', params.concessionAgreementUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildRenewableEnergyProject = function(
  params: RenewableEnergyProjectInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'alternative');
  metadata.set('instrumentType', 'energy_asset');
  metadata.set('energyType', params.energyType);
  metadata.set('projectStage', params.projectStage);
  
  // Project Details
  metadata.set('projectName', (this as any).truncate(params.projectName, 50));
  metadata.set('location', (this as any).truncate(params.location, 50));
  metadata.set('capacity', params.capacity.toString());
  if (params.codDate) metadata.set('codDate', (this as any).formatDate(params.codDate));
  
  // Generation & Revenue
  if (params.annualMwhProduction) metadata.set('annualMwhProduction', params.annualMwhProduction.toString());
  if (params.capacityFactor) metadata.set('capacityFactor', (this as any).formatNumber(params.capacityFactor));
  if (params.ppaPrice) metadata.set('ppaPrice', (this as any).formatNumber(params.ppaPrice));
  if (params.ppaCounterparty) metadata.set('ppaCounterparty', (this as any).truncate(params.ppaCounterparty, 50));
  if (params.ppaExpiryDate) metadata.set('ppaExpiryDate', (this as any).formatDate(params.ppaExpiryDate));
  if (params.annualRevenue) metadata.set('annualRevenue', (this as any).formatNumber(params.annualRevenue));
  
  // Financial Metrics
  metadata.set('projectCost', (this as any).formatNumber(params.projectCost));
  metadata.set('equityInvested', (this as any).formatNumber(params.equityInvested));
  metadata.set('debtFinancing', (this as any).formatNumber(params.debtFinancing));
  if (params.ltv) metadata.set('ltv', (this as any).formatNumber(params.ltv));
  
  // Returns
  metadata.set('projectedIrr', (this as any).formatNumber(params.projectedIrr));
  if (params.projectedEquityMultiple) metadata.set('projectedEquityMultiple', params.projectedEquityMultiple);
  metadata.set('cashYield', (this as any).formatNumber(params.cashYield));
  if (params.paybackPeriod) metadata.set('paybackPeriod', (this as any).formatNumber(params.paybackPeriod));
  
  // Environmental
  if (params.co2AvoidedAnnually) metadata.set('co2AvoidedAnnually', params.co2AvoidedAnnually.toString());
  if (params.renewableCredits) metadata.set('renewableCredits', params.renewableCredits);
  
  // Distributions
  metadata.set('distributionFrequency', params.distributionFrequency);
  if (params.lastDistribution) metadata.set('lastDistribution', (this as any).formatDate(params.lastDistribution));
  if (params.distributionPerToken) metadata.set('distributionPerToken', (this as any).formatNumber(params.distributionPerToken));
  
  // Documents
  if (params.ppaUri) metadata.set('ppaUri', params.ppaUri);
  if (params.interconnectionUri) metadata.set('interconnectionUri', params.interconnectionUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildOilGasAsset = function(
  params: OilGasAssetInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'alternative');
  metadata.set('instrumentType', 'energy_asset');
  metadata.set('energyType', params.energyType);
  metadata.set('assetStage', params.assetStage);
  
  // Asset Details
  metadata.set('projectName', (this as any).truncate(params.projectName, 50));
  metadata.set('location', (this as any).truncate(params.location, 50));
  if (params.wellCount) metadata.set('wellCount', params.wellCount.toString());
  if (params.acreage) metadata.set('acreage', params.acreage.toString());
  if (params.formation) metadata.set('formation', params.formation);
  
  // Production
  if (params.oilProductionBpd) metadata.set('oilProductionBpd', params.oilProductionBpd.toString());
  if (params.gasProductionMcfd) metadata.set('gasProductionMcfd', params.gasProductionMcfd.toString());
  if (params.nglProductionBpd) metadata.set('nglProductionBpd', params.nglProductionBpd.toString());
  if (params.avgWellDeclineRate) metadata.set('avgWellDeclineRate', (this as any).formatNumber(params.avgWellDeclineRate));
  
  // Economics
  metadata.set('breakEvenPrice', (this as any).formatNumber(params.breakEvenPrice));
  if (params.currentOilPrice) metadata.set('currentOilPrice', (this as any).formatNumber(params.currentOilPrice));
  if (params.netbackPerBoe) metadata.set('netbackPerBoe', (this as any).formatNumber(params.netbackPerBoe));
  metadata.set('annualNetRevenue', (this as any).formatNumber(params.annualNetRevenue));
  metadata.set('opex', (this as any).formatNumber(params.opex));
  if (params.capitalBudget) metadata.set('capitalBudget', (this as any).formatNumber(params.capitalBudget));
  
  // Reserves
  if (params.provedReserves) metadata.set('provedReserves', params.provedReserves.toString());
  if (params.probableReserves) metadata.set('probableReserves', params.probableReserves.toString());
  if (params.reserveLife) metadata.set('reserveLife', (this as any).formatNumber(params.reserveLife));
  
  // Returns
  metadata.set('projectedIrr', (this as any).formatNumber(params.projectedIrr));
  metadata.set('cashYield', (this as any).formatNumber(params.cashYield));
  
  // Distributions
  metadata.set('distributionFrequency', params.distributionFrequency);
  if (params.distributionPerToken) metadata.set('distributionPerToken', (this as any).formatNumber(params.distributionPerToken));
  
  // Documents
  if (params.operatingAgreementUri) metadata.set('operatingAgreementUri', params.operatingAgreementUri);
  if (params.reserveReportUri) metadata.set('reserveReportUri', params.reserveReportUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildCollectible = function(
  params: CollectibleInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'alternative');
  metadata.set('instrumentType', 'collectible');
  metadata.set('collectibleType', params.collectibleType);
  
  // Asset Details
  if (params.artist) metadata.set('artist', (this as any).truncate(params.artist, 50));
  metadata.set('title', (this as any).truncate(params.title, 100));
  if (params.year) metadata.set('year', params.year);
  
  // Provenance
  if (params.previousOwners) metadata.set('previousOwners', params.previousOwners);
  if (params.lastSaleDate) metadata.set('lastSaleDate', (this as any).formatDate(params.lastSaleDate));
  if (params.lastSalePrice) metadata.set('lastSalePrice', (this as any).formatNumber(params.lastSalePrice));
  metadata.set('currentAppraisal', (this as any).formatNumber(params.currentAppraisal));
  if (params.appraiserName) metadata.set('appraiserName', (this as any).truncate(params.appraiserName, 50));
  metadata.set('appraisalDate', (this as any).formatDate(params.appraisalDate));
  
  // Custody & Insurance
  metadata.set('custodian', (this as any).truncate(params.custodian, 50));
  metadata.set('location', (this as any).truncate(params.location, 50));
  metadata.set('insuredValue', (this as any).formatNumber(params.insuredValue));
  if (params.insuranceCarrier) metadata.set('insuranceCarrier', (this as any).truncate(params.insuranceCarrier, 50));
  if (params.storageConditions) metadata.set('storageConditions', params.storageConditions);
  
  // Tokenization
  metadata.set('totalTokens', params.totalTokens.toString());
  metadata.set('pricePerToken', (this as any).formatNumber(params.pricePerToken));
  if (params.minimumInvestment) metadata.set('minimumInvestment', (this as any).formatNumber(params.minimumInvestment));
  
  // Liquidity & Exit
  if (params.lockupPeriod) metadata.set('lockupPeriod', params.lockupPeriod.toString());
  metadata.set('exitStrategy', params.exitStrategy);
  if (params.estimatedSaleDate) metadata.set('estimatedSaleDate', (this as any).formatDate(params.estimatedSaleDate));
  if (params.estimatedSalePrice) metadata.set('estimatedSalePrice', (this as any).formatNumber(params.estimatedSalePrice));
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  metadata.set('lastValuation', (this as any).formatNumber(params.lastValuation));
  if (params.valuationFrequency) metadata.set('valuationFrequency', params.valuationFrequency);
  
  // Documents
  if (params.authenticationUri) metadata.set('authenticationUri', params.authenticationUri);
  if (params.provenanceUri) metadata.set('provenanceUri', params.provenanceUri);
  if (params.imageUri) metadata.set('imageUri', params.imageUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

// ==========================================================================
// DIGITAL NATIVE ASSETS BUILDERS
// ==========================================================================

OnChainMetadataBuilder.prototype.buildFiatBackedStablecoin = function(
  params: FiatBackedStablecoinInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'digital_native');
  metadata.set('instrumentType', 'stablecoin_fiat');
  metadata.set('stablecoinType', params.stablecoinType);
  metadata.set('peggedCurrency', params.peggedCurrency);
  
  // Backing
  metadata.set('backingRatio', (this as any).formatNumber(params.backingRatio));
  metadata.set('reserveType', params.reserveType);
  if (params.reserveAssets) metadata.set('reserveAssets', params.reserveAssets);
  metadata.set('custodian', (this as any).truncate(params.custodian, 50));
  if (params.custodianAddress) metadata.set('custodianAddress', params.custodianAddress);
  
  // Attestation
  metadata.set('attestationFrequency', params.attestationFrequency);
  metadata.set('auditor', (this as any).truncate(params.auditor, 50));
  metadata.set('lastAttestationDate', (this as any).formatDate(params.lastAttestationDate));
  if (params.attestationUri) metadata.set('attestationUri', params.attestationUri);
  
  // Supply
  metadata.set('totalSupply', (this as any).formatNumber(params.totalSupply));
  metadata.set('circulatingSupply', (this as any).formatNumber(params.circulatingSupply));
  
  // Redemption
  metadata.set('redemptionMethod', params.redemptionMethod);
  if (params.redemptionFee) metadata.set('redemptionFee', (this as any).formatNumber(params.redemptionFee));
  if (params.redemptionVault) metadata.set('redemptionVault', params.redemptionVault);
  if (params.minRedemption) metadata.set('minRedemption', (this as any).formatNumber(params.minRedemption));
  
  // Oracle
  if (params.pegOracle) metadata.set('pegOracle', params.pegOracle);
  if (params.oracleAddress) metadata.set('oracleAddress', params.oracleAddress);
  if (params.currentPeg) metadata.set('currentPeg', (this as any).formatNumber(params.currentPeg));
  if (params.pegDeviation) metadata.set('pegDeviation', (this as any).formatNumber(params.pegDeviation));
  
  // Regulatory
  if (params.regulatoryStatus) metadata.set('regulatoryStatus', params.regulatoryStatus);
  if (params.termsUri) metadata.set('termsUri', params.termsUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildCryptoBackedStablecoin = function(
  params: CryptoBackedStablecoinInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'digital_native');
  metadata.set('instrumentType', 'stablecoin_crypto');
  metadata.set('stablecoinType', params.stablecoinType);
  metadata.set('peggedCurrency', params.peggedCurrency);
  
  // Collateral
  metadata.set('collateralRatio', (this as any).formatNumber(params.collateralRatio));
  if (params.collateralTypes) metadata.set('collateralTypes', params.collateralTypes);
  metadata.set('minCollateralRatio', (this as any).formatNumber(params.minCollateralRatio));
  metadata.set('vaultAddress', params.vaultAddress);
  
  // Liquidation
  metadata.set('liquidationPenalty', (this as any).formatNumber(params.liquidationPenalty));
  if (params.liquidationEngine) metadata.set('liquidationEngine', params.liquidationEngine);
  if (params.auctionDuration) metadata.set('auctionDuration', params.auctionDuration.toString());
  
  // Stability
  if (params.stabilityFee) metadata.set('stabilityFee', (this as any).formatNumber(params.stabilityFee));
  metadata.set('targetPeg', (this as any).formatNumber(params.targetPeg));
  metadata.set('currentPeg', (this as any).formatNumber(params.currentPeg));
  metadata.set('pegDeviation', (this as any).formatNumber(params.pegDeviation));
  
  // Oracle
  if (params.collateralOracles) metadata.set('collateralOracles', params.collateralOracles);
  metadata.set('oracleProvider', params.oracleProvider);
  if (params.pegOracle) metadata.set('pegOracle', params.pegOracle);
  
  // Governance
  if (params.governanceToken) metadata.set('governanceToken', params.governanceToken);
  if (params.daoAddress) metadata.set('daoAddress', params.daoAddress);
  
  // Documents
  if (params.auditUri) metadata.set('auditUri', params.auditUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildAlgorithmicStablecoin = function(
  params: AlgorithmicStablecoinInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'digital_native');
  metadata.set('instrumentType', 'stablecoin_algorithmic');
  metadata.set('stablecoinType', params.stablecoinType);
  metadata.set('peggedCurrency', params.peggedCurrency);
  
  // Mechanism
  metadata.set('mechanismType', params.mechanismType);
  if (params.sharesToken) metadata.set('sharesToken', params.sharesToken);
  if (params.bondsToken) metadata.set('bondsToken', params.bondsToken);
  if (params.algorithmAddress) metadata.set('algorithmAddress', params.algorithmAddress);
  
  // State
  metadata.set('currentPeg', (this as any).formatNumber(params.currentPeg));
  if (params.expansionPhase !== undefined) metadata.set('expansionPhase', params.expansionPhase ? 'true' : 'false');
  if (params.contractionPhase !== undefined) metadata.set('contractionPhase', params.contractionPhase ? 'true' : 'false');
  
  // Supply Dynamics
  metadata.set('totalSupply', (this as any).formatNumber(params.totalSupply));
  if (params.targetSupply) metadata.set('targetSupply', (this as any).formatNumber(params.targetSupply));
  if (params.dailyRebaseRate) metadata.set('dailyRebaseRate', (this as any).formatNumber(params.dailyRebaseRate));
  if (params.lastRebaseTime) metadata.set('lastRebaseTime', params.lastRebaseTime);
  
  // Oracle
  metadata.set('pegOracle', params.pegOracle);
  if (params.oracleAddress) metadata.set('oracleAddress', params.oracleAddress);
  if (params.oracleUpdateFreq) metadata.set('oracleUpdateFreq', params.oracleUpdateFreq.toString());
  
  // Governance
  if (params.governanceToken) metadata.set('governanceToken', params.governanceToken);
  if (params.daoAddress) metadata.set('daoAddress', params.daoAddress);
  if (params.proposalThreshold) metadata.set('proposalThreshold', params.proposalThreshold.toString());
  
  // Documents
  if (params.whitepaper) metadata.set('whitepaper', params.whitepaper);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildRebasingStablecoin = function(
  params: RebasingStablecoinInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'digital_native');
  metadata.set('instrumentType', 'stablecoin_rebasing');
  metadata.set('stablecoinType', params.stablecoinType);
  metadata.set('peggedCurrency', params.peggedCurrency);
  
  // Rebase Mechanism
  metadata.set('rebaseFrequency', params.rebaseFrequency);
  if (params.rebaseTime) metadata.set('rebaseTime', params.rebaseTime);
  if (params.lastRebase) metadata.set('lastRebase', params.lastRebase);
  if (params.lastRebaseRate) metadata.set('lastRebaseRate', (this as any).formatNumber(params.lastRebaseRate));
  if (params.rebaseHistory) metadata.set('rebaseHistory', params.rebaseHistory);
  
  // Target
  metadata.set('targetPrice', (this as any).formatNumber(params.targetPrice));
  metadata.set('currentPrice', (this as any).formatNumber(params.currentPrice));
  metadata.set('rebaseThreshold', (this as any).formatNumber(params.rebaseThreshold));
  
  // Supply
  metadata.set('totalSupply', (this as any).formatNumber(params.totalSupply));
  if (params.supplyChange24h) metadata.set('supplyChange24h', (this as any).formatNumber(params.supplyChange24h));
  
  // Oracle
  metadata.set('priceOracle', params.priceOracle);
  if (params.oracleAddress) metadata.set('oracleAddress', params.oracleAddress);
  
  // Program
  if (params.rebaseProgram) metadata.set('rebaseProgram', params.rebaseProgram);
  
  // Documents
  if (params.docsUri) metadata.set('docsUri', params.docsUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildCommodityBackedStablecoin = function(
  params: CommodityBackedStablecoinInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'digital_native');
  metadata.set('instrumentType', 'stablecoin_commodity');
  metadata.set('stablecoinType', params.stablecoinType);
  metadata.set('backedCommodity', params.backedCommodity);
  
  // Backing
  metadata.set('backingRatio', (this as any).formatNumber(params.backingRatio));
  metadata.set('commodityUnit', params.commodityUnit);
  metadata.set('tokensPerUnit', (this as any).formatNumber(params.tokensPerUnit));
  if (params.totalPhysicalGrams) metadata.set('totalPhysicalGrams', params.totalPhysicalGrams.toString());
  if (params.purity) metadata.set('purity', params.purity);
  
  // Custody
  metadata.set('custodian', (this as any).truncate(params.custodian, 50));
  metadata.set('vaultLocation', (this as any).truncate(params.vaultLocation, 50));
  if (params.vaultAddress) metadata.set('vaultAddress', params.vaultAddress);
  if (params.insuranceValue) metadata.set('insuranceValue', (this as any).formatNumber(params.insuranceValue));
  
  // Audit
  metadata.set('auditFrequency', params.auditFrequency);
  metadata.set('lastAuditDate', (this as any).formatDate(params.lastAuditDate));
  metadata.set('auditor', (this as any).truncate(params.auditor, 50));
  if (params.auditReportUri) metadata.set('auditReportUri', params.auditReportUri);
  
  // Pricing
  metadata.set('oracleProvider', params.oracleProvider);
  metadata.set('oracleAddress', params.oracleAddress);
  if (params.currentGoldPrice) metadata.set('currentGoldPrice', (this as any).formatNumber(params.currentGoldPrice));
  
  // Redemption
  metadata.set('physicalRedemption', params.physicalRedemption ? 'true' : 'false');
  if (params.minRedemption) metadata.set('minRedemption', (this as any).formatNumber(params.minRedemption));
  if (params.redemptionFee) metadata.set('redemptionFee', (this as any).formatNumber(params.redemptionFee));

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildCarbonCredit = function(
  params: CarbonCreditInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'digital_native');
  metadata.set('instrumentType', 'carbon_credit');
  metadata.set('creditType', params.creditType);
  if (params.methodology) metadata.set('methodology', params.methodology);
  
  // Project Details
  metadata.set('projectName', (this as any).truncate(params.projectName, 50));
  metadata.set('projectId', params.projectId);
  metadata.set('location', (this as any).truncate(params.location, 50));
  metadata.set('projectType', params.projectType);
  if (params.hectares) metadata.set('hectares', params.hectares.toString());
  
  // Carbon Metrics
  metadata.set('co2ePerCredit', (this as any).formatNumber(params.co2ePerCredit));
  metadata.set('vintageYear', params.vintageYear);
  metadata.set('totalCredits', (this as any).formatNumber(params.totalCredits));
  metadata.set('retiredCredits', (this as any).formatNumber(params.retiredCredits));
  metadata.set('remainingCredits', (this as any).formatNumber(params.remainingCredits));
  
  // Verification
  metadata.set('verifier', (this as any).truncate(params.verifier, 50));
  metadata.set('verificationDate', (this as any).formatDate(params.verificationDate));
  metadata.set('verificationStatus', params.verificationStatus);
  if (params.certificationUri) metadata.set('certificationUri', params.certificationUri);
  
  // Registry
  metadata.set('registry', (this as any).truncate(params.registry, 50));
  metadata.set('registryId', params.registryId);
  if (params.serialNumberRange) metadata.set('serialNumberRange', params.serialNumberRange);
  
  // Pricing
  if (params.currentPrice) metadata.set('currentPrice', (this as any).formatNumber(params.currentPrice));
  if (params.priceOracle) metadata.set('priceOracle', params.priceOracle);
  
  // Retirement
  metadata.set('retirementMethod', params.retirementMethod);
  if (params.retirementProgram) metadata.set('retirementProgram', params.retirementProgram);
  
  // Documents
  if (params.projectDocsUri) metadata.set('projectDocsUri', params.projectDocsUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildRenewableEnergyCertificate = function(
  params: RenewableEnergyCertificateInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'digital_native');
  metadata.set('instrumentType', 'climate_finance');
  metadata.set('certificateType', params.certificateType);
  
  // Generation Details
  metadata.set('projectName', (this as any).truncate(params.projectName, 50));
  metadata.set('projectId', params.projectId);
  metadata.set('location', (this as any).truncate(params.location, 50));
  metadata.set('energySource', params.energySource);
  if (params.capacity) metadata.set('capacity', params.capacity.toString());
  
  // Certificate Metrics
  metadata.set('mwhPerCredit', (this as any).formatNumber(params.mwhPerCredit));
  metadata.set('vintageYear', params.vintageYear);
  if (params.vintageQuarter) metadata.set('vintageQuarter', params.vintageQuarter);
  metadata.set('generationDate', (this as any).formatDate(params.generationDate));
  metadata.set('totalMwh', (this as any).formatNumber(params.totalMwh));
  
  // Certification
  metadata.set('certifyingBody', (this as any).truncate(params.certifyingBody, 50));
  metadata.set('registryId', params.registryId);
  metadata.set('verificationDate', (this as any).formatDate(params.verificationDate));
  if (params.certificationUri) metadata.set('certificationUri', params.certificationUri);
  
  // Compliance
  if (params.complianceMarket) metadata.set('complianceMarket', params.complianceMarket);
  if (params.complianceYear) metadata.set('complianceYear', params.complianceYear);
  if (params.eligiblePrograms) metadata.set('eligiblePrograms', params.eligiblePrograms);
  
  // Retirement
  metadata.set('retired', params.retired ? 'true' : 'false');
  if (params.retirementDate) metadata.set('retirementDate', (this as any).formatDate(params.retirementDate));
  if (params.retirementProgram) metadata.set('retirementProgram', params.retirementProgram);
  
  // Documents
  if (params.recAgreementUri) metadata.set('recAgreementUri', params.recAgreementUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildInvoiceReceivable = function(
  params: InvoiceReceivableInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'digital_native');
  metadata.set('instrumentType', 'invoice_receivable');
  metadata.set('receivableType', params.receivableType);
  
  // Pool Composition
  metadata.set('invoiceCount', params.invoiceCount.toString());
  metadata.set('totalFaceValue', (this as any).formatNumber(params.totalFaceValue));
  metadata.set('discountRate', (this as any).formatNumber(params.discountRate));
  metadata.set('purchasePrice', (this as any).formatNumber(params.purchasePrice));
  
  // Payer Details
  metadata.set('primaryPayer', (this as any).truncate(params.primaryPayer, 50));
  if (params.payerState) metadata.set('payerState', params.payerState);
  if (params.payerCreditRating) metadata.set('payerCreditRating', params.payerCreditRating);
  if (params.defaultHistory) metadata.set('defaultHistory', (this as any).formatNumber(params.defaultHistory));
  
  // Receivables Stats
  metadata.set('weightedAvgMaturity', (this as any).formatNumber(params.weightedAvgMaturity));
  if (params.oldestInvoice) metadata.set('oldestInvoice', params.oldestInvoice.toString());
  if (params.newestInvoice) metadata.set('newestInvoice', params.newestInvoice.toString());
  if (params.avgInvoiceSize) metadata.set('avgInvoiceSize', (this as any).formatNumber(params.avgInvoiceSize));
  
  // Performance
  metadata.set('expectedRecovery', (this as any).formatNumber(params.expectedRecovery));
  metadata.set('expectedLoss', (this as any).formatNumber(params.expectedLoss));
  if (params.historicRecovery) metadata.set('historicRecovery', (this as any).formatNumber(params.historicRecovery));
  if (params.avgCollectionDays) metadata.set('avgCollectionDays', params.avgCollectionDays.toString());
  
  // Cash Flow
  if (params.monthlyRepayments !== undefined) metadata.set('monthlyRepayments', params.monthlyRepayments ? 'true' : 'false');
  if (params.projectedCashflow) metadata.set('projectedCashflow', params.projectedCashflow);
  if (params.accelerationClause !== undefined) metadata.set('accelerationClause', params.accelerationClause ? 'true' : 'false');
  
  // Returns
  metadata.set('annualizedYield', (this as any).formatNumber(params.annualizedYield));
  if (params.irr) metadata.set('irr', (this as any).formatNumber(params.irr));
  if (params.paybackPeriod) metadata.set('paybackPeriod', (this as any).formatNumber(params.paybackPeriod));
  
  // Servicing
  metadata.set('servicer', (this as any).truncate(params.servicer, 50));
  if (params.servicingFee) metadata.set('servicingFee', (this as any).formatNumber(params.servicingFee));
  if (params.collectionMethod) metadata.set('collectionMethod', params.collectionMethod);
  
  // Documents
  if (params.purchaseAgreementUri) metadata.set('purchaseAgreementUri', params.purchaseAgreementUri);
  if (params.servicingAgreementUri) metadata.set('servicingAgreementUri', params.servicingAgreementUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

export {};
