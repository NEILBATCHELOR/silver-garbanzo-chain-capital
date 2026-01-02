/**
 * Supply Cap Module Configuration Component
 * ✅ NEW: Complete per-token supply management for ERC1155
 * Enforces supply limits per token ID with global cap option
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, TrendingUp, Lock } from 'lucide-react';
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
        ...config,
        enabled: false
      });
    } else {
      onChange({
        ...config,
        enabled: true,
        globalCap: config.globalCap || 0, // 0 = unlimited
        defaultCap: config.defaultCap || 0,
        perTokenCaps: config.perTokenCaps || [],
        enforceGlobalCap: config.enforceGlobalCap !== false // Default true
      });
    }
  };

  const addPerTokenCap = () => {
    const newPerTokenCaps = [
      ...(config.perTokenCaps || []),
      {
        tokenId: '',
        cap: 0
      }
    ];
    onChange({
      ...config,
      perTokenCaps: newPerTokenCaps
    });
  };

  const removePerTokenCap = (index: number) => {
    const newPerTokenCaps = [...(config.perTokenCaps || [])];
    newPerTokenCaps.splice(index, 1);
    onChange({
      ...config,
      perTokenCaps: newPerTokenCaps
    });
  };

  const updatePerTokenCap = (index: number, field: 'tokenId' | 'cap', value: string) => {
    const newPerTokenCaps = [...(config.perTokenCaps || [])];
    newPerTokenCaps[index] = {
      ...newPerTokenCaps[index],
      [field]: field === 'cap' ? parseInt(value) || 0 : value
    };
    onChange({
      ...config,
      perTokenCaps: newPerTokenCaps
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Supply Cap Module</Label>
          <p className="text-xs text-muted-foreground">
            Enforce supply limits per token ID with optional global cap
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
            <AlertDescription>
              Control maximum supply for each token ID individually, with optional global supply cap 
              across all token types. Essential for limited edition collections.
            </AlertDescription>
          </Alert>

          {/* Global Supply Cap */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Global Supply Configuration
              </Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Global Cap */}
                <div className="space-y-2">
                  <Label className="text-xs">Global Supply Cap</Label>
                  <Input
                    type="number"
                    min="0"
                    value={config.globalCap || 0}
                    onChange={(e) => onChange({
                      ...config,
                      globalCap: parseInt(e.target.value) || 0
                    })}
                    disabled={disabled}
                    placeholder="0 (unlimited)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum total supply across all token IDs. 0 = unlimited
                  </p>
                  {errors?.['globalCap'] && (
                    <p className="text-xs text-destructive">{errors['globalCap']}</p>
                  )}
                </div>

                {/* Default Cap for New Tokens */}
                <div className="space-y-2">
                  <Label className="text-xs">Default Per-Token Cap</Label>
                  <Input
                    type="number"
                    min="0"
                    value={config.defaultCap || 0}
                    onChange={(e) => onChange({
                      ...config,
                      defaultCap: parseInt(e.target.value) || 0
                    })}
                    disabled={disabled}
                    placeholder="0 (unlimited)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Default supply cap for new token IDs. 0 = unlimited
                  </p>
                </div>
              </div>

              {/* Enforce Global Cap Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enforceGlobalCap"
                  checked={config.enforceGlobalCap !== false}
                  onChange={(e) => onChange({
                    ...config,
                    enforceGlobalCap: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="enforceGlobalCap" className="text-xs font-normal cursor-pointer flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  Enforce Global Cap
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                When enabled, total minted tokens across all IDs cannot exceed global cap
              </p>
            </div>
          </Card>

          {/* Per-Token Supply Caps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Per-Token Supply Caps</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPerTokenCap}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Token Cap
              </Button>
            </div>

            {(!config.perTokenCaps || config.perTokenCaps.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No per-token caps configured. All token IDs will use the default cap. 
                  Click "Add Token Cap" to set specific limits for individual tokens.
                </AlertDescription>
              </Alert>
            )}

            {config.perTokenCaps && config.perTokenCaps.map((tokenCap, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">Token Cap {index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePerTokenCap(index)}
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
                        onChange={(e) => updatePerTokenCap(index, 'tokenId', e.target.value)}
                        disabled={disabled}
                        placeholder="1"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Supply Cap *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={tokenCap.cap}
                        onChange={(e) => updatePerTokenCap(index, 'cap', e.target.value)}
                        disabled={disabled}
                        placeholder="0 (unlimited)"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {tokenCap.tokenId && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Token <strong>#{tokenCap.tokenId}</strong> will have a maximum supply of{' '}
                        <strong>{tokenCap.cap === 0 ? 'unlimited' : tokenCap.cap.toLocaleString()}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Supply Cap Example */}
          <Card className="p-4 bg-primary/10">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Supply Cap Example</Label>
              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Global Cap:</span>
                  <code className="bg-muted px-2 py-1 rounded">
                    {config.globalCap === 0 ? 'Unlimited' : config.globalCap.toLocaleString()}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Default Per-Token:</span>
                  <code className="bg-muted px-2 py-1 rounded">
                    {config.defaultCap === 0 ? 'Unlimited' : config.defaultCap.toLocaleString()}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Custom Caps:</span>
                  <code className="bg-muted px-2 py-1 rounded">
                    {config.perTokenCaps?.length || 0} tokens
                  </code>
                </div>
              </div>
            </div>
          </Card>

          {/* Summary */}
          {config.perTokenCaps && config.perTokenCaps.length > 0 && (
            <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg">
              <span className="text-muted-foreground">
                Custom Supply Caps
              </span>
              <span className="font-semibold">
                {config.perTokenCaps.length} {config.perTokenCaps.length === 1 ? 'token' : 'tokens'}
              </span>
            </div>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Global cap will be set during deployment. 
              Per-token caps can be configured post-deployment via the supply cap module interface.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
