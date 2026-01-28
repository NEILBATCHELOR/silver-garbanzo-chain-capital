/**
 * Complete Autocallable Metadata Form - ALL 10 Subtypes
 * 
 * Comprehensive form with conditional rendering for all autocallable subtypes:
 * - Barrier, Phoenix, Worst-of (core)
 * - Express, Snowball (yield enhancement)
 * - Airbag (enhanced protection)
 * - Reverse Convertible (yield-focused)
 * - Twin-Win (bi-directional)
 * - Target Return/TARN (target-based)
 * - Booster (leveraged)
 * 
 * Features:
 * - Multi-underlying support (Worst-of, Rainbow)
 * - Step-down barriers (Snowball, Express)
 * - Separate coupon barrier
 * - Advanced coupon structures (snowball, digital, range-accrual)
 * - Bermudan call schedules
 * - Product-specific fields for all 10 types
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { 
  AutocallableInput, 
  UnderlyingAsset, 
  BarrierSchedule, 
  CallSchedule 
} from '@/services/tokens/metadata/OnChainMetadataTypes';

interface AutocallableFormProps {
  value: Partial<AutocallableInput>;
  onChange: (value: Partial<AutocallableInput>) => void;
}

export function AutocallableForm({ value, onChange }: AutocallableFormProps) {
  const updateField = <K extends keyof AutocallableInput>(
    field: K,
    fieldValue: AutocallableInput[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  // Determine if multi-underlying is needed
  const isMultiUnderlying = value.productSubtype === 'worst-of';
  
  // Determine which optional sections to show
  const needsStepDown = ['snowball', 'express'].includes(value.productSubtype || '');
  const showExpressFields = value.productSubtype === 'express';
  const showSnowballFields = value.productSubtype === 'snowball';
  const showAirbagFields = value.productSubtype === 'airbag';
  const showReverseFields = value.productSubtype === 'reverse';
  const showTwinWinFields = value.productSubtype === 'twin-win';
  const showTarnFields = value.productSubtype === 'target-return';
  const showBoosterFields = value.productSubtype === 'booster';
  const needsSeparateCouponBarrier = ['express', 'snowball', 'phoenix'].includes(value.productSubtype || '');

  // Helper functions for array management
  const addUnderlying = () => {
    const newUnderlying: UnderlyingAsset = {
      ticker: '',
      name: '',
      initialPrice: 0,
      weight: 0,
      oracleAddress: ''
    };
    updateField('underlyings', [...(value.underlyings || []), newUnderlying]);
  };

  const removeUnderlying = (index: number) => {
    const updated = [...(value.underlyings || [])];
    updated.splice(index, 1);
    updateField('underlyings', updated);
  };

  const updateUnderlying = (index: number, field: keyof UnderlyingAsset, fieldValue: any) => {
    const updated = [...(value.underlyings || [])];
    updated[index] = { ...updated[index], [field]: fieldValue };
    updateField('underlyings', updated);
  };

  const addBarrierPeriod = () => {
    const newPeriod: BarrierSchedule = { date: '', level: 100 };
    updateField('stepDownSchedule', [...(value.stepDownSchedule || []), newPeriod]);
  };

  const removeBarrierPeriod = (index: number) => {
    const updated = [...(value.stepDownSchedule || [])];
    updated.splice(index, 1);
    updateField('stepDownSchedule', updated);
  };

  const updateBarrierPeriod = (index: number, field: keyof BarrierSchedule, fieldValue: any) => {
    const updated = [...(value.stepDownSchedule || [])];
    updated[index] = { ...updated[index], [field]: fieldValue };
    updateField('stepDownSchedule', updated);
  };

  const addCallDate = () => {
    const newCall: CallSchedule = { date: '', level: 100 };
    updateField('callSchedule', [...(value.callSchedule || []), newCall]);
  };

  const removeCallDate = (index: number) => {
    const updated = [...(value.callSchedule || [])];
    updated.splice(index, 1);
    updateField('callSchedule', updated);
  };

  const updateCallDate = (index: number, field: keyof CallSchedule, fieldValue: any) => {
    const updated = [...(value.callSchedule || [])];
    updated[index] = { ...updated[index], [field]: fieldValue };
    updateField('callSchedule', updated);
  };

  return (
    <div className="space-y-6">
      {/* Product Type Alert */}
      {value.productSubtype && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>{value.productSubtype.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong> product selected. 
            Form will show relevant fields for this product type.
          </AlertDescription>
        </Alert>
      )}

      {/* Token Basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input
                id="name"
                placeholder="Autocallable S&P 500 Note 2026"
                value={value.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground">
                Max 32 bytes ({value.name?.length || 0}/32)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                placeholder="ACSPX26"
                value={value.symbol || ''}
                onChange={(e) => updateField('symbol', e.target.value.toUpperCase())}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Max 10 bytes ({value.symbol?.length || 0}/10)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uri">Metadata URI (Arweave/IPFS) *</Label>
            <Input
              id="uri"
              placeholder="ar://abc123def456 or ipfs://Qm..."
              value={value.uri || ''}
              onChange={(e) => updateField('uri', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Full metadata document location
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="decimals">Decimals *</Label>
              <Input
                id="decimals"
                type="number"
                min="0"
                max="9"
                value={value.decimals || 6}
                onChange={(e) => updateField('decimals', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select value={value.currency} onValueChange={(v) => updateField('currency', v)}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CHF">CHF</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productSubtype">Product Type *</Label>
              <Select 
                value={value.productSubtype} 
                onValueChange={(v) => updateField('productSubtype', v as any)}
              >
                <SelectTrigger id="productSubtype">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {/* Core Types */}
                  <SelectItem value="barrier">Barrier</SelectItem>
                  <SelectItem value="phoenix">Phoenix</SelectItem>
                  <SelectItem value="worst-of">Worst-of</SelectItem>
                  
                  {/* Yield Enhancement */}
                  <SelectItem value="express">Express</SelectItem>
                  <SelectItem value="snowball">Snowball</SelectItem>
                  
                  {/* Enhanced Protection */}
                  <SelectItem value="airbag">Airbag</SelectItem>
                  
                  {/* Yield-Focused */}
                  <SelectItem value="reverse">Reverse Convertible</SelectItem>
                  
                  {/* Bi-Directional */}
                  <SelectItem value="twin-win">Twin-Win</SelectItem>
                  
                  {/* Target-Based */}
                  <SelectItem value="target-return">Target Return (TARN)</SelectItem>
                  
                  {/* Leveraged */}
                  <SelectItem value="booster">Booster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issuer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issuer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issuer">Issuer *</Label>
              <Input
                id="issuer"
                placeholder="Chain Capital LLC"
                value={value.issuer || ''}
                onChange={(e) => updateField('issuer', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction *</Label>
              <Input
                id="jurisdiction"
                placeholder="US"
                value={value.jurisdiction || ''}
                onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date *</Label>
              <Input
                id="issueDate"
                type="date"
                value={value.issueDate || ''}
                onChange={(e) => updateField('issueDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maturityDate">Maturity Date *</Label>
              <Input
                id="maturityDate"
                type="date"
                value={value.maturityDate || ''}
                onChange={(e) => updateField('maturityDate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="isin">ISIN (optional)</Label>
              <Input
                id="isin"
                placeholder="US0123456789"
                value={value.isin || ''}
                onChange={(e) => updateField('isin', e.target.value)}
                maxLength={12}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cusip">CUSIP (optional)</Label>
              <Input
                id="cusip"
                placeholder="01234567"
                value={value.cusip || ''}
                onChange={(e) => updateField('cusip', e.target.value)}
                maxLength={9}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Underlying Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Underlying Asset{isMultiUnderlying ? 's' : ''}</span>
            {isMultiUnderlying && (
              <Button size="sm" variant="outline" onClick={addUnderlying}>
                <Plus className="h-4 w-4 mr-1" />
                Add Underlying
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isMultiUnderlying ? (
            // Single Underlying
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="underlying">Ticker *</Label>
                  <Input
                    id="underlying"
                    placeholder="SPX"
                    value={value.underlying || ''}
                    onChange={(e) => updateField('underlying', e.target.value.toUpperCase())}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="underlyingName">Name *</Label>
                  <Input
                    id="underlyingName"
                    placeholder="S&P 500 Index"
                    value={value.underlyingName || ''}
                    onChange={(e) => updateField('underlyingName', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialPrice">Initial Price *</Label>
                  <Input
                    id="initialPrice"
                    type="number"
                    step="0.01"
                    placeholder="5000"
                    value={value.initialPrice || ''}
                    onChange={(e) => updateField('initialPrice', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oracleAddress">Oracle Address *</Label>
                  <Input
                    id="oracleAddress"
                    placeholder="GVXRSBjFk6e6J3NbVPXoh9QVeQ..."
                    value={value.oracleAddress || ''}
                    onChange={(e) => updateField('oracleAddress', e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            // Multi-Underlying
            <>
              {value.underlyings && value.underlyings.length > 0 ? (
                <div className="space-y-4">
                  {value.underlyings.map((underlying, index) => (
                    <Card key={index} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Underlying {index + 1}</CardTitle>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeUnderlying(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Ticker *</Label>
                            <Input
                              placeholder="AAPL"
                              value={underlying.ticker}
                              onChange={(e) => updateUnderlying(index, 'ticker', e.target.value.toUpperCase())}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input
                              placeholder="Apple Inc"
                              value={underlying.name}
                              onChange={(e) => updateUnderlying(index, 'name', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Initial Price *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="180"
                              value={underlying.initialPrice || ''}
                              onChange={(e) => updateUnderlying(index, 'initialPrice', parseFloat(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Weight (%) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="33.33"
                              value={underlying.weight || ''}
                              onChange={(e) => updateUnderlying(index, 'weight', parseFloat(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2 col-span-1">
                            <Label>Oracle (last 8 chars)</Label>
                            <Input
                              placeholder="...FEED"
                              value={underlying.oracleAddress}
                              onChange={(e) => updateUnderlying(index, 'oracleAddress', e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Total weight check */}
                  {(() => {
                    const totalWeight = value.underlyings.reduce((sum, u) => sum + (u.weight || 0), 0);
                    const isValid = Math.abs(totalWeight - 100) < 0.01;
                    return !isValid && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Total weight must equal 100%. Current total: {totalWeight.toFixed(2)}%
                        </AlertDescription>
                      </Alert>
                    );
                  })()}
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Click "Add Underlying" to configure basket assets for worst-of structure.
                  </AlertDescription>
                </Alert>
              )}

              {value.underlyings && value.underlyings.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="basketType">Basket Type</Label>
                  <Select 
                    value={value.basketType} 
                    onValueChange={(v) => updateField('basketType', v as any)}
                  >
                    <SelectTrigger id="basketType">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worst_of">Worst Of</SelectItem>
                      <SelectItem value="best_of">Best Of</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="rainbow">Rainbow</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Determines which performance is used for barrier/autocall checks
                  </p>
                </div>
              )}
            </>
          )}

          {/* Oracle Provider */}
          <div className="space-y-2">
            <Label htmlFor="oracleProvider">Oracle Provider *</Label>
            <Select 
              value={value.oracleProvider} 
              onValueChange={(v) => updateField('oracleProvider', v as any)}
            >
              <SelectTrigger id="oracleProvider">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pyth">Pyth</SelectItem>
                <SelectItem value="chainlink">Chainlink</SelectItem>
                <SelectItem value="switchboard">Switchboard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Barrier Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Barrier Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!needsStepDown ? (
            // Static Barriers
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barrierLevel">Autocall Barrier (%) *</Label>
                  <Input
                    id="barrierLevel"
                    type="number"
                    step="1"
                    placeholder="100"
                    value={value.barrierLevel || ''}
                    onChange={(e) => updateField('barrierLevel', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Early redemption trigger level (% of initial)
                  </p>
                </div>

                {needsSeparateCouponBarrier && (
                  <div className="space-y-2">
                    <Label htmlFor="couponBarrier">Coupon Barrier (%) *</Label>
                    <Input
                      id="couponBarrier"
                      type="number"
                      step="1"
                      placeholder="100"
                      value={value.couponBarrier || ''}
                      onChange={(e) => updateField('couponBarrier', parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate coupon payment trigger
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="knockInBarrier">Knock-in Barrier (%) *</Label>
                  <Input
                    id="knockInBarrier"
                    type="number"
                    step="1"
                    placeholder="60"
                    value={value.knockInBarrier || ''}
                    onChange={(e) => updateField('knockInBarrier', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Capital at risk threshold
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="protectionBarrier">Protection Barrier (%)</Label>
                  <Input
                    id="protectionBarrier"
                    type="number"
                    step="1"
                    placeholder="80"
                    value={value.protectionBarrier || ''}
                    onChange={(e) => updateField('protectionBarrier', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional additional protection level
                  </p>
                </div>
              </div>
            </>
          ) : (
            // Step-Down Barriers
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {value.productSubtype === 'snowball' 
                    ? 'Snowball products use declining barriers over time'
                    : 'Express products typically use fixed barriers but you can configure step-downs'
                  }
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between">
                <Label>Barrier Schedule</Label>
                <Button size="sm" variant="outline" onClick={addBarrierPeriod}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Period
                </Button>
              </div>

              {value.stepDownSchedule && value.stepDownSchedule.length > 0 ? (
                <div className="space-y-3">
                  {value.stepDownSchedule.map((period, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Observation Date</Label>
                          <Input
                            type="date"
                            value={period.date}
                            onChange={(e) => updateBarrierPeriod(index, 'date', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Barrier Level (%)</Label>
                          <Input
                            type="number"
                            step="1"
                            placeholder="100"
                            value={period.level || ''}
                            onChange={(e) => updateBarrierPeriod(index, 'level', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBarrierPeriod(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Click "Add Period" to define barrier levels for each observation date.
                  </AlertDescription>
                </Alert>
              )}

              {/* Still need knock-in barrier */}
              <div className="space-y-2">
                <Label htmlFor="knockInBarrier">Knock-in Barrier (%) *</Label>
                <Input
                  id="knockInBarrier"
                  type="number"
                  step="1"
                  placeholder="60"
                  value={value.knockInBarrier || ''}
                  onChange={(e) => updateField('knockInBarrier', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Single downside barrier (applies throughout life)
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Coupon Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coupon Structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="couponType">Coupon Type *</Label>
              <Select 
                value={value.couponType} 
                onValueChange={(v) => updateField('couponType', v as any)}
              >
                <SelectTrigger id="couponType">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                  <SelectItem value="memory">Memory</SelectItem>
                  <SelectItem value="digital">Digital (Fixed Payout)</SelectItem>
                  <SelectItem value="snowballing">Snowballing (Step-Up)</SelectItem>
                  <SelectItem value="range-accrual">Range Accrual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {value.couponType !== 'range-accrual' && value.couponType !== 'digital' && (
              <div className="space-y-2">
                <Label htmlFor="couponRate">Coupon Rate (% p.a.) *</Label>
                <Input
                  id="couponRate"
                  type="number"
                  step="0.01"
                  placeholder="8.5"
                  value={value.couponRate || ''}
                  onChange={(e) => updateField('couponRate', parseFloat(e.target.value))}
                />
              </div>
            )}

            {value.couponType === 'digital' && (
              <div className="space-y-2">
                <Label htmlFor="digitalPayoutAmount">Digital Payout Amount *</Label>
                <Input
                  id="digitalPayoutAmount"
                  type="number"
                  step="0.01"
                  placeholder="100"
                  value={value.digitalPayoutAmount || ''}
                  onChange={(e) => updateField('digitalPayoutAmount', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Fixed amount paid if condition met
                </p>
              </div>
            )}
          </div>

          {/* Snowball-Specific Fields */}
          {value.couponType === 'snowballing' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="couponEscalationRate">Escalation Rate (% per period) *</Label>
                <Input
                  id="couponEscalationRate"
                  type="number"
                  step="0.01"
                  placeholder="0.50"
                  value={value.couponEscalationRate || ''}
                  onChange={(e) => updateField('couponEscalationRate', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Rate increases each period if not paid
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCouponRate">Maximum Coupon Rate (%) *</Label>
                <Input
                  id="maxCouponRate"
                  type="number"
                  step="0.01"
                  placeholder="15"
                  value={value.maxCouponRate || ''}
                  onChange={(e) => updateField('maxCouponRate', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Cap on snowballed rate
                </p>
              </div>
            </div>
          )}

          {/* Range Accrual Fields */}
          {value.couponType === 'range-accrual' && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Coupon accrues daily when underlying is within range
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accrualRangeLower">Lower Bound (%) *</Label>
                  <Input
                    id="accrualRangeLower"
                    type="number"
                    step="1"
                    placeholder="0"
                    value={value.accrualRangeLower || ''}
                    onChange={(e) => updateField('accrualRangeLower', parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accrualRangeUpper">Upper Bound (%) *</Label>
                  <Input
                    id="accrualRangeUpper"
                    type="number"
                    step="1"
                    placeholder="105"
                    value={value.accrualRangeUpper || ''}
                    onChange={(e) => updateField('accrualRangeUpper', parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accrualRatePerDay">Rate Per Day (%) *</Label>
                  <Input
                    id="accrualRatePerDay"
                    type="number"
                    step="0.001"
                    placeholder="0.03"
                    value={value.accrualRatePerDay || ''}
                    onChange={(e) => updateField('accrualRatePerDay', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Memory Feature */}
          <div className="flex items-center space-x-2">
            <Switch
              id="memoryFeature"
              checked={value.memoryFeature || false}
              onCheckedChange={(checked) => updateField('memoryFeature', checked)}
            />
            <Label htmlFor="memoryFeature" className="cursor-pointer">
              Memory Feature (accumulate unpaid coupons)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Observation & Call Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observation & Call Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="observationFreq">Observation Frequency *</Label>
              <Select 
                value={value.observationFreq} 
                onValueChange={(v) => updateField('observationFreq', v as any)}
              >
                <SelectTrigger id="observationFreq">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="callType">Call Type *</Label>
              <Select 
                value={value.callType} 
                onValueChange={(v) => updateField('callType', v as any)}
              >
                <SelectTrigger id="callType">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="american">American</SelectItem>
                  <SelectItem value="european">European</SelectItem>
                  <SelectItem value="bermudan">Bermudan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valuationMethod">Valuation Method *</Label>
              <Select 
                value={value.valuationMethod} 
                onValueChange={(v) => updateField('valuationMethod', v as any)}
              >
                <SelectTrigger id="valuationMethod">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="end-of-day">End of Day</SelectItem>
                  <SelectItem value="intraday">Intraday</SelectItem>
                  <SelectItem value="vwap">VWAP</SelectItem>
                  <SelectItem value="twap">TWAP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstObsDate">First Observation Date *</Label>
              <Input
                id="firstObsDate"
                type="date"
                value={value.firstObsDate || ''}
                onChange={(e) => updateField('firstObsDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalObsDate">Final Observation Date *</Label>
              <Input
                id="finalObsDate"
                type="date"
                value={value.finalObsDate || ''}
                onChange={(e) => updateField('finalObsDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixingTime">Fixing Time (UTC) *</Label>
              <Input
                id="fixingTime"
                type="time"
                value={value.fixingTime || ''}
                onChange={(e) => updateField('fixingTime', e.target.value)}
              />
            </div>
          </div>

          {/* Bermudan Call Schedule */}
          {value.callType === 'bermudan' && (
            <>
              <div className="flex items-center justify-between mt-4">
                <Label>Bermudan Call Schedule</Label>
                <Button size="sm" variant="outline" onClick={addCallDate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Call Date
                </Button>
              </div>

              {value.callSchedule && value.callSchedule.length > 0 ? (
                <div className="space-y-3">
                  {value.callSchedule.map((call, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Call Date</Label>
                          <Input
                            type="date"
                            value={call.date}
                            onChange={(e) => updateCallDate(index, 'date', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Call Level (%)</Label>
                          <Input
                            type="number"
                            step="1"
                            placeholder="100"
                            value={call.level || ''}
                            onChange={(e) => updateCallDate(index, 'level', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCallDate(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Click "Add Call Date" to define specific call dates and levels for Bermudan structure.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Participation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participation & Cap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="upsideParticipation">Upside Participation (%) *</Label>
              <Input
                id="upsideParticipation"
                type="number"
                step="1"
                placeholder="100"
                value={value.upsideParticipation || ''}
                onChange={(e) => updateField('upsideParticipation', parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="downsideParticipation">Downside Participation (%) *</Label>
              <Input
                id="downsideParticipation"
                type="number"
                step="1"
                placeholder="100"
                value={value.downsideParticipation || ''}
                onChange={(e) => updateField('downsideParticipation', parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cap">Cap (%)</Label>
              <Input
                id="cap"
                type="number"
                step="1"
                placeholder="150"
                value={value.cap || ''}
                onChange={(e) => updateField('cap', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redemption Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Redemption & Settlement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="redemptionVault">Redemption Vault Address *</Label>
              <Input
                id="redemptionVault"
                placeholder="HvYxUf1C7BZzJRQkTGQBQjXQWUVqb..."
                value={value.redemptionVault || ''}
                onChange={(e) => updateField('redemptionVault', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redemptionMethod">Redemption Method *</Label>
              <Select 
                value={value.redemptionMethod} 
                onValueChange={(v) => updateField('redemptionMethod', v as any)}
              >
                <SelectTrigger id="redemptionMethod">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settlementDays">Settlement Days (T+N) *</Label>
              <Input
                id="settlementDays"
                type="number"
                min="0"
                placeholder="2"
                value={value.settlementDays || ''}
                onChange={(e) => updateField('settlementDays', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlementType">Settlement Type</Label>
              <Select 
                value={value.settlementType} 
                onValueChange={(v) => updateField('settlementType', v as any)}
              >
                <SelectTrigger id="settlementType">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EXPRESS-SPECIFIC FIELDS */}
      {showExpressFields && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-base text-blue-700">Express-Specific Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expressRedemptionType">Redemption Type *</Label>
                <Select 
                  value={value.expressRedemptionType} 
                  onValueChange={(v) => updateField('expressRedemptionType', v as any)}
                >
                  <SelectTrigger id="expressRedemptionType">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Payout</SelectItem>
                    <SelectItem value="accumulated">Accumulated Returns</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How redemption amount is calculated
                </p>
              </div>

              {value.expressRedemptionType === 'fixed' && (
                <div className="space-y-2">
                  <Label htmlFor="expressRedemptionAmount">Fixed Redemption Amount *</Label>
                  <Input
                    id="expressRedemptionAmount"
                    type="number"
                    step="0.01"
                    placeholder="103.50"
                    value={value.expressRedemptionAmount || ''}
                    onChange={(e) => updateField('expressRedemptionAmount', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    % of notional paid on autocall
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AIRBAG-SPECIFIC FIELDS */}
      {showAirbagFields && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-base text-green-700">Airbag-Specific Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Airbag provides buffer protection - first X% of losses are absorbed
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="airbagLevel">Airbag Level (%) *</Label>
                <Input
                  id="airbagLevel"
                  type="number"
                  step="1"
                  placeholder="50"
                  value={value.airbagLevel || ''}
                  onChange={(e) => updateField('airbagLevel', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  No loss above this level
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="airbagParticipation">Airbag Zone Participation (%) *</Label>
                <Input
                  id="airbagParticipation"
                  type="number"
                  step="1"
                  placeholder="0"
                  value={value.airbagParticipation || ''}
                  onChange={(e) => updateField('airbagParticipation', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Protection % in buffer zone
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="belowAirbagParticipation">Below Airbag (%) *</Label>
                <Input
                  id="belowAirbagParticipation"
                  type="number"
                  step="1"
                  placeholder="100"
                  value={value.belowAirbagParticipation || ''}
                  onChange={(e) => updateField('belowAirbagParticipation', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Participation below airbag
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* REVERSE CONVERTIBLE FIELDS */}
      {showReverseFields && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-base text-purple-700">Reverse Convertible Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                High yield with potential conversion to underlying shares
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conversionRatio">Conversion Ratio *</Label>
                <Input
                  id="conversionRatio"
                  type="number"
                  step="0.01"
                  placeholder="1.00"
                  value={value.conversionRatio || ''}
                  onChange={(e) => updateField('conversionRatio', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Shares per note if converted
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conversionTrigger">Conversion Trigger (%) *</Label>
                <Input
                  id="conversionTrigger"
                  type="number"
                  step="1"
                  placeholder="80"
                  value={value.conversionTrigger || ''}
                  onChange={(e) => updateField('conversionTrigger', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Level triggering conversion
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="physicalSettlement"
                checked={value.physicalSettlement || false}
                onCheckedChange={(checked) => updateField('physicalSettlement', checked)}
              />
              <Label htmlFor="physicalSettlement" className="cursor-pointer">
                Physical Settlement (deliver shares vs cash equivalent)
              </Label>
            </div>

            {value.physicalSettlement && (
              <div className="space-y-2">
                <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
                <Input
                  id="deliveryInstructions"
                  placeholder="DTC delivery via account..."
                  value={value.deliveryInstructions || ''}
                  onChange={(e) => updateField('deliveryInstructions', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TWIN-WIN FIELDS */}
      {showTwinWinFields && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="text-base text-yellow-700">Twin-Win Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Positive returns both up AND down within range
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="twinWinRangeLower">Lower Win Range (%) *</Label>
                <Input
                  id="twinWinRangeLower"
                  type="number"
                  step="1"
                  placeholder="-20"
                  value={value.twinWinRangeLower || ''}
                  onChange={(e) => updateField('twinWinRangeLower', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twinWinRangeUpper">Upper Win Range (%) *</Label>
                <Input
                  id="twinWinRangeUpper"
                  type="number"
                  step="1"
                  placeholder="120"
                  value={value.twinWinRangeUpper || ''}
                  onChange={(e) => updateField('twinWinRangeUpper', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullLossThreshold">Full Loss Threshold (%) *</Label>
                <Input
                  id="fullLossThreshold"
                  type="number"
                  step="1"
                  placeholder="40"
                  value={value.fullLossThreshold || ''}
                  onChange={(e) => updateField('fullLossThreshold', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Complete capital loss below
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TARN FIELDS */}
      {showTarnFields && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-base text-orange-700">Target Return (TARN) Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Terminates when cumulative return reaches target
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetCumulativeReturn">Target Cumulative Return (%) *</Label>
                <Input
                  id="targetCumulativeReturn"
                  type="number"
                  step="0.01"
                  placeholder="20.00"
                  value={value.targetCumulativeReturn || ''}
                  onChange={(e) => updateField('targetCumulativeReturn', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Product terminates when reached
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accumulatedReturn">Accumulated Return (%)</Label>
                <Input
                  id="accumulatedReturn"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={value.accumulatedReturn || ''}
                  onChange={(e) => updateField('accumulatedReturn', parseFloat(e.target.value))}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Current cumulative (read-only)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variableRateFormula">Variable Rate Formula</Label>
              <Input
                id="variableRateFormula"
                placeholder="(remaining_target / periods_left) * 1.2"
                value={value.variableRateFormula || ''}
                onChange={(e) => updateField('variableRateFormula', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional formula for adjusting rate as target approaches
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="targetAchieved"
                checked={value.targetAchieved || false}
                onCheckedChange={(checked) => updateField('targetAchieved', checked)}
                disabled
              />
              <Label htmlFor="targetAchieved" className="cursor-pointer text-muted-foreground">
                Target Achieved (read-only status)
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOOSTER FIELDS */}
      {showBoosterFields && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-700">Booster (Leveraged) Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Leveraged participation with buffer protection
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leverageRatio">Leverage Ratio *</Label>
                <Input
                  id="leverageRatio"
                  type="number"
                  step="0.1"
                  placeholder="2.0"
                  value={value.leverageRatio || ''}
                  onChange={(e) => updateField('leverageRatio', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Participation multiplier
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="boostThreshold">Boost Threshold (%) *</Label>
                <Input
                  id="boostThreshold"
                  type="number"
                  step="1"
                  placeholder="105"
                  value={value.boostThreshold || ''}
                  onChange={(e) => updateField('boostThreshold', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Level triggering leverage
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="downsideBuffer">Downside Buffer (%) *</Label>
                <Input
                  id="downsideBuffer"
                  type="number"
                  step="1"
                  placeholder="10"
                  value={value.downsideBuffer || ''}
                  onChange={(e) => updateField('downsideBuffer', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  % of losses absorbed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentation URIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentation (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prospectusUri">Prospectus URI</Label>
              <Input
                id="prospectusUri"
                placeholder="ar://prospectus-hash"
                value={value.prospectusUri || ''}
                onChange={(e) => updateField('prospectusUri', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termSheetUri">Term Sheet URI</Label>
              <Input
                id="termSheetUri"
                placeholder="ar://termsheet-hash"
                value={value.termSheetUri || ''}
                onChange={(e) => updateField('termSheetUri', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}