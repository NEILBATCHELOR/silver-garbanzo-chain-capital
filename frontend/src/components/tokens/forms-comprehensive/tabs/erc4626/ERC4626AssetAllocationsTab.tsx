// ERC-4626 Asset Allocations Tab - Asset Allocation Management
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, PieChart } from 'lucide-react';
import { TokenERC4626AssetAllocationsData, ConfigMode } from '../../types';

interface ERC4626AssetAllocationsTabProps {
  data?: TokenERC4626AssetAllocationsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC4626AssetAllocationsTab: React.FC<ERC4626AssetAllocationsTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { asset: '', percentage: '0' }, data.length);
  const remove = (index: number) => onFieldChange('removeRecord', null, index);
  const handleFieldChange = (index: number, field: string, value: any) => onFieldChange(field, value, index);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Asset Allocations ({data.length})
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
                      <Label>Asset</Label>
                      <Input value={allocation.asset || ''} onChange={(e) => handleFieldChange(index, 'asset', e.target.value)} placeholder="USDC" />
                    </div>
                    <div>
                      <Label>Percentage (%)</Label>
                      <Input value={allocation.percentage || ''} onChange={(e) => handleFieldChange(index, 'percentage', e.target.value)} placeholder="25.0" />
                    </div>
                    <div>
                      <Label>Protocol</Label>
                      <Input value={allocation.protocol || ''} onChange={(e) => handleFieldChange(index, 'protocol', e.target.value)} placeholder="Compound" />
                    </div>
                    <div>
                      <Label>Expected APY (%)</Label>
                      <Input value={allocation.expected_apy || ''} onChange={(e) => handleFieldChange(index, 'expected_apy', e.target.value)} placeholder="6.5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Description</Label>
                    <Input value={allocation.description || ''} onChange={(e) => handleFieldChange(index, 'description', e.target.value)} placeholder="Asset allocation description..." />
                  </div>
                  <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => remove(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No allocations defined. Click "Add Allocation" to create asset allocations.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-4626 Asset Allocations</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC4626AssetAllocationsTab;