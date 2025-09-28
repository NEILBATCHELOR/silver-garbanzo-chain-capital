/**
 * SuspiciousActivityReporter.ts
 * Specialized reporter for suspicious activity reports (SARs)
 */

import type { ComplianceRecord } from '../ComplianceTracker';
import { supabase } from '@/infrastructure/database/client';
import { generateUUID } from '@/utils/shared/formatting/uuidUtils';

export interface SARConfig {
  autoFile?: boolean;
  filingDeadline?: number; // in milliseconds
  includeTransactionDetails?: boolean;
  regulatoryBody?: string;
}

export interface SuspiciousActivityReport {
  id: string;
  operationId: string;
  filingDate: string;
  suspiciousActivity: SuspiciousActivity;
  involvedParties: InvolvedParty[];
  transactionDetails: TransactionDetail[];
  narrative: string;
  recommendations: string[];
  status: 'draft' | 'filed' | 'acknowledged';
}

export interface SuspiciousActivity {
  type: string;
  description: string;
  severity: string;
  indicators: string[];
  patterns: string[];
}

export interface InvolvedParty {
  role: string;
  identifier: string;
  address?: string;
  riskLevel: string;
  previousActivity?: string;
}

export interface TransactionDetail {
  timestamp: string;
  type: string;
  amount: string;
  from: string;
  to: string;
  chainId?: string;
  transactionHash?: string;
}

export class SuspiciousActivityReporter {
  private config: SARConfig;

  constructor(config: SARConfig = {}) {
    this.config = {
      autoFile: config.autoFile ?? false,
      filingDeadline: config.filingDeadline ?? 30 * 24 * 60 * 60 * 1000, // 30 days
      includeTransactionDetails: config.includeTransactionDetails ?? true,
      regulatoryBody: config.regulatoryBody ?? 'FinCEN',
      ...config
    };
  }

  /**
   * Generate suspicious activity report
   */
  async generateSAR(
    record: ComplianceRecord,
    additionalContext?: any
  ): Promise<SuspiciousActivityReport> {
    const sar: SuspiciousActivityReport = {
      id: generateUUID(),
      operationId: record.operationId,
      filingDate: new Date().toISOString(),
      suspiciousActivity: await this.analyzeSuspiciousActivity(record),
      involvedParties: await this.identifyInvolvedParties(record),
      transactionDetails: await this.getTransactionDetails(record),
      narrative: this.generateNarrative(record, additionalContext),
      recommendations: this.generateRecommendations(record),
      status: 'draft'
    };

    // Store SAR
    await this.storeSAR(sar);

    // Auto-file if configured
    if (this.config.autoFile) {
      await this.fileSAR(sar);
    }

    return sar;
  }

  /**
   * Analyze suspicious activity
   */
  private async analyzeSuspiciousActivity(record: ComplianceRecord): Promise<SuspiciousActivity> {
    const suspiciousViolations = record.violations.filter(
      v => v.type === 'SUSPICIOUS_PATTERN' || v.severity === 'critical'
    );

    const indicators: string[] = [];
    const patterns: string[] = [];

    // Extract indicators from violations
    for (const violation of suspiciousViolations) {
      if (violation.description.includes('pattern')) {
        patterns.push(violation.description);
      } else {
        indicators.push(violation.description);
      }
    }

    // Query for historical patterns
    const { data: historicalPatterns } = await supabase
      .from('violation_patterns')
      .select('pattern_type, count')
      .eq('operator', record.operator)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (historicalPatterns) {
      for (const pattern of historicalPatterns) {
        patterns.push(`${pattern.pattern_type}: ${pattern.count} occurrences`);
      }
    }

    return {
      type: this.determineSuspiciousType(record),
      description: this.generateSuspiciousDescription(record),
      severity: this.determineSeverity(record),
      indicators,
      patterns
    };
  }

  /**
   * Identify involved parties
   */
  private async identifyInvolvedParties(record: ComplianceRecord): Promise<InvolvedParty[]> {
    const parties: InvolvedParty[] = [];

    // Primary operator
    parties.push({
      role: 'operator',
      identifier: record.operator,
      riskLevel: await this.getRiskLevel(record.operator),
      previousActivity: await this.getPreviousActivity(record.operator)
    });

    // Get transaction parties if available
    const transactionData = record.auditTrail.find(
      entry => entry.action.includes('transaction')
    );

    if (transactionData?.details) {
      if (transactionData.details.from) {
        parties.push({
          role: 'sender',
          identifier: transactionData.details.from,
          riskLevel: await this.getRiskLevel(transactionData.details.from)
        });
      }

      if (transactionData.details.to) {
        parties.push({
          role: 'recipient',
          identifier: transactionData.details.to,
          riskLevel: await this.getRiskLevel(transactionData.details.to)
        });
      }
    }

    return parties;
  }

