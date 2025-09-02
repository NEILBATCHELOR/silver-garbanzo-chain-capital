// ERC-4626 Fee Tiers Tab - Fee Structure Management
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { TokenERC4626FeeTiersData, ConfigMode } from '../../types';

interface ERC4626FeeTiersTabProps {
  data?: TokenERC4626FeeTiersData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC4626FeeTiersTab: React.FC<ERC4626FeeTiersTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { 
    tier_name: '', 
    min_balance: '0',
    management_fee_rate: '0',
    performance_fee_rate: '0',
    is_active: true
  }, data.length);
  
  const remove = (index: number) => onFieldChange('removeRecord', null, index);
  const handleFieldChange = (index: number, field: string, value: any) => onFieldChange(field, value, index);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Fee Tiers ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Tier</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((tier, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Tier Name</Label>
                      <Input value={tier.tier_name || ''} onChange={(e) => handleFieldChange(index, 'tier_name', e.target.value)} placeholder="Bronze" />
                    </div>
                    <div>
                      <Label>Min Balance</Label>
                      <Input value={tier.min_balance || ''} onChange={(e) => handleFieldChange(index, 'min_balance', e.target.value)} placeholder="1000" />
                    </div>
                    <div>
                      <Label>Max Balance</Label>
                      <Input value={tier.max_balance || ''} onChange={(e) => handleFieldChange(index, 'max_balance', e.target.value)} placeholder="10000" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Management Fee (%)</Label>
                      <Input value={tier.management_fee_rate || ''} onChange={(e) => handleFieldChange(index, 'management_fee_rate', e.target.value)} placeholder="2.0" />
                    </div>
                    <div>
                      <Label>Performance Fee (%)</Label>
                      <Input value={tier.performance_fee_rate || ''} onChange={(e) => handleFieldChange(index, 'performance_fee_rate', e.target.value)} placeholder="20.0" />
                    </div>
                    <div>
                      <Label>Deposit Fee (%)</Label>
                      <Input value={tier.deposit_fee_rate || ''} onChange={(e) => handleFieldChange(index, 'deposit_fee_rate', e.target.value)} placeholder="0.1" />
                    </div>
                    <div>
                      <Label>Withdrawal Fee (%)</Label>
                      <Input value={tier.withdrawal_fee_rate || ''} onChange={(e) => handleFieldChange(index, 'withdrawal_fee_rate', e.target.value)} placeholder="0.1" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch checked={tier.is_active !== false} onCheckedChange={(checked) => handleFieldChange(index, 'is_active', checked)} />
                      <Label>Active Tier</Label>
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
                No fee tiers defined. Click "Add Tier" to create fee structures.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-4626 Fee Tiers</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC4626FeeTiersTab;