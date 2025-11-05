/**
 * Soulbound Module Configuration Component
 * ✅ ENHANCED: Complete soulbound token configuration with burn and expiration options
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Link2Off, Flame } from 'lucide-react';
import type { ModuleConfigProps, SoulboundModuleConfig } from '../types';

export function SoulboundModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<SoulboundModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        transferable: undefined,
        burnableByOwner: undefined,
        burnableByIssuer: undefined,
        expirationEnabled: undefined,
        expirationPeriod: undefined
      });
    } else {
      onChange({
        enabled: true,
        transferable: config.transferable || false,
        burnableByOwner: config.burnableByOwner !== false,
        burnableByIssuer: config.burnableByIssuer || false,
        expirationEnabled: config.expirationEnabled || false,
        expirationPeriod: config.expirationPeriod
      });
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const days = Math.floor(seconds / 86400);
    const years = Math.floor(days / 365);
    if (years > 0) return `${years} year${years > 1 ? 's' : ''} (${days} days)`;
    return `${days} days`;
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Soulbound Module</Label>
          <p className="text-xs text-muted-foreground">
            Make NFTs non-transferable and bound to the original owner
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
                <Link2Off className="h-3 w-3 mr-1" />
                Soulbound tokens cannot be transferred or sold once minted. Perfect for 
                credentials, certifications, achievements, or identity tokens.
              </div>
            </AlertDescription>
          </Alert>

          {/* Transfer Options */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Transfer Options</Label>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="transferable"
                  checked={config.transferable || false}
                  onChange={(e) => onChange({
                    ...config,
                    transferable: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="transferable" className="text-xs font-normal cursor-pointer">
                  Allow one-time transfer (for account recovery only)
                </Label>
              </div>

              {config.transferable && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Token can be transferred once to handle account recovery scenarios. 
                    After the first transfer, it becomes permanently bound.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* Burn Options */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <Flame className="h-4 w-4 mr-2 text-primary" />
                <Label className="text-sm font-medium">Burn Permissions</Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="burnableByOwner"
                    checked={config.burnableByOwner !== false}
                    onChange={(e) => onChange({
                      ...config,
                      burnableByOwner: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="burnableByOwner" className="text-xs font-normal cursor-pointer">
                    Owner can burn token (destroy their own credentials)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="burnableByIssuer"
                    checked={config.burnableByIssuer || false}
                    onChange={(e) => onChange({
                      ...config,
                      burnableByIssuer: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="burnableByIssuer" className="text-xs font-normal cursor-pointer">
                    Issuer can revoke token (burn credentials for policy violations)
                  </Label>
                </div>
              </div>
            </div>
          </Card>

          {/* Expiration Options */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="expirationEnabled"
                  checked={config.expirationEnabled || false}
                  onChange={(e) => onChange({
                    ...config,
                    expirationEnabled: e.target.checked,
                    expirationPeriod: e.target.checked ? (config.expirationPeriod || 31536000) : undefined
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="expirationEnabled" className="text-sm font-medium cursor-pointer">
                  Enable Expiration
                </Label>
              </div>

              {config.expirationEnabled && (
                <div className="space-y-2 pl-6">
                  <Label className="text-xs">Expiration Period (days)</Label>
                  <Input
                    type="number"
                    value={Math.floor((config.expirationPeriod || 0) / 86400)}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 0;
                      onChange({
                        ...config,
                        expirationPeriod: days * 86400
                      });
                    }}
                    placeholder="365"
                    disabled={disabled}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Token expires after: {formatDuration(config.expirationPeriod)}
                  </p>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Expired tokens become invalid and may need renewal. Perfect for 
                      certifications or memberships with validity periods.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </Card>

          {/* Use Cases */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Soulbound Token Use Cases</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Educational Credentials:</strong> Degrees, certificates (with expiration if needed)</p>
                <p><strong>Professional Licenses:</strong> Medical licenses, bar admission (revocable)</p>
                <p><strong>Achievement Badges:</strong> Gaming achievements, course completions (permanent)</p>
                <p><strong>Membership Tokens:</strong> DAO membership, club access (with expiration)</p>
                <p><strong>Identity Credentials:</strong> KYC verification, reputation (transferable for recovery)</p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          {(config.transferable || config.burnableByOwner || config.burnableByIssuer || config.expirationEnabled) && (
            <Card className="p-4 bg-primary/5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Configuration Summary</Label>
                <div className="text-xs space-y-1 pl-2">
                  {config.transferable && <p>✓ One-time transfer enabled (for recovery)</p>}
                  {config.burnableByOwner !== false && <p>✓ Owner can burn their tokens</p>}
                  {config.burnableByIssuer && <p>✓ Issuer can revoke tokens</p>}
                  {config.expirationEnabled && (
                    <p>✓ Tokens expire after {formatDuration(config.expirationPeriod)}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Pre-deployment Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Soulbound settings will be enforced 
              immediately upon deployment. Transfers will be automatically prevented on-chain.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