  /**
   * Get transaction details
   */
  private async getTransactionDetails(record: ComplianceRecord): Promise<TransactionDetail[]> {
    if (!this.config.includeTransactionDetails) {
      return [];
    }

    const { data: transactions } = await supabase
      .from('token_operations')
      .select('*')
      .eq('operation_id', record.operationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!transactions) return [];

    return transactions.map(tx => ({
      timestamp: tx.created_at,
      type: tx.operation_type,
      amount: tx.amount || '0',
      from: tx.sender || '',
      to: tx.recipient || '',
      chainId: tx.chain_id,
      transactionHash: tx.transaction_hash
    }));
  }

  /**
   * Generate narrative description
   */
  private generateNarrative(record: ComplianceRecord, context?: any): string {
    const parts: string[] = [];

    // Opening statement
    parts.push(
      `Suspicious activity detected for operation ${record.operationId} ` +
      `conducted by ${record.operator} on ${record.timestamp}.`
    );

    // Describe the activity
    parts.push(
      `The ${record.operationType} operation exhibited the following suspicious characteristics:`
    );

    // List violations
    const violations = record.violations
      .map(v => `- ${v.description} (Severity: ${v.severity})`)
      .join('\n');
    parts.push(violations);

    // Compliance assessment
    parts.push(
      `The operation achieved a compliance score of ${record.complianceStatus.score.toFixed(2)}, ` +
      `which is classified as ${record.complianceStatus.level}.`
    );

    // Regulatory concerns
    const failedRegs = record.regulatoryFlags.filter(f => f.status === 'failed');
    if (failedRegs.length > 0) {
      parts.push(
        `The following regulatory requirements were not met: ` +
        failedRegs.map(f => f.regulation).join(', ')
      );
    }

    // Additional context
    if (context?.additionalInfo) {
      parts.push(context.additionalInfo);
    }

    return parts.join('\n\n');
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(record: ComplianceRecord): string[] {
    const recommendations: string[] = [];

    // Immediate actions
    recommendations.push('Freeze related accounts pending investigation');
    recommendations.push('Conduct enhanced due diligence on all involved parties');
    
    // Based on severity
    const hasCritical = record.violations.some(v => v.severity === 'critical');
    if (hasCritical) {
      recommendations.push('Escalate to senior management immediately');
      recommendations.push('Consider filing SAR with regulatory authorities');
      recommendations.push('Implement transaction monitoring for similar patterns');
    }

    // Preventive measures
    recommendations.push('Review and update risk assessment procedures');
    recommendations.push('Enhance KYC/AML controls for similar operations');
    recommendations.push('Provide additional training to compliance staff');

    return recommendations;
  }

  /**
   * Store SAR to database
   */
  private async storeSAR(sar: SuspiciousActivityReport): Promise<void> {
    const { error } = await supabase
      .from('suspicious_activity_reports')
      .insert({
        id: sar.id,
        operation_id: sar.operationId,
        filing_date: sar.filingDate,
        suspicious_activity: sar.suspiciousActivity,
        involved_parties: sar.involvedParties,
        transaction_details: sar.transactionDetails,
        narrative: sar.narrative,
        recommendations: sar.recommendations,
        status: sar.status,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store SAR: ${error.message}`);
    }
  }

  /**
   * File SAR with regulatory body
   */
  async fileSAR(sar: SuspiciousActivityReport): Promise<void> {
    try {
      // TODO: Implement actual filing with regulatory API
      console.log(`Filing SAR ${sar.id} with ${this.config.regulatoryBody}`);

      // Update status
      await supabase
        .from('suspicious_activity_reports')
        .update({ 
          status: 'filed',
          filed_at: new Date().toISOString()
        })
        .eq('id', sar.id);

      sar.status = 'filed';
    } catch (error: any) {
      console.error('Failed to file SAR:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private determineSuspiciousType(record: ComplianceRecord): string {
    // Analyze violations to determine type
    const types = new Set<string>();
    
    for (const violation of record.violations) {
      if (violation.type.includes('PATTERN')) types.add('Pattern-based');
      if (violation.type.includes('AMOUNT')) types.add('Unusual amount');
      if (violation.type.includes('FREQUENCY')) types.add('High frequency');
      if (violation.type.includes('DESTINATION')) types.add('Suspicious destination');
    }

    return Array.from(types).join(', ') || 'General suspicious activity';
  }

  private generateSuspiciousDescription(record: ComplianceRecord): string {
    const descriptions = record.violations
      .filter(v => v.severity === 'critical' || v.severity === 'high')
      .map(v => v.description)
      .slice(0, 3)
      .join('; ');

    return descriptions || 'Multiple compliance violations detected';
  }

  private determineSeverity(record: ComplianceRecord): string {
    const hasCritical = record.violations.some(v => v.severity === 'critical');
    if (hasCritical) return 'critical';

    const highCount = record.violations.filter(v => v.severity === 'high').length;
    if (highCount >= 2) return 'high';

    return 'medium';
  }

  private async getRiskLevel(address: string): Promise<string> {
    const { data } = await supabase
      .from('risk_assessments')
      .select('risk_level')
      .eq('address', address)
      .single();

    return data?.risk_level || 'unknown';
  }

  private async getPreviousActivity(address: string): Promise<string> {
    const { count } = await supabase
      .from('token_operations')
      .select('*', { count: 'exact', head: true })
      .eq('operator', address);

    return `${count || 0} previous operations`;
  }
}
