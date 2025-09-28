/**
 * RiskAssessor.ts
 * Assesses risk levels for operations
 */

import type { OperationResult } from '../../gateway/types';
import { supabase } from '@/infrastructure/database/client';

export interface RiskAssessment {
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  factors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

export interface RiskAssessorConfig {
  weights?: {
    amount: number;
    frequency: number;
    destination: number;
    history: number;
    compliance: number;
  };
  thresholds?: {
    critical: number;
    high: number;
    medium: number;
  };
}

export class RiskAssessor {
  private config: RiskAssessorConfig;
  private operatorProfiles: Map<string, OperatorProfile>;

  constructor(config: RiskAssessorConfig = {}) {
    this.config = {
      weights: {
        amount: config.weights?.amount ?? 0.3,
        frequency: config.weights?.frequency ?? 0.2,
        destination: config.weights?.destination ?? 0.2,
        history: config.weights?.history ?? 0.2,
        compliance: config.weights?.compliance ?? 0.1,
        ...config.weights
      },
      thresholds: {
        critical: config.thresholds?.critical ?? 0.8,
        high: config.thresholds?.high ?? 0.6,
        medium: config.thresholds?.medium ?? 0.4,
        ...config.thresholds
      }
    };

    this.operatorProfiles = new Map();
  }

  /**
   * Assess risk for an operation
   */
  async assess(operation: OperationResult): Promise<number> {
    const factors: RiskFactor[] = [];

    try {
      // 1. Amount risk factor
      const amountFactor = await this.assessAmountRisk(operation);
      factors.push(amountFactor);

      // 2. Frequency risk factor
      const frequencyFactor = await this.assessFrequencyRisk(operation);
      factors.push(frequencyFactor);

      // 3. Destination risk factor
      const destinationFactor = await this.assessDestinationRisk(operation);
      factors.push(destinationFactor);

      // 4. Historical risk factor
      const historyFactor = await this.assessHistoricalRisk(operation);
      factors.push(historyFactor);

      // 5. Compliance risk factor
      const complianceFactor = await this.assessComplianceRisk(operation);
      factors.push(complianceFactor);

      // Calculate weighted risk score
      const totalScore = factors.reduce((sum, factor) => {
        return sum + (factor.score * factor.weight);
      }, 0);

      const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
      
      return totalWeight > 0 ? totalScore / totalWeight : 0;
    } catch (error: any) {
      console.error('Risk assessment failed:', error);
      return 0.5; // Default to medium risk on error
    }
  }

  /**
   * Assess amount-based risk
   */
  private async assessAmountRisk(operation: OperationResult): Promise<RiskFactor> {
    const amount = BigInt(operation.policyValidation?.metadata?.amount || 0);
    
    // Get thresholds from database
    const { data: thresholds } = await supabase
      .from('risk_thresholds')
      .select('amount_high, amount_critical')
      .single();

    const highThreshold = BigInt(thresholds?.amount_high || '1000000000000000000000'); // 1000 tokens
    const criticalThreshold = BigInt(thresholds?.amount_critical || '10000000000000000000000'); // 10000 tokens

    let score = 0;
    let description = 'Normal transaction amount';

    if (amount >= criticalThreshold) {
      score = 1.0;
      description = 'Critical: Very high transaction amount';
    } else if (amount >= highThreshold) {
      score = 0.7;
      description = 'High transaction amount';
    } else if (amount >= highThreshold / 2n) {
      score = 0.4;
      description = 'Moderate transaction amount';
    } else {
      score = 0.1;
      description = 'Low transaction amount';
    }

    return {
      name: 'amount_risk',
      weight: this.config.weights!.amount,
      score,
      description
    };
  }

  /**
   * Assess frequency-based risk
   */
  private async assessFrequencyRisk(operation: OperationResult): Promise<RiskFactor> {
    const operator = operation.policyValidation?.metadata?.operator;
    
    // Get recent operations count
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { data: recentOps, count } = await supabase
      .from('token_operations')
      .select('*', { count: 'exact', head: true })
      .eq('operator', operator)
      .gte('created_at', oneHourAgo.toISOString());

    const opsCount = count || 0;
    let score = 0;
    let description = 'Normal operation frequency';

    if (opsCount > 20) {
      score = 1.0;
      description = `Critical: ${opsCount} operations in last hour`;
    } else if (opsCount > 10) {
      score = 0.7;
      description = `High: ${opsCount} operations in last hour`;
    } else if (opsCount > 5) {
      score = 0.4;
      description = `Moderate: ${opsCount} operations in last hour`;
    } else {
      score = 0.1;
      description = `Low: ${opsCount} operations in last hour`;
    }

    return {
      name: 'frequency_risk',
      weight: this.config.weights!.frequency,
      score,
      description
    };
  }

