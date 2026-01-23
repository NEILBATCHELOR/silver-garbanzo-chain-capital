/**
 * Transfer Fee Configuration Component
 * Configures fee basis points and max fee for Token-2022 transfer fee extension
 */

import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export interface TransferFeeConfiguration {
  feeBasisPoints: number; // 0-10000 (0% to 100%)
  maxFee: string; // Store as string to avoid BigInt serialization issues
}

interface TransferFeeConfigProps {
  value: TransferFeeConfiguration;
  onChange: (value: TransferFeeConfiguration) => void;
}

export function TransferFeeConfig({ value, onChange }: TransferFeeConfigProps) {
  const handleFeeBasisPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const feeBasisPoints = parseInt(e.target.value) || 0;
    onChange({ ...value, feeBasisPoints });
  };

  const handleMaxFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxFee = e.target.value || '0';
    onChange({ ...value, maxFee });
  };

  const feePercentage = (value.feeBasisPoints / 100).toFixed(2);

  // Ensure default values
  useEffect(() => {
    if (!value.feeBasisPoints && !value.maxFee) {
      onChange({
        feeBasisPoints: 100, // 1%
        maxFee: '10000000000' // 10 tokens with 9 decimals
      });
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Fee Configuration</CardTitle>
        <CardDescription>
          Set fees that apply to every token transfer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Transfer fees are applied automatically on every transfer. Use for royalties, compliance, or revenue sharing.
          </AlertDescription>
        </Alert>

        {/* Fee Basis Points */}
        <div className="space-y-2">
          <Label htmlFor="feeBasisPoints">
            Fee Percentage ({feePercentage}%)
          </Label>
          <Input
            id="feeBasisPoints"
            type="number"
            min="0"
            max="10000"
            value={value.feeBasisPoints || 100}
            onChange={handleFeeBasisPointsChange}
            placeholder="100"
          />
          <p className="text-sm text-muted-foreground">
            Basis points: 100 = 1%, 1000 = 10%, 10000 = 100%
          </p>
        </div>

        {/* Max Fee */}
        <div className="space-y-2">
          <Label htmlFor="maxFee">Maximum Fee (lamports)</Label>
          <Input
            id="maxFee"
            type="number"
            min="0"
            value={value.maxFee || '10000000000'}
            onChange={handleMaxFeeChange}
            placeholder="10000000000"
          />
          <p className="text-sm text-muted-foreground">
            Cap the maximum fee charged per transfer (in token's smallest units)
          </p>
        </div>

        {/* Fee Example */}
        <Alert>
          <AlertDescription>
            <strong>Example:</strong> With {feePercentage}% fee, transferring 1000 tokens would charge approximately {(1000 * value.feeBasisPoints / 10000).toFixed(2)} tokens as a fee (subject to max fee limit).
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
