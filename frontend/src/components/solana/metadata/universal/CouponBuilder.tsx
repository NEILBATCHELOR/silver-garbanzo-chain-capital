/**
 * Coupon Builder - Configure coupon structures
 * Part of Universal Structured Product Framework Phase 4
 * 
 * Supports:
 * - Fixed coupons
 * - Conditional coupons
 * - Memory coupons
 * - Floating rate coupons
 * - Range accrual coupons
 * - Digital coupons
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import type { 
  Coupon, 
  CouponConfiguration, 
  CouponType,
  CouponCondition
} from '@/services/tokens/metadata/universal/UniversalStructuredProductTypes';

interface CouponBuilderProps {
  coupons?: CouponConfiguration;
  onChange: (coupons: CouponConfiguration) => void;
}

const couponTypes: { value: CouponType; label: string; description: string }[] = [
  { value: 'fixed', label: 'Fixed', description: 'Fixed rate, always pays' },
  { value: 'conditional', label: 'Conditional', description: 'Pays if condition met' },
  { value: 'memory', label: 'Memory', description: 'Accumulates if not paid' },
  { value: 'floating', label: 'Floating', description: 'Variable rate (SOFR+spread)' },
  { value: 'range_accrual', label: 'Range Accrual', description: 'Accrues if in range' },
  { value: 'digital', label: 'Digital', description: 'All-or-nothing' },
  { value: 'step_up', label: 'Step Up', description: 'Increases over time' },
  { value: 'step_down', label: 'Step Down', description: 'Decreases over time' }
];

const frequencies: Array<Coupon['frequency']> = [
  'monthly',
  'quarterly',
  'semi-annual',
  'annual',
  'at_maturity'
];

export function CouponBuilder({ coupons, onChange }: CouponBuilderProps) {
  const [memoryFeature, setMemoryFeature] = useState(coupons?.memoryFeature === 'true');
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    couponType: 'fixed',
    frequency: 'quarterly',
    conditional: 'false'
  });

  const existingCoupons = coupons?.coupons || [];

  const addCoupon = () => {
    if (!newCoupon.couponType || !newCoupon.rate) {
      return;
    }

    const coupon: Coupon = {
      couponType: newCoupon.couponType,
      rate: newCoupon.rate,
      frequency: newCoupon.frequency || 'quarterly',
      paymentDates: newCoupon.paymentDates,
      nextPaymentDate: newCoupon.nextPaymentDate,
      conditional: newCoupon.conditional || 'false',
      condition: newCoupon.condition,
      referenceRate: newCoupon.referenceRate,
      spread: newCoupon.spread,
      accrualRange: newCoupon.accrualRange,
      daysInRange: newCoupon.daysInRange,
      accruedAmount: newCoupon.accruedAmount
    };

    onChange({
      memoryFeature: memoryFeature ? 'true' : 'false',
      coupons: [...existingCoupons, coupon],
      accumulatedCoupons: coupons?.accumulatedCoupons,
      unpaidCoupons: coupons?.unpaidCoupons
    });

    setNewCoupon({
      couponType: 'fixed',
      frequency: 'quarterly',
      conditional: 'false'
    });
  };

  const removeCoupon = (index: number) => {
    const updated = existingCoupons.filter((_, i) => i !== index);
    onChange({
      memoryFeature: memoryFeature ? 'true' : 'false',
      coupons: updated,
      accumulatedCoupons: coupons?.accumulatedCoupons,
      unpaidCoupons: coupons?.unpaidCoupons
    });
  };

  const toggleMemory = () => {
    const newMemory = !memoryFeature;
    setMemoryFeature(newMemory);
    onChange({
      memoryFeature: newMemory ? 'true' : 'false',
      coupons: existingCoupons,
      accumulatedCoupons: coupons?.accumulatedCoupons,
      unpaidCoupons: coupons?.unpaidCoupons
    });
  };

  const getCouponBadgeVariant = (type: CouponType) => {
    switch (type) {
      case 'fixed':
        return 'default';
      case 'conditional':
      case 'memory':
        return 'secondary';
      case 'floating':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Coupon Configuration
          {existingCoupons.length > 0 && (
            <Badge variant="secondary">{existingCoupons.length} Coupons</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Memory Feature Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="memory-feature" className="text-base font-medium cursor-pointer">
              Memory Feature
            </Label>
            <p className="text-sm text-muted-foreground">
              Unpaid coupons accumulate and pay when conditions are met
            </p>
          </div>
          <Switch
            id="memory-feature"
            checked={memoryFeature}
            onCheckedChange={toggleMemory}
          />
        </div>

        {/* Existing Coupons */}
        {existingCoupons.length > 0 && (
          <div className="space-y-3">
            {existingCoupons.map((coupon, index) => (
              <div key={index} className="flex items-start justify-between rounded-lg border p-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getCouponBadgeVariant(coupon.couponType)}>
                      {couponTypes.find((t) => t.value === coupon.couponType)?.label}
                    </Badge>
                    <span className="text-sm font-medium">{coupon.rate}% Annual</span>
                    <Badge variant="outline">{coupon.frequency}</Badge>
                  </div>
                  {coupon.conditional === 'true' && coupon.condition && (
                    <p className="text-xs text-muted-foreground">
                      Condition: {coupon.condition.type} 
                      {coupon.condition.barrierLevel && ` • Level: ${coupon.condition.barrierLevel}%`}
                    </p>
                  )}
                  {coupon.referenceRate && (
                    <p className="text-xs text-muted-foreground">
                      Rate: {coupon.referenceRate} + {coupon.spread} bps
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCoupon(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Coupon */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Add Coupon</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Coupon Type *</Label>
              <Select
                value={newCoupon.couponType}
                onValueChange={(v) => setNewCoupon({ ...newCoupon, couponType: v as CouponType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {couponTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Annual Rate (%) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="8.50"
                value={newCoupon.rate || ''}
                onChange={(e) => setNewCoupon({ ...newCoupon, rate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select
                value={newCoupon.frequency}
                onValueChange={(v) => setNewCoupon({ ...newCoupon, frequency: v as Coupon['frequency'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {frequencies.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {freq.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Coupon Configuration */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newCoupon.conditional === 'true'}
                  onCheckedChange={(checked) => 
                    setNewCoupon({ 
                      ...newCoupon, 
                      conditional: checked ? 'true' : 'false',
                      condition: checked ? { type: 'barrier' } : undefined
                    })
                  }
                />
                <Label>Conditional Payment</Label>
              </div>
            </div>

            {newCoupon.conditional === 'true' && (
              <>
                <div className="space-y-2">
                  <Label>Condition Type</Label>
                  <Select
                    value={newCoupon.condition?.type}
                    onValueChange={(v) => 
                      setNewCoupon({ 
                        ...newCoupon, 
                        condition: { ...newCoupon.condition, type: v as CouponCondition['type'] } 
                      })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barrier">Barrier</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="rate_level">Rate Level</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Barrier Level (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="100"
                    value={newCoupon.condition?.barrierLevel || ''}
                    onChange={(e) => 
                      setNewCoupon({ 
                        ...newCoupon, 
                        condition: { ...newCoupon.condition, barrierLevel: e.target.value, type: newCoupon.condition?.type || 'barrier' } 
                      })
                    }
                  />
                </div>
              </>
            )}

            {/* Floating Rate Configuration */}
            {newCoupon.couponType === 'floating' && (
              <>
                <div className="space-y-2">
                  <Label>Reference Rate</Label>
                  <Input
                    placeholder="SOFR, LIBOR, etc."
                    value={newCoupon.referenceRate || ''}
                    onChange={(e) => setNewCoupon({ ...newCoupon, referenceRate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Spread (bps)</Label>
                  <Input
                    type="number"
                    placeholder="550"
                    value={newCoupon.spread || ''}
                    onChange={(e) => setNewCoupon({ ...newCoupon, spread: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <Button onClick={addCoupon} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Coupon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
