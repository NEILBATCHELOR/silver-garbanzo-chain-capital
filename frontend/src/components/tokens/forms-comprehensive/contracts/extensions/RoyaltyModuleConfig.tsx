/**
 * Royalty Module Configuration Component
 * ✅ ENHANCED: Per-token royalties and royalty caps
 * Handles NFT royalty settings (EIP-2981)
 * Used for both ERC721 and ERC1155 tokens
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, DollarSign } from 'lucide-react';
import type { ModuleConfigProps, RoyaltyModuleConfig } from '../types';

export function RoyaltyModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<RoyaltyModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false
      });
    } else {
      onChange({
        enabled: true,
        defaultRoyaltyBps: config.defaultRoyaltyBps || 250, // Default 2.5%
        royaltyRecipient: config.royaltyRecipient || '',
        perTokenRoyalties: config.perTokenRoyalties || [],
        maxRoyaltyBps: config.maxRoyaltyBps || 1000 // Default 10% cap
      });
    }
  };

  const handleDefaultBpsChange = (value: string) => {
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      onChange({
        ...config,
        defaultRoyaltyBps: Math.round(percentage * 100) // Convert to basis points
      });
    }
  };

  const handleMaxBpsChange = (value: string) => {
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      onChange({
        ...config,
        maxRoyaltyBps: Math.round(percentage * 100)
      });
    }
  };

  const handleRecipientChange = (value: string) => {
    onChange({
      ...config,
      royaltyRecipient: value
    });
  };

  // Per-Token Royalties Management
  const addPerTokenRoyalty = () => {
    onChange({
      ...config,
      perTokenRoyalties: [
        ...(config.perTokenRoyalties || []),
        {
          tokenId: '',
          royaltyBps: config.defaultRoyaltyBps || 250,
          recipient: config.royaltyRecipient || ''
        }
      ]
    });
  };

  const removePerTokenRoyalty = (index: number) => {
    const newRoyalties = [...(config.perTokenRoyalties || [])];
    newRoyalties.splice(index, 1);
    onChange({
      ...config,
      perTokenRoyalties: newRoyalties
    });
  };

  const updatePerTokenRoyalty = (index: number, field: string, value: any) => {
    const newRoyalties = [...(config.perTokenRoyalties || [])];
    if (field === 'royaltyBps') {
      const percentage = parseFloat(value);
      if (!isNaN(percentage)) {
        newRoyalties[index][field] = Math.round(percentage * 100);
      }
    } else {
      newRoyalties[index] = {
        ...newRoyalties[index],
        [field]: value
      };
    }
    onChange({
      ...config,
      perTokenRoyalties: newRoyalties
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">NFT Royalties (EIP-2981)</Label>
          <p className="text-xs text-muted-foreground">
            Enforce creator royalties on secondary marketplace sales
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
              Enforce creator royalties on secondary marketplace sales.
              Compatible with OpenSea, Rarible, and other EIP-2981 marketplaces.
            </AlertDescription>
          </Alert>

          {/* Default Royalty Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Default Royalty Settings
              </Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Default Royalty Percentage */}
                <div className="space-y-2">
                  <Label className="text-xs">Default Royalty (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max={config.maxRoyaltyBps ? config.maxRoyaltyBps / 100 : 10}
                    value={(config.defaultRoyaltyBps / 100).toFixed(1)}
                    onChange={(e) => handleDefaultBpsChange(e.target.value)}
                    disabled={disabled}
                    placeholder="2.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical range: 2.5% - 10%
                  </p>
                  {errors?.['defaultRoyaltyBps'] && (
                    <p className="text-xs text-destructive">{errors['defaultRoyaltyBps']}</p>
                  )}
                </div>

                {/* Max Royalty Cap */}
                <div className="space-y-2">
                  <Label className="text-xs">Max Royalty Cap (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={config.maxRoyaltyBps ? (config.maxRoyaltyBps / 100).toFixed(1) : '10.0'}
                    onChange={(e) => handleMaxBpsChange(e.target.value)}
                    disabled={disabled}
                    placeholder="10.0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum allowed royalty percentage
                  </p>
                </div>

                {/* Default Royalty Recipient */}
                <div className="space-y-2 col-span-full">
                  <Label className="text-xs">Default Royalty Recipient Address *</Label>
                  <Input
                    value={config.royaltyRecipient}
                    onChange={(e) => handleRecipientChange(e.target.value)}
                    placeholder="0x..."
                    disabled={disabled}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Address that will receive royalty payments for all tokens
                  </p>
                  {errors?.['royaltyRecipient'] && (
                    <p className="text-xs text-destructive">{errors['royaltyRecipient']}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Per-Token Royalties */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Per-Token Royalty Overrides</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPerTokenRoyalty}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Token Override
              </Button>
            </div>

            {(!config.perTokenRoyalties || config.perTokenRoyalties.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No per-token royalty overrides configured. All tokens will use the default royalty settings. 
                  Click "Add Token Override" to set custom royalties for specific tokens.
                </AlertDescription>
              </Alert>
            )}

            {config.perTokenRoyalties && config.perTokenRoyalties.map((tokenRoyalty, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">Token Royalty Override {index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePerTokenRoyalty(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Token ID *</Label>
                      <Input
                        value={tokenRoyalty.tokenId}
                        onChange={(e) => updatePerTokenRoyalty(index, 'tokenId', e.target.value)}
                        disabled={disabled}
                        placeholder="1"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Royalty (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max={config.maxRoyaltyBps ? config.maxRoyaltyBps / 100 : 10}
                        value={(tokenRoyalty.royaltyBps / 100).toFixed(1)}
                        onChange={(e) => updatePerTokenRoyalty(index, 'royaltyBps', e.target.value)}
                        disabled={disabled}
                        placeholder="2.5"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Recipient</Label>
                      <Input
                        value={tokenRoyalty.recipient}
                        onChange={(e) => updatePerTokenRoyalty(index, 'recipient', e.target.value)}
                        disabled={disabled}
                        placeholder="0x... or leave empty"
                        className="text-sm font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {!tokenRoyalty.recipient && 'Uses default recipient'}
                      </p>
                    </div>
                  </div>

                  {tokenRoyalty.tokenId && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Token <strong>#{tokenRoyalty.tokenId}</strong> will have{' '}
                        <strong>{(tokenRoyalty.royaltyBps / 100).toFixed(1)}%</strong> royalty 
                        paid to {tokenRoyalty.recipient || 'default recipient'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Royalty Example */}
          <Card className="p-4 bg-primary/10">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Royalty Calculation Example</Label>
              <div className="text-xs space-y-1">
                <p>
                  If a token sells for <strong>1 ETH</strong> on a marketplace:
                </p>
                <ul className="list-disc list-inside pl-2 space-y-0.5">
                  <li>Royalty: <strong>{((config.defaultRoyaltyBps / 100) || 2.5).toFixed(2)}%</strong></li>
                  <li>Amount to creator: <strong>{((1 * (config.defaultRoyaltyBps / 100)) / 100).toFixed(4)} ETH</strong></li>
                  <li>Amount to seller: <strong>{(1 - ((1 * (config.defaultRoyaltyBps / 100)) / 100)).toFixed(4)} ETH</strong></li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Summary */}
          {config.perTokenRoyalties && config.perTokenRoyalties.length > 0 && (
            <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg">
              <span className="text-muted-foreground">
                Custom Royalty Overrides
              </span>
              <span className="font-semibold">
                {config.perTokenRoyalties.length} {config.perTokenRoyalties.length === 1 ? 'token' : 'tokens'}
              </span>
            </div>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Royalty settings will be configured 
              automatically during deployment. Compatible marketplaces will automatically enforce 
              these royalties on secondary sales.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
