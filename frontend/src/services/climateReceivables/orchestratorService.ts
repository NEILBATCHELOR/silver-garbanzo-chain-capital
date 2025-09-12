/**
 * Climate Receivables Orchestrator Service
 * 
 * Central coordination service for all climate receivables business logic.
 * Manages batch operations, service health monitoring, and workflow coordination.
 * 
 * Simplified implementation focusing on core coordination without over-engineering.
 */

import type { 
  ClimateReceivableTable,
  BatchOperationStatus,
  HealthCheckResult,
  ServiceConfig,
  ServiceResponse,
  ClimateRiskAssessmentInput,
  CashFlowForecastInput,
  AlertSeverity,
  AlertCategory
} from '../../types/domain/climate';

import { supabase } from '../../infrastructure/database/client';
import { PayerRiskAssessmentService } from './payerRiskAssessmentService';

/**
 * Core orchestrator service for managing climate receivables operations
 */
export class ClimateReceivablesOrchestratorService {
  
  private static instance: ClimateReceivablesOrchestratorService;
  private operationQueue: Map<string, BatchOperationStatus> = new Map();
  private healthStatus: Map<string, HealthCheckResult> = new Map();
  
  // Service configuration with sensible defaults
  private config: ServiceConfig = {
    riskCalculation: {
      enabled: true,
      batchSize: 50,
      timeoutMs: 30000
    },
    cashFlowForecasting: {
      enabled: true,
      defaultHorizonDays: 90,
      refreshIntervalHours: 24
    },
    alerting: {
      enabled: true,
      emailNotifications: false,
      webhookUrl: undefined
    }
  };

