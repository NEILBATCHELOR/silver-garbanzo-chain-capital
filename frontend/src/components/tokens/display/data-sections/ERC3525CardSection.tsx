import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Zap,
  Package,
  Calendar
} from 'lucide-react';

interface ERC3525CardSectionProps {
  token: any;
  isExpanded: boolean;
  isLoading?: boolean;
}

const ERC3525CardSection: React.FC<ERC3525CardSectionProps> = ({
  token,
  isExpanded,
  isLoading = false
}) => {
  const properties = token.erc3525Properties || {};
  const blocks = token.blocks || {};
  
  const financialInstrument = properties.financialInstrument || blocks.financial_instrument || 'Bond';
  const maturityDate = properties.maturityDate || blocks.maturity_date;
  const slotsCount = token.erc3525Slots?.length || 0;
  const allocationsCount = token.erc3525Allocations?.length || 0;

  if (!isExpanded) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-pink-500" />
          <span className="text-sm font-medium">{financialInstrument}</span>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {slotsCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {slotsCount} Slots
            </Badge>
          )}
          {allocationsCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {allocationsCount} Allocations
            </Badge>
          )}
          {maturityDate && (
            <Badge variant="outline" className="text-xs bg-blue-50">
              Matures {new Date(maturityDate).getFullYear()}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-pink-500" />
            Semi-Fungible Token Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Financial Instrument</p>
            <p className="text-base font-medium">{financialInstrument}</p>
          </div>
          
          {maturityDate && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Maturity Date</p>
              <p className="text-base font-medium">
                {new Date(maturityDate).toLocaleDateString()}
              </p>
            </div>
          )}
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Slots</p>
            <p className="text-base font-medium">{slotsCount}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Value Allocations</p>
            <p className="text-base font-medium">{allocationsCount}</p>
          </div>
        </CardContent>
      </Card>

      {token.erc3525Slots && token.erc3525Slots.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-500" />
              Slots ({token.erc3525Slots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {token.erc3525Slots.slice(0, 3).map((slot: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <span className="font-medium">{slot.name || `Slot ${slot.slotId}`}</span>
                  <Badge variant="outline">ID: {slot.slotId}</Badge>
                </div>
              ))}
              {token.erc3525Slots.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{token.erc3525Slots.length - 3} more slots
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ERC3525CardSection;
