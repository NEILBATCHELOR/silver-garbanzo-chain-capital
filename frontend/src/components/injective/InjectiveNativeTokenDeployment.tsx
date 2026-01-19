import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, ExternalLink, Info, Loader2 } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Textarea } from '@/components/ui/textarea';

/**
 * Injective Native Token Deployment Component
 * 
 * Creates TokenFactory tokens on Injective Native (Cosmos SDK)
 * Format: factory/{creator_address}/{subdenom}
 */

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  description: string;
}

interface DeploymentResult {
  success: boolean;
  denom?: string;
  txHash?: string;
  tokenId?: string;
  error?: string;
}

export const InjectiveNativeTokenDeployment: React.FC = () => {
  const [subdenom, setSubdenom] = useState('');
  const [initialSupply, setInitialSupply] = useState('');
  const [metadata, setMetadata] = useState<TokenMetadata>({
    name: '',
    symbol: '',
    decimals: 6,
    description: ''
  });
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [creatorAddress, setCreatorAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [useHSM, setUseHSM] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeploymentResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate subdenom format
  const validateSubdenom = (value: string): string | null => {
    if (!value) return 'Subdenom is required';
    if (value.length < 3) return 'Subdenom must be at least 3 characters';
    if (value.length > 44) return 'Subdenom must be less than 44 characters';
    if (!/^[a-z0-9-]+$/.test(value)) {
      return 'Only lowercase letters, numbers, and dashes allowed';
    }
    return null;
  };

  // Generate preview denom
  const getPreviewDenom = (): string => {
    if (!creatorAddress || !subdenom) return 'factory/{creator_address}/{subdenom}';
    return `factory/${creatorAddress}/${subdenom}`;
  };

  // Get explorer URLs
  const getExplorerUrl = (txHash: string): string => {
    const baseUrl = network === 'mainnet'
      ? 'https://explorer.injective.network'
      : 'https://testnet.explorer.injective.network';
    return `${baseUrl}/transaction/${txHash}`;
  };

  // Handle deployment
  const handleDeploy = async () => {
    // Validation
    const subdenomError = validateSubdenom(subdenom);
    if (subdenomError) {
      setValidationError(subdenomError);
      return;
    }

    if (!metadata.name || !metadata.symbol) {
      setValidationError('Token name and symbol are required');
      return;
    }

    if (!creatorAddress.startsWith('inj1')) {
      setValidationError('Invalid Injective address (must start with inj1)');
      return;
    }

    if (!privateKey && !useHSM) {
      setValidationError('Private key or HSM signing required');
      return;
    }

    setValidationError(null);
    setLoading(true);
    setResult(null);

    try {
      // Call backend API
      const response = await fetch('/api/injective/native/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          subdenom,
          initialSupply: initialSupply || undefined,
          metadata,
          creatorAddress,
          privateKey: useHSM ? undefined : privateKey,
          useHSM,
          network
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          error: data.message || 'Deployment failed'
        });
        return;
      }

      setResult({
        success: true,
        denom: data.denom,
        txHash: data.txHash,
        tokenId: data.tokenId
      });

      // Clear form on success
      setSubdenom('');
      setInitialSupply('');
      setMetadata({
        name: '',
        symbol: '',
        decimals: 6,
        description: ''
      });

    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Deploy Injective Native Token</CardTitle>
            <CardDescription>
              Create TokenFactory tokens on Injective (Cosmos SDK)
            </CardDescription>
          </div>
          <Badge variant={network === 'mainnet' ? 'default' : 'secondary'}>
            {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Network Selection */}
        <div className="space-y-2">
          <Label>Network</Label>
          <Select value={network} onValueChange={(value: 'testnet' | 'mainnet') => setNetwork(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="testnet">Testnet (injective-888)</SelectItem>
              <SelectItem value="mainnet">Mainnet (injective-1)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Creator Address */}
        <div className="space-y-2">
          <Label htmlFor="creatorAddress">Creator Address</Label>
          <Input
            id="creatorAddress"
            placeholder="inj1..."
            value={creatorAddress}
            onChange={(e) => setCreatorAddress(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Injective address that will create the token (becomes admin)
          </p>
        </div>

        {/* Subdenom */}
        <div className="space-y-2">
          <Label htmlFor="subdenom">
            Subdenom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="subdenom"
            placeholder="bond-2026-q1"
            value={subdenom}
            onChange={(e) => {
              const value = e.target.value.toLowerCase();
              setSubdenom(value);
              validateSubdenom(value);
            }}
          />
          <p className="text-sm text-muted-foreground">
            Only lowercase letters, numbers, and dashes (3-44 characters)
          </p>
        </div>

        {/* Preview Denom */}
        {(creatorAddress || subdenom) && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Generated Denom</AlertTitle>
            <AlertDescription className="font-mono text-sm">
              {getPreviewDenom()}
            </AlertDescription>
          </Alert>
        )}

        {/* Token Metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Token Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Chain Capital Bond Series A"
              value={metadata.name}
              onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol">
              Symbol <span className="text-red-500">*</span>
            </Label>
            <Input
              id="symbol"
              placeholder="BOND-A"
              value={metadata.symbol}
              onChange={(e) => setMetadata({ ...metadata, symbol: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="decimals">Decimals</Label>
            <Input
              id="decimals"
              type="number"
              min="0"
              max="18"
              value={metadata.decimals}
              onChange={(e) => setMetadata({ ...metadata, decimals: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialSupply">Initial Supply (Optional)</Label>
            <Input
              id="initialSupply"
              placeholder="1000000000"
              value={initialSupply}
              onChange={(e) => setInitialSupply(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              In base units (e.g., 1000000000 = 1,000 tokens with 6 decimals)
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Q1 2026 Corporate Bond Token"
            value={metadata.description}
            onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
            rows={3}
          />
        </div>

        {/* Private Key / HSM */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useHSM"
              checked={useHSM}
              onChange={(e) => setUseHSM(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="useHSM">Use HSM for signing</Label>
          </div>

          {!useHSM && (
            <div className="space-y-2">
              <Label htmlFor="privateKey">Private Key</Label>
              <Input
                id="privateKey"
                type="password"
                placeholder="Enter private key"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
              />
              <p className="text-sm text-yellow-600">
                ⚠️ Private keys should be handled securely. Consider using HSM for production.
              </p>
            </div>
          )}
        </div>

        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Error</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Result */}
        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{result.success ? 'Success!' : 'Deployment Failed'}</AlertTitle>
            <AlertDescription>
              {result.success ? (
                <div className="space-y-2">
                  <p>Token created successfully!</p>
                  <div className="font-mono text-sm space-y-1">
                    <p><strong>Denom:</strong> {result.denom}</p>
                    <p><strong>Token ID:</strong> {result.tokenId}</p>
                    <p>
                      <strong>Transaction:</strong>{' '}
                      <a
                        href={getExplorerUrl(result.txHash!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center"
                      >
                        View on Explorer <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </p>
                  </div>
                </div>
              ) : (
                <p>{result.error}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Deploy Button */}
        <Button
          onClick={handleDeploy}
          disabled={loading || !subdenom || !metadata.name || !metadata.symbol || !creatorAddress}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deploying Token...
            </>
          ) : (
            'Deploy Token'
          )}
        </Button>

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>About Injective Native Tokens</AlertTitle>
          <AlertDescription className="text-sm space-y-2">
            <p>
              TokenFactory tokens are permissionless and created directly on Injective's bank module.
              No smart contracts needed.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Format: <code className="text-xs">factory/{'{creator}/{subdenom}'}</code></li>
              <li>Admin can mint, burn, and transfer control</li>
              <li>Immediately tradable on Injective DEX</li>
              <li>Native integration with all Injective modules</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default InjectiveNativeTokenDeployment;
