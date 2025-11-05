/**
 * Multi-Asset Vault Module Configuration Component
 * ✅ ENHANCED: Complete asset allocation pre-configured
 * Support multiple underlying assets in one vault (ERC4626)
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, PieChart, TrendingUp } from 'lucide-react';
import type { ModuleConfigProps, MultiAssetVaultModuleConfig } from '../types';

export function MultiAssetVaultModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<MultiAssetVaultModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false,
        assets: []
      });
    } else {
      onChange({
        ...config,
        enabled: true,
        maxAssets: config.maxAssets || 10,
        assets: config.assets || []
      });
    }
  };

  const addAsset = () => {
    const newAsset = {
      assetAddress: '',
      weight: 0,
      minWeight: 0,
      maxWeight: 10000
    };

    onChange({
      ...config,
      assets: [...(config.assets || []), newAsset]
    });
  };

  const removeAsset = (index: number) => {
    const newAssets = [...(config.assets || [])];
    newAssets.splice(index, 1);
    onChange({
      ...config,
      assets: newAssets
    });
  };

  const updateAsset = (index: number, field: string, value: any) => {
    const newAssets = [...(config.assets || [])];
    newAssets[index] = {
      ...newAssets[index],
      [field]: value
    };
    onChange({
      ...config,
      assets: newAssets
    });
  };

  // Calculate total weight
  const totalWeight = (config.assets || []).reduce((sum, asset) => sum + (asset.weight || 0), 0);
  const totalWeightPercentage = (totalWeight / 100).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Multi-Asset Vault Module</Label>
          <p className="text-xs text-muted-foreground">
            Support multiple underlying assets with automatic rebalancing
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <>
          {/* Configuration Card */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm">Vault Configuration</Label>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Max Assets */}
                <div>
                  <Label className="text-xs">Maximum Asset Types</Label>
                  <Input
                    type="number"
                    value={config.maxAssets}
                    onChange={(e) => onChange({
                      ...config,
                      maxAssets: parseInt(e.target.value) || 0
                    })}
                    disabled={disabled}
                    placeholder="10"
                    min="1"
                    max="100"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Maximum number of different assets the vault can hold
                  </p>
                </div>

                {/* Base Asset */}
                <div>
                  <Label className="text-xs">Base Asset (Optional)</Label>
                  <Input
                    value={config.baseAsset || ''}
                    onChange={(e) => onChange({
                      ...config,
                      baseAsset: e.target.value
                    })}
                    disabled={disabled}
                    placeholder="0x... (e.g., USDC)"
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Asset used for valuation calculations
                  </p>
                </div>

                {/* Price Oracle */}
                <div className="col-span-2">
                  <Label className="text-xs">Price Oracle Address</Label>
                  <Input
                    value={config.priceOracle || ''}
                    onChange={(e) => onChange({
                      ...config,
                      priceOracle: e.target.value
                    })}
                    disabled={disabled}
                    placeholder="0x... (Chainlink, Uniswap, etc.)"
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Oracle contract for asset pricing
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Rebalancing Settings */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Rebalancing Settings
              </Label>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Rebalance Threshold */}
                <div>
                  <Label className="text-xs">Rebalance Threshold (%)</Label>
                  <Input
                    type="number"
                    value={(config.rebalanceThreshold || 0) / 100}
                    onChange={(e) => onChange({
                      ...config,
                      rebalanceThreshold: Math.round(parseFloat(e.target.value) * 100) || 0
                    })}
                    disabled={disabled}
                    placeholder="5"
                    step="0.01"
                    min="0"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Deviation % that triggers rebalancing
                  </p>
                </div>

                {/* Rebalance Frequency */}
                <div>
                  <Label className="text-xs">Minimum Rebalance Interval (hours)</Label>
                  <Input
                    type="number"
                    value={(config.rebalanceFrequency || 0) / 3600}
                    onChange={(e) => onChange({
                      ...config,
                      rebalanceFrequency: Math.round(parseFloat(e.target.value) * 3600) || 0
                    })}
                    disabled={disabled}
                    placeholder="24"
                    min="0"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Minimum time between rebalances
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Asset Allocation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Asset Allocation
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAsset}
                disabled={disabled || (config.assets || []).length >= config.maxAssets}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </div>

            {/* Total Weight Alert */}
            {totalWeight !== 10000 && config.assets && config.assets.length > 0 && (
              <Alert variant={totalWeight > 10000 ? "destructive" : "default"}>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {totalWeight < 10000 && (
                    <>Total weight is <strong>{totalWeightPercentage}%</strong> (should be <strong>100%</strong>). Please add {((10000 - totalWeight) / 100).toFixed(2)}% more.</>
                  )}
                  {totalWeight > 10000 && (
                    <>Total weight is <strong>{totalWeightPercentage}%</strong> (exceeds <strong>100%</strong>). Please reduce by {((totalWeight - 10000) / 100).toFixed(2)}%.</>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Asset List */}
            {(!config.assets || config.assets.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No assets configured. Click "Add Asset" to define the asset allocation for your vault.
                </AlertDescription>
              </Alert>
            )}

            {config.assets && config.assets.map((asset, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">
                      Asset {index + 1}
                      {asset.weight > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({(asset.weight / 100).toFixed(2)}%)
                        </span>
                      )}
                    </h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAsset(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Asset Address */}
                    <div className="col-span-2">
                      <Label className="text-xs">Asset Address *</Label>
                      <Input
                        value={asset.assetAddress}
                        onChange={(e) => updateAsset(index, 'assetAddress', e.target.value)}
                        disabled={disabled}
                        placeholder="0x..."
                        className="font-mono text-sm"
                      />
                      {errors?.['assets']?.[index]?.['assetAddress'] && (
                        <p className="text-xs text-destructive mt-1">
                          {errors['assets'][index]['assetAddress']}
                        </p>
                      )}
                    </div>

                    {/* Target Weight */}
                    <div>
                      <Label className="text-xs">Target Weight (%) *</Label>
                      <Input
                        type="number"
                        value={(asset.weight || 0) / 100}
                        onChange={(e) => updateAsset(index, 'weight', Math.round(parseFloat(e.target.value) * 100) || 0)}
                        disabled={disabled}
                        placeholder="25"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Target allocation percentage
                      </p>
                    </div>

                    {/* Min Weight */}
                    <div>
                      <Label className="text-xs">Min Weight (%)</Label>
                      <Input
                        type="number"
                        value={(asset.minWeight || 0) / 100}
                        onChange={(e) => updateAsset(index, 'minWeight', Math.round(parseFloat(e.target.value) * 100) || 0)}
                        disabled={disabled}
                        placeholder="0"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                    </div>

                    {/* Max Weight */}
                    <div className="col-span-2">
                      <Label className="text-xs">Max Weight (%)</Label>
                      <Input
                        type="number"
                        value={(asset.maxWeight || 10000) / 100}
                        onChange={(e) => updateAsset(index, 'maxWeight', Math.round(parseFloat(e.target.value) * 100) || 10000)}
                        disabled={disabled}
                        placeholder="100"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  {asset.assetAddress && asset.weight > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>{(asset.weight / 100).toFixed(2)}%</strong> allocated to{' '}
                        <code className="text-[10px]">{asset.assetAddress.slice(0, 10)}...</code>
                        {asset.minWeight && asset.maxWeight && (
                          <> (range: {(asset.minWeight / 100).toFixed(2)}% - {(asset.maxWeight / 100).toFixed(2)}%)</>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> All asset allocations will be configured 
              automatically when the vault is deployed. The vault will maintain these target allocations 
              and rebalance when deviations exceed the threshold.
            </AlertDescription>
          </Alert>

          {/* Summary Card */}
          {config.assets && config.assets.length > 0 && (
            <Card className="p-3 bg-primary/10">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Assets:</span>
                  <span className="font-semibold">{config.assets.length} / {config.maxAssets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Weight:</span>
                  <span className={`font-semibold ${totalWeight === 10000 ? 'text-green-600' : 'text-destructive'}`}>
                    {totalWeightPercentage}%
                  </span>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
