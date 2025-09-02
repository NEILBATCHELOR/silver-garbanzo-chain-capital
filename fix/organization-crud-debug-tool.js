/**
 * Organization CRUD Update Issue Fix
 * August 11, 2025
 * 
 * COMPREHENSIVE SOLUTION for organization edit functionality not working
 */

// Step 1: Browser Console Debug Tool
// Paste this into browser console on the organization edit page

window.debugOrganizationUpdate = async function() {
  console.log('🔧 ORGANIZATION UPDATE DEBUG TOOL - Starting comprehensive diagnosis...');
  
  try {
    // Check 1: Supabase Client
    console.log('📋 Check 1: Supabase Client');
    if (!window.supabase) {
      console.error('❌ CRITICAL: Supabase client not found in window object');
      console.log('💡 FIX: Make sure you are on the correct page and logged in');
      return;
    }
    console.log('✅ Supabase client found');
    
    // Check 2: Authentication
    console.log('📋 Check 2: Authentication Status');
    const { data: { user }, error: authError } = await window.supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ AUTH ERROR:', authError);
      return;
    }
    
    if (!user) {
      console.error('❌ CRITICAL: No authenticated user');
      console.log('💡 FIX: Please log in first');
      return;
    }
    
    console.log('✅ User authenticated:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });
    
    // Check 3: Organization Fetch
    console.log('📋 Check 3: Organization Data Access');
    const orgId = '2500d887-df60-4edd-abbd-c89e6ebf1580';
    
    const { data: orgData, error: fetchError } = await window.supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    
    if (fetchError) {
      console.error('❌ FETCH ERROR:', fetchError);
      return;
    }
    
    console.log('✅ Organization fetched successfully:', {
      id: orgData.id,
      name: orgData.name,
      legal_name: orgData.legal_name,
      business_type: orgData.business_type
    });
    
    // Check 4: Update Test
    console.log('📋 Check 4: Update Operation Test');
    const timestamp = new Date().toISOString().slice(0, 19);
    
    const updateData = {
      legal_name: `Global Ventures (Cayman Islands) Limited - DEBUG TEST ${timestamp}`,
      updated_at: new Date().toISOString()
    };
    
    console.log('Attempting update with data:', updateData);
    
    const { data: updateResult, error: updateError } = await window.supabase
      .from('organizations')
      .update(updateData)
      .eq('id', orgId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ UPDATE ERROR:', updateError);
      console.error('Error Code:', updateError.code);
      console.error('Error Message:', updateError.message);
      console.error('Error Details:', updateError.details);
      
      // Specific error diagnosis
      if (updateError.code === 'PGRST301') {
        console.error('🔍 DIAGNOSIS: Permission/RLS policy error');
        console.log('💡 FIX: Check database RLS policies for organizations table');
      } else if (updateError.message?.includes('JWT')) {
        console.error('🔍 DIAGNOSIS: Authentication token issue');
        console.log('💡 FIX: Try logging out and back in');
      } else if (updateError.code === 'PGRST116') {
        console.error('🔍 DIAGNOSIS: No rows returned (ID might not exist)');
        console.log('💡 FIX: Check if organization ID is correct');
      }
      return;
    }
    
    console.log('✅ UPDATE SUCCESSFUL!', {
      id: updateResult.id,
      name: updateResult.name,
      legal_name: updateResult.legal_name,
      updated_at: updateResult.updated_at
    });
    
    // Check 5: Service Integration Test
    console.log('📋 Check 5: Organization Service Integration');
    
    // Try to import and test the organization service
    try {
      // Check if React components are available
      if (window.React) {
        console.log('✅ React environment detected');
        
        // Try to access organization service via module
        const serviceTest = {
          name: orgData.name,
          legalName: `${orgData.legal_name} - SERVICE TEST ${timestamp}`,
          businessType: orgData.business_type
        };
        
        console.log('Testing service-style update:', serviceTest);
        
        // Direct service call simulation
        const { data: serviceResult, error: serviceError } = await window.supabase
          .from('organizations')
          .update({
            legal_name: serviceTest.legalName,
            updated_at: new Date().toISOString()
          })
          .eq('id', orgId)
          .select()
          .single();
        
        if (serviceError) {
          console.error('❌ SERVICE STYLE UPDATE ERROR:', serviceError);
        } else {
          console.log('✅ SERVICE STYLE UPDATE SUCCESSFUL:', serviceResult);
        }
        
      } else {
        console.log('⚠️ React environment not detected');
      }
    } catch (serviceErr) {
      console.error('❌ Service integration error:', serviceErr);
    }
    
    console.log('🎉 DIAGNOSIS COMPLETE!');
    console.log('📊 RESULTS SUMMARY:');
    console.log('- Supabase client: ✅ Working');
    console.log('- Authentication: ✅ Working');
    console.log('- Data fetch: ✅ Working');
    console.log('- Direct update: ✅ Working');
    console.log('💡 If the debug test works but the page doesn\'t, the issue is in the React component form handling');
    
  } catch (error) {
    console.error('💥 DEBUG TOOL FAILED:', error);
    console.error('Stack trace:', error.stack);
  }
};

// Step 2: Quick Fix Function
window.quickFixOrganizationUpdate = async function(orgId, newLegalName) {
  console.log('🚀 Quick Fix: Updating organization...');
  
  try {
    const { data, error } = await window.supabase
      .from('organizations')
      .update({
        legal_name: newLegalName,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Quick fix failed:', error);
      return false;
    }
    
    console.log('✅ Quick fix successful:', data);
    return true;
  } catch (err) {
    console.error('💥 Quick fix exception:', err);
    return false;
  }
};

// Usage instructions
console.log('🛠️  ORGANIZATION UPDATE DEBUG TOOLS LOADED');
console.log('📋 Available functions:');
console.log('1. debugOrganizationUpdate() - Comprehensive diagnosis');
console.log('2. quickFixOrganizationUpdate(orgId, newName) - Quick test update');
console.log('');
console.log('💡 To run diagnosis: debugOrganizationUpdate()');
console.log('💡 To test quick update: quickFixOrganizationUpdate("2500d887-df60-4edd-abbd-c89e6ebf1580", "Test Name")');
