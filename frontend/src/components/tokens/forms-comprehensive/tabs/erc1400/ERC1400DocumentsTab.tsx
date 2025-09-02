// ERC-1400 Documents Tab - Security Token Legal Documents
// Management of legal documents for security tokens

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, FileText, ExternalLink } from 'lucide-react';

import { TokenERC1400DocumentsData, ConfigMode } from '../../types';

interface ERC1400DocumentsTabProps {
  data?: TokenERC1400DocumentsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1400DocumentsTab: React.FC<ERC1400DocumentsTabProps> = ({
  data = [],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false
}) => {
  const addNewDocument = () => {
    const newDocument: TokenERC1400DocumentsData = {
      name: '',
      document_uri: '',
      document_type: 'offering_memorandum'
    };
    onFieldChange('newRecord', newDocument, data.length);
  };

  const removeDocument = (index: number) => {
    if (confirm('Are you sure you want to remove this document?')) {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Legal Documents ({data.length})
            </CardTitle>
            <Button onClick={addNewDocument} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((document, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Document Name *</Label>
                      <Input
                        value={document.name || ''}
                        onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                        placeholder="Offering Memorandum"
                      />
                      {hasFieldError(index, 'name') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'name').join(', ')}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label>Document Type</Label>
                      <Select 
                        value={document.document_type || 'offering_memorandum'} 
                        onValueChange={(value) => handleFieldChange(index, 'document_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="offering_memorandum">Offering Memorandum</SelectItem>
                          <SelectItem value="prospectus">Prospectus</SelectItem>
                          <SelectItem value="subscription_agreement">Subscription Agreement</SelectItem>
                          <SelectItem value="shareholders_agreement">Shareholders Agreement</SelectItem>
                          <SelectItem value="articles_of_incorporation">Articles of Incorporation</SelectItem>
                          <SelectItem value="bylaws">Bylaws</SelectItem>
                          <SelectItem value="board_resolution">Board Resolution</SelectItem>
                          <SelectItem value="legal_opinion">Legal Opinion</SelectItem>
                          <SelectItem value="compliance_certificate">Compliance Certificate</SelectItem>
                          <SelectItem value="audit_report">Audit Report</SelectItem>
                          <SelectItem value="financial_statement">Financial Statement</SelectItem>
                          <SelectItem value="regulatory_filing">Regulatory Filing</SelectItem>
                          <SelectItem value="whitepaper">Whitepaper</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Document Hash</Label>
                      <Input
                        value={document.document_hash || ''}
                        onChange={(e) => handleFieldChange(index, 'document_hash', e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label>Document URI *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={document.document_uri || ''}
                        onChange={(e) => handleFieldChange(index, 'document_uri', e.target.value)}
                        placeholder="https://docs.example.com/offering-memo.pdf"
                      />
                      {document.document_uri && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={document.document_uri} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                    {hasFieldError(index, 'document_uri') && (
                      <div className="text-sm text-red-500 mt-1">
                        {getFieldError(index, 'document_uri').join(', ')}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeDocument(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {data.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Documents Defined</h3>
                  <p className="text-muted-foreground mb-4">
                    Add legal documents required for your security token.
                  </p>
                  <Button onClick={addNewDocument}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Document
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
            ERC-1400 Legal Documents Configuration
          </span>
        </div>
        <Button 
          onClick={onValidate} 
          variant="outline" 
          size="sm"
          disabled={isSubmitting}
        >
          Validate Documents
        </Button>
      </div>
    </div>
  );
};

export default ERC1400DocumentsTab;