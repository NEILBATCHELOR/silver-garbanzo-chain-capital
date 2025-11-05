/**
 * Controller Module Configuration Component (ERC1400)
 * ✅ ENHANCED: Complete controller configuration with permissions and multi-sig
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Shield, Users } from 'lucide-react';
import type { ModuleConfigProps, ControllerModuleConfig } from '../types';

type ControllerOperation = 'forceTransfer' | 'forceBurn' | 'issuance' | 'redemption';

export function ControllerModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<ControllerModuleConfig>) {

  const [newController, setNewController] = useState('');

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        controllers: [],
        controllable: undefined,
        controllerOperations: undefined,
        requireMultiSig: undefined,
        minSignatures: undefined
      });
    } else {
      onChange({
        enabled: true,
        controllers: config.controllers || [],
        controllable: config.controllable !== false,
        controllerOperations: config.controllerOperations || [],
        requireMultiSig: config.requireMultiSig || false,
        minSignatures: config.minSignatures
      });
    }
  };

  const addController = () => {
    if (newController.trim() && !config.controllers.includes(newController.trim())) {
      onChange({
        ...config,
        controllers: [...config.controllers, newController.trim()]
      });
      setNewController('');
    }
  };

  const removeController = (controller: string) => {
    onChange({
      ...config,
      controllers: config.controllers.filter(c => c !== controller)
    });
  };

  const addControllerOperation = () => {
    const newOperation = {
      controller: '',
      operations: [] as ControllerOperation[]
    };
    onChange({
      ...config,
      controllerOperations: [...(config.controllerOperations || []), newOperation]
    });
  };

  const removeControllerOperation = (index: number) => {
    const newOps = [...(config.controllerOperations || [])];
    newOps.splice(index, 1);
    onChange({
      ...config,
      controllerOperations: newOps
    });
  };

  const updateControllerOperation = (
    index: number,
    field: 'controller' | 'operations',
    value: string | ControllerOperation[]
  ) => {
    const newOps = [...(config.controllerOperations || [])];
    newOps[index] = {
      ...newOps[index],
      [field]: value
    };
    onChange({
      ...config,
      controllerOperations: newOps
    });
  };

  const toggleOperation = (index: number, operation: ControllerOperation) => {
    const currentOps = config.controllerOperations?.[index]?.operations || [];
    const newOps = currentOps.includes(operation)
      ? currentOps.filter(op => op !== operation)
      : [...currentOps, operation];
    updateControllerOperation(index, 'operations', newOps);
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Controller Module (ERC1400)</Label>
          <p className="text-xs text-muted-foreground">
            Allow designated controllers to force transfers and manage tokens
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
                <Shield className="h-3 w-3 mr-1" />
                Controllers can force transfers, burn tokens, and manage issuance. Required for 
                regulatory compliance, lost key recovery, and corporate actions in security tokens.
              </div>
            </AlertDescription>
          </Alert>

          {/* Controllable Toggle */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="controllable"
                checked={config.controllable !== false}
                onChange={(e) => onChange({
                  ...config,
                  controllable: e.target.checked
                })}
                disabled={disabled}
                className="h-4 w-4"
              />
              <Label htmlFor="controllable" className="text-sm font-medium cursor-pointer">
                Enable controller functions (recommended for security tokens)
              </Label>
            </div>
          </Card>

          {/* Controller Addresses */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Controller Addresses</Label>

              <div className="flex gap-2">
                <Input
                  value={newController}
                  onChange={(e) => setNewController(e.target.value)}
                  placeholder="0x..."
                  disabled={disabled}
                  onKeyPress={(e) => e.key === 'Enter' && addController()}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addController}
                  disabled={disabled || !newController.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {config.controllers.length === 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    No controllers added. Add at least one controller address to enable controller functions.
                  </AlertDescription>
                </Alert>
              )}

              {config.controllers.length > 0 && (
                <div className="space-y-2">
                  {config.controllers.map((controller, index) => (
                    <div key={index} className="flex items-center justify-between bg-secondary px-3 py-2 rounded">
                      <span className="text-xs font-mono">{controller}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeController(controller)}
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Controller Permissions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Controller Permissions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addControllerOperation}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Permissions
              </Button>
            </div>

            {(!config.controllerOperations || config.controllerOperations.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  No specific permissions configured. All controllers will have full permissions 
                  by default. Add permission rules to restrict controller capabilities.
                </AlertDescription>
              </Alert>
            )}

            {config.controllerOperations && config.controllerOperations.map((operation, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Permission Set {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeControllerOperation(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Controller Address</Label>
                    <Input
                      value={operation.controller}
                      onChange={(e) => updateControllerOperation(index, 'controller', e.target.value)}
                      placeholder="0x..."
                      disabled={disabled}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Allowed Operations</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(['forceTransfer', 'forceBurn', 'issuance', 'redemption'] as ControllerOperation[]).map((op) => (
                        <div key={op} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`${index}-${op}`}
                            checked={operation.operations?.includes(op) || false}
                            onChange={() => toggleOperation(index, op)}
                            disabled={disabled}
                            className="h-4 w-4"
                          />
                          <Label htmlFor={`${index}-${op}`} className="text-xs font-normal cursor-pointer">
                            {op.replace(/([A-Z])/g, ' $1').trim()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Multi-Sig Configuration */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-primary" />
                <Label className="text-sm font-medium">Multi-Signature Requirements</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requireMultiSig"
                  checked={config.requireMultiSig || false}
                  onChange={(e) => onChange({
                    ...config,
                    requireMultiSig: e.target.checked,
                    minSignatures: e.target.checked ? (config.minSignatures || 2) : undefined
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="requireMultiSig" className="text-sm font-normal cursor-pointer">
                  Require multiple signatures for controller actions
                </Label>
              </div>

              {config.requireMultiSig && (
                <div className="pl-6 space-y-2">
                  <Label className="text-xs">Minimum Signatures Required</Label>
                  <Input
                    type="number"
                    value={config.minSignatures || 2}
                    onChange={(e) => onChange({
                      ...config,
                      minSignatures: parseInt(e.target.value) || 2
                    })}
                    placeholder="2"
                    disabled={disabled}
                    min="2"
                    max={config.controllers.length || 2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Controller actions require {config.minSignatures || 2} of {config.controllers.length} controller signatures
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Operation Descriptions */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Controller Operations</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Force Transfer:</strong> Move tokens between addresses (regulatory seizure)</p>
                <p><strong>Force Burn:</strong> Destroy tokens from any address (compliance enforcement)</p>
                <p><strong>Issuance:</strong> Create new tokens (capital raises, stock splits)</p>
                <p><strong>Redemption:</strong> Buy back and burn tokens (corporate buyback)</p>
              </div>
            </div>
          </Card>

          {/* Use Cases */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Controller Use Cases</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Regulatory Compliance:</strong> Court-ordered asset seizure or freeze</p>
                <p><strong>Lost Key Recovery:</strong> Transfer tokens from inaccessible wallet</p>
                <p><strong>Corporate Actions:</strong> Stock splits, mergers, dividend distributions</p>
                <p><strong>Compliance Violations:</strong> Revoke tokens from non-compliant holders</p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-4 bg-primary/5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Controller Configuration Summary</Label>
              <div className="text-xs pl-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Controllers:</span>
                  <span className="font-semibold">{config.controllers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Permissions defined:</span>
                  <span className="font-semibold">
                    {config.controllerOperations?.length || 'All (default)'}
                  </span>
                </div>
                {config.requireMultiSig && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Multi-sig:</span>
                    <span className="font-semibold">
                      {config.minSignatures} of {config.controllers.length} required
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Pre-deployment Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Controller addresses and permissions 
              will be set immediately upon deployment. Controller actions can be executed as soon 
              as the token is live.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
