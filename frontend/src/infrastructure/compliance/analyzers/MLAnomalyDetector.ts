/**
 * MLAnomalyDetector.ts
 * Machine learning-based anomaly detection for operations
 */

import type { OperationResult } from '../../gateway/types';
import type { Anomaly } from './TransactionAnalyzer';
import { supabase } from '@/infrastructure/database/client';
import { CHAIN_IDS } from '@/infrastructure/web3/utils/chainIds';

export interface MLAnomalyDetectorConfig {
  modelType?: 'isolation-forest' | 'autoencoder' | 'statistical';
  threshold?: number;
  features?: string[];
  windowSize?: number;
}

export interface FeatureVector {
  amount: number;
  gasUsed: number;
  hourOfDay: number;
  dayOfWeek: number;
  timeSinceLastOp: number;
  operationType: number;
  chainId: number;
}

export class MLAnomalyDetector {
  private config: MLAnomalyDetectorConfig;
  private baselineStats: Map<string, BaselineStatistics>;
  private modelReady: boolean = false;

  constructor(config: MLAnomalyDetectorConfig = {}) {
    this.config = {
      modelType: config.modelType ?? 'statistical',
      threshold: config.threshold ?? 2.5, // Standard deviations for statistical model
      windowSize: config.windowSize ?? 100,
      features: config.features ?? [
        'amount', 'gasUsed', 'hourOfDay', 'dayOfWeek', 'timeSinceLastOp'
      ],
      ...config
    };

    this.baselineStats = new Map();
    this.initializeModel();
  }

  /**
   * Initialize the ML model
   */
  private async initializeModel(): Promise<void> {
    try {
      // Load baseline statistics from database
      await this.loadBaselineStatistics();
      this.modelReady = true;
    } catch (error) {
      console.error('Failed to initialize ML model:', error);
      this.modelReady = false;
    }
  }

  /**
   * Detect anomalies in operation
   */
  async detectAnomalies(operation: OperationResult): Promise<Anomaly[]> {
    if (!this.modelReady) {
      console.warn('ML model not ready, returning empty anomalies');
      return [];
    }

    const anomalies: Anomaly[] = [];

    try {
      // Extract features from operation
      const features = await this.extractFeatures(operation);

      // Get baseline for comparison
      const operator = operation.policyValidation?.metadata?.operator || 'unknown';
      const baseline = await this.getBaseline(operator);

      // Detect anomalies based on model type
      switch (this.config.modelType) {
        case 'statistical':
          return this.detectStatisticalAnomalies(features, baseline);
        case 'isolation-forest':
          return this.detectIsolationForestAnomalies(features);
        case 'autoencoder':
          return this.detectAutoencoderAnomalies(features);
        default:
          return this.detectStatisticalAnomalies(features, baseline);
      }
    } catch (error: any) {
      console.error('Anomaly detection failed:', error);
      return [];
    }
  }

  /**
   * Extract features from operation
   */
  private async extractFeatures(operation: OperationResult): Promise<FeatureVector> {
    const now = new Date();
    const operator = operation.policyValidation?.metadata?.operator;

    // Get last operation time
    let timeSinceLastOp = 0;
    if (operator) {
      const { data: lastOp } = await supabase
        .from('token_operations')
        .select('created_at')
        .eq('operator', operator)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastOp) {
        timeSinceLastOp = now.getTime() - new Date(lastOp.created_at).getTime();
      }
    }

