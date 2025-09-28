/**
 * ComplianceMonitor.ts
 * Real-time compliance monitoring and alerting
 */

import type { ComplianceRecord } from '../ComplianceTracker';
import { ViolationTracker } from './ViolationTracker';
import { AlertManager } from './AlertManager';
import { DashboardService } from './DashboardService';
import { supabase } from '@/infrastructure/database/client';

export interface MonitorConfig {
  violationConfig?: any;
  alertConfig?: any;
  dashboardConfig?: any;
  thresholds?: ComplianceThresholds;
  autoBlock?: boolean;
}

export interface ComplianceThresholds {
  violationLimit: number;
  criticalViolationLimit: number;
  complianceScoreMin: number;
  reportingDelay: number;
}

export interface ViolationPattern {
  type: string;
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timeframe: number;
  operator: string;
}

export interface ComplianceMetrics {
  totalOperations: number;
  compliantOperations: number;
  complianceRate: number;
  violations: number;
  averageComplianceScore: number;
  timestamp: string;
}

export class ComplianceMonitor {
  private violationTracker: ViolationTracker;
  private alertManager: AlertManager;
  private dashboardService: DashboardService;
  private config: MonitorConfig;
  private metricsCache: Map<string, ComplianceMetrics>;

  constructor(config: MonitorConfig = {}) {
    this.config = {
      thresholds: {
        violationLimit: config.thresholds?.violationLimit ?? 5,
        criticalViolationLimit: config.thresholds?.criticalViolationLimit ?? 2,
        complianceScoreMin: config.thresholds?.complianceScoreMin ?? 0.7,
        reportingDelay: config.thresholds?.reportingDelay ?? 3600000, // 1 hour
        ...config.thresholds
      },
      autoBlock: config.autoBlock ?? false,
      ...config
    };

    this.violationTracker = new ViolationTracker(config.violationConfig);
    this.alertManager = new AlertManager(config.alertConfig);
    this.dashboardService = new DashboardService(config.dashboardConfig);
    this.metricsCache = new Map();
  }

  /**
   * Track compliance record
   */
  async track(record: ComplianceRecord): Promise<void> {
    try {
      // 1. Track violations if any
      if (record.violations.length > 0) {
        await this.violationTracker.track(record.violations, record.operator);
        
        // Check for violation patterns
        const patterns = await this.violationTracker.detectPatterns(record.operator);
        
        if (patterns.length > 0) {
          await this.handleViolationPatterns(patterns, record);
        }
      }
      
      // 2. Update compliance metrics
      await this.updateMetrics(record);
      
      // 3. Check thresholds
      const breaches = await this.checkThresholds(record);
      if (breaches.length > 0) {
        await this.handleThresholdBreach(breaches, record);
      }
      
      // 4. Update dashboard
      await this.dashboardService.update({
        operationId: record.operationId,
        status: record.complianceStatus,
        violations: record.violations.length,
        timestamp: record.timestamp
      });
      
      // 5. Check for reporting delays
      await this.checkReportingDelays(record);
      
    } catch (error: any) {
      console.error('Failed to track compliance:', error);
      
      // Send alert about monitoring failure
      await this.alertManager.sendAlert({
        type: 'MONITORING_FAILURE',
        severity: 'high',
        message: `Compliance monitoring failed: ${error.message}`,
        details: { record, error: error.message }
      });
    }
  }

  /**
   * Handle violation patterns
   */
  private async handleViolationPatterns(
    patterns: ViolationPattern[],
    record: ComplianceRecord
  ): Promise<void> {
    for (const pattern of patterns) {
      if (pattern.severity === 'critical') {
        // Send immediate critical alert
        await this.alertManager.sendCriticalAlert({
          type: 'VIOLATION_PATTERN',
          message: `Critical violation pattern detected for operator ${record.operator}`,
          details: {
            pattern,
            record
          }
        });
        
        // Auto-block operator if enabled and threshold exceeded
        if (this.config.autoBlock && pattern.count > this.config.thresholds!.criticalViolationLimit) {
          await this.blockOperator(record.operator, pattern);
        }
      } else if (pattern.severity === 'high') {
        // Send high priority alert
        await this.alertManager.sendAlert({
          type: 'VIOLATION_PATTERN',
          severity: 'high',
          message: `High-severity violation pattern detected`,
          details: { pattern, operator: record.operator }
        });
      }
      
      // Log pattern to database
      await this.logViolationPattern(pattern);
    }
  }

