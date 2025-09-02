/**
 * Enhanced Investor Detail Page
 * View and edit individual investor details with compliance focus
 * Added: Compliance Check Confirmation functionality - August 12, 2025
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
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
  Settings,
  Shield,
  CheckCircle,
  Mail,
  Building,
  Wallet,
  UserCheck
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
import InvestorManagementService, { type InvestorWithDocuments, type ExtendedInvestor } from './investorManagementService';
import { SimplifiedDocumentManagement } from '@/components/compliance/operations/documents/components';
import { regionCountries } from '@/utils/compliance/countries';
import { InvestorEntityType } from '@/types/core/centralModels';
import { supabase } from '@/infrastructure/database/client';
import { useAuth } from '@/infrastructure/auth/AuthProvider';

interface InvestorDetailPageProps {
  investorId?: string;
}

const INVESTOR_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'retail', label: 'Retail Investor' },
  { value: 'hnwi', label: 'High-Net-Worth Individual' },
  { value: 'institutional', label: 'Institutional Investor' },
  { value: 'corporate', label: 'Corporate Investor' },
  { value: 'fund', label: 'Investment Fund' },
  { value: 'family_office', label: 'Family Office' },
];

const KYC_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'failed', label: 'Failed' },
  { value: 'expired', label: 'Expired' },
];

const INVESTOR_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const ACCREDITATION_STATUSES = [
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'not_verified', label: 'Not Verified' },
  { value: 'expired', label: 'Expired' },
];

const ACCREDITATION_TYPES = [
  { value: 'income', label: 'Income Based' },
  { value: 'net_worth', label: 'Net Worth Based' },
  { value: 'professional', label: 'Professional Knowledge' },
  { value: 'institutional', label: 'Institutional' },
  { value: 'family_office', label: 'Family Office' },
];

const InvestorDetailPage: React.FC<InvestorDetailPageProps> = ({ investorId: propId }) => {
  const { investorId: paramId } = useParams();
  const investorId = propId || paramId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // State management
  const [investor, setInvestor] = useState<InvestorWithDocuments | null>(null);
  const [editedInvestor, setEditedInvestor] = useState<Partial<ExtendedInvestor>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [countrySearchQuery, setCountrySearchQuery] = useState<string>('');
  const [confirmingComplianceCheck, setConfirmingComplianceCheck] = useState(false);

  // Filter regions and countries based on search query
  const filteredRegions = countrySearchQuery 
    ? regionCountries.map(region => ({
        ...region,
        countries: region.countries.filter(country => 
          country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()))
      })).filter(region => region.countries.length > 0)
    : regionCountries;

  useEffect(() => {
    if (investorId) {
      loadInvestor();
    }
  }, [investorId]);

  const loadInvestor = async () => {
    if (!investorId) return;
    
    try {
      setLoading(true);
      const data = await InvestorManagementService.getInvestorById(investorId);
      if (data) {
        setInvestor(data);
        // Map snake_case database fields to camelCase for editing
        const mappedData = {
          ...data,
          // Map snake_case to camelCase for form fields
          walletAddress: data.wallet_address,
          taxResidency: data.tax_residency,
          kycStatus: data.kyc_status,
          investorStatus: data.investor_status,
          accreditationStatus: data.accreditation_status,
          accreditationType: data.accreditation_type,
          type: data.type as InvestorEntityType,
          onboardingCompleted: data.onboarding_completed,
          lastComplianceCheck: data.last_compliance_check
        };
        setEditedInvestor(mappedData);
      } else {
        toast({
          title: 'Not Found',
          description: 'Investor not found.',
          variant: 'destructive',
        });
        navigate('/compliance/management/investors');
      }
    } catch (error) {
      console.error('Failed to load investor:', error);
      toast({
        title: 'Error',
        description: 'Failed to load investor details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplianceCheckConfirmation = async () => {
    if (!investorId || !user) {
      toast({
        title: 'Error',
        description: 'Missing required information for compliance check.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setConfirmingComplianceCheck(true);
      
      // Get current user info
      const currentTimestamp = new Date().toISOString();
      
      // Update the investor record with compliance check confirmation
      const { data, error } = await supabase
        .from('investors')
        .update({
          last_compliance_check: currentTimestamp,
          compliance_checked_by: user.id,
          compliance_checked_email: user.email,
          compliance_checked_at: currentTimestamp,
          updated_at: currentTimestamp
        })
        .eq('investor_id', investorId);

      if (error) {
        console.error('Compliance check update error:', error);
        throw error;
      }

      // Refresh investor data to show updated timestamp
      await loadInvestor();

      toast({
        title: 'Compliance Check Confirmed',
        description: `Compliance check confirmed by ${user.email} at ${new Date(currentTimestamp).toLocaleString()}`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Failed to confirm compliance check:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm compliance check. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setConfirmingComplianceCheck(false);
    }
  };

  const handleSave = async () => {
    if (!investorId || !editedInvestor) {
      console.error('Missing investorId or editedInvestor data');
      toast({
        title: 'Error',
        description: 'Missing required data for update.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      console.log('🔄 Starting investor update...', {
        investorId,
        editedData: editedInvestor
      });
      
      const updated = await InvestorManagementService.updateInvestor(investorId, editedInvestor);
      
      // Update local state
      setInvestor(prev => prev ? { ...prev, ...updated } : null);
      setIsEditing(false);
      
      console.log('🎉 Investor update completed successfully');
      
      toast({
        title: 'Success',
        description: 'Investor updated successfully.',
      });

      // Optional: Reload the investor data to ensure UI is in sync
      setTimeout(() => {
        loadInvestor();
      }, 1000);

    } catch (error) {
      console.error('💥 Investor update failed:', error);
      
      // Enhanced error message based on error type
      let errorMessage = 'Failed to save investor changes.';
      
      if (error.message?.includes('PGRST301')) {
        errorMessage = 'Permission denied. You may not have the required permissions to update this investor.';
      } else if (error.message?.includes('PGRST116')) {
        errorMessage = 'Investor not found. It may have been deleted.';
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
    if (investor) {
      // Map snake_case database fields to camelCase for editing
      const mappedData = {
        ...investor,
        // Map snake_case to camelCase for form fields
        walletAddress: investor.wallet_address,
        taxResidency: investor.tax_residency,
        kycStatus: investor.kyc_status,
        investorStatus: investor.investor_status,
        accreditationStatus: investor.accreditation_status,
        accreditationType: investor.accreditation_type,
        type: investor.type as InvestorEntityType,
        onboardingCompleted: investor.onboarding_completed,
        lastComplianceCheck: investor.last_compliance_check
      };
      setEditedInvestor(mappedData);
    }
    setIsEditing(false);
  };

  const handleChange = (field: string, value: any) => {
    setEditedInvestor(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDelete = async () => {
    if (!investorId || !investor) return;

    try {
      await InvestorManagementService.deleteInvestor(investorId);
      toast({
        title: 'Success',
        description: 'Investor deleted successfully.',
      });
      navigate('/compliance/management/investors');
    } catch (error) {
      console.error('Failed to delete investor:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete investor.',
        variant: 'destructive',
      });
    }
  };

  const getKycStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Expired</Badge>;
      case 'not_started':
        return <Badge variant="outline">Not Started</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getInvestorStatusBadge = (status: string | null | undefined) => {
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

  const formatSelectValue = (value: string | null | undefined, options: Array<{value: string, label: string}>) => {
    if (!value) return 'Not specified';
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
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
        <span>Loading investor...</span>
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Investor Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The investor you're looking for doesn't exist or may have been deleted.
          </p>
          <Button onClick={() => navigate('/compliance/management/investors')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Investors
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
            onClick={() => navigate('/compliance/management/investors')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="h-8 w-8" />
              {investor.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{investor.email}</span>
              {investor.company && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{investor.company}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadInvestor}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {/* Compliance Check Confirmation Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Confirm Compliance Check
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Compliance Check</AlertDialogTitle>
                <AlertDialogDescription>
                  <div>
                    Are you sure you want to confirm that you have performed a compliance check for "{investor.name}"? 
                    This will update the last compliance check timestamp with your user information and current date/time.
                  </div>
                  
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm">
                      <strong>User:</strong> {user?.email}<br/>
                      <strong>Date:</strong> {new Date().toLocaleString()}<br/>
                      <strong>Investor:</strong> {investor.name}
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleComplianceCheckConfirmation}
                  disabled={confirmingComplianceCheck}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {confirmingComplianceCheck ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Confirm Check
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
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
                    <AlertDialogTitle>Delete Investor</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{investor.name}"? This action cannot be undone and will also delete all associated documents.
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {getKycStatusBadge(investor.kyc_status)}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {getInvestorStatusBadge(investor.investor_status)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investor.documents?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Investor Details</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        
        {/* Investor Details Tab */}
        <TabsContent value="details">
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  {isEditing ? 'Edit basic investor details' : 'View basic investor details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={editedInvestor.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{investor.name}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={editedInvestor.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{investor.email}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="company">Company</Label>
                    {isEditing ? (
                      <Input
                        id="company"
                        value={editedInvestor.company || ''}
                        onChange={(e) => handleChange('company', e.target.value)}
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{investor.company || 'Not specified'}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Investor Type</Label>
                    {isEditing ? (
                      <Select
                        value={editedInvestor.type || ''}
                        onValueChange={(value) => handleChange('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select investor type" />
                        </SelectTrigger>
                        <SelectContent>
                          {INVESTOR_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{formatSelectValue(investor.type, INVESTOR_TYPES)}</div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="walletAddress">Wallet Address</Label>
                    {isEditing ? (
                      <Input
                        id="walletAddress"
                        value={editedInvestor.walletAddress || ''}
                        onChange={(e) => handleChange('walletAddress', e.target.value)}
                        placeholder="0x..."
                      />
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded font-mono">
                        {investor.wallet_address || 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="taxResidency">Tax Residency</Label>
                    {isEditing ? (
                      <Select
                        value={editedInvestor.taxResidency || ''}
                        onValueChange={(value) => handleChange('taxResidency', value)}
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
                        {getCountryName(investor.tax_residency)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <div className="grid gap-6">
            {/* KYC & Verification */}
            <Card>
              <CardHeader>
                <CardTitle>KYC & Verification</CardTitle>
                <CardDescription>
                  Compliance and verification status information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="kycStatus">KYC Status</Label>
                    {isEditing ? (
                      <Select
                        value={editedInvestor.kycStatus || ''}
                        onValueChange={(value) => handleChange('kycStatus', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select KYC status" />
                        </SelectTrigger>
                        <SelectContent>
                          {KYC_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1">{getKycStatusBadge(investor.kyc_status)}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="investorStatus">Investor Status</Label>
                    {isEditing ? (
                      <Select
                        value={editedInvestor.investorStatus || ''}
                        onValueChange={(value) => handleChange('investorStatus', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {INVESTOR_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1">{getInvestorStatusBadge(investor.investor_status)}</div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="accreditationStatus">Accreditation Status</Label>
                    {isEditing ? (
                      <Select
                        value={editedInvestor.accreditationStatus || ''}
                        onValueChange={(value) => handleChange('accreditationStatus', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select accreditation status" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCREDITATION_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">
                        {formatSelectValue(investor.accreditation_status, ACCREDITATION_STATUSES)}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="accreditationType">Accreditation Type</Label>
                    {isEditing ? (
                      <Select
                        value={editedInvestor.accreditationType || ''}
                        onValueChange={(value) => handleChange('accreditationType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select accreditation type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCREDITATION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm mt-1 p-2 bg-gray-50 rounded">
                        {formatSelectValue(investor.accreditation_type, ACCREDITATION_TYPES)}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="lastComplianceCheck">Last Compliance Check</Label>
                    <div className="text-sm mt-1 p-3 bg-gray-50 rounded border">
                      {investor.last_compliance_check ? (
                        <div className="space-y-1">
                          <div className="font-medium text-green-700">
                            ✅ Compliance check completed
                          </div>
                          <div>
                            <strong>Date:</strong> {new Date(investor.last_compliance_check).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {investor.compliance_checked_email && (
                            <div>
                              <strong>Checked by:</strong> {investor.compliance_checked_email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-amber-700">
                          ⚠️ No compliance check has been performed
                        </div>
                      )}
                    </div>
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
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Document Management</CardTitle>
                  <CardDescription>
                    Upload and manage documents for {investor.name}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Identity Verification */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Identity Verification
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong>Required</strong><br/>
                    Government-issued identification documents
                  </p>
                  
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h5 className="font-medium">Passport</h5>
                        <p className="text-sm text-muted-foreground">Clear photo of passport (all pages with information)</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Passport
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h5 className="font-medium">Drivers License</h5>
                        <p className="text-sm text-muted-foreground">Front and back of driver's license</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Driver's License
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h5 className="font-medium">National Id</h5>
                        <p className="text-sm text-muted-foreground">Front and back of national ID card</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload National ID
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Address & Financial Verification */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Building className="h-4 w-4 mr-2" />
                    Address & Financial Verification
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong>Required</strong><br/>
                    Recent address and financial status verification
                  </p>
                  
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h5 className="font-medium">Utility Bill</h5>
                        <p className="text-sm text-muted-foreground">Recent utility bill (less than 3 months old)</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Utility Bill
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h5 className="font-medium">Bank Statement</h5>
                        <p className="text-sm text-muted-foreground">Recent bank statement (less than 3 months old)</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Bank Statement
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h5 className="font-medium">Proof Of Income</h5>
                        <p className="text-sm text-muted-foreground">Salary slips, employment letter, or other proof of income</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Proof of Income
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Existing Document Management Component */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">All Documents</h4>
                  <SimplifiedDocumentManagement
                    mode="investor"
                    entityId={investor.id}
                    entityName={investor.name}
                    embedded={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestorDetailPage;
