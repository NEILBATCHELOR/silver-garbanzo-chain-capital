import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoCircledIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AssetAllocation {
  id?: string;
  asset: string;
  percentage: string;
  description: string;
  protocol: string;
  expectedApy: string;
}

interface ERC4626AssetAllocationsFormProps {
  allocations: AssetAllocation[];
  onChange: (allocations: AssetAllocation[]) => void;
}

/**
 * Form for managing asset allocations (token_erc4626_asset_allocations table)
 * Defines how vault assets are distributed across different assets/protocols
 */
const ERC4626AssetAllocationsForm: React.FC<ERC4626AssetAllocationsFormProps> = ({ allocations, onChange }) => {
  const [localAllocations, setLocalAllocations] = useState<AssetAllocation[]>(allocations || []);

  useEffect(() => {
    setLocalAllocations(allocations || []);
  }, [allocations]);

  const handleAllocationChange = (index: number, field: keyof AssetAllocation, value: any) => {
    const updatedAllocations = [...localAllocations];
    updatedAllocations[index] = { ...updatedAllocations[index], [field]: value };
    setLocalAllocations(updatedAllocations);
    onChange(updatedAllocations);
  };

  const addAllocation = () => {
    const newAllocation: AssetAllocation = {
      asset: '',
      percentage: '0',
      description: '',
      protocol: '',
      expectedApy: '',
    };
    
    const updatedAllocations = [...localAllocations, newAllocation];
    setLocalAllocations(updatedAllocations);
    onChange(updatedAllocations);
  };

  const removeAllocation = (index: number) => {
    const updatedAllocations = localAllocations.filter((_, i) => i !== index);
    setLocalAllocations(updatedAllocations);
    onChange(updatedAllocations);
  };

  const getTotalPercentage = () => {
    return localAllocations.reduce((total, allocation) => {
      return total + (parseFloat(allocation.percentage) || 0);
    }, 0);
  };

  const isPercentageValid = () => {
    const total = getTotalPercentage();
    return total <= 100;
  };

  const getWeightedApy = () => {
    const totalPercentage = getTotalPercentage();
    if (totalPercentage === 0) return 0;
    
    const weightedSum = localAllocations.reduce((sum, allocation) => {
      const percentage = parseFloat(allocation.percentage) || 0;
      const apy = parseFloat(allocation.expectedApy) || 0;
      return sum + (percentage * apy / 100);
    }, 0);
    
    return weightedSum;
  };

  // Common asset options for quick selection
  const commonAssets = [
    { value: 'USDC', label: 'USDC - USD Coin' },
    { value: 'USDT', label: 'USDT - Tether USD' },
    { value: 'DAI', label: 'DAI - MakerDAO USD' },
    { value: 'WETH', label: 'WETH - Wrapped Ethereum' },
    { value: 'WBTC', label: 'WBTC - Wrapped Bitcoin' },
    { value: 'FRAX', label: 'FRAX - Frax Protocol USD' },
    { value: 'LUSD', label: 'LUSD - Liquity USD' },
    { value: 'sUSD', label: 'sUSD - Synthetix USD' },
    { value: 'TUSD', label: 'TUSD - TrueUSD' },
    { value: 'BUSD', label: 'BUSD - Binance USD' },
    { value: 'custom', label: 'Custom Asset' },
  ];

  const commonProtocols = [
    'Aave',
    'Compound',
    'Uniswap V3',
    'Curve',
    'Convex',
    'Yearn',
    'Balancer',
    'SushiSwap',
    'MakerDAO',
    'Lido',
    'Rocket Pool',
    'Frax Finance',
    'Liquity',
    'Euler',
    'Morpho',
    'Custom',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Asset Allocations
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${isPercentageValid() ? 'text-green-600' : 'text-red-600'}`}>
              Total: {getTotalPercentage().toFixed(2)}%
            </span>
            <Button onClick={addAllocation} size="sm" variant="outline">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Allocation
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {localAllocations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No asset allocations configured.</p>
            <p className="text-sm">Add allocations to define how vault assets are distributed.</p>
          </div>
        ) : (
          localAllocations.map((allocation, index) => (
            <Card key={index} className="border-l-4 border-l-green-500">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Allocation {index + 1}</CardTitle>
                  <Button
                    onClick={() => removeAllocation(index)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`asset-${index}`}>Asset *</Label>
                    <Select
                      value={allocation.asset}
                      onValueChange={(value) => handleAllocationChange(index, 'asset', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonAssets.map((asset) => (
                          <SelectItem key={asset.value} value={asset.value}>
                            {asset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {allocation.asset === 'custom' && (
                      <Input
                        placeholder="Enter custom asset symbol"
                        value={allocation.asset}
                        onChange={(e) => handleAllocationChange(index, 'asset', e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`percentage-${index}`} className="flex items-center">
                      Allocation Percentage (%) *
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoCircledIcon className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-80">Percentage of vault assets allocated to this asset</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id={`percentage-${index}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={allocation.percentage}
                      onChange={(e) => handleAllocationChange(index, 'percentage', e.target.value)}
                      placeholder="25.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`protocol-${index}`}>Protocol</Label>
                    <Select
                      value={allocation.protocol}
                      onValueChange={(value) => handleAllocationChange(index, 'protocol', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select protocol" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonProtocols.map((protocol) => (
                          <SelectItem key={protocol} value={protocol}>
                            {protocol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {allocation.protocol === 'Custom' && (
                      <Input
                        placeholder="Enter custom protocol name"
                        value={allocation.protocol}
                        onChange={(e) => handleAllocationChange(index, 'protocol', e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`expectedApy-${index}`}>Expected APY (%)</Label>
                    <Input
                      id={`expectedApy-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={allocation.expectedApy}
                      onChange={(e) => handleAllocationChange(index, 'expectedApy', e.target.value)}
                      placeholder="5.25"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <Textarea
                    id={`description-${index}`}
                    value={allocation.description}
                    onChange={(e) => handleAllocationChange(index, 'description', e.target.value)}
                    placeholder="Describe the allocation strategy and rationale..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {!isPercentageValid() && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              ⚠️ Total allocation exceeds 100%. Please adjust the percentages.
            </p>
          </div>
        )}

        {localAllocations.length > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium text-green-900 mb-2">Allocation Summary</h4>
            <div className="space-y-1 text-sm text-green-800">
              <p>Total Allocations: {localAllocations.length}</p>
              <p>Total Percentage: {getTotalPercentage().toFixed(2)}%</p>
              <p>Remaining: {(100 - getTotalPercentage()).toFixed(2)}%</p>
              <p>Weighted Average APY: {getWeightedApy().toFixed(2)}%</p>
            </div>
            
            {localAllocations.length > 0 && (
              <div className="mt-3">
                <h5 className="font-medium text-green-900 mb-1">Asset Breakdown:</h5>
                <div className="space-y-1 text-xs text-green-700">
                  {localAllocations.map((allocation, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{allocation.asset || `Asset ${index + 1}`}</span>
                      <span>{allocation.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {getTotalPercentage() < 100 && localAllocations.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">
              💡 You have {(100 - getTotalPercentage()).toFixed(2)}% unallocated. 
              Consider allocating to cash/reserves or adding more assets.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ERC4626AssetAllocationsForm;