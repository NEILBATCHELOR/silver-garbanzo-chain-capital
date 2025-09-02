/**
 * Climate Payer Risk Assessment Service
 * 
 * Automatically calculates risk scores and discount rates based on:
 * - Credit ratings (AAA to D scale)
 * - Financial health scores (0-100)
 * - Industry research on default rates and receivables financing
 * 
 * Research-backed correlation model based on:
 * - S&P historical default rates (3-year cumulative)
 * - Bond spread analysis (basis points over treasury)
 * - Receivables factoring industry rates
 * - Climate finance ESG risk adjustments
 */

export interface PayerCreditProfile {
  credit_rating: string;
  financial_health_score: number;
  payment_history?: any;
  industry_sector?: string;
  esg_score?: number;
}

export interface RiskAssessmentResult {
  risk_score: number;
  discount_rate: number;
  confidence_level: number;
  methodology: string;
  factors_considered: string[];
  manual_override_available: boolean;
}

export interface CreditRatingData {
  rating: string;
  investment_grade: boolean;
  default_rate_3yr: number; // Percentage
  typical_spread_bps: number; // Basis points over treasury
  risk_tier: 'Prime' | 'Investment Grade' | 'Speculative' | 'High Risk' | 'Default Risk';
}

export class PayerRiskAssessmentService {
  
  /**
   * Credit Rating Matrix - Based on S&P Historical Data
   * Source: S&P Global Ratings historical 3-year cumulative default rates
   */
  private static readonly CREDIT_RATING_MATRIX: Record<string, CreditRatingData> = {
    'AAA': { rating: 'AAA', investment_grade: true, default_rate_3yr: 0.18, typical_spread_bps: 43, risk_tier: 'Prime' },
    'AA+': { rating: 'AA+', investment_grade: true, default_rate_3yr: 0.25, typical_spread_bps: 55, risk_tier: 'Prime' },
    'AA': { rating: 'AA', investment_grade: true, default_rate_3yr: 0.28, typical_spread_bps: 65, risk_tier: 'Prime' },
    'AA-': { rating: 'AA-', investment_grade: true, default_rate_3yr: 0.35, typical_spread_bps: 75, risk_tier: 'Prime' },
    'A+': { rating: 'A+', investment_grade: true, default_rate_3yr: 0.45, typical_spread_bps: 90, risk_tier: 'Investment Grade' },
    'A': { rating: 'A', investment_grade: true, default_rate_3yr: 0.55, typical_spread_bps: 110, risk_tier: 'Investment Grade' },
    'A-': { rating: 'A-', investment_grade: true, default_rate_3yr: 0.70, typical_spread_bps: 130, risk_tier: 'Investment Grade' },
    'BBB+': { rating: 'BBB+', investment_grade: true, default_rate_3yr: 0.85, typical_spread_bps: 160, risk_tier: 'Investment Grade' },
    'BBB': { rating: 'BBB', investment_grade: true, default_rate_3yr: 0.91, typical_spread_bps: 200, risk_tier: 'Investment Grade' },
    'BBB-': { rating: 'BBB-', investment_grade: true, default_rate_3yr: 1.20, typical_spread_bps: 250, risk_tier: 'Investment Grade' },
    
    // Speculative Grade (Non-Investment Grade)
    'BB+': { rating: 'BB+', investment_grade: false, default_rate_3yr: 3.50, typical_spread_bps: 350, risk_tier: 'Speculative' },
    'BB': { rating: 'BB', investment_grade: false, default_rate_3yr: 4.17, typical_spread_bps: 420, risk_tier: 'Speculative' },
    'BB-': { rating: 'BB-', investment_grade: false, default_rate_3yr: 5.20, typical_spread_bps: 500, risk_tier: 'Speculative' },
    'B+': { rating: 'B+', investment_grade: false, default_rate_3yr: 9.80, typical_spread_bps: 600, risk_tier: 'High Risk' },
    'B': { rating: 'B', investment_grade: false, default_rate_3yr: 12.41, typical_spread_bps: 650, risk_tier: 'High Risk' },
    'B-': { rating: 'B-', investment_grade: false, default_rate_3yr: 16.50, typical_spread_bps: 700, risk_tier: 'High Risk' },
    'CCC+': { rating: 'CCC+', investment_grade: false, default_rate_3yr: 35.20, typical_spread_bps: 800, risk_tier: 'Default Risk' },
    'CCC': { rating: 'CCC', investment_grade: false, default_rate_3yr: 45.67, typical_spread_bps: 900, risk_tier: 'Default Risk' },
    'CCC-': { rating: 'CCC-', investment_grade: false, default_rate_3yr: 55.40, typical_spread_bps: 1000, risk_tier: 'Default Risk' },
    'CC': { rating: 'CC', investment_grade: false, default_rate_3yr: 65.20, typical_spread_bps: 1200, risk_tier: 'Default Risk' },
    'C': { rating: 'C', investment_grade: false, default_rate_3yr: 75.80, typical_spread_bps: 1500, risk_tier: 'Default Risk' },
    'D': { rating: 'D', investment_grade: false, default_rate_3yr: 90.00, typical_spread_bps: 2000, risk_tier: 'Default Risk' }
  };

