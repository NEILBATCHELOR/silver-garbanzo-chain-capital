/**
 * AuditLogger.ts
 * Comprehensive audit logging for all operations
 */

import { supabase } from '@/infrastructure/database/client';
import { generateUUID } from '@/utils/shared/formatting/uuidUtils';
import type { ComplianceRecord } from './ComplianceTracker';
import * as crypto from 'crypto';

export interface AuditLoggerConfig {
  encryptionEnabled?: boolean;
  encryptionKey?: string;
  useBlockchainAudit?: boolean;
  storageConfig?: any;
}

export interface AuditRecord {
  id: string;
  operation_id: string;
  operation_type: string;
  operator: string;
  compliance_status: any;
  violations: any[];
  audit_trail: any;
  regulatory_flags: any[];
  reporting_required: boolean;
  integrity_hash: string;
  created_at: string;
}

export interface AuditQueryFilters {
  operationId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  complianceStatus?: string;
  operator?: string;
}
export class AuditLogger {
  private config: AuditLoggerConfig;
  private encryptionKey?: Buffer;

  constructor(config: AuditLoggerConfig = {}) {
    this.config = {
      encryptionEnabled: config.encryptionEnabled ?? false,
      useBlockchainAudit: config.useBlockchainAudit ?? false,
      ...config
    };

    if (this.config.encryptionEnabled && this.config.encryptionKey) {
      this.encryptionKey = Buffer.from(this.config.encryptionKey, 'hex');
    }
  }

  /**
   * Log compliance record to database
   */
  async log(record: ComplianceRecord): Promise<void> {
    try {
      // Encrypt sensitive data if enabled
      const auditTrail = this.config.encryptionEnabled
        ? await this.encrypt(record.auditTrail)
        : record.auditTrail;

      // Generate integrity hash
      const hash = this.generateHash(record);

      // Store to database
      const { error } = await supabase
        .from('compliance_audit_logs')
        .insert({
          id: generateUUID(),
          operation_id: record.operationId,
          operation_type: record.operationType,
          operator: record.operator,          compliance_status: record.complianceStatus,
          violations: record.violations,
          audit_trail: auditTrail,
          regulatory_flags: record.regulatoryFlags,
          reporting_required: record.reportingRequired,
          integrity_hash: hash,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to log audit record: ${error.message}`);
      }

      // Store to blockchain if enabled
      if (this.config.useBlockchainAudit) {
        await this.storeToBlockchain(record, hash);
      }
    } catch (error: any) {
      console.error('Audit logging failed:', error);
      throw new Error(`Audit logging failed: ${error.message}`);
    }
  }

  /**
   * Query audit logs
   */
  async query(filters: AuditQueryFilters = {}): Promise<AuditRecord[]> {
    try {
      let query = supabase
        .from('compliance_audit_logs')
        .select('*');
      if (filters.operationId) {
        query = query.eq('operation_id', filters.operationId);
      }

      if (filters.operator) {
        query = query.eq('operator', filters.operator);
      }

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      if (filters.complianceStatus) {
        query = query.eq('compliance_status->level', filters.complianceStatus);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to query audit logs: ${error.message}`);
      }

      // Decrypt records if encryption is enabled
      if (this.config.encryptionEnabled && data) {
        return Promise.all(data.map(r => this.decryptRecord(r)));
      }

      return data || [];
    } catch (error: any) {
      console.error('Failed to query audit logs:', error);
      throw error;
    }
  }
  /**
   * Generate integrity hash
   */
  private generateHash(record: ComplianceRecord): string {
    const data = JSON.stringify({
      operationId: record.operationId,
      timestamp: record.timestamp,
      operationType: record.operationType,
      operator: record.operator,
      complianceStatus: record.complianceStatus,
      violations: record.violations
    });

    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Encrypt data
   */
  private async encrypt(data: any): Promise<any> {
    if (!this.encryptionKey) {
      return data;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
      
      const jsonStr = JSON.stringify(data);
      let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted: true,
        iv: iv.toString('hex'),
        data: encrypted
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      return data; // Return unencrypted on failure
    }
  }
  /**
   * Decrypt record
   */
  private async decryptRecord(record: AuditRecord): Promise<AuditRecord> {
    if (!this.encryptionKey || !record.audit_trail?.encrypted) {
      return record;
    }

    try {
      const iv = Buffer.from(record.audit_trail.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
      
      let decrypted = decipher.update(record.audit_trail.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return {
        ...record,
        audit_trail: JSON.parse(decrypted)
      };
    } catch (error) {
      console.error('Decryption failed:', error);
      return record; // Return encrypted version on failure
    }
  }

  /**
   * Store audit record to blockchain
   */
  private async storeToBlockchain(record: ComplianceRecord, hash: string): Promise<void> {
    // Implement blockchain storage
    // This would interact with a smart contract for immutable audit logging
    console.log('Storing to blockchain:', {
      operationId: record.operationId,
      hash
    });
    
    // TODO: Implement actual blockchain storage
    // Example: await auditContract.storeRecord(record.operationId, hash);
  }

  /**
   * Verify integrity of a record
   */
  async verifyIntegrity(record: AuditRecord): Promise<boolean> {
    const calculatedHash = this.generateHash(record as any);
    return calculatedHash === record.integrity_hash;
  }
}