/**
 * Interest-Bearing Configuration Component
 * Configures interest rate for Token-2022 interest-bearing extension
 */

import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export interface InterestBearingConfiguration {
  rate: number; // Interest rate in basis points (e.g., 500 = 5.00% APY)
}

interface InterestBearingConfigProps {
  value: InterestBearingConfiguration;
  onChange: (value: InterestBearingConfiguration) => void;
}

export function InterestBearingConfig({ value, onChange }: InterestBearingConfigProps) {
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseInt(e.target.value) || 0;
    onChange({ rate });
  };

  const ratePercentage = (value.rate / 100).toFixed(2);

  // Ensure default values
  useEffect(() => {
    if (!value.rate) {
      onChange({
        rate: 500, // 5% APY default
      });
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interest-Bearing Configuration</CardTitle>
        <CardDescription>
          Set the annualized interest rate for your token
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Interest-bearing tokens accrue value over time. Perfect for yield tokens, DeFi rewards, or time-based incentives.
          </AlertDescription>
        </Alert>

        {/* Interest Rate */}
        <div className="space-y-2">
          <Label htmlFor="interestRate">
            Annual Interest Rate ({ratePercentage}% APY)
          </Label>
          <Input
            id="interestRate"
            type="number"
            min="0"
            max="10000"
            value={value.rate || 500}
            onChange={handleRateChange}
            placeholder="500"
          />
          <p className="text-sm text-muted-foreground">
            Basis points: 100 = 1% APY, 500 = 5% APY, 1000 = 10% APY
          </p>
        </div>

        {/* Interest Example */}
        <Alert>
          <AlertDescription>
            <strong>Example:</strong> At {ratePercentage}% APY, 1000 tokens would earn approximately {(1000 * value.rate / 10000).toFixed(2)} tokens per year in interest.
          </AlertDescription>
        </Alert>

        {/* Additional Info */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Features:</Label>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Interest accrues automatically over time</li>
            <li>• Rate can be updated by the rate authority</li>
            <li>• Displayed balance reflects accrued interest</li>
            <li>• Ideal for staking rewards and DeFi protocols</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
