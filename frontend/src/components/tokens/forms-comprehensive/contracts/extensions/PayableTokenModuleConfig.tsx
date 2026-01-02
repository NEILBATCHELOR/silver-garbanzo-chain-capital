/**
 * Payable Token Module Configuration Component (EIP-1363)
 * ✅ ENHANCED: Complete payable token configuration with Phase 1 & Phase 2
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CreditCard } from 'lucide-react';
import type { ModuleConfigProps, PayableTokenModuleConfig } from '../types';

export function PayableTokenModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<PayableTokenModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        callbackGasLimit: undefined,
        acceptedForPayment: undefined,
        paymentCallbackEnabled: undefined
      });
    } else {
      onChange({
        enabled: true,
        callbackGasLimit: config.callbackGasLimit || 100000,
        acceptedForPayment: config.acceptedForPayment !== false,
        paymentCallbackEnabled: config.paymentCallbackEnabled !== false
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Payable Token Module (EIP-1363)</Label>
          <p className="text-xs text-muted-foreground">
            Enable tokens to be used for payments with callbacks
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
                <CreditCard className="h-3 w-3 mr-1" />
                Payable tokens allow transfer and approval with callback execution, 
                enabling one-transaction payment flows without separate approve+transfer.
              </div>
            </AlertDescription>
          </Alert>

          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Phase 1: Initialization Settings</Label>

              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="callbackGasLimit" className="text-xs">
                    Callback Gas Limit *
                  </Label>
                  <Input
                    id="callbackGasLimit"
                    type="number"
                    value={config.callbackGasLimit ?? 100000}
                    onChange={(e) => onChange({
                      ...config,
                      callbackGasLimit: parseInt(e.target.value) || 100000
                    })}
                    disabled={disabled}
                    placeholder="100000"
                    min="21000"
                    max="500000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Gas limit for callback executions (default: 100,000)
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Phase 2: Post-Deployment Configuration</Label>
              <p className="text-xs text-muted-foreground">
                These settings can be configured after deployment via admin functions
              </p>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="acceptedForPayment"
                    checked={config.acceptedForPayment !== false}
                    onChange={(e) => onChange({
                      ...config,
                      acceptedForPayment: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="acceptedForPayment" className="text-xs font-normal cursor-pointer">
                    Accept token for payment operations
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="paymentCallbackEnabled"
                    checked={config.paymentCallbackEnabled !== false}
                    onChange={(e) => onChange({
                      ...config,
                      paymentCallbackEnabled: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="paymentCallbackEnabled" className="text-xs font-normal cursor-pointer">
                    Enable payment callback notifications
                  </Label>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Payable Token Use Cases</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Subscriptions:</strong> Pay and activate service in one transaction</p>
                <p><strong>NFT Purchases:</strong> Buy NFT without separate approval</p>
                <p><strong>Service Payments:</strong> Pay for service and execute simultaneously</p>
                <p><strong>DeFi Actions:</strong> Deposit and stake in single transaction</p>
              </div>
            </div>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Payable token functionality will be 
              available immediately. Users can make payments with callbacks right away.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
