import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { InfoCircledIcon, PlusIcon, TrashIcon, GearIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface StrategyParam {
  id?: string;
  name: string;
  value: string;
  description: string;
  paramType: string;
  isRequired: boolean;
  defaultValue: string;
}

interface ERC4626StrategyParamsFormProps {
  strategyParams: StrategyParam[];
  onChange: (strategyParams: StrategyParam[]) => void;
}

/**
 * Form for managing strategy parameters (token_erc4626_strategy_params table)
 * Allows configuration of custom parameters for vault investment strategies
 */
const ERC4626StrategyParamsForm: React.FC<ERC4626StrategyParamsFormProps> = ({ strategyParams, onChange }) => {
  const [localStrategyParams, setLocalStrategyParams] = useState<StrategyParam[]>(strategyParams || []);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    setLocalStrategyParams(strategyParams || []);
  }, [strategyParams]);

  const handleParamChange = (index: number, field: keyof StrategyParam, value: any) => {
    const updatedParams = [...localStrategyParams];
    updatedParams[index] = { ...updatedParams[index], [field]: value };
    setLocalStrategyParams(updatedParams);
    onChange(updatedParams);
  };

  const addStrategyParam = () => {
    const newParam: StrategyParam = {
      name: '',
      value: '',
      description: '',
      paramType: 'string',
      isRequired: false,
      defaultValue: '',
    };
    
    const updatedParams = [...localStrategyParams, newParam];
    setLocalStrategyParams(updatedParams);
    onChange(updatedParams);
  };

  const removeStrategyParam = (index: number) => {
    const updatedParams = localStrategyParams.filter((_, i) => i !== index);
    setLocalStrategyParams(updatedParams);
    onChange(updatedParams);
  };

  const addPresetParam = (preset: Partial<StrategyParam>) => {
    const newParam: StrategyParam = {
      name: preset.name || '',
      value: preset.defaultValue || '',
      description: preset.description || '',
      paramType: preset.paramType || 'string',
      isRequired: preset.isRequired || false,
      defaultValue: preset.defaultValue || '',
    };
    
    const updatedParams = [...localStrategyParams, newParam];
    setLocalStrategyParams(updatedParams);
    onChange(updatedParams);
  };

  const validateParamValue = (param: StrategyParam): string | null => {
    if (param.isRequired && !param.value) {
      return 'Required parameter must have a value';
    }
    
    switch (param.paramType) {
      case 'number':
        if (param.value && isNaN(parseFloat(param.value))) {
          return 'Must be a valid number';
        }
        break;
      case 'percentage':
        const pctValue = parseFloat(param.value);
        if (param.value && (isNaN(pctValue) || pctValue < 0 || pctValue > 100)) {
          return 'Must be a valid percentage (0-100)';
        }
        break;
      case 'address':
        if (param.value && !/^0x[a-fA-F0-9]{40}$/.test(param.value)) {
          return 'Must be a valid Ethereum address';
        }
        break;
      case 'boolean':
        if (param.value && !['true', 'false', '1', '0'].includes(param.value.toLowerCase())) {
          return 'Must be true/false or 1/0';
        }
        break;
    }
    
    return null;
  };

  const getFilteredParams = () => {
    if (filterType === 'all') return localStrategyParams;
    return localStrategyParams.filter(param => param.paramType === filterType);
  };

  const paramTypes = [
    { value: 'string', label: 'String', icon: '📝' },
    { value: 'number', label: 'Number', icon: '🔢' },
    { value: 'percentage', label: 'Percentage', icon: '%' },
    { value: 'address', label: 'Address', icon: '🏠' },
    { value: 'boolean', label: 'Boolean', icon: '✓' },
    { value: 'duration', label: 'Duration', icon: '⏰' },
    { value: 'url', label: 'URL', icon: '🔗' },
    { value: 'json', label: 'JSON', icon: '{}' },
  ];

  const presetParams = [
    {
      name: 'slippageTolerance',
      description: 'Maximum allowed slippage for trades',
      paramType: 'percentage',
      defaultValue: '0.5',
      isRequired: true,
    },
    {
      name: 'rebalanceThreshold',
      description: 'Percentage deviation that triggers rebalancing',
      paramType: 'percentage',
      defaultValue: '5.0',
      isRequired: true,
    },
    {
      name: 'maxLeverage',
      description: 'Maximum leverage ratio allowed',
      paramType: 'number',
      defaultValue: '2.0',
      isRequired: false,
    },
    {
      name: 'liquidityReserve',
      description: 'Percentage of assets to keep as liquid reserves',
      paramType: 'percentage',
      defaultValue: '10.0',
      isRequired: true,
    },
    {
      name: 'oracleAddress',
      description: 'Price oracle contract address',
      paramType: 'address',
      defaultValue: '',
      isRequired: false,
    },
    {
      name: 'emergencyExitEnabled',
      description: 'Enable emergency exit functionality',
      paramType: 'boolean',
      defaultValue: 'true',
      isRequired: true,
    },
    {
      name: 'rebalanceInterval',
      description: 'Time interval between automatic rebalances',
      paramType: 'duration',
      defaultValue: '86400',
      isRequired: false,
    },
    {
      name: 'maxDrawdown',
      description: 'Maximum allowed drawdown before strategy pauses',
      paramType: 'percentage',
      defaultValue: '20.0',
      isRequired: false,
    },
  ];

  const getParamTypeColor = (paramType: string) => {
    switch (paramType) {
      case 'string': return 'bg-blue-100 text-blue-800';
      case 'number': return 'bg-green-100 text-green-800';
      case 'percentage': return 'bg-purple-100 text-purple-800';
      case 'address': return 'bg-orange-100 text-orange-800';
      case 'boolean': return 'bg-gray-100 text-gray-800';
      case 'duration': return 'bg-yellow-100 text-yellow-800';
      case 'url': return 'bg-cyan-100 text-cyan-800';
      case 'json': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderParamInput = (param: StrategyParam, index: number) => {
    switch (param.paramType) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={param.value === 'true' || param.value === '1'}
              onCheckedChange={(checked) => 
                handleParamChange(index, 'value', checked ? 'true' : 'false')
              }
            />
            <span className="text-sm text-muted-foreground">
              {param.value === 'true' || param.value === '1' ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        );
      case 'json':
        return (
          <Textarea
            value={param.value}
            onChange={(e) => handleParamChange(index, 'value', e.target.value)}
            placeholder={param.defaultValue || '{}'}
            rows={3}
            className="font-mono text-sm"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            step="any"
            value={param.value}
            onChange={(e) => handleParamChange(index, 'value', e.target.value)}
            placeholder={param.defaultValue}
          />
        );
      case 'percentage':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={param.value}
              onChange={(e) => handleParamChange(index, 'value', e.target.value)}
              placeholder={param.defaultValue}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        );
      default:
        return (
          <Input
            value={param.value}
            onChange={(e) => handleParamChange(index, 'value', e.target.value)}
            placeholder={param.defaultValue}
          />
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <GearIcon className="h-5 w-5 mr-2" />
            Strategy Parameters
          </div>
          <div className="flex items-center space-x-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {paramTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addStrategyParam} size="sm" variant="outline">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Parameter
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Parameters */}
        {localStrategyParams.length === 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Quick Start - Common Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {presetParams.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => addPresetParam(preset)}
                    className="text-left justify-start h-auto p-3"
                  >
                    <div>
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">{preset.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parameter List */}
        {getFilteredParams().length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No strategy parameters configured.</p>
            <p className="text-sm">
              {filterType !== 'all' 
                ? `No parameters of type "${filterType}" found.` 
                : 'Add parameters to customize your vault strategy behavior.'
              }
            </p>
          </div>
        ) : (
          getFilteredParams().map((param, index) => {
            const actualIndex = localStrategyParams.findIndex(p => p === param);
            const validationError = validateParamValue(param);
            
            return (
              <Card key={actualIndex} className={`border-l-4 ${validationError ? 'border-l-red-500' : 'border-l-indigo-500'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{param.name || `Parameter ${actualIndex + 1}`}</CardTitle>
                      <Badge className={getParamTypeColor(param.paramType)}>
                        {paramTypes.find(t => t.value === param.paramType)?.icon} {param.paramType}
                      </Badge>
                      {param.isRequired && (
                        <Badge variant="destructive">Required</Badge>
                      )}
                    </div>
                    <Button
                      onClick={() => removeStrategyParam(actualIndex)}
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
                      <Label htmlFor={`paramName-${actualIndex}`}>Parameter Name *</Label>
                      <Input
                        id={`paramName-${actualIndex}`}
                        value={param.name}
                        onChange={(e) => handleParamChange(actualIndex, 'name', e.target.value)}
                        placeholder="e.g., slippageTolerance"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`paramType-${actualIndex}`}>Parameter Type</Label>
                      <Select
                        value={param.paramType}
                        onValueChange={(value) => handleParamChange(actualIndex, 'paramType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {paramTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`description-${actualIndex}`}>Description</Label>
                    <Textarea
                      id={`description-${actualIndex}`}
                      value={param.description}
                      onChange={(e) => handleParamChange(actualIndex, 'description', e.target.value)}
                      placeholder="Describe what this parameter controls..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`paramValue-${actualIndex}`} className="flex items-center">
                        Current Value
                        {param.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderParamInput(param, actualIndex)}
                      {validationError && (
                        <p className="text-sm text-red-600">{validationError}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`defaultValue-${actualIndex}`}>Default Value</Label>
                      <Input
                        id={`defaultValue-${actualIndex}`}
                        value={param.defaultValue}
                        onChange={(e) => handleParamChange(actualIndex, 'defaultValue', e.target.value)}
                        placeholder="Enter default value"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`isRequired-${actualIndex}`}
                      checked={param.isRequired}
                      onCheckedChange={(checked) => handleParamChange(actualIndex, 'isRequired', checked)}
                    />
                    <Label htmlFor={`isRequired-${actualIndex}`} className="flex items-center">
                      Required Parameter
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoCircledIcon className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-80">Required parameters must have values before strategy can be activated</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Quick Add Presets (when params exist) */}
        {localStrategyParams.length > 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">Add Common Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {presetParams
                  .filter(preset => !localStrategyParams.some(param => param.name === preset.name))
                  .map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => addPresetParam(preset)}
                    >
                      + {preset.name}
                    </Button>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {localStrategyParams.length > 0 && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-md">
            <h4 className="font-medium text-indigo-900 mb-2">Parameter Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-indigo-800">
              <div>
                <p className="font-medium">Total Parameters:</p>
                <p>{localStrategyParams.length}</p>
              </div>
              <div>
                <p className="font-medium">Required:</p>
                <p>{localStrategyParams.filter(p => p.isRequired).length}</p>
              </div>
              <div>
                <p className="font-medium">Configured:</p>
                <p>{localStrategyParams.filter(p => p.value).length}</p>
              </div>
              <div>
                <p className="font-medium">Validation Errors:</p>
                <p className={localStrategyParams.filter(p => validateParamValue(p)).length > 0 ? 'text-red-600' : ''}>
                  {localStrategyParams.filter(p => validateParamValue(p)).length}
                </p>
              </div>
            </div>

            {/* Type Breakdown */}
            <div className="mt-3">
              <h5 className="font-medium text-indigo-900 mb-1">Type Breakdown:</h5>
              <div className="flex flex-wrap gap-1">
                {paramTypes.map(type => {
                  const count = localStrategyParams.filter(p => p.paramType === type.value).length;
                  return count > 0 ? (
                    <Badge key={type.value} className={getParamTypeColor(type.value)}>
                      {type.icon} {type.label}: {count}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ERC4626StrategyParamsForm;