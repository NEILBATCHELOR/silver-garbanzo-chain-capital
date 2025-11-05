/**
 * Supply Cap Module Configuration Component
 * ✅ ENHANCED: Complete per-token supply cap management
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, TrendingUp } from 'lucide-react';
import type { ModuleConfigProps, SupplyCapModuleConfig } from '../types';

export function SupplyCapModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<SupplyCapModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        defaultCap: 0,
        perTokenCaps: [],
        enforceGlobalCap: false,
        globalCap: undefined
      });
    } else {
      onChange({
        enabled: true,
        defaultCap: config.defaultCap || 0,
        perTokenCaps: config.perTokenCaps || [],
        enforceGlobalCap: config.enforceGlobalCap || false,
        globalCap: config.globalCap
      });
    }
  };

  const addTokenCap = () => {
    const newCap = {
      tokenId: '',
      cap: 0
    };

    onChange({
      ...config,
      perTokenCaps: [...(config.perTokenCaps || []), newCap]
    });
  };

  const removeTokenCap = (index: number) => {
    const newCaps = [...(config.perTokenCaps || [])];
    newCaps.splice(index, 1);
    onChange({
      ...config,
      perTokenCaps: newCaps
    });
  };

  const updateTokenCap = (index: number, field: 'tokenId' | 'cap', value: string | number) => {
    const newCaps = [...(config.perTokenCaps || [])];
    newCaps[index] = {
      ...newCaps[index],
      [field]: value
    };
    onChange({
      ...config,
      perTokenCaps: newCaps
    });
  };

  const totalPerTokenCaps = (config.perTokenCaps || []).reduce(
    (sum, cap) => sum + (parseInt(cap.cap.toString()) || 0), 
    0
  );

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Supply Cap Module</Label>
          <p className="text-xs text-muted-foreground">
            Configure maximum supply limits per token ID
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
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Set supply caps to create scarcity and enforce limited editions. 
              Ideal for collectibles, game items, and exclusive content.
            </AlertDescription>
          </Alert>

          {/* Default Cap */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm">Default Supply Cap</Label>
              <Input
                type="number"
                value={config.defaultCap}
                onChange={(e) => onChange({
                  ...config,
                  defaultCap: parseInt(e.target.value) || 0
                })}
                placeholder="0"
                disabled={disabled}
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Default maximum supply for each token ID (0 = unlimited)
              </p>
            </div>
          </Card>

          {/* Global Cap */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enforceGlobalCap"
                  checked={config.enforceGlobalCap || false}
                  onChange={(e) => onChange({
                    ...config,
                    enforceGlobalCap: e.target.checked,
                    globalCap: e.target.checked ? config.globalCap || 0 : undefined
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="enforceGlobalCap" className="text-sm font-medium cursor-pointer">
                  Enforce Global Supply Cap
                </Label>
              </div>

              {config.enforceGlobalCap && (
                <div className="space-y-2 pl-6">
                  <Label className="text-xs">Global Cap (all tokens combined)</Label>
                  <Input
                    type="number"
                    value={config.globalCap || 0}
                    onChange={(e) => onChange({
                      ...config,
                      globalCap: parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                    disabled={disabled}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum total supply across all token IDs
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Per-Token Caps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Per-Token Supply Caps</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTokenCap}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Token Cap
              </Button>
            </div>

            {(!config.perTokenCaps || config.perTokenCaps.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  No specific token caps configured. All tokens will use the default cap.
                  Add token-specific caps to override the default for particular token IDs.
                </AlertDescription>
              </Alert>
            )}

            {config.perTokenCaps && config.perTokenCaps.map((tokenCap, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Token Cap {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTokenCap(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Token ID *</Label>
                      <Input
                        value={tokenCap.tokenId}
                        onChange={(e) => updateTokenCap(index, 'tokenId', e.target.value)}
                        disabled={disabled}
                        placeholder="1"
                      />
                      {errors?.['perTokenCaps']?.[index]?.['tokenId'] && (
                        <p className="text-xs text-destructive mt-1">
                          {errors['perTokenCaps'][index]['tokenId']}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs">Supply Cap *</Label>
                      <Input
                        type="number"
                        value={tokenCap.cap}
                        onChange={(e) => updateTokenCap(index, 'cap', parseInt(e.target.value) || 0)}
                        disabled={disabled}
                        placeholder="1000"
                        min="0"
                      />
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Token ID <strong>{tokenCap.tokenId || '?'}</strong> will have a maximum supply of{' '}
                      <strong>{tokenCap.cap || 0}</strong> units
                    </AlertDescription>
                  </Alert>
                </div>
              </Card>
            ))}
          </div>

          {/* Summary Card */}
          {(config.perTokenCaps && config.perTokenCaps.length > 0) && (
            <Card className="p-4 bg-primary/5">
              <div className="space-y-2">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                  <Label className="text-sm font-medium">Supply Configuration Summary</Label>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pl-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Default cap:</span>
                    <span className="font-semibold">
                      {config.defaultCap === 0 ? 'Unlimited' : config.defaultCap}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custom caps:</span>
                    <span className="font-semibold">{config.perTokenCaps.length} tokens</span>
                  </div>
                  {config.enforceGlobalCap && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Global cap:</span>
                      <span className="font-semibold">{config.globalCap || 0}</span>
                    </div>
                  )}
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Total custom caps:</span>
                    <span className="font-semibold">{totalPerTokenCaps}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Supply Cap Examples */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Supply Cap Examples</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Limited Edition NFT:</strong> Token ID 1, Cap: 100 (only 100 will ever exist)</p>
                <p><strong>In-Game Currency:</strong> Token ID 2, Cap: 1,000,000 (max currency supply)</p>
                <p><strong>Collectible Series:</strong> Default cap: 500 (all items limited to 500 each)</p>
                <p><strong>Unlimited Base Items:</strong> Default cap: 0 (no supply limit)</p>
              </div>
            </div>
          </Card>

          {/* Pre-deployment Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Supply caps will be enforced immediately 
              upon deployment. Minting beyond these caps will be automatically prevented on-chain.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
