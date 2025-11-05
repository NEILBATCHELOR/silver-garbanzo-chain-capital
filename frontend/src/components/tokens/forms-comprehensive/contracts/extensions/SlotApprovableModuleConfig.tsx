/**
 * Slot Approvable Module Configuration Component (ERC3525)
 * ✅ ENHANCED: Complete slot approval configuration
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CheckSquare } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ModuleConfigProps, SlotApprovableModuleConfig } from '../types';

export function SlotApprovableModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<SlotApprovableModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        approvalMode: undefined,
        requireSlotApproval: undefined
      });
    } else {
      onChange({
        enabled: true,
        approvalMode: config.approvalMode || 'both',
        requireSlotApproval: config.requireSlotApproval || false
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Slot Approvable Module (ERC3525)</Label>
          <p className="text-xs text-muted-foreground">
            Enable slot-level approvals for efficient batch operations
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
                <CheckSquare className="h-3 w-3 mr-1" />
                Slot approvals allow users to approve entire categories instead of individual tokens, 
                making batch operations more efficient and user-friendly.
              </div>
            </AlertDescription>
          </Alert>

          {/* Approval Mode */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Approval Mode</Label>

              <div>
                <Label className="text-xs">Mode</Label>
                <Select
                  value={config.approvalMode || 'both'}
                  onValueChange={(value: 'slot' | 'token' | 'both') => onChange({
                    ...config,
                    approvalMode: value
                  })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slot">Slot Only</SelectItem>
                    <SelectItem value="token">Token Only</SelectItem>
                    <SelectItem value="both">Both (Recommended)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Determines whether users can approve at slot level, token level, or both
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {config.approvalMode === 'slot' && 'Users can only approve entire slots (all tokens in a category)'}
                  {config.approvalMode === 'token' && 'Users can only approve individual tokens'}
                  {config.approvalMode === 'both' && 'Users can choose to approve at slot or token level (most flexible)'}
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Require Slot Approval */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requireSlotApproval"
                  checked={config.requireSlotApproval || false}
                  onChange={(e) => onChange({
                    ...config,
                    requireSlotApproval: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="requireSlotApproval" className="text-sm font-medium cursor-pointer">
                  Require slot approval for operations
                </Label>
              </div>

              {config.requireSlotApproval && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    All operations require explicit slot-level approval. Individual token 
                    approvals alone won't be sufficient. This adds an extra layer of security.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* Approval Mode Explanations */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Approval Mode Explanations</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Slot Only:</strong> Users approve entire categories at once (e.g., "all bonds")</p>
                <p><strong>Token Only:</strong> Traditional per-token approval (more granular control)</p>
                <p><strong>Both:</strong> Users choose based on their needs (maximum flexibility)</p>
              </div>
            </div>
          </Card>

          {/* Use Cases */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Slot Approval Use Cases</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Portfolio Management:</strong> Approve all assets in a category for rebalancing</p>
                <p><strong>Batch Trading:</strong> Sell multiple items from same category simultaneously</p>
                <p><strong>DEX Integration:</strong> Approve entire asset class for trading</p>
                <p><strong>Collateral Management:</strong> Approve all eligible collateral at once</p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-4 bg-primary/5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Slot Approval Configuration</Label>
              <div className="text-xs pl-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approval mode:</span>
                  <span className="font-semibold capitalize">{config.approvalMode || 'both'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slot approval required:</span>
                  <span className="font-semibold">{config.requireSlotApproval ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Pre-deployment Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Slot approval settings will be active 
              immediately upon deployment. Users can start using slot-level approvals right away.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
