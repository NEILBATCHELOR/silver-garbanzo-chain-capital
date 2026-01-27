/**
 * Asset Class Selector Component
 * 
 * First step in metadata wizard - select asset class
 * Supports all asset classes from the metadata specification
 */

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  PieChart,
  Package,
  Building,
  Cpu
} from 'lucide-react';
import type { AssetClass } from '@/services/tokens/metadata';

interface AssetClassOption {
  value: AssetClass;
  label: string;
  description: string;
  icon: React.ElementType;
  examples: string[];
}

const ASSET_CLASSES: AssetClassOption[] = [
  {
    value: 'structured_product',
    label: 'Structured Products',
    description: 'Complex financial instruments with derivatives',
    icon: Briefcase,
    examples: ['Autocallables', 'Principal Protected Notes', 'Reverse Convertibles']
  },
  {
    value: 'equity',
    label: 'Equity Securities',
    description: 'Ownership stakes in companies',
    icon: TrendingUp,
    examples: ['Common Stock', 'Preferred Stock', 'Private Equity']
  },
  {
    value: 'fixed_income',
    label: 'Fixed Income',
    description: 'Debt securities with fixed returns',
    icon: DollarSign,
    examples: ['Corporate Bonds', 'Government Bonds', 'Commercial Paper']
  },
  {
    value: 'fund',
    label: 'Funds & ETPs',
    description: 'Pooled investment vehicles',
    icon: PieChart,
    examples: ['Mutual Funds', 'ETFs', 'Managed Certificates']
  },
  {
    value: 'commodity',
    label: 'Commodities',
    description: 'Physical goods and commodity derivatives',
    icon: Package,
    examples: ['Gold', 'Oil Futures', 'Tracker Certificates']
  },
  {
    value: 'alternative',
    label: 'Alternative Investments',
    description: 'Non-traditional asset classes',
    icon: Building,
    examples: ['Real Estate', 'Private Equity', 'Infrastructure']
  },
  {
    value: 'digital_native',
    label: 'Digital Native Assets',
    description: 'Blockchain-native financial instruments',
    icon: Cpu,
    examples: ['Stablecoins', 'Carbon Credits', 'Invoice Receivables']
  }
];

interface AssetClassSelectorProps {
  selectedClass: AssetClass | null;
  onSelect: (assetClass: AssetClass) => void;
}

export function AssetClassSelector({ selectedClass, onSelect }: AssetClassSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Asset Class</h3>
        <p className="text-sm text-muted-foreground">
          Choose the primary category of the financial instrument you want to tokenize
        </p>
      </div>

      <RadioGroup
        value={selectedClass || ''}
        onValueChange={(value) => onSelect(value as AssetClass)}
        className="grid gap-4"
      >
        {ASSET_CLASSES.map((assetClass) => {
          const Icon = assetClass.icon;
          const isSelected = selectedClass === assetClass.value;

          return (
            <Card
              key={assetClass.value}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'border-primary ring-2 ring-primary ring-opacity-50' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onSelect(assetClass.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <RadioGroupItem value={assetClass.value} id={assetClass.value} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <Label
                        htmlFor={assetClass.value}
                        className="text-base font-semibold cursor-pointer"
                      >
                        {assetClass.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {assetClass.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {assetClass.examples.map((example, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-secondary rounded-md"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </RadioGroup>
    </div>
  );
}
