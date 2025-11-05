/**
 * Slot Manager Module Configuration Component
 * ✅ ENHANCED: Full slot definition management pre-deployment
 * Advanced slot creation and management for ERC3525
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Layers, Settings } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { ModuleConfigProps, SlotManagerModuleConfig, SlotDefinition } from '../types';

export function SlotManagerModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<SlotManagerModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      // When disabling, clear slots
      onChange({
        ...config,
        enabled: false,
        slots: []
      });
    } else {
      // When enabling, initialize with empty slots array
      onChange({
        ...config,
        enabled: true,
        slots: config.slots || []
      });
    }
  };

  const addSlot = () => {
    const newSlot: SlotDefinition = {
      slotId: `${Date.now()}`, // Temporary ID
      name: '',
      transferable: true,
      mergeable: true,
      splittable: true,
      maxSupply: '0', // 0 = unlimited
      metadata: '',
      restrictions: {
        minValue: '',
        maxValue: '',
        allowedOwners: []
      }
    };

    onChange({
      ...config,
      slots: [...(config.slots || []), newSlot]
    });
  };

  const removeSlot = (index: number) => {
    const newSlots = [...(config.slots || [])];
    newSlots.splice(index, 1);
    onChange({
      ...config,
      slots: newSlots
    });
  };

  const updateSlot = (index: number, field: keyof SlotDefinition, value: any) => {
    const newSlots = [...(config.slots || [])];
    newSlots[index] = {
      ...newSlots[index],
      [field]: value
    };
    onChange({
      ...config,
      slots: newSlots
    });
  };

  const updateSlotRestriction = (index: number, field: string, value: any) => {
    const newSlots = [...(config.slots || [])];
    newSlots[index] = {
      ...newSlots[index],
      restrictions: {
        ...(newSlots[index].restrictions || {}),
        [field]: value
      }
    };
    onChange({
      ...config,
      slots: newSlots
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Slot Manager Module</Label>
          <p className="text-xs text-muted-foreground">
            Define slots with custom rules for your ERC3525 semi-fungible tokens
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
          {/* Add Slot Button */}
          <div className="flex items-center justify-between pt-2">
            <Label className="text-sm">Slot Definitions</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSlot}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Slot
            </Button>
          </div>

          {/* Slot List */}
          {(!config.slots || config.slots.length === 0) && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No slots configured. Click "Add Slot" to define custom slots for your semi-fungible tokens.
              </AlertDescription>
            </Alert>
          )}

          {config.slots && config.slots.map((slot, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Slot {index + 1}
                    {slot.name && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({slot.name})
                      </span>
                    )}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSlot(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Basic Fields Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Slot ID */}
                  <div>
                    <Label className="text-xs">Slot ID *</Label>
                    <Input
                      value={slot.slotId}
                      onChange={(e) => updateSlot(index, 'slotId', e.target.value)}
                      disabled={disabled}
                      placeholder="e.g., 1, 2, 3"
                      className="font-mono text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Unique identifier for this slot
                    </p>
                  </div>

                  {/* Slot Name */}
                  <div>
                    <Label className="text-xs">Slot Name *</Label>
                    <Input
                      value={slot.name}
                      onChange={(e) => updateSlot(index, 'name', e.target.value)}
                      disabled={disabled}
                      placeholder="e.g., Gold Tier, Bronze Tier"
                      className="text-sm"
                    />
                  </div>

                  {/* Max Supply */}
                  <div className="col-span-2">
                    <Label className="text-xs">Max Supply (0 = unlimited)</Label>
                    <Input
                      value={slot.maxSupply || '0'}
                      onChange={(e) => updateSlot(index, 'maxSupply', e.target.value)}
                      disabled={disabled}
                      placeholder="0"
                      type="text"
                    />
                  </div>
                </div>

                {/* Boolean Flags */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-2">
                    <Settings className="h-3 w-3" />
                    Slot Capabilities
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`transferable-${index}`}
                        checked={slot.transferable}
                        onChange={(e) => updateSlot(index, 'transferable', e.target.checked)}
                        disabled={disabled}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`transferable-${index}`} className="text-xs font-normal cursor-pointer">
                        Transferable
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`mergeable-${index}`}
                        checked={slot.mergeable}
                        onChange={(e) => updateSlot(index, 'mergeable', e.target.checked)}
                        disabled={disabled}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`mergeable-${index}`} className="text-xs font-normal cursor-pointer">
                        Mergeable
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`splittable-${index}`}
                        checked={slot.splittable}
                        onChange={(e) => updateSlot(index, 'splittable', e.target.checked)}
                        disabled={disabled}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`splittable-${index}`} className="text-xs font-normal cursor-pointer">
                        Splittable
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Restrictions */}
                <div className="space-y-3">
                  <Label className="text-xs">Value Restrictions (Optional)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Min Value</Label>
                      <Input
                        value={slot.restrictions?.minValue || ''}
                        onChange={(e) => updateSlotRestriction(index, 'minValue', e.target.value)}
                        disabled={disabled}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Max Value</Label>
                      <Input
                        value={slot.restrictions?.maxValue || ''}
                        onChange={(e) => updateSlotRestriction(index, 'maxValue', e.target.value)}
                        disabled={disabled}
                        placeholder="Unlimited"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <Label className="text-xs">Metadata (JSON, Optional)</Label>
                  <Textarea
                    value={slot.metadata || ''}
                    onChange={(e) => updateSlot(index, 'metadata', e.target.value)}
                    disabled={disabled}
                    placeholder='{"description": "Gold tier benefits", "image": "ipfs://..."}'
                    className="font-mono text-xs min-h-[80px]"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Optional JSON metadata for this slot
                  </p>
                </div>

                {/* Summary */}
                {slot.name && slot.slotId && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Slot {slot.slotId}</strong> ({slot.name}) - 
                      {slot.transferable && ' Transferable'}
                      {slot.mergeable && ' • Mergeable'}
                      {slot.splittable && ' • Splittable'}
                      {slot.maxSupply && slot.maxSupply !== '0' && (
                        <> • Max supply: {slot.maxSupply}</>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </Card>
          ))}

          {/* Module Options */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm">Additional Options</Label>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowDynamicSlots"
                  checked={config.allowDynamicSlots || false}
                  onChange={(e) => onChange({
                    ...config,
                    allowDynamicSlots: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="allowDynamicSlots" className="text-xs font-normal cursor-pointer">
                  Allow dynamic slot creation (new slots can be created after deployment)
                </Label>
              </div>

              {config.allowDynamicSlots && (
                <div>
                  <Label className="text-xs">Slot Creation Fee (in wei)</Label>
                  <Input
                    value={config.slotCreationFee || '0'}
                    onChange={(e) => onChange({
                      ...config,
                      slotCreationFee: e.target.value
                    })}
                    disabled={disabled}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> All slot definitions will be created 
              automatically when the token is deployed. Each slot can have custom transfer rules, 
              merge/split capabilities, and supply constraints.
            </AlertDescription>
          </Alert>

          {/* Slot Count Summary */}
          {config.slots && config.slots.length > 0 && (
            <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg">
              <span className="text-muted-foreground">
                Total Slots Configured
              </span>
              <span className="font-semibold">
                {config.slots.length} {config.slots.length === 1 ? 'slot' : 'slots'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
