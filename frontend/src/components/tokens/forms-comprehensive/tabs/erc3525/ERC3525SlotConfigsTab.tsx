// ERC-3525 Slot Configs Tab - Slot Configuration Management
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
import { TokenERC3525SlotConfigsData, ConfigMode } from '../../types';

interface ERC3525SlotConfigsTabProps {
  data?: TokenERC3525SlotConfigsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC3525SlotConfigsTab: React.FC<ERC3525SlotConfigsTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { 
    slot_id: '', 
    slot_name: '',
    slot_description: '',
    value_units: 'units',
    slot_type: 'financial',
    transferable: true,
    tradeable: true,
    divisible: true
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
              Slot Configurations ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Config</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((config, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Slot ID</Label>
                      <Input value={config.slot_id || ''} onChange={(e) => handleFieldChange(index, 'slot_id', e.target.value)} placeholder="1" />
                    </div>
                    <div>
                      <Label>Slot Name</Label>
                      <Input value={config.slot_name || ''} onChange={(e) => handleFieldChange(index, 'slot_name', e.target.value)} placeholder="Series A Bonds" />
                    </div>
                    <div>
                      <Label>Value Units</Label>
                      <Input value={config.value_units || ''} onChange={(e) => handleFieldChange(index, 'value_units', e.target.value)} placeholder="USD" />
                    </div>
                    <div>
                      <Label>Slot Type</Label>
                      <Select 
                        value={config.slot_type || 'financial'} 
                        onValueChange={(value) => handleFieldChange(index, 'slot_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="financial">Financial Instrument</SelectItem>
                          <SelectItem value="real_estate">Real Estate</SelectItem>
                          <SelectItem value="commodity">Commodity</SelectItem>
                          <SelectItem value="collectible">Collectible</SelectItem>
                          <SelectItem value="utility">Utility</SelectItem>
                          <SelectItem value="governance">Governance</SelectItem>
                          <SelectItem value="reward">Reward</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label>Slot Description</Label>
                    <Textarea 
                      value={config.slot_description || ''} 
                      onChange={(e) => handleFieldChange(index, 'slot_description', e.target.value)} 
                      placeholder="Detailed description of this slot configuration..."
                      rows={2}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between">
                      <Label>Transferable</Label>
                      <Switch 
                        checked={config.transferable !== false} 
                        onCheckedChange={(checked) => handleFieldChange(index, 'transferable', checked)} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Tradeable</Label>
                      <Switch 
                        checked={config.tradeable !== false} 
                        onCheckedChange={(checked) => handleFieldChange(index, 'tradeable', checked)} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Divisible</Label>
                      <Switch 
                        checked={config.divisible !== false} 
                        onCheckedChange={(checked) => handleFieldChange(index, 'divisible', checked)} 
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Min Value</Label>
                      <Input 
                        value={config.min_value || ''} 
                        onChange={(e) => handleFieldChange(index, 'min_value', e.target.value)} 
                        placeholder="1.0" 
                      />
                    </div>
                    <div>
                      <Label>Max Value</Label>
                      <Input 
                        value={config.max_value || ''} 
                        onChange={(e) => handleFieldChange(index, 'max_value', e.target.value)} 
                        placeholder="1000000.0" 
                      />
                    </div>
                    <div>
                      <Label>Value Precision</Label>
                      <Input 
                        type="number"
                        value={config.value_precision || ''} 
                        onChange={(e) => handleFieldChange(index, 'value_precision', parseInt(e.target.value) || 0)} 
                        placeholder="2" 
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label>Slot Properties (JSON)</Label>
                    <Textarea 
                      value={
                        typeof config.slot_properties === 'object' 
                          ? JSON.stringify(config.slot_properties, null, 2)
                          : config.slot_properties || ''
                      }
                      onChange={(e) => {
                        try {
                          const properties = e.target.value ? JSON.parse(e.target.value) : {};
                          handleFieldChange(index, 'slot_properties', properties);
                        } catch (error) {
                          handleFieldChange(index, 'slot_properties', e.target.value);
                        }
                      }}
                      placeholder={`{
  "risk_level": "low",
  "category": "government_bonds",
  "issuer": "US Treasury",
  "rating": "AAA"
}`}
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>

                  <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => remove(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No slot configurations defined. Click "Add Config" to configure slots.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-3525 Slot Configurations</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC3525SlotConfigsTab;