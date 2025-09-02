import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { InfoCircledIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface FeeTier {
  id?: string;
  tierName: string;
  minBalance: string;
  maxBalance: string;
  managementFeeRate: string;
  performanceFeeRate: string;
  depositFeeRate: string;
  withdrawalFeeRate: string;
  tierBenefits: Record<string, any>;
  isActive: boolean;
}

interface ERC4626FeeTiersFormProps {
  feeTiers: FeeTier[];
  onChange: (feeTiers: FeeTier[]) => void;
}

/**
 * Form for managing fee tiers (token_erc4626_fee_tiers table)
 * Allows configuration of different fee structures based on balance tiers
 */
const ERC4626FeeTiersForm: React.FC<ERC4626FeeTiersFormProps> = ({ feeTiers, onChange }) => {
  const [localFeeTiers, setLocalFeeTiers] = useState<FeeTier[]>(feeTiers || []);

  useEffect(() => {
    setLocalFeeTiers(feeTiers || []);
  }, [feeTiers]);

  const handleFeeTierChange = (index: number, field: keyof FeeTier, value: any) => {
    const updatedFeeTiers = [...localFeeTiers];
    updatedFeeTiers[index] = { ...updatedFeeTiers[index], [field]: value };
    setLocalFeeTiers(updatedFeeTiers);
    onChange(updatedFeeTiers);
  };

  const handleBenefitChange = (tierIndex: number, benefitKey: string, value: any) => {
    const updatedFeeTiers = [...localFeeTiers];
    const currentBenefits = updatedFeeTiers[tierIndex].tierBenefits || {};
    updatedFeeTiers[tierIndex].tierBenefits = {
      ...currentBenefits,
      [benefitKey]: value
    };
    setLocalFeeTiers(updatedFeeTiers);
    onChange(updatedFeeTiers);
  };

  const addFeeTier = () => {
    const newFeeTier: FeeTier = {
      tierName: '',
      minBalance: '0',
      maxBalance: '',
      managementFeeRate: '2.0',
      performanceFeeRate: '20.0',
      depositFeeRate: '0.0',
      withdrawalFeeRate: '0.0',
      tierBenefits: {},
      isActive: true,
    };
    
    const updatedFeeTiers = [...localFeeTiers, newFeeTier];
    setLocalFeeTiers(updatedFeeTiers);
    onChange(updatedFeeTiers);
  };

  const removeFeeTier = (index: number) => {
    const updatedFeeTiers = localFeeTiers.filter((_, i) => i !== index);
    setLocalFeeTiers(updatedFeeTiers);
    onChange(updatedFeeTiers);
  };

  const addBenefit = (tierIndex: number) => {
    const benefitKey = prompt('Enter benefit name:');
    if (benefitKey) {
      handleBenefitChange(tierIndex, benefitKey, '');
    }
  };

  const removeBenefit = (tierIndex: number, benefitKey: string) => {
    const updatedFeeTiers = [...localFeeTiers];
    const currentBenefits = { ...updatedFeeTiers[tierIndex].tierBenefits };
    delete currentBenefits[benefitKey];
    updatedFeeTiers[tierIndex].tierBenefits = currentBenefits;
    setLocalFeeTiers(updatedFeeTiers);
    onChange(updatedFeeTiers);
  };

  const validateTierRanges = () => {
    const sortedTiers = [...localFeeTiers].sort((a, b) => 
      parseFloat(a.minBalance) - parseFloat(b.minBalance)
    );
    
    const errors: string[] = [];
    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const minBalance = parseFloat(tier.minBalance);
      const maxBalance = parseFloat(tier.maxBalance);
      
      if (maxBalance > 0 && minBalance >= maxBalance) {
        errors.push(`${tier.tierName}: Minimum balance must be less than maximum balance`);
      }
      
      if (i > 0) {
        const prevTier = sortedTiers[i - 1];
        const prevMaxBalance = parseFloat(prevTier.maxBalance);
        if (prevMaxBalance > 0 && minBalance <= prevMaxBalance) {
          errors.push(`${tier.tierName}: Overlaps with ${prevTier.tierName}`);
        }
      }
    }
    
    return errors;
  };

  const validationErrors = validateTierRanges();
  const hasValidationErrors = validationErrors.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Fee Tier Structure
          <Button onClick={addFeeTier} size="sm" variant="outline">
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Tier
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {localFeeTiers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No fee tiers configured.</p>
            <p className="text-sm">Add tiers to implement different fee structures based on user balance.</p>
          </div>
        ) : (
          localFeeTiers.map((tier, index) => (
            <Card key={index} className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-lg">Tier {index + 1}</CardTitle>
                    {tier.tierName && <Badge variant="outline">{tier.tierName}</Badge>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={tier.isActive}
                      onCheckedChange={(checked) => handleFeeTierChange(index, 'isActive', checked)}
                    />
                    <Label>Active</Label>
                    <Button
                      onClick={() => removeFeeTier(index)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tier Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`tierName-${index}`}>Tier Name *</Label>
                    <Input
                      id={`tierName-${index}`}
                      value={tier.tierName}
                      onChange={(e) => handleFeeTierChange(index, 'tierName', e.target.value)}
                      placeholder="e.g., Bronze, Silver, Gold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`minBalance-${index}`} className="flex items-center">
                      Minimum Balance
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoCircledIcon className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-80">Minimum vault token balance required for this tier</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id={`minBalance-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.minBalance}
                      onChange={(e) => handleFeeTierChange(index, 'minBalance', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`maxBalance-${index}`} className="flex items-center">
                      Maximum Balance
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoCircledIcon className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-80">Maximum vault token balance for this tier (0 for unlimited)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id={`maxBalance-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.maxBalance}
                      onChange={(e) => handleFeeTierChange(index, 'maxBalance', e.target.value)}
                      placeholder="0 for unlimited"
                    />
                  </div>
                </div>

                {/* Fee Rates */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`managementFeeRate-${index}`}>Management Fee (%)</Label>
                    <Input
                      id={`managementFeeRate-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.managementFeeRate}
                      onChange={(e) => handleFeeTierChange(index, 'managementFeeRate', e.target.value)}
                      placeholder="2.0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`performanceFeeRate-${index}`}>Performance Fee (%)</Label>
                    <Input
                      id={`performanceFeeRate-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.performanceFeeRate}
                      onChange={(e) => handleFeeTierChange(index, 'performanceFeeRate', e.target.value)}
                      placeholder="20.0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`depositFeeRate-${index}`}>Deposit Fee (%)</Label>
                    <Input
                      id={`depositFeeRate-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.depositFeeRate}
                      onChange={(e) => handleFeeTierChange(index, 'depositFeeRate', e.target.value)}
                      placeholder="0.0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`withdrawalFeeRate-${index}`}>Withdrawal Fee (%)</Label>
                    <Input
                      id={`withdrawalFeeRate-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.withdrawalFeeRate}
                      onChange={(e) => handleFeeTierChange(index, 'withdrawalFeeRate', e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                </div>

                {/* Tier Benefits */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Tier Benefits</Label>
                    <Button
                      onClick={() => addBenefit(index)}
                      size="sm"
                      variant="outline"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Benefit
                    </Button>
                  </div>

                  {Object.entries(tier.tierBenefits || {}).length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 border rounded-md">
                      No benefits configured for this tier.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(tier.tierBenefits || {}).map(([benefitKey, benefitValue]) => (
                        <div key={benefitKey} className="flex items-center space-x-2">
                          <Input
                            value={benefitKey}
                            onChange={(e) => {
                              const newKey = e.target.value;
                              if (newKey !== benefitKey) {
                                removeBenefit(index, benefitKey);
                                handleBenefitChange(index, newKey, benefitValue);
                              }
                            }}
                            placeholder="Benefit name"
                            className="w-1/3"
                          />
                          <Input
                            value={benefitValue as string}
                            onChange={(e) => handleBenefitChange(index, benefitKey, e.target.value)}
                            placeholder="Benefit description"
                            className="flex-1"
                          />
                          <Button
                            onClick={() => removeBenefit(index, benefitKey)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {hasValidationErrors && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-medium text-red-900 mb-2">Validation Errors</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {localFeeTiers.length > 0 && !hasValidationErrors && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
            <h4 className="font-medium text-purple-900 mb-2">Fee Tier Summary</h4>
            <div className="space-y-2 text-sm text-purple-800">
              <p>Total Tiers: {localFeeTiers.length}</p>
              <p>Active Tiers: {localFeeTiers.filter(t => t.isActive).length}</p>
              
              <div className="mt-3">
                <h5 className="font-medium text-purple-900 mb-1">Tier Breakdown:</h5>
                <div className="space-y-1 text-xs text-purple-700">
                  {localFeeTiers
                    .sort((a, b) => parseFloat(a.minBalance) - parseFloat(b.minBalance))
                    .map((tier, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{tier.tierName || `Tier ${index + 1}`}</span>
                        <span>
                          {tier.minBalance} - {tier.maxBalance || '∞'} | 
                          Mgmt: {tier.managementFeeRate}% | 
                          Perf: {tier.performanceFeeRate}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {localFeeTiers.length === 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">💡 Fee Tier Structure</h4>
            <p className="text-sm text-blue-800">
              Fee tiers allow you to offer different fee rates based on user balance. 
              Higher balance users typically receive lower fees as an incentive for larger deposits.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              Example: Bronze (0-1000): 2.5% mgmt, Silver (1000-10000): 2.0% mgmt, Gold (10000+): 1.5% mgmt
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ERC4626FeeTiersForm;