  /**
   * Assess destination-based risk
   */
  private async assessDestinationRisk(operation: OperationResult): Promise<RiskFactor> {
    const destination = operation.policyValidation?.metadata?.to;
    
    if (!destination) {
      return {
        name: 'destination_risk',
        weight: this.config.weights!.destination,
        score: 0,
        description: 'No destination address'
      };
    }

    // Check if destination is blacklisted
    const { data: blacklisted } = await supabase
      .from('blacklisted_addresses')
      .select('severity')
      .eq('address', destination.toLowerCase())
      .single();

    if (blacklisted) {
      return {
        name: 'destination_risk',
        weight: this.config.weights!.destination,
        score: blacklisted.severity === 'critical' ? 1.0 : 0.8,
        description: `Destination is blacklisted: ${blacklisted.severity}`
      };
    }

    // Check if destination is new
    const { count: previousTxCount } = await supabase
      .from('token_operations')
      .select('*', { count: 'exact', head: true })
      .eq('recipient', destination);

    let score = 0;
    let description = 'Known destination';

    if ((previousTxCount || 0) === 0) {
      score = 0.5;
      description = 'New destination address';
    } else if ((previousTxCount || 0) < 5) {
      score = 0.2;
      description = 'Relatively new destination';
    }

    return {
      name: 'destination_risk',
      weight: this.config.weights!.destination,
      score,
      description
    };
  }

  /**
   * Assess historical risk
   */
  private async assessHistoricalRisk(operation: OperationResult): Promise<RiskFactor> {
    const operator = operation.policyValidation?.metadata?.operator;
    
    // Get operator's violation history
    const { data: violations, count } = await supabase
      .from('policy_violations')
      .select('*', { count: 'exact', head: true })
      .eq('operator', operator)
      .eq('resolved', false);

    const violationCount = count || 0;
    let score = 0;
    let description = 'Clean history';

    if (violationCount > 10) {
      score = 1.0;
      description = `Critical: ${violationCount} unresolved violations`;
    } else if (violationCount > 5) {
      score = 0.7;
      description = `High: ${violationCount} unresolved violations`;
    } else if (violationCount > 0) {
      score = 0.4;
      description = `Moderate: ${violationCount} unresolved violations`;
    }

    return {
      name: 'historical_risk',
      weight: this.config.weights!.history,
      score,
      description
    };
  }

  /**
   * Assess compliance risk
   */
  private async assessComplianceRisk(operation: OperationResult): Promise<RiskFactor> {
    // Check policy validation result
    const policyCompliant = operation.policyValidation?.allowed ?? true;
    
    if (!policyCompliant) {
      return {
        name: 'compliance_risk',
        weight: this.config.weights!.compliance,
        score: 1.0,
        description: 'Policy validation failed'
      };
    }

    // Check for warnings
    const warnings = operation.policyValidation?.warnings?.length || 0;
    let score = 0;
    let description = 'Fully compliant';

    if (warnings > 3) {
      score = 0.6;
      description = `Multiple compliance warnings: ${warnings}`;
    } else if (warnings > 0) {
      score = 0.3;
      description = `Compliance warnings: ${warnings}`;
    }

    return {
      name: 'compliance_risk',
      weight: this.config.weights!.compliance,
      score,
      description
    };
  }

  /**
   * Get risk profile for an operator
   */
  async getOperatorProfile(operator: string): Promise<{
    riskLevel: string;
    historicalScore: number;
    recentActivity: any[];
  }> {
    // Check cache first
    if (this.operatorProfiles.has(operator)) {
      const cached = this.operatorProfiles.get(operator)!;
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 min cache
        return cached.profile;
      }
    }

    // Get historical data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: operations } = await supabase
      .from('token_operations')
      .select('*')
      .eq('operator', operator)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    // Calculate average risk score
    let totalRisk = 0;
    let count = 0;

    for (const op of operations || []) {
      // Simple risk calculation based on amount
      const amount = BigInt(op.amount || 0);
      const risk = Number(amount) / Number(BigInt('1000000000000000000000')); // Normalize
      totalRisk += Math.min(risk, 1);
      count++;
    }

    const avgRisk = count > 0 ? totalRisk / count : 0;
    const riskLevel = this.getRiskLevel(avgRisk);

    const profile = {
      riskLevel,
      historicalScore: avgRisk,
      recentActivity: operations?.slice(0, 10) || []
    };

    // Cache the profile
    this.operatorProfiles.set(operator, {
      profile,
      timestamp: Date.now()
    });

    return profile;
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): string {
    if (score >= this.config.thresholds!.critical) return 'critical';
    if (score >= this.config.thresholds!.high) return 'high';
    if (score >= this.config.thresholds!.medium) return 'medium';
    return 'low';
  }
}

interface OperatorProfile {
  profile: {
    riskLevel: string;
    historicalScore: number;
    recentActivity: any[];
  };
  timestamp: number;
}
