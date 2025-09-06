import { supabase } from '@/infrastructure/database/client';
import { EnergyAsset, ClimateReceivable } from '../../types';
import { 
  LCOEAnalysis, 
  PPAAnalysis, 
  CarbonCreditValuation,
  AdditionalityAssessment,
  ClimateNAVResult,
  CLIMATE_INDUSTRY_BENCHMARKS,
  CLIMATE_RISK_THRESHOLDS,
  MaintenanceCost,
  ReplacementCost,
  TaxCreditStructure
} from '../../types/climate-nav-types';
import {
  ClimateNAVCalculation
} from '../../types/enhanced-types';

/**
 * Climate NAV Valuation Service
 * Implements climate-specific valuation frameworks per NAV Pricing specification:
 * - LCOE (Levelized Cost of Energy) benchmarking
 * - PPA (Power Purchase Agreement) rate analysis
 * - Carbon Credit market multiples
 * - Additionality scoring for emissions reductions
 * - Climate-specific NAV calculation methods
 */

// ============================================================================
// ADDITIONAL SERVICE-SPECIFIC INTERFACES
// ============================================================================

interface ClimateValuationMetrics {
  lcoe: number; // $/MWh - average cost per unit over project lifetime
  capacityFactor: number; // 0.1-0.2 for solar/wind actual vs max output
  ppaRate: number; // Fixed rate from Power Purchase Agreement
  carbonCreditPrice: number; // Market price per tonne CO2e
  additionalityScore: number; // Emissions reduction verification (0-1)
  degradationRate: number; // Annual performance degradation %
  operationalLife: number; // Years of expected operation
}

// ============================================================================
// CLIMATE NAV VALUATION SERVICE
// ============================================================================

export class ClimateNAVValuationService {

  // ============================================================================
  // MAIN VALUATION METHODS
  // ============================================================================

