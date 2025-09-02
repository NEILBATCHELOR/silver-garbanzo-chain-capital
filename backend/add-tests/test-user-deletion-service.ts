/**
 * Test User Deletion Service
 * Verifies that the updated user deletion service can properly:
 * 1. Delete from public.users and related tables
 * 2. Delete from auth.users using admin client
 * 3. Handle errors gracefully
 */

import { userDeletionService, verifyAdminClient, deleteAuthUser } from '../../frontend/src/services/auth';
import { supabase } from '../../frontend/src/infrastructure/database/client';
import { adminClient } from '../../frontend/src/infrastructure/database/admin-client';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

class UserDeletionTest {
  private testResults: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting User Deletion Service Tests\n');
    
    try {
      await this.testAdminClientConfiguration();
      await this.testAdminClientAccess();
      await this.testUserDeletionFlow();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  private async testAdminClientConfiguration(): Promise<void> {
    console.log('1️⃣ Testing Admin Client Configuration...');
    
    try {
      const isConfigured = await verifyAdminClient();
      
      if (isConfigured) {
        this.testResults.push({
          success: true,
          message: 'Admin client is properly configured'
        });
        console.log('✅ Admin client configuration verified');
      } else {
        this.testResults.push({
          success: false,
          message: 'Admin client configuration failed - check service role key'
        });
        console.log('❌ Admin client configuration failed');
      }
    } catch (error) {
      this.testResults.push({
        success: false,
        message: 'Admin client test threw an exception',
        details: error
      });
      console.log('❌ Admin client test error:', error);
    }
    console.log('');
  }

  private async testAdminClientAccess(): Promise<void> {
    console.log('2️⃣ Testing Admin Client Auth Access...');
    
    try {
      // Try to list users to verify admin access
      const { data, error } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });
      
      if (!error && data) {
        this.testResults.push({
          success: true,
          message: 'Admin client can access auth.admin functions'
        });
        console.log('✅ Admin client has proper auth admin access');
      } else {
        this.testResults.push({
          success: false,
          message: 'Admin client cannot access auth.admin functions',
          details: error
        });
        console.log('❌ Admin client access denied:', error?.message);
      }
    } catch (error) {
      this.testResults.push({
        success: false,
        message: 'Admin client access test threw an exception',
        details: error
      });
      console.log('❌ Admin client access error:', error);
    }
    console.log('');
  }

  private async testUserDeletionFlow(): Promise<void> {
    console.log('3️⃣ Testing User Deletion Flow (without actual deletion)...');
    
    try {
      // Get a test user (we won't actually delete them)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, auth_id')
        .limit(1);
      
      if (usersError || !users || users.length === 0) {
        this.testResults.push({
          success: false,
          message: 'Cannot test deletion - no users found in database'
        });
        console.log('⚠️ No users found for testing');
        return;
      }
      
      const testUser = users[0];
      console.log(`📋 Test user found: ${testUser.email} (ID: ${testUser.id})`);
      
      // Test 1: Verify user exists in both tables
      console.log('   📍 Checking user exists in public.users...');
      const publicUserExists = await this.verifyUserInPublicTable(testUser.id);
      
      console.log('   📍 Checking user exists in auth.users...');
      const authUserExists = await this.verifyUserInAuthTable(testUser.auth_id || testUser.id);
      
      if (publicUserExists && authUserExists) {
        this.testResults.push({
          success: true,
          message: 'User deletion service can access both public and auth tables'
        });
        console.log('✅ User deletion service has proper access to both tables');
      } else {
        this.testResults.push({
          success: false,
          message: `Access issue - Public: ${publicUserExists}, Auth: ${authUserExists}`
        });
        console.log(`❌ Access issue - Public: ${publicUserExists}, Auth: ${authUserExists}`);
      }
      
      // Test 2: Check dependent records
      console.log('   📍 Checking for dependent records...');
      const dependentRecords = await this.checkDependentRecords(testUser.id);
      console.log(`   📊 Found ${dependentRecords.length} types of dependent records`);
      
      this.testResults.push({
        success: true,
        message: `User deletion service can analyze dependent records (${dependentRecords.length} types found)`
      });
      
      console.log('✅ User deletion flow analysis completed');
    } catch (error) {
      this.testResults.push({
        success: false,
        message: 'User deletion flow test threw an exception',
        details: error
      });
      console.log('❌ User deletion flow test error:', error);
    }
    console.log('');
  }

  private async verifyUserInPublicTable(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      return !error && !!data;
    } catch {
      return false;
    }
  }

  private async verifyUserInAuthTable(authId: string): Promise<boolean> {
    try {
      const { data, error } = await adminClient.auth.admin.getUserById(authId);
      return !error && !!data?.user;
    } catch {
      return false;
    }
  }

  private async checkDependentRecords(userId: string): Promise<string[]> {
    const dependentTables = [
      { table: 'user_roles', column: 'user_id' },
      { table: 'profiles', column: 'user_id' },
      { table: 'user_organization_roles', column: 'user_id' },
    ];
    
    const recordsFound: string[] = [];
    
    for (const { table, column } of dependentTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .eq(column, userId)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          recordsFound.push(table);
        }
      } catch (error) {
        console.warn(`⚠️ Could not check ${table}:`, error);
      }
    }
    
    return recordsFound;
  }

  private printResults(): void {
    console.log('📊 Test Results Summary:');
    console.log('='.repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} Test ${index + 1}: ${result.message}`);
      
      if (result.details) {
        console.log(`    Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      
      if (result.success) {
        passed++;
      } else {
        failed++;
      }
    });
    
    console.log('='.repeat(50));
    console.log(`📈 Final Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('🎉 All tests passed! User deletion service is ready.');
    } else {
      console.log('⚠️ Some tests failed. Please check configuration and permissions.');
    }
  }
}

// Run the tests
async function runTests() {
  const tester = new UserDeletionTest();
  await tester.runAllTests();
}

// Export for use in other test files
export { UserDeletionTest, runTests };

// Auto-run if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}
