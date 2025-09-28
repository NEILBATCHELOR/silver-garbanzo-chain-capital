/**
 * ComplianceTracker.ts
 * Post-Operation Compliance Tracking
 * Monitors and reports on all cryptographic operations
 */

import type { OperationResult } from '../gateway/types';
import { AuditLogger } from './AuditLogger';
import { ComplianceReporter } from './ComplianceReporter';
import { TransactionAnalyzer } from './analyzers/TransactionAnalyzer';
import { ComplianceMonitor } from './monitors/ComplianceMonitor';
import { supabase } from '@/infrastructure/database/client';
import { generateUUID } from '@/utils/shared/formatting/uuidUtils';

export interface ComplianceRecord {
  operationId: string;
  timestamp: string;
  operationType: string;
  operator: string;
  complianceStatus: ComplianceStatus;
  violations: ComplianceViolation[];
  auditTrail: AuditEntry[];
  reportingRequired: boolean;
  regulatoryFlags: RegulatoryFlag[];
}

export interface ComplianceStatus {
  compliant: boolean;
  level: 'full' | 'partial' | 'non-compliant';
  score: number;
  details: string;
}

export interface ComplianceViolation {
  violationId: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation?: string;
  resolvedAt?: string;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  actor: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface RegulatoryFlag {
  regulation: string; // e.g., 'MiCA', 'GDPR', 'AML'
  requirement: string;
  status: 'met' | 'pending' | 'failed';
  evidence?: string;
}

export interface OperationContext {
  operationType: string;
  operator: string;
  chainId?: string;
  tokenAddress?: string;
  metadata?: Record<string, any>;
}

export interface ComplianceConfig {
  auditConfig?: any;
  reporterConfig?: any;
  analyzerConfig?: any;
  monitorConfig?: any;
  reportingThreshold?: number;
  autoReport?: boolean;
}
export class ComplianceTracker {
  private auditLogger: AuditLogger;
  private reporter: ComplianceReporter;
  private analyzer: TransactionAnalyzer;
  private monitor: ComplianceMonitor;
  private config: ComplianceConfig;

  constructor(config: ComplianceConfig = {}) {
    this.config = {
      reportingThreshold: config.reportingThreshold ?? 0.7,
      autoReport: config.autoReport ?? true,
      ...config
    };

    this.auditLogger = new AuditLogger(config.auditConfig);
    this.reporter = new ComplianceReporter(config.reporterConfig);
    this.analyzer = new TransactionAnalyzer(config.analyzerConfig);
    this.monitor = new ComplianceMonitor(config.monitorConfig);
  }

  /**
   * Track operation for compliance
   */
  async trackOperation(
    operation: OperationResult,
    context: OperationContext
  ): Promise<ComplianceRecord> {
    const record: ComplianceRecord = {
      operationId: operation.operationId,
      timestamp: new Date().toISOString(),
      operationType: context.operationType,
      operator: context.operator,
      complianceStatus: await this.evaluateCompliance(operation),
      violations: [],
      auditTrail: [],
      reportingRequired: false,
      regulatoryFlags: []
    };

    try {
      // 1. Analyze transaction patterns
      const analysis = await this.analyzer.analyze(operation);
      if (analysis.suspicious) {
        record.violations.push({
          violationId: generateUUID(),
          type: 'SUSPICIOUS_PATTERN',
          severity: analysis.severity,
          description: analysis.description
        });
      }

      // 2. Check regulatory requirements
      record.regulatoryFlags = await this.checkRegulations(operation, context);

      // 3. Create audit trail
      record.auditTrail = await this.createAuditTrail(operation, context);

      // 4. Determine reporting requirements
      record.reportingRequired = this.requiresReporting(record);

      // 5. Log to database
      await this.auditLogger.log(record);

      // 6. Generate reports if needed
      if (record.reportingRequired && this.config.autoReport) {
        await this.reporter.generateReport(record);
      }

      // 7. Monitor for ongoing compliance
      await this.monitor.track(record);
      return record;
      
    } catch (error: any) {
      console.error('Failed to track operation:', error);
      
      // Still return a record with error information
      record.violations.push({
        violationId: generateUUID(),
        type: 'TRACKING_ERROR',
        severity: 'high',
        description: `Failed to complete compliance tracking: ${error.message}`
      });
      
      return record;
    }
  }

  /**
   * Evaluate compliance status
   */
  private async evaluateCompliance(
    operation: OperationResult
  ): Promise<ComplianceStatus> {
    const checks = await this.runComplianceChecks(operation);
    const score = this.calculateComplianceScore(checks);
    
    return {
      compliant: score >= 0.8,
      level: this.determineLevel(score),
      score,
      details: this.generateDetails(checks)
    };
  }

