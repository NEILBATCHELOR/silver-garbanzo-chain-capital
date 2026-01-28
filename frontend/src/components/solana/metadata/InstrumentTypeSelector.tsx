/**
 * Instrument Type Selector Component
 * 
 * Second step in metadata wizard - select specific instrument type
 * Dynamically shows available types based on selected asset class
 */

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import type { AssetClass } from '@/services/tokens/metadata';
import { getInstrumentTypes, type InstrumentTypeOption } from './FormMapping';

interface InstrumentTypeSelectorProps {
  assetClass: AssetClass;
  selectedType: string | null;
  onSelect: (instrumentType: string) => void;
}

export function InstrumentTypeSelector({ 
  assetClass, 
  selectedType, 
  onSelect 
}: InstrumentTypeSelectorProps) {
  const availableTypes = getInstrumentTypes(assetClass);

  if (availableTypes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No instrument types available for this asset class
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Instrument Type</h3>
        <p className="text-sm text-muted-foreground">
          Choose the specific type of {assetClass.replace('_', ' ')} instrument
        </p>
      </div>

      <RadioGroup
        value={selectedType || ''}
        onValueChange={onSelect}
        className="grid gap-4"
      >
        {availableTypes.map((type: InstrumentTypeOption) => {
          const isSelected = selectedType === type.value;

          return (
            <Card
              key={type.value}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'border-primary ring-2 ring-primary ring-opacity-50' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onSelect(type.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={type.value}
                        className="text-base font-semibold cursor-pointer"
                      >
                        {type.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
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
