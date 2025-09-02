/**
 * Browser Console Test for Organization Update
 * 
 * Instructions:
 * 1. Open your browser and navigate to: http://localhost:5173/compliance/organization/2500d887-df60-4edd-abbd-c89e6ebf1580/edit
 * 2. Open the browser developer console (F12)
 * 3. Paste this code into the console and run it
 * 4. Check the output for any errors
 */

async function testOrganizationUpdateInBrowser() {
  console.log('🧪 Testing Organization Update in Browser...');
  
  try {
    // Import the supabase client from the global window if available
    const { supabase } = window;
    
    if (!supabase) {
      console.error('❌ Supabase client not found in window. Make sure you are on the app page.');
      return;
    }
    
    const organizationId = '2500d887-df60-4edd-abbd-c89e6ebf1580';
    
    console.log('✅ Found supabase client');
    
    // Test 1: Check authentication
    console.log('🔐 Step 1: Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    if (!user) {
      console.error('❌ No authenticated user found. Please log in first.');
      return;
    }
    
    console.log('✅ User authenticated:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // Test 2: Fetch the organization
    console.log('📄 Step 2: Fetching organization...');
    const { data: original, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching organization:', fetchError);
      return;
    }
    
    console.log('✅ Original organization:', {
      id: original.id,
      name: original.name,
      legal_name: original.legal_name,
      business_type: original.business_type,
      updated_at: original.updated_at
    });
    
    // Test 3: Try a simple update
    console.log('🔄 Step 3: Testing simple update...');
    
    const updateData = {
      legal_name: 'Global Ventures (Cayman Islands) Limited - BROWSER TEST ' + new Date().toISOString().slice(0, 19),
      updated_at: new Date().toISOString()
    };
    
    console.log('Update data:', updateData);
    
    const { data: updateResult, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Update error:', updateError);
      console.error('Error code:', updateError.code);
      console.error('Error message:', updateError.message);
      console.error('Error details:', updateError.details);
      
      // Check for specific error types
      if (updateError.code === 'PGRST301') {
        console.error('🔍 PGRST301: This is a permission/RLS policy error');
        console.error('💡 Suggestion: Check if user has permission to update organizations');
      }
      
      if (updateError.message?.includes('JWT')) {
        console.error('🔍 JWT error: Authentication token issue');
        console.error('💡 Suggestion: Try logging out and logging back in');
      }
      
      return;
    }
    
    console.log('✅ Update successful!', {
      id: updateResult.id,
      name: updateResult.name,
      legal_name: updateResult.legal_name,
      business_type: updateResult.business_type,
      updated_at: updateResult.updated_at
    });
    
    // Test 4: Test the organization service directly
    console.log('🔧 Step 4: Testing with OrganizationService...');
    
    // Try to access the organization service if it's available
    if (window.OrganizationService) {
      console.log('✅ Found OrganizationService in window');
      
      try {
        const serviceResult = await window.OrganizationService.updateOrganization(organizationId, {
          legalName: 'Global Ventures (Cayman Islands) Limited - SERVICE TEST ' + new Date().toISOString().slice(0, 19)
        });
        
        console.log('✅ OrganizationService update successful:', serviceResult);
      } catch (serviceError) {
        console.error('❌ OrganizationService update failed:', serviceError);
      }
    } else {
      console.log('⚠️ OrganizationService not found in window');
    }
    
    console.log('🎉 Browser test completed!');
    
  } catch (error) {
    console.error('💥 Browser test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

// Make the function available globally for easy testing
window.testOrganizationUpdate = testOrganizationUpdateInBrowser;

console.log('📋 Test function loaded! Run: testOrganizationUpdate()');
