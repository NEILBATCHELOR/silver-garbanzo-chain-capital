import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnhancedLeverageControlProps {
  leverage: number;
  onLeverageChange: (leverage: number) => void;
  position: string;
  price: string;
  maxLeverage?: number;
  minLeverage?: number;
}

export const EnhancedLeverageControl: React.FC<EnhancedLeverageControlProps> = ({
  leverage,
  onLeverageChange,
  position,
  price,
  maxLeverage = 20,
  minLeverage = 1,
}) => {
  const [inputValue, setInputValue] = useState(leverage.toString());

  useEffect(() => {
    setInputValue(leverage.toString());
  }, [leverage]);

  const handleSliderChange = (value: number[]) => {
    const newLeverage = value[0];
    onLeverageChange(newLeverage);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= minLeverage && numValue <= maxLeverage) {
      onLeverageChange(numValue);
    }
  };

  const handleInputBlur = () => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue < minLeverage) {
      setInputValue(minLeverage.toString());
      onLeverageChange(minLeverage);
    } else if (numValue > maxLeverage) {
      setInputValue(maxLeverage.toString());
      onLeverageChange(maxLeverage);
    }
  };

  // Calculate risk metrics
  const positionValue = parseFloat(position) * parseFloat(price);
  const margin = positionValue / leverage;
  const liquidationPrice = calculateLiquidationPrice(
    parseFloat(price),
    leverage,
    'long' // Assume long for now, should be passed as prop
  );

  function calculateLiquidationPrice(
    entryPrice: number,
    leverage: number,
    side: 'long' | 'short'
  ): number {
    const maintenanceMargin = 0.005; // 0.5%
    if (side === 'long') {
      return entryPrice * (1 - 1 / leverage + maintenanceMargin);
    } else {
      return entryPrice * (1 + 1 / leverage - maintenanceMargin);
    }
  }

  const getRiskLevel = (lev: number): { label: string; color: string } => {
    if (lev <= 3) return { label: 'Low', color: 'bg-green-100 text-green-800' };
    if (lev <= 10) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'High', color: 'bg-red-100 text-red-800' };
  };

  const riskLevel = getRiskLevel(leverage);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Leverage</CardTitle>
          <Badge className={riskLevel.color}>{riskLevel.label} Risk</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Leverage Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Leverage Multiplier</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="w-20 text-right"
                min={minLeverage}
                max={maxLeverage}
                step={0.1}
              />
              <span className="text-sm text-muted-foreground">x</span>
            </div>
          </div>

          <Slider
            value={[leverage]}
            onValueChange={handleSliderChange}
            min={minLeverage}
            max={maxLeverage}
            step={0.1}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{minLeverage}x</span>
            <span>5x</span>
            <span>10x</span>
            <span>15x</span>
            <span>{maxLeverage}x</span>
          </div>
        </div>

        {/* Quick Leverage Buttons */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 5, 10, 20].map((lev) => (
            <button
              key={lev}
              onClick={() => onLeverageChange(lev)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                leverage === lev
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {lev}x
            </button>
          ))}
        </div>

        {/* Risk Metrics */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Position Value</span>
            <span className="font-medium">${positionValue.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground flex items-center gap-1">
                    Required Margin
                    <AlertCircle className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Initial margin required to open this position</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="font-medium">${margin.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground flex items-center gap-1">
                    Liquidation Price
                    <AlertCircle className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Price at which position will be automatically closed</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="font-medium text-red-600">
              ${liquidationPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Warning for High Leverage */}
        {leverage > 10 && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>High Risk:</strong> Using {leverage}x leverage increases both 
              potential profits and losses. Positions can be liquidated quickly 
              if the market moves against you.
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground">
          <strong>Tip:</strong> Lower leverage = lower risk. Start with 2-5x 
          leverage if you're new to derivatives trading.
        </div>
      </CardContent>
    </Card>
  );
};
