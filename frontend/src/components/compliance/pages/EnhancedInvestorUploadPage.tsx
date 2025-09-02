/**
 * Enhanced Investor Upload Page
 * 
 * Page component for uploading investor data and documents
 * using the enhanced compliance upload system
 * 
 * ENHANCED FEATURES:
 * - Shows existing investors to prevent duplicates
 * - Save-and-exit functionality for progressive completion
 * - Strict duplicate prevention
 * - Validation controls for easier uploads
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ShieldOff, Search, Users, FileText, Calendar, CheckCircle, AlertCircle, Eye, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedComplianceUpload } from '../upload/enhanced';
import { getInvestors, searchInvestors, type InvestorSummary } from '../investor/services/investorService';
import type { Investor } from '@/types/core/centralModels';

export interface EnhancedInvestorUploadPageProps {
  onComplete?: (uploadedInvestors: Investor[]) => void;
  redirectPath?: string;
}

export const EnhancedInvestorUploadPage: React.FC<EnhancedInvestorUploadPageProps> = ({
  onComplete,
  redirectPath = '/compliance/investor'
}) => {
  const navigate = useNavigate();
  
  // Upload settings state
  const [enableValidation, setEnableValidation] = useState(false); // Default to validation OFF for easier uploads
  
  // Existing investors state
  const [existingInvestors, setExistingInvestors] = useState<InvestorSummary[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<InvestorSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'existing' | 'upload'>('existing');

  // Load existing investors on component mount
  useEffect(() => {
    loadExistingInvestors();
  }, []);

  // Filter investors based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredInvestors(existingInvestors);
    } else {
      const filtered = existingInvestors.filter(investor =>
        investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredInvestors(filtered);
    }
  }, [searchQuery, existingInvestors]);

  const loadExistingInvestors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const investors = await getInvestors();
      setExistingInvestors(investors);
      setFilteredInvestors(investors);
    } catch (err) {
      console.error('Failed to load existing investors:', err);
      setError('Failed to load existing investors. You can still upload new data.');
      setExistingInvestors([]);
      setFilteredInvestors([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = (uploadedEntities: (Investor)[], documents?: any[]) => {
    // Type guard to ensure we have investors
    const investors = uploadedEntities as Investor[];
    
    onComplete?.(investors);
    
    // Refresh the existing investors list
    loadExistingInvestors();
    
    // Navigate back or to specified path
    navigate(redirectPath);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleViewInvestor = (investor: InvestorSummary) => {
    // Navigate to investor detail page
    navigate(`/compliance/investor/${investor.id}`);
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getKycStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
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
          <h1 className="text-3xl font-bold">Investor Management & Upload</h1>
          <p className="text-muted-foreground">
            View existing investors, upload new investor data, and manage documents
          </p>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'existing' | 'upload')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Existing Investors ({existingInvestors.length})</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Upload New Data</span>
          </TabsTrigger>
        </TabsList>

        {/* Existing Investors Tab */}
        <TabsContent value="existing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Previously Uploaded Investors</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    Prevent Duplicates
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadExistingInvestors}
                    disabled={isLoading}
                  >
                    Refresh
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                <strong>Important:</strong> Review existing investors to prevent duplicates.
                Use the search below to check if your investor already exists.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="🔍 Search investors by name or email to check for duplicates..."
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
                    {filteredInvestors.length > 0 ? (
                      <span>
                        <strong>Found {filteredInvestors.length} investors</strong> matching "{searchQuery}". 
                        If your investor is listed below, they already exist in the system.
                      </span>
                    ) : (
                      <span>
                        <strong>No investors found</strong> matching "{searchQuery}". 
                        You can proceed to upload this as a new investor in the "Upload New Data" tab.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Error State */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Investors</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading investors...</div>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && filteredInvestors.length === 0 && !searchQuery && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No investors uploaded yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This is your first investor upload. You can proceed to the "Upload New Data" tab.
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab('upload')}>
                    Start Upload
                  </Button>
                </div>
              )}

              {/* Investors List */}
              {!isLoading && filteredInvestors.length > 0 && (
                <div className="space-y-3">
                  {filteredInvestors.map((investor) => (
                    <Card key={investor.id} className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg">{investor.name}</h3>
                            {investor.investor_status && (
                              <Badge className={getStatusColor(investor.investor_status)}>
                                {investor.investor_status}
                              </Badge>
                            )}
                            {investor.kyc_status && (
                              <Badge className={getKycStatusColor(investor.kyc_status)}>
                                KYC: {investor.kyc_status}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            <strong>Email:</strong> {investor.email}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {investor.type && (
                              <span><strong>Type:</strong> {investor.type}</span>
                            )}
                            {investor.accreditation_status && (
                              <span><strong>Accreditation:</strong> {investor.accreditation_status}</span>
                            )}
                            <span className="flex items-center space-x-1">
                              <FileText className="h-3 w-3" />
                              <span><strong>{investor.document_count}</strong> documents</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Created: {new Date(investor.created_at).toLocaleDateString()}</span>
                            </span>
                          </div>

                          {investor.onboarding_completed && (
                            <div className="flex items-center space-x-1 text-sm text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              <span>Onboarding Complete</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvestor(investor)}
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
                    Data will be validated before upload. This may cause errors with complex JSON fields like 
                    investment_preferences and risk_assessment. Consider disabling validation if you're using the comprehensive templates.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Upload Component */}
          <EnhancedComplianceUpload
            entityType="investor"
            onComplete={handleComplete}
            onCancel={handleCancel}
            autoAdvancePhases={true}
            allowPhaseSkip={false}
            dataConfig={{
              batchSize: 100,
              allowDuplicates: false, // FIXED: Prevent duplicates
              duplicateAction: 'update', // Update existing instead of creating duplicates
              validation: {
                strictMode: false,
                lenientMode: enableValidation,
                bypassValidation: !enableValidation, // When validation is off, bypass all checks
                quickValidation: false,
                requiredFields: enableValidation ? ['name', 'email'] : [], // No required fields when validation is off
                customValidators: {},
                dataTransformers: {}
              }
            }}
            documentConfig={{
              maxFileSize: 50 * 1024 * 1024, // 50MB to match investor-documents bucket limit
              maxFiles: 100,
              concurrentUploads: 3,
              autoLink: true,
              allowedTypes: [
                'passport',
                'drivers_license', 
                'national_id',
                'proof_of_address',
                'bank_statement',
                'investment_agreement',
                'accreditation_letter',
                'tax_document',
                'utility_bill',
                'financial_statement',
                'employment_letter',
                'other'
              ]
            }}
            eventHandlers={{
              onPhaseComplete: (phase, result) => {
                console.log(`Phase ${phase} completed:`, result);
                // Auto-refresh existing investors when data phase completes
                if (phase === 'data' && result.success) {
                  loadExistingInvestors();
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

export default EnhancedInvestorUploadPage;