    return {
      amount: Number(BigInt(operation.policyValidation?.metadata?.amount || 0) / BigInt('1000000000000000000')),
      gasUsed: Number(operation.gasUsed || 0),
      hourOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      timeSinceLastOp: timeSinceLastOp / 1000, // Convert to seconds
      operationType: this.encodeOperationType(operation.policyValidation?.metadata?.operationType || ''),
      chainId: this.encodeChainId(operation.policyValidation?.metadata?.chainId || '')
    };
  }

  /**
   * Detect statistical anomalies
   */
  private detectStatisticalAnomalies(
    features: FeatureVector,
    baseline: BaselineStatistics
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check each feature for anomalies
    for (const [feature, value] of Object.entries(features)) {
      const stats = baseline[feature as keyof BaselineStatistics];
      if (!stats || typeof stats !== 'object') continue;

      const mean = stats.mean || 0;
      const stdDev = stats.stdDev || 1;
      
      const zScore = Math.abs((value - mean) / stdDev);

      if (zScore > this.config.threshold!) {
        anomalies.push({
          type: `${feature}_anomaly`,
          score: Math.min(zScore / 5, 1), // Normalize to 0-1
          deviation: zScore,
          baseline: mean,
          actual: value
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect anomalies using Isolation Forest (simplified)
   */
  private detectIsolationForestAnomalies(features: FeatureVector): Anomaly[] {
    // Simplified Isolation Forest implementation
    // In production, this would use a proper ML library

    const anomalies: Anomaly[] = [];
    const isolationScore = this.calculateIsolationScore(features);

    if (isolationScore > 0.7) {
      anomalies.push({
        type: 'isolation_forest_anomaly',
        score: isolationScore,
        deviation: isolationScore,
        baseline: 0.5,
        actual: isolationScore
      });
    }

    return anomalies;
  }

  /**
   * Detect anomalies using Autoencoder (simplified)
   */
  private detectAutoencoderAnomalies(features: FeatureVector): Anomaly[] {
    // Simplified Autoencoder implementation
    // In production, this would use TensorFlow.js or similar

    const anomalies: Anomaly[] = [];
    const reconstructionError = this.calculateReconstructionError(features);

    if (reconstructionError > this.config.threshold!) {
      anomalies.push({
        type: 'autoencoder_anomaly',
        score: Math.min(reconstructionError / 5, 1),
        deviation: reconstructionError,
        baseline: 1.0,
        actual: reconstructionError
      });
    }

    return anomalies;
  }

  /**
   * Calculate isolation score (simplified)
   */
  private calculateIsolationScore(features: FeatureVector): number {
    // Simplified isolation scoring based on feature outliers
    const featureArray = Object.values(features);
    const mean = featureArray.reduce((sum, v) => sum + v, 0) / featureArray.length;
    const variance = featureArray.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / featureArray.length;
    
    // Higher variance = more likely to be isolated
    return Math.min(variance / 100, 1);
  }

  /**
   * Calculate reconstruction error (simplified)
   */
  private calculateReconstructionError(features: FeatureVector): number {
    // Simplified reconstruction error calculation
    // In production, this would use actual neural network reconstruction
    
    const featureArray = Object.values(features);
    const normalized = featureArray.map(v => Math.abs(v) / 100);
    const error = normalized.reduce((sum, v) => sum + Math.pow(v - 0.5, 2), 0);
    
    return error;
  }

  /**
   * Load baseline statistics from database
   */
  private async loadBaselineStatistics(): Promise<void> {
    const { data: stats } = await supabase
      .from('ml_baseline_statistics')
      .select('*');

    if (stats) {
      for (const stat of stats) {
        this.baselineStats.set(stat.operator, stat.statistics);
      }
    }
  }

  /**
   * Get baseline statistics for operator
   */
  private async getBaseline(operator: string): Promise<BaselineStatistics> {
    // Check cache
    if (this.baselineStats.has(operator)) {
      return this.baselineStats.get(operator)!;
    }

    // Calculate baseline from historical data
    const baseline = await this.calculateBaseline(operator);
    this.baselineStats.set(operator, baseline);
    
    // Store in database for future use
    await this.storeBaseline(operator, baseline);
    
    return baseline;
  }

  /**
   * Calculate baseline statistics from historical data
   */
  private async calculateBaseline(operator: string): Promise<BaselineStatistics> {
    const { data: operations } = await supabase
      .from('token_operations')
      .select('*')
      .eq('operator', operator)
      .order('created_at', { ascending: false })
      .limit(this.config.windowSize!);

    if (!operations || operations.length === 0) {
      return this.getDefaultBaseline();
    }

    // Calculate statistics for each feature
    const amounts = operations.map(op => Number(BigInt(op.amount || 0) / BigInt('1000000000000000000')));
    const gasValues = operations.map(op => Number(op.gas_used || 0));
    const hours = operations.map(op => new Date(op.created_at).getHours());
    const days = operations.map(op => new Date(op.created_at).getDay());

    return {
      amount: this.calculateStats(amounts),
      gasUsed: this.calculateStats(gasValues),
      hourOfDay: this.calculateStats(hours),
      dayOfWeek: this.calculateStats(days),
      timeSinceLastOp: { mean: 3600, stdDev: 1800 }, // Default: 1 hour average
      operationType: { mean: 0, stdDev: 1 },
      chainId: { mean: CHAIN_IDS.ethereum, stdDev: 0.5 }
    };
  }

  /**
   * Calculate mean and standard deviation
   */
  private calculateStats(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) {
      return { mean: 0, stdDev: 1 };
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev: stdDev || 1 };
  }

  /**
   * Get default baseline for new operators
   */
  private getDefaultBaseline(): BaselineStatistics {
    return {
      amount: { mean: 100, stdDev: 50 },
      gasUsed: { mean: 100000, stdDev: 50000 },
      hourOfDay: { mean: 12, stdDev: 6 },
      dayOfWeek: { mean: 3, stdDev: 2 },
      timeSinceLastOp: { mean: 3600, stdDev: 1800 },
      operationType: { mean: 0, stdDev: 1 },
      chainId: { mean: CHAIN_IDS.ethereum, stdDev: 0.5 }
    };
  }

  /**
   * Store baseline in database
   */
  private async storeBaseline(operator: string, baseline: BaselineStatistics): Promise<void> {
    await supabase
      .from('ml_baseline_statistics')
      .upsert({
        operator,
        statistics: baseline,
        updated_at: new Date().toISOString()
      });
  }

  /**
   * Encode operation type to numeric value
   */
  private encodeOperationType(type: string): number {
    const typeMap: Record<string, number> = {
      'mint': 1,
      'burn': 2,
      'transfer': 3,
      'lock': 4,
      'unlock': 5,
      'block': 6,
      'unblock': 7
    };
    return typeMap[type] || 0;
  }

  /**
   * Encode chain ID to numeric value
   */
  private encodeChainId(chainId: string): number {
    const chainMap: Record<string, number> = {
      'ethereum': 1,
      'polygon': 137,
      'avalanche': 43114,
      'bsc': 56
    };
    return chainMap[chainId] || 0;
  }

  /**
   * Update model with new data
   */
  async updateModel(operation: OperationResult): Promise<void> {
    // In production, this would retrain or update the ML model
    // For now, just update baseline statistics
    
    const operator = operation.policyValidation?.metadata?.operator;
    if (!operator) return;

    const baseline = await this.getBaseline(operator);
    const features = await this.extractFeatures(operation);

    // Simple online update of statistics
    for (const [feature, value] of Object.entries(features)) {
      const stats = baseline[feature as keyof BaselineStatistics];
      if (stats && typeof stats === 'object') {
        // Exponential moving average update
        const alpha = 0.1; // Learning rate
        stats.mean = (1 - alpha) * stats.mean + alpha * value;
      }
    }

    await this.storeBaseline(operator, baseline);
  }
}

interface BaselineStatistics {
  amount: { mean: number; stdDev: number };
  gasUsed: { mean: number; stdDev: number };
  hourOfDay: { mean: number; stdDev: number };
  dayOfWeek: { mean: number; stdDev: number };
  timeSinceLastOp: { mean: number; stdDev: number };
  operationType: { mean: number; stdDev: number };
  chainId: { mean: number; stdDev: number };
}
