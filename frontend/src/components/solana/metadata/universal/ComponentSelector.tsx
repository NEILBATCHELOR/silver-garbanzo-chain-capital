/**
 * Component Selector - Choose which features to include in the structured product
 * Part of Universal Structured Product Framework Phase 4
 * 
 * Allows users to enable/disable:
 * - Barriers
 * - Coupons  
 * - Callable features
 * - Putable features
 * - Capital protection
 * - Participation/leverage
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

export interface ComponentSelectionState {
  barriers: boolean;
  coupons: boolean;
  callable: boolean;
  putable: boolean;
  capitalProtection: boolean;
  participation: boolean;
}

interface ComponentSelectorProps {
  value: ComponentSelectionState;
  onChange: (value: ComponentSelectionState) => void;
}

export function ComponentSelector({ value, onChange }: ComponentSelectorProps) {
  const toggleComponent = (key: keyof ComponentSelectionState) => {
    onChange({ ...value, [key]: !value[key] });
  };

  const components = [
    {
      key: 'barriers' as const,
      label: 'Barriers',
      description: 'Knock-in/out triggers for autocallable and protective features',
      badge: value.barriers ? 'Active' : 'Inactive',
      badgeVariant: (value.barriers ? 'default' : 'secondary') as 'default' | 'secondary'
    },
    {
      key: 'coupons' as const,
      label: 'Coupons',
      description: 'Fixed, conditional, or memory coupons for income generation',
      badge: value.coupons ? 'Active' : 'Inactive',
      badgeVariant: (value.coupons ? 'default' : 'secondary') as 'default' | 'secondary'
    },
    {
      key: 'callable' as const,
      label: 'Callable Features',
      description: 'Issuer call rights for early redemption',
      badge: value.callable ? 'Active' : 'Inactive',
      badgeVariant: (value.callable ? 'default' : 'secondary') as 'default' | 'secondary'
    },
    {
      key: 'putable' as const,
      label: 'Putable Features',
      description: 'Investor put rights for early exit',
      badge: value.putable ? 'Active' : 'Inactive',
      badgeVariant: (value.putable ? 'default' : 'secondary') as 'default' | 'secondary'
    },
    {
      key: 'capitalProtection' as const,
      label: 'Capital Protection',
      description: 'Guarantee minimum return or principal protection',
      badge: value.capitalProtection ? 'Active' : 'Inactive',
      badgeVariant: (value.capitalProtection ? 'default' : 'secondary') as 'default' | 'secondary'
    },
    {
      key: 'participation' as const,
      label: 'Participation & Leverage',
      description: 'Configure upside/downside participation rates and leverage',
      badge: value.participation ? 'Active' : 'Inactive',
      badgeVariant: (value.participation ? 'default' : 'secondary') as 'default' | 'secondary'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Select Product Components
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enable the features you want to include in your structured product
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {components.map((component) => (
            <div key={component.key} className="flex items-start justify-between space-x-4 rounded-lg border p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={component.key} className="text-base font-medium cursor-pointer">
                    {component.label}
                  </Label>
                  <Badge variant={component.badgeVariant}>{component.badge}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{component.description}</p>
              </div>
              <Switch
                id={component.key}
                checked={value[component.key]}
                onCheckedChange={() => toggleComponent(component.key)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
