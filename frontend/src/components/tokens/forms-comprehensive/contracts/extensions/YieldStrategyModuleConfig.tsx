/**
 * Yield Strategy Module Configuration Component (ERC4626)
 * ✅ ENHANCED: Complete yield strategy configuration with multiple strategies
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, TrendingUp } from 'lucide-react';
import type { ModuleConfigProps, YieldStrategyModuleConfig } from '../types';

export function YieldStrategyModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<YieldStrategyModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        targetYieldBps: 0,
        harvestFrequency: undefined,
        rebalanceThreshold: undefined,
        strategies: [],
        autoCompound: undefined
      });
    } else {
      onChange({
        enabled: true,
        targetYieldBps: config.targetYieldBps || 500,
        harvestFrequency: config.harvestFrequency || 86400,
        rebalanceThreshold: config.rebalanceThreshold || 100,
        strategies: config.strategies || [],
        autoCompound: config.autoCompound !== false
      });
    }
  };

  const addStrategy = () => {
    onChange({
      ...config,
      strategies: [
        ...(config.strategies || []),
        { strategyAddress: '', allocationBps: 0, minAllocationBps: undefined, maxAllocationBps: undefined }
      ]
    });
  };

  const removeStrategy = (index: number) => {
    const newStrategies = [...(config.strategies || [])];
    newStrategies.splice(index, 1);
    onChange({ ...config, strategies: newStrategies });
  };

  const updateStrategy = (index: number, field: string, value: any) => {
    const newStrategies = [...(config.strategies || [])];
    newStrategies[index] = { ...newStrategies[index], [field]: value };
    onChange({ ...config, strategies: newStrategies });
  };

  const totalAllocation = (config.strategies || []).reduce((sum, s) => sum + (s.allocationBps || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Yield Strategy Module (ERC4626)</Label>
          <p className="text-xs text-muted-foreground">
            Configure yield generation strategies and auto-compounding
          </p>
        </div>
        <Switch checked={config.enabled} onCheckedChange={handleToggle} disabled={disabled} />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1 inline" />
              Yield strategies automatically deploy vault assets across multiple protocols 
              to optimize returns while managing risk through diversification.
            </AlertDescription>
          </Alert>

          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Target Yield</Label>
              <Input type="number" value={config.targetYieldBps} onChange={(e) => onChange({ ...config, targetYieldBps: parseInt(e.target.value) || 0 })} placeholder="500" disabled={disabled} min="0" />
              <p className="text-xs text-muted-foreground">Target annual yield: {(config.targetYieldBps / 100).toFixed(2)}%</p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Harvest & Rebalance</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Harvest Frequency (hours)</Label>
                  <Input type="number" value={Math.floor((config.harvestFrequency || 86400) / 3600)} onChange={(e) => onChange({ ...config, harvestFrequency: (parseInt(e.target.value) || 24) * 3600 })} placeholder="24" disabled={disabled} min="1" />
                </div>
                <div>
                  <Label className="text-xs">Rebalance Threshold (bps)</Label>
                  <Input type="number" value={config.rebalanceThreshold || 100} onChange={(e) => onChange({ ...config, rebalanceThreshold: parseInt(e.target.value) || 100 })} placeholder="100" disabled={disabled} min="1" />
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Strategies</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStrategy} disabled={disabled}>
                <Plus className="h-4 w-4 mr-2" />Add
              </Button>
            </div>
            {config.strategies && config.strategies.map((strategy, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <h4 className="text-sm font-medium">Strategy {index + 1}</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeStrategy(index)} disabled={disabled}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input value={strategy.strategyAddress} onChange={(e) => updateStrategy(index, 'strategyAddress', e.target.value)} placeholder="0x..." disabled={disabled} className="font-mono text-sm" />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Allocation (bps)</Label>
                      <Input type="number" value={strategy.allocationBps} onChange={(e) => updateStrategy(index, 'allocationBps', parseInt(e.target.value) || 0)} disabled={disabled} min="0" max="10000" />
                    </div>
                    <div>
                      <Label className="text-xs">Min (bps)</Label>
                      <Input type="number" value={strategy.minAllocationBps || ''} onChange={(e) => updateStrategy(index, 'minAllocationBps', e.target.value ? parseInt(e.target.value) : undefined)} disabled={disabled} />
                    </div>
                    <div>
                      <Label className="text-xs">Max (bps)</Label>
                      <Input type="number" value={strategy.maxAllocationBps || ''} onChange={(e) => updateStrategy(index, 'maxAllocationBps', e.target.value ? parseInt(e.target.value) : undefined)} disabled={disabled} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalAllocation !== 10000 && config.strategies && config.strategies.length > 0 && (
            <Alert><Info className="h-4 w-4" /><AlertDescription className="text-xs">Total allocation: {totalAllocation} bps (should equal 10,000 = 100%)</AlertDescription></Alert>
          )}

          <Card className="p-4 bg-muted/50">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="autoCompound" checked={config.autoCompound !== false} onChange={(e) => onChange({ ...config, autoCompound: e.target.checked })} disabled={disabled} className="h-4 w-4" />
              <Label htmlFor="autoCompound" className="text-sm cursor-pointer">Enable auto-compounding (reinvest yields)</Label>
            </div>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Yield strategies will be active immediately. 
              Assets will be deployed according to allocations.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
