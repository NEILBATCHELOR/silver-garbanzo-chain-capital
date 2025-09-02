import { ClimateReceivable, ClimateRiskFactor, ClimatePayer, ClimatePolicy, WeatherData, ProductionData, EnergyAsset } from '../types';

/**
 * Risk assessment utility for calculating risk scores and discount rates for receivables
 */
export class RiskAssessmentService {
  /**
   * Calculate a risk score for a receivable based on various factors
   * @param receivable The receivable to assess
   * @param riskFactor Optional risk factor data
   * @param payer Optional payer data
   * @param policies Optional related policies
   * @param asset Optional related energy asset
   * @param productionData Optional production data
   * @param weatherData Optional weather data
   * @returns A risk score between 0-100 (higher = riskier)
   */
  public static calculateRiskScore(
    receivable: ClimateReceivable,
    riskFactor?: ClimateRiskFactor,
    payer?: ClimatePayer,
    policies?: ClimatePolicy[],
    asset?: EnergyAsset,
    productionData?: ProductionData[],
    weatherData?: WeatherData[]
  ): number {
    // Start with a base risk score
    let riskScore = 30;
    
    // If we have explicit risk factors, use them
    if (riskFactor) {
      riskScore = this.calculateRiskFromFactors(riskFactor);
    } else {
      // Otherwise, calculate from individual components
      const creditRisk = this.calculateCreditRisk(payer);
      const productionRisk = this.calculateProductionRisk(asset, productionData, weatherData);
      const policyRisk = this.calculatePolicyRisk(policies);
      
      // Weight the components (credit risk is weighted higher as it's more directly relevant)
      riskScore = (creditRisk * 0.5) + (productionRisk * 0.3) + (policyRisk * 0.2);
    }
    
    // Ensure the score is within bounds
    return Math.min(Math.max(riskScore, 0), 100);
  }
  
  /**
   * Calculate a discount rate based on a risk score
   * @param riskScore The risk score (0-100)
   * @param baseRate The base discount rate (default: 2.0)
   * @param maxAdditionalRate The maximum additional rate based on risk (default: 5.0)
   * @returns A discount rate percentage
   */
  public static calculateDiscountRate(
    riskScore: number,
    baseRate: number = 2.0,
    maxAdditionalRate: number = 5.0
  ): number {
    // Normalize risk score to 0-1
    const normalizedRisk = riskScore / 100;
    
    // Calculate discount rate: base rate + risk-based addition
    const discountRate = baseRate + (normalizedRisk * maxAdditionalRate);
    
    return parseFloat(discountRate.toFixed(2));
  }
  
  /**
   * Calculate risk score from explicit risk factors
   * @param riskFactor The risk factor data
   * @returns A combined risk score
   */
  private static calculateRiskFromFactors(riskFactor: ClimateRiskFactor): number {
    let total = 0;
    let factors = 0;
    
    if (riskFactor.productionRisk !== undefined) {
      total += riskFactor.productionRisk;
      factors++;
    }
    
    if (riskFactor.creditRisk !== undefined) {
      total += riskFactor.creditRisk;
      factors++;
    }
    
    if (riskFactor.policyRisk !== undefined) {
      total += riskFactor.policyRisk;
      factors++;
    }
    
    return factors > 0 ? total / factors : 30;
  }
  
  /**
   * Calculate credit risk based on payer information
   * @param payer The payer data
   * @returns A credit risk score (0-100)
   */
  private static calculateCreditRisk(payer?: ClimatePayer): number {
    if (!payer) return 50; // Default to medium risk if no payer data
    
    // Start with financial health score if available
    if (payer.financialHealthScore !== undefined) {
      return 100 - payer.financialHealthScore; // Invert so higher score = higher risk
    }
    
    // Otherwise, use credit rating if available
    if (payer.creditRating) {
      return this.creditRatingToRiskScore(payer.creditRating);
    }
    
    return 50; // Default to medium risk
  }
  
  /**
   * Convert a credit rating to a risk score
   * @param rating The credit rating (e.g., 'A+', 'B-')
   * @returns A risk score (0-100)
   */
  private static creditRatingToRiskScore(rating: string): number {
    const ratingMap: Record<string, number> = {
      'AAA': 5,
      'AA+': 10,
      'AA': 15,
      'AA-': 20,
      'A+': 25,
      'A': 30,
      'A-': 35,
      'BBB+': 40,
      'BBB': 45,
      'BBB-': 50,
      'BB+': 55,
      'BB': 60,
      'BB-': 65,
      'B+': 70,
      'B': 75,
      'B-': 80,
      'CCC+': 85,
      'CCC': 90,
      'CCC-': 95,
      'D': 100
    };
    
    return ratingMap[rating] || 50;
  }
  
  /**
   * Calculate production risk based on asset and production data
   * @param asset The energy asset
   * @param productionData Production history
   * @param weatherData Weather data affecting production
   * @returns A production risk score (0-100)
   */
  private static calculateProductionRisk(
    asset?: EnergyAsset,
    productionData?: ProductionData[],
    weatherData?: WeatherData[]
  ): number {
    if (!asset || !productionData || productionData.length === 0) {
      return 50; // Default to medium risk if insufficient data
    }
    
    // Calculate production variability
    const outputValues = productionData.map(data => data.outputMwh);
    const avgOutput = outputValues.reduce((sum, val) => sum + val, 0) / outputValues.length;
    
    // Standard deviation calculation
    const variance = outputValues.reduce((sum, val) => sum + Math.pow(val - avgOutput, 2), 0) / outputValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation (normalized measure of dispersion)
    const cv = (stdDev / avgOutput) * 100;
    
    // Convert to risk score (higher variability = higher risk)
    // Typical CV for solar might be 15-25%, wind 25-35%
    let variabilityRisk: number;
    
    if (cv < 10) variabilityRisk = 10;
    else if (cv < 20) variabilityRisk = 30;
    else if (cv < 30) variabilityRisk = 50;
    else if (cv < 40) variabilityRisk = 70;
    else variabilityRisk = 90;
    
    return variabilityRisk;
  }
  
  /**
   * Calculate policy risk based on relevant policies
   * @param policies Related policies that might affect the receivable
   * @returns A policy risk score (0-100)
   */
  private static calculatePolicyRisk(policies?: ClimatePolicy[]): number {
    if (!policies || policies.length === 0) {
      return 30; // Default to low-medium risk if no policy data
    }
    
    // Map impact levels to numerical values
    const impactMap: Record<string, number> = {
      'low': 20,
      'medium': 50,
      'high': 80
    };
    
    // Calculate average risk across all policies
    const riskSum = policies.reduce((sum, policy) => {
      const impactValue = policy.impactLevel ? impactMap[policy.impactLevel.toLowerCase()] || 50 : 50;
      return sum + impactValue;
    }, 0);
    
    return riskSum / policies.length;
  }
}