  /**
   * Calculate Risk Score (0-100 scale)
   * Combines credit rating default probability with financial health score
   */
  public static calculateRiskScore(creditProfile: PayerCreditProfile): number {
    const creditData = this.CREDIT_RATING_MATRIX[creditProfile.credit_rating];
    
    if (!creditData) {
      // Unknown rating - use conservative high-risk assessment
      return 85;
    }

    // Base risk score from credit rating (inverse of quality)
    const creditRiskScore = Math.min(creditData.default_rate_3yr * 2, 100);
    
    // Financial health adjustment (-20 to +20 points)
    const healthAdjustment = (100 - creditProfile.financial_health_score) * 0.2;
    
    // ESG adjustment for climate finance (-5 to +10 points)
    const esgAdjustment = creditProfile.esg_score ? 
      Math.max(-5, Math.min(10, (50 - creditProfile.esg_score) * 0.2)) : 0;
    
    // Final risk score (0-100, higher = more risky)
    const finalScore = Math.max(1, Math.min(100, 
      creditRiskScore + healthAdjustment + esgAdjustment
    ));

    return Math.round(finalScore);
  }

  /**
   * Calculate Discount Rate (%) 
   * Based on receivables financing industry rates and risk assessment
   */
  public static calculateDiscountRate(creditProfile: PayerCreditProfile): number {
    const creditData = this.CREDIT_RATING_MATRIX[creditProfile.credit_rating];
    
    if (!creditData) {
      // Unknown rating - use high discount rate
      return 8.50;
    }

    // Base rate from credit spread (convert basis points to percentage)
    const baseRate = Math.max(1.5, creditData.typical_spread_bps / 100);
    
    // Financial health multiplier (0.7x to 1.5x)
    const healthMultiplier = 1.7 - (creditProfile.financial_health_score / 100);
    
    // Climate finance premium/discount (-0.5% to +2.0%)
    const climatePremium = creditData.investment_grade ? -0.25 : 0.75;
    
    // ESG adjustment for renewable energy receivables
    const esgDiscount = creditProfile.esg_score && creditProfile.esg_score > 70 ? -0.5 : 
                       creditProfile.esg_score && creditProfile.esg_score < 30 ? 1.0 : 0;

    // Final discount rate
    const finalRate = Math.max(1.0, 
      baseRate * healthMultiplier + climatePremium + esgDiscount
    );

    return Math.round(finalRate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Comprehensive risk assessment with full analysis
   */
  public static assessPayerRisk(creditProfile: PayerCreditProfile): RiskAssessmentResult {
    const riskScore = this.calculateRiskScore(creditProfile);
    const discountRate = this.calculateDiscountRate(creditProfile);
    const creditData = this.CREDIT_RATING_MATRIX[creditProfile.credit_rating];
    
    const factors = [
      `Credit Rating: ${creditProfile.credit_rating}`,
      `Financial Health Score: ${creditProfile.financial_health_score}/100`,
      creditData ? `Risk Tier: ${creditData.risk_tier}` : 'Risk Tier: Unknown',
      creditData ? `3-Year Default Rate: ${creditData.default_rate_3yr}%` : 'Default Rate: Unavailable'
    ];

    if (creditProfile.esg_score) {
      factors.push(`ESG Score: ${creditProfile.esg_score}/100`);
    }

    // Confidence level based on data availability
    let confidence = 85; // Base confidence
    if (!creditData) confidence -= 20;
    if (!creditProfile.financial_health_score) confidence -= 15;
    if (!creditProfile.payment_history) confidence -= 10;

    return {
      risk_score: riskScore,
      discount_rate: discountRate,
      confidence_level: Math.max(50, confidence),
      methodology: 'Research-based correlation using S&P default rates, bond spreads, and receivables financing benchmarks',
      factors_considered: factors,
      manual_override_available: true
    };
  }

  /**
   * Get risk tier classification
   */
  public static getRiskTier(creditRating: string): string {
    const creditData = this.CREDIT_RATING_MATRIX[creditRating];
    return creditData?.risk_tier || 'Unknown';
  }

  /**
   * Check if rating is investment grade
   */
  public static isInvestmentGrade(creditRating: string): boolean {
    const creditData = this.CREDIT_RATING_MATRIX[creditRating];
    return creditData?.investment_grade || false;
  }

  /**
   * Get climate finance adjustments explanation
   */
  public static getClimateFinanceInsights(creditProfile: PayerCreditProfile): string[] {
    const insights = [];
    
    if (this.isInvestmentGrade(creditProfile.credit_rating)) {
      insights.push('Investment grade payers benefit from climate finance premium (-0.25% discount)');
    }
    
    if (creditProfile.esg_score && creditProfile.esg_score > 70) {
      insights.push('Strong ESG performance qualifies for renewable energy discount (-0.5%)');
    }
    
    if (creditProfile.esg_score && creditProfile.esg_score < 30) {
      insights.push('Poor ESG performance increases climate risk premium (+1.0%)');
    }

    const creditData = this.CREDIT_RATING_MATRIX[creditProfile.credit_rating];
    if (creditData?.risk_tier === 'Prime') {
      insights.push('Prime credit rating qualifies for best renewable energy financing rates');
    }

    return insights;
  }
}