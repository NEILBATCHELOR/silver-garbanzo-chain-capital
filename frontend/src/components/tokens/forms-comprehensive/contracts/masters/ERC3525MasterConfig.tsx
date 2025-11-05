/**
 * ERC3525 Master Contract Configuration Component
 * Handles semi-fungible tokens (SFTs) with slot-based organization
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { MasterConfigProps, ERC3525MasterConfig } from '../types';

export function ERC3525MasterConfigPanel({
  config,
  onChange,
  disabled = false,
  errors = {}
}: MasterConfigProps<ERC3525MasterConfig>) {

  const handleChange = (field: keyof ERC3525MasterConfig, value: string | number) => {
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
          Semi-fungible tokens with slot-based organization. Perfect for financial instruments, 
          fractionalized assets, or any tokens that need both unique identity and fungible value within categories (slots).
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Name */}
        <div className="space-y-2">
          <Label className="text-xs">Token Name</Label>
          <Input
            value={config.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="My Semi-Fungible Token"
            disabled={disabled}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Token Symbol */}
        <div className="space-y-2">
          <Label className="text-xs">Token Symbol</Label>
          <Input
            value={config.symbol}
            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
            placeholder="SFT"
            disabled={disabled}
          />
          {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
        </div>

        {/* Decimals */}
        <div className="space-y-2">
          <Label className="text-xs">Value Decimals</Label>
          <Input
            type="number"
            min="0"
            max="18"
            value={config.decimals}
            onChange={(e) => handleChange('decimals', parseInt(e.target.value))}
            placeholder="18"
            disabled={disabled}
          />
          {errors.decimals && <p className="text-xs text-destructive">{errors.decimals}</p>}
          <p className="text-xs text-muted-foreground">
            Decimal places for token value (typically 18)
          </p>
        </div>

        {/* Owner Address */}
        <div className="space-y-2">
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
