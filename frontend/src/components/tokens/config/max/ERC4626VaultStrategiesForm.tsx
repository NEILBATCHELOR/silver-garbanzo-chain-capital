import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoCircledIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VaultStrategy {
  id?: string;
  strategyName: string;
  strategyType: string;
  protocolAddress: string;
  protocolName: string;
  allocationPercentage: string;
  minAllocationPercentage: string;
  maxAllocationPercentage: string;
  riskScore: number;
  expectedApy: string;
  actualApy: string;
  isActive: boolean;
  lastRebalance?: string;
}

interface ERC4626VaultStrategiesFormProps {
  strategies: VaultStrategy[];
  onChange: (strategies: VaultStrategy[]) => void;
}

/**
 * Form for managing vault strategies (token_erc4626_vault_strategies table)
 * Allows configuration of multiple investment strategies for the vault
 */
const ERC4626VaultStrategiesForm: React.FC<ERC4626VaultStrategiesFormProps> = ({ strategies, onChange }) => {
  const [localStrategies, setLocalStrategies] = useState<VaultStrategy[]>(strategies || []);

  useEffect(() => {
    setLocalStrategies(strategies || []);
  }, [strategies]);

  const handleStrategyChange = (index: number, field: keyof VaultStrategy, value: any) => {
    const updatedStrategies = [...localStrategies];
    updatedStrategies[index] = { ...updatedStrategies[index], [field]: value };
    setLocalStrategies(updatedStrategies);
    onChange(updatedStrategies);
  };

  const addStrategy = () => {
    const newStrategy: VaultStrategy = {
      strategyName: '',
      strategyType: 'yield_farming',
      protocolAddress: '',
      protocolName: '',
      allocationPercentage: '0',
      minAllocationPercentage: '0',
      maxAllocationPercentage: '100',
      riskScore: 5,
      expectedApy: '',
      actualApy: '',
      isActive: true,
    };
    
    const updatedStrategies = [...localStrategies, newStrategy];
    setLocalStrategies(updatedStrategies);
    onChange(updatedStrategies);
  };

  const removeStrategy = (index: number) => {
    const updatedStrategies = localStrategies.filter((_, i) => i !== index);
    setLocalStrategies(updatedStrategies);
    onChange(updatedStrategies);
  };

  const getTotalAllocation = () => {
    return localStrategies.reduce((total, strategy) => {
      return total + (parseFloat(strategy.allocationPercentage) || 0);
    }, 0);
  };

  const isAllocationValid = () => {
    const total = getTotalAllocation();
    return total <= 100;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Vault Investment Strategies
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${isAllocationValid() ? 'text-green-600' : 'text-red-600'}`}>
              Total Allocation: {getTotalAllocation().toFixed(2)}%
            </span>
            <Button onClick={addStrategy} size="sm" variant="outline">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Strategy
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {localStrategies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No investment strategies configured.</p>
            <p className="text-sm">Add strategies to define how the vault will invest deposited assets.</p>
          </div>
        ) : (
          localStrategies.map((strategy, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Strategy {index + 1}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={strategy.isActive}
                      onCheckedChange={(checked) => handleStrategyChange(index, 'isActive', checked)}
                    />
                    <Label>Active</Label>
                    <Button
                      onClick={() => removeStrategy(index)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`strategyName-${index}`}>Strategy Name *</Label>
                    <Input
                      id={`strategyName-${index}`}
                      value={strategy.strategyName}
                      onChange={(e) => handleStrategyChange(index, 'strategyName', e.target.value)}
                      placeholder="e.g., AAVE Lending Strategy"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`strategyType-${index}`}>Strategy Type</Label>
                    <Select
                      value={strategy.strategyType}
                      onValueChange={(value) => handleStrategyChange(index, 'strategyType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select strategy type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yield_farming">Yield Farming</SelectItem>
                        <SelectItem value="lending">Lending</SelectItem>
                        <SelectItem value="staking">Staking</SelectItem>
                        <SelectItem value="liquidity_provision">Liquidity Provision</SelectItem>
                        <SelectItem value="arbitrage">Arbitrage</SelectItem>
                        <SelectItem value="delta_neutral">Delta Neutral</SelectItem>
                        <SelectItem value="leveraged_farming">Leveraged Farming</SelectItem>
                        <SelectItem value="options_strategy">Options Strategy</SelectItem>
                        <SelectItem value="perp_trading">Perpetual Trading</SelectItem>
                        <SelectItem value="cross_chain">Cross Chain</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`protocolName-${index}`}>Protocol Name</Label>
                    <Input
                      id={`protocolName-${index}`}
                      value={strategy.protocolName}
                      onChange={(e) => handleStrategyChange(index, 'protocolName', e.target.value)}
                      placeholder="e.g., Aave, Compound, Uniswap"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`protocolAddress-${index}`}>Protocol Address</Label>
                    <Input
                      id={`protocolAddress-${index}`}
                      value={strategy.protocolAddress}
                      onChange={(e) => handleStrategyChange(index, 'protocolAddress', e.target.value)}
                      placeholder="0x..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`allocationPercentage-${index}`} className="flex items-center">
                      Target Allocation (%) *
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoCircledIcon className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-80">Percentage of vault assets to allocate to this strategy</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id={`allocationPercentage-${index}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={strategy.allocationPercentage}
                      onChange={(e) => handleStrategyChange(index, 'allocationPercentage', e.target.value)}
                      placeholder="25.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`minAllocationPercentage-${index}`}>Min Allocation (%)</Label>
                    <Input
                      id={`minAllocationPercentage-${index}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={strategy.minAllocationPercentage}
                      onChange={(e) => handleStrategyChange(index, 'minAllocationPercentage', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`maxAllocationPercentage-${index}`}>Max Allocation (%)</Label>
                    <Input
                      id={`maxAllocationPercentage-${index}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={strategy.maxAllocationPercentage}
                      onChange={(e) => handleStrategyChange(index, 'maxAllocationPercentage', e.target.value)}
                      placeholder="100.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`riskScore-${index}`} className="flex items-center">
                      Risk Score (1-10)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoCircledIcon className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-80">Risk rating from 1 (low risk) to 10 (high risk)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id={`riskScore-${index}`}
                      type="number"
                      min="1"
                      max="10"
                      value={strategy.riskScore}
                      onChange={(e) => handleStrategyChange(index, 'riskScore', parseInt(e.target.value) || 5)}
                      placeholder="5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`expectedApy-${index}`}>Expected APY (%)</Label>
                    <Input
                      id={`expectedApy-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={strategy.expectedApy}
                      onChange={(e) => handleStrategyChange(index, 'expectedApy', e.target.value)}
                      placeholder="8.50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`actualApy-${index}`}>Actual APY (%) - Read Only</Label>
                    <Input
                      id={`actualApy-${index}`}
                      type="number"
                      value={strategy.actualApy}
                      onChange={(e) => handleStrategyChange(index, 'actualApy', e.target.value)}
                      placeholder="Will be updated by performance tracking"
                      disabled
                    />
                  </div>
                </div>

                {strategy.lastRebalance && (
                  <div className="text-sm text-muted-foreground">
                    Last rebalanced: {new Date(strategy.lastRebalance).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}

        {!isAllocationValid() && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              ⚠️ Total allocation exceeds 100%. Please adjust the allocation percentages.
            </p>
          </div>
        )}

        {localStrategies.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">Strategy Summary</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <p>Total Strategies: {localStrategies.length}</p>
              <p>Active Strategies: {localStrategies.filter(s => s.isActive).length}</p>
              <p>Total Allocation: {getTotalAllocation().toFixed(2)}%</p>
              <p>Remaining Allocation: {(100 - getTotalAllocation()).toFixed(2)}%</p>
              <p>Average Risk Score: {(localStrategies.reduce((sum, s) => sum + s.riskScore, 0) / localStrategies.length).toFixed(1)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ERC4626VaultStrategiesForm;