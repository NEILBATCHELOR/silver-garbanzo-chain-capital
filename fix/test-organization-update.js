/**
 * Test Organization Update Functionality
 * Testing the CRUD update operations for organizations
 */

// Simple test to check organization update
async function testOrganizationUpdate() {
  console.log('🧪 Testing Organization Update Functionality...');
  
  const organizationId = '2500d887-df60-4edd-abbd-c89e6ebf1580';
  
  // Test data for update
  const updateData = {
    legal_name: 'Global Ventures (Cayman Islands) Limited - TEST UPDATED',
    business_type: 'Updated Investment Holding Company',
    updated_at: new Date().toISOString()
  };
  
  console.log('Testing organization ID:', organizationId);
  console.log('Update data:', updateData);
  
  try {
    // Import Supabase client (using dynamic import for Node.js compatibility)
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = 'https://jrwfkxfzsnnjppogthaw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyd2ZreGZ6c25uanBwb2d0aGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjA1MjAsImV4cCI6MjA1NjMzNjUyMH0.KN_T8V314VlXMLfV7ul0NSeOYW0cDVU5UESGfYQMtek';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase client created successfully');
    
    // First, try to fetch the organization
    console.log('📄 Fetching organization...');
    const { data: fetchData, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching organization:', fetchError);
      return;
    }
    
    console.log('✅ Organization fetched successfully:', {
      id: fetchData.id,
      name: fetchData.name,
      legal_name: fetchData.legal_name,
      updated_at: fetchData.updated_at
    });
    
    // Now try to update the organization
    console.log('🔄 Attempting to update organization...');
    const { data: updateResult, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating organization:', updateError);
      console.error('Error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      return;
    }
    
    console.log('✅ Organization updated successfully:', {
      id: updateResult.id,
      name: updateResult.name,
      legal_name: updateResult.legal_name,
      business_type: updateResult.business_type,
      updated_at: updateResult.updated_at
    });
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed with exception:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testOrganizationUpdate();