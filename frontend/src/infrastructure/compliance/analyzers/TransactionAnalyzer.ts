/**
 * TransactionAnalyzer.ts
 * Analyzes transactions for suspicious patterns and compliance risks
 */

import type { OperationResult } from '../../gateway/types';
import { PatternDetector } from './PatternDetector';
import { RiskAssessor } from './RiskAssessor';
import { MLAnomalyDetector } from './MLAnomalyDetector';

export interface AnalysisResult {
  suspicious: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  patterns: Pattern[];
  riskScore: number;
  anomalies: Anomaly[];
  description: string;
  recommendations: string[];
}

export interface Pattern {
  type: string;
  confidence: number;
  suspicious: boolean;
  description: string;
  indicators: string[];
}

export interface Anomaly {
  type: string;
  score: number;
  deviation: number;
  baseline: any;
  actual: any;
}

export interface AnalyzerConfig {
  patternConfig?: any;
  riskConfig?: any;
  mlConfig?: any;
  suspiciousThreshold?: number;
  anomalyThreshold?: number;
}

export class TransactionAnalyzer {
  private patternDetector: PatternDetector;
  private riskAssessor: RiskAssessor;
  private mlModel: MLAnomalyDetector;
  private config: AnalyzerConfig;

  constructor(config: AnalyzerConfig = {}) {
    this.config = {
      suspiciousThreshold: config.suspiciousThreshold ?? 0.7,
      anomalyThreshold: config.anomalyThreshold ?? 0.8,
      ...config
    };

    this.patternDetector = new PatternDetector(config.patternConfig);
    this.riskAssessor = new RiskAssessor(config.riskConfig);
    this.mlModel = new MLAnomalyDetector(config.mlConfig);
  }

  /**
   * Analyze operation for compliance risks
   */
  async analyze(operation: OperationResult): Promise<AnalysisResult> {
    try {
      // 1. Pattern detection
      const patterns = await this.patternDetector.detect(operation);
      
      // 2. Risk assessment
      const riskScore = await this.riskAssessor.assess(operation);
      
      // 3. ML anomaly detection
      const anomalies = await this.mlModel.detectAnomalies(operation);
      
      // 4. Determine if suspicious
      const suspicious = this.isSuspicious(patterns, riskScore, anomalies);
      
      // 5. Calculate severity
      const severity = this.calculateSeverity(patterns, riskScore, anomalies);
      
      // 6. Generate description
      const description = this.generateDescription(patterns, riskScore, anomalies);
      
      // 7. Generate recommendations
      const recommendations = this.generateRecommendations(patterns, riskScore);
      
      return {
        suspicious,
        severity,
        patterns,
        riskScore,
        anomalies,
        description,
        recommendations
      };
    } catch (error: any) {
      console.error('Transaction analysis failed:', error);
      
      // Return safe default on error
      return {
        suspicious: false,
        severity: 'low',
        patterns: [],
        riskScore: 0,
        anomalies: [],
        description: 'Analysis incomplete due to error',
        recommendations: []
      };
    }
  }

  /**
   * Determine if operation is suspicious
   */
  private isSuspicious(
    patterns: Pattern[],
    riskScore: number,
    anomalies: Anomaly[]
  ): boolean {
    // High risk score indicates suspicious activity
    if (riskScore > this.config.suspiciousThreshold!) {
      return true;
    }
    
    // Multiple suspicious patterns detected
    const suspiciousPatterns = patterns.filter(p => p.suspicious);
    if (suspiciousPatterns.length > 2) {
      return true;
    }
    
    // Significant anomalies detected
    const significantAnomalies = anomalies.filter(
      a => a.score > this.config.anomalyThreshold!
    );
    if (significantAnomalies.length > 0) {
      return true;
    }
    
    // Check for high-confidence suspicious patterns
    const highConfidenceSuspicious = patterns.some(
      p => p.suspicious && p.confidence > 0.9
    );
    if (highConfidenceSuspicious) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate severity level
   */
  private calculateSeverity(
    patterns: Pattern[],
    riskScore: number,
    anomalies: Anomaly[]
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Critical: Very high risk or multiple high-confidence suspicious patterns
    if (riskScore > 0.9) {
      return 'critical';
    }
    
    const criticalPatterns = patterns.filter(
      p => p.suspicious && p.confidence > 0.95
    );
    if (criticalPatterns.length > 1) {
      return 'critical';
    }
    
    // High: High risk or significant anomalies
    if (riskScore > 0.7 || anomalies.some(a => a.score > 0.9)) {
      return 'high';
    }
    
    // Medium: Moderate risk or some suspicious patterns
    if (riskScore > 0.5 || patterns.some(p => p.suspicious)) {
      return 'medium';
    }
    
    // Low: Low risk, no significant issues
    return 'low';
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(
    patterns: Pattern[],
    riskScore: number,
    anomalies: Anomaly[]
  ): string {
    const parts: string[] = [];
    
    // Risk level description
    if (riskScore > 0.7) {
      parts.push(`High risk transaction (score: ${(riskScore * 100).toFixed(1)}%)`);
    } else if (riskScore > 0.5) {
      parts.push(`Moderate risk transaction (score: ${(riskScore * 100).toFixed(1)}%)`);
    } else {
      parts.push(`Low risk transaction (score: ${(riskScore * 100).toFixed(1)}%)`);
    }
    
    // Pattern descriptions
    const suspiciousPatterns = patterns.filter(p => p.suspicious);
    if (suspiciousPatterns.length > 0) {
      const patternDescriptions = suspiciousPatterns
        .slice(0, 3)
        .map(p => p.description)
        .join(', ');
      parts.push(`Detected patterns: ${patternDescriptions}`);
    }
    
    // Anomaly descriptions
    const significantAnomalies = anomalies.filter(a => a.score > 0.7);
    if (significantAnomalies.length > 0) {
      parts.push(
        `Found ${significantAnomalies.length} significant anomaly(ies) in transaction behavior`
      );
    }
    
    return parts.join('. ');
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    patterns: Pattern[],
    riskScore: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskScore > 0.7) {
      recommendations.push('Perform enhanced due diligence on this transaction');
      recommendations.push('Consider manual review before processing');
    }
    
    // Pattern-specific recommendations
    for (const pattern of patterns) {
      if (pattern.type === 'rapid_succession' && pattern.suspicious) {
        recommendations.push('Implement rate limiting for this operator');
      }
      
      if (pattern.type === 'unusual_amount' && pattern.suspicious) {
        recommendations.push('Verify source of funds and transaction purpose');
      }
      
      if (pattern.type === 'new_destination' && pattern.suspicious) {
        recommendations.push('Perform KYC verification on recipient address');
      }
    }
    
    // General recommendations
    if (recommendations.length === 0 && riskScore > 0.3) {
      recommendations.push('Continue monitoring for unusual activity');
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Get risk profile for an operator
   */
  async getRiskProfile(operator: string): Promise<{
    riskLevel: string;
    historicalScore: number;
    recentActivity: any[];
  }> {
    return this.riskAssessor.getOperatorProfile(operator);
  }
}
