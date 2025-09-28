/**
 * PatternDetector.ts
 * Detects suspicious patterns in transaction operations
 */

import type { OperationResult } from '../../gateway/types';
import { supabase } from '@/infrastructure/database/client';
import type { Pattern } from './TransactionAnalyzer';

export interface PatternDetectorConfig {
  lookbackPeriod?: number; // in milliseconds
  rapidSuccessionThreshold?: number; // in seconds
  unusualAmountMultiplier?: number;
  velocityCheckEnabled?: boolean;
}

export class PatternDetector {
  private config: PatternDetectorConfig;

  constructor(config: PatternDetectorConfig = {}) {
    this.config = {
      lookbackPeriod: config.lookbackPeriod ?? 24 * 60 * 60 * 1000, // 24 hours
      rapidSuccessionThreshold: config.rapidSuccessionThreshold ?? 60, // 60 seconds
      unusualAmountMultiplier: config.unusualAmountMultiplier ?? 10,
      velocityCheckEnabled: config.velocityCheckEnabled ?? true,
      ...config
    };
  }

  /**
   * Detect patterns in operation
   */
  async detect(operation: OperationResult): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    try {
      // Get historical data for pattern analysis
      const historicalOps = await this.getHistoricalOperations(operation);

      // 1. Rapid succession pattern
      const rapidPattern = await this.detectRapidSuccession(operation, historicalOps);
      if (rapidPattern) patterns.push(rapidPattern);

      // 2. Unusual amount pattern
      const amountPattern = await this.detectUnusualAmount(operation, historicalOps);
      if (amountPattern) patterns.push(amountPattern);

      // 3. New destination pattern
      const destinationPattern = await this.detectNewDestination(operation, historicalOps);
      if (destinationPattern) patterns.push(destinationPattern);

      // 4. Time-based patterns
      const timePattern = await this.detectTimeAnomalies(operation, historicalOps);
      if (timePattern) patterns.push(timePattern);

      // 5. Velocity patterns
      if (this.config.velocityCheckEnabled) {
        const velocityPattern = await this.detectVelocityAnomaly(operation, historicalOps);
        if (velocityPattern) patterns.push(velocityPattern);
      }

      // 6. Network patterns
      const networkPattern = await this.detectNetworkAnomalies(operation);
      if (networkPattern) patterns.push(networkPattern);

      return patterns;
    } catch (error: any) {
      console.error('Pattern detection failed:', error);
      return patterns;
    }
  }

  /**
   * Get historical operations for analysis
   */
  private async getHistoricalOperations(operation: OperationResult): Promise<any[]> {
    const lookbackTime = new Date(Date.now() - this.config.lookbackPeriod!);
    
    const { data, error } = await supabase
      .from('token_operations')
      .select('*')
      .eq('operator', operation.policyValidation?.metadata?.operator)
      .gte('created_at', lookbackTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch historical operations:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Detect rapid succession of operations
   */
  private async detectRapidSuccession(
    operation: OperationResult,
    historicalOps: any[]
  ): Promise<Pattern | null> {
    if (historicalOps.length === 0) return null;

    const recentOp = historicalOps[0];
    const timeDiff = Date.now() - new Date(recentOp.created_at).getTime();
    const thresholdMs = this.config.rapidSuccessionThreshold! * 1000;

    if (timeDiff < thresholdMs) {
      const opsInWindow = historicalOps.filter(op => {
        const opTime = new Date(op.created_at).getTime();
        return (Date.now() - opTime) < thresholdMs * 2;
      });

      return {
        type: 'rapid_succession',
        confidence: Math.min(opsInWindow.length / 5, 1),
        suspicious: opsInWindow.length > 3,
        description: `${opsInWindow.length} operations in ${this.config.rapidSuccessionThreshold}s window`,
        indicators: [
          `Time since last operation: ${(timeDiff / 1000).toFixed(1)}s`,
          `Operations in window: ${opsInWindow.length}`
        ]
      };
    }

    return null;
  }

  /**
   * Detect unusual transaction amounts
   */
  private async detectUnusualAmount(
    operation: OperationResult,
    historicalOps: any[]
  ): Promise<Pattern | null> {
    if (historicalOps.length < 5) return null;

    const amount = BigInt(operation.policyValidation?.metadata?.amount || 0);
    if (amount === 0n) return null;

    // Calculate average and standard deviation
    const amounts = historicalOps
      .map(op => BigInt(op.amount || 0))
      .filter(a => a > 0n);

    if (amounts.length === 0) return null;

    const avg = amounts.reduce((sum, a) => sum + a, 0n) / BigInt(amounts.length);
    const stdDev = this.calculateStdDev(amounts, avg);

    const deviation = Number(amount - avg) / Number(stdDev || 1n);

    if (Math.abs(deviation) > 2) {
      return {
        type: 'unusual_amount',
        confidence: Math.min(Math.abs(deviation) / 5, 1),
        suspicious: Math.abs(deviation) > 3,
        description: `Amount deviates ${deviation.toFixed(1)}σ from average`,
        indicators: [
          `Current amount: ${amount.toString()}`,
          `Average amount: ${avg.toString()}`,
          `Standard deviation: ${stdDev.toString()}`
        ]
      };
    }

    return null;
  }

  /**
   * Calculate standard deviation for BigInt array
   */
  private calculateStdDev(values: bigint[], mean: bigint): bigint {
    if (values.length < 2) return 0n;

    const squaredDiffs = values.map(v => {
      const diff = v - mean;
      return diff * diff;
    });

    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0n) / BigInt(values.length);
    
    // Approximate square root for BigInt
    let x = variance;
    let y = (x + 1n) / 2n;
    while (y < x) {
      x = y;
      y = (x + variance / x) / 2n;
    }
    
    return x;
  }

  /**
   * Detect new destination addresses
   */
  private async detectNewDestination(
    operation: OperationResult,
    historicalOps: any[]
  ): Promise<Pattern | null> {
    const destination = operation.policyValidation?.metadata?.to;
    if (!destination) return null;

    const knownDestinations = new Set(
      historicalOps
        .map(op => op.recipient)
        .filter(r => r)
    );

    if (!knownDestinations.has(destination)) {
      // Check if this is the very first operation
      const isFirstOp = historicalOps.length === 0;
      
      return {
        type: 'new_destination',
        confidence: isFirstOp ? 0.3 : 0.8,
        suspicious: !isFirstOp && historicalOps.length > 10,
        description: `Transaction to previously unknown address`,
        indicators: [
          `New address: ${destination}`,
          `Known addresses: ${knownDestinations.size}`
        ]
      };
    }

    return null;
  }

  /**
   * Detect time-based anomalies
   */
  private async detectTimeAnomalies(
    operation: OperationResult,
    historicalOps: any[]
  ): Promise<Pattern | null> {
    const currentHour = new Date().getHours();
    
    // Check for unusual operating hours
    const isUnusualHour = currentHour < 6 || currentHour > 22;
    
    if (isUnusualHour) {
      // Check if user typically operates at this time
      const opsAtSimilarTime = historicalOps.filter(op => {
        const opHour = new Date(op.created_at).getHours();
        return Math.abs(opHour - currentHour) <= 1;
      });

      const percentageAtTime = historicalOps.length > 0 
        ? opsAtSimilarTime.length / historicalOps.length
        : 0;

      if (percentageAtTime < 0.1) {
        return {
          type: 'unusual_time',
          confidence: 0.7,
          suspicious: currentHour < 4 || currentHour > 23,
          description: `Operation at unusual hour: ${currentHour}:00`,
          indicators: [
            `Current hour: ${currentHour}:00`,
            `Historical operations at this time: ${(percentageAtTime * 100).toFixed(1)}%`
          ]
        };
      }
    }

    return null;
  }

  /**
   * Detect velocity anomalies
   */
  private async detectVelocityAnomaly(
    operation: OperationResult,
    historicalOps: any[]
  ): Promise<Pattern | null> {
    // Calculate transaction velocity (transactions per hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const opsLastHour = historicalOps.filter(op => 
      new Date(op.created_at).getTime() > oneHourAgo
    );

    if (opsLastHour.length > 10) {
      // Calculate average velocity
      const dailyOps = historicalOps.length;
      const expectedHourly = dailyOps / 24;

      const velocityRatio = opsLastHour.length / Math.max(expectedHourly, 1);

      if (velocityRatio > 3) {
        return {
          type: 'high_velocity',
          confidence: Math.min(velocityRatio / 5, 1),
          suspicious: velocityRatio > 5,
          description: `Transaction velocity ${velocityRatio.toFixed(1)}x higher than normal`,
          indicators: [
            `Operations in last hour: ${opsLastHour.length}`,
            `Expected hourly average: ${expectedHourly.toFixed(1)}`
          ]
        };
      }
    }

    return null;
  }

  /**
   * Detect network-related anomalies
   */
  private async detectNetworkAnomalies(
    operation: OperationResult
  ): Promise<Pattern | null> {
    // Check for cross-chain patterns
    const chainId = operation.policyValidation?.metadata?.chainId;
    if (!chainId) return null;

    // Get recent cross-chain operations
    const { data: crossChainOps } = await supabase
      .from('token_operations')
      .select('chain_id, created_at')
      .neq('chain_id', chainId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(10);

    if (crossChainOps && crossChainOps.length > 5) {
      return {
        type: 'cross_chain_activity',
        confidence: 0.6,
        suspicious: crossChainOps.length > 8,
        description: `High cross-chain activity detected`,
        indicators: [
          `Current chain: ${chainId}`,
          `Cross-chain operations in last hour: ${crossChainOps.length}`
        ]
      };
    }

    return null;
  }

  /**
   * Check for known malicious patterns
   */
  async checkMaliciousPatterns(
    address: string
  ): Promise<{
    isMalicious: boolean;
    reason?: string;
  }> {
    // Check against known malicious addresses
    // This would typically integrate with external threat intelligence APIs
    
    // For now, simple blacklist check
    const { data } = await supabase
      .from('blacklisted_addresses')
      .select('reason')
      .eq('address', address.toLowerCase())
      .single();

    if (data) {
      return {
        isMalicious: true,
        reason: data.reason
      };
    }

    return { isMalicious: false };
  }
}
