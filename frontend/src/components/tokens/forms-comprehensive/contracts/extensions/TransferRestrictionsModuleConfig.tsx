/**
 * Transfer Restrictions Module Configuration Component
 * ✅ ENHANCED: Comprehensive restriction management pre-deployment
 * Enforces complex transfer restrictions by partition for ERC1400
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Shield, Lock, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ModuleConfigProps, TransferRestrictionsModuleConfig, TransferRestriction } from '../types';

export function TransferRestrictionsModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<TransferRestrictionsModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      // When disabling, clear restrictions
      onChange({
        ...config,
        enabled: false,
        restrictions: [],
        defaultPolicy: 'allow'
      });
    } else {
      // When enabling, initialize with empty restrictions array
      onChange({
        ...config,
        enabled: true,
        restrictions: config.restrictions || [],
        defaultPolicy: config.defaultPolicy || 'allow'
      });
    }
  };

  const addRestriction = () => {
    const newRestriction: TransferRestriction = {
      restrictionType: 'jurisdiction',
      value: '',
      enabled: true,
      description: ''
    };

    onChange({
      ...config,
      restrictions: [...(config.restrictions || []), newRestriction]
    });
  };

  const removeRestriction = (index: number) => {
    const newRestrictions = [...(config.restrictions || [])];
    newRestrictions.splice(index, 1);
    onChange({
      ...config,
      restrictions: newRestrictions
    });
  };

  const updateRestriction = (index: number, field: keyof TransferRestriction, value: any) => {
    const newRestrictions = [...(config.restrictions || [])];
    newRestrictions[index] = {
      ...newRestrictions[index],
      [field]: value
    };
    onChange({
      ...config,
      restrictions: newRestrictions
    });
  };

  const addPartitionRestriction = () => {
    const newPartitionRestrictions = [
      ...(config.partitionRestrictions || []),
      {
        partition: '',
        restrictions: {
          lockupPeriod: 0,
          maxHoldersPerPartition: 0,
          maxTokensPerHolder: '0',
          transferWindows: []
        }
      }
    ];
    onChange({
      ...config,
      partitionRestrictions: newPartitionRestrictions
    });
  };

  const removePartitionRestriction = (index: number) => {
    const newPartitionRestrictions = [...(config.partitionRestrictions || [])];
    newPartitionRestrictions.splice(index, 1);
    onChange({
      ...config,
      partitionRestrictions: newPartitionRestrictions
    });
  };

  const updatePartitionRestriction = (index: number, field: string, value: any) => {
    const newPartitionRestrictions = [...(config.partitionRestrictions || [])];
    if (field === 'partition') {
      newPartitionRestrictions[index].partition = value;
    } else {
      newPartitionRestrictions[index].restrictions = {
        ...newPartitionRestrictions[index].restrictions,
        [field]: value
      };
    }
    onChange({
      ...config,
      partitionRestrictions: newPartitionRestrictions
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Transfer Restrictions Module</Label>
          <p className="text-xs text-muted-foreground">
            Enforce compliance rules, lock-up periods, and transfer limitations
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
          {/* Default Policy */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm">Default Transfer Policy</Label>
              <Select
                value={config.defaultPolicy || 'allow'}
                onValueChange={(value: 'allow' | 'block') => onChange({
                  ...config,
                  defaultPolicy: value
                })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow (restrictions must explicitly block)</SelectItem>
                  <SelectItem value="block">Block (restrictions must explicitly allow)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default behavior when no specific restriction applies
              </p>
            </div>
          </Card>

          {/* General Restrictions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                General Restrictions
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRestriction}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Restriction
              </Button>
            </div>

            {(!config.restrictions || config.restrictions.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No restrictions configured. Click "Add Restriction" to define transfer limitations.
                </AlertDescription>
              </Alert>
            )}

            {config.restrictions && config.restrictions.map((restriction, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">Restriction {index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRestriction(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Restriction Type *</Label>
                      <Select
                        value={restriction.restrictionType}
                        onValueChange={(value) => updateRestriction(index, 'restrictionType', value)}
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jurisdiction">Jurisdiction</SelectItem>
                          <SelectItem value="investorType">Investor Type</SelectItem>
                          <SelectItem value="lockup">Lock-up Period</SelectItem>
                          <SelectItem value="limit">Transfer Limit</SelectItem>
                          <SelectItem value="timeWindow">Time Window</SelectItem>
                          <SelectItem value="whitelist">Whitelist</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Value *</Label>
                      <Input
                        value={restriction.value}
                        onChange={(e) => updateRestriction(index, 'value', e.target.value)}
                        disabled={disabled}
                        placeholder={
                          restriction.restrictionType === 'jurisdiction' ? 'US, EU' :
                          restriction.restrictionType === 'investorType' ? 'accredited' :
                          restriction.restrictionType === 'lockup' ? '31536000' :
                          restriction.restrictionType === 'limit' ? '1000000' :
                          'value'
                        }
                        className="text-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Description (Optional)</Label>
                      <Input
                        value={restriction.description || ''}
                        onChange={(e) => updateRestriction(index, 'description', e.target.value)}
                        disabled={disabled}
                        placeholder="Explain this restriction..."
                        className="text-sm"
                      />
                    </div>

                    <div className="col-span-2 flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`restriction-enabled-${index}`}
                        checked={restriction.enabled}
                        onChange={(e) => updateRestriction(index, 'enabled', e.target.checked)}
                        disabled={disabled}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`restriction-enabled-${index}`} className="text-xs font-normal cursor-pointer">
                        Restriction Enabled
                      </Label>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Partition-Specific Restrictions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Partition-Specific Restrictions
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPartitionRestriction}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Partition Rule
              </Button>
            </div>

            {config.partitionRestrictions && config.partitionRestrictions.map((partitionRestriction, index) => (
              <Card key={index} className="p-4 border-l-4 border-l-primary">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">Partition Rule {index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePartitionRestriction(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Partition Name *</Label>
                    <Input
                      value={partitionRestriction.partition}
                      onChange={(e) => updatePartitionRestriction(index, 'partition', e.target.value)}
                      disabled={disabled}
                      placeholder="e.g., reserved, locked, tranche-A"
                      className="text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Lock-up Period (seconds)</Label>
                      <Input
                        type="number"
                        value={partitionRestriction.restrictions.lockupPeriod || 0}
                        onChange={(e) => updatePartitionRestriction(index, 'lockupPeriod', parseInt(e.target.value) || 0)}
                        disabled={disabled}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Max Holders</Label>
                      <Input
                        type="number"
                        value={partitionRestriction.restrictions.maxHoldersPerPartition || 0}
                        onChange={(e) => updatePartitionRestriction(index, 'maxHoldersPerPartition', parseInt(e.target.value) || 0)}
                        disabled={disabled}
                        placeholder="0 = unlimited"
                        className="text-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Max Tokens Per Holder</Label>
                      <Input
                        value={partitionRestriction.restrictions.maxTokensPerHolder || '0'}
                        onChange={(e) => updatePartitionRestriction(index, 'maxTokensPerHolder', e.target.value)}
                        disabled={disabled}
                        placeholder="0 = unlimited"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Jurisdiction Restrictions */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm">Jurisdiction Restrictions (Optional)</Label>
              <Textarea
                value={JSON.stringify(config.jurisdictionRestrictions || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    onChange({
                      ...config,
                      jurisdictionRestrictions: parsed
                    });
                  } catch {}
                }}
                disabled={disabled}
                placeholder='{"US": true, "CN": false, "EU": true}'
                className="font-mono text-xs min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                JSON object mapping jurisdiction codes to allowed/blocked status
              </p>
            </div>
          </Card>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> All transfer restrictions will be enforced 
              automatically when the token is deployed. Use general restrictions for token-wide rules 
              and partition-specific restrictions for tranche-based compliance.
            </AlertDescription>
          </Alert>

          {/* Summary */}
          {(config.restrictions && config.restrictions.length > 0) && (
            <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg">
              <span className="text-muted-foreground">
                Total Restrictions Configured
              </span>
              <span className="font-semibold">
                {config.restrictions.length} general 
                {config.partitionRestrictions && config.partitionRestrictions.length > 0 && (
                  <> + {config.partitionRestrictions.length} partition-specific</>
                )}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
