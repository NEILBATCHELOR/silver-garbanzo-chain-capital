/**
 * Test Service for Universal Database Service
 * 
 * This service demonstrates how to use the Universal Database Service
 * to automatically log all database operations to audit_logs.
 */

import { universalDatabaseService } from './UniversalDatabaseService';

export interface TestRecord {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export class TestDatabaseService {
  /**
   * Test creating a record (will automatically log to audit_logs)
   */
  async createTestRecord(
    name: string, 
    description: string = 'Test record', 
    userId?: string
  ): Promise<TestRecord> {
    return universalDatabaseService.create<TestRecord>('users', {
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@test.com`,
      role: 'user',
      status: 'active',
      description
    } as any, { userId });
  }

  /**
   * Test updating a record (will automatically log to audit_logs)
   */
  async updateTestRecord(
    id: string, 
    updates: Partial<TestRecord>, 
    userId?: string
  ): Promise<TestRecord> {
    return universalDatabaseService.update<TestRecord>('users', id, updates, { userId });
  }

  /**
   * Test deleting a record (will automatically log to audit_logs)
   */
  async deleteTestRecord(id: string, userId?: string): Promise<void> {
    return universalDatabaseService.delete('users', id, { userId });
  }

  /**
   * Test the audit logging system
   */
  async testAuditLogging(userId: string = 'test-user'): Promise<{
    created: TestRecord;
    updated: TestRecord;
    auditCount: number;
  }> {
    console.log('🧪 Testing Universal Database Service with automatic audit logging...');

    // Count existing audit logs
    const initialAuditCount = await universalDatabaseService.count('audit_logs');
    console.log(`📊 Initial audit log count: ${initialAuditCount}`);

    // Create a test record
    console.log('📝 Creating test record...');
    const created = await this.createTestRecord(
      'Test User ' + Date.now(),
      'Created by audit logging test',
      userId
    );
    console.log('✅ Created record:', created.id);

    // Update the test record
    console.log('📝 Updating test record...');
    const updated = await this.updateTestRecord(
      created.id!,
      { 
        description: 'Updated by audit logging test',
        status: 'inactive' as const
      },
      userId
    );
    console.log('✅ Updated record:', updated.id);

    // Check audit logs after operations
    const finalAuditCount = await universalDatabaseService.count('audit_logs');
    console.log(`📊 Final audit log count: ${finalAuditCount}`);
    console.log(`📈 New audit logs created: ${finalAuditCount - initialAuditCount}`);

    // Clean up - delete the test record
    console.log('🧹 Cleaning up test record...');
    await this.deleteTestRecord(created.id!, userId);
    console.log('✅ Deleted test record');

    // Final audit count
    const cleanupAuditCount = await universalDatabaseService.count('audit_logs');
    console.log(`📊 Audit logs after cleanup: ${cleanupAuditCount}`);
    console.log(`🎯 Total audit logs created during test: ${cleanupAuditCount - initialAuditCount}`);

    return {
      created,
      updated,
      auditCount: cleanupAuditCount - initialAuditCount
    };
  }

  /**
   * Get recent audit logs for verification
   */
  async getRecentAuditLogs(limit: number = 10): Promise<any[]> {
    return universalDatabaseService.findMany('audit_logs', {}, {
      limit,
      orderBy: 'timestamp',
      ascending: false
    });
  }

  /**
   * Simple test that verifies audit logging is working
   */
  async quickAuditTest(): Promise<boolean> {
    try {
      const beforeCount = await universalDatabaseService.count('audit_logs');
      
      // Perform a simple operation that should create audit log
      await universalDatabaseService.create('users', {
        email: `audit-test-${Date.now()}@test.com`,
        role: 'user'
      }, { 
        userId: 'audit-test-system',
        skipAudit: false // Explicitly enable audit
      });

      // Check if audit log was created
      const afterCount = await universalDatabaseService.count('audit_logs');
      const auditLogCreated = afterCount > beforeCount;

      console.log(`🔍 Quick audit test: ${auditLogCreated ? 'PASSED' : 'FAILED'}`);
      console.log(`📊 Audit logs before: ${beforeCount}, after: ${afterCount}`);

      return auditLogCreated;
    } catch (error) {
      console.error('❌ Quick audit test failed:', error);
      return false;
    }
  }
}

export const testDatabaseService = new TestDatabaseService();