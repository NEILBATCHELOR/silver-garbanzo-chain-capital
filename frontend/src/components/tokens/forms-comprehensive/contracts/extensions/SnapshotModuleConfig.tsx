/**
 * Snapshot Module Configuration Component
 * ✅ ENHANCED: Complete snapshot configuration with automatic snapshots
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Camera, Clock } from 'lucide-react';
import type { ModuleConfigProps, SnapshotModuleConfig } from '../types';

export function SnapshotModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<SnapshotModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        automaticSnapshots: undefined,
        snapshotInterval: undefined
      });
    } else {
      onChange({
        enabled: true,
        automaticSnapshots: config.automaticSnapshots || false,
        snapshotInterval: config.snapshotInterval
      });
    }
  };

  const formatInterval = (seconds?: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} (${hours} hours)`;
    return `${hours} hours`;
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Snapshot Module</Label>
          <p className="text-xs text-muted-foreground">
            Capture token balances at specific blocks for governance and distributions
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
                <Camera className="h-3 w-3 mr-1" />
                Snapshots capture token holder balances at specific blocks. Essential for fair 
                governance voting, airdrops, dividend distributions, and historical analysis.
              </div>
            </AlertDescription>
          </Alert>

          {/* Automatic Snapshots */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="automaticSnapshots"
                  checked={config.automaticSnapshots || false}
                  onChange={(e) => onChange({
                    ...config,
                    automaticSnapshots: e.target.checked,
                    snapshotInterval: e.target.checked ? (config.snapshotInterval || 86400) : undefined
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="automaticSnapshots" className="text-sm font-medium cursor-pointer">
                  Enable Automatic Snapshots
                </Label>
              </div>

              {config.automaticSnapshots && (
                <div className="space-y-3 pl-6">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    <Label className="text-sm">Snapshot Interval</Label>
                  </div>

                  <div>
                    <Label className="text-xs">Interval (hours)</Label>
                    <Input
                      type="number"
                      value={Math.floor((config.snapshotInterval || 86400) / 3600)}
                      onChange={(e) => {
                        const hours = parseInt(e.target.value) || 24;
                        onChange({
                          ...config,
                          snapshotInterval: hours * 3600
                        });
                      }}
                      placeholder="24"
                      disabled={disabled}
                      min="1"
                      max="8760"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Time between automatic snapshots: {formatInterval(config.snapshotInterval)}
                    </p>
                    {errors?.['snapshotInterval'] && (
                      <p className="text-xs text-destructive mt-1">{errors['snapshotInterval']}</p>
                    )}
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Automatic snapshots occur every {formatInterval(config.snapshotInterval)}. 
                      Manual snapshots can still be triggered at any time by authorized addresses.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {!config.automaticSnapshots && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Manual snapshots only:</strong> Snapshots must be triggered manually 
                    by authorized addresses. This gives you full control over when balances are captured.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* Common Intervals */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Common Snapshot Intervals</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>24 hours (daily):</strong> Daily voting power updates</p>
                <p><strong>168 hours (weekly):</strong> Weekly governance cycles</p>
                <p><strong>720 hours (monthly):</strong> Monthly dividend snapshots</p>
                <p><strong>2160 hours (quarterly):</strong> Quarterly reports</p>
              </div>
            </div>
          </Card>

          {/* Use Cases */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Snapshot Use Cases</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Governance Voting:</strong> Capture voting power at proposal creation</p>
                <p><strong>Airdrops:</strong> Fair token distribution to existing holders</p>
                <p><strong>Dividends:</strong> Calculate payouts based on holdings at specific time</p>
                <p><strong>Historical Analysis:</strong> Track holder base evolution over time</p>
                <p><strong>Rewards:</strong> Determine staking rewards based on snapshots</p>
              </div>
            </div>
          </Card>

          {/* How It Works */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">How Snapshots Work</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>1. Snapshot Created:</strong> Records block number and timestamp</p>
                <p><strong>2. Balances Frozen:</strong> Token balances at that block are preserved</p>
                <p><strong>3. Query Anytime:</strong> Historical balances can be queried later</p>
                <p><strong>4. No Gas for Users:</strong> Snapshot creation doesn't affect token holders</p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          {config.automaticSnapshots && (
            <Card className="p-4 bg-primary/5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Snapshot Configuration</Label>
                <div className="text-xs pl-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-semibold">Automatic + Manual</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interval:</span>
                    <span className="font-semibold">{formatInterval(config.snapshotInterval)}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Pre-deployment Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Snapshot settings will be active 
              immediately upon deployment. The first automatic snapshot (if enabled) will occur 
              after the configured interval.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
