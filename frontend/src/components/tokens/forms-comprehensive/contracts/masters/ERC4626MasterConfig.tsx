/**
 * ERC4626 Master Contract Configuration Component
 * Handles tokenized vault standard
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { MasterConfigProps, ERC4626MasterConfig } from '../types';

export function ERC4626MasterConfigPanel({
  config,
  onChange,
  disabled = false,
  errors = {}
}: MasterConfigProps<ERC4626MasterConfig>) {

  const handleChange = (field: keyof ERC4626MasterConfig, value: string) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Create a tokenized vault that accepts deposits and issues shares. Perfect for yield-bearing assets, 
          investment funds, or any pooled asset management strategy.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vault Name */}
        <div className="space-y-2">
          <Label className="text-xs">Vault Name</Label>
          <Input
            value={config.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="My Vault"
            disabled={disabled}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Share Symbol */}
        <div className="space-y-2">
          <Label className="text-xs">Share Token Symbol</Label>
          <Input
            value={config.symbol}
            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
            placeholder="vTKN"
            disabled={disabled}
          />
          {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
          <p className="text-xs text-muted-foreground">
            Symbol for vault share tokens
          </p>
        </div>

        {/* Underlying Asset Address */}
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs">Underlying Asset Address</Label>
          <Input
            value={config.asset}
            onChange={(e) => handleChange('asset', e.target.value)}
            placeholder="0x..."
            disabled={disabled}
          />
          {errors.asset && <p className="text-xs text-destructive">{errors.asset}</p>}
          <p className="text-xs text-muted-foreground">
            Address of the ERC20 token that this vault will accept as deposits
          </p>
        </div>

        {/* Owner Address */}
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs">Owner Address</Label>
          <Input
            value={config.owner}
            onChange={(e) => handleChange('owner', e.target.value)}
            placeholder="0x..."
            disabled={disabled}
          />
          {errors.owner && <p className="text-xs text-destructive">{errors.owner}</p>}
        </div>
      </div>
    </div>
  );
}
