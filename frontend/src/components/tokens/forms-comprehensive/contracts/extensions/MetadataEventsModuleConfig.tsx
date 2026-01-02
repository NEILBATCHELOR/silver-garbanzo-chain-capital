/**
 * Metadata Events Module Configuration Component (EIP-4906)
 * ✅ ENHANCED: Complete metadata event configuration
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Bell } from 'lucide-react';
import type { ModuleConfigProps, MetadataEventsModuleConfig } from '../types';

export function MetadataEventsModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<MetadataEventsModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        batchUpdatesEnabled: undefined,
        emitOnTransfer: undefined
      });
    } else {
      onChange({
        enabled: true,
        batchUpdatesEnabled: config.batchUpdatesEnabled !== false,
        emitOnTransfer: config.emitOnTransfer || false
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Metadata Events Module (EIP-4906)</Label>
          <p className="text-xs text-muted-foreground">
            Emit events when NFT metadata changes for marketplace updates
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
                <Bell className="h-3 w-3 mr-1" />
                Metadata events notify marketplaces and indexers when NFT metadata changes, 
                ensuring accurate display of dynamic NFTs and updated attributes.
              </div>
            </AlertDescription>
          </Alert>

          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Phase 1: Initialization Settings</Label>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="batchUpdatesEnabled"
                    checked={config.batchUpdatesEnabled !== false}
                    onChange={(e) => onChange({
                      ...config,
                      batchUpdatesEnabled: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="batchUpdatesEnabled" className="text-xs font-normal cursor-pointer">
                    Enable batch metadata update events (for multiple tokens at once)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="emitOnTransfer"
                    checked={config.emitOnTransfer || false}
                    onChange={(e) => onChange({
                      ...config,
                      emitOnTransfer: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="emitOnTransfer" className="text-xs font-normal cursor-pointer">
                    Emit metadata event on every transfer (for dynamic ownership-based traits)
                  </Label>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Use Cases</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Dynamic NFTs:</strong> Stats change based on game progress</p>
                <p><strong>Evolving Art:</strong> Artwork changes over time</p>
                <p><strong>Achievement Badges:</strong> Update as user completes tasks</p>
                <p><strong>Marketplace Integration:</strong> Auto-refresh on OpenSea/Blur</p>
              </div>
            </div>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Metadata events will be emitted 
              automatically according to these settings. Marketplaces will detect and update displays.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
