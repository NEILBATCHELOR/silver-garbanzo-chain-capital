/**
 * Native Vault Module Configuration Component (ERC4626)
 * ✅ ENHANCED: Complete native vault configuration for ETH handling
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, NativeVaultModuleConfig } from '../types';

export function NativeVaultModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<NativeVaultModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({ enabled: false, wrapNative: undefined, wrappedTokenAddress: undefined, unwrapOnWithdrawal: undefined });
    } else {
      onChange({ enabled: true, wrapNative: config.wrapNative !== false, wrappedTokenAddress: config.wrappedTokenAddress, unwrapOnWithdrawal: config.unwrapOnWithdrawal !== false });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Native Vault Module (ERC4626)</Label>
          <p className="text-xs text-muted-foreground">Accept native ETH with automatic wrapping</p>
        </div>
        <Switch checked={config.enabled} onCheckedChange={handleToggle} disabled={disabled} />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Native vault automatically wraps ETH to WETH on deposit and optionally unwraps on withdrawal, 
              providing seamless native token support.
            </AlertDescription>
          </Alert>

          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="wrapNative" checked={config.wrapNative !== false} onChange={(e) => onChange({ ...config, wrapNative: e.target.checked })} disabled={disabled} className="h-4 w-4" />
                <Label htmlFor="wrapNative" className="text-sm cursor-pointer">Automatically wrap native token on deposit</Label>
              </div>
              {config.wrapNative !== false && (
                <div>
                  <Label className="text-xs">Wrapped Token Address (WETH)</Label>
                  <Input value={config.wrappedTokenAddress || ''} onChange={(e) => onChange({ ...config, wrappedTokenAddress: e.target.value || undefined })} placeholder="0x..." disabled={disabled} className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground mt-1">Address of WETH or other wrapped native token</p>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="unwrapOnWithdrawal" checked={config.unwrapOnWithdrawal !== false} onChange={(e) => onChange({ ...config, unwrapOnWithdrawal: e.target.checked })} disabled={disabled} className="h-4 w-4" />
                <Label htmlFor="unwrapOnWithdrawal" className="text-xs cursor-pointer">Automatically unwrap to native token on withdrawal</Label>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Native Vault Benefits</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>User Friendly:</strong> Deposit/withdraw native ETH directly</p>
                <p><strong>No Manual Wrapping:</strong> Automatic WETH conversion</p>
                <p><strong>Gas Efficient:</strong> Reduces transaction count</p>
              </div>
            </div>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Native vault features will be active immediately. 
              Users can deposit/withdraw native ETH seamlessly.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
