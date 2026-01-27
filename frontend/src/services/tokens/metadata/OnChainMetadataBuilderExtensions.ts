/**
 * On-Chain Metadata Builder Extensions - Part 2/3
 * Fixed Income, Funds, Commodities Builders
 */

import { OnChainMetadataBuilder } from './OnChainMetadataBuilder';
import type {
  CorporateBondInput,
  GovernmentBondInput,
  CommercialPaperInput,
  CreditLinkedNoteInput,
  MutualFundInput,
  ETFInput,
  ActivelyManagedCertificateInput,
  CommoditySpotInput,
  CommodityFuturesInput,
  TrackerCertificateInput,
  OnChainMetadataResult
} from './OnChainMetadataTypes';

// Extend the OnChainMetadataBuilder class with additional methods
declare module './OnChainMetadataBuilder' {
  interface OnChainMetadataBuilder {
    buildCorporateBond(params: CorporateBondInput): OnChainMetadataResult;
    buildGovernmentBond(params: GovernmentBondInput): OnChainMetadataResult;
    buildCommercialPaper(params: CommercialPaperInput): OnChainMetadataResult;
    buildCreditLinkedNote(params: CreditLinkedNoteInput): OnChainMetadataResult;
    buildMutualFund(params: MutualFundInput): OnChainMetadataResult;
    buildETF(params: ETFInput): OnChainMetadataResult;
    buildActivelyManagedCertificate(params: ActivelyManagedCertificateInput): OnChainMetadataResult;
    buildCommoditySpot(params: CommoditySpotInput): OnChainMetadataResult;
    buildCommodityFutures(params: CommodityFuturesInput): OnChainMetadataResult;
    buildTrackerCertificate(params: TrackerCertificateInput): OnChainMetadataResult;
  }
}

// ==========================================================================
// FIXED INCOME BUILDERS
// ==========================================================================