  /**
   * Update compliance metrics
   */
  private async updateMetrics(record: ComplianceRecord): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create today's metrics
    let metrics = this.metricsCache.get(today);
    
    if (!metrics) {
      // Load from database
      const { data } = await supabase
        .from('compliance_metrics')
        .select('*')
        .eq('metric_date', today)
        .single();
      
      metrics = data || {
        totalOperations: 0,
        compliantOperations: 0,
        complianceRate: 0,
        violations: 0,
        averageComplianceScore: 0,
        timestamp: new Date().toISOString()
      };
    }
    
    // Update metrics
    metrics.totalOperations++;
    if (record.complianceStatus.compliant) {
      metrics.compliantOperations++;
    }
    metrics.violations += record.violations.length;
    
    // Recalculate rates
    metrics.complianceRate = metrics.totalOperations > 0 
      ? metrics.compliantOperations / metrics.totalOperations 
      : 0;
    
    // Update average score (simplified - should use weighted average)
    const currentScore = record.complianceStatus.score;
    metrics.averageComplianceScore = 
      (metrics.averageComplianceScore * (metrics.totalOperations - 1) + currentScore) / 
      metrics.totalOperations;
    
    // Cache updated metrics
    this.metricsCache.set(today, metrics);
    
    // Store to database
    await this.storeMetrics(today, metrics);
  }

  /**
   * Check compliance thresholds
   */
  private async checkThresholds(record: ComplianceRecord): Promise<ThresholdBreach[]> {
    const breaches: ThresholdBreach[] = [];
    
    // Check compliance score threshold
    if (record.complianceStatus.score < this.config.thresholds!.complianceScoreMin) {
      breaches.push({
        type: 'COMPLIANCE_SCORE',
        threshold: this.config.thresholds!.complianceScoreMin,
        actual: record.complianceStatus.score,
        severity: 'high'
      });
    }
    
    // Check violation count threshold
    const recentViolations = await this.getRecentViolationCount(record.operator);
    if (recentViolations > this.config.thresholds!.violationLimit) {
      breaches.push({
        type: 'VIOLATION_COUNT',
        threshold: this.config.thresholds!.violationLimit,
        actual: recentViolations,
        severity: 'high'
      });
    }
    
    // Check critical violations
    const criticalViolations = record.violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      breaches.push({
        type: 'CRITICAL_VIOLATION',
        threshold: 0,
        actual: criticalViolations.length,
        severity: 'critical'
      });
    }
    
    return breaches;
  }

  /**
   * Handle threshold breaches
   */
  private async handleThresholdBreach(
    breaches: ThresholdBreach[],
    record: ComplianceRecord
  ): Promise<void> {
    for (const breach of breaches) {
      // Send alert based on severity
      if (breach.severity === 'critical') {
        await this.alertManager.sendCriticalAlert({
          type: 'THRESHOLD_BREACH',
          message: `Critical threshold breach: ${breach.type}`,
          details: {
            breach,
            record
          }
        });
      } else {
        await this.alertManager.sendAlert({
          type: 'THRESHOLD_BREACH',
          severity: breach.severity,
          message: `Threshold breach: ${breach.type}`,
          details: { breach, operationId: record.operationId }
        });
      }
      
      // Log breach to database
      await this.logThresholdBreach(breach, record);
    }
  }

  /**
   * Check for reporting delays
   */
  private async checkReportingDelays(record: ComplianceRecord): Promise<void> {
    if (!record.reportingRequired) return;
    
    const reportingDeadline = new Date(record.timestamp).getTime() + this.config.thresholds!.reportingDelay;
    const now = Date.now();
    
    if (now > reportingDeadline) {
      // Check if report has been generated
      const { data: report } = await supabase
        .from('compliance_reports')
        .select('generated_at')
        .eq('operation_id', record.operationId)
        .single();
      
      if (!report) {
        // Report is overdue
        await this.alertManager.sendAlert({
          type: 'REPORTING_DELAY',
          severity: 'high',
          message: `Compliance report overdue for operation ${record.operationId}`,
          details: {
            operationId: record.operationId,
            deadline: new Date(reportingDeadline).toISOString(),
            delayMinutes: Math.floor((now - reportingDeadline) / 60000)
          }
        });
      }
    }
  }

  /**
   * Block operator
   */
  private async blockOperator(operator: string, pattern: ViolationPattern): Promise<void> {
    try {
      // Update operator status
      const { error } = await supabase
        .from('operator_status')
        .upsert({
          operator,
          status: 'blocked',
          blocked_reason: `Violation pattern: ${pattern.type} (${pattern.count} occurrences)`,
          blocked_at: new Date().toISOString(),
          blocked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hour block
        });
      
      if (error) {
        throw error;
      }
      
      // Send notification
      await this.alertManager.sendCriticalAlert({
        type: 'OPERATOR_BLOCKED',
        message: `Operator ${operator} has been blocked due to violations`,
        details: { operator, pattern }
      });
      
      console.log(`Operator ${operator} blocked due to violation pattern`);
    } catch (error: any) {
      console.error('Failed to block operator:', error);
    }
  }

  /**
   * Get recent violation count for operator
   */
  private async getRecentViolationCount(operator: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { count } = await supabase
      .from('compliance_violations')
      .select('*', { count: 'exact', head: true })
      .eq('operator', operator)
      .gte('created_at', oneHourAgo.toISOString());
    
    return count || 0;
  }

  /**
   * Store metrics to database
   */
  private async storeMetrics(date: string, metrics: ComplianceMetrics): Promise<void> {
    await supabase
      .from('compliance_metrics')
      .upsert({
        metric_date: date,
        total_operations: metrics.totalOperations,
        compliant_operations: metrics.compliantOperations,
        partial_compliance: 0, // Calculate if needed
        non_compliant: metrics.totalOperations - metrics.compliantOperations,
        violations_count: metrics.violations,
        reports_generated: 0, // Track separately
        avg_compliance_score: metrics.averageComplianceScore,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Log violation pattern
   */
  private async logViolationPattern(pattern: ViolationPattern): Promise<void> {
    await supabase
      .from('violation_patterns')
      .insert({
        operator: pattern.operator,
        pattern_type: pattern.type,
        count: pattern.count,
        severity: pattern.severity,
        timeframe: pattern.timeframe,
        detected_at: new Date().toISOString()
      });
  }

  /**
   * Log threshold breach
   */
  private async logThresholdBreach(breach: ThresholdBreach, record: ComplianceRecord): Promise<void> {
    await supabase
      .from('threshold_breaches')
      .insert({
        operation_id: record.operationId,
        breach_type: breach.type,
        threshold_value: breach.threshold,
        actual_value: breach.actual,
        severity: breach.severity,
        operator: record.operator,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Get compliance statistics
   */
  async getStats(timeframe?: { start: Date; end: Date }): Promise<ComplianceMetrics> {
    const query = supabase
      .from('compliance_metrics')
      .select('*');
    
    if (timeframe) {
      query
        .gte('metric_date', timeframe.start.toISOString().split('T')[0])
        .lte('metric_date', timeframe.end.toISOString().split('T')[0]);
    }
    
    const { data } = await query;
    
    if (!data || data.length === 0) {
      return {
        totalOperations: 0,
        compliantOperations: 0,
        complianceRate: 0,
        violations: 0,
        averageComplianceScore: 0,
        timestamp: new Date().toISOString()
      };
    }
    
    // Aggregate metrics
    const totals = data.reduce((acc, metric) => ({
      totalOperations: acc.totalOperations + (metric.total_operations || 0),
      compliantOperations: acc.compliantOperations + (metric.compliant_operations || 0),
      violations: acc.violations + (metric.violations_count || 0),
      scoreSum: acc.scoreSum + ((metric.avg_compliance_score || 0) * (metric.total_operations || 0)),
      count: acc.count + 1
    }), {
      totalOperations: 0,
      compliantOperations: 0,
      violations: 0,
      scoreSum: 0,
      count: 0
    });
    
    return {
      totalOperations: totals.totalOperations,
      compliantOperations: totals.compliantOperations,
      complianceRate: totals.totalOperations > 0 
        ? totals.compliantOperations / totals.totalOperations 
        : 0,
      violations: totals.violations,
      averageComplianceScore: totals.totalOperations > 0 
        ? totals.scoreSum / totals.totalOperations 
        : 0,
      timestamp: new Date().toISOString()
    };
  }
}

interface ThresholdBreach {
  type: string;
  threshold: number;
  actual: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}
