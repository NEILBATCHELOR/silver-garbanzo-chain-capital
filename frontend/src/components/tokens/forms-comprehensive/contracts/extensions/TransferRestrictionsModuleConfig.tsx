/**
 * Transfer Restrictions Module Configuration Component
 * ✅ ENHANCED: Comprehensive restriction management pre-deployment
 * Enforces complex transfer restrictions by partition for ERC1400
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Shield, Lock, Calendar, Copy, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ModuleConfigProps, TransferRestrictionsModuleConfig, TransferRestriction } from '../types';

export function TransferRestrictionsModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<TransferRestrictionsModuleConfig>) {

  // State for paste functionality
  const [pasteText, setPasteText] = useState('');
  const [parseResult, setParseResult] = useState<{ success: boolean; count: number; message: string } | null>(null);

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

  /**
   * Parse and add multiple whitelist/blocklist addresses from pasted text
   * Supports comma-separated and newline-separated addresses
   */
  const handlePasteAddresses = (listType: 'whitelist' | 'blocklist') => {
    if (!pasteText.trim()) {
      setParseResult({ success: false, count: 0, message: 'Please paste some addresses first' });
      return;
    }

    // Parse addresses (support both comma and newline separation)
    const rawAddresses = pasteText
      .split(/[\n,]+/)
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);

    // Validate addresses (basic 0x check)
    const validAddresses = rawAddresses.filter(addr => 
      addr.startsWith('0x') && addr.length === 42
    );

    const invalidCount = rawAddresses.length - validAddresses.length;

    if (validAddresses.length === 0) {
      setParseResult({
        success: false,
        count: 0,
        message: invalidCount > 0 
          ? `All ${invalidCount} addresses were invalid. Addresses must start with 0x and be 42 characters long.`
          : 'No valid addresses found'
      });
      return;
    }

    // Create restrictions for each address
    const newRestrictions: TransferRestriction[] = validAddresses.map(address => ({
      restrictionType: listType,
      value: address,
      enabled: true,
      description: `${listType === 'whitelist' ? 'Allowed' : 'Blocked'} address`
    }));

    // Add to existing restrictions
    onChange({
      ...config,
      restrictions: [...(config.restrictions || []), ...newRestrictions]
    });

    // Clear paste text and show success
    setPasteText('');
    setParseResult({
      success: true,
      count: validAddresses.length,
      message: invalidCount > 0
        ? `Added ${validAddresses.length} ${listType} addresses (${invalidCount} invalid addresses skipped)`
        : `Successfully added ${validAddresses.length} ${listType} addresses`
    });

    // Auto-clear success message after 3 seconds
    setTimeout(() => setParseResult(null), 3000);
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

  // Get counts of whitelist/blocklist restrictions
  const whitelistCount = (config.restrictions || []).filter(r => r.restrictionType === 'whitelist').length;
  const blocklistCount = (config.restrictions || []).filter(r => r.restrictionType === 'blocklist').length;

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

          {/* PASTE FUNCTIONALITY - Whitelist/Blocklist Section */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Bulk Add Addresses</Label>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Paste multiple addresses (one per line or comma-separated) to quickly add whitelist or blocklist entries.
              </p>

              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                disabled={disabled}
                placeholder="0x1234567890123456789012345678901234567890&#10;0xabcdefabcdefabcdefabcdefabcdefabcdefabcd&#10;or: 0x123..., 0xabc..., 0xdef..."
                className="font-mono text-xs min-h-[120px]"
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => handlePasteAddresses('whitelist')}
                  disabled={disabled || !pasteText.trim()}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add as Whitelist
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handlePasteAddresses('blocklist')}
                  disabled={disabled || !pasteText.trim()}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Add as Blocklist
                </Button>
              </div>

              {/* Parse Result */}
              {parseResult && (
                <Alert variant={parseResult.success ? "default" : "destructive"}>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {parseResult.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Counts */}
              {(whitelistCount > 0 || blocklistCount > 0) && (
                <div className="flex gap-4 text-xs">
                  {whitelistCount > 0 && (
                    <span className="text-green-600 font-medium">
                      ✓ {whitelistCount} whitelisted
                    </span>
                  )}
                  {blocklistCount > 0 && (
                    <span className="text-destructive font-medium">
                      ✗ {blocklistCount} blocklisted
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* General Restrictions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                All Restrictions
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
                  No restrictions configured. Use bulk add above or click "Add Restriction" for individual entries.
                </AlertDescription>
              </Alert>
            )}

            {config.restrictions && config.restrictions.map((restriction, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-medium">Restriction {index + 1}</h5>
                      {restriction.restrictionType === 'whitelist' && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Whitelist</span>
                      )}
                      {restriction.restrictionType === 'blocklist' && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Blocklist</span>
                      )}
                    </div>
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
                          <SelectItem value="whitelist">Whitelist (Allow Address)</SelectItem>
                          <SelectItem value="blocklist">Blocklist (Block Address)</SelectItem>
                          <SelectItem value="jurisdiction">Jurisdiction</SelectItem>
                          <SelectItem value="investorType">Investor Type</SelectItem>
                          <SelectItem value="lockup">Lock-up Period</SelectItem>
                          <SelectItem value="limit">Transfer Limit</SelectItem>
                          <SelectItem value="timeWindow">Time Window</SelectItem>
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
                          restriction.restrictionType === 'whitelist' || restriction.restrictionType === 'blocklist' ? '0x...' :
                          restriction.restrictionType === 'jurisdiction' ? 'US, EU' :
                          restriction.restrictionType === 'investorType' ? 'accredited' :
                          restriction.restrictionType === 'lockup' ? '31536000' :
                          restriction.restrictionType === 'limit' ? '1000000' :
                          'value'
                        }
                        className={`text-sm ${(restriction.restrictionType === 'whitelist' || restriction.restrictionType === 'blocklist') ? 'font-mono' : ''}`}
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
