// ERC-3525 Payment Schedules Tab - Payment Schedule Management
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Calendar, ExternalLink } from 'lucide-react';
import { TokenERC3525PaymentSchedulesData, ConfigMode } from '../../types';

interface ERC3525PaymentSchedulesTabProps {
  data?: TokenERC3525PaymentSchedulesData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC3525PaymentSchedulesTab: React.FC<ERC3525PaymentSchedulesTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { 
    slot_id: '', 
    payment_date: new Date().toISOString(), 
    payment_amount: '0', 
    payment_type: 'coupon',
    currency: 'USD',
    is_completed: false
  }, data.length);
  
  const remove = (index: number) => onFieldChange('removeRecord', null, index);
  const handleFieldChange = (index: number, field: string, value: any) => onFieldChange(field, value, index);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Payment Schedules ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Payment</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((payment, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Slot ID</Label>
                      <Input value={payment.slot_id || ''} onChange={(e) => handleFieldChange(index, 'slot_id', e.target.value)} placeholder="1" />
                    </div>
                    <div>
                      <Label>Payment Date</Label>
                      <Input 
                        type="datetime-local" 
                        value={payment.payment_date?.slice(0, 16) || ''} 
                        onChange={(e) => handleFieldChange(index, 'payment_date', e.target.value + ':00.000Z')} 
                      />
                    </div>
                    <div>
                      <Label>Payment Amount</Label>
                      <Input value={payment.payment_amount || ''} onChange={(e) => handleFieldChange(index, 'payment_amount', e.target.value)} placeholder="100.0" />
                    </div>
                    <div>
                      <Label>Payment Type</Label>
                      <Select 
                        value={payment.payment_type || 'coupon'} 
                        onValueChange={(value) => handleFieldChange(index, 'payment_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="coupon">Coupon Payment</SelectItem>
                          <SelectItem value="principal">Principal Payment</SelectItem>
                          <SelectItem value="dividend">Dividend</SelectItem>
                          <SelectItem value="interest">Interest</SelectItem>
                          <SelectItem value="redemption">Redemption</SelectItem>
                          <SelectItem value="maturity">Maturity Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Currency</Label>
                      <Select 
                        value={payment.currency || 'USD'} 
                        onValueChange={(value) => handleFieldChange(index, 'currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                          <SelectItem value="ETH">ETH</SelectItem>
                          <SelectItem value="BTC">BTC</SelectItem>
                          <SelectItem value="USDC">USDC</SelectItem>
                          <SelectItem value="USDT">USDT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Transaction Hash</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={payment.transaction_hash || ''} 
                          onChange={(e) => handleFieldChange(index, 'transaction_hash', e.target.value)} 
                          placeholder="0x..." 
                        />
                        {payment.transaction_hash && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`https://etherscan.io/tx/${payment.transaction_hash}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Payment Completed</Label>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={payment.is_completed || false} 
                          onCheckedChange={(checked) => handleFieldChange(index, 'is_completed', checked)} 
                        />
                        {payment.is_completed && <Badge variant="default">Completed</Badge>}
                        {!payment.is_completed && <Badge variant="outline">Pending</Badge>}
                      </div>
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
                No payment schedules defined. Click "Add Payment" to schedule payments.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-3525 Payment Schedules</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC3525PaymentSchedulesTab;