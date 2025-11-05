/**
 * ERC1400 Master Contract Configuration Component
 * Handles security tokens with partitions
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, X } from 'lucide-react';
import type { MasterConfigProps, ERC1400MasterConfig } from '../types';

export function ERC1400MasterConfigPanel({
  config,
  onChange,
  disabled = false,
  errors = {}
}: MasterConfigProps<ERC1400MasterConfig>) {

  const [newPartition, setNewPartition] = useState('');

  const handleChange = (field: keyof ERC1400MasterConfig, value: string | string[] | number | boolean) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  const addPartition = () => {
    if (newPartition.trim() && !config.defaultPartitions.includes(newPartition.trim())) {
      handleChange('defaultPartitions', [...config.defaultPartitions, newPartition.trim()]);
      setNewPartition('');
    }
  };

  const removePartition = (partition: string) => {
    handleChange('defaultPartitions', config.defaultPartitions.filter(p => p !== partition));
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Create regulated security tokens with partition-based transfers. Partitions allow segregating 
          tokens for compliance (e.g., locked shares, restricted shares, etc.).
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Name */}
        <div className="space-y-2">
          <Label className="text-xs">Security Token Name</Label>
          <Input
            value={config.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="My Security Token"
            disabled={disabled}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Token Symbol */}
        <div className="space-y-2">
          <Label className="text-xs">Token Symbol</Label>
          <Input
            value={config.symbol}
            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
            placeholder="SEC"
            disabled={disabled}
          />
          {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
        </div>

        {/* Decimals */}
        <div className="space-y-2">
          <Label className="text-xs">Decimals</Label>
          <Input
            type="number"
            min="0"
            max="18"
            value={config.decimals}
            onChange={(e) => handleChange('decimals', parseInt(e.target.value) || 18)}
            placeholder="18"
            disabled={disabled}
          />
          {errors.decimals && <p className="text-xs text-destructive">{errors.decimals}</p>}
          <p className="text-xs text-muted-foreground">
            Number of decimal places (typically 18)
          </p>
        </div>

        {/* Owner Address */}
        <div className="space-y-2">
          <Label className="text-xs">Owner Address</Label>
          <Input
            value={config.owner}
            onChange={(e) => handleChange('owner', e.target.value)}
            placeholder="0x..."
            disabled={disabled}
          />
          {errors.owner && <p className="text-xs text-destructive">{errors.owner}</p>}
        </div>

        {/* Is Controllable */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs">Controllable Token</Label>
              <p className="text-xs text-muted-foreground">
                Allow designated controllers to force transfer tokens (required for regulatory compliance)
              </p>
            </div>
            <Switch
              checked={config.isControllable}
              onCheckedChange={(checked) => handleChange('isControllable', checked)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Default Partitions */}
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs">Default Partitions</Label>
          <div className="flex gap-2">
            <Input
              value={newPartition}
              onChange={(e) => setNewPartition(e.target.value)}
              placeholder="e.g., locked, restricted, unrestricted"
              disabled={disabled}
              onKeyPress={(e) => e.key === 'Enter' && addPartition()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addPartition}
              disabled={disabled || !newPartition.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* List of Partitions */}
          {config.defaultPartitions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {config.defaultPartitions.map(partition => (
                <div key={partition} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded">
                  <span className="text-xs">{partition}</span>
                  <button
                    type="button"
                    onClick={() => removePartition(partition)}
                    disabled={disabled}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {errors.defaultPartitions && <p className="text-xs text-destructive">{errors.defaultPartitions}</p>}
          <p className="text-xs text-muted-foreground">
            Token categories for compliance and transfer restrictions
          </p>
        </div>
      </div>
    </div>
  );
}
