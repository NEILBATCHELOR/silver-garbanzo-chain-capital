/**
 * Enhanced Issuer Upload Page
 * 
 * Page component for uploading issuer/organization data and documents
 * using the enhanced compliance upload system
 * 
 * ENHANCED FEATURES:
 * - Shows existing organizations to prevent duplicates
 * - Allows selection of existing organizations for document addition
 * - Save-and-exit functionality for progressive completion
 * - Strict duplicate prevention
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ShieldOff, Search, Building, FileText, Calendar, CheckCircle, AlertCircle, Eye, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedComplianceUpload } from '../upload/enhanced';
import { OrganizationService, type OrganizationSummary } from '../management/organizationService';
import type { Organization } from '@/types/core/centralModels';

export interface EnhancedIssuerUploadPageProps {
  onComplete?: (uploadedIssuers: Organization[]) => void;
  redirectPath?: string;
}

export const EnhancedIssuerUploadPage: React.FC<EnhancedIssuerUploadPageProps> = ({
  onComplete,
  redirectPath = '/compliance/issuer'
}) => {
  const navigate = useNavigate();
  
  // Upload settings state
  const [enableValidation, setEnableValidation] = useState(false); // Default to validation OFF for easier uploads
  
  // Existing organizations state
  const [existingOrganizations, setExistingOrganizations] = useState<OrganizationSummary[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<OrganizationSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'existing' | 'upload'>('existing');

  // Load existing organizations on component mount
  useEffect(() => {
    loadExistingOrganizations();
  }, []);

  // Filter organizations based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredOrganizations(existingOrganizations);
    } else {
      const filtered = existingOrganizations.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.legal_name && org.legal_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredOrganizations(filtered);
    }
  }, [searchQuery, existingOrganizations]);

  const loadExistingOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const organizations = await OrganizationService.getOrganizations();
      setExistingOrganizations(organizations);
      setFilteredOrganizations(organizations);
    } catch (err) {
      console.error('Failed to load existing organizations:', err);
      setError('Failed to load existing organizations. You can still upload new data.');
      setExistingOrganizations([]);
      setFilteredOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = (uploadedEntities: (Organization)[], documents?: any[]) => {
    // Type guard to ensure we have organizations
    const issuers = uploadedEntities as Organization[];
    
    onComplete?.(issuers);
    
    // Refresh the existing organizations list
    loadExistingOrganizations();
    
    // Navigate back or to specified path
    navigate(redirectPath);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleViewOrganization = (organization: OrganizationSummary) => {
    // Navigate to organization detail page
    navigate(`/compliance/organization/${organization.id}`);
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };



  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Issuer Management & Upload</h1>
          <p className="text-muted-foreground">
            View existing organizations, upload new issuers, and manage documents
          </p>
        </div>
      </div>



      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'existing' | 'upload')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>Existing Organizations ({existingOrganizations.length})</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Upload New Data</span>
          </TabsTrigger>
        </TabsList>

        {/* Existing Organizations Tab */}
        <TabsContent value="existing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Previously Uploaded Organizations</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    Prevent Duplicates
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadExistingOrganizations}
                    disabled={isLoading}
                  >
                    Refresh
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                <strong>Important:</strong> Review existing organizations and add documents to prevent duplicates.
                Use the search below to check if your organization already exists.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="🔍 Search organizations by name to check for duplicates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Search Results Info */}
              {searchQuery && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {filteredOrganizations.length > 0 ? (
                      <span>
                        <strong>Found {filteredOrganizations.length} organizations</strong> matching "{searchQuery}". 
                        If your organization is listed below, please add documents to the existing entry instead of creating a duplicate.
                      </span>
                    ) : (
                      <span>
                        <strong>No organizations found</strong> matching "{searchQuery}". 
                        You can proceed to upload this as a new organization in the "Upload New Data" tab.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Error State */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Organizations</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading organizations...</div>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && filteredOrganizations.length === 0 && !searchQuery && (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No organizations uploaded yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This is your first organization upload. You can proceed to the "Upload New Data" tab.
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab('upload')}>
                    Start Upload
                  </Button>
                </div>
              )}

              {/* Organizations List */}
              {!isLoading && filteredOrganizations.length > 0 && (
                <div className="space-y-3">
                  {filteredOrganizations.map((org) => (
                    <Card key={org.id} className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg">{org.name}</h3>
                            <Badge className={getStatusColor(org.status)}>
                              {org.status || 'Unknown'}
                            </Badge>

                          </div>
                          
                          {org.legal_name && org.legal_name !== org.name && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Legal Name:</strong> {org.legal_name}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {org.business_type && (
                              <span><strong>Type:</strong> {org.business_type}</span>
                            )}
                            <span className="flex items-center space-x-1">
                              <FileText className="h-3 w-3" />
                              <span><strong>{org.document_count}</strong> documents</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Created: {new Date(org.created_at).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrganization(org)}
                            className="flex items-center space-x-1"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload New Data Tab */}
        <TabsContent value="upload" className="space-y-4">
          {/* Validation Control Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                {enableValidation ? (
                  <Shield className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-gray-500" />
                )}
                <span>Data Validation Settings</span>
              </CardTitle>
              <CardDescription>
                Control how strictly your uploaded data is validated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Switch
                  id="enable-validation"
                  checked={enableValidation}
                  onCheckedChange={setEnableValidation}
                />
                <Label htmlFor="enable-validation" className="text-sm font-medium">
                  Enable Data Validation
                </Label>
              </div>
              
              {!enableValidation ? (
                <Alert>
                  <ShieldOff className="h-4 w-4" />
                  <AlertTitle>Validation Disabled (Recommended for Template Files)</AlertTitle>
                  <AlertDescription>
                    Data validation is turned off. Your file will be uploaded without checking for format errors.
                    This is recommended when using the provided comprehensive templates with complex JSON fields.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Validation Enabled</AlertTitle>
                  <AlertDescription>
                    Data will be validated before upload. This may cause errors with complex JSON fields like address and legal_representatives.
                    Consider disabling validation if you're using the comprehensive templates.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Upload Component */}
          <EnhancedComplianceUpload
            entityType="issuer"
            onComplete={handleComplete}
            onCancel={handleCancel}
            autoAdvancePhases={true}
            allowPhaseSkip={false}
            dataConfig={{
              batchSize: 50,
              allowDuplicates: false, // FIXED: Prevent duplicates
              duplicateAction: 'update', // Update existing instead of creating duplicates
              validation: {
                strictMode: false,
                lenientMode: enableValidation,
                bypassValidation: !enableValidation, // When validation is off, bypass all checks
                quickValidation: false,
                requiredFields: enableValidation ? ['name'] : [], // No required fields when validation is off
                customValidators: {},
                dataTransformers: {}
              }
            }}
            documentConfig={{
              maxFileSize: 2 * 1024 * 1024, // 2MB to match issuer-documents bucket limit
              maxFiles: 200,
              concurrentUploads: 2,
              autoLink: true,
              allowedTypes: [
                'commercial_register',
                'certificate_incorporation',
                'memorandum_articles',
                'director_list',
                'shareholder_register',
                'financial_statements',
                'regulatory_status',
                'qualification_summary',
                'business_description',
                'organizational_chart',
                'key_people_cv',
                'aml_kyc_description'
              ]
            }}
            eventHandlers={{
              onPhaseComplete: (phase, result) => {
                console.log(`Phase ${phase} completed:`, result);
                // Auto-refresh existing organizations when data phase completes
                if (phase === 'data' && result.success) {
                  loadExistingOrganizations();
                }
              },
              onProgress: (progress) => {
                console.log('Upload progress:', progress);
              },
              onError: (error, context) => {
                console.error(`Error in ${context}:`, error);
              },
              onValidationError: (errors) => {
                console.warn('Validation errors:', errors);
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedIssuerUploadPage;