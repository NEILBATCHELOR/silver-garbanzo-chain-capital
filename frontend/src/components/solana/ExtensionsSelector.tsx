/**
 * Token-2022 Extensions Selector
 * Allows users to enable advanced Token-2022 features
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export type Token2022Extension = 
  | 'Metadata' 
  | 'TransferFee' 
  | 'MetadataPointer' 
  | 'MintCloseAuthority' 
  | 'DefaultAccountState';

interface ExtensionsSelectorProps {
  selectedExtensions: Token2022Extension[];
  onChange: (extensions: Token2022Extension[]) => void;
}

const extensionInfo: Record<Token2022Extension, {
  label: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  permanent: boolean;
  costImpact: 'Low' | 'Medium' | 'High';
}> = {
  Metadata: {
    label: 'On-Chain Metadata',
    description: 'Store token name, symbol, and URI directly on-chain. Recommended for all tokens.',
    priority: 'HIGH',
    permanent: true,
    costImpact: 'Medium'
  },
  TransferFee: {
    label: 'Transfer Fees',
    description: 'Enable automatic fees on every transfer (royalties, compliance, etc.)',
    priority: 'HIGH',
    permanent: true,
    costImpact: 'Low'
  },
  MetadataPointer: {
    label: 'Metadata Pointer',
    description: 'Required when using on-chain metadata extension',
    priority: 'HIGH',
    permanent: true,
    costImpact: 'Low'
  },
  MintCloseAuthority: {
    label: 'Mint Close Authority',
    description: 'Allow closing the mint account when supply is zero (reclaim rent)',
    priority: 'MEDIUM',
    permanent: true,
    costImpact: 'Low'
  },
  DefaultAccountState: {
    label: 'Default Account State',
    description: 'Automatically freeze new token accounts (compliance feature)',
    priority: 'MEDIUM',
    permanent: true,
    costImpact: 'Low'
  }
};

export function ExtensionsSelector({ selectedExtensions, onChange }: ExtensionsSelectorProps) {
  const handleToggle = (extension: Token2022Extension) => {
    let newExtensions: Token2022Extension[];
    
    if (selectedExtensions.includes(extension)) {
      newExtensions = selectedExtensions.filter(e => e !== extension);
    } else {
      newExtensions = [...selectedExtensions, extension];
    }
    
    // Auto-select MetadataPointer if Metadata is selected
    if (extension === 'Metadata' && !selectedExtensions.includes('Metadata')) {
      if (!newExtensions.includes('MetadataPointer')) {
        newExtensions.push('MetadataPointer');
      }
    }
    
    // Auto-deselect MetadataPointer if Metadata is deselected
    if (extension === 'Metadata' && selectedExtensions.includes('Metadata')) {
      newExtensions = newExtensions.filter(e => e !== 'MetadataPointer');
    }
    
    onChange(newExtensions);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Extensions</CardTitle>
        <CardDescription>
          Enable advanced features for your Token-2022
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Extensions are <strong>permanent</strong> - they cannot be removed after deployment!
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {(Object.keys(extensionInfo) as Token2022Extension[]).map((extension) => {
            const info = extensionInfo[extension];
            const isSelected = selectedExtensions.includes(extension);
            const isDisabled = extension === 'MetadataPointer' && selectedExtensions.includes('Metadata');

            return (
              <div 
                key={extension}
                className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent"
              >
                <Checkbox
                  id={extension}
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(extension)}
                  disabled={isDisabled}
                />
                <Label htmlFor={extension} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{info.label}</span>
                    <Badge 
                      variant={info.priority === 'HIGH' ? 'default' : 'secondary'}
                    >
                      {info.priority}
                    </Badge>
                    <Badge variant="outline">
                      Cost: {info.costImpact}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {info.description}
                  </p>
                  {isDisabled && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ℹ️ Automatically included with Metadata extension
                    </p>
                  )}
                </Label>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
