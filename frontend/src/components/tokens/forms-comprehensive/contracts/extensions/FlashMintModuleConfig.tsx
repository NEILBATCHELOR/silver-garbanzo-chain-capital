/**
 * Flash Mint Module Configuration Component
 * ✅ ENHANCED: Complete flash loan configuration with fees and limits
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Zap, DollarSign } from 'lucide-react';
import type { ModuleConfigProps, FlashMintModuleConfig } from '../types';

export function FlashMintModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<FlashMintModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        flashFeeBps: undefined,
        maxFlashLoan: undefined
      });
    } else {
      onChange({
        enabled: true,
        flashFeeBps: config.flashFeeBps !== undefined ? config.flashFeeBps : 9, // Default 0.09%
        maxFlashLoan: config.maxFlashLoan
      });
    }
  };

  const calculateFeeAmount = (loanAmount: string, feeBps: number) => {
    try {
      const amount = parseFloat(loanAmount);
      if (isNaN(amount)) return null;
      return (amount * feeBps / 10000).toFixed(6);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Flash Mint Module</Label>
          <p className="text-xs text-muted-foreground">
            Enable instant flash loans with same-transaction repayment
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
                <Zap className="h-3 w-3 mr-1" />
                Flash loans allow users to borrow any amount without collateral, 
                as long as it's returned within the same transaction. Perfect for arbitrage, 
                refinancing, and DeFi strategies.
              </div>
            </AlertDescription>
          </Alert>

          {/* Flash Loan Fee */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-primary" />
                <Label className="text-sm font-medium">Flash Loan Fee</Label>
              </div>

              <div>
                <Label className="text-xs">Fee (basis points)</Label>
                <Input
                  type="number"
                  value={config.flashFeeBps !== undefined ? config.flashFeeBps : 9}
                  onChange={(e) => onChange({
                    ...config,
                    flashFeeBps: parseInt(e.target.value) || 0
                  })}
                  placeholder="9"
                  disabled={disabled}
                  min="0"
                  max="10000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Fee charged on flash loans (100 bps = 1%, default: 9 bps = 0.09%)
                </p>
                {errors?.['flashFeeBps'] && (
                  <p className="text-xs text-destructive mt-1">{errors['flashFeeBps']}</p>
                )}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Current fee: <strong>{((config.flashFeeBps || 9) / 100).toFixed(2)}%</strong>
                  <br />
                  Example: On a 100,000 token loan, fee = {calculateFeeAmount('100000', config.flashFeeBps || 9)} tokens
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Max Flash Loan */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Maximum Flash Loan Limit</Label>

              <div>
                <Label className="text-xs">Max Loan Amount (tokens)</Label>
                <Input
                  type="text"
                  value={config.maxFlashLoan || ''}
                  onChange={(e) => onChange({
                    ...config,
                    maxFlashLoan: e.target.value || undefined
                  })}
                  placeholder="1000000"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum amount that can be flash loaned (leave empty for unlimited)
                </p>
                {errors?.['maxFlashLoan'] && (
                  <p className="text-xs text-destructive mt-1">{errors['maxFlashLoan']}</p>
                )}
              </div>

              {!config.maxFlashLoan && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>No limit set:</strong> Flash loans can borrow up to the token's entire supply. 
                    Setting a limit helps manage risk and prevents excessive capital exposure.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* Fee Examples */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Flash Loan Fee Examples</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>9 bps (0.09%):</strong> Industry standard, $90 fee on $100k loan</p>
                <p><strong>5 bps (0.05%):</strong> Competitive rate, $50 fee on $100k loan</p>
                <p><strong>25 bps (0.25%):</strong> Higher fee, $250 on $100k loan</p>
                <p><strong>0 bps (0%):</strong> No fee, useful for testing or promotional periods</p>
              </div>
            </div>
          </Card>

          {/* Use Cases */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Flash Loan Use Cases</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Arbitrage:</strong> Exploit price differences across DEXs</p>
                <p><strong>Collateral Swap:</strong> Change loan collateral without closing position</p>
                <p><strong>Liquidation:</strong> Instant liquidations without capital</p>
                <p><strong>Refinancing:</strong> Move debt between protocols atomically</p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-4 bg-primary/5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Flash Loan Configuration</Label>
              <div className="grid grid-cols-2 gap-2 text-xs pl-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee:</span>
                  <span className="font-semibold">
                    {((config.flashFeeBps || 9) / 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Loan:</span>
                  <span className="font-semibold">
                    {config.maxFlashLoan || 'Unlimited'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Pre-deployment Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Flash loan parameters will be set 
              immediately upon deployment. Users can start flash borrowing as soon as the token goes live.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
