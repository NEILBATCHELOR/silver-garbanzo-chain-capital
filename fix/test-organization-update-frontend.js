/**
 * Organization Update Test
 * Tests the organization service update functionality from frontend
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function testOrganizationUpdate() {
  console.log('🧪 Testing Organization Update from Frontend Service...');
  
  try {
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = 'https://jrwfkxfzsnnjppogthaw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyd2ZreGZ6c25uanBwb2d0aGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjA1MjAsImV4cCI6MjA1NjMzNjUyMH0.KN_T8V314VlXMLfV7ul0NSeOYW0cDVU5UESGfYQMtek';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const organizationId = '2500d887-df60-4edd-abbd-c89e6ebf1580';
    
    console.log('✅ Supabase client created');
    
    // Test 1: Fetch the organization first
    console.log('📄 Step 1: Fetching organization...');
    const { data: original, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching organization:', fetchError);
      return;
    }
    
    console.log('✅ Original organization data:', {
      id: original.id,
      name: original.name,
      legal_name: original.legal_name,
      business_type: original.business_type,
      updated_at: original.updated_at
    });
    
    // Test 2: Try the update with exact same structure as the service
    console.log('🔄 Step 2: Testing update using same pattern as organizationService...');
    
    const updateData = {
      legal_name: 'Global Ventures (Cayman Islands) Limited - TEST UPDATE ' + new Date().toISOString().slice(0, 19),
      business_type: 'Updated Investment Holding Company',
      updated_at: new Date().toISOString()
    };
    
    console.log('Update data to be sent:', updateData);
    
    const { data: updateResult, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Update failed with error:', updateError);
      console.error('Error code:', updateError.code);
      console.error('Error message:', updateError.message);
      console.error('Error details:', updateError.details);
      console.error('Error hint:', updateError.hint);
      
      // Check for common issues
      if (updateError.code === 'PGRST116') {
        console.error('🔍 This error suggests no rows were returned - check if the ID exists');
      }
      if (updateError.code === 'PGRST301') {
        console.error('🔍 This error suggests a permission issue - check RLS policies');
      }
      if (updateError.message?.includes('permission denied')) {
        console.error('🔍 Permission denied - check user authentication and RLS policies');
      }
      return;
    }
    
    console.log('✅ Update successful! Updated data:', {
      id: updateResult.id,
      name: updateResult.name,
      legal_name: updateResult.legal_name,
      business_type: updateResult.business_type,
      updated_at: updateResult.updated_at
    });
    
    // Test 3: Verify the update by fetching again
    console.log('🔍 Step 3: Verifying update by fetching again...');
    const { data: updated, error: verifyError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }
    
    console.log('✅ Verification successful! Current data:', {
      id: updated.id,
      name: updated.name,
      legal_name: updated.legal_name,
      business_type: updated.business_type,
      updated_at: updated.updated_at
    });
    
    // Test 4: Check if the update actually changed
    if (updated.legal_name !== original.legal_name) {
      console.log('🎉 SUCCESS: Update was applied successfully!');
      console.log(`Changed from: "${original.legal_name}"`);
      console.log(`Changed to: "${updated.legal_name}"`);
    } else {
      console.log('⚠️ WARNING: Update may not have been applied (no change detected)');
    }
    
    // Test 5: Test authentication status
    console.log('🔐 Step 4: Checking authentication status...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
    } else if (user) {
      console.log('✅ User is authenticated:', {
        id: user.id,
        email: user.email,
        role: user.role
      });
    } else {
      console.log('⚠️ No authenticated user - this might be the issue!');
      console.log('💡 The frontend needs a logged-in user to perform updates');
    }
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed with exception:', error);
    console.error('Error details:', error.stack);
  }
}

// Run the test
testOrganizationUpdate().catch(console.error);