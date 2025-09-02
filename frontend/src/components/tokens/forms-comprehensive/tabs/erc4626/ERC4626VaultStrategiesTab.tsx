// ERC-4626 Vault Strategies Tab - Investment Strategy Management
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { TokenERC4626VaultStrategiesData, ConfigMode } from '../../types';

interface ERC4626VaultStrategiesTabProps {
  data?: TokenERC4626VaultStrategiesData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC4626VaultStrategiesTab: React.FC<ERC4626VaultStrategiesTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { 
    strategy_name: '', 
    strategy_type: 'yield_farming',
    allocation_percentage: '0',
    risk_score: 5,
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
              <TrendingUp className="w-5 h-5" />
              Vault Strategies ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Strategy</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((strategy, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Strategy Name</Label>
                      <Input value={strategy.strategy_name || ''} onChange={(e) => handleFieldChange(index, 'strategy_name', e.target.value)} placeholder="Compound Lending" />
                    </div>
                    <div>
                      <Label>Strategy Type</Label>
                      <Select value={strategy.strategy_type || 'yield_farming'} onValueChange={(value) => handleFieldChange(index, 'strategy_type', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yield_farming">Yield Farming</SelectItem>
                          <SelectItem value="lending">Lending</SelectItem>
                          <SelectItem value="staking">Staking</SelectItem>
                          <SelectItem value="liquidity_provision">Liquidity Provision</SelectItem>
                          <SelectItem value="arbitrage">Arbitrage</SelectItem>
                          <SelectItem value="delta_neutral">Delta Neutral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Allocation (%)</Label>
                      <Input value={strategy.allocation_percentage || ''} onChange={(e) => handleFieldChange(index, 'allocation_percentage', e.target.value)} placeholder="25.0" />
                    </div>
                    <div>
                      <Label>Risk Score (1-10)</Label>
                      <Input type="number" min="1" max="10" value={strategy.risk_score || ''} onChange={(e) => handleFieldChange(index, 'risk_score', parseInt(e.target.value) || 5)} placeholder="5" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Protocol Name</Label>
                      <Input value={strategy.protocol_name || ''} onChange={(e) => handleFieldChange(index, 'protocol_name', e.target.value)} placeholder="Compound" />
                    </div>
                    <div>
                      <Label>Expected APY (%)</Label>
                      <Input value={strategy.expected_apy || ''} onChange={(e) => handleFieldChange(index, 'expected_apy', e.target.value)} placeholder="8.5" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Active</Label>
                      <Switch checked={strategy.is_active !== false} onCheckedChange={(checked) => handleFieldChange(index, 'is_active', checked)} />
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
                No strategies defined. Click "Add Strategy" to create investment strategies.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-4626 Vault Strategies</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC4626VaultStrategiesTab;