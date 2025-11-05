/**
 * ERC1155 Master Contract Configuration Component
 * Handles multi-token standard (fungible + non-fungible)
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { MasterConfigProps, ERC1155MasterConfig } from '../types';

export function ERC1155MasterConfigPanel({
  config,
  onChange,
  disabled = false,
  errors = {}
}: MasterConfigProps<ERC1155MasterConfig>) {

  const handleChange = (field: keyof ERC1155MasterConfig, value: string) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Create multiple token types in a single contract. Perfect for gaming items, badges, or collections 
          where you need both unique items (NFTs) and stackable items (fungible tokens).
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4">
        {/* Base URI for Metadata */}
        <div className="space-y-2">
          <Label className="text-xs">Metadata URI</Label>
          <Input
            value={config.uri}
            onChange={(e) => handleChange('uri', e.target.value)}
            placeholder="https://api.example.com/metadata/{id}.json"
            disabled={disabled}
          />
          {errors.uri && <p className="text-xs text-destructive">{errors.uri}</p>}
          <p className="text-xs text-muted-foreground">
            Base URI for token metadata. Use {'{id}'} as placeholder for token IDs
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
          <p className="text-xs text-muted-foreground">
            Address that will own and control the contract
          </p>
        </div>
      </div>
    </div>
  );
}
