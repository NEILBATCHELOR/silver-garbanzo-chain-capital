/**
 * Timelock Module Configuration Component
 * ✅ ENHANCED: Token timelock (individual locks, not governance)
 * Handles token locking with configurable durations and lock managers
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Lock, Clock, Shield } from 'lucide-react';
import type { ModuleConfigProps, TimelockModuleConfig } from '../types';

export function TimelockModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<TimelockModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false
      });
    } else {
      onChange({
        enabled: true,
        minLockDuration: config.minLockDuration || 3600, // Default 1 hour
        maxLockDuration: config.maxLockDuration || 31536000, // Default 1 year
        lockManagers: config.lockManagers || [],
        allowExtension: config.allowExtension !== false // Default true
      });
    }
  };

  const handleMinDurationChange = (value: string) => {
    const duration = parseInt(value);
    if (!isNaN(duration) && duration >= 0) {
      onChange({
        ...config,
        minLockDuration: duration
      });
    }
  };

  const handleMaxDurationChange = (value: string) => {
    const duration = parseInt(value);
    if (!isNaN(duration) && duration >= 0) {
      onChange({
        ...config,
        maxLockDuration: duration
      });
    }
  };

  const handleDefaultDurationChange = (value: string) => {
    const duration = parseInt(value);
    if (!isNaN(duration) && duration >= 0) {
      onChange({
        ...config,
        defaultLockDuration: duration
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.length > 0 ? parts.join(' ') : '0m';
  };

  // Lock Managers Management
  const addLockManager = () => {
    onChange({
      ...config,
      lockManagers: [...(config.lockManagers || []), '']
    });
  };

  const removeLockManager = (index: number) => {
    const newManagers = [...(config.lockManagers || [])];
    newManagers.splice(index, 1);
    onChange({
      ...config,
      lockManagers: newManagers
    });
  };

  const updateLockManager = (index: number, value: string) => {
    const newManagers = [...(config.lockManagers || [])];
    newManagers[index] = value;
    onChange({
      ...config,
      lockManagers: newManagers
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Token Timelock</Label>
          <p className="text-xs text-muted-foreground">
            Lock tokens for specific durations with customizable constraints
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
            <AlertDescription>
              Token timelock allows users to lock their tokens for specific durations.
              Useful for vesting, staking rewards, or voluntary lock-ups.
            </AlertDescription>
          </Alert>

          {/* Lock Duration Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Lock Duration Constraints
              </Label>

              <div className="grid grid-cols-3 gap-4">
                {/* Minimum Lock Duration */}
                <div className="space-y-2">
                  <Label className="text-xs">Minimum Duration (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="3600"
                    value={config.minLockDuration || 3600}
                    onChange={(e) => handleMinDurationChange(e.target.value)}
                    disabled={disabled}
                    placeholder="3600"
                  />
                  <p className="text-xs text-muted-foreground">
                    Min: {formatDuration(config.minLockDuration || 3600)}
                  </p>
                </div>

                {/* Maximum Lock Duration */}
                <div className="space-y-2">
                  <Label className="text-xs">Maximum Duration (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="86400"
                    value={config.maxLockDuration || 31536000}
                    onChange={(e) => handleMaxDurationChange(e.target.value)}
                    disabled={disabled}
                    placeholder="31536000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Max: {formatDuration(config.maxLockDuration || 31536000)}
                  </p>
                </div>

                {/* Default Lock Duration */}
                <div className="space-y-2">
                  <Label className="text-xs">Default Duration (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="86400"
                    value={config.defaultLockDuration || ''}
                    onChange={(e) => handleDefaultDurationChange(e.target.value)}
                    disabled={disabled}
                    placeholder="86400"
                  />
                  {config.defaultLockDuration && (
                    <p className="text-xs text-muted-foreground">
                      Default: {formatDuration(config.defaultLockDuration)}
                    </p>
                  )}
                </div>
              </div>

              {/* Common Duration Values Helper */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Common duration values:</p>
                <div className="grid grid-cols-2 gap-x-4">
                  <ul className="list-disc list-inside pl-2">
                    <li>1 hour = 3,600</li>
                    <li>1 day = 86,400</li>
                    <li>1 week = 604,800</li>
                  </ul>
                  <ul className="list-disc list-inside pl-2">
                    <li>1 month = 2,592,000</li>
                    <li>3 months = 7,776,000</li>
                    <li>1 year = 31,536,000</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* Lock Extension Setting */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Allow Lock Extension
                </Label>
                <p className="text-xs text-muted-foreground">
                  Permit users to extend their lock durations
                </p>
              </div>
              <Switch
                checked={config.allowExtension !== false}
                onCheckedChange={(checked) => onChange({ ...config, allowExtension: checked })}
                disabled={disabled}
              />
            </div>
          </Card>

          {/* Lock Managers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Lock Manager Addresses
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLockManager}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Manager
              </Button>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Lock managers can cancel active locks in emergency situations. 
                {(!config.lockManagers || config.lockManagers.length === 0) && 
                  ' Add manager addresses to enable lock cancellation.'}
              </AlertDescription>
            </Alert>

            {config.lockManagers && config.lockManagers.map((manager, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={manager}
                  onChange={(e) => updateLockManager(index, e.target.value)}
                  disabled={disabled}
                  placeholder="0x..."
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLockManager(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <Card className="p-4 bg-primary/10">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Timelock Summary</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Lock:</span>
                  <span className="font-semibold">
                    {formatDuration(config.minLockDuration || 3600)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Lock:</span>
                  <span className="font-semibold">
                    {formatDuration(config.maxLockDuration || 31536000)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extension:</span>
                  <span className="font-semibold">
                    {config.allowExtension !== false ? 'Allowed' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Managers:</span>
                  <span className="font-semibold">{config.lockManagers?.length || 0}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* How Token Locks Work */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-2">
              <p><strong>How token locks work:</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Users can lock specific amounts of their tokens for chosen durations</li>
                <li>Locked tokens cannot be transferred until the lock expires</li>
                <li>Multiple concurrent locks per user are supported</li>
                <li>Users can unlock tokens after expiration or extend lock durations</li>
                <li>Lock managers can cancel locks in emergency situations</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Pre-deployment Notice */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Timelock constraints and managers will be 
              configured during deployment. Users will create individual locks through the token contract.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
