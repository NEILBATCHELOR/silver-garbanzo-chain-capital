/**
 * Consecutive Module Configuration Component (ERC721C)
 * ✅ ENHANCED: Complete consecutive minting configuration
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Layers } from 'lucide-react';
import type { ModuleConfigProps, ConsecutiveModuleConfig } from '../types';

export function ConsecutiveModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<ConsecutiveModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        batchSize: undefined,
        startTokenId: undefined,
        maxBatchSize: undefined
      });
    } else {
      onChange({
        enabled: true,
        batchSize: config.batchSize || 100,
        startTokenId: config.startTokenId || 0,
        maxBatchSize: config.maxBatchSize || 10000
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Consecutive Module (ERC721C)</Label>
          <p className="text-xs text-muted-foreground">
            Gas-efficient batch minting with sequential token IDs
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
                <Layers className="h-3 w-3 mr-1" />
                Consecutive minting significantly reduces gas costs for large NFT collections 
                by minting multiple tokens in a single transaction with sequential IDs.
              </div>
            </AlertDescription>
          </Alert>

          {/* Batch Configuration */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Batch Configuration</Label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Default Batch Size</Label>
                  <Input
                    type="number"
                    value={config.batchSize || 100}
                    onChange={(e) => onChange({
                      ...config,
                      batchSize: parseInt(e.target.value) || 100
                    })}
                    placeholder="100"
                    disabled={disabled}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default number of tokens per batch
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Maximum Batch Size</Label>
                  <Input
                    type="number"
                    value={config.maxBatchSize || 10000}
                    onChange={(e) => onChange({
                      ...config,
                      maxBatchSize: parseInt(e.target.value) || 10000
                    })}
                    placeholder="10000"
                    disabled={disabled}
                    min={config.batchSize || 1}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum tokens in single batch
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Starting Token ID */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Token ID Configuration</Label>

              <div>
                <Label className="text-xs">Starting Token ID</Label>
                <Input
                  type="number"
                  value={config.startTokenId !== undefined ? config.startTokenId : 0}
                  onChange={(e) => onChange({
                    ...config,
                    startTokenId: parseInt(e.target.value) || 0
                  })}
                  placeholder="0"
                  disabled={disabled}
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  First token ID in the collection (usually 0 or 1)
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Token IDs will be minted sequentially starting from{' '}
                  <strong>{config.startTokenId !== undefined ? config.startTokenId : 0}</strong>. 
                  Example: If starting at 0, batch of 100 will mint tokens 0-99.
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Gas Savings Example */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Gas Savings Example</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Traditional Minting:</strong> 100 tokens = 100 transactions = ~$500 gas</p>
                <p><strong>Consecutive Minting:</strong> 100 tokens = 1 transaction = ~$50 gas</p>
                <p><strong>Savings:</strong> 90% reduction in gas costs for large collections</p>
              </div>
            </div>
          </Card>

          {/* Use Cases */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Ideal Use Cases</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Large Collections:</strong> 10k PFP projects, generative art series</p>
                <p><strong>Event Tickets:</strong> Mint all tickets for venue at once</p>
                <p><strong>Membership Cards:</strong> Bulk issue organizational memberships</p>
                <p><strong>Game Assets:</strong> Mint starter packs or item series</p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-4 bg-primary/5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Consecutive Minting Configuration</Label>
              <div className="grid grid-cols-2 gap-2 text-xs pl-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start ID:</span>
                  <span className="font-semibold">{config.startTokenId !== undefined ? config.startTokenId : 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default batch:</span>
                  <span className="font-semibold">{config.batchSize || 100}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Max batch size:</span>
                  <span className="font-semibold">{config.maxBatchSize || 10000}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Pre-deployment Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Consecutive minting will be available 
              immediately upon deployment. Gas-efficient batch minting can be used right away.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
