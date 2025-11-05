/**
 * ERC20 Rebasing Master Contract Configuration Component
 * Handles rebasing token initialization parameters
 * 
 * NOTE: Rebasing is configured post-deployment via rebase() function calls.
 * This component only handles the initial token setup.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { MasterConfigProps, ERC20RebasingMasterConfig } from '../types';

export function ERC20RebasingMasterConfigPanel({
  config,
  onChange,
  disabled = false,
  errors = {}
}: MasterConfigProps<ERC20RebasingMasterConfig>) {

  const handleChange = (field: keyof ERC20RebasingMasterConfig, value: string) => {
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
          <strong>Rebasing Tokens</strong>
          <br />
          Create tokens with elastic supply (e.g., stETH, aTokens). Rebasing parameters are configured 
          post-deployment via the rebase() function. This form only sets up the initial token.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Name */}
        <div className="space-y-2">
          <Label className="text-xs">Token Name</Label>
          <Input
            value={config.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Staked Ethereum"
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
            placeholder="stETH"
            disabled={disabled}
          />
          {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
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
            Initial shares to mint (underlying balance adjusts via rebase)
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

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Post-Deployment Configuration</strong>
          <br />
          After deploying, use the REBASE_ROLE to call rebase(newTotalPooled) to adjust balances:
          <ul className="list-disc list-inside mt-2 text-xs space-y-1">
            <li>Positive rebase: newTotalPooled &gt; current = balances increase</li>
            <li>Negative rebase: newTotalPooled &lt; current = balances decrease</li>
            <li>Neutral: newTotalPooled = current = balances stay same</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
