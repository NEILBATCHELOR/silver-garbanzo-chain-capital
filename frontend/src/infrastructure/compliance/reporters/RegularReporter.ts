/**
 * RegularReporter.ts
 * Generates standard compliance reports
 */

import type { ComplianceRecord } from '../ComplianceTracker';

export interface RegularReportConfig {
  format?: 'json' | 'html' | 'pdf' | 'csv';
  includeDetails?: boolean;
  includeTrends?: boolean;
  includeRecommendations?: boolean;
}

export class RegularReporter {
  private config: RegularReportConfig;

  constructor(config: RegularReportConfig = {}) {
    this.config = {
      format: config.format ?? 'json',
      includeDetails: config.includeDetails ?? true,
      includeTrends: config.includeTrends ?? true,
      includeRecommendations: config.includeRecommendations ?? true,
      ...config
    };
  }

  /**
   * Generate regular report
   */
  async generateReport(record: ComplianceRecord): Promise<any> {
    switch (this.config.format) {
      case 'json':
        return this.generateJSONReport(record);
      case 'html':
        return this.generateHTMLReport(record);
      case 'pdf':
        return this.generatePDFReport(record);
      case 'csv':
        return this.generateCSVReport(record);
      default:
        return this.generateJSONReport(record);
    }
  }

  /**
   * Generate JSON report
   */
  private generateJSONReport(record: ComplianceRecord): any {
    const report: any = {
      summary: {
        operationId: record.operationId,
        timestamp: record.timestamp,
        operationType: record.operationType,
        operator: record.operator,
        complianceStatus: record.complianceStatus
      },
      violations: record.violations,
      auditTrail: this.config.includeDetails ? record.auditTrail : undefined,
      regulatoryFlags: record.regulatoryFlags,
      reportingRequired: record.reportingRequired,
      metadata: {
        generatedAt: new Date().toISOString(),
        reportType: 'regular',
        format: 'json'
      }
    };

    if (this.config.includeRecommendations) {
      report.recommendations = this.generateRecommendations(record);
    }

    return report;
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(record: ComplianceRecord): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Compliance Report - ${record.operationId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f0f0f0; padding: 10px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .violation { background: #ffe0e0; padding: 10px; margin: 5px 0; }
    .compliant { color: green; }
    .non-compliant { color: red; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Compliance Report</h1>
    <p>Operation ID: ${record.operationId}</p>
    <p>Generated: ${new Date().toISOString()}</p>
  </div>
  
  <div class="section">
    <h2>Summary</h2>
    <table>
      <tr><td>Operation Type</td><td>${record.operationType}</td></tr>
      <tr><td>Operator</td><td>${record.operator}</td></tr>
      <tr><td>Timestamp</td><td>${record.timestamp}</td></tr>
      <tr><td>Compliance Status</td><td class="${record.complianceStatus.compliant ? 'compliant' : 'non-compliant'}">
        ${record.complianceStatus.level} (Score: ${record.complianceStatus.score.toFixed(2)})
      </td></tr>
    </table>
  </div>
  
  ${this.generateViolationsHTML(record.violations)}
  ${this.generateRegulatoryHTML(record.regulatoryFlags)}
  ${this.config.includeRecommendations ? this.generateRecommendationsHTML(record) : ''}
  
</body>
</html>`;
    return html;
  }

  /**
   * Generate violations HTML section
   */
  private generateViolationsHTML(violations: any[]): string {
    if (violations.length === 0) {
      return '<div class="section"><h2>Violations</h2><p>No violations detected</p></div>';
    }

    const violationsHTML = violations.map(v => `
      <div class="violation">
        <strong>${v.type}</strong> (${v.severity})
        <p>${v.description}</p>
        ${v.remediation ? `<p>Remediation: ${v.remediation}</p>` : ''}
      </div>
    `).join('');

    return `
      <div class="section">
        <h2>Violations (${violations.length})</h2>
        ${violationsHTML}
      </div>
    `;
  }

  /**
   * Generate regulatory HTML section
   */
  private generateRegulatoryHTML(flags: any[]): string {
    const flagsHTML = flags.map(f => `
      <tr>
        <td>${f.regulation}</td>
        <td>${f.requirement}</td>
        <td class="${f.status === 'met' ? 'compliant' : 'non-compliant'}">${f.status}</td>
      </tr>
    `).join('');

    return `
      <div class="section">
        <h2>Regulatory Compliance</h2>
        <table>
          <tr><th>Regulation</th><th>Requirement</th><th>Status</th></tr>
          ${flagsHTML}
        </table>
      </div>
    `;
  }

  /**
   * Generate recommendations HTML section
   */
  private generateRecommendationsHTML(record: ComplianceRecord): string {
    const recommendations = this.generateRecommendations(record);
    if (recommendations.length === 0) {
      return '';
    }

    const recsHTML = recommendations.map(r => `<li>${r}</li>`).join('');
    
    return `
      <div class="section">
        <h2>Recommendations</h2>
        <ul>${recsHTML}</ul>
      </div>
    `;
  }

  /**
   * Generate PDF report (placeholder - would need PDF library)
   */
  private generatePDFReport(record: ComplianceRecord): any {
    // TODO: Implement PDF generation using a library like jsPDF
    console.log('PDF generation not yet implemented');
    return this.generateJSONReport(record);
  }

  /**
   * Generate CSV report
   */
  private generateCSVReport(record: ComplianceRecord): string {
    const rows: string[] = [];
    
    // Headers
    rows.push('Field,Value');
    
    // Summary
    rows.push(`Operation ID,${record.operationId}`);
    rows.push(`Timestamp,${record.timestamp}`);
    rows.push(`Operation Type,${record.operationType}`);
    rows.push(`Operator,${record.operator}`);
    rows.push(`Compliance Status,${record.complianceStatus.level}`);
    rows.push(`Compliance Score,${record.complianceStatus.score}`);
    rows.push(`Violations Count,${record.violations.length}`);
    
    // Violations
    if (record.violations.length > 0) {
      rows.push('');
      rows.push('Violation Type,Severity,Description');
      for (const violation of record.violations) {
        rows.push(`${violation.type},${violation.severity},"${violation.description}"`);
      }
    }
    
    return rows.join('\n');
  }

  /**
   * Generate recommendations based on record
   */
  private generateRecommendations(record: ComplianceRecord): string[] {
    const recommendations: string[] = [];

    // Based on compliance score
    if (record.complianceStatus.score < 0.5) {
      recommendations.push('Immediate review required - compliance score below 50%');
      recommendations.push('Consider suspending operations until issues are resolved');
    } else if (record.complianceStatus.score < 0.8) {
      recommendations.push('Implement additional controls to improve compliance');
    }

    // Based on violations
    const criticalViolations = record.violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      recommendations.push('Address critical violations immediately');
      recommendations.push('Escalate to compliance team for review');
    }

    // Based on regulatory flags
    const failedFlags = record.regulatoryFlags.filter(f => f.status === 'failed');
    if (failedFlags.length > 0) {
      recommendations.push(`Ensure compliance with: ${failedFlags.map(f => f.regulation).join(', ')}`);
    }

    return recommendations;
  }
}
