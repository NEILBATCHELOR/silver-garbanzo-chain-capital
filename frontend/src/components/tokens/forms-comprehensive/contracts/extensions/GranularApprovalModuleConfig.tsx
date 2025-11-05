/**
 * Granular Approval Module Configuration Component (EIP-5216)
 * ✅ ENHANCED: Complete granular approval configuration for ERC1155
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CheckCircle } from 'lucide-react';
import type { ModuleConfigProps, GranularApprovalModuleConfig } from '../types';

export function GranularApprovalModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<GranularApprovalModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        allowPartialApprovals: undefined,
        defaultApprovalAmount: undefined
      });
    } else {
      onChange({
        enabled: true,
        allowPartialApprovals: config.allowPartialApprovals !== false,
        defaultApprovalAmount: config.defaultApprovalAmount
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Granular Approval Module (EIP-5216)</Label>
          <p className="text-xs text-muted-foreground">
            Enable partial amount approvals for ERC1155 tokens
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
                <CheckCircle className="h-3 w-3 mr-1" />
                Granular approvals let users approve specific amounts per token ID instead of 
                all-or-nothing, providing finer control over token spending permissions.
              </div>
            </AlertDescription>
          </Alert>

          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowPartialApprovals"
                  checked={config.allowPartialApprovals !== false}
                  onChange={(e) => onChange({
                    ...config,
                    allowPartialApprovals: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="allowPartialApprovals" className="text-sm font-medium cursor-pointer">
                  Allow partial amount approvals
                </Label>
              </div>

              {config.allowPartialApprovals !== false && (
                <div className="pl-6 space-y-2">
                  <Label className="text-xs">Default Approval Amount</Label>
                  <Input
                    type="text"
                    value={config.defaultApprovalAmount || ''}
                    onChange={(e) => onChange({
                      ...config,
                      defaultApprovalAmount: e.target.value || undefined
                    })}
                    placeholder="1000"
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default amount when no specific amount is specified
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Granular Approval Examples</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Traditional:</strong> Approve all tokens or none</p>
                <p><strong>Granular:</strong> Approve exactly 50 out of 1000 tokens</p>
                <p><strong>Use Case:</strong> Marketplace can only sell approved quantity</p>
              </div>
            </div>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Granular approval settings will be 
              active immediately. Users can specify exact amounts for each approval.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
