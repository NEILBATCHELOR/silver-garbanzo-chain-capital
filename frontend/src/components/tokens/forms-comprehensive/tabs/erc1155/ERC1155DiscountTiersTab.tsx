// ERC-1155 Discount Tiers Tab - Pricing Tiers Management
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Percent, TrendingDown } from 'lucide-react';
import { TokenERC1155DiscountTiersData, ConfigMode } from '../../types';

interface ERC1155DiscountTiersTabProps {
  data?: TokenERC1155DiscountTiersData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1155DiscountTiersTab: React.FC<ERC1155DiscountTiersTabProps> = ({
  data = [],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false
}) => {
  const addNewTier = () => {
    const newTier: TokenERC1155DiscountTiersData = {
      tier_name: '',
      min_quantity: 1,
      max_quantity: null,
      discount_percentage: '0',
      is_active: true
    };
    onFieldChange('newRecord', newTier, data.length);
  };

  const removeTier = (index: number) => {
    if (confirm('Remove this discount tier?')) {
      onFieldChange('removeRecord', null, index);
    }
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const getFieldError = (index: number, field: string) => {
    return validationErrors[`${index}.${field}`] || [];
  };

  const hasFieldError = (index: number, field: string) => {
    return getFieldError(index, field).length > 0;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              Discount Tiers ({data.length})
            </CardTitle>
            <Button onClick={addNewTier} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Tier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((tier, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Tier Name</Label>
                      <Input
                        value={tier.tier_name || ''}
                        onChange={(e) => handleFieldChange(index, 'tier_name', e.target.value)}
                        placeholder="Bulk Buyer"
                      />
                    </div>
                    <div>
                      <Label>Min Quantity</Label>
                      <Input
                        type="number"
                        value={tier.min_quantity || ''}
                        onChange={(e) => handleFieldChange(index, 'min_quantity', parseInt(e.target.value) || 1)}
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <Label>Max Quantity</Label>
                      <Input
                        type="number"
                        value={tier.max_quantity || ''}
                        onChange={(e) => handleFieldChange(index, 'max_quantity', parseInt(e.target.value) || null)}
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <Label>Discount %</Label>
                      <Input
                        value={tier.discount_percentage || ''}
                        onChange={(e) => handleFieldChange(index, 'discount_percentage', e.target.value)}
                        placeholder="5"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active_${index}`}>Active</Label>
                      <Switch
                        id={`active_${index}`}
                        checked={tier.is_active !== false}
                        onCheckedChange={(checked) => handleFieldChange(index, 'is_active', checked)}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeTier(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No discount tiers defined. Create tiers to offer bulk pricing.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ERC1155DiscountTiersTab;