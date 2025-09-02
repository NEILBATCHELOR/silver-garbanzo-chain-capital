// ERC-1400 Partition Transfers Tab - Token Partition Transfer History
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowRight, ExternalLink } from 'lucide-react';
import { TokenERC1400PartitionTransfersData, ConfigMode } from '../../types';

interface ERC1400PartitionTransfersTabProps {
  data?: TokenERC1400PartitionTransfersData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1400PartitionTransfersTab: React.FC<ERC1400PartitionTransfersTabProps> = ({
  data = [], validationErrors = {}, isModified = false, configMode, onFieldChange, onValidate, isSubmitting = false
}) => {
  const addNew = () => onFieldChange('newRecord', { from_address: '', to_address: '', amount: '0', timestamp: new Date().toISOString() }, data.length);
  const remove = (index: number) => onFieldChange('removeRecord', null, index);
  const handleFieldChange = (index: number, field: string, value: any) => onFieldChange(field, value, index);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Partition Transfers ({data.length})
            </CardTitle>
            <Button onClick={addNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Transfer</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((transfer, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>From Address</Label>
                      <Input value={transfer.from_address || ''} onChange={(e) => handleFieldChange(index, 'from_address', e.target.value)} placeholder="0x..." />
                    </div>
                    <div>
                      <Label>To Address</Label>
                      <Input value={transfer.to_address || ''} onChange={(e) => handleFieldChange(index, 'to_address', e.target.value)} placeholder="0x..." />
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input value={transfer.amount || ''} onChange={(e) => handleFieldChange(index, 'amount', e.target.value)} placeholder="100.0" />
                    </div>
                    <div>
                      <Label>Operator (Optional)</Label>
                      <Input value={transfer.operator_address || ''} onChange={(e) => handleFieldChange(index, 'operator_address', e.target.value)} placeholder="0x..." />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Transaction Hash</Label>
                      <div className="flex gap-2">
                        <Input value={transfer.transaction_hash || ''} onChange={(e) => handleFieldChange(index, 'transaction_hash', e.target.value)} placeholder="0x..." />
                        {transfer.transaction_hash && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`https://etherscan.io/tx/${transfer.transaction_hash}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Timestamp</Label>
                      <Input type="datetime-local" value={transfer.timestamp?.slice(0, 16) || ''} onChange={(e) => handleFieldChange(index, 'timestamp', e.target.value + ':00.000Z')} />
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
                No partition transfers recorded. Click "Add Transfer" to track transfers.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">ERC-1400 Partition Transfers</span>
        </div>
        <Button onClick={onValidate} variant="outline" size="sm" disabled={isSubmitting}>Validate</Button>
      </div>
    </div>
  );
};

export default ERC1400PartitionTransfersTab;