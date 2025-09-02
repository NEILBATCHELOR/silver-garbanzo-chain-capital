// ERC-1400 Partition Operators Tab - Token Partition Operator Management
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Users } from 'lucide-react';
import { TokenERC1400PartitionOperatorsData, ConfigMode } from '../../types';

interface ERC1400PartitionOperatorsTabProps {
  data?: TokenERC1400PartitionOperatorsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1400PartitionOperatorsTab: React.FC<ERC1400PartitionOperatorsTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { holder_address: '', operator_address: '', authorized: true }, data.length);
  const remove = (index: number) => onFieldChange('removeRecord', null, index);
  const handleFieldChange = (index: number, field: string, value: any) => onFieldChange(field, value, index);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Partition Operators ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Operator</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((operator, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Holder Address</Label>
                      <Input value={operator.holder_address || ''} onChange={(e) => handleFieldChange(index, 'holder_address', e.target.value)} placeholder="0x..." />
                    </div>
                    <div>
                      <Label>Operator Address</Label>
                      <Input value={operator.operator_address || ''} onChange={(e) => handleFieldChange(index, 'operator_address', e.target.value)} placeholder="0x..." />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Authorized</Label>
                      <Switch checked={operator.authorized || false} onCheckedChange={(checked) => handleFieldChange(index, 'authorized', checked)} />
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
                No partition operators defined. Click "Add Operator" to authorize operators.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-1400 Partition Operators</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC1400PartitionOperatorsTab;