/**
 * Metadata Type Selector - Choose metadata approach
 * 
 * Allows users to select between:
 * 1. URI Metadata - Basic token only
 * 2. Quick Templates Enumeration wizard (32 preset forms)
 * 3. Custom Build - Universal framework (infinite flexibility)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Ban, 
  Zap, 
  Settings, 
  CheckCircle2,
  ArrowRight,
  Package,
  Blocks,
  Clock,
  Sparkles
} from 'lucide-react';

export type MetadataApproach = 'none' | 'enumeration' | 'universal';

interface MetadataOption {
  type: MetadataApproach;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  bestFor: string[];
  timeToCreate: string;
  complexity: 'simple' | 'medium' | 'advanced';
  recommended?: boolean;
}

const METADATA_OPTIONS: MetadataOption[] = [
  {
    type: 'none',
    title: 'Basic URI Metadata',
    description: 'Deploy a basic token without additional metadata',
    icon: <Ban className="h-6 w-6" />,
    features: [
      'Fastest deployment',
      'Minimal on-chain data',
      'No product details',
      'Simple token + URI only'
    ],
    bestFor: [
      'Test tokens',
      'Simple currencies',
      'Internal use'
    ],
    timeToCreate: '< 1 min',
    complexity: 'simple'
  },
  {
    type: 'enumeration',
    title: 'Quick Templates',
    description: 'Choose from 32 pre-configured product types',
    icon: <Zap className="h-6 w-6" />,
    features: [
      '32 preset product forms',
      'Guided configuration',
      'Pre-validated fields',
      'Industry standards'
    ],
    bestFor: [
      'Standard products',
      'Quick deployment',
      'Common structures'
    ],
    timeToCreate: '3-5 min',
    complexity: 'medium',
    recommended: true
  },
  {
    type: 'universal',
    title: 'Custom Universal Build',
    description: 'Build any structured product with modular components',
    icon: <Blocks className="h-6 w-6" />,
    features: [
      'Infinite flexibility',
      'Component composition',
      'Custom configurations',
      '22 product categories'
    ],
    bestFor: [
      'Complex products',
      'Unique structures',
      'Advanced users'
    ],
    timeToCreate: '5-10 min',
    complexity: 'advanced'
  }
];

interface MetadataTypeSelectorProps {
  value?: MetadataApproach;
  onChange: (type: MetadataApproach) => void;
  onNext?: () => void;
}

export function MetadataTypeSelector({ value, onChange, onNext }: MetadataTypeSelectorProps) {
  const handleSelect = (type: MetadataApproach) => {
    onChange(type);
    // Auto-advance for non-metadata option
    if (type === 'none' && onNext) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Add Token Metadata</h2>
        <p className="text-muted-foreground mt-2">
          Choose how to configure your token's on-chain metadata
        </p>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="font-medium">Feature</div>
            <div className="text-center font-medium">None</div>
            <div className="text-center font-medium">Quick Setup</div>
            <div className="text-center font-medium">Custom Build</div>
            
            <div className="text-muted-foreground">Product Types</div>
            <div className="text-center">—</div>
            <div className="text-center">32</div>
            <div className="text-center">Unlimited</div>
            
            <div className="text-muted-foreground">Complexity</div>
            <div className="text-center">Simple</div>
            <div className="text-center">Medium</div>
            <div className="text-center">Advanced</div>
            
            <div className="text-muted-foreground">Setup Time</div>
            <div className="text-center">&lt; 1 min</div>
            <div className="text-center">3-5 min</div>
            <div className="text-center">5-10 min</div>
          </div>
        </CardContent>
      </Card>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {METADATA_OPTIONS.map((option) => (
          <Card
            key={option.type}
            className={`cursor-pointer transition-all hover:border-primary relative ${
              value === option.type ? 'border-primary bg-primary/5 shadow-lg' : ''
            }`}
            onClick={() => handleSelect(option.type)}
          >
            {option.recommended && (
              <Badge 
                className="absolute -top-2 -right-2 bg-primary"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Recommended
              </Badge>
            )}

            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-lg bg-primary/10 text-primary mb-4">
                  {option.icon}
                </div>
                {value === option.type && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <CardTitle>{option.title}</CardTitle>
              <CardDescription className="mt-2">
                {option.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Time & Complexity */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{option.timeToCreate}</span>
                </div>
                <Badge
                  variant={
                    option.complexity === 'simple'
                      ? 'default'
                      : option.complexity === 'medium'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {option.complexity}
                </Badge>
              </div>

              {/* Features */}
              <div>
                <p className="text-sm font-medium mb-2">Features:</p>
                <ul className="space-y-1">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Best For */}
              <div>
                <p className="text-sm font-medium mb-2">Best for:</p>
                <div className="flex flex-wrap gap-2">
                  {option.bestFor.map((use, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {use}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Select Button */}
              <Button
                className="w-full mt-4"
                variant={value === option.type ? 'default' : 'outline'}
              >
                {value === option.type ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Selected
                  </>
                ) : (
                  <>
                    Select {option.title}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Not sure which to choose?</p>
              <p className="text-sm text-muted-foreground mt-1">
                For standard financial products (autocallables, bonds, funds), use <strong>Quick Setup</strong>.
                For unique or complex structures, use <strong>Custom Build</strong>.
                For basic tokens without metadata, select <strong>No Metadata</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      {value && onNext && value !== 'none' && (
        <div className="flex justify-end">
          <Button onClick={onNext} size="lg">
            Continue to Configuration
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
