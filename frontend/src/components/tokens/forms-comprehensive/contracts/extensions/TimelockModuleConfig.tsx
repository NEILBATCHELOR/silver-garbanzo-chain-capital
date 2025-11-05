/**
 * Timelock Module Configuration Component
 * Handles timelock delay settings
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, TimelockModuleConfig } from '../types';

export function TimelockModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<TimelockModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      minDelay: checked ? config.minDelay || 86400 : 0 // Default 1 day
    });
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

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Timelock Controller</Label>
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

          <div className="p-4 border rounded-lg space-y-4">
            {/* Minimum Delay */}
            <div className="space-y-2">
              <Label className="text-xs">Minimum Delay (seconds)</Label>
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
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Common values:</p>
                <ul className="list-disc list-inside pl-2">
                  <li>1 hour = 3600</li>
                  <li>1 day = 86400</li>
                  <li>2 days = 172800</li>
                  <li>1 week = 604800</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
