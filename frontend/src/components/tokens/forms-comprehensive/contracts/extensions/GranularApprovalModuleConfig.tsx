/**
 * Granular Approval Module Configuration Component
 * Handles ERC-5216 granular approval settings for ERC-1155 tokens
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, GranularApprovalModuleConfig } from '../types';

export function GranularApprovalModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<GranularApprovalModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Granular Approvals (ERC-5216)</Label>
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
              <strong>ERC-5216 Granular Approvals for ERC-1155</strong>
              <br />
              Standard ERC-1155 only has setApprovalForAll (all-or-nothing). This module adds
              granular approvals for specific token IDs and amounts, providing better security
              and control.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Features</h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Per-token-ID approval mechanism</li>
                <li>Approve specific amounts for specific token IDs</li>
                <li>Increase/decrease allowances granularly</li>
                <li>Better security than all-or-nothing approvals</li>
                <li>Gas efficient: ~3,000 gas per approval operation</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Use Cases</h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Gaming items: Approve specific item transfers</li>
                <li>Marketplace integration: Limit exposure per token ID</li>
                <li>Fractional ownership: Controlled partial transfers</li>
                <li>Enhanced security: Minimize approval risk</li>
              </ul>
            </div>

            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> This module is only applicable to ERC-1155 tokens.
                It complements (doesn't replace) the standard setApprovalForAll function.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
