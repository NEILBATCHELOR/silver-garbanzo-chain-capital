/**
 * Fractionalization Module Configuration Component
 * Splits NFTs into fungible fractions
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, FractionalizationModuleConfig } from '../types';

export function FractionalizationModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<FractionalizationModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      minFractions: checked ? config.minFractions || 100 : 0
    });
  };

  const handleMinFractionsChange = (value: string) => {
    const fractions = parseInt(value);
    if (!isNaN(fractions)) {
      onChange({
        ...config,
        minFractions: fractions
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Fractionalization Module</Label>
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
              Split expensive NFTs into fungible fractions for shared ownership. 
              Ideal for high-value art, real estate, or collectibles.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Minimum Fractions per NFT</Label>
              <Input
                type="number"
                value={config.minFractions}
                onChange={(e) => handleMinFractionsChange(e.target.value)}
                placeholder="100"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Minimum number of fractional shares each NFT can be split into
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
