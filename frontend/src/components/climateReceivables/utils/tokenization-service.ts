import { 
  ClimateTokenizationPool,
  ClimateReceivable,
  ClimateRiskFactor,
  TokenClimateProperties,
  RiskLevel,
  UUID
} from '../types';
import { RiskAssessmentService } from './risk-assessment-service';

/**
 * Service for managing the tokenization of climate receivables
 */
export class TokenizationService {
  /**
   * Create a tokenization pool from a set of receivables
   * @param name Name of the pool
   * @param receivables Array of receivables to include in the pool
   * @param riskFactors Optional map of risk factors for each receivable
   * @returns Created tokenization pool object
   */
  public static createPool(
    name: string,
    receivables: ClimateReceivable[],
    riskFactors?: Record<string, ClimateRiskFactor>
  ): ClimateTokenizationPool {
    // Calculate total value
    const totalValue = receivables.reduce((sum, receivable) => sum + receivable.amount, 0);
    
    // Calculate risk profile based on receivables
    const riskProfile = this.calculatePoolRiskProfile(receivables, riskFactors);
    
    // Generate pool ID (in a real implementation, this would be from the database)
    const poolId = crypto.randomUUID();
    
    return {
      poolId: poolId,
      name,
      totalValue: totalValue,
      riskProfile: riskProfile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Calculate the risk profile of a tokenization pool
   * @param receivables Array of receivables in the pool
   * @param riskFactors Optional map of risk factors for each receivable
   * @returns Risk profile (low, medium, high)
   */
  private static calculatePoolRiskProfile(
    receivables: ClimateReceivable[],
    riskFactors?: Record<string, ClimateRiskFactor>
  ): RiskLevel {
    // If no receivables, default to medium risk
    if (receivables.length === 0) {
      return RiskLevel.MEDIUM;
    }
    
    // Calculate weighted average risk score
    let totalAmount = 0;
    let weightedRiskSum = 0;
    
    receivables.forEach(receivable => {
      let riskScore: number;
      
      // Use existing risk score if available
      if (receivable.riskScore !== undefined) {
        riskScore = receivable.riskScore;
      } 
      // Or use risk factor if provided
      else if (riskFactors && riskFactors[receivable.receivableId]) {
        riskScore = RiskAssessmentService.calculateRiskScore(
          receivable, 
          riskFactors[receivable.receivableId]
        );
      } 
      // Otherwise calculate basic risk score
      else {
        riskScore = RiskAssessmentService.calculateRiskScore(receivable);
      }
      
      totalAmount += receivable.amount;
      weightedRiskSum += receivable.amount * riskScore;
    });
    
    const averageRiskScore = weightedRiskSum / totalAmount;
    
    // Map average risk score to risk profile
    if (averageRiskScore < 30) {
      return RiskLevel.LOW;
    } else if (averageRiskScore < 60) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.HIGH;
    }
  }
  
  /**
   * Calculate token properties for a climate receivables pool
   * @param pool The tokenization pool
   * @param receivables Receivables in the pool
   * @param tokenId Token ID (UUID)
   * @returns Token climate properties
   */
  public static calculateTokenProperties(
    pool: ClimateTokenizationPool,
    receivables: ClimateReceivable[],
    tokenId: UUID
  ): TokenClimateProperties {
    // Calculate average risk score
    const totalAmount = receivables.reduce((sum, receivable) => sum + receivable.amount, 0);
    let weightedRiskSum = 0;
    
    receivables.forEach(receivable => {
      const riskScore = receivable.riskScore !== undefined 
        ? receivable.riskScore 
        : RiskAssessmentService.calculateRiskScore(receivable);
      
      weightedRiskSum += receivable.amount * riskScore;
    });
    
    const averageRiskScore = totalAmount > 0 
      ? weightedRiskSum / totalAmount 
      : 50; // Default to medium risk if no receivables
    
    // Calculate average discount rate
    let weightedDiscountSum = 0;
    
    receivables.forEach(receivable => {
      const discountRate = receivable.discountRate !== undefined 
        ? receivable.discountRate 
        : RiskAssessmentService.calculateDiscountRate(
            receivable.riskScore !== undefined 
              ? receivable.riskScore 
              : RiskAssessmentService.calculateRiskScore(receivable)
          );
      
      weightedDiscountSum += receivable.amount * discountRate;
    });
    
    const averageDiscountRate = totalAmount > 0 
      ? weightedDiscountSum / totalAmount 
      : 3.5; // Default discount rate
    
    // Calculate discounted value
    const discountAmount = pool.totalValue * (averageDiscountRate / 100);
    const discountedValue = pool.totalValue - discountAmount;
    
    return {
      tokenId: tokenId,
      poolId: pool.poolId,
      averageRiskScore: averageRiskScore,
      discountedValue: discountedValue,
      discountAmount: discountAmount,
      averageDiscountRate: averageDiscountRate,
      securityInterestDetails: "Secured by renewable energy receivables",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Calculate token distribution for investors
   * @param poolValue Total pool value
   * @param investmentAmounts Map of investor IDs to investment amounts
   * @param tokenSupply Total token supply
   * @returns Map of investor IDs to token allocations
   */
  public static calculateTokenDistribution(
    poolValue: number,
    investmentAmounts: Record<string, number>,
    tokenSupply: number
  ): Record<string, number> {
    const tokenDistribution: Record<string, number> = {};
    const totalInvestment = Object.values(investmentAmounts).reduce((sum, amount) => sum + amount, 0);
    
    // Calculate token distribution proportional to investment amounts
    Object.entries(investmentAmounts).forEach(([investorId, amount]) => {
      const proportion = amount / totalInvestment;
      const tokenAllocation = Math.floor(proportion * tokenSupply);
      tokenDistribution[investorId] = tokenAllocation;
    });
    
    // Handle any rounding issues by adjusting the largest allocation
    const distributedTokens = Object.values(tokenDistribution).reduce((sum, tokens) => sum + tokens, 0);
    if (distributedTokens < tokenSupply) {
      const remainder = tokenSupply - distributedTokens;
      
      // Find the investor with the largest allocation
      let largestInvestorId = Object.keys(tokenDistribution)[0];
      Object.entries(tokenDistribution).forEach(([investorId, tokens]) => {
        if (tokens > tokenDistribution[largestInvestorId]) {
          largestInvestorId = investorId;
        }
      });
      
      // Add the remainder to the largest allocation
      tokenDistribution[largestInvestorId] += remainder;
    }
    
    return tokenDistribution;
  }
}
