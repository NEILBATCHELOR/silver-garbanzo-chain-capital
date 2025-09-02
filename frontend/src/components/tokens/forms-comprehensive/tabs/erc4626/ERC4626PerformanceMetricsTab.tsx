// ERC-4626 Performance Metrics Tab - Performance Tracking
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, BarChart3 } from 'lucide-react';
import { TokenERC4626PerformanceMetricsData, ConfigMode } from '../../types';

interface ERC4626PerformanceMetricsTabProps {
  data?: TokenERC4626PerformanceMetricsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC4626PerformanceMetricsTab: React.FC<ERC4626PerformanceMetricsTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { 
    metric_date: new Date().toISOString().split('T')[0],
    total_assets: '0',
    share_price: '1.0'
  }, data.length);
  
  const remove = (index: number) => onFieldChange('removeRecord', null, index);
  const handleFieldChange = (index: number, field: string, value: any) => onFieldChange(field, value, index);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Performance Metrics ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Metric</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((metric, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Metric Date</Label>
                      <Input type="date" value={metric.metric_date || ''} onChange={(e) => handleFieldChange(index, 'metric_date', e.target.value)} />
                    </div>
                    <div>
                      <Label>Total Assets</Label>
                      <Input value={metric.total_assets || ''} onChange={(e) => handleFieldChange(index, 'total_assets', e.target.value)} placeholder="1000000" />
                    </div>
                    <div>
                      <Label>Share Price</Label>
                      <Input value={metric.share_price || ''} onChange={(e) => handleFieldChange(index, 'share_price', e.target.value)} placeholder="1.05" />
                    </div>
                    <div>
                      <Label>APY (%)</Label>
                      <Input value={metric.apy || ''} onChange={(e) => handleFieldChange(index, 'apy', e.target.value)} placeholder="8.5" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Daily Yield (%)</Label>
                      <Input value={metric.daily_yield || ''} onChange={(e) => handleFieldChange(index, 'daily_yield', e.target.value)} placeholder="0.02" />
                    </div>
                    <div>
                      <Label>Sharpe Ratio</Label>
                      <Input value={metric.sharpe_ratio || ''} onChange={(e) => handleFieldChange(index, 'sharpe_ratio', e.target.value)} placeholder="1.5" />
                    </div>
                    <div>
                      <Label>Volatility (%)</Label>
                      <Input value={metric.volatility || ''} onChange={(e) => handleFieldChange(index, 'volatility', e.target.value)} placeholder="15.0" />
                    </div>
                    <div>
                      <Label>Max Drawdown (%)</Label>
                      <Input value={metric.max_drawdown || ''} onChange={(e) => handleFieldChange(index, 'max_drawdown', e.target.value)} placeholder="5.0" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>New Deposits</Label>
                      <Input value={metric.new_deposits || ''} onChange={(e) => handleFieldChange(index, 'new_deposits', e.target.value)} placeholder="50000" />
                    </div>
                    <div>
                      <Label>Withdrawals</Label>
                      <Input value={metric.withdrawals || ''} onChange={(e) => handleFieldChange(index, 'withdrawals', e.target.value)} placeholder="25000" />
                    </div>
                    <div>
                      <Label>Total Fees Collected</Label>
                      <Input value={metric.total_fees_collected || ''} onChange={(e) => handleFieldChange(index, 'total_fees_collected', e.target.value)} placeholder="1000" />
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
                No metrics recorded. Click "Add Metric" to track performance.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-4626 Performance Metrics</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC4626PerformanceMetricsTab;