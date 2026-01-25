/**
 * Basic Token Configuration Form
 * Collects fundamental token information: name, symbol, decimals, supply, metadata URI
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const basicConfigSchema = z.object({
  name: z.string()
    .min(1, 'Token name is required'),
  symbol: z.string()
    .min(1, 'Symbol is required'),
  decimals: z.number(),
  initialSupply: z.number(),
  metadataUri: z.string().optional()
});

export type BasicTokenConfig = z.infer<typeof basicConfigSchema>;

interface BasicTokenConfigFormProps {
  value: Partial<BasicTokenConfig>;
  onChange: (value: BasicTokenConfig) => void;
  onValidityChange?: (isValid: boolean) => void;
}

export function BasicTokenConfigForm({ value, onChange, onValidityChange }: BasicTokenConfigFormProps) {
  const form = useForm<BasicTokenConfig>({
    resolver: zodResolver(basicConfigSchema),
    defaultValues: {
      name: value.name || '',
      symbol: value.symbol || '',
      decimals: value.decimals ?? 9,
      initialSupply: value.initialSupply ?? 1000000,
      metadataUri: value.metadataUri || ''
    },
    mode: 'onChange'
  });

  const handleChange = () => {
    const formValues = form.getValues();
    const isValid = form.formState.isValid;
    
    if (onValidityChange) {
      onValidityChange(isValid);
    }
    
    if (isValid) {
      onChange(formValues);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Information</CardTitle>
        <CardDescription>
          Basic details about your token
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Token Name *</Label>
          <Input
            id="name"
            placeholder="My Awesome Token"
            {...form.register('name')}
            onChange={(e) => {
              form.register('name').onChange(e);
              handleChange();
            }}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Symbol */}
        <div className="space-y-2">
          <Label htmlFor="symbol">Symbol *</Label>
          <Input
            id="symbol"
            placeholder="MAT"
            className="uppercase"
            {...form.register('symbol')}
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase();
              form.register('symbol').onChange(e);
              handleChange();
            }}
          />
          {form.formState.errors.symbol && (
            <p className="text-sm text-destructive">{form.formState.errors.symbol.message}</p>
          )}
        </div>

        {/* Decimals */}
        <div className="space-y-2">
          <Label htmlFor="decimals">Decimals *</Label>
          <Input
            id="decimals"
            type="number"
            min="0"
            max="9"
            {...form.register('decimals', { valueAsNumber: true })}
            onChange={(e) => {
              form.register('decimals').onChange(e);
              handleChange();
            }}
          />
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Solana typically uses 9 decimals (like SOL). Choose carefully - this cannot be changed!
            </AlertDescription>
          </Alert>
          {form.formState.errors.decimals && (
            <p className="text-sm text-destructive">{form.formState.errors.decimals.message}</p>
          )}
        </div>

        {/* Initial Supply */}
        <div className="space-y-2">
          <Label htmlFor="initialSupply">Initial Supply *</Label>
          <Input
            id="initialSupply"
            type="number"
            placeholder="1000000"
            {...form.register('initialSupply', { valueAsNumber: true })}
            onChange={(e) => {
              form.register('initialSupply').onChange(e);
              handleChange();
            }}
          />
          {form.formState.errors.initialSupply && (
            <p className="text-sm text-destructive">{form.formState.errors.initialSupply.message}</p>
          )}
        </div>

        {/* Metadata URI */}
        <div className="space-y-2">
          <Label htmlFor="metadataUri">Metadata URI (Optional)</Label>
          <Input
            id="metadataUri"
            type="url"
            placeholder="https://arweave.net/... or ipfs://... (optional)"
            {...form.register('metadataUri')}
            onChange={(e) => {
              form.register('metadataUri').onChange(e);
              handleChange();
            }}
          />
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Upload your token metadata to Arweave, IPFS, or any permanent storage. Not required for basic deployments.
            </AlertDescription>
          </Alert>
          {form.formState.errors.metadataUri && (
            <p className="text-sm text-destructive">{form.formState.errors.metadataUri.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