  /**
   * Calculate comprehensive climate-specific NAV for energy asset
   */
  public static async calculateClimateNAV(
    assetId: string,
    methodology: 'DCF' | 'comparables' | 'cost' | 'hybrid' = 'hybrid'
  ): Promise<ClimateNAVResult> {
    try {
      console.log(`🌍 Calculating climate NAV for asset ${assetId} using ${methodology} methodology...`);

      // Step 1: Get asset details and current metrics
      const asset = await this.getAssetDetails(assetId);
      const currentMetrics = await this.calculateCurrentMetrics(asset);

      // Step 2: Calculate LCOE and benchmark comparison
      const lcoeValuation = await this.calculateLCOEValuation(asset, currentMetrics);

      // Step 3: Analyze PPA contracts and market comparison
      const contractValuation = await this.calculateContractValuation(asset);

      // Step 4: Assess carbon credit value and additionality
      const carbonValuation = await this.calculateCarbonValuation(asset, currentMetrics);

      // Step 5: Calculate production value with risk adjustments
      const productionValuation = await this.calculateProductionValuation(asset, currentMetrics);

      // Step 6: Apply risk adjustments
      const riskAdjustments = await this.calculateRiskAdjustments(asset, methodology);

      // Step 7: Calculate composite NAV
      const compositeNAV = this.calculateCompositeNAV(
        lcoeValuation,
        productionValuation,
        contractValuation,
        carbonValuation,
        riskAdjustments
      );

      // Step 8: Save valuation to database
      await this.saveValuationResults({
        assetId,
        methodology,
        nav: compositeNAV.riskAdjustedNAV,
        confidence: (compositeNAV.confidenceInterval.high - compositeNAV.confidenceInterval.low) / compositeNAV.baseNAV
      });

      const result: ClimateNAVResult = {
        assetId,
        valuationDate: new Date().toISOString(),
        methodology,
        lcoeAnalysis: lcoeValuation,
        capacityAnalysis: {
          currentCapacityFactor: currentMetrics.capacityFactor,
          industryAverage: CLIMATE_INDUSTRY_BENCHMARKS.capacityFactors[asset.type as keyof typeof CLIMATE_INDUSTRY_BENCHMARKS.capacityFactors]?.average || 0.25,
          performanceRanking: currentMetrics.capacityFactor > 0.3 ? 'excellent' : 'average',
          factors: {
            seasonalFactors: [0.8, 0.9, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.8],
            weatherImpact: 0.1,
            degradationRate: currentMetrics.degradationRate,
            availabilityFactor: 0.95
          }
        },
        ppaAnalysis: contractValuation.ppaAnalysis || {
          contract: {
            type: 'merchant',
            baseRate: 50,
            escalationRate: 0.02,
            contractTerm: 20,
            remainingTerm: 20
          },
          counterparty: {
            creditRating: 'BBB',
            creditworthiness: 'fair',
            paymentHistoryScore: 0.85
          },
          risks: {
            curtailmentRisk: 0.05,
            transmissionRisk: 0.03,
            counterpartyRisk: 0.05
          },
          marketComparison: {
            marketRate: 52,
            premiumDiscount: -2,
            competitiveness: 'discount'
          }
        },
        carbonValuation: {
          credits: {
            verifiedCreditsAnnual: carbonValuation.verifiedCredits,
            totalLifetimeCredits: carbonValuation.verifiedCredits * 25,
            currentPrice: carbonValuation.creditPrice,
            priceProjection: Array.from({length: 10}, (_, i) => carbonValuation.creditPrice * Math.pow(1.08, i))
          },
          verification: {
            standard: 'VCS',
            vintageYear: new Date().getFullYear(),
            permanence: 25,
            leakage: 0.05
          },
          additionality: carbonValuation.additionalityAssessment,
          marketFactors: {
            qualityPremium: carbonValuation.additionalityPremium,
            liquidityAdjustment: 0.02,
            marketSegmentAdjustment: 0.05
          }
        },
        valuation: {
          baseNAV: compositeNAV.baseNAV,
          riskAdjustedNAV: compositeNAV.riskAdjustedNAV,
          confidenceInterval: compositeNAV.confidenceInterval
        },
        riskAdjustments: riskAdjustments,
        recommendations: {
          investment: compositeNAV.riskAdjustedNAV > compositeNAV.baseNAV * 1.1 ? 'BUY' : 
                     compositeNAV.riskAdjustedNAV < compositeNAV.baseNAV * 0.9 ? 'SELL' : 'HOLD',
          targetPrice: {
            low: compositeNAV.confidenceInterval.low,
            mid: compositeNAV.riskAdjustedNAV,
            high: compositeNAV.confidenceInterval.high
          },
          valueDrivers: ['LCOE competitiveness', 'Contract security', 'Carbon credit potential'],
          riskMitigation: ['Weather hedging', 'Contract diversification', 'Performance monitoring']
        }
      };

      console.log(`✅ Climate NAV calculated: $${compositeNAV.riskAdjustedNAV.toLocaleString()} (${methodology})`);
      return result;

    } catch (error) {
      console.error('❌ Climate NAV calculation failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // LCOE CALCULATION AND BENCHMARKING
  // ============================================================================

  /**
   * Calculate LCOE and compare to industry benchmarks
   */
  private static async calculateLCOEValuation(
    asset: EnergyAsset,
    metrics: ClimateValuationMetrics
  ): Promise<any> {
    console.log(`💡 Calculating LCOE for ${asset.type} asset...`);

    // Get LCOE components from asset financials
    const lcoeComponents = await this.getLCOEComponents(asset);
    
    // Calculate LCOE using standard formula
    const calculatedLCOE = this.calculateLCOE(
      lcoeComponents,
      metrics.capacityFactor,
      metrics.operationalLife,
      metrics.degradationRate
    );

    // Get benchmark LCOE for this technology
    const benchmarkData = CLIMATE_INDUSTRY_BENCHMARKS.lcoe[asset.type as keyof typeof CLIMATE_INDUSTRY_BENCHMARKS.lcoe];
    let benchmarkLCOE = calculatedLCOE;
    
    if (benchmarkData) {
      if ('utility' in benchmarkData) {
        benchmarkLCOE = benchmarkData.utility.average;
      } else if ('onshore' in benchmarkData) {
        benchmarkLCOE = benchmarkData.onshore.average;
      } else if ('large' in benchmarkData) {
        benchmarkLCOE = benchmarkData.large.average;
      }
    }

    // Calculate competitiveness
    const competitiveness = (benchmarkLCOE - calculatedLCOE) / benchmarkLCOE;
    const costAdvantage = benchmarkLCOE - calculatedLCOE;

    console.log(`📊 LCOE: $${calculatedLCOE.toFixed(2)}/MWh vs benchmark $${benchmarkLCOE.toFixed(2)}/MWh (${(competitiveness * 100).toFixed(1)}% advantage)`);

    return {
      calculatedLCOE,
      benchmarkLCOE,
      competitiveness,
      costAdvantage
    };
  }

  /**
   * Calculate LCOE using standard methodology
   * LCOE = (CAPEX + NPV of OPEX) / NPV of Energy Production
   */
  private static calculateLCOE(
    components: LCOEAnalysis['components'],
    capacityFactor: number,
    operationalLife: number,
    degradationRate: number
  ): number {
    const discountRate = 0.08; // 8% WACC assumption
    
    // Calculate total costs (CAPEX + NPV of OPEX)
    let totalCosts = components.capitalExpenditure;
    
    // Add NPV of operational expenses
    for (let year = 1; year <= operationalLife; year++) {
      const opex = components.operationalExpenses;
      const pvFactor = 1 / Math.pow(1 + discountRate, year);
      totalCosts += opex * pvFactor;
    }
    
    // Add maintenance and replacement costs
    components.maintenanceSchedule.forEach(maintenance => {
      if (maintenance.year <= operationalLife) {
        const pvFactor = 1 / Math.pow(1 + discountRate, maintenance.year);
        totalCosts += maintenance.cost * pvFactor;
      }
    });
    
    components.replacementCosts.forEach(replacement => {
      if (replacement.year <= operationalLife) {
        const pvFactor = 1 / Math.pow(1 + discountRate, replacement.year);
        totalCosts += replacement.cost * pvFactor;
      }
    });
    
    // Subtract end-of-life value
    const salvagePV = components.endOfLifeValue / Math.pow(1 + discountRate, operationalLife);
    totalCosts -= salvagePV;
    
    // Calculate total energy production (MWh)
    let totalEnergy = 0;
    const asset = { capacity: 100 }; // Would get from actual asset
    
    for (let year = 1; year <= operationalLife; year++) {
      // Apply degradation
      const performanceFactor = Math.pow(1 - degradationRate, year - 1);
      const annualEnergy = asset.capacity * capacityFactor * 8760 * performanceFactor; // 8760 hours/year
      const pvFactor = 1 / Math.pow(1 + discountRate, year);
      totalEnergy += annualEnergy * pvFactor;
    }
    
    return totalCosts / totalEnergy;
  }

  // ============================================================================
  // PPA CONTRACT ANALYSIS
  // ============================================================================

  /**
   * Analyze PPA contracts and calculate contract value
   */
  private static async calculateContractValuation(asset: EnergyAsset): Promise<any> {
    console.log(`📋 Analyzing PPA contracts for asset ${asset.assetId}...`);

    // Get PPA details from database or contracts
    const ppaAnalysis = await this.getPPAAnalysis(asset);
    
    if (!ppaAnalysis) {
      console.log('🔸 No PPA contract found, using merchant pricing');
      return this.calculateMerchantValuation(asset);
    }

    // Calculate PPA value
    const ppaValue = this.calculatePPAValue(ppaAnalysis, asset);
    
    // Calculate merchant alternative
    const merchantValue = await this.calculateMerchantValue(asset);
    
    // Calculate contract premium
    const contractPremium = ppaValue - merchantValue;
    
    // Assess counterparty credit risk
    const counterpartyRisk = this.assessCounterpartyRisk(ppaAnalysis.counterparty.creditworthiness);

    console.log(`💰 PPA Value: $${(ppaValue / 1000000).toFixed(1)}M vs Merchant: $${(merchantValue / 1000000).toFixed(1)}M (Premium: $${(contractPremium / 1000000).toFixed(1)}M)`);

    return {
      ppaValue,
      merchantValue,
      contractPremium,
      counterpartyRisk,
      ppaAnalysis: ppaAnalysis
    };
  }

  /**
   * Calculate NPV of PPA contract cash flows
   */
  private static calculatePPAValue(ppaAnalysis: PPAAnalysis, asset: EnergyAsset): number {
    const discountRate = 0.06; // Lower discount rate for contracted cash flows
    let totalValue = 0;
    
    for (let year = 1; year <= ppaAnalysis.contract.contractTerm; year++) {
      // Calculate annual rate with escalation
      let annualRate = ppaAnalysis.contract.baseRate;
      if (ppaAnalysis.contract.type === 'escalating') {
        annualRate *= Math.pow(1 + ppaAnalysis.contract.escalationRate, year - 1);
      }
      
      // Estimate annual production (simplified)
      const annualProduction = asset.capacity * 0.25 * 8760; // 25% capacity factor assumption
      
      // Apply curtailment risk
      const deliveredProduction = annualProduction * (1 - ppaAnalysis.risks.curtailmentRisk);
      
      // Calculate annual revenue
      const annualRevenue = deliveredProduction * annualRate;
      
      // Present value
      const pvFactor = 1 / Math.pow(1 + discountRate, year);
      totalValue += annualRevenue * pvFactor;
    }
    
    return totalValue;
  }

  // ============================================================================
  // CARBON CREDIT VALUATION
  // ============================================================================

  /**
   * Calculate carbon credit value with additionality assessment
   */
  private static async calculateCarbonValuation(
    asset: EnergyAsset,
    metrics: ClimateValuationMetrics
  ): Promise<any> {
    console.log(`🌱 Calculating carbon credit value for ${asset.type} asset...`);

    // Assess additionality for the project
    const additionalityAssessment = await this.assessAdditionality(asset);
    
    // Calculate annual verified credits
    const annualCredits = this.calculateAnnualCarbonCredits(asset, additionalityAssessment);
    
    // Get carbon credit price based on verification standard (default to VCS)
    const creditPrice = this.getCarbonCreditPrice('VCS');
    
    // Calculate additionality premium
    const additionalityPremium = this.calculateAdditionalityPremium(
      additionalityAssessment,
      creditPrice
    );
    
    // Calculate NPV of carbon revenue stream
    const carbonNPV = this.calculateCarbonNPV(
      annualCredits,
      creditPrice + additionalityPremium,
      30 // Default permanence period of 30 years for carbon credits
    );

    console.log(`🌿 Carbon Value: ${annualCredits.toFixed(0)} tCO2e/year × $${(creditPrice + additionalityPremium).toFixed(2)}/tonne = $${(carbonNPV / 1000000).toFixed(1)}M NPV`);

    return {
      verifiedCredits: annualCredits,
      creditPrice,
      carbonNPV,
      additionalityPremium,
      additionalityAssessment: additionalityAssessment
    };
  }

  /**
   * Assess project additionality per international standards
   */
  private static async assessAdditionality(asset: EnergyAsset): Promise<AdditionalityAssessment> {
    // This would integrate with actual additionality assessment tools
    // For now, using simplified logic based on asset characteristics
    
    const baselineEmissions = await this.calculateBaselineEmissions(asset);
    const projectEmissions = await this.calculateProjectEmissions(asset);
    const netReduction = baselineEmissions - projectEmissions;
    
    // Simplified additionality assessment
    const additionalityTests = {
      financial: {
        passed: true, // Assume project needs carbon revenue
        evidence: 'Project requires carbon revenue for financial viability',
        confidenceLevel: 0.8
      },
      regulatory: {
        passed: true, // Beyond minimum requirements
        evidence: 'Project exceeds regulatory requirements',
        confidenceLevel: 0.9
      },
      commonPractice: {
        passed: asset.type === 'solar' || asset.type === 'wind', // Common practice test
        evidence: 'Technology is becoming common practice',
        confidenceLevel: 0.7
      },
      barriers: {
        passed: !(asset.type === 'solar' || asset.type === 'wind'), // Barrier test
        evidence: 'Project overcomes technical and financial barriers',
        confidenceLevel: 0.6
      }
    };
    
    // Calculate overall additionality score
    const passedTests = Object.values(additionalityTests).filter(test => test.passed).length;
    const overallScore = passedTests / Object.keys(additionalityTests).length;
    
    return {
      overallScore,
      tests: additionalityTests,
      baseline: {
        baselineEmissions,
        projectEmissions,
        netReduction
      }
    };
  }

  /**
   * Calculate annual carbon credits based on energy production
   */
  private static calculateAnnualCarbonCredits(
    asset: EnergyAsset,
    assessment: AdditionalityAssessment
  ): number {
    // Standard emission factor for grid electricity (tCO2e/MWh)
    const gridEmissionFactor = 0.4; // US average
    
    // Annual energy production
    const annualProduction = asset.capacity * 0.25 * 8760; // 25% capacity factor
    
    // Gross carbon credits
    const grossCredits = annualProduction * gridEmissionFactor;
    
    // Apply leakage reduction (using fixed 5% since leakage not in assessment type)
    const leakageRate = 0.05;
    const netCredits = grossCredits * (1 - leakageRate);
    
    // Apply additionality multiplier based on overall score
    return netCredits * assessment.overallScore;
  }

  // ============================================================================
  // RISK ADJUSTMENTS AND COMPOSITE NAV
  // ============================================================================

  /**
   * Calculate risk adjustments for different valuation methodologies
   */
  private static async calculateRiskAdjustments(
    asset: EnergyAsset,
    methodology: string
  ): Promise<any> {
    console.log(`⚠️  Calculating risk adjustments for ${methodology} methodology...`);

    // Technology-specific risk factors
    const technologyRisk = this.getTechnologyRisk(asset.type);
    
    // Regulatory risk based on policy environment
    const regulatoryRisk = await this.assessRegulatoryRisk(asset);
    
    // Market risk based on price volatility
    const marketRisk = this.assessMarketRisk(asset);
    
    // Operational risk based on asset characteristics
    const operationalRisk = this.assessOperationalRisk(asset);

    return {
      technologyRisk,
      regulatoryRisk,
      marketRisk,
      operationalRisk
    };
  }

  /**
   * Calculate composite NAV combining all valuation components
   */
  private static calculateCompositeNAV(
    lcoeValuation: any,
    productionValuation: any,
    contractValuation: any,
    carbonValuation: any,
    riskAdjustments: any
  ): any {
    // Base NAV calculation
    const baseNAV = 
      productionValuation.baseCase +
      contractValuation.contractPremium +
      carbonValuation.carbonNPV;
    
    // Apply risk adjustments
    const totalRiskDiscount = 
      riskAdjustments.technologyRisk +
      riskAdjustments.regulatoryRisk +
      riskAdjustments.marketRisk +
      riskAdjustments.operationalRisk;
    
    const riskAdjustedNAV = baseNAV * (1 - totalRiskDiscount);
    
    // Calculate confidence interval (simplified Monte Carlo)
    const volatility = 0.15; // 15% assumed volatility
    const confidenceInterval = {
      low: riskAdjustedNAV * (1 - 1.645 * volatility), // P10
      high: riskAdjustedNAV * (1 + 1.645 * volatility) // P90
    };

    return {
      baseNAV,
      riskAdjustedNAV,
      confidenceInterval
    };
  }

  // ============================================================================
  // HELPER METHODS AND DATA ACCESS
  // ============================================================================

  /**
   * Get comprehensive asset details from database
   */
  private static async getAssetDetails(assetId: string): Promise<EnergyAsset> {
    const { data, error } = await supabase
      .from('energy_assets')
      .select('*')
      .eq('asset_id', assetId)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Calculate current asset metrics
   */
  private static async calculateCurrentMetrics(asset: EnergyAsset): Promise<ClimateValuationMetrics> {
    // This would integrate with real-time asset performance data
    
    // Default capacity factors by technology
    const capacityFactors = {
      solar: 0.22,
      wind: 0.35,
      hydro: 0.45
    };
    
    return {
      lcoe: 0, // Will be calculated
      capacityFactor: capacityFactors[asset.type as keyof typeof capacityFactors] || 0.25,
      ppaRate: 50, // $50/MWh default
      carbonCreditPrice: 30, // $30/tonne
      additionalityScore: 0.8, // 80% additionality
      degradationRate: 0.005, // 0.5% annual degradation
      operationalLife: 25 // 25 years
    };
  }

  /**
   * Get LCOE components from asset financials
   */
  private static async getLCOEComponents(asset: EnergyAsset): Promise<LCOEAnalysis['components']> {
    // This would integrate with actual project financial data
    return {
      capitalExpenditure: asset.capacity * 1500000, // $1.5M/MW assumption
      operationalExpenses: asset.capacity * 25000, // $25k/MW/year
      maintenanceSchedule: [
        { year: 5, cost: asset.capacity * 50000, description: 'Major maintenance', criticality: 'major' },
        { year: 10, cost: asset.capacity * 50000, description: 'Major maintenance', criticality: 'major' },
        { year: 15, cost: asset.capacity * 50000, description: 'Major maintenance', criticality: 'major' },
        { year: 20, cost: asset.capacity * 50000, description: 'Major maintenance', criticality: 'major' }
      ],
      replacementCosts: [
        { year: 12, cost: asset.capacity * 100000, component: 'Inverter replacement', impact: 'moderate' }
      ],
      endOfLifeValue: asset.capacity * 50000, // $50k/MW salvage
      taxCredits: {
        federalITC: 0.30, // 30% ITC
        stateTaxCredit: 0.10, // 10% state credit
        depreciation: 'MACRS'
      }
    };
  }

  /**
   * Technology risk factors by asset type
   */
  private static getTechnologyRisk(assetType: string): number {
    const technologyRisks = {
      solar: 0.05, // 5% discount for mature technology
      wind: 0.07, // 7% discount for weather dependency
      hydro: 0.10, // 10% discount for regulatory complexity
      other: 0.15 // 15% discount for emerging technologies
    };
    
    return technologyRisks[assetType as keyof typeof technologyRisks] || technologyRisks.other;
  }

  // Additional helper methods (simplified for brevity)
  private static async getPPAAnalysis(asset: EnergyAsset): Promise<PPAAnalysis | null> {
    // Would query actual PPA contracts from database
    return null;
  }

  private static async calculateMerchantValuation(asset: EnergyAsset): Promise<any> {
    const merchantValue = asset.capacity * 1000000; // Simplified merchant value
    return { 
      ppaValue: 0,
      merchantValue,
      contractPremium: 0,
      counterpartyRisk: 0.1,
      ppaAnalysis: null
    };
  }

  private static async calculateMerchantValue(asset: EnergyAsset): Promise<number> {
    return asset.capacity * 1000000; // Simplified merchant value
  }

  private static assessCounterpartyRisk(creditRating: string): number {
    const riskFactors = {
      'AAA': 0.01, 'AA': 0.02, 'A': 0.03, 'BBB': 0.05,
      'BB': 0.08, 'B': 0.12, 'CCC': 0.20
    };
    return riskFactors[creditRating as keyof typeof riskFactors] || 0.15;
  }

  private static getCarbonCreditPrice(standard: string): number {
    const benchmarks = CLIMATE_INDUSTRY_BENCHMARKS.carbonCredits;
    return benchmarks[standard as keyof typeof benchmarks]?.average || 30;
  }

  private static calculateAdditionalityPremium(assessment: AdditionalityAssessment, basePrice: number): number {
    // Use the overall additionality score from the assessment
    return basePrice * assessment.overallScore * 0.2; // Up to 20% premium
  }

  private static calculateCarbonNPV(annualCredits: number, creditPrice: number, permanence: number): number {
    const discountRate = 0.08;
    let npv = 0;
    
    for (let year = 1; year <= permanence; year++) {
      const pvFactor = 1 / Math.pow(1 + discountRate, year);
      npv += annualCredits * creditPrice * pvFactor;
    }
    
    return npv;
  }

  private static async calculateBaselineEmissions(asset: EnergyAsset): Promise<number> {
    return asset.capacity * 0.25 * 8760 * 0.4; // Simplified grid displacement
  }

  private static async calculateProjectEmissions(asset: EnergyAsset): Promise<number> {
    return 0; // Renewable energy projects have minimal operational emissions
  }

  private static async calculateProductionValuation(asset: EnergyAsset, metrics: ClimateValuationMetrics): Promise<any> {
    const baseCase = asset.capacity * 1200000; // $1.2M/MW base valuation
    return {
      baseCase,
      weatherRisk: baseCase * 0.95,
      degradationAdjusted: baseCase * 0.92,
      curtailmentAdjusted: baseCase * 0.98
    };
  }

  private static async assessRegulatoryRisk(asset: EnergyAsset): Promise<number> {
    return 0.05; // 5% regulatory risk
  }

  private static assessMarketRisk(asset: EnergyAsset): number {
    return 0.08; // 8% market risk
  }

  private static assessOperationalRisk(asset: EnergyAsset): number {
    return 0.03; // 3% operational risk
  }

  private static async saveValuationResults(results: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('climate_cash_flow_projections')
        .insert({
          projection_date: new Date().toISOString().split('T')[0],
          projected_amount: results.nav,
          source_type: 'climate_nav',
          entity_id: results.assetId,
          methodology: results.methodology
        });
      
      if (error) throw error;
      console.log('✅ Climate NAV valuation saved to database');
    } catch (error) {
      console.error('❌ Error saving valuation results:', error);
    }
  }
}
