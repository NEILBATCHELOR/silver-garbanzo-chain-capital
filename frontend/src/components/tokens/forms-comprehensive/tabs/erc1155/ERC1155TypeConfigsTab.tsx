// ERC-1155 Type Configs Tab - Type Configurations
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Settings, Zap } from 'lucide-react';
import { TokenERC1155TypeConfigsData, ConfigMode } from '../../types';

interface ERC1155TypeConfigsTabProps {
  data?: TokenERC1155TypeConfigsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1155TypeConfigsTab: React.FC<ERC1155TypeConfigsTabProps> = ({
  data = [],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false
}) => {
  const addNewConfig = () => {
    const newConfig: TokenERC1155TypeConfigsData = {
      token_type_id: '',
      supply_cap: '',
      mint_price: '0',
      is_tradeable: true,
      is_transferable: true,
      utility_type: '',
      rarity_tier: 'common',
      experience_value: 0,
      crafting_materials: {},
      burn_rewards: {}
    };
    onFieldChange('newRecord', newConfig, data.length);
  };

  const removeConfig = (index: number) => {
    if (confirm('Remove this type configuration?')) {
      onFieldChange('removeRecord', null, index);
    }
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const handleJsonChange = (index: number, field: string, value: string) => {
    try {
      const jsonValue = value ? JSON.parse(value) : {};
      handleFieldChange(index, field, jsonValue);
    } catch (error) {
      handleFieldChange(index, field, value);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Type Configurations ({data.length})
            </CardTitle>
            <Button onClick={addNewConfig} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Config
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((config, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Token Type ID</Label>
                      <Input
                        value={config.token_type_id || ''}
                        onChange={(e) => handleFieldChange(index, 'token_type_id', e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label>Supply Cap</Label>
                      <Input
                        value={config.supply_cap || ''}
                        onChange={(e) => handleFieldChange(index, 'supply_cap', e.target.value)}
                        placeholder="1000"
                      />
                    </div>
                    <div>
                      <Label>Mint Price (ETH)</Label>
                      <Input
                        value={config.mint_price || ''}
                        onChange={(e) => handleFieldChange(index, 'mint_price', e.target.value)}
                        placeholder="0.01"
                      />
                    </div>
                    <div>
                      <Label>Rarity Tier</Label>
                      <Select 
                        value={config.rarity_tier || 'common'} 
                        onValueChange={(value) => handleFieldChange(index, 'rarity_tier', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">Common</SelectItem>
                          <SelectItem value="uncommon">Uncommon</SelectItem>
                          <SelectItem value="rare">Rare</SelectItem>
                          <SelectItem value="epic">Epic</SelectItem>
                          <SelectItem value="legendary">Legendary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Utility Type</Label>
                      <Select 
                        value={config.utility_type || ''} 
                        onValueChange={(value) => handleFieldChange(index, 'utility_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select utility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weapon">Weapon</SelectItem>
                          <SelectItem value="armor">Armor</SelectItem>
                          <SelectItem value="consumable">Consumable</SelectItem>
                          <SelectItem value="material">Material</SelectItem>
                          <SelectItem value="tool">Tool</SelectItem>
                          <SelectItem value="collectible">Collectible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Experience Value</Label>
                      <Input
                        type="number"
                        value={config.experience_value || 0}
                        onChange={(e) => handleFieldChange(index, 'experience_value', parseInt(e.target.value) || 0)}
                        placeholder="10"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label>Tradeable</Label>
                        <Switch
                          checked={config.is_tradeable !== false}
                          onCheckedChange={(checked) => handleFieldChange(index, 'is_tradeable', checked)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>Transferable</Label>
                        <Switch
                          checked={config.is_transferable !== false}
                          onCheckedChange={(checked) => handleFieldChange(index, 'is_transferable', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Crafting Materials (JSON)</Label>
                      <Textarea
                        value={
                          typeof config.crafting_materials === 'object' 
                            ? JSON.stringify(config.crafting_materials, null, 2)
                            : config.crafting_materials || ''
                        }
                        onChange={(e) => handleJsonChange(index, 'crafting_materials', e.target.value)}
                        placeholder='{"wood": 2, "iron": 1}'
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Burn Rewards (JSON)</Label>
                      <Textarea
                        value={
                          typeof config.burn_rewards === 'object' 
                            ? JSON.stringify(config.burn_rewards, null, 2)
                            : config.burn_rewards || ''
                        }
                        onChange={(e) => handleJsonChange(index, 'burn_rewards', e.target.value)}
                        placeholder='{"exp": 10, "materials": {"wood": 1}}'
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeConfig(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No type configurations defined. Configure individual token type properties.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ERC1155TypeConfigsTab;