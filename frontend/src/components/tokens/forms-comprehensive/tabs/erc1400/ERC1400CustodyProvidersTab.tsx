// ERC-1400 Custody Providers Tab - Security Token Custodian Management
// Comprehensive management of custody providers for security tokens

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  Edit3,
  Shield,
  Building2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Globe
} from 'lucide-react';

import { TokenERC1400CustodyProvidersData, ConfigMode } from '../../types';

interface ERC1400CustodyProvidersTabProps {
  data?: TokenERC1400CustodyProvidersData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1400CustodyProvidersTab: React.FC<ERC1400CustodyProvidersTabProps> = ({
  data = [],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addNewProvider = () => {
    const newProvider: TokenERC1400CustodyProvidersData = {
      provider_name: '',
      provider_type: 'qualified_custodian',
      is_active: true,
      integration_status: 'pending',
      certification_level: 'tier_1'
    };
    
    onFieldChange('newRecord', newProvider, data.length);
    setEditingIndex(data.length);
    setExpandedIndex(data.length);
  };

  const removeProvider = (index: number) => {
    if (confirm('Are you sure you want to remove this custody provider?')) {
      onFieldChange('removeRecord', null, index);
      if (editingIndex === index) setEditingIndex(null);
      if (expandedIndex === index) setExpandedIndex(null);
    }
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const handleArrayChange = (index: number, field: string, value: string) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
    onFieldChange(field, arrayValue, index);
  };

  const getFieldError = (index: number, field: string) => {
    return validationErrors[`${index}.${field}`] || [];
  };

  const hasFieldError = (index: number, field: string) => {
    return getFieldError(index, field).length > 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'integrated': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'suspended': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getProviderTypeIcon = (providerType: string) => {
    switch (providerType) {
      case 'qualified_custodian': return <Shield className="w-4 h-4 text-green-500" />;
      case 'prime_brokerage': return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'bank_custodian': return <Building2 className="w-4 h-4 text-purple-500" />;
      case 'digital_custodian': return <Shield className="w-4 h-4 text-orange-500" />;
      default: return <Building2 className="w-4 h-4 text-gray-500" />;
    }
  };

  if (configMode === 'min') {
    // Basic mode - simplified view
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Custody Providers ({data.length})
              </CardTitle>
              <Button onClick={addNewProvider} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Provider
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">{/* Content continues in next chunk */}              {data.map((provider, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Provider Name</Label>
                        <Input
                          value={provider.provider_name || ''}
                          onChange={(e) => handleFieldChange(index, 'provider_name', e.target.value)}
                          placeholder="BNY Mellon"
                        />
                      </div>
                      
                      <div>
                        <Label>Provider Type</Label>
                        <Select 
                          value={provider.provider_type || 'qualified_custodian'} 
                          onValueChange={(value) => handleFieldChange(index, 'provider_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="qualified_custodian">Qualified Custodian</SelectItem>
                            <SelectItem value="prime_brokerage">Prime Brokerage</SelectItem>
                            <SelectItem value="bank_custodian">Bank Custodian</SelectItem>
                            <SelectItem value="digital_custodian">Digital Custodian</SelectItem>
                            <SelectItem value="self_custody">Self Custody</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Status</Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={provider.is_active || false}
                            onCheckedChange={(checked) => handleFieldChange(index, 'is_active', checked)}
                          />
                          <span className="text-sm">
                            {provider.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Provider Address</Label>
                        <Input
                          value={provider.provider_address || ''}
                          onChange={(e) => handleFieldChange(index, 'provider_address', e.target.value)}
                          placeholder="123 Wall St, New York, NY"
                        />
                      </div>

                      <div>
                        <Label>Jurisdiction</Label>
                        <Input
                          value={provider.jurisdiction || ''}
                          onChange={(e) => handleFieldChange(index, 'jurisdiction', e.target.value)}
                          placeholder="United States"
                        />
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeProvider(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {data.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No custody providers defined. Click "Add Provider" to add your first custody provider.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  // Advanced mode - full feature set
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Custody Providers Management ({data.length})
            </CardTitle>
            <Button onClick={addNewProvider} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add New Provider
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((provider, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getProviderTypeIcon(provider.provider_type || 'qualified_custodian')}
                      <span className="font-medium">
                        {provider.provider_name || 'Unnamed Provider'}
                      </span>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getStatusIcon(provider.integration_status || 'pending')}
                        {provider.integration_status || 'pending'}
                      </Badge>
                      {provider.is_active && <Badge variant="default">Active</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeProvider(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Always visible basic info */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label htmlFor={`provider_name_${index}`}>Provider Name *</Label>
                      <Input
                        id={`provider_name_${index}`}
                        value={provider.provider_name || ''}
                        onChange={(e) => handleFieldChange(index, 'provider_name', e.target.value)}
                        placeholder="BNY Mellon"
                      />
                      {hasFieldError(index, 'provider_name') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'provider_name').join(', ')}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`provider_type_${index}`}>Provider Type *</Label>
                      <Select 
                        value={provider.provider_type || 'qualified_custodian'} 
                        onValueChange={(value) => handleFieldChange(index, 'provider_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="qualified_custodian">Qualified Custodian</SelectItem>
                          <SelectItem value="prime_brokerage">Prime Brokerage</SelectItem>
                          <SelectItem value="bank_custodian">Bank Custodian</SelectItem>
                          <SelectItem value="digital_custodian">Digital Custodian</SelectItem>
                          <SelectItem value="self_custody">Self Custody</SelectItem>
                          <SelectItem value="third_party_administrator">Third Party Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasFieldError(index, 'provider_type') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'provider_type').join(', ')}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`integration_status_${index}`}>Integration Status</Label>
                      <Select 
                        value={provider.integration_status || 'pending'} 
                        onValueChange={(value) => handleFieldChange(index, 'integration_status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="integrated">Integrated</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor={`is_active_${index}`}>Is Active</Label>
                      <Switch
                        id={`is_active_${index}`}
                        checked={provider.is_active || false}
                        onCheckedChange={(checked) => handleFieldChange(index, 'is_active', checked)}
                      />
                    </div>
                  </div>
                  {/* Expandable detailed configuration */}
                  {expandedIndex === index && (
                    <div className="space-y-4 pt-4 border-t">
                      {/* Contact Information */}
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Contact Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`provider_address_${index}`}>Provider Address</Label>
                              <Input
                                id={`provider_address_${index}`}
                                value={provider.provider_address || ''}
                                onChange={(e) => handleFieldChange(index, 'provider_address', e.target.value)}
                                placeholder="123 Wall St, New York, NY 10005"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`provider_lei_${index}`}>Legal Entity Identifier (LEI)</Label>
                              <Input
                                id={`provider_lei_${index}`}
                                value={provider.provider_lei || ''}
                                onChange={(e) => handleFieldChange(index, 'provider_lei', e.target.value)}
                                placeholder="549300ABCD1234567890"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`jurisdiction_${index}`}>Jurisdiction</Label>
                              <Select 
                                value={provider.jurisdiction || ''} 
                                onValueChange={(value) => handleFieldChange(index, 'jurisdiction', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select jurisdiction" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="US">United States</SelectItem>
                                  <SelectItem value="UK">United Kingdom</SelectItem>
                                  <SelectItem value="EU">European Union</SelectItem>
                                  <SelectItem value="SG">Singapore</SelectItem>
                                  <SelectItem value="HK">Hong Kong</SelectItem>
                                  <SelectItem value="CA">Canada</SelectItem>
                                  <SelectItem value="AU">Australia</SelectItem>
                                  <SelectItem value="JP">Japan</SelectItem>
                                  <SelectItem value="CH">Switzerland</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      {/* Certification & Compliance */}
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Certification & Compliance
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`certification_level_${index}`}>Certification Level</Label>
                              <Select 
                                value={provider.certification_level || 'tier_1'} 
                                onValueChange={(value) => handleFieldChange(index, 'certification_level', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select certification level" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="tier_1">Tier 1 - Highest</SelectItem>
                                  <SelectItem value="tier_2">Tier 2 - High</SelectItem>
                                  <SelectItem value="tier_3">Tier 3 - Standard</SelectItem>
                                  <SelectItem value="tier_4">Tier 4 - Basic</SelectItem>
                                  <SelectItem value="unrated">Unrated</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor={`custody_agreement_hash_${index}`}>Custody Agreement Hash</Label>
                              <Input
                                id={`custody_agreement_hash_${index}`}
                                value={provider.custody_agreement_hash || ''}
                                onChange={(e) => handleFieldChange(index, 'custody_agreement_hash', e.target.value)}
                                placeholder="0x..."
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`regulatory_approvals_${index}`}>Regulatory Approvals (comma-separated)</Label>
                            <Input
                              id={`regulatory_approvals_${index}`}
                              value={Array.isArray(provider.regulatory_approvals) ? provider.regulatory_approvals.join(', ') : ''}
                              onChange={(e) => handleArrayChange(index, 'regulatory_approvals', e.target.value)}
                              placeholder="SEC, FINRA, OCC, CFTC"
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                              Enter regulatory approvals separated by commas
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  {/* Summary when collapsed */}
                  {expandedIndex !== index && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-4 mt-1">
                        <span>Type: {provider.provider_type?.replace('_', ' ') || 'Unknown'}</span>
                        <span>Jurisdiction: {provider.jurisdiction || 'Not specified'}</span>
                        <span>Cert: {provider.certification_level?.replace('_', ' ').toUpperCase() || 'Unrated'}</span>
                      </div>
                      {provider.provider_address && (
                        <p className="truncate mt-1">{provider.provider_address}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {data.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Custody Providers Defined</h3>
                  <p className="text-muted-foreground mb-4">
                    Add custody providers to manage asset custody for your security token.
                  </p>
                  <Button onClick={addNewProvider}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Provider
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">
            ERC-1400 Custody Providers Configuration
          </span>
        </div>
        <Button 
          onClick={onValidate} 
          variant="outline" 
          size="sm"
          disabled={isSubmitting}
        >
          Validate All Providers
        </Button>
      </div>
    </div>
  );
};

export default ERC1400CustodyProvidersTab;