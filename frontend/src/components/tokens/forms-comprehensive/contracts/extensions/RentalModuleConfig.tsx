/**
 * NFT Rental Module Configuration Component
 * ✅ ENHANCED: Complete rental configuration with deposits and sub-rentals
 * Enables temporary lending of NFTs
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Clock, Shield } from 'lucide-react';
import type { ModuleConfigProps, RentalModuleConfig } from '../types';

export function RentalModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<RentalModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false
      });
    } else {
      onChange({
        enabled: true,
        feeRecipient: config.feeRecipient || '', // REQUIRED
        platformFeeBps: config.platformFeeBps || 250, // Default 2.5%
        maxRentalDuration: config.maxRentalDuration || 86400, // Default 1 day
        minRentalDuration: config.minRentalDuration || 3600, // Default 1 hour
        minRentalPrice: config.minRentalPrice || '0',
        rentalRecipient: config.rentalRecipient || '',
        autoReturn: config.autoReturn !== false, // Default true
        allowSubRentals: config.allowSubRentals || false,
        depositRequired: config.depositRequired || false,
        depositAmount: config.depositAmount || '0',
        depositBps: config.depositBps || 1000 // Default 10%
      });
    }
  };

  const secondsToDays = (seconds: number) => (seconds / 86400).toFixed(1);
  const daysToSeconds = (days: number) => Math.round(days * 86400);

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">NFT Rental Module</Label>
          <p className="text-xs text-muted-foreground">
            Enable temporary lending of NFTs with configurable terms
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
              Enable temporary lending of NFTs. Perfect for gaming assets, metaverse items, 
              or any NFTs that provide utility which can be temporarily shared.
            </AlertDescription>
          </Alert>

          {/* Rental Duration Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Rental Duration Limits
              </Label>

              <div className="grid grid-cols-2 gap-4">
                {/* Min Duration */}
                <div className="space-y-2">
                  <Label className="text-xs">Minimum Duration (days)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={secondsToDays(config.minRentalDuration || 3600)}
                    onChange={(e) => onChange({
                      ...config,
                      minRentalDuration: daysToSeconds(parseFloat(e.target.value) || 0)
                    })}
                    placeholder="0.04"
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: {(config.minRentalDuration || 3600) / 3600} hours
                  </p>
                </div>

                {/* Max Duration */}
                <div className="space-y-2">
                  <Label className="text-xs">Maximum Duration (days) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={secondsToDays(config.maxRentalDuration)}
                    onChange={(e) => onChange({
                      ...config,
                      maxRentalDuration: daysToSeconds(parseFloat(e.target.value) || 1)
                    })}
                    placeholder="1.0"
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    1 day = 86400s, 1 week = 604800s, 30 days = 2592000s
                  </p>
                  {errors?.['maxRentalDuration'] && (
                    <p className="text-xs text-destructive">{errors['maxRentalDuration']}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Rental Pricing */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Rental Pricing</Label>

              <div className="grid grid-cols-2 gap-4">
                {/* Min Rental Price */}
                <div className="space-y-2">
                  <Label className="text-xs">Minimum Rental Price (wei)</Label>
                  <Input
                    value={config.minRentalPrice || '0'}
                    onChange={(e) => onChange({
                      ...config,
                      minRentalPrice: e.target.value
                    })}
                    placeholder="0"
                    disabled={disabled}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    1 ETH = 10<sup>18</sup> wei
                  </p>
                </div>

                {/* Rental Recipient */}
                <div className="space-y-2">
                  <Label className="text-xs">Rental Payment Recipient</Label>
                  <Input
                    value={config.rentalRecipient || ''}
                    onChange={(e) => onChange({
                      ...config,
                      rentalRecipient: e.target.value
                    })}
                    placeholder="0x... (leave empty for NFT owner)"
                    disabled={disabled}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {!config.rentalRecipient && 'Defaults to NFT owner'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Security Deposit */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security Deposit
              </Label>

              <div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="depositRequired"
                    checked={config.depositRequired || false}
                    onChange={(e) => onChange({
                      ...config,
                      depositRequired: e.target.checked
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="depositRequired" className="text-xs font-normal cursor-pointer">
                    Require Security Deposit
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6 mt-1">
                  Renters must pay a refundable deposit
                </p>
              </div>

              {config.depositRequired && (
                <div className="space-y-2">
                  <Label className="text-xs">Deposit Amount (wei)</Label>
                  <Input
                    value={config.depositAmount || '0'}
                    onChange={(e) => onChange({
                      ...config,
                      depositAmount: e.target.value
                    })}
                    placeholder="0"
                    disabled={disabled}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Refunded when NFT is returned on time
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Rental Behavior Options */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm">Rental Behavior</Label>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoReturn"
                      checked={config.autoReturn !== false}
                      onChange={(e) => onChange({
                        ...config,
                        autoReturn: e.target.checked
                      })}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="autoReturn" className="text-xs font-normal cursor-pointer">
                      Auto-Return After Rental Period
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6 mt-1">
                    Automatically return NFT to owner when rental expires
                  </p>
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowSubRentals"
                      checked={config.allowSubRentals || false}
                      onChange={(e) => onChange({
                        ...config,
                        allowSubRentals: e.target.checked
                      })}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="allowSubRentals" className="text-xs font-normal cursor-pointer">
                      Allow Sub-Rentals
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6 mt-1">
                    Renters can re-rent the NFT to others (cannot exceed original rental period)
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Rental Example */}
          <Card className="p-4 bg-primary/10">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rental Example</Label>
              <div className="text-xs space-y-1">
                <p>
                  <strong>Scenario:</strong> 7-day rental at minimum price
                </p>
                <ul className="list-disc list-inside pl-2 space-y-0.5">
                  <li>Duration: {secondsToDays(config.minRentalDuration || 3600)} - {secondsToDays(config.maxRentalDuration)} days</li>
                  <li>Minimum Price: {config.minRentalPrice || '0'} wei</li>
                  {config.depositRequired && (
                    <li>Security Deposit: {config.depositAmount || '0'} wei (refundable)</li>
                  )}
                  <li>Auto-return: {config.autoReturn !== false ? 'Yes' : 'No'}</li>
                  <li>Sub-rentals: {config.allowSubRentals ? 'Allowed' : 'Not allowed'}</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Rental settings will be configured 
              automatically during deployment. NFT owners can list their tokens for rent according 
              to these configured terms.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
