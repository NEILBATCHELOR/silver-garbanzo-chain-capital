// ERC-3525 Slots Tab - Semi-Fungible Token Slot Management
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Hash } from 'lucide-react';
import { TokenERC3525SlotsData, ConfigMode } from '../../types';

interface ERC3525SlotsTabProps {
  data?: TokenERC3525SlotsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC3525SlotsTab: React.FC<ERC3525SlotsTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { slot_id: '', name: '', description: '', value_units: 'units' }, data.length);
  const remove = (index: number) => onFieldChange('removeRecord', null, index);
  const handleFieldChange = (index: number, field: string, value: any) => onFieldChange(field, value, index);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Token Slots ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Slot</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((slot, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Slot ID</Label>
                      <Input value={slot.slot_id || ''} onChange={(e) => handleFieldChange(index, 'slot_id', e.target.value)} placeholder="1" />
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input value={slot.name || ''} onChange={(e) => handleFieldChange(index, 'name', e.target.value)} placeholder="Series A Bonds" />
                    </div>
                    <div>
                      <Label>Value Units</Label>
                      <Input value={slot.value_units || ''} onChange={(e) => handleFieldChange(index, 'value_units', e.target.value)} placeholder="USD" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Description</Label>
                    <Textarea value={slot.description || ''} onChange={(e) => handleFieldChange(index, 'description', e.target.value)} placeholder="Slot description..." rows={2} />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch checked={slot.slot_transferable || false} onCheckedChange={(checked) => handleFieldChange(index, 'slot_transferable', checked)} />
                      <Label>Slot Transferable</Label>
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
                No slots defined. Click "Add Slot" to create token slots.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-3525 Token Slots</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC3525SlotsTab;