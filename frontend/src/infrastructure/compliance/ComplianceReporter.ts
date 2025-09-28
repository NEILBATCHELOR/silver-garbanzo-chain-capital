/**
 * ComplianceReporter.ts
 * Automated compliance reporting generation
 */

import { supabase } from '@/infrastructure/database/client';
import { generateUUID } from '@/utils/shared/formatting/uuidUtils';
import type { ComplianceRecord } from './ComplianceTracker';

export type ReportType = 'standard' | 'regulatory' | 'violation' | 'summary';
export type DistributionChannel = 'email' | 'webhook' | 'api' | 'storage';

export interface Report {
  id: string;
  type: ReportType;
  operationId: string;
  content: any;
  generatedAt: string;
  regulations: string[];
  distribution: DistributionStatus[];
}

export interface DistributionStatus {
  channel: DistributionChannel;
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
  error?: string;
}

export interface ReporterConfig {
  autoDistribute?: boolean;
  distributionChannels?: DistributionChannel[];
  formatters?: Map<ReportType, ReportFormatter>;
  webhookUrl?: string;
  emailRecipients?: string[];
}

export interface ReportFormatter {
  format(record: ComplianceRecord): Promise<any>;
}
export class ComplianceReporter {
  private config: ReporterConfig;
  private formatters: Map<ReportType, ReportFormatter>;

  constructor(config: ReporterConfig = {}) {
    this.config = {
      autoDistribute: config.autoDistribute ?? true,
      distributionChannels: config.distributionChannels ?? ['storage'],
      ...config
    };

    this.formatters = config.formatters || this.initializeDefaultFormatters();
  }

  /**
   * Generate compliance report
   */
  async generateReport(
    record: ComplianceRecord,
    type: ReportType = 'standard'
  ): Promise<Report> {
    try {
      const formatter = this.formatters.get(type);
      if (!formatter) {
        throw new Error(`Unknown report type: ${type}`);
      }

      // Generate report content
      const content = await formatter.format(record);

      // Create report object
      const report: Report = {
        id: generateUUID(),
        type,
        operationId: record.operationId,
        content,
        generatedAt: new Date().toISOString(),        regulations: record.regulatoryFlags.map(f => f.regulation),
        distribution: []
      };

      // Store report
      await this.storeReport(report);

      // Distribute if required
      if (this.config.autoDistribute && record.reportingRequired) {
        await this.distributeReport(report, record);
      }

      return report;
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Store report to database
   */
  private async storeReport(report: Report): Promise<void> {
    const { error } = await supabase
      .from('compliance_reports')
      .insert({
        id: report.id,
        report_id: report.id,
        operation_id: report.operationId,
        type: report.type,
        content: report.content,
        regulations: report.regulations,
        distribution: report.distribution,
        generated_at: report.generatedAt,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store report: ${error.message}`);
    }
  }
  /**
   * Distribute report through configured channels
   */
  private async distributeReport(
    report: Report,
    record: ComplianceRecord
  ): Promise<void> {
    const channels = this.determineDistribution(record);

    for (const channel of channels) {
      try {
        await this.distributeToChannel(channel, report);
        
        report.distribution.push({
          channel,
          status: 'sent',
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        report.distribution.push({
          channel,
          status: 'failed',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    }

    // Update report with distribution status
    await this.updateReportDistribution(report);
  }

  /**
   * Determine distribution channels based on record
   */
  private determineDistribution(record: ComplianceRecord): DistributionChannel[] {
    const channels: DistributionChannel[] = ['storage'];
    
    // Add webhook for critical violations
    if (record.violations.some(v => v.severity === 'critical')) {
      channels.push('webhook');
    }
    
    // Add email for regulatory failures
    if (record.regulatoryFlags.some(f => f.status === 'failed')) {
      channels.push('email');
    }
    
    return channels;
  }
  /**
   * Distribute to specific channel
   */
  private async distributeToChannel(
    channel: DistributionChannel,
    report: Report
  ): Promise<void> {
    switch (channel) {
      case 'webhook':
        if (this.config.webhookUrl) {
          await this.sendWebhook(report);
        }
        break;
      
      case 'email':
        if (this.config.emailRecipients?.length) {
          await this.sendEmail(report);
        }
        break;
      
      case 'api':
        await this.sendToAPI(report);
        break;
      
      case 'storage':
        // Already stored in database
        break;
      
      default:
        throw new Error(`Unknown distribution channel: ${channel}`);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(report: Report): Promise<void> {
    if (!this.config.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(report)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  }
  /**
   * Send email notification
   */
  private async sendEmail(report: Report): Promise<void> {
    // TODO: Implement email sending
    console.log('Sending email report to:', this.config.emailRecipients);
  }

  /**
   * Send to external API
   */
  private async sendToAPI(report: Report): Promise<void> {
    // TODO: Implement API integration
    console.log('Sending report to API');
  }

  /**
   * Update report distribution status
   */
  private async updateReportDistribution(report: Report): Promise<void> {
    const { error } = await supabase
      .from('compliance_reports')
      .update({ distribution: report.distribution })
      .eq('id', report.id);

    if (error) {
      console.error('Failed to update distribution status:', error);
    }
  }

  /**
   * Initialize default formatters
   */
  private initializeDefaultFormatters(): Map<ReportType, ReportFormatter> {
    const formatters = new Map<ReportType, ReportFormatter>();
    
    // Standard formatter
    formatters.set('standard', {
      format: async (record: ComplianceRecord) => ({
        operationId: record.operationId,
        timestamp: record.timestamp,
        operationType: record.operationType,
        operator: record.operator,
        complianceStatus: record.complianceStatus,
        violations: record.violations,
        auditTrail: record.auditTrail,
        regulatoryFlags: record.regulatoryFlags
      })
    });
    
    return formatters;
  }
}