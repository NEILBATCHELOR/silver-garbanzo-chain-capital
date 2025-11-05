/**
 * Fee Module Configuration Component
 * ✅ ENHANCED: Complete fee structure with buy/sell fees and exemptions
 * Handles transfer fee settings for ERC20 tokens
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, DollarSign, ShieldCheck } from 'lucide-react';
import type { ModuleConfigProps, FeeModuleConfig } from '../types';

export function FeeModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<FeeModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false
      });
    } else {
      onChange({
        enabled: true,
        transferFeeBps: config.transferFeeBps || 50, // Default 0.5%
        feeRecipient: config.feeRecipient || '',
        exemptAddresses: config.exemptAddresses || [],
        buyFeeBps: config.buyFeeBps || 0,
        sellFeeBps: config.sellFeeBps || 0,
        maxFeeBps: config.maxFeeBps || 1000 // Default 10% cap
      });
    }
  };

  const handleBpsChange = (field: 'transferFeeBps' | 'buyFeeBps' | 'sellFeeBps' | 'maxFeeBps', value: string) => {
    const bps = parseFloat(value);
    if (!isNaN(bps)) {
      onChange({
        ...config,
        [field]: Math.round(bps * 100) // Convert percentage to basis points
      });
    }
  };

  const handleRecipientChange = (value: string) => {
    onChange({
      ...config,
      feeRecipient: value
    });
  };

  // Exempt Addresses Management
  const addExemptAddress = () => {
    onChange({
      ...config,
      exemptAddresses: [...(config.exemptAddresses || []), '']
    });
  };

  const removeExemptAddress = (index: number) => {
    const newAddresses = [...(config.exemptAddresses || [])];
    newAddresses.splice(index, 1);
    onChange({
      ...config,
      exemptAddresses: newAddresses
    });
  };

  const updateExemptAddress = (index: number, value: string) => {
    const newAddresses = [...(config.exemptAddresses || [])];
    newAddresses[index] = value;
    onChange({
      ...config,
      exemptAddresses: newAddresses
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Transfer Fees</Label>
          <p className="text-xs text-muted-foreground">
            Charge fees on token transfers with customizable rates
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
              Charge percentage fees on token transfers. 
              Fees are automatically sent to the specified recipient address.
            </AlertDescription>
          </Alert>

          {/* Fee Recipient */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Fee Recipient
              </Label>
              <Input
                value={config.feeRecipient}
                onChange={(e) => handleRecipientChange(e.target.value)}
                placeholder="0x..."
                disabled={disabled}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Address that will receive all transfer fees
              </p>
              {errors?.['feeRecipient'] && (
                <p className="text-xs text-destructive">{errors['feeRecipient']}</p>
              )}
            </div>
          </Card>

          {/* Fee Rates */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Fee Rates</Label>

              <div className="grid grid-cols-2 gap-4">
                {/* Default Transfer Fee */}
                <div className="space-y-2">
                  <Label className="text-xs">Default Transfer Fee (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={config.maxFeeBps ? config.maxFeeBps / 100 : 10}
                    value={(config.transferFeeBps / 100).toFixed(2)}
                    onChange={(e) => handleBpsChange('transferFeeBps', e.target.value)}
                    disabled={disabled}
                    placeholder="0.50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Applied to all transfers (e.g., 0.5%)
                  </p>
                </div>

                {/* Max Fee Cap */}
                <div className="space-y-2">
                  <Label className="text-xs">Max Fee Cap (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={config.maxFeeBps ? (config.maxFeeBps / 100).toFixed(1) : '10.0'}
                    onChange={(e) => handleBpsChange('maxFeeBps', e.target.value)}
                    disabled={disabled}
                    placeholder="10.0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum allowed fee percentage
                  </p>
                </div>

                {/* Buy Fee */}
                <div className="space-y-2">
                  <Label className="text-xs">Buy Fee (%) - Optional</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={config.maxFeeBps ? config.maxFeeBps / 100 : 10}
                    value={(config.buyFeeBps || 0) / 100}
                    onChange={(e) => handleBpsChange('buyFeeBps', e.target.value)}
                    disabled={disabled}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fee when buying from DEX (0 = use default)
                  </p>
                </div>

                {/* Sell Fee */}
                <div className="space-y-2">
                  <Label className="text-xs">Sell Fee (%) - Optional</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={config.maxFeeBps ? config.maxFeeBps / 100 : 10}
                    value={(config.sellFeeBps || 0) / 100}
                    onChange={(e) => handleBpsChange('sellFeeBps', e.target.value)}
                    disabled={disabled}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fee when selling to DEX (0 = use default)
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Fee Exemptions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Fee-Exempt Addresses
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExemptAddress}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                These addresses will not pay or receive transfer fees. 
                Common exemptions: liquidity pools, staking contracts, team wallets.
              </AlertDescription>
            </Alert>

            {config.exemptAddresses && config.exemptAddresses.map((address, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={address}
                  onChange={(e) => updateExemptAddress(index, e.target.value)}
                  disabled={disabled}
                  placeholder="0x..."
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExemptAddress(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Fee Calculation Example */}
          <Card className="p-4 bg-primary/10">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fee Calculation Example</Label>
              <div className="text-xs space-y-1">
                <p>
                  For a <strong>1,000 token</strong> transfer:
                </p>
                <ul className="list-disc list-inside pl-2 space-y-0.5">
                  <li>Default fee: <strong>{((config.transferFeeBps / 100) || 0.5).toFixed(2)}%</strong> = {(1000 * (config.transferFeeBps / 100) / 100).toFixed(2)} tokens</li>
                  {config.buyFeeBps && config.buyFeeBps > 0 && (
                    <li>Buy fee: <strong>{((config.buyFeeBps / 100) || 0).toFixed(2)}%</strong> = {(1000 * (config.buyFeeBps / 100) / 100).toFixed(2)} tokens</li>
                  )}
                  {config.sellFeeBps && config.sellFeeBps > 0 && (
                    <li>Sell fee: <strong>{((config.sellFeeBps / 100) || 0).toFixed(2)}%</strong> = {(1000 * (config.sellFeeBps / 100) / 100).toFixed(2)} tokens</li>
                  )}
                  <li>Recipient receives: fee tokens</li>
                  <li>Sender/receiver pays: transfer + fee</li>
                  {config.exemptAddresses && config.exemptAddresses.length > 0 && (
                    <li>{config.exemptAddresses.length} address(es) exempt from fees</li>
                  )}
                </ul>
              </div>
            </div>
          </Card>

          {/* Summary */}
          {config.exemptAddresses && config.exemptAddresses.length > 0 && (
            <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg">
              <span className="text-muted-foreground">
                Fee-Exempt Addresses
              </span>
              <span className="font-semibold">
                {config.exemptAddresses.length} {config.exemptAddresses.length === 1 ? 'address' : 'addresses'}
              </span>
            </div>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Fee structure will be configured 
              automatically during deployment. Fees are collected on every transfer and 
              sent to the recipient address.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
