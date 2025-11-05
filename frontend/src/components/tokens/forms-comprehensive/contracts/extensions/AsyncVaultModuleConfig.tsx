/**
 * Async Vault Module Configuration Component (ERC4626)
 * ✅ ENHANCED: Complete async vault configuration with settlement delays
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Clock } from 'lucide-react';
import type { ModuleConfigProps, AsyncVaultModuleConfig } from '../types';

export function AsyncVaultModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<AsyncVaultModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({ enabled: false, settlementDelay: 0, maxPendingRequestsPerUser: undefined, requestExpiry: undefined, partialFulfillment: undefined, minimumRequestAmount: undefined });
    } else {
      onChange({ enabled: true, settlementDelay: config.settlementDelay || 86400, maxPendingRequestsPerUser: config.maxPendingRequestsPerUser || 10, requestExpiry: config.requestExpiry, partialFulfillment: config.partialFulfillment !== false, minimumRequestAmount: config.minimumRequestAmount });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Async Vault Module (ERC4626)</Label>
          <p className="text-xs text-muted-foreground">Asynchronous deposit/withdrawal with settlement delays</p>
        </div>
        <Switch checked={config.enabled} onCheckedChange={handleToggle} disabled={disabled} />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <Clock className="h-3 w-3 mr-1 inline" />
              Async vaults process deposits/withdrawals with delays, allowing time for strategy execution and preventing front-running.
            </AlertDescription>
          </Alert>

          <Card className="p-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Settlement Delay (seconds) *</Label>
                <Input type="number" value={config.settlementDelay} onChange={(e) => onChange({ ...config, settlementDelay: parseInt(e.target.value) || 86400 })} placeholder="86400" disabled={disabled} min="0" />
                <p className="text-xs text-muted-foreground mt-1">{Math.floor(config.settlementDelay / 3600)} hours settlement delay</p>
              </div>
              <div>
                <Label className="text-xs">Max Pending Requests Per User</Label>
                <Input type="number" value={config.maxPendingRequestsPerUser || 10} onChange={(e) => onChange({ ...config, maxPendingRequestsPerUser: parseInt(e.target.value) || 10 })} placeholder="10" disabled={disabled} min="1" />
              </div>
              <div>
                <Label className="text-xs">Request Expiry (seconds)</Label>
                <Input type="number" value={config.requestExpiry || ''} onChange={(e) => onChange({ ...config, requestExpiry: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="604800" disabled={disabled} min="0" />
              </div>
              <div>
                <Label className="text-xs">Minimum Request Amount</Label>
                <Input value={config.minimumRequestAmount || ''} onChange={(e) => onChange({ ...config, minimumRequestAmount: e.target.value || undefined })} placeholder="100" disabled={disabled} />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="partialFulfillment" checked={config.partialFulfillment !== false} onChange={(e) => onChange({ ...config, partialFulfillment: e.target.checked })} disabled={disabled} className="h-4 w-4" />
                <Label htmlFor="partialFulfillment" className="text-xs cursor-pointer">Allow partial fulfillment of requests</Label>
              </div>
            </div>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Async vault settings will be active immediately. Requests will be processed with configured delays.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
