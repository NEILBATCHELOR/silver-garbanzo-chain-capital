/**
 * Timelock Module Configuration Component
 * ✅ ENHANCED: Complete timelock with proposers and executors
 * Handles timelock delay settings with role management
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Clock, Shield } from 'lucide-react';
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
        minDelay: config.minDelay || 86400, // Default 1 day
        gracePeriod: config.gracePeriod || 604800, // Default 7 days
        proposers: config.proposers || [],
        executors: config.executors || []
      });
    }
  };

  const handleDelayChange = (value: string) => {
    const delay = parseInt(value);
    if (!isNaN(delay) && delay >= 0) {
      onChange({
        ...config,
        minDelay: delay
      });
    }
  };

  const handleGracePeriodChange = (value: string) => {
    const period = parseInt(value);
    if (!isNaN(period) && period >= 0) {
      onChange({
        ...config,
        gracePeriod: period
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

  // Proposers Management
  const addProposer = () => {
    onChange({
      ...config,
      proposers: [...(config.proposers || []), '']
    });
  };

  const removeProposer = (index: number) => {
    const newProposers = [...(config.proposers || [])];
    newProposers.splice(index, 1);
    onChange({
      ...config,
      proposers: newProposers
    });
  };

  const updateProposer = (index: number, value: string) => {
    const newProposers = [...(config.proposers || [])];
    newProposers[index] = value;
    onChange({
      ...config,
      proposers: newProposers
    });
  };

  // Executors Management
  const addExecutor = () => {
    onChange({
      ...config,
      executors: [...(config.executors || []), '']
    });
  };

  const removeExecutor = (index: number) => {
    const newExecutors = [...(config.executors || [])];
    newExecutors.splice(index, 1);
    onChange({
      ...config,
      executors: newExecutors
    });
  };

  const updateExecutor = (index: number, value: string) => {
    const newExecutors = [...(config.executors || [])];
    newExecutors[index] = value;
    onChange({
      ...config,
      executors: newExecutors
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Timelock Controller</Label>
          <p className="text-xs text-muted-foreground">
            Delay administrative actions to provide transparency and security
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
              Delay administrative actions to provide transparency and security.
              Governance proposals must wait the minimum delay before execution.
            </AlertDescription>
          </Alert>

          {/* Delay Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Delay Settings
              </Label>

              <div className="grid grid-cols-2 gap-4">
                {/* Minimum Delay */}
                <div className="space-y-2">
                  <Label className="text-xs">Minimum Delay (seconds) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="3600"
                    value={config.minDelay}
                    onChange={(e) => handleDelayChange(e.target.value)}
                    disabled={disabled}
                    placeholder="86400"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current delay: {formatDuration(config.minDelay)}
                  </p>
                  {errors?.['minDelay'] && (
                    <p className="text-xs text-destructive">{errors['minDelay']}</p>
                  )}
                </div>

                {/* Grace Period */}
                <div className="space-y-2">
                  <Label className="text-xs">Grace Period (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="3600"
                    value={config.gracePeriod || 604800}
                    onChange={(e) => handleGracePeriodChange(e.target.value)}
                    disabled={disabled}
                    placeholder="604800"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: {formatDuration(config.gracePeriod || 604800)}
                  </p>
                </div>
              </div>

              {/* Common Values Helper */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Common delay values:</p>
                <ul className="list-disc list-inside pl-2">
                  <li>1 hour = 3600</li>
                  <li>1 day = 86400</li>
                  <li>2 days = 172800</li>
                  <li>1 week = 604800</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Proposers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Proposer Addresses
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProposer}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Proposer
              </Button>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Proposers can schedule actions to be executed after the delay period. 
                {(!config.proposers || config.proposers.length === 0) && ' Add at least one proposer address.'}
              </AlertDescription>
            </Alert>

            {config.proposers && config.proposers.map((proposer, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={proposer}
                  onChange={(e) => updateProposer(index, e.target.value)}
                  disabled={disabled}
                  placeholder="0x..."
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProposer(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Executors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Executor Addresses
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExecutor}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Executor
              </Button>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Executors can execute actions after the delay period has passed. 
                {(!config.executors || config.executors.length === 0) && ' Add at least one executor address.'}
              </AlertDescription>
            </Alert>

            {config.executors && config.executors.map((executor, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={executor}
                  onChange={(e) => updateExecutor(index, e.target.value)}
                  disabled={disabled}
                  placeholder="0x..."
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExecutor(index)}
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
                  <span className="text-muted-foreground">Min Delay:</span>
                  <span className="font-semibold">{formatDuration(config.minDelay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grace Period:</span>
                  <span className="font-semibold">{formatDuration(config.gracePeriod || 604800)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Proposers:</span>
                  <span className="font-semibold">{config.proposers?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Executors:</span>
                  <span className="font-semibold">{config.executors?.length || 0}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Timelock settings will be configured 
              automatically during deployment. Actions must be proposed, wait the minimum delay, 
              then be executed within the grace period.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
