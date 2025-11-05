/**
 * Fee Strategy Module Configuration Component
 * ✅ ENHANCED: Complete fee structure with frequency and performance tracking
 * Handles vault management and performance fees for ERC4626
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, TrendingUp, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ModuleConfigProps, FeeStrategyModuleConfig } from '../types';

export function FeeStrategyModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<FeeStrategyModuleConfig>) {
  
  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false
      });
    } else {
      onChange({
        ...config,
        enabled: true,
        managementFeeBps: config.managementFeeBps || 100, // Default 1%
        performanceFeeBps: config.performanceFeeBps || 1000, // Default 10%
        feeRecipient: config.feeRecipient || '',
        managementFeeFrequency: config.managementFeeFrequency || 'annual',
        highWaterMark: config.highWaterMark !== false, // Default true
        hurdleRate: config.hurdleRate || 0
      });
    }
  };

  const handleManagementFeeChange = (value: string) => {
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      onChange({
        ...config,
        managementFeeBps: Math.round(percentage * 100)
      });
    }
  };

  const handlePerformanceFeeChange = (value: string) => {
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      onChange({
        ...config,
        performanceFeeBps: Math.round(percentage * 100)
      });
    }
  };

  const handleHurdleRateChange = (value: string) => {
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      onChange({
        ...config,
        hurdleRate: Math.round(percentage * 100)
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Fee Strategy</Label>
          <p className="text-xs text-muted-foreground">
            Configure management and performance fees for your vault
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
              Configure management and performance fees for your vault.
              Management fees are charged periodically, performance fees on profits only.
            </AlertDescription>
          </Alert>

          {/* Fee Recipient */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Fee Recipient
              </Label>
              <Input
                value={config.feeRecipient}
                onChange={(e) => onChange({
                  ...config,
                  feeRecipient: e.target.value
                })}
                disabled={disabled}
                placeholder="0x..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Address that will receive all management and performance fees
              </p>
              {errors?.['feeRecipient'] && (
                <p className="text-xs text-destructive">{errors['feeRecipient']}</p>
              )}
            </div>
          </Card>

          {/* Management Fees */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Management Fee Settings</Label>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Management Fee Percentage */}
                <div className="space-y-2">
                  <Label className="text-xs">Management Fee (% per year)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={(config.managementFeeBps / 100).toFixed(2)}
                    onChange={(e) => handleManagementFeeChange(e.target.value)}
                    disabled={disabled}
                    placeholder="1.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical range: 0.5% - 2%
                  </p>
                </div>

                {/* Management Fee Frequency */}
                <div className="space-y-2">
                  <Label className="text-xs">Charging Frequency</Label>
                  <Select
                    value={config.managementFeeFrequency || 'annual'}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual') => onChange({
                      ...config,
                      managementFeeFrequency: value
                    })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How often management fees are charged
                  </p>
                </div>
              </div>

              {/* Management Fee Example */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Example:</strong> {((config.managementFeeBps / 100) || 1).toFixed(2)}% annual fee 
                  charged {config.managementFeeFrequency || 'annually'} = 
                  {config.managementFeeFrequency === 'daily' && ` ${((config.managementFeeBps / 100 / 365) || 0.003).toFixed(4)}% per day`}
                  {config.managementFeeFrequency === 'weekly' && ` ${((config.managementFeeBps / 100 / 52) || 0.019).toFixed(3)}% per week`}
                  {config.managementFeeFrequency === 'monthly' && ` ${((config.managementFeeBps / 100 / 12) || 0.083).toFixed(3)}% per month`}
                  {config.managementFeeFrequency === 'quarterly' && ` ${((config.managementFeeBps / 100 / 4) || 0.25).toFixed(2)}% per quarter`}
                  {config.managementFeeFrequency === 'annual' && ` ${((config.managementFeeBps / 100) || 1).toFixed(2)}% per year`}
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Performance Fees */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Performance Fee Settings
              </Label>

              <div className="grid grid-cols-2 gap-4">
                {/* Performance Fee Percentage */}
                <div className="space-y-2">
                  <Label className="text-xs">Performance Fee (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="30"
                    value={(config.performanceFeeBps / 100).toFixed(0)}
                    onChange={(e) => handlePerformanceFeeChange(e.target.value)}
                    disabled={disabled}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical range: 10% - 20%
                  </p>
                </div>

                {/* Hurdle Rate */}
                <div className="space-y-2">
                  <Label className="text-xs">Hurdle Rate (% minimum return)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={((config.hurdleRate || 0) / 100).toFixed(2)}
                    onChange={(e) => handleHurdleRateChange(e.target.value)}
                    disabled={disabled}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum return before performance fee applies (0 = no hurdle)
                  </p>
                </div>
              </div>

              {/* High Water Mark */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="highWaterMark"
                    checked={config.highWaterMark !== false}
                    onChange={(e) => onChange({
                      ...config,
                      highWaterMark: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="highWaterMark" className="text-xs font-normal cursor-pointer">
                    Enable High Water Mark
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Performance fees only charged on new all-time-high profits (industry best practice)
                </p>
              </div>

              {/* Performance Fee Example */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Example:</strong> {((config.performanceFeeBps / 100) || 10).toFixed(0)}% performance fee
                  {config.hurdleRate && config.hurdleRate > 0 && (
                    <> after {((config.hurdleRate || 0) / 100).toFixed(2)}% hurdle rate</>
                  )}
                  {config.highWaterMark !== false && <> with high water mark protection</>}
                  . If vault returns 15%, you earn {((15 - (config.hurdleRate || 0) / 100) * (config.performanceFeeBps / 100 / 100)).toFixed(2)}% fee.
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-4 bg-primary/10">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fee Summary</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Management Fee:</span>
                  <span className="font-semibold">{((config.managementFeeBps / 100) || 1).toFixed(2)}% {config.managementFeeFrequency || 'annual'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Performance Fee:</span>
                  <span className="font-semibold">{((config.performanceFeeBps / 100) || 10).toFixed(0)}%</span>
                </div>
                {config.hurdleRate && config.hurdleRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hurdle Rate:</span>
                    <span className="font-semibold">{((config.hurdleRate || 0) / 100).toFixed(2)}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">High Water Mark:</span>
                  <span className="font-semibold">{config.highWaterMark !== false ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Fee structure will be configured 
              automatically during vault deployment. Management fees accrue continuously, 
              performance fees are charged only when realizing profits.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
