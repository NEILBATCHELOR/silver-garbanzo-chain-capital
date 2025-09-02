/**
 * Enhanced Organization Detail Page
 * View and edit individual organization details with all onboarding fields
 * Updated: August 11, 2025 - Added missing fields from onboarding process
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building,
  ArrowLeft,
  Edit,
  Save,
  X,
  FileText,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  Clock,
  Eye,
  RefreshCw,
  Settings
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Services and Types
import OrganizationService, { type OrganizationWithDocuments } from './organizationService';
import type { Organization } from '@/types/core/centralModels';
import { SimplifiedDocumentManagement } from '@/components/compliance/operations/documents/components';
import { regionCountries } from '@/utils/compliance/countries';

interface OrganizationDetailPageProps {
  organizationId?: string;
}

const BUSINESS_TYPES = [
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust', label: 'Trust' },
  { value: 'foundation', label: 'Foundation' },
];

const ENTITY_STRUCTURES = [
  { value: 'single_entity', label: 'Single Entity' },
  { value: 'holding_company', label: 'Holding Company' },
  { value: 'subsidiary', label: 'Subsidiary' },
  { value: 'spv', label: 'Special Purpose Vehicle (SPV)' },
  { value: 'joint_venture', label: 'Joint Venture' },
];

const REGULATORY_STATUSES = [
  { value: 'regulated', label: 'Regulated' },
  { value: 'unregulated', label: 'Unregulated' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'pending_review', label: 'Pending Review' },
];

const ISSUER_TYPES = [
  { value: 'corporate', label: 'Corporate Issuer' },
  { value: 'government', label: 'Government/Municipal' },
  { value: 'fund', label: 'Investment Fund' },
  { value: 'spv', label: 'Special Purpose Vehicle' },
  { value: 'reit', label: 'Real Estate Investment Trust' },
];

const GOVERNANCE_MODELS = [
  { value: 'board', label: 'Board of Directors' },
  { value: 'manager_managed', label: 'Manager Managed' },
  { value: 'member_managed', label: 'Member Managed' },
  { value: 'trustee', label: 'Trustee' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const COMPLIANCE_STATUSES = [
  { value: 'compliant', label: 'Compliant' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'non_compliant', label: 'Non-Compliant' },
  { value: 'under_review', label: 'Under Review' },
];

const OrganizationDetailPage: React.FC<OrganizationDetailPageProps> = ({ organizationId: propId }) => {
  const { organizationId: paramId } = useParams();
  const organizationId = propId || paramId;
  const navigate = useNavigate();
  const { toast } = useToast();

  // State management
  const [organization, setOrganization] = useState<OrganizationWithDocuments | null>(null);
  const [editedOrganization, setEditedOrganization] = useState<Partial<Organization>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [countrySearchQuery, setCountrySearchQuery] = useState<string>('');

  // Filter regions and countries based on search query
  const filteredRegions = countrySearchQuery 
    ? regionCountries.map(region => ({
        ...region,
        countries: region.countries.filter(country => 
          country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()))
      })).filter(region => region.countries.length > 0)
    : regionCountries;

  useEffect(() => {
    if (organizationId) {
      loadOrganization();
    }
  }, [organizationId]);

  const loadOrganization = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const data = await OrganizationService.getOrganizationById(organizationId);
      if (data) {
        setOrganization(data);
        setEditedOrganization(data);
      } else {
        toast({
          title: 'Not Found',
          description: 'Organization not found.',
          variant: 'destructive',
        });
        navigate('/compliance/management');
      }
    } catch (error) {
      console.error('Failed to load organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
        // Only include basic fields that should be updated
        name: editedOrganization.name || organization?.name,
        legalName: editedOrganization.legalName || editedOrganization.name,
        businessType: editedOrganization.businessType,
        
        // Map special fields properly
        jurisdiction: editedOrganization.jurisdiction,
        complianceStatus: editedOrganization.complianceStatus,
        
        // Include other valid fields if they exist
        registrationNumber: editedOrganization.registrationNumber,
        taxId: editedOrganization.taxId,
        website: editedOrganization.website,
        contactEmail: editedOrganization.contactEmail,
        contactPhone: editedOrganization.contactPhone,
        status: editedOrganization.status,
        
        // Handle legal representatives
        legalRepresentatives: editedOrganization.legalRepresentatives
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
        
        // Use OrganizationService field mapping for direct call
        const mappedData = OrganizationService.mapFieldsToDatabase ? 
          OrganizationService.mapFieldsToDatabase(updateData) : 
          {
            name: updateData.name,
            legal_name: updateData.legalName,
            business_type: updateData.businessType,
            jurisdiction: updateData.jurisdiction,
            compliance_status: updateData.complianceStatus,
            registration_number: updateData.registrationNumber,
            tax_id: updateData.taxId,
            website: updateData.website,
            contact_email: updateData.contactEmail,
            contact_phone: updateData.contactPhone,
            status: updateData.status,
            legal_representatives: updateData.legalRepresentatives,
            updated_at: new Date().toISOString()
          };
        
        // Remove undefined values
        Object.keys(mappedData).forEach(key => {
          if (mappedData[key] === undefined) {
            delete mappedData[key];
          }
        });
        
        console.log('🔄 Direct Supabase call with mapped data:', mappedData);
        
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('organizations')
          .update(mappedData)
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

  const handleCancel = () => {
    if (organization) {
      setEditedOrganization(organization);
    }
    setIsEditing(false);
  };

  const handleChange = (field: string, value: any) => {
    setEditedOrganization(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDelete = async () => {
    if (!organizationId || !organization) return;

    try {
      await OrganizationService.deleteOrganization(organizationId);
      toast({
        title: 'Success',
        description: 'Organization deleted successfully.',
      });
      navigate('/compliance/management');
    } catch (error) {
      console.error('Failed to delete organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete organization.',
        variant: 'destructive',
      });
    }
  };

  // Debug helper function
  const debugOrganizationState = () => {
    console.log('🔍 DEBUG: Organization state:', {
      organizationId,
      organization,
      editedOrganization,
      isEditing,
      saving
    });
  };

  // Make debug function available in console during development
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).debugOrganizationState = debugOrganizationState;
    }
  }, [organizationId, organization, editedOrganization, isEditing, saving]);

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatBusinessType = (type: string | null | undefined) => {
    if (!type) return 'Unknown';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatSelectValue = (value: string | null | undefined, options: Array<{value: string, label: string}>) => {
    if (!value) return 'Not specified';
    const option = options.find(opt => opt.value === value);
    return option ? option.label : formatBusinessType(value);
  };

  const getCountryName = (countryId: string | null | undefined) => {
    if (!countryId) return 'Not specified';
    for (const region of regionCountries) {
      const country = region.countries.find(c => c.id === countryId);
      if (country) return country.name;
    }
    return countryId; // Return the ID if country not found
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading organization...</span>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Organization Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The organization you're looking for doesn't exist or may have been deleted.
          </p>
          <Button onClick={() => navigate('/compliance/management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/compliance/management')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building className="h-8 w-8" />
              {organization.name}
            </h1>
            <p className="text-muted-foreground">
              {organization.legalName && organization.legalName !== organization.name
                ? organization.legalName
                : formatBusinessType(organization.businessType)
              }
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadOrganization}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{organization.name}"? This action cannot be undone and will also delete all associated documents.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(organization.status)}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization.documents?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Organization Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        
        {/* Organization Details Tab */}
        <TabsContent value="details">
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  {isEditing ? 'Edit basic organization details' : 'View basic organization details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Organization Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={editedOrganization.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{organization.name}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="legalName">Legal Name</Label>
                    {isEditing ? (
                      <Input
                        id="legalName"
                        value={editedOrganization.legalName || ''}
                        onChange={(e) => handleChange('legalName', e.target.value)}
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{organization.legalName || 'Not specified'}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    {isEditing ? (
                      <Input
                        id="registrationNumber"
                        value={editedOrganization.registrationNumber || ''}
                        onChange={(e) => handleChange('registrationNumber', e.target.value)}
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{organization.registrationNumber || 'Not specified'}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="taxId">Tax ID</Label>
                    {isEditing ? (
                      <Input
                        id="taxId"
                        value={editedOrganization.taxId || ''}
                        onChange={(e) => handleChange('taxId', e.target.value)}
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{organization.taxId || 'Not specified'}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Structure & Type */}
            <Card>
              <CardHeader>
                <CardTitle>Legal Structure & Type</CardTitle>
                <CardDescription>
                  Organization structure and classification information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="businessType">Business Type</Label>
                    {isEditing ? (
                      <Select
                        value={editedOrganization.businessType || ''}
                        onValueChange={(value) => handleChange('businessType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{formatSelectValue(organization.businessType, BUSINESS_TYPES)}</div>
                    )}
                  </div>
                  
                  {/* TODO: Add entity_structure to Organization interface
                  <div>
                    <Label htmlFor="entity_structure">Entity Structure</Label>
                    {isEditing ? (
                      <Select
                        value={editedOrganization.entity_structure || ''}
                        onValueChange={(value) => handleChange('entity_structure', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity structure" />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTITY_STRUCTURES.map((structure) => (
                            <SelectItem key={structure.value} value={structure.value}>
                              {structure.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{formatSelectValue(organization.entity_structure, ENTITY_STRUCTURES)}</div>
                    )}
                  </div>
                  */}
                  
                  {/* TODO: Add issuer_type to Organization interface
                  <div>
                    <Label htmlFor="issuer_type">Issuer Type</Label>
                    {isEditing ? (
                      <Select
                        value={editedOrganization.issuer_type || ''}
                        onValueChange={(value) => handleChange('issuer_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select issuer type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ISSUER_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{formatSelectValue(organization.issuer_type, ISSUER_TYPES)}</div>
                    )}
                  </div>
                  */}
                  
                  {/* TODO: Add governance_model to Organization interface
                  <div>
                    <Label htmlFor="governance_model">Governance Model</Label>
                    {isEditing ? (
                      <Select
                        value={editedOrganization.governance_model || ''}
                        onValueChange={(value) => handleChange('governance_model', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select governance model" />
                        </SelectTrigger>
                        <SelectContent>
                          {GOVERNANCE_MODELS.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{formatSelectValue(organization.governance_model, GOVERNANCE_MODELS)}</div>
                    )}
                  </div>
                  */}
                </div>
              </CardContent>
            </Card>

            {/* Regulatory & Compliance */}
            <Card>
              <CardHeader>
                <CardTitle>Regulatory & Compliance</CardTitle>
                <CardDescription>
                  Regulatory status and compliance information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="complianceStatus">Regulatory Status</Label>
                    {isEditing ? (
                      <Select
                        value={editedOrganization.complianceStatus || ''}
                        onValueChange={(value) => handleChange('complianceStatus', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select regulatory status" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLIANCE_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">
                        {formatSelectValue(organization.complianceStatus, COMPLIANCE_STATUSES)}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="jurisdiction">Country of Registration</Label>
                    {isEditing ? (
                      <Select
                        value={editedOrganization.jurisdiction || ''}
                        onValueChange={(value) => handleChange('jurisdiction', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          <div className="p-2">
                            <Input
                              placeholder="Search countries..."
                              value={countrySearchQuery}
                              onChange={(e) => setCountrySearchQuery(e.target.value)}
                              className="mb-2"
                            />
                          </div>
                          {filteredRegions.map((region) => (
                            region.countries.length > 0 && (
                              <SelectGroup key={region.id}>
                                <SelectLabel>{region.name}</SelectLabel>
                                {region.countries.map((country) => (
                                  <SelectItem key={country.id} value={country.id}>
                                    {country.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">
                        {getCountryName(organization.jurisdiction)}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Current Status</Label>
                    {isEditing ? (
                      <Select
                        value={editedOrganization.status || ''}
                        onValueChange={(value) => handleChange('status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1">{getStatusBadge(organization.status)}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Organization contact details and representatives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    {isEditing ? (
                      <Input
                        id="contactEmail"
                        type="email"
                        value={editedOrganization.contactEmail || ''}
                        onChange={(e) => handleChange('contactEmail', e.target.value)}
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{organization.contactEmail || 'Not specified'}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    {isEditing ? (
                      <Input
                        id="contactPhone"
                        value={editedOrganization.contactPhone || ''}
                        onChange={(e) => handleChange('contactPhone', e.target.value)}
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{organization.contactPhone || 'Not specified'}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="website">Website</Label>
                    {isEditing ? (
                      <Input
                        id="website"
                        type="url"
                        value={editedOrganization.website || ''}
                        onChange={(e) => handleChange('website', e.target.value)}
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">
                        {organization.website ? (
                          <a 
                            href={organization.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {organization.website}
                          </a>
                        ) : (
                          'Not specified'
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="legalRepresentatives">External Trustees, Administrators, or Legal Representatives</Label>
                    {isEditing ? (
                      <Textarea
                        id="legalRepresentatives"
                        value={
                          typeof editedOrganization.legalRepresentatives === 'string' 
                            ? editedOrganization.legalRepresentatives 
                            : Array.isArray(editedOrganization.legalRepresentatives) 
                              ? editedOrganization.legalRepresentatives.map((rep: any) => rep.name || rep).join(', ')
                              : Array.isArray(organization.legalRepresentatives)
                                ? organization.legalRepresentatives.map((rep: any) => rep.name || rep).join(', ')
                                : ''
                        }
                        onChange={(e) => handleChange('legalRepresentatives', e.target.value)}
                        placeholder="List any external trustees, administrators, or legal representatives"
                        className="min-h-[80px]"
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded min-h-[80px]">
                        {Array.isArray(organization.legalRepresentatives) 
                          ? organization.legalRepresentatives.map((rep: any) => rep.name || rep).join(', ') || 'Not specified'
                          : 'Not specified'}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
              <CardDescription>
                Upload and manage documents for {organization.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimplifiedDocumentManagement
                mode="issuer"
                entityId={organization.id}
                entityName={organization.name}
                embedded={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationDetailPage;
