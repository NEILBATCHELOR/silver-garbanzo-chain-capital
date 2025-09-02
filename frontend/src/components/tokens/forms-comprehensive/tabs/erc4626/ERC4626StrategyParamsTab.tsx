// ERC-4626 Strategy Parameters Tab - Strategy Parameter Management
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Settings } from 'lucide-react';
import { TokenERC4626StrategyParamsData, ConfigMode } from '../../types';

interface ERC4626StrategyParamsTabProps {
  data?: TokenERC4626StrategyParamsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC4626StrategyParamsTab: React.FC<ERC4626StrategyParamsTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { 
    name: '', 
    value: '',
    param_type: 'string',
    is_required: false
  }, data.length);
  
  const remove = (index: number) => onFieldChange('removeRecord', null, index);
  const handleFieldChange = (index: number, field: string, value: any) => onFieldChange(field, value, index);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Strategy Parameters ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Parameter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((param, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Parameter Name</Label>
                      <Input value={param.name || ''} onChange={(e) => handleFieldChange(index, 'name', e.target.value)} placeholder="slippage_tolerance" />
                    </div>
                    <div>
                      <Label>Value</Label>
                      <Input value={param.value || ''} onChange={(e) => handleFieldChange(index, 'value', e.target.value)} placeholder="0.5" />
                    </div>
                    <div>
                      <Label>Parameter Type</Label>
                      <Select value={param.param_type || 'string'} onValueChange={(value) => handleFieldChange(index, 'param_type', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="address">Address</SelectItem>
                          <SelectItem value="array">Array</SelectItem>
                          <SelectItem value="object">Object</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Default Value</Label>
                      <Input value={param.default_value || ''} onChange={(e) => handleFieldChange(index, 'default_value', e.target.value)} placeholder="1.0" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Description</Label>
                    <Textarea 
                      value={param.description || ''} 
                      onChange={(e) => handleFieldChange(index, 'description', e.target.value)} 
                      placeholder="Maximum allowed slippage for trades"
                      rows={2}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch checked={param.is_required || false} onCheckedChange={(checked) => handleFieldChange(index, 'is_required', checked)} />
                      <Label>Required Parameter</Label>
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
                No parameters defined. Click "Add Parameter" to create strategy parameters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-4626 Strategy Parameters</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC4626StrategyParamsTab;