  private constructor() {
    this.initializeHealthMonitoring();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ClimateReceivablesOrchestratorService {
    if (!ClimateReceivablesOrchestratorService.instance) {
      ClimateReceivablesOrchestratorService.instance = new ClimateReceivablesOrchestratorService();
    }
    return ClimateReceivablesOrchestratorService.instance;
  }

  /**
   * Process batch risk calculations for multiple receivables using RPC function
   */
  public async processBatchRiskCalculation(
    receivableIds: string[]
  ): Promise<ServiceResponse<BatchOperationStatus>> {
    const operationId = this.generateOperationId('risk_calculation');
    
    const operation: BatchOperationStatus = {
      operationId,
      type: 'risk_calculation',
      status: 'processing',
      progress: 0,
      totalItems: receivableIds.length,
      processedItems: 0,
      failedItems: 0,
      errors: [],
      startedAt: new Date().toISOString()
    };

    this.operationQueue.set(operationId, operation);

    try {
      // Use RPC function for atomic batch operation
      const { data: rpcResults, error } = await supabase
        .rpc('calculate_batch_climate_risk', {
          p_receivable_ids: receivableIds,
          p_calculation_metadata: { operationId, timestamp: new Date().toISOString() }
        });

      if (error) throw error;

      // Process RPC results
      if (rpcResults) {
        for (const result of rpcResults) {
          if (result.status === 'success') {
            operation.processedItems++;
          } else {
            operation.failedItems++;
            operation.errors.push(`${result.receivable_id}: ${result.error_message}`);
          }
        }
      }

      operation.progress = 100;
      operation.status = operation.failedItems > 0 ? 'failed' : 'completed';
      operation.completedAt = new Date().toISOString();
      
      return {
        success: true,
        data: operation,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      operation.status = 'failed';
      operation.errors.push(error instanceof Error ? error.message : 'Unknown error');
      operation.completedAt = new Date().toISOString();
      
      return {
        success: false,
        error: 'Batch risk calculation failed',
        timestamp: new Date().toISOString(),
        data: operation
      };
    } finally {
      this.operationQueue.set(operationId, operation);
    }
  }

  /**
   * Get operation status by ID
   */
  public getBatchOperationStatus(operationId: string): ServiceResponse<BatchOperationStatus> {
    const operation = this.operationQueue.get(operationId);
    
    if (!operation) {
      return {
        success: false,
        error: 'Operation not found',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: operation,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get health status of all services
   */
  public getHealthStatus(): ServiceResponse<HealthCheckResult[]> {
    const healthChecks = Array.from(this.healthStatus.values());
    
    return {
      success: true,
      data: healthChecks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update service configuration
   */
  public updateConfig(newConfig: Partial<ServiceConfig>): ServiceResponse<ServiceConfig> {
    try {
      this.config = { ...this.config, ...newConfig };
      
      return {
        success: true,
        data: this.config,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update configuration',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get current service configuration
   */
  public getConfig(): ServiceResponse<ServiceConfig> {
    return {
      success: true,
      data: this.config,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Trigger alert for critical issues
   */
  public async triggerAlert(
    category: AlertCategory,
    severity: AlertSeverity,
    title: string,
    description: string,
    entityId?: string,
    metadata?: Record<string, any>
  ): Promise<ServiceResponse<void>> {
    try {
      // Insert alert into database
      const { error } = await supabase
        .from('alerts')
        .insert({
          severity,
          service: 'climate_receivables',
          title,
          description,
          metadata: {
            category,
            entityId,
            ...metadata
          }
        });

      if (error) throw error;

      // Log for monitoring
      console.log(`[${severity}] ${category}: ${title}`, { entityId, metadata });

      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to trigger alert',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Private helper methods

  private async processBatchRiskItems(
    receivableIds: string[], 
    operation: BatchOperationStatus
  ): Promise<void> {
    for (const receivableId of receivableIds) {
      try {
        await this.processRiskCalculationForReceivable(receivableId);
        operation.processedItems++;
      } catch (error) {
        operation.failedItems++;
        operation.errors.push(
          `Failed to process ${receivableId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  private async processRiskCalculationForReceivable(receivableId: string): Promise<void> {
    // Get receivable with payer information
    const { data: receivable, error } = await supabase
      .from('climate_receivables')
      .select(`
        *,
        climate_payers!payer_id (
          credit_rating,
          financial_health_score,
          payment_history,
          esg_score
        )
      `)
      .eq('receivable_id', receivableId)
      .single();

    if (error || !receivable) {
      throw new Error(`Receivable not found: ${receivableId}`);
    }

    // Use existing risk assessment service
    const riskResult = PayerRiskAssessmentService.assessPayerRisk({
      credit_rating: (receivable as any).climate_payers?.credit_rating || 'BBB',
      financial_health_score: (receivable as any).climate_payers?.financial_health_score || 70,
      payment_history: (receivable as any).climate_payers?.payment_history,
      esg_score: (receivable as any).climate_payers?.esg_score
    });

    // Update receivable with calculated risk
    const { error: updateError } = await supabase
      .from('climate_receivables')
      .update({
        risk_score: riskResult.risk_score,
        discount_rate: riskResult.discount_rate,
        updated_at: new Date().toISOString()
      })
      .eq('receivable_id', receivableId);

    if (updateError) {
      throw new Error(`Failed to update receivable risk: ${updateError.message}`);
    }
  }

  private initializeHealthMonitoring(): void {
    // Initialize health status for core services
    const services = ['database', 'risk_calculation', 'cash_flow_forecasting', 'alerting'];
    
    services.forEach(service => {
      this.healthStatus.set(service, {
        service,
        status: 'healthy',
        responseTime: 0,
        lastCheck: new Date().toISOString()
      });
    });

    // Start periodic health checks
    setInterval(() => {
      this.performHealthChecks();
    }, 60000); // Check every minute
  }

  private async performHealthChecks(): Promise<void> {
    // Simple health check implementation
    for (const [serviceName, currentStatus] of this.healthStatus) {
      try {
        const startTime = Date.now();
        
        // Perform service-specific health check
        await this.checkServiceHealth(serviceName);
        
        const responseTime = Date.now() - startTime;
        
        this.healthStatus.set(serviceName, {
          service: serviceName,
          status: responseTime < 5000 ? 'healthy' : 'degraded',
          responseTime,
          lastCheck: new Date().toISOString()
        });
        
      } catch (error) {
        this.healthStatus.set(serviceName, {
          service: serviceName,
          status: 'unhealthy',
          responseTime: -1,
          lastCheck: new Date().toISOString(),
          details: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  }

  /**
   * Calculate portfolio valuation using RPC function for atomic operations
   */
  public async calculatePortfolioValuation(
    receivableIds: string[]
  ): Promise<ServiceResponse<any>> {
    try {
      const { data: rpcResult, error } = await supabase
        .rpc('calculate_portfolio_climate_valuation', {
          p_receivable_ids: receivableIds,
          p_calculation_mode: 'comprehensive'
        });

      if (error) throw error;

      if (!rpcResult || rpcResult.length === 0) {
        throw new Error('No valuation results returned');
      }

      const [portfolioData] = rpcResult;
      
      return {
        success: true,
        data: {
          portfolio: portfolioData.portfolio_summary,
          valuations: portfolioData.individual_valuations
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: `Portfolio valuation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Perform health check using RPC function
   */
  public async performHealthCheck(): Promise<ServiceResponse<any>> {
    try {
      const { data: healthResult, error } = await supabase
        .rpc('climate_receivables_health_check');

      if (error) throw error;

      return {
        success: true,
        data: healthResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'database':
        const { error } = await supabase.from('climate_receivables').select('count').limit(1);
        if (error) throw error;
        break;
      case 'risk_calculation':
        // Simple test of risk calculation service
        PayerRiskAssessmentService.calculateRiskScore({
          credit_rating: 'BBB',
          financial_health_score: 75
        });
        break;
      default:
        // Generic health check - just resolve
        break;
    }
  }

  private generateOperationId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const climateReceivablesOrchestrator = ClimateReceivablesOrchestratorService.getInstance();