  /**
   * Run compliance checks
   */
  private async runComplianceChecks(operation: OperationResult): Promise<any[]> {
    const checks = [];
    
    // Check transaction validity
    checks.push({
      name: 'transaction_validity',
      passed: operation.success,
      weight: 0.3
    });
    
    // Check policy compliance
    checks.push({
      name: 'policy_compliance',
      passed: operation.policyValidation?.allowed ?? false,
      weight: 0.4
    });
    
    // Check gas usage
    const gasUsed = BigInt(operation.gasUsed || 0);
    const gasLimit = BigInt(1000000); // Example limit
    checks.push({
      name: 'gas_efficiency',
      passed: gasUsed < gasLimit,
      weight: 0.1
    });
    
    // Additional checks can be added
    
    return checks;
  }
  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(checks: any[]): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const check of checks) {
      if (check.passed) {
        weightedSum += check.weight;
      }
      totalWeight += check.weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determine compliance level
   */
  private determineLevel(score: number): 'full' | 'partial' | 'non-compliant' {
    if (score >= 0.9) return 'full';
    if (score >= 0.5) return 'partial';
    return 'non-compliant';
  }

  /**
   * Generate compliance details
   */
  private generateDetails(checks: any[]): string {
    const failed = checks.filter(c => !c.passed).map(c => c.name);
    if (failed.length === 0) {
      return 'All compliance checks passed';
    }
    return `Failed checks: ${failed.join(', ')}`;
  }
  /**
   * Check regulatory requirements
   */
  private async checkRegulations(
    operation: OperationResult,
    context: OperationContext
  ): Promise<RegulatoryFlag[]> {
    const flags: RegulatoryFlag[] = [];
    
    // MiCA compliance check
    if (this.requiresMiCACompliance(context)) {
      flags.push({
        regulation: 'MiCA',
        requirement: 'Crypto-asset service provider registration',
        status: await this.checkMiCACompliance(operation) ? 'met' : 'failed',
        evidence: operation.transactionHash
      });
    }
    
    // AML compliance check
    if (this.requiresAMLCheck(operation)) {
      flags.push({
        regulation: 'AML',
        requirement: 'Anti-money laundering verification',
        status: await this.checkAMLCompliance(context) ? 'met' : 'pending'
      });
    }
    
    // GDPR compliance check
    flags.push({
      regulation: 'GDPR',
      requirement: 'Data protection compliance',
      status: 'met' // Assuming GDPR compliance is built-in
    });
    
    return flags;
  }
  /**
   * Create audit trail
   */
  private async createAuditTrail(
    operation: OperationResult,
    context: OperationContext
  ): Promise<AuditEntry[]> {
    const trail: AuditEntry[] = [];
    
    // Initial operation entry
    trail.push({
      timestamp: new Date().toISOString(),
      action: `${context.operationType}_initiated`,
      actor: context.operator,
      details: {
        operationId: operation.operationId,
        chainId: context.chainId,
        tokenAddress: context.tokenAddress
      }
    });
    
    // Policy evaluation entry
    if (operation.policyValidation) {
      trail.push({
        timestamp: new Date().toISOString(),
        action: 'policy_evaluated',
        actor: 'system',
        details: {
          allowed: operation.policyValidation.allowed,
          policiesChecked: operation.policyValidation.policiesEvaluated || 0
        }
      });
    }
    
    return trail;
  }
  /**
   * Check if reporting is required
   */
  private requiresReporting(record: ComplianceRecord): boolean {
    // Report if non-compliant
    if (record.complianceStatus.score < this.config.reportingThreshold!) {
      return true;
    }
    
    // Report if critical violations
    const hasCritical = record.violations.some(v => v.severity === 'critical');
    if (hasCritical) {
      return true;
    }
    
    // Report if regulatory flags failed
    const hasFailedFlags = record.regulatoryFlags.some(f => f.status === 'failed');
    if (hasFailedFlags) {
      return true;
    }
    
    return false;
  }

  /**
   * Helper methods for regulatory checks
   */
  private requiresMiCACompliance(context: OperationContext): boolean {
    // Check if operation falls under MiCA jurisdiction
    return context.metadata?.jurisdiction === 'EU';
  }
  
  private requiresAMLCheck(operation: OperationResult): boolean {
    // Check if amount exceeds AML threshold
    const threshold = BigInt('10000000000000000000000'); // 10,000 tokens
    const amount = BigInt(operation.policyValidation?.metadata?.amount || 0);
    return amount > threshold;
  }
  private async checkMiCACompliance(operation: OperationResult): Promise<boolean> {
    // Implement MiCA compliance check
    // For now, return true if operation was successful
    return operation.success;
  }
  
  private async checkAMLCompliance(context: OperationContext): Promise<boolean> {
    // Implement AML compliance check
    // Check if operator is verified
    const { data } = await supabase
      .from('user_verifications')
      .select('aml_verified')
      .eq('user_id', context.operator)
      .single();
    
    return data?.aml_verified || false;
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStats(timeframe?: { start: Date; end: Date }) {
    const query = supabase
      .from('compliance_audit_logs')
      .select('*');
    
    if (timeframe) {
      query
        .gte('created_at', timeframe.start.toISOString())
        .lte('created_at', timeframe.end.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to get compliance stats: ${error.message}`);
    }
    
    return this.calculateStats(data || []);
  }
  private calculateStats(logs: any[]) {
    const total = logs.length;
    const compliant = logs.filter(l => l.compliance_status?.compliant).length;
    const violations = logs.reduce((sum, l) => 
      sum + (l.violations?.length || 0), 0
    );
    
    return {
      totalOperations: total,
      compliantOperations: compliant,
      complianceRate: total > 0 ? compliant / total : 0,
      totalViolations: violations,
      averageViolationsPerOperation: total > 0 ? violations / total : 0
    };
  }
}