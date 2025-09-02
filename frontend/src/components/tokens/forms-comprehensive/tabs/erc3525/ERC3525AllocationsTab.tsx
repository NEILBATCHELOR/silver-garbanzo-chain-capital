// ERC-3525 Allocations Tab - Value Allocation Management
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, PieChart } from 'lucide-react';
import { TokenERC3525AllocationsData, ConfigMode } from '../../types';

interface ERC3525AllocationsTabProps {
  data?: TokenERC3525AllocationsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC3525AllocationsTab: React.FC<ERC3525AllocationsTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { slot_id: '', token_id_within_slot: '', value: '0', recipient: '' }, data.length);
  const remove = (index: number) => onFieldChange('removeRecord', null, index);
  const handleFieldChange = (index: number, field: string, value: any) => onFieldChange(field, value, index);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Value Allocations ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Allocation</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((allocation, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Slot ID</Label>
                      <Input value={allocation.slot_id || ''} onChange={(e) => handleFieldChange(index, 'slot_id', e.target.value)} placeholder="1" />
                    </div>
                    <div>
                      <Label>Token ID Within Slot</Label>
                      <Input value={allocation.token_id_within_slot || ''} onChange={(e) => handleFieldChange(index, 'token_id_within_slot', e.target.value)} placeholder="100" />
                    </div>
                    <div>
                      <Label>Value</Label>
                      <Input value={allocation.value || ''} onChange={(e) => handleFieldChange(index, 'value', e.target.value)} placeholder="1000.0" />
                    </div>
                    <div>
                      <Label>Recipient Address</Label>
                      <Input value={allocation.recipient || ''} onChange={(e) => handleFieldChange(index, 'recipient', e.target.value)} placeholder="0x..." />
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
                No allocations defined. Click "Add Allocation" to create value allocations.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-3525 Value Allocations</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC3525AllocationsTab;