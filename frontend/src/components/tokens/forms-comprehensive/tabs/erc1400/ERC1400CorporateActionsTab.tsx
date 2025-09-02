// ERC-1400 Corporate Actions Tab - Security Token Corporate Events
// Comprehensive management of corporate actions for security tokens

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar,
  FileText,
  DollarSign,
  Vote,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

import { TokenERC1400CorporateActionsData, ConfigMode } from '../../types';

interface ERC1400CorporateActionsTabProps {
  data?: TokenERC1400CorporateActionsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1400CorporateActionsTab: React.FC<ERC1400CorporateActionsTabProps> = ({
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

  const addNewAction = () => {
    const newAction: TokenERC1400CorporateActionsData = {
      action_type: 'dividend',
      announcement_date: new Date().toISOString().split('T')[0],
      action_details: {},
      status: 'announced',
      shareholder_approval_required: false,
      regulatory_approval_required: false
    };
    
    onFieldChange('newRecord', newAction, data.length);
    setEditingIndex(data.length);
    setExpandedIndex(data.length);
  };

  const removeAction = (index: number) => {
    if (confirm('Are you sure you want to remove this corporate action?')) {
      onFieldChange('removeRecord', null, index);
      if (editingIndex === index) setEditingIndex(null);
      if (expandedIndex === index) setExpandedIndex(null);
    }
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const handleDetailsChange = (index: number, detailsStr: string) => {
    try {
      const details = detailsStr ? JSON.parse(detailsStr) : {};
      handleFieldChange(index, 'action_details', details);
    } catch (error) {
      // Invalid JSON, store as object with raw value
      handleFieldChange(index, 'action_details', { raw: detailsStr });
    }
  };

  const getFieldError = (index: number, field: string) => {
    return validationErrors[`${index}.${field}`] || [];
  };

  const hasFieldError = (index: number, field: string) => {
    return getFieldError(index, field).length > 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'announced': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'executed': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'dividend': return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'stock_split': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'rights_issue': return <Vote className="w-4 h-4 text-purple-500" />;
      case 'merger': return <FileText className="w-4 h-4 text-orange-500" />;
      case 'spinoff': return <FileText className="w-4 h-4 text-teal-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
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
                <FileText className="w-5 h-5" />
                Corporate Actions ({data.length})
              </CardTitle>
              <Button onClick={addNewAction} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Action
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.map((action, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Action Type</Label>
                        <Select 
                          value={action.action_type || 'dividend'} 
                          onValueChange={(value) => handleFieldChange(index, 'action_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select action type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dividend">Dividend Payment</SelectItem>
                            <SelectItem value="stock_split">Stock Split</SelectItem>
                            <SelectItem value="rights_issue">Rights Issue</SelectItem>
                            <SelectItem value="merger">Merger</SelectItem>
                            <SelectItem value="spinoff">Spinoff</SelectItem>
                            <SelectItem value="buyback">Share Buyback</SelectItem>
                            <SelectItem value="capital_reduction">Capital Reduction</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Announcement Date</Label>
                        <Input
                          type="date"
                          value={action.announcement_date || ''}
                          onChange={(e) => handleFieldChange(index, 'announcement_date', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Status</Label>
                        <Select 
                          value={action.status || 'announced'} 
                          onValueChange={(value) => handleFieldChange(index, 'status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="announced">Announced</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="executed">Executed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Description</Label>
                      <Textarea
                        value={
                          typeof action.action_details === 'object' && action.action_details?.description
                            ? action.action_details.description
                            : ''
                        }
                        onChange={(e) => {
                          const details = typeof action.action_details === 'object' ? action.action_details : {};
                          handleFieldChange(index, 'action_details', { ...details, description: e.target.value });
                        }}
                        placeholder="Action description..."
                        rows={2}
                      />
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeAction(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {data.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No corporate actions defined. Click "Add Action" to create your first corporate action.
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
              <FileText className="w-5 h-5" />
              Corporate Actions Management ({data.length})
            </CardTitle>
            <Button onClick={addNewAction} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add New Action
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((action, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getActionTypeIcon(action.action_type || 'dividend')}
                      <span className="font-medium">
                        {action.action_type?.replace('_', ' ').toUpperCase() || 'DIVIDEND'}
                      </span>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getStatusIcon(action.status || 'announced')}
                        {action.status || 'announced'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {action.announcement_date}
                      </span>
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
                        onClick={() => removeAction(index)}
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
                      <Label htmlFor={`action_type_${index}`}>Action Type *</Label>
                      <Select 
                        value={action.action_type || 'dividend'} 
                        onValueChange={(value) => handleFieldChange(index, 'action_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select action type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dividend">Dividend Payment</SelectItem>
                          <SelectItem value="stock_split">Stock Split</SelectItem>
                          <SelectItem value="rights_issue">Rights Issue</SelectItem>
                          <SelectItem value="merger">Merger</SelectItem>
                          <SelectItem value="spinoff">Spinoff</SelectItem>
                          <SelectItem value="buyback">Share Buyback</SelectItem>
                          <SelectItem value="capital_reduction">Capital Reduction</SelectItem>
                          <SelectItem value="liquidation">Liquidation</SelectItem>
                          <SelectItem value="conversion">Bond Conversion</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasFieldError(index, 'action_type') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'action_type').join(', ')}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`announcement_date_${index}`}>Announcement Date *</Label>
                      <Input
                        id={`announcement_date_${index}`}
                        type="date"
                        value={action.announcement_date || ''}
                        onChange={(e) => handleFieldChange(index, 'announcement_date', e.target.value)}
                      />
                      {hasFieldError(index, 'announcement_date') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'announcement_date').join(', ')}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`status_${index}`}>Status</Label>
                      <Select 
                        value={action.status || 'announced'} 
                        onValueChange={(value) => handleFieldChange(index, 'status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announced">Announced</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="executed">Executed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="pending_approval">Pending Approval</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`impact_on_supply_${index}`}>Impact on Supply</Label>
                      <Select 
                        value={action.impact_on_supply || 'none'} 
                        onValueChange={(value) => handleFieldChange(index, 'impact_on_supply', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select impact" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Impact</SelectItem>
                          <SelectItem value="increase">Increase Supply</SelectItem>
                          <SelectItem value="decrease">Decrease Supply</SelectItem>
                          <SelectItem value="neutral">Supply Neutral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Expandable detailed configuration */}
                  {expandedIndex === index && (
                    <div className="space-y-4 pt-4 border-t">
                      {/* Key Dates */}
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Key Dates
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`record_date_${index}`}>Record Date</Label>
                              <Input
                                id={`record_date_${index}`}
                                type="date"
                                value={action.record_date || ''}
                                onChange={(e) => handleFieldChange(index, 'record_date', e.target.value)}
                              />
                            </div>

                            <div>
                              <Label htmlFor={`effective_date_${index}`}>Effective Date</Label>
                              <Input
                                id={`effective_date_${index}`}
                                type="date"
                                value={action.effective_date || ''}
                                onChange={(e) => handleFieldChange(index, 'effective_date', e.target.value)}
                              />
                            </div>

                            <div>
                              <Label htmlFor={`payment_date_${index}`}>Payment Date</Label>
                              <Input
                                id={`payment_date_${index}`}
                                type="date"
                                value={action.payment_date || ''}
                                onChange={(e) => handleFieldChange(index, 'payment_date', e.target.value)}
                              />
                            </div>

                            <div>
                              <Label htmlFor={`voting_deadline_${index}`}>Voting Deadline</Label>
                              <Input
                                id={`voting_deadline_${index}`}
                                type="date"
                                value={action.voting_deadline || ''}
                                onChange={(e) => handleFieldChange(index, 'voting_deadline', e.target.value)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Approval Requirements */}
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Vote className="w-4 h-4" />
                            Approval Requirements
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`shareholder_approval_${index}`}>Shareholder Approval Required</Label>
                              <Switch
                                id={`shareholder_approval_${index}`}
                                checked={action.shareholder_approval_required || false}
                                onCheckedChange={(checked) => handleFieldChange(index, 'shareholder_approval_required', checked)}
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <Label htmlFor={`regulatory_approval_${index}`}>Regulatory Approval Required</Label>
                              <Switch
                                id={`regulatory_approval_${index}`}
                                checked={action.regulatory_approval_required || false}
                                onCheckedChange={(checked) => handleFieldChange(index, 'regulatory_approval_required', checked)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Impact Analysis */}
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Impact Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor={`impact_on_price_${index}`}>Expected Impact on Price</Label>
                            <Select 
                              value={action.impact_on_price || 'neutral'} 
                              onValueChange={(value) => handleFieldChange(index, 'impact_on_price', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select impact" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="neutral">Neutral</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Action Details */}
                      <div>
                        <Label htmlFor={`action_details_${index}`}>Action Details (JSON)</Label>
                        <Textarea
                          id={`action_details_${index}`}
                          value={
                            typeof action.action_details === 'object' 
                              ? JSON.stringify(action.action_details, null, 2)
                              : action.action_details || ''
                          }
                          onChange={(e) => handleDetailsChange(index, e.target.value)}
                          placeholder={`{
  "description": "Quarterly dividend payment",
  "dividend_per_share": "0.25",
  "currency": "USD",
  "tax_implications": "Subject to withholding tax",
  "eligibility_criteria": "All shareholders of record",
  "payment_method": "Direct deposit or check"
}`}
                          rows={10}
                          className="font-mono text-sm"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Enter detailed information about this corporate action in JSON format
                        </div>
                      </div>

                      {/* Execution Details */}
                      {action.status === 'executed' && (
                        <div>
                          <Label htmlFor={`execution_transaction_hash_${index}`}>Execution Transaction Hash</Label>
                          <Input
                            id={`execution_transaction_hash_${index}`}
                            value={action.execution_transaction_hash || ''}
                            onChange={(e) => handleFieldChange(index, 'execution_transaction_hash', e.target.value)}
                            placeholder="0x..."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary when collapsed */}
                  {expandedIndex !== index && (
                    <div className="text-sm text-muted-foreground">
                      {typeof action.action_details === 'object' && action.action_details?.description && (
                        <p className="truncate">{action.action_details.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1">
                        <span>Record: {action.record_date || 'TBD'}</span>
                        <span>Effective: {action.effective_date || 'TBD'}</span>
                        <span>Payment: {action.payment_date || 'TBD'}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {data.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Corporate Actions Defined</h3>
                  <p className="text-muted-foreground mb-4">
                    Define corporate actions like dividends, stock splits, and mergers for your security token.
                  </p>
                  <Button onClick={addNewAction}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Corporate Action
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
            ERC-1400 Corporate Actions Configuration
          </span>
        </div>
        <Button 
          onClick={onValidate} 
          variant="outline" 
          size="sm"
          disabled={isSubmitting}
        >
          Validate All Actions
        </Button>
      </div>
    </div>
  );
};

export default ERC1400CorporateActionsTab;