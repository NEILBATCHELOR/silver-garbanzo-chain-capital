/**
 * Organization Detail Page Fix
 * Enhanced handleSave method with comprehensive error handling and debugging
 * August 11, 2025
 */

// Enhanced handleSave method for OrganizationDetailPage.tsx
// Replace the existing handleSave method with this enhanced version

const handleSave = async () => {
  if (!organizationId || !editedOrganization) {
    console.error('Missing organizationId or editedOrganization data');
    toast({
      title: 'Error',
      description: 'Missing required data for update.',
      variant: 'destructive',
    });
    return;
  }

  try {
    setSaving(true);
    console.log('🔄 Starting organization update...', {
      organizationId,
      editedData: editedOrganization
    });
    
    // Enhanced field mapping with validation
    const updateData = {
      ...editedOrganization,
      // Ensure proper field mapping
      jurisdiction: editedOrganization.countryJurisdiction || editedOrganization.jurisdiction,
      complianceStatus: editedOrganization.regulatoryStatus || editedOrganization.complianceStatus,
      // Handle legal representatives properly
      legalRepresentatives: editedOrganization.externalTrustees 
        ? [{ name: editedOrganization.externalTrustees, role: 'External Representative' }]
        : editedOrganization.legalRepresentatives,
      // Ensure required fields are present
      name: editedOrganization.name || organization?.name,
      legalName: editedOrganization.legalName || editedOrganization.legal_name,
      businessType: editedOrganization.businessType || editedOrganization.business_type,
      // Add timestamp
      updated_at: new Date().toISOString()
    };

    console.log('📋 Mapped update data:', updateData);

    // Validate required fields
    if (!updateData.name) {
      throw new Error('Organization name is required');
    }

    // Try the update with enhanced error handling
    let updated;
    try {
      updated = await OrganizationService.updateOrganization(organizationId, updateData);
      console.log('✅ OrganizationService.updateOrganization successful:', updated);
    } catch (serviceError) {
      console.error('❌ OrganizationService.updateOrganization failed:', serviceError);
      
      // Fallback to direct Supabase call
      console.log('🔄 Attempting direct Supabase update as fallback...');
      
      // Import supabase client for direct call
      const { supabase } = await import('@/infrastructure/database/client');
      
      const { data: fallbackResult, error: fallbackError } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organizationId)
        .select()
        .single();
      
      if (fallbackError) {
        console.error('❌ Direct Supabase update also failed:', fallbackError);
        throw new Error(`Update failed: ${fallbackError.message} (Code: ${fallbackError.code})`);
      }
      
      updated = fallbackResult;
      console.log('✅ Direct Supabase update successful:', updated);
    }

    // Update local state
    setOrganization(prev => prev ? { ...prev, ...updated } : null);
    setIsEditing(false);
    
    console.log('🎉 Organization update completed successfully');
    
    toast({
      title: 'Success',
      description: 'Organization updated successfully.',
    });

    // Optional: Reload the organization data to ensure UI is in sync
    setTimeout(() => {
      loadOrganization();
    }, 1000);

  } catch (error) {
    console.error('💥 Organization update failed:', error);
    
    // Enhanced error message based on error type
    let errorMessage = 'Failed to save organization changes.';
    
    if (error.message?.includes('PGRST301')) {
      errorMessage = 'Permission denied. You may not have the required permissions to update this organization.';
    } else if (error.message?.includes('PGRST116')) {
      errorMessage = 'Organization not found. It may have been deleted.';
    } else if (error.message?.includes('JWT')) {
      errorMessage = 'Authentication expired. Please log out and log back in.';
    } else if (error.message?.includes('network')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
  } finally {
    setSaving(false);
  }
};

// Additional debug helper method
const debugOrganizationState = () => {
  console.log('🔍 DEBUG: Organization state:', {
    organizationId,
    organization,
    editedOrganization,
    isEditing,
    saving
  });
};

// Make debug function available in console
if (typeof window !== 'undefined') {
  window.debugOrganizationState = debugOrganizationState;
}