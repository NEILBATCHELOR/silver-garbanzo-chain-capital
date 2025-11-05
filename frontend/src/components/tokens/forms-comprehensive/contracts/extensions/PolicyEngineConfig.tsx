/**
 * Policy Engine Configuration Component
 * ✅ ENHANCED: Full policy rule and validator management
 * Handles policy rules and validators with complete definitions
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ModuleConfigProps, PolicyEngineModuleConfig, PolicyRule } from '../types';

export function PolicyEngineConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<PolicyEngineModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false,
        rules: [],
        validators: []
      });
    } else {
      onChange({
        ...config,
        enabled: true,
        rules: config.rules || [],
        validators: config.validators || []
      });
    }
  };

  const addRule = () => {
    const newRule: PolicyRule = {
      ruleId: `rule_${Date.now()}`,
      name: '',
      enabled: true,
      conditions: [],
      actions: [],
      priority: (config.rules?.length || 0) + 1
    };

    onChange({
      ...config,
      rules: [...(config.rules || []), newRule]
    });
  };

  const removeRule = (index: number) => {
    const newRules = [...(config.rules || [])];
    newRules.splice(index, 1);
    onChange({
      ...config,
      rules: newRules
    });
  };

  const updateRule = (index: number, field: keyof PolicyRule, value: any) => {
    const newRules = [...(config.rules || [])];
    newRules[index] = {
      ...newRules[index],
      [field]: value
    };
    onChange({
      ...config,
      rules: newRules
    });
  };

  const addCondition = (ruleIndex: number) => {
    const newRules = [...(config.rules || [])];
    newRules[ruleIndex].conditions.push({
      field: '',
      operator: 'eq',
      value: ''
    });
    onChange({
      ...config,
      rules: newRules
    });
  };

  const removeCondition = (ruleIndex: number, conditionIndex: number) => {
    const newRules = [...(config.rules || [])];
    newRules[ruleIndex].conditions.splice(conditionIndex, 1);
    onChange({
      ...config,
      rules: newRules
    });
  };

  const updateCondition = (ruleIndex: number, conditionIndex: number, field: string, value: any) => {
    const newRules = [...(config.rules || [])];
    newRules[ruleIndex].conditions[conditionIndex] = {
      ...newRules[ruleIndex].conditions[conditionIndex],
      [field]: value
    };
    onChange({
      ...config,
      rules: newRules
    });
  };

  const addAction = (ruleIndex: number) => {
    const newRules = [...(config.rules || [])];
    newRules[ruleIndex].actions.push({
      actionType: 'allow',
      params: {}
    });
    onChange({
      ...config,
      rules: newRules
    });
  };

  const removeAction = (ruleIndex: number, actionIndex: number) => {
    const newRules = [...(config.rules || [])];
    newRules[ruleIndex].actions.splice(actionIndex, 1);
    onChange({
      ...config,
      rules: newRules
    });
  };

  const updateAction = (ruleIndex: number, actionIndex: number, field: string, value: any) => {
    const newRules = [...(config.rules || [])];
    newRules[ruleIndex].actions[actionIndex] = {
      ...newRules[ruleIndex].actions[actionIndex],
      [field]: value
    };
    onChange({
      ...config,
      rules: newRules
    });
  };

  const addValidator = () => {
    const newValidators = [
      ...(config.validators || []),
      {
        validatorId: `validator_${Date.now()}`,
        validatorAddress: '',
        enabled: true
      }
    ];
    onChange({
      ...config,
      validators: newValidators
    });
  };

  const removeValidator = (index: number) => {
    const newValidators = [...(config.validators || [])];
    newValidators.splice(index, 1);
    onChange({
      ...config,
      validators: newValidators
    });
  };

  const updateValidator = (index: number, field: string, value: any) => {
    const newValidators = [...(config.validators || [])];
    newValidators[index] = {
      ...newValidators[index],
      [field]: value
    };
    onChange({
      ...config,
      validators: newValidators
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Policy Engine</Label>
          <p className="text-xs text-muted-foreground">
            Define custom rules and validators for token operations
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
          {/* Policy Options */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm">Policy Settings</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Default Policy</Label>
                  <Select
                    value={config.defaultPolicy || 'allow'}
                    onValueChange={(value: 'allow' | 'deny') => onChange({
                      ...config,
                      defaultPolicy: value
                    })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">Allow</SelectItem>
                      <SelectItem value="deny">Deny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="requireAllValidators"
                    checked={config.requireAllValidators || false}
                    onChange={(e) => onChange({
                      ...config,
                      requireAllValidators: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="requireAllValidators" className="text-xs font-normal cursor-pointer">
                    Require all validators
                  </Label>
                </div>
              </div>
            </div>
          </Card>

          {/* Policy Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Policy Rules
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRule}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>

            {(!config.rules || config.rules.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No policy rules configured. Click "Add Rule" to create custom validation logic.
                </AlertDescription>
              </Alert>
            )}

            {config.rules && config.rules.map((rule, ruleIndex) => (
              <Card key={ruleIndex} className="p-4 border-l-4 border-l-blue-500">
                <div className="space-y-4">
                  {/* Rule Header */}
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium flex items-center gap-2">
                      Rule {ruleIndex + 1}
                      {rule.name && (
                        <span className="text-xs text-muted-foreground">({rule.name})</span>
                      )}
                    </h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRule(ruleIndex)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Rule Basic Info */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Rule ID</Label>
                      <Input
                        value={rule.ruleId}
                        onChange={(e) => updateRule(ruleIndex, 'ruleId', e.target.value)}
                        disabled={disabled}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rule Name</Label>
                      <Input
                        value={rule.name}
                        onChange={(e) => updateRule(ruleIndex, 'name', e.target.value)}
                        disabled={disabled}
                        placeholder="e.g., KYC Check"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Priority</Label>
                      <Input
                        type="number"
                        value={rule.priority}
                        onChange={(e) => updateRule(ruleIndex, 'priority', parseInt(e.target.value) || 1)}
                        disabled={disabled}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`rule-enabled-${ruleIndex}`}
                      checked={rule.enabled}
                      onChange={(e) => updateRule(ruleIndex, 'enabled', e.target.checked)}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`rule-enabled-${ruleIndex}`} className="text-xs font-normal cursor-pointer">
                      Rule Enabled
                    </Label>
                  </div>

                  {/* Conditions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Conditions</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addCondition(ruleIndex)}
                        disabled={disabled}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Condition
                      </Button>
                    </div>

                    {rule.conditions.map((condition, condIndex) => (
                      <div key={condIndex} className="flex gap-2 items-start">
                        <Input
                          value={condition.field}
                          onChange={(e) => updateCondition(ruleIndex, condIndex, 'field', e.target.value)}
                          disabled={disabled}
                          placeholder="field name"
                          className="text-xs flex-1"
                        />
                        <Select
                          value={condition.operator}
                          onValueChange={(value) => updateCondition(ruleIndex, condIndex, 'operator', value)}
                          disabled={disabled}
                        >
                          <SelectTrigger className="w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eq">equals</SelectItem>
                            <SelectItem value="neq">not equals</SelectItem>
                            <SelectItem value="gt">greater than</SelectItem>
                            <SelectItem value="gte">≥</SelectItem>
                            <SelectItem value="lt">less than</SelectItem>
                            <SelectItem value="lte">≤</SelectItem>
                            <SelectItem value="in">in</SelectItem>
                            <SelectItem value="nin">not in</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={condition.value}
                          onChange={(e) => updateCondition(ruleIndex, condIndex, 'value', e.target.value)}
                          disabled={disabled}
                          placeholder="value"
                          className="text-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(ruleIndex, condIndex)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Actions</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addAction(ruleIndex)}
                        disabled={disabled}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Action
                      </Button>
                    </div>

                    {rule.actions.map((action, actionIndex) => (
                      <div key={actionIndex} className="flex gap-2 items-center">
                        <Select
                          value={action.actionType}
                          onValueChange={(value) => updateAction(ruleIndex, actionIndex, 'actionType', value)}
                          disabled={disabled}
                        >
                          <SelectTrigger className="flex-1 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="allow">
                              <span className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                Allow
                              </span>
                            </SelectItem>
                            <SelectItem value="deny">
                              <span className="flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                Deny
                              </span>
                            </SelectItem>
                            <SelectItem value="require_approval">Require Approval</SelectItem>
                            <SelectItem value="fee">Apply Fee</SelectItem>
                            <SelectItem value="delay">Apply Delay</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAction(ruleIndex, actionIndex)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Validators */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Validators
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addValidator}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Validator
              </Button>
            </div>

            {config.validators && config.validators.map((validator, index) => (
              <Card key={index} className="p-3">
                <div className="flex gap-3 items-center">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Validator ID</Label>
                      <Input
                        value={validator.validatorId}
                        onChange={(e) => updateValidator(index, 'validatorId', e.target.value)}
                        disabled={disabled}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Validator Address</Label>
                      <Input
                        value={validator.validatorAddress}
                        onChange={(e) => updateValidator(index, 'validatorAddress', e.target.value)}
                        disabled={disabled}
                        placeholder="0x..."
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id={`validator-enabled-${index}`}
                      checked={validator.enabled}
                      onChange={(e) => updateValidator(index, 'enabled', e.target.checked)}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`validator-enabled-${index}`} className="text-xs">Active</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeValidator(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Policy rules and validators will be registered 
              during deployment. Rules are evaluated in priority order, with higher priority rules 
              executing first.
            </AlertDescription>
          </Alert>

          {/* Summary */}
          {((config.rules && config.rules.length > 0) || (config.validators && config.validators.length > 0)) && (
            <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg">
              <span className="text-muted-foreground">
                Configuration Summary
              </span>
              <span className="font-semibold">
                {config.rules?.length || 0} rules • {config.validators?.length || 0} validators
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
