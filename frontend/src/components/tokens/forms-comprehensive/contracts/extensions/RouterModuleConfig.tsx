/**
 * Router Module Configuration Component
 * ✅ ENHANCED: Complete routing configuration pre-deployment
 * Routes deposits across multiple vaults for diversification (ERC4626)
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Route, ArrowRightLeft } from 'lucide-react';
import type { ModuleConfigProps, RouterModuleConfig } from '../types';

export function RouterModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<RouterModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false,
        allowedVaults: []
      });
    } else {
      onChange({
        ...config,
        enabled: true,
        allowedVaults: config.allowedVaults || []
      });
    }
  };

  const addVault = () => {
    onChange({
      ...config,
      allowedVaults: [...(config.allowedVaults || []), '']
    });
  };

  const removeVault = (index: number) => {
    const newVaults = [...(config.allowedVaults || [])];
    newVaults.splice(index, 1);
    onChange({
      ...config,
      allowedVaults: newVaults
    });
  };

  const updateVault = (index: number, value: string) => {
    const newVaults = [...(config.allowedVaults || [])];
    newVaults[index] = value;
    onChange({
      ...config,
      allowedVaults: newVaults
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Router Module</Label>
          <p className="text-xs text-muted-foreground">
            Route deposits across multiple vaults for diversification and yield optimization
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
          {/* Router Configuration */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2">
                <Route className="h-4 w-4" />
                Router Configuration
              </Label>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Router Address */}
                <div className="col-span-2">
                  <Label className="text-xs">Router Contract Address</Label>
                  <Input
                    value={config.routerAddress || ''}
                    onChange={(e) => onChange({
                      ...config,
                      routerAddress: e.target.value
                    })}
                    disabled={disabled}
                    placeholder="0x... (leave empty to deploy new router)"
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Existing router address or leave empty to deploy a new one
                  </p>
                </div>

                {/* Slippage Tolerance */}
                <div>
                  <Label className="text-xs">Slippage Tolerance (%)</Label>
                  <Input
                    type="number"
                    value={(config.slippageTolerance || 0) / 100}
                    onChange={(e) => onChange({
                      ...config,
                      slippageTolerance: Math.round(parseFloat(e.target.value) * 100) || 0
                    })}
                    disabled={disabled}
                    placeholder="1.0"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Maximum slippage allowed (basis points)
                  </p>
                </div>

                {/* Enable Multi-Hop Routing */}
                <div className="col-span-2 flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="enableMultiHopRouting"
                    checked={config.enableMultiHopRouting || false}
                    onChange={(e) => onChange({
                      ...config,
                      enableMultiHopRouting: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="enableMultiHopRouting" className="text-xs font-normal cursor-pointer flex items-center gap-2">
                    <ArrowRightLeft className="h-3 w-3" />
                    Enable multi-hop routing (route through intermediate vaults)
                  </Label>
                </div>
              </div>
            </div>
          </Card>

          {/* Allowed Vaults */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Allowed Vaults</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVault}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Vault
              </Button>
            </div>

            {/* Vault List */}
            {(!config.allowedVaults || config.allowedVaults.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No vaults configured. Click "Add Vault" to specify which vaults this router can deposit into.
                </AlertDescription>
              </Alert>
            )}

            {config.allowedVaults && config.allowedVaults.map((vault, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs">Vault {index + 1} Address *</Label>
                    <Input
                      value={vault}
                      onChange={(e) => updateVault(index, e.target.value)}
                      disabled={disabled}
                      placeholder="0x..."
                      className="font-mono text-sm mt-1"
                    />
                    {errors?.['allowedVaults']?.[index] && (
                      <p className="text-xs text-destructive mt-1">
                        {errors['allowedVaults'][index]}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVault(index)}
                    disabled={disabled}
                    className="mt-5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Routing Examples */}
          {config.allowedVaults && config.allowedVaults.length > 1 && (
            <Card className="p-4 bg-muted/50">
              <div className="space-y-2">
                <Label className="text-sm">Routing Examples</Label>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Deposits can be automatically routed to any of the {config.allowedVaults.length} configured vaults</p>
                  <p>• Router optimizes for best yield across all allowed vaults</p>
                  {config.enableMultiHopRouting && (
                    <p>• Multi-hop routing enabled: can route through intermediate vaults for better rates</p>
                  )}
                  {config.slippageTolerance && (
                    <p>• Max slippage: {(config.slippageTolerance / 100).toFixed(2)}%</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> The router will be configured 
              automatically when deployed. It will optimize deposits across all allowed vaults 
              to maximize yield while respecting slippage constraints.
            </AlertDescription>
          </Alert>

          {/* Summary Card */}
          {config.allowedVaults && config.allowedVaults.length > 0 && (
            <Card className="p-3 bg-primary/10">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allowed Vaults:</span>
                  <span className="font-semibold">{config.allowedVaults.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Multi-Hop:</span>
                  <span className="font-semibold">{config.enableMultiHopRouting ? 'Enabled' : 'Disabled'}</span>
                </div>
                {config.slippageTolerance !== undefined && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Max Slippage:</span>
                    <span className="font-semibold">{(config.slippageTolerance / 100).toFixed(2)}%</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
