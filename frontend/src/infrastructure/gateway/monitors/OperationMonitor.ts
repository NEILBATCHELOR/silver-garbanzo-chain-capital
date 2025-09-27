/**
 * Operation Monitor
 * Tracks and monitors cryptographic operations
 */

import { supabase } from '../../supabaseClient';
import type { OperationRequest, TransactionResult } from '../types';

export interface OperationMetrics {
  totalOperations: number;
  successRate: number;
  averageExecutionTime: number;
  averageGasUsed: string;
  operationsByType: Record<string, number>;
  errorsByType: Record<string, number>;
  hourlyVolume: number[];
}

export interface MonitorConfig {
  enableMetrics?: boolean;
  metricsInterval?: number;
  alertThresholds?: {
    errorRate?: number;
    gasPrice?: bigint;
    executionTime?: number;
  };
}

export class OperationMonitor {
  private config: MonitorConfig;
  private metrics: Map<string, any>;
  private startTimes: Map<string, number>;
  
  constructor(config: MonitorConfig = {}) {
    this.config = {
      enableMetrics: true,
      metricsInterval: 60000, // 1 minute
      ...config
    };
    this.metrics = new Map();
    this.startTimes = new Map();
    
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }
    
  /**
   * Track operation start
   */
  startOperation(operationId: string): void {
    this.startTimes.set(operationId, Date.now());
  }
  
  /**
   * Track operation completion
   */
  async trackOperation(
    operationId: string,
    request: OperationRequest,
    result: TransactionResult
  ): Promise<void> {
    const startTime = this.startTimes.get(operationId);
    const executionTime = startTime ? Date.now() - startTime : 0;
    
    // Update metrics
    this.updateMetrics(request.type, result.status === 'success', executionTime, result.gasUsed);
    
    // Check alert thresholds
    await this.checkAlerts(executionTime, result.gasUsed);
    
    // Clean up
    this.startTimes.delete(operationId);
    
    // Log to database
    await this.logMetrics(operationId, request, result, executionTime);
  }
  
  /**
   * Update operation metrics
   */
  private updateMetrics(
    operationType: string,
    success: boolean,
    executionTime: number,
    gasUsed?: bigint
  ): void {
    // Total operations
    const total = this.metrics.get('totalOperations') || 0;
    this.metrics.set('totalOperations', total + 1);
    
    // Success/failure counts
    const successCount = this.metrics.get('successCount') || 0;
    const failureCount = this.metrics.get('failureCount') || 0;
    
    if (success) {
      this.metrics.set('successCount', successCount + 1);
    } else {
      this.metrics.set('failureCount', failureCount + 1);
    }
    
    // Operations by type
    const byType = this.metrics.get('operationsByType') || {};
    byType[operationType] = (byType[operationType] || 0) + 1;
    this.metrics.set('operationsByType', byType);
    
    // Execution times
    const times = this.metrics.get('executionTimes') || [];
    times.push(executionTime);
    this.metrics.set('executionTimes', times);
    
    // Gas usage
    if (gasUsed) {
      const gasUsages = this.metrics.get('gasUsages') || [];
      gasUsages.push(gasUsed.toString());
      this.metrics.set('gasUsages', gasUsages);
    }
  }
    
  /**
   * Check alert thresholds
   */
  private async checkAlerts(executionTime: number, gasUsed?: bigint): Promise<void> {
    if (!this.config.alertThresholds) return;
    
    const { errorRate, gasPrice, executionTime: maxExecutionTime } = this.config.alertThresholds;
    
    // Check execution time
    if (maxExecutionTime && executionTime > maxExecutionTime) {
      console.warn(`Operation execution time exceeded threshold: ${executionTime}ms > ${maxExecutionTime}ms`);
    }
    
    // Check gas price
    if (gasPrice && gasUsed && gasUsed > gasPrice) {
      console.warn(`Gas usage exceeded threshold: ${gasUsed} > ${gasPrice}`);
    }
    
    // Check error rate
    if (errorRate) {
      const successCount = this.metrics.get('successCount') || 0;
      const failureCount = this.metrics.get('failureCount') || 0;
      const total = successCount + failureCount;
      
      if (total > 0) {
        const currentErrorRate = failureCount / total;
        if (currentErrorRate > errorRate) {
          console.warn(`Error rate exceeded threshold: ${(currentErrorRate * 100).toFixed(2)}% > ${(errorRate * 100).toFixed(2)}%`);
        }
      }
    }
  }
  
  /**
   * Log metrics to database
   */
  private async logMetrics(
    operationId: string,
    request: OperationRequest,
    result: TransactionResult,
    executionTime: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('operation_metrics')
        .insert({
          operation_id: operationId,
          operation_type: request.type,
          chain: request.chain,
          execution_time_ms: executionTime,
          gas_used: result.gasUsed?.toString(),
          status: result.status,
          timestamp: new Date().toISOString()
        });
        
      if (error) {
        console.error('Failed to log operation metrics:', error);
      }
    } catch (err) {
      console.error('Error logging metrics:', err);
    }
  }
  
  /**
   * Get current metrics
   */
  async getMetrics(timeframe?: string): Promise<OperationMetrics> {
    const successCount = this.metrics.get('successCount') || 0;
    const failureCount = this.metrics.get('failureCount') || 0;
    const total = successCount + failureCount;
    
    const executionTimes = this.metrics.get('executionTimes') || [];
    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((a: number, b: number) => a + b, 0) / executionTimes.length
      : 0;
    
    const gasUsages = this.metrics.get('gasUsages') || [];
    const avgGasUsed = gasUsages.length > 0
      ? (gasUsages.reduce((a: bigint, b: string) => a + BigInt(b), 0n) / BigInt(gasUsages.length)).toString()
      : '0';
    
    return {
      totalOperations: total,
      successRate: total > 0 ? successCount / total : 0,
      averageExecutionTime: avgExecutionTime,
      averageGasUsed: avgGasUsed,
      operationsByType: this.metrics.get('operationsByType') || {},
      errorsByType: this.metrics.get('errorsByType') || {},
      hourlyVolume: await this.getHourlyVolume(timeframe)
    };
  }
  
  /**
   * Get hourly volume data
   */
  private async getHourlyVolume(timeframe = '24h'): Promise<number[]> {
    // Query from database for actual data
    // For now, return mock data
    return Array(24).fill(0).map(() => Math.floor(Math.random() * 100));
  }
  
  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(async () => {
      const metrics = await this.getMetrics();
      console.log('Operation Metrics:', metrics);
      // Could send to monitoring service here
    }, this.config.metricsInterval!);
  }
}