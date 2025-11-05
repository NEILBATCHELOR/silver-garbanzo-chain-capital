/**
 * Permit Module Configuration Component (EIP-2612)
 * ✅ ENHANCED: Complete permit configuration with deadline and version
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, FileSignature, Clock } from 'lucide-react';
import type { ModuleConfigProps, PermitModuleConfig } from '../types';

export function PermitModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<PermitModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        permitDeadline: undefined,
        permitVersion: undefined
      });
    } else {
      onChange({
        enabled: true,
        permitDeadline: config.permitDeadline || 3600, // Default 1 hour
        permitVersion: config.permitVersion || '1'
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} minutes`;
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Permit Module (EIP-2612)</Label>
          <p className="text-xs text-muted-foreground">
            Enable gasless token approvals via off-chain signatures
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
                <FileSignature className="h-3 w-3 mr-1" />
                Permit allows users to approve token spending via signatures instead of transactions. 
                This saves gas costs and improves user experience for dApp interactions.
              </div>
            </AlertDescription>
          </Alert>

          {/* Permit Deadline */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                <Label className="text-sm font-medium">Default Permit Deadline</Label>
              </div>

              <div>
                <Label className="text-xs">Deadline (seconds)</Label>
                <Input
                  type="number"
                  value={config.permitDeadline || 3600}
                  onChange={(e) => onChange({
                    ...config,
                    permitDeadline: parseInt(e.target.value) || 3600
                  })}
                  placeholder="3600"
                  disabled={disabled}
                  min="60"
                  max="86400"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default expiration time for permit signatures ({formatDuration(config.permitDeadline || 3600)})
                </p>
                {errors?.['permitDeadline'] && (
                  <p className="text-xs text-destructive mt-1">{errors['permitDeadline']}</p>
                )}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Permit signatures expire after this duration to prevent replay attacks. 
                  Users can always specify their own deadline when creating signatures.
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Permit Version */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Permit Version</Label>

              <div>
                <Label className="text-xs">Version String</Label>
                <Input
                  type="text"
                  value={config.permitVersion || '1'}
                  onChange={(e) => onChange({
                    ...config,
                    permitVersion: e.target.value || '1'
                  })}
                  placeholder="1"
                  disabled={disabled}
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Version identifier for the permit implementation (usually "1")
                </p>
                {errors?.['permitVersion'] && (
                  <p className="text-xs text-destructive mt-1">{errors['permitVersion']}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Common Deadline Values */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Common Deadline Values</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>300 seconds (5 min):</strong> Quick operations, high security</p>
                <p><strong>1800 seconds (30 min):</strong> Standard user operations</p>
                <p><strong>3600 seconds (1 hour):</strong> Recommended default</p>
                <p><strong>7200 seconds (2 hours):</strong> Extended operations</p>
                <p><strong>86400 seconds (24 hours):</strong> Maximum recommended</p>
              </div>
            </div>
          </Card>

          {/* How It Works */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">How Permit Works</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>1. User signs message:</strong> Off-chain signature with approval details</p>
                <p><strong>2. dApp submits permit:</strong> Transaction includes signature + approval</p>
                <p><strong>3. Contract verifies:</strong> Checks signature and executes approval</p>
                <p><strong>4. Action completes:</strong> Both approval and action in one transaction</p>
              </div>
            </div>
          </Card>

          {/* Benefits */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Permit Benefits</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Gas Savings:</strong> Combine approval + action in one transaction</p>
                <p><strong>Better UX:</strong> No separate approval transaction needed</p>
                <p><strong>Meta-Transactions:</strong> Enable gasless transactions for users</p>
                <p><strong>DeFi Integration:</strong> Standard for modern DeFi protocols</p>
              </div>
            </div>
          </Card>

          {/* Use Cases */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Common Use Cases</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>DEX Trading:</strong> Approve + swap in one transaction</p>
                <p><strong>Lending Protocols:</strong> Approve + deposit atomically</p>
                <p><strong>NFT Marketplaces:</strong> Approve + list seamlessly</p>
                <p><strong>Gasless Apps:</strong> Users pay no gas for approvals</p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-4 bg-primary/5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Permit Configuration</Label>
              <div className="grid grid-cols-2 gap-2 text-xs pl-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default Deadline:</span>
                  <span className="font-semibold">
                    {formatDuration(config.permitDeadline || 3600)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version:</span>
                  <span className="font-semibold">{config.permitVersion || '1'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Pre-deployment Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Permit functionality will be available 
              immediately upon deployment. Users and dApps can start using gasless approvals right away.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
