/**
 * Barrier Configurator - Set up barrier features
 * Part of Universal Structured Product Framework Phase 4
 * 
 * Supports:
 * - Knock-in/out barriers
 * - Autocall barriers
 * - Coupon barriers
 * - Protection barriers
 * - Continuous or discrete observation
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Shield } from 'lucide-react';
import type { Barrier, BarrierConfiguration, BarrierType } from '@/services/tokens/metadata/universal/UniversalStructuredProductTypes';

interface BarrierConfiguratorProps {
  barriers?: BarrierConfiguration;
  onChange: (barriers: BarrierConfiguration) => void;
}

const barrierTypes: { value: BarrierType; label: string; description: string }[] = [
  { 
    value: 'knock_in', 
    label: 'Knock-In', 
    description: 'Activates downside participation if breached' 
  },
  { 
    value: 'knock_out', 
    label: 'Knock-Out', 
    description: 'Terminates product if breached' 
  },
  { 
    value: 'call_barrier', 
    label: 'Call Barrier', 
    description: 'Triggers early redemption' 
  },
  { 
    value: 'coupon_barrier', 
    label: 'Coupon Barrier', 
    description: 'Determines coupon payment' 
  },
  { 
    value: 'protection_barrier', 
    label: 'Protection Barrier', 
    description: 'Capital protection threshold' 
  },
  { 
    value: 'autocall_barrier', 
    label: 'Autocall Barrier', 
    description: 'Autocallable trigger level' 
  }
];

const observationTypes: Array<Barrier['observationType']> = [
  'continuous',
  'discrete',
  'closing_price',
  'intraday'
];

export function BarrierConfigurator({ barriers, onChange }: BarrierConfiguratorProps) {
  const [newBarrier, setNewBarrier] = useState<Partial<Barrier>>({
    barrierType: 'knock_in',
    direction: 'down',
    observationType: 'continuous',
    breached: 'false',
    appliesTo: 'single'
  });

  const existingBarriers = barriers?.barriers || [];

  const addBarrier = () => {
    if (!newBarrier.barrierType || !newBarrier.level) {
      return;
    }

    const barrier: Barrier = {
      barrierType: newBarrier.barrierType,
      level: newBarrier.level,
      direction: newBarrier.direction || 'down',
      observationType: newBarrier.observationType || 'continuous',
      observationDates: newBarrier.observationDates,
      breached: 'false',
      breachDate: undefined,
      rebate: newBarrier.rebate,
      appliesTo: newBarrier.appliesTo || 'single',
      underlyingIndex: newBarrier.underlyingIndex
    };

    onChange({
      barriers: [...existingBarriers, barrier]
    });

    setNewBarrier({
      barrierType: 'knock_in',
      direction: 'down',
      observationType: 'continuous',
      breached: 'false',
      appliesTo: 'single'
    });
  };

  const removeBarrier = (index: number) => {
    const updated = existingBarriers.filter((_, i) => i !== index);
    onChange({ barriers: updated });
  };

  const getBarrierBadgeVariant = (type: BarrierType) => {
    switch (type) {
      case 'autocall_barrier':
      case 'call_barrier':
        return 'default';
      case 'knock_in':
      case 'protection_barrier':
        return 'secondary';
      case 'knock_out':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Barrier Configuration
          {existingBarriers.length > 0 && (
            <Badge variant="secondary">{existingBarriers.length} Barriers</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Barriers */}
        {existingBarriers.length > 0 && (
          <div className="space-y-3">
            {existingBarriers.map((barrier, index) => (
              <div key={index} className="flex items-start justify-between rounded-lg border p-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getBarrierBadgeVariant(barrier.barrierType)}>
                      {barrierTypes.find((t) => t.value === barrier.barrierType)?.label}
                    </Badge>
                    <span className="text-sm font-medium">{barrier.level}%</span>
                    <Badge variant="outline">{barrier.direction}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Observation: {barrier.observationType}
                    {barrier.rebate && ` • Rebate: ${barrier.rebate}`}
                  </p>
                  {barrier.observationDates && (
                    <p className="text-xs text-muted-foreground">
                      Dates: {barrier.observationDates.substring(0, 50)}...
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBarrier(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Barrier */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Add Barrier</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Barrier Type *</Label>
              <Select
                value={newBarrier.barrierType}
                onValueChange={(v) => setNewBarrier({ ...newBarrier, barrierType: v as BarrierType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {barrierTypes.map((type) => (
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
              <Label>Level (% of initial) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="100"
                value={newBarrier.level || ''}
                onChange={(e) => setNewBarrier({ ...newBarrier, level: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Direction *</Label>
              <Select
                value={newBarrier.direction}
                onValueChange={(v) => setNewBarrier({ ...newBarrier, direction: v as 'up' | 'down' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">Up</SelectItem>
                  <SelectItem value="down">Down</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observation Type *</Label>
              <Select
                value={newBarrier.observationType}
                onValueChange={(v) => setNewBarrier({ ...newBarrier, observationType: v as Barrier['observationType'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {observationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newBarrier.observationType === 'discrete' && (
              <div className="space-y-2">
                <Label>Observation Dates (JSON array)</Label>
                <Input
                  placeholder='["2026-04-26", "2026-07-26"]'
                  value={newBarrier.observationDates || ''}
                  onChange={(e) => setNewBarrier({ ...newBarrier, observationDates: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Rebate (optional)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={newBarrier.rebate || ''}
                onChange={(e) => setNewBarrier({ ...newBarrier, rebate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select
                value={newBarrier.appliesTo}
                onValueChange={(v) => setNewBarrier({ ...newBarrier, appliesTo: v as Barrier['appliesTo'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Underlying</SelectItem>
                  <SelectItem value="all">All Underlyings</SelectItem>
                  <SelectItem value="worst_of">Worst Of</SelectItem>
                  <SelectItem value="best_of">Best Of</SelectItem>
                  <SelectItem value="nth">Nth Underlying</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={addBarrier} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Barrier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