OnChainMetadataBuilder.prototype.buildCorporateBond = function(
  params: CorporateBondInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'fixed_income');
  metadata.set('instrumentType', 'corporate_bond');
  metadata.set('bondType', params.bondType);
  
  // Issuer
  if (params.cusip) metadata.set('cusip', params.cusip);
  if (params.isin) metadata.set('isin', params.isin);
  metadata.set('creditRating', params.creditRating);
  
  // Bond Terms
  metadata.set('parValue', (this as any).formatNumber(params.parValue));
  metadata.set('couponRate', (this as any).formatNumber(params.couponRate));
  metadata.set('couponFrequency', params.couponFrequency);
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  if (params.currentYield) {
    metadata.set('currentYield', (this as any).formatNumber(params.currentYield));
  }
  if (params.durationYears) {
    metadata.set('durationYears', (this as any).formatNumber(params.durationYears));
  }
  
  // Payment
  if (params.paymentDates) metadata.set('paymentDates', params.paymentDates);
  if (params.accruedInterest) metadata.set('accruedInterest', params.accruedInterest);
  
  // Features
  metadata.set('callable', params.callable ? 'true' : 'false');
  metadata.set('putable', params.putable ? 'true' : 'false');
  if (params.callDate) metadata.set('callDate', (this as any).formatDate(params.callDate));
  if (params.callPrice) metadata.set('callPrice', (this as any).formatNumber(params.callPrice));
  
  // Settlement
  metadata.set('settlementDays', params.settlementDays.toString());
  if (params.paymentVault) metadata.set('paymentVault', params.paymentVault);
  
  // Documents
  if (params.indentureUri) metadata.set('indentureUri', params.indentureUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildGovernmentBond = function(
  params: GovernmentBondInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'fixed_income');
  metadata.set('instrumentType', 'government_bond');
  metadata.set('bondType', params.bondType);
  
  // Issuer
  if (params.cusip) metadata.set('cusip', params.cusip);
  if (params.isin) metadata.set('isin', params.isin);
  metadata.set('creditRating', params.creditRating);
  
  // Bond Terms
  metadata.set('parValue', (this as any).formatNumber(params.parValue));
  metadata.set('couponRate', (this as any).formatNumber(params.couponRate));
  metadata.set('couponFrequency', params.couponFrequency);
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  if (params.benchmarkSpread) {
    metadata.set('benchmarkSpread', (this as any).formatNumber(params.benchmarkSpread));
  }
  
  // Settlement
  metadata.set('settlementDays', params.settlementDays.toString());
  if (params.paymentVault) metadata.set('paymentVault', params.paymentVault);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildCommercialPaper = function(
  params: CommercialPaperInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'fixed_income');
  metadata.set('instrumentType', 'commercial_paper');
  metadata.set('cpType', params.cpType);
  
  // Issuer
  metadata.set('creditRating', params.creditRating);
  
  // Terms
  metadata.set('parValue', (this as any).formatNumber(params.parValue));
  metadata.set('discountRate', (this as any).formatNumber(params.discountRate));
  metadata.set('maturityDays', params.maturityDays.toString());
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  metadata.set('currentPrice', (this as any).formatNumber(params.currentPrice));
  
  // Settlement
  metadata.set('settlementDays', params.settlementDays.toString());
  metadata.set('redemptionVault', params.redemptionVault);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildCreditLinkedNote = function(
  params: CreditLinkedNoteInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'fixed_income');
  metadata.set('instrumentType', 'credit_linked_note');
  metadata.set('clnType', params.clnType);
  
  // Reference Entity
  metadata.set('referenceEntity', (this as any).truncate(params.referenceEntity, 50));
  if (params.referenceEntityLEI) metadata.set('referenceEntityLEI', params.referenceEntityLEI);
  if (params.referenceObligation) {
    metadata.set('referenceObligation', (this as any).truncate(params.referenceObligation, 50));
  }
  metadata.set('creditRating', params.creditRating);
  
  // CLN Terms
  metadata.set('parValue', (this as any).formatNumber(params.parValue));
  metadata.set('couponRate', (this as any).formatNumber(params.couponRate));
  metadata.set('couponFrequency', params.couponFrequency);
  
  // Credit Event
  metadata.set('creditEvents', params.creditEvents);
  metadata.set('recoveryRate', (this as any).formatNumber(params.recoveryRate));
  metadata.set('settlementMethod', params.settlementMethod);
  
  // Oracle
  if (params.oracleProvider) metadata.set('oracleProvider', params.oracleProvider);
  if (params.creditEventOracle) metadata.set('creditEventOracle', params.creditEventOracle);
  
  // Redemption
  metadata.set('redemptionVault', params.redemptionVault);
  metadata.set('settlementDays', params.settlementDays.toString());
  
  // ISDA
  if (params.isdaDefinitions) metadata.set('isdaDefinitions', params.isdaDefinitions);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

// ==========================================================================
// FUNDS BUILDERS
// ==========================================================================

OnChainMetadataBuilder.prototype.buildMutualFund = function(
  params: MutualFundInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'fund');
  metadata.set('instrumentType', 'mutual_fund');
  metadata.set('fundType', params.fundType);
  metadata.set('category', params.category);
  
  // Fund Details
  metadata.set('fundManager', (this as any).truncate(params.fundManager, 50));
  metadata.set('inceptionDate', (this as any).formatDate(params.inceptionDate));
  metadata.set('fiscalYearEnd', params.fiscalYearEnd);
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  metadata.set('navFrequency', params.navFrequency);
  metadata.set('navCalculationTime', params.navCalculationTime);
  metadata.set('currentNav', (this as any).formatNumber(params.currentNav));
  if (params.previousNav) metadata.set('previousNav', (this as any).formatNumber(params.previousNav));
  
  // Fees
  metadata.set('managementFee', (this as any).formatNumber(params.managementFee));
  if (params.performanceFee) metadata.set('performanceFee', (this as any).formatNumber(params.performanceFee));
  if (params.entranceFee) metadata.set('entranceFee', (this as any).formatNumber(params.entranceFee));
  if (params.exitFee) metadata.set('exitFee', (this as any).formatNumber(params.exitFee));
  if (params.hurdleRate) metadata.set('hurdleRate', (this as any).formatNumber(params.hurdleRate));
  
  // Portfolio
  metadata.set('aum', (this as any).formatNumber(params.aum));
  metadata.set('sharesOutstanding', params.sharesOutstanding.toString());
  if (params.portfolioHoldings) metadata.set('portfolioHoldings', params.portfolioHoldings.toString());
  
  // Subscriptions/Redemptions
  metadata.set('subscriptionFrequency', params.subscriptionFrequency);
  metadata.set('redemptionFrequency', params.redemptionFrequency);
  if (params.minInvestment) metadata.set('minInvestment', (this as any).formatNumber(params.minInvestment));
  if (params.redemptionNoticeDays) metadata.set('redemptionNoticeDays', params.redemptionNoticeDays.toString());
  
  // Documents
  if (params.factSheetUri) metadata.set('factSheetUri', params.factSheetUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildETF = function(
  params: ETFInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'fund');
  metadata.set('instrumentType', 'etf');
  metadata.set('etfType', params.etfType);
  if (params.indexTracked) metadata.set('indexTracked', params.indexTracked);
  
  // Trading
  metadata.set('exchange', params.exchange);
  metadata.set('primaryMarket', params.primaryMarket);
  metadata.set('creationUnit', params.creationUnit.toString());
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  metadata.set('navFrequency', params.navFrequency);
  if (params.iNavProvider) metadata.set('iNavProvider', params.iNavProvider);
  metadata.set('currentNav', (this as any).formatNumber(params.currentNav));
  if (params.marketPrice) metadata.set('marketPrice', (this as any).formatNumber(params.marketPrice));
  if (params.premiumDiscount) {
    metadata.set('premiumDiscount', (this as any).formatNumber(params.premiumDiscount));
  }
  
  // Fees
  metadata.set('expenseRatio', (this as any).formatNumber(params.expenseRatio));
  metadata.set('managementFee', (this as any).formatNumber(params.managementFee));
  
  // Portfolio
  metadata.set('aum', (this as any).formatNumber(params.aum));
  metadata.set('holdingsCount', params.holdingsCount.toString());
  if (params.topHoldingPercent) {
    metadata.set('topHoldingPercent', (this as any).formatNumber(params.topHoldingPercent));
  }
  
  // Oracle
  if (params.oracleProvider) metadata.set('oracleProvider', params.oracleProvider);
  if (params.oracleAddress) metadata.set('oracleAddress', params.oracleAddress);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildActivelyManagedCertificate = function(
  params: ActivelyManagedCertificateInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'fund');
  metadata.set('instrumentType', 'actively_managed_certificate');
  metadata.set('strategy', params.strategy);
  
  // Management
  metadata.set('portfolioManager', (this as any).truncate(params.portfolioManager, 50));
  metadata.set('inceptionDate', (this as any).formatDate(params.inceptionDate));
  metadata.set('rebalanceFrequency', params.rebalanceFrequency);
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  metadata.set('navFrequency', params.navFrequency);
  metadata.set('currentNav', (this as any).formatNumber(params.currentNav));
  
  // Fees
  metadata.set('managementFee', (this as any).formatNumber(params.managementFee));
  if (params.performanceFee) {
    metadata.set('performanceFee', (this as any).formatNumber(params.performanceFee));
  }
  if (params.hurdleRate) metadata.set('hurdleRate', (this as any).formatNumber(params.hurdleRate));
  
  // Portfolio Composition
  if (params.longExposure) metadata.set('longExposure', (this as any).formatNumber(params.longExposure));
  if (params.shortExposure) metadata.set('shortExposure', (this as any).formatNumber(params.shortExposure));
  if (params.netExposure) metadata.set('netExposure', (this as any).formatNumber(params.netExposure));
  if (params.leverage) metadata.set('leverage', params.leverage);
  
  // Risk Metrics
  if (params.beta) metadata.set('beta', (this as any).formatNumber(params.beta));
  if (params.sharpeRatio) metadata.set('sharpeRatio', (this as any).formatNumber(params.sharpeRatio));
  if (params.volatility) metadata.set('volatility', (this as any).formatNumber(params.volatility));
  
  // Documents
  if (params.riskDisclosureUri) metadata.set('riskDisclosureUri', params.riskDisclosureUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

// ==========================================================================
// COMMODITIES BUILDERS
// ==========================================================================

OnChainMetadataBuilder.prototype.buildCommoditySpot = function(
  params: CommoditySpotInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'commodity');
  metadata.set('instrumentType', 'commodity_spot');
  metadata.set('commodity', params.commodity);
  metadata.set('unit', params.unit);
  
  // Details
  if (params.purity) metadata.set('purity', params.purity);
  metadata.set('form', params.form);
  if (params.vault) metadata.set('vault', params.vault);
  if (params.vaultAddress) metadata.set('vaultAddress', params.vaultAddress);
  metadata.set('custodian', (this as any).truncate(params.custodian, 50));
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  metadata.set('oracleProvider', params.oracleProvider);
  metadata.set('oracleAddress', params.oracleAddress);
  
  // Physical Backing
  metadata.set('backingRatio', (this as any).formatNumber(params.backingRatio));
  if (params.totalPhysicalGrams) {
    metadata.set('totalPhysicalGrams', params.totalPhysicalGrams.toString());
  }
  if (params.auditFrequency) metadata.set('auditFrequency', params.auditFrequency);
  if (params.lastAuditDate) metadata.set('lastAuditDate', (this as any).formatDate(params.lastAuditDate));
  if (params.auditReportUri) metadata.set('auditReportUri', params.auditReportUri);
  
  // Redemption
  metadata.set('physicalRedemption', params.physicalRedemption ? 'true' : 'false');
  if (params.minRedemptionUnits) metadata.set('minRedemptionUnits', params.minRedemptionUnits.toString());
  if (params.redemptionFee) metadata.set('redemptionFee', (this as any).formatNumber(params.redemptionFee));

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildCommodityFutures = function(
  params: CommodityFuturesInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'commodity');
  metadata.set('instrumentType', 'commodity_futures');
  metadata.set('commodity', params.commodity);
  metadata.set('contract', params.contract);
  
  // Contract Specs
  metadata.set('contractSize', params.contractSize.toString());
  metadata.set('tickSize', (this as any).formatNumber(params.tickSize));
  metadata.set('expiryDate', (this as any).formatDate(params.expiryDate));
  metadata.set('deliveryMonth', params.deliveryMonth);
  if (params.deliveryLocation) metadata.set('deliveryLocation', params.deliveryLocation);
  
  // Pricing
  metadata.set('currentPrice', (this as any).formatNumber(params.currentPrice));
  if (params.settlementPrice) {
    metadata.set('settlementPrice', (this as any).formatNumber(params.settlementPrice));
  }
  metadata.set('oracleProvider', params.oracleProvider);
  metadata.set('oracleAddress', params.oracleAddress);
  
  // Margin
  if (params.initialMargin) metadata.set('initialMargin', (this as any).formatNumber(params.initialMargin));
  if (params.maintenanceMargin) {
    metadata.set('maintenanceMargin', (this as any).formatNumber(params.maintenanceMargin));
  }
  
  // Contango/Backwardation
  if (params.contango) metadata.set('contango', (this as any).formatNumber(params.contango));
  if (params.nextContractPrice) {
    metadata.set('nextContractPrice', (this as any).formatNumber(params.nextContractPrice));
  }
  if (params.rollDate) metadata.set('rollDate', (this as any).formatDate(params.rollDate));
  
  // Settlement
  metadata.set('settlementType', params.settlementType);
  if (params.finalSettlement) metadata.set('finalSettlement', params.finalSettlement);
  
  // Exchange
  if (params.exchange) metadata.set('exchange', params.exchange);
  if (params.contractSpecsUri) metadata.set('contractSpecsUri', params.contractSpecsUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

OnChainMetadataBuilder.prototype.buildTrackerCertificate = function(
  params: TrackerCertificateInput
): OnChainMetadataResult {
  const metadata = new Map<string, string>();

  (this as any).addUniversalFields(metadata, params);
  
  metadata.set('assetClass', 'commodity');
  metadata.set('instrumentType', 'tracker_certificate');
  metadata.set('trackerType', params.trackerType);
  
  // Composition
  if (params.basket) metadata.set('basket', params.basket);
  if (params.rebalanceFrequency) metadata.set('rebalanceFrequency', params.rebalanceFrequency);
  if (params.lastRebalance) metadata.set('lastRebalance', (this as any).formatDate(params.lastRebalance));
  
  // Valuation
  metadata.set('valuationMethod', params.valuationMethod);
  metadata.set('navFrequency', params.navFrequency);
  metadata.set('currentNav', (this as any).formatNumber(params.currentNav));
  
  // Fees
  metadata.set('managementFee', (this as any).formatNumber(params.managementFee));
  if (params.trackingError) metadata.set('trackingError', (this as any).formatNumber(params.trackingError));
  
  // Oracle
  metadata.set('oracleProvider', params.oracleProvider);
  if (params.oracleAddresses) metadata.set('oracleAddresses', params.oracleAddresses);
  
  // Redemption
  metadata.set('redemptionMethod', params.redemptionMethod);
  if (params.redemptionVault) metadata.set('redemptionVault', params.redemptionVault);
  
  // Documents
  if (params.basketCompositionUri) metadata.set('basketCompositionUri', params.basketCompositionUri);

  return (this as any).finalizeMetadata(params.name, params.symbol, params.uri, metadata);
};

export {};
