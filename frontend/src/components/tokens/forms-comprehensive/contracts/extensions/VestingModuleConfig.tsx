/**
 * Vesting Module Configuration Component
 * ✅ ENHANCED: Full vesting schedule management pre-deployment
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ModuleConfigProps, VestingModuleConfig, VestingSchedule } from '../types';

export function VestingModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<VestingModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      // When disabling, clear schedules
      onChange({
        ...config,
        enabled: false,
        schedules: []
      });
    } else {
      // When enabling, initialize with empty schedules array
      onChange({
        ...config,
        enabled: true,
        schedules: config.schedules || []
      });
    }
  };

  const addSchedule = () => {
    const newSchedule: VestingSchedule = {
      beneficiary: '',
      amount: '',
      startTime: Math.floor(Date.now() / 1000), // Current time
      cliffDuration: 31536000, // 1 year in seconds
      vestingDuration: 126144000, // 4 years in seconds
      revocable: true,
      category: 'team'
    };

    onChange({
      ...config,
      schedules: [...(config.schedules || []), newSchedule]
    });
  };

  const removeSchedule = (index: number) => {
    const newSchedules = [...(config.schedules || [])];
    newSchedules.splice(index, 1);
    onChange({
      ...config,
      schedules: newSchedules
    });
  };

  const updateSchedule = (index: number, field: keyof VestingSchedule, value: any) => {
    const newSchedules = [...(config.schedules || [])];
    newSchedules[index] = {
      ...newSchedules[index],
      [field]: value
    };
    onChange({
      ...config,
      schedules: newSchedules
    });
  };

  // Helper to convert seconds to days
  const secondsToDays = (seconds: number) => Math.floor(seconds / 86400);
  const daysToSeconds = (days: number) => days * 86400;

  // Helper to convert seconds to months  
  const secondsToMonths = (seconds: number) => Math.floor(seconds / 2592000);
  const monthsToSeconds = (months: number) => months * 2592000;

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Vesting Module</Label>
          <p className="text-xs text-muted-foreground">
            Configure vesting schedules for token distribution
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
          {/* Add Schedule Button */}
          <div className="flex items-center justify-between pt-2">
            <Label className="text-sm">Vesting Schedules</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSchedule}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </div>

          {/* Schedule List */}
          {(!config.schedules || config.schedules.length === 0) && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No vesting schedules configured. Click "Add Schedule" to create one.
              </AlertDescription>
            </Alert>
          )}

          {config.schedules && config.schedules.map((schedule, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Schedule {index + 1}
                    {schedule.category && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({schedule.category})
                      </span>
                    )}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSchedule(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Fields Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Beneficiary */}
                  <div className="col-span-2">
                    <Label className="text-xs">Beneficiary Address *</Label>
                    <Input
                      value={schedule.beneficiary}
                      onChange={(e) => updateSchedule(index, 'beneficiary', e.target.value)}
                      disabled={disabled}
                      placeholder="0x..."
                      className="font-mono text-sm"
                    />
                    {errors?.['schedules']?.[index]?.['beneficiary'] && (
                      <p className="text-xs text-destructive mt-1">
                        {errors['schedules'][index]['beneficiary']}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <Label className="text-xs">Amount (tokens) *</Label>
                    <Input
                      value={schedule.amount}
                      onChange={(e) => updateSchedule(index, 'amount', e.target.value)}
                      disabled={disabled}
                      placeholder="1000000"
                      type="text"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <Label className="text-xs">Category *</Label>
                    <Select
                      value={schedule.category}
                      onValueChange={(value) => updateSchedule(index, 'category', value)}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="advisor">Advisor</SelectItem>
                        <SelectItem value="investor">Investor</SelectItem>
                        <SelectItem value="founder">Founder</SelectItem>
                        <SelectItem value="community">Community</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Time */}
                  <div>
                    <Label className="text-xs">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Start Date
                    </Label>
                    <Input
                      type="datetime-local"
                      value={new Date(schedule.startTime * 1000).toISOString().slice(0, 16)}
                      onChange={(e) => {
                        const timestamp = Math.floor(new Date(e.target.value).getTime() / 1000);
                        updateSchedule(index, 'startTime', timestamp);
                      }}
                      disabled={disabled}
                      className="text-sm"
                    />
                  </div>

                  {/* Cliff Duration */}
                  <div>
                    <Label className="text-xs">Cliff Period (days)</Label>
                    <Input
                      type="number"
                      value={secondsToDays(schedule.cliffDuration)}
                      onChange={(e) => {
                        const days = parseInt(e.target.value) || 0;
                        updateSchedule(index, 'cliffDuration', daysToSeconds(days));
                      }}
                      disabled={disabled}
                      placeholder="365"
                      min="0"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Tokens locked for {secondsToDays(schedule.cliffDuration)} days
                    </p>
                  </div>

                  {/* Vesting Duration */}
                  <div className="col-span-2">
                    <Label className="text-xs">Vesting Duration (months)</Label>
                    <Input
                      type="number"
                      value={secondsToMonths(schedule.vestingDuration)}
                      onChange={(e) => {
                        const months = parseInt(e.target.value) || 0;
                        updateSchedule(index, 'vestingDuration', monthsToSeconds(months));
                      }}
                      disabled={disabled}
                      placeholder="48"
                      min="1"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Total vesting period: {secondsToMonths(schedule.vestingDuration)} months 
                      ({(secondsToMonths(schedule.vestingDuration) / 12).toFixed(1)} years)
                    </p>
                  </div>

                  {/* Revocable */}
                  <div className="col-span-2 flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id={`revocable-${index}`}
                      checked={schedule.revocable}
                      onChange={(e) => updateSchedule(index, 'revocable', e.target.checked)}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`revocable-${index}`} className="text-xs font-normal cursor-pointer">
                      Revocable (can be cancelled by admin)
                    </Label>
                  </div>
                </div>

                {/* Summary */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>{schedule.amount || '0'} tokens</strong> will vest to{' '}
                    <code className="text-[10px]">{schedule.beneficiary || 'beneficiary'}</code>{' '}
                    over <strong>{secondsToMonths(schedule.vestingDuration)} months</strong>
                    {schedule.cliffDuration > 0 && (
                      <> with a <strong>{secondsToDays(schedule.cliffDuration)}-day cliff</strong></>
                    )}
                    .
                  </AlertDescription>
                </Alert>
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
                  id="allowEarlyRelease"
                  checked={config.allowEarlyRelease || false}
                  onChange={(e) => onChange({
                    ...config,
                    allowEarlyRelease: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="allowEarlyRelease" className="text-xs font-normal cursor-pointer">
                  Allow early release (admin can release tokens before schedule completes)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="revocationEnabled"
                  checked={config.revocationEnabled !== false} // Default true
                  onChange={(e) => onChange({
                    ...config,
                    revocationEnabled: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="revocationEnabled" className="text-xs font-normal cursor-pointer">
                  Enable revocation (allow revocable schedules to be cancelled)
                </Label>
              </div>
            </div>
          </Card>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> All vesting schedules will be created 
              automatically when the token is deployed. No manual configuration needed post-deployment.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
