/**
 * Withdrawal Queue Module Configuration Component (ERC4626)
 * ✅ ENHANCED: Complete withdrawal queue configuration
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Clock, DollarSign } from 'lucide-react';
import type { ModuleConfigProps, WithdrawalQueueModuleConfig } from '../types';

export function WithdrawalQueueModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<WithdrawalQueueModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        maxQueueSize: 0,
        processingDelay: undefined,
        priorityFee: undefined,
        maxWithdrawalAmount: undefined,
        minWithdrawalAmount: undefined
      });
    } else {
      onChange({
        enabled: true,
        maxQueueSize: config.maxQueueSize || 1000,
        processingDelay: config.processingDelay || 86400,
        priorityFee: config.priorityFee,
        maxWithdrawalAmount: config.maxWithdrawalAmount,
        minWithdrawalAmount: config.minWithdrawalAmount
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Withdrawal Queue Module (ERC4626)</Label>
          <p className="text-xs text-muted-foreground">
            Manage withdrawal requests with queuing and processing delays
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
              Withdrawal queues manage liquidity constraints by processing withdrawal requests over time, 
              preventing bank runs and ensuring orderly exit for vault participants.
            </AlertDescription>
          </Alert>

          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Queue Configuration</Label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Max Queue Size *</Label>
                  <Input
                    type="number"
                    value={config.maxQueueSize}
                    onChange={(e) => onChange({
                      ...config,
                      maxQueueSize: parseInt(e.target.value) || 0
                    })}
                    placeholder="1000"
                    disabled={disabled}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Pending withdrawals limit</p>
                </div>

                <div>
                  <Label className="text-xs">Processing Delay (seconds)</Label>
                  <Input
                    type="number"
                    value={config.processingDelay || 86400}
                    onChange={(e) => onChange({
                      ...config,
                      processingDelay: parseInt(e.target.value) || 86400
                    })}
                    placeholder="86400"
                    disabled={disabled}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor((config.processingDelay || 86400) / 3600)} hours delay
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-primary" />
                <Label className="text-sm font-medium">Amount Limits</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Min Withdrawal</Label>
                  <Input
                    type="text"
                    value={config.minWithdrawalAmount || ''}
                    onChange={(e) => onChange({
                      ...config,
                      minWithdrawalAmount: e.target.value || undefined
                    })}
                    placeholder="100"
                    disabled={disabled}
                  />
                </div>

                <div>
                  <Label className="text-xs">Max Withdrawal</Label>
                  <Input
                    type="text"
                    value={config.maxWithdrawalAmount || ''}
                    onChange={(e) => onChange({
                      ...config,
                      maxWithdrawalAmount: e.target.value || undefined
                    })}
                    placeholder="1000000"
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Priority Fee (Optional)</Label>
              <Input
                type="number"
                value={config.priorityFee || ''}
                onChange={(e) => onChange({
                  ...config,
                  priorityFee: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="0"
                disabled={disabled}
                min="0"
                max="10000"
              />
              <p className="text-xs text-muted-foreground">
                Fee for priority processing (bps): {config.priorityFee ? `${(config.priorityFee / 100).toFixed(2)}%` : 'None'}
              </p>
            </div>
          </Card>

          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Withdrawal Queue Benefits</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Prevent Bank Runs:</strong> Gradual processing prevents liquidity crises</p>
                <p><strong>Fair Processing:</strong> First-in-first-out ensures fairness</p>
                <p><strong>Liquidity Management:</strong> Time to rebalance portfolios</p>
              </div>
            </div>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Queue settings will be enforced 
              immediately. Withdrawals will be processed according to these parameters.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
