/**
 * Royalty Module Configuration Component
 * Handles NFT royalty settings (EIP-2981)
 * Used for both ERC721 and ERC1155 tokens
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, RoyaltyModuleConfig } from '../types';

export function RoyaltyModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<RoyaltyModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      defaultRoyaltyBps: checked ? config.defaultRoyaltyBps || 250 : 0,
      royaltyRecipient: checked ? config.royaltyRecipient : ''
    });
  };

  const handleBpsChange = (value: string) => {
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      onChange({
        ...config,
        defaultRoyaltyBps: Math.round(percentage * 100) // Convert to basis points
      });
    }
  };

  const handleRecipientChange = (value: string) => {
    onChange({
      ...config,
      royaltyRecipient: value
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">NFT Royalties (EIP-2981)</Label>
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
              Enforce creator royalties on secondary marketplace sales.
              Compatible with OpenSea, Rarible, and other EIP-2981 marketplaces.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
            {/* Royalty Percentage */}
            <div className="space-y-2">
              <Label className="text-xs">Royalty Percentage (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={(config.defaultRoyaltyBps / 100).toFixed(1)}
                onChange={(e) => handleBpsChange(e.target.value)}
                disabled={disabled}
                placeholder="2.5"
              />
              <p className="text-xs text-muted-foreground">
                Typical range: 2.5% - 10%
              </p>
            </div>

            {/* Royalty Recipient */}
            <div className="space-y-2">
              <Label className="text-xs">Royalty Recipient Address</Label>
              <Input
                value={config.royaltyRecipient}
                onChange={(e) => handleRecipientChange(e.target.value)}
                placeholder="0x..."
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Address that will receive royalty payments
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
