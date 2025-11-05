/**
 * Value Exchange Module Configuration Component (ERC3525)
 * ✅ ENHANCED: Complete value exchange configuration with fees and cross-slot
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, RefreshCw, DollarSign } from 'lucide-react';
import type { ModuleConfigProps, ValueExchangeModuleConfig } from '../types';

export function ValueExchangeModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<ValueExchangeModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        exchangeFeeBps: 0,
        feeRecipient: undefined,
        allowCrossSlotExchange: undefined,
        minExchangeValue: undefined,
        slippageTolerance: undefined
      });
    } else {
      onChange({
        enabled: true,
        exchangeFeeBps: config.exchangeFeeBps || 0,
        feeRecipient: config.feeRecipient,
        allowCrossSlotExchange: config.allowCrossSlotExchange !== false,
        minExchangeValue: config.minExchangeValue,
        slippageTolerance: config.slippageTolerance || 50
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Value Exchange Module (ERC3525)</Label>
          <p className="text-xs text-muted-foreground">
            Enable value transfers between slots and tokens
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
              <div className="flex items-center">
                <RefreshCw className="h-3 w-3 mr-1" />
                Value exchanges allow transferring value between different slots or tokens. 
                Perfect for rebalancing portfolios, swapping assets, or managing positions.
              </div>
            </AlertDescription>
          </Alert>

          {/* Exchange Fee */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-primary" />
                <Label className="text-sm font-medium">Exchange Fee</Label>
              </div>

              <div>
                <Label className="text-xs">Fee (basis points)</Label>
                <Input
                  type="number"
                  value={config.exchangeFeeBps}
                  onChange={(e) => onChange({
                    ...config,
                    exchangeFeeBps: parseInt(e.target.value) || 0
                  })}
                  placeholder="0"
                  disabled={disabled}
                  min="0"
                  max="10000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Fee charged on value exchanges (100 bps = 1%)
                </p>
                {errors?.['exchangeFeeBps'] && (
                  <p className="text-xs text-destructive mt-1">{errors['exchangeFeeBps']}</p>
                )}
              </div>

              {config.exchangeFeeBps > 0 && (
                <div>
                  <Label className="text-xs">Fee Recipient</Label>
                  <Input
                    type="text"
                    value={config.feeRecipient || ''}
                    onChange={(e) => onChange({
                      ...config,
                      feeRecipient: e.target.value || undefined
                    })}
                    placeholder="0x..."
                    disabled={disabled}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Address receiving exchange fees
                  </p>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Current fee: <strong>{(config.exchangeFeeBps / 100).toFixed(2)}%</strong>
                  <br />
                  Example: On a 10,000 value exchange, fee = {(config.exchangeFeeBps / 10000 * 10000).toFixed(0)} units
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Cross-Slot Exchange */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowCrossSlotExchange"
                  checked={config.allowCrossSlotExchange !== false}
                  onChange={(e) => onChange({
                    ...config,
                    allowCrossSlotExchange: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="allowCrossSlotExchange" className="text-sm font-medium cursor-pointer">
                  Allow cross-slot value exchanges
                </Label>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {config.allowCrossSlotExchange !== false
                    ? 'Users can exchange value between different slots (e.g., swap bonds for stocks)'
                    : 'Value exchanges only within same slot (more restrictive)'}
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Exchange Limits */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Exchange Limits</Label>

              <div>
                <Label className="text-xs">Minimum Exchange Value</Label>
                <Input
                  type="text"
                  value={config.minExchangeValue || ''}
                  onChange={(e) => onChange({
                    ...config,
                    minExchangeValue: e.target.value || undefined
                  })}
                  placeholder="0"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum value required for exchanges (prevents dust trades)
                </p>
              </div>

              <div>
                <Label className="text-xs">Slippage Tolerance (basis points)</Label>
                <Input
                  type="number"
                  value={config.slippageTolerance || 50}
                  onChange={(e) => onChange({
                    ...config,
                    slippageTolerance: parseInt(e.target.value) || 50
                  })}
                  placeholder="50"
                  disabled={disabled}
                  min="1"
                  max="1000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum allowed price slippage ({((config.slippageTolerance || 50) / 100).toFixed(2)}%)
                </p>
              </div>
            </div>
          </Card>

          {/* Use Cases */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Value Exchange Use Cases</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Portfolio Rebalancing:</strong> Move value between asset categories</p>
                <p><strong>Asset Swaps:</strong> Exchange one token type for another</p>
                <p><strong>Position Management:</strong> Adjust holdings across slots</p>
                <p><strong>Liquidity Provision:</strong> Enable market-making activities</p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-4 bg-primary/5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Exchange Configuration</Label>
              <div className="grid grid-cols-2 gap-2 text-xs pl-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exchange fee:</span>
                  <span className="font-semibold">{(config.exchangeFeeBps / 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cross-slot:</span>
                  <span className="font-semibold">
                    {config.allowCrossSlotExchange !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Slippage tolerance:</span>
                  <span className="font-semibold">{((config.slippageTolerance || 50) / 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Pre-deployment Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Value exchange parameters will be active 
              immediately upon deployment. Users can start exchanging value between tokens and slots right away.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
