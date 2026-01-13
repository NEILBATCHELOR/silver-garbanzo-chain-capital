/**
 * Execution Mode Selector Component
 * 
 * UI for selecting between different execution modes (basic, foundry, enhanced, direct)
 * with feature descriptions and recommendations.
 */

import React from 'react';
import { Info, Shield, Zap, Lock, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  type ExecutionMode, 
  type RoutingDecision,
  EXECUTION_MODE_DESCRIPTIONS 
} from '@/services/routing';

export interface ExecutionModeSelectorProps {
  value: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
  decision?: RoutingDecision;
  showDecisionInfo?: boolean;
  disabled?: boolean;
  className?: string;
}

const MODE_ICONS: Record<ExecutionMode, React.ComponentType<{ className?: string }>> = {
  basic: Activity,
  foundry: Lock,
  enhanced: Shield,
  direct: Zap
};

/**
 * Execution Mode Selector
 * 
 * Allows users to choose how their operation will be executed with
 * clear descriptions of each mode's features and security level.
 */
export function ExecutionModeSelector({
  value,
  onChange,
  decision,
  showDecisionInfo = true,
  disabled = false,
  className
}: ExecutionModeSelectorProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Execution Mode
        </CardTitle>
        <CardDescription>
          Choose how this operation will be executed
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <RadioGroup 
          value={value}
          onValueChange={(v) => onChange(v as ExecutionMode)}
          disabled={disabled}
          className="space-y-3"
        >
          {(Object.keys(EXECUTION_MODE_DESCRIPTIONS) as ExecutionMode[]).map((mode) => {
            const config = EXECUTION_MODE_DESCRIPTIONS[mode];
            const Icon = MODE_ICONS[mode];
            const isSelected = value === mode;
            
            return (
              <div 
                key={mode}
                className={`
                  flex items-start space-x-3 rounded-lg border p-4 transition-colors
                  ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <RadioGroupItem value={mode} id={mode} disabled={disabled} />
                
                <div className="flex-1 space-y-2">
                  <Label 
                    htmlFor={mode}
                    className={`flex items-center gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-semibold">{config.name}</span>
                    {config.recommended && (
                      <Badge variant="default" className="ml-2">
                        Recommended
                      </Badge>
                    )}
                  </Label>
                  
                  <p className="text-sm text-muted-foreground">
                    {config.description}
                  </p>
                  
                  <ul className="space-y-1">
                    {config.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </RadioGroup>
        
        {/* Show routing decision info */}
        {showDecisionInfo && decision && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div>
                <strong>Routing Decision:</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  {decision.reason}
                </p>
              </div>
              
              <div>
                <strong>Active Features:</strong>
                <div className="flex flex-wrap gap-2 mt-2">
                  {decision.features.map((feature) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature.replace(/-/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
