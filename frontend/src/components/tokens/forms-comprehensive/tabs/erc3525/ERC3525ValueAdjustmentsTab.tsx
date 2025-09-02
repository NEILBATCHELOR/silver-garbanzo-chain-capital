// ERC-3525 Value Adjustments Tab - Value Adjustment Management
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { TokenERC3525ValueAdjustmentsData, ConfigMode } from '../../types';

interface ERC3525ValueAdjustmentsTabProps {
  data?: TokenERC3525ValueAdjustmentsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC3525ValueAdjustmentsTab: React.FC<ERC3525ValueAdjustmentsTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { 
    slot_id: '', 
    adjustment_date: new Date().toISOString(), 
    adjustment_type: 'market_revaluation', 
    adjustment_amount: '0',
    adjustment_reason: ''
  }, data.length);
  
  const remove = (index: number) => onFieldChange('removeRecord', null, index);
  const handleFieldChange = (index: number, field: string, value: any) => onFieldChange(field, value, index);

  const getAdjustmentIcon = (adjustmentType: string) => {
    switch (adjustmentType) {
      case 'increase':
      case 'appreciation': 
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decrease':
      case 'depreciation':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Value Adjustments ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Adjustment</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((adjustment, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    {getAdjustmentIcon(adjustment.adjustment_type || 'market_revaluation')}
                    <span className="font-medium">
                      {adjustment.adjustment_type?.replace('_', ' ').toUpperCase() || 'MARKET REVALUATION'}
                    </span>
                    <Badge variant="outline">
                      Slot {adjustment.slot_id || 'N/A'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Slot ID</Label>
                      <Input value={adjustment.slot_id || ''} onChange={(e) => handleFieldChange(index, 'slot_id', e.target.value)} placeholder="1" />
                    </div>
                    <div>
                      <Label>Adjustment Type</Label>
                      <Select 
                        value={adjustment.adjustment_type || 'market_revaluation'} 
                        onValueChange={(value) => handleFieldChange(index, 'adjustment_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="market_revaluation">Market Revaluation</SelectItem>
                          <SelectItem value="oracle_update">Oracle Update</SelectItem>
                          <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                          <SelectItem value="accrual">Interest Accrual</SelectItem>
                          <SelectItem value="depreciation">Depreciation</SelectItem>
                          <SelectItem value="appreciation">Appreciation</SelectItem>
                          <SelectItem value="dividend_adjustment">Dividend Adjustment</SelectItem>
                          <SelectItem value="split_adjustment">Split Adjustment</SelectItem>
                          <SelectItem value="merger_adjustment">Merger Adjustment</SelectItem>
                          <SelectItem value="error_correction">Error Correction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Adjustment Amount</Label>
                      <Input value={adjustment.adjustment_amount || ''} onChange={(e) => handleFieldChange(index, 'adjustment_amount', e.target.value)} placeholder="100.0" />
                    </div>
                    <div>
                      <Label>Adjustment Date</Label>
                      <Input 
                        type="datetime-local" 
                        value={adjustment.adjustment_date?.slice(0, 16) || ''} 
                        onChange={(e) => handleFieldChange(index, 'adjustment_date', e.target.value + ':00.000Z')} 
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Oracle Price</Label>
                      <Input 
                        value={adjustment.oracle_price || ''} 
                        onChange={(e) => handleFieldChange(index, 'oracle_price', e.target.value)} 
                        placeholder="1250.50" 
                      />
                    </div>
                    
                    <div>
                      <Label>Oracle Source</Label>
                      <Select 
                        value={adjustment.oracle_source || ''} 
                        onValueChange={(value) => handleFieldChange(index, 'oracle_source', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select oracle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chainlink">Chainlink</SelectItem>
                          <SelectItem value="band_protocol">Band Protocol</SelectItem>
                          <SelectItem value="tellor">Tellor</SelectItem>
                          <SelectItem value="pyth">Pyth Network</SelectItem>
                          <SelectItem value="api3">API3</SelectItem>
                          <SelectItem value="dia">DIA</SelectItem>
                          <SelectItem value="custom">Custom Oracle</SelectItem>
                          <SelectItem value="manual">Manual Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Approved By</Label>
                      <Input 
                        value={adjustment.approved_by || ''} 
                        onChange={(e) => handleFieldChange(index, 'approved_by', e.target.value)} 
                        placeholder="0x... or admin name" 
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label>Adjustment Reason</Label>
                    <Textarea 
                      value={adjustment.adjustment_reason || ''} 
                      onChange={(e) => handleFieldChange(index, 'adjustment_reason', e.target.value)} 
                      placeholder="Describe the reason for this value adjustment..."
                      rows={2}
                    />
                  </div>

                  <div className="mt-4">
                    <Label>Transaction Hash</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={adjustment.transaction_hash || ''} 
                        onChange={(e) => handleFieldChange(index, 'transaction_hash', e.target.value)} 
                        placeholder="0x..." 
                      />
                      {adjustment.transaction_hash && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`https://etherscan.io/tx/${adjustment.transaction_hash}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => remove(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No value adjustments recorded. Click "Add Adjustment" to track value changes.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-3525 Value Adjustments</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC3525ValueAdjustmentsTab;