/**
 * ERC721 Master Contract Configuration Component
 * Handles NFT (Non-Fungible Token) parameters
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { MasterConfigProps, ERC721MasterConfig } from '../types';

export function ERC721MasterConfigPanel({
  config,
  onChange,
  disabled = false,
  errors = {}
}: MasterConfigProps<ERC721MasterConfig>) {

  const handleChange = (field: keyof ERC721MasterConfig, value: string) => {
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
          Create unique non-fungible tokens (NFTs). Each token has a unique ID and can represent digital art, 
          collectibles, game items, or any unique digital asset.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Collection Name */}
        <div className="space-y-2">
          <Label className="text-xs">Collection Name</Label>
          <Input
            value={config.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="My NFT Collection"
            disabled={disabled}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          <p className="text-xs text-muted-foreground">
            Full name of your NFT collection
          </p>
        </div>

        {/* Collection Symbol */}
        <div className="space-y-2">
          <Label className="text-xs">Collection Symbol</Label>
          <Input
            value={config.symbol}
            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
            placeholder="MNFT"
            disabled={disabled}
          />
          {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
          <p className="text-xs text-muted-foreground">
            Short identifier (2-5 characters)
          </p>
        </div>

        {/* Max Supply */}
        <div className="space-y-2">
          <Label className="text-xs">Maximum Supply</Label>
          <Input
            type="number"
            value={config.maxSupply}
            onChange={(e) => handleChange('maxSupply', e.target.value)}
            placeholder="10000"
            disabled={disabled}
          />
          {errors.maxSupply && <p className="text-xs text-destructive">{errors.maxSupply}</p>}
          <p className="text-xs text-muted-foreground">
            Maximum number of NFTs (0 = unlimited)
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
            Address that will own and control the collection
          </p>
        </div>
      </div>
    </div>
  );
}
