/**
 * ERC20 Wrapper Master Contract Configuration Component
 * Wraps an existing ERC20 token to add new functionality
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { MasterConfigProps, ERC20WrapperMasterConfig } from '../types';

export function ERC20WrapperMasterConfigPanel({
  config,
  onChange,
  disabled = false,
  errors = {}
}: MasterConfigProps<ERC20WrapperMasterConfig>) {

  const handleChange = (field: keyof ERC20WrapperMasterConfig, value: string) => {
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
          Wrap an existing ERC20 token to add new features like governance, snapshots, or custom logic. 
          Users can wrap and unwrap tokens 1:1 at any time.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Name */}
        <div className="space-y-2">
          <Label className="text-xs">Wrapped Token Name</Label>
          <Input
            value={config.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Wrapped Token"
            disabled={disabled}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Token Symbol */}
        <div className="space-y-2">
          <Label className="text-xs">Wrapped Token Symbol</Label>
          <Input
            value={config.symbol}
            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
            placeholder="WTKN"
            disabled={disabled}
          />
          {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
        </div>

        {/* Underlying Token Address */}
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs">Underlying Token Address</Label>
          <Input
            value={config.underlyingToken}
            onChange={(e) => handleChange('underlyingToken', e.target.value)}
            placeholder="0x..."
            disabled={disabled}
          />
          {errors.underlyingToken && <p className="text-xs text-destructive">{errors.underlyingToken}</p>}
          <p className="text-xs text-muted-foreground">
            Address of the ERC20 token you want to wrap
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
