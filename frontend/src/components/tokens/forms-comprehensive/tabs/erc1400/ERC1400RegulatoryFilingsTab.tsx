// ERC-1400 Regulatory Filings Tab - Security Token Compliance Filings
// Management of regulatory filings for security tokens

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, FileText, Building, Calendar, ExternalLink } from 'lucide-react';

import { TokenERC1400RegulatoryFilingsData, ConfigMode } from '../../types';

interface ERC1400RegulatoryFilingsTabProps {
  data?: TokenERC1400RegulatoryFilingsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1400RegulatoryFilingsTab: React.FC<ERC1400RegulatoryFilingsTabProps> = ({
  data = [],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false
}) => {
  const addNewFiling = () => {
    const newFiling: TokenERC1400RegulatoryFilingsData = {
      filing_type: 'form_d',
      filing_date: new Date().toISOString().split('T')[0],
      filing_jurisdiction: 'US',
      compliance_status: 'pending',
      auto_generated: false
    };
    onFieldChange('newRecord', newFiling, data.length);
  };

  const removeFiling = (index: number) => {
    if (confirm('Are you sure you want to remove this regulatory filing?')) {
      onFieldChange('removeRecord', null, index);
    }
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const getFieldError = (index: number, field: string) => {
    return validationErrors[`${index}.${field}`] || [];
  };

  const hasFieldError = (index: number, field: string) => {
    return getFieldError(index, field).length > 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Regulatory Filings ({data.length})
            </CardTitle>
            <Button onClick={addNewFiling} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Filing
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((filing, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Filing Type *</Label>
                      <Select 
                        value={filing.filing_type || 'form_d'} 
                        onValueChange={(value) => handleFieldChange(index, 'filing_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select filing type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="form_d">Form D</SelectItem>
                          <SelectItem value="form_s1">Form S-1</SelectItem>
                          <SelectItem value="form_10k">Form 10-K</SelectItem>
                          <SelectItem value="form_10q">Form 10-Q</SelectItem>
                          <SelectItem value="form_8k">Form 8-K</SelectItem>
                          <SelectItem value="reg_a">Regulation A</SelectItem>
                          <SelectItem value="reg_cf">Regulation CF</SelectItem>
                          <SelectItem value="blue_sky">Blue Sky Filing</SelectItem>
                          <SelectItem value="tax_filing">Tax Filing</SelectItem>
                          <SelectItem value="aml_report">AML Report</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasFieldError(index, 'filing_type') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'filing_type').join(', ')}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label>Filing Date *</Label>
                      <Input
                        type="date"
                        value={filing.filing_date || ''}
                        onChange={(e) => handleFieldChange(index, 'filing_date', e.target.value)}
                      />
                      {hasFieldError(index, 'filing_date') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'filing_date').join(', ')}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Jurisdiction *</Label>
                      <Select 
                        value={filing.filing_jurisdiction || 'US'} 
                        onValueChange={(value) => handleFieldChange(index, 'filing_jurisdiction', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select jurisdiction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                          <SelectItem value="EU">European Union</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="SG">Singapore</SelectItem>
                          <SelectItem value="HK">Hong Kong</SelectItem>
                          <SelectItem value="JP">Japan</SelectItem>
                          <SelectItem value="CH">Switzerland</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasFieldError(index, 'filing_jurisdiction') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'filing_jurisdiction').join(', ')}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Status</Label>
                      <Select 
                        value={filing.compliance_status || 'pending'} 
                        onValueChange={(value) => handleFieldChange(index, 'compliance_status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="filed">Filed</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Regulatory Body</Label>
                      <Select 
                        value={filing.regulatory_body || ''} 
                        onValueChange={(value) => handleFieldChange(index, 'regulatory_body', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select regulatory body" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEC">SEC</SelectItem>
                          <SelectItem value="FINRA">FINRA</SelectItem>
                          <SelectItem value="CFTC">CFTC</SelectItem>
                          <SelectItem value="OCC">OCC</SelectItem>
                          <SelectItem value="FCA">FCA (UK)</SelectItem>
                          <SelectItem value="ESMA">ESMA (EU)</SelectItem>
                          <SelectItem value="OSC">OSC (Canada)</SelectItem>
                          <SelectItem value="ASIC">ASIC (Australia)</SelectItem>
                          <SelectItem value="MAS">MAS (Singapore)</SelectItem>
                          <SelectItem value="SFC">SFC (Hong Kong)</SelectItem>
                          <SelectItem value="FSA">FSA (Japan)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Filing Reference</Label>
                      <Input
                        value={filing.filing_reference || ''}
                        onChange={(e) => handleFieldChange(index, 'filing_reference', e.target.value)}
                        placeholder="File Number: 021-12345"
                      />
                    </div>

                    <div>
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={filing.due_date || ''}
                        onChange={(e) => handleFieldChange(index, 'due_date', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Document URI</Label>
                      <div className="flex gap-2">
                        <Input
                          value={filing.document_uri || ''}
                          onChange={(e) => handleFieldChange(index, 'document_uri', e.target.value)}
                          placeholder="https://sec.gov/filing/021-12345"
                        />
                        {filing.document_uri && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={filing.document_uri} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Document Hash</Label>
                      <Input
                        value={filing.document_hash || ''}
                        onChange={(e) => handleFieldChange(index, 'document_hash', e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`auto_generated_${index}`}
                        checked={filing.auto_generated || false}
                        onCheckedChange={(checked) => handleFieldChange(index, 'auto_generated', checked)}
                      />
                      <Label htmlFor={`auto_generated_${index}`}>Auto-generated filing</Label>
                    </div>
                    <Badge className={getStatusColor(filing.compliance_status || 'pending')}>
                      {filing.compliance_status || 'pending'}
                    </Badge>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeFiling(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {data.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Regulatory Filings</h3>
                  <p className="text-muted-foreground mb-4">
                    Add regulatory filings required for your security token compliance.
                  </p>
                  <Button onClick={addNewFiling}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Filing
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
            ERC-1400 Regulatory Filings Configuration
          </span>
        </div>
        <Button 
          onClick={onValidate} 
          variant="outline" 
          size="sm"
          disabled={isSubmitting}
        >
          Validate Filings
        </Button>
      </div>
    </div>
  );
};

export default ERC1400RegulatoryFilingsTab;