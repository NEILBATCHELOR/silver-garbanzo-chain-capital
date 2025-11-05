/**
 * ERC20 Master Contract Configuration Component
 * Handles basic ERC20 token parameters
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { MasterConfigProps, ERC20MasterConfig } from '../types';

export function ERC20MasterConfigPanel({
  config,
  onChange,
  disabled = false,
  errors = {}
}: MasterConfigProps<ERC20MasterConfig>) {

  const handleChange = (field: keyof ERC20MasterConfig, value: string) => {
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
          Configure your fungible token. ERC20 tokens are divisible and ideal for currencies, utility tokens, and governance tokens.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Name */}
        <div className="space-y-2">
          <Label className="text-xs">Token Name</Label>
          <Input
            value={config.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="My Token"
            disabled={disabled}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          <p className="text-xs text-muted-foreground">
            Full name of your token
          </p>
        </div>

        {/* Token Symbol */}
        <div className="space-y-2">
          <Label className="text-xs">Token Symbol</Label>
          <Input
            value={config.symbol}
            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
            placeholder="MTK"
            disabled={disabled}
          />
          {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
          <p className="text-xs text-muted-foreground">
            Ticker symbol (2-5 characters)
          </p>
        </div>

        {/* Initial Supply */}
        <div className="space-y-2">
          <Label className="text-xs">Initial Supply</Label>
          <Input
            type="number"
            value={config.initialSupply}
            onChange={(e) => handleChange('initialSupply', e.target.value)}
            placeholder="1000000"
            disabled={disabled}
          />
          {errors.initialSupply && <p className="text-xs text-destructive">{errors.initialSupply}</p>}
          <p className="text-xs text-muted-foreground">
            Tokens minted at deployment
          </p>
        </div>

        {/* Max Supply */}
        <div className="space-y-2">
          <Label className="text-xs">Maximum Supply</Label>
          <Input
            type="number"
            value={config.maxSupply}
            onChange={(e) => handleChange('maxSupply', e.target.value)}
            placeholder="10000000"
            disabled={disabled}
          />
          {errors.maxSupply && <p className="text-xs text-destructive">{errors.maxSupply}</p>}
          <p className="text-xs text-muted-foreground">
            Total supply cap (0 = unlimited)
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
          <p className="text-xs text-muted-foreground">
            Address that will own and control the token contract
          </p>
        </div>
      </div>
    </div>
  );
}
