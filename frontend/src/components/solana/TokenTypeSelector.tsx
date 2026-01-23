/**
 * Token Type Selector Component
 * Allows users to choose between SPL Token and Token-2022
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export type SolanaTokenType = 'SPL' | 'Token2022';

interface TokenTypeSelectorProps {
  value: SolanaTokenType;
  onChange: (value: SolanaTokenType) => void;
}

export function TokenTypeSelector({ value, onChange }: TokenTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Token Type</CardTitle>
        <CardDescription>
          Choose between standard SPL tokens or advanced Token-2022 with extensions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={onChange as (value: string) => void}>
          <div className="space-y-4">
            {/* SPL Token Option */}
            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent cursor-pointer">
              <RadioGroupItem value="SPL" id="spl" />
              <Label htmlFor="spl" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">SPL Token</span>
                  <Badge variant="secondary">Simple</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Standard fungible token on Solana. Perfect for simple use cases.
                </p>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li>✅ Fast deployment (~5 seconds)</li>
                  <li>✅ Lower transaction costs</li>
                  <li>✅ Wide wallet support</li>
                  <li>❌ No on-chain metadata</li>
                  <li>❌ No transfer fees</li>
                </ul>
              </Label>
            </div>

            {/* Token-2022 Option */}
            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent cursor-pointer">
              <RadioGroupItem value="Token2022" id="token2022" />
              <Label htmlFor="token2022" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">Token-2022</span>
                  <Badge>Advanced</Badge>
                  <Badge variant="outline">Recommended</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Next-generation token standard with powerful extensions.
                </p>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li>✅ On-chain metadata (name, symbol, URI)</li>
                  <li>✅ Transfer fees (royalties, compliance)</li>
                  <li>✅ Advanced compliance features</li>
                  <li>✅ Future-proof standard</li>
                  <li>⚠️ Slightly higher costs</li>
                </ul>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
