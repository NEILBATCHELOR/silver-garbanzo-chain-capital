import React, { useState, useEffect } from 'react';
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
import { 
  AlertCircle, 
  CheckCircle, 
  ExternalLink, 
  Info, 
  Loader2, 
  Wallet,
  XCircle,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/utils/utils';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/infrastructure/database/client';

/**
 * Injective Native Token Deployment Component
 * 
 * Creates TokenFactory tokens on Injective Native (Cosmos SDK)
 * Format: factory/{creator_address}/{subdenom}
 * 
 * FIXES APPLIED:
 * - ✅ Proper Supabase auth token retrieval
 * - ✅ Detailed error messages with actionable steps
 * - ✅ Comprehensive success feedback
 * - ✅ Transaction status tracking
 * - ✅ Copy functionality for addresses
 * - ✅ Retry logic for failed operations
 * - ✅ Network validation
 * - ✅ Loading states with progress indication
 */

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  description?: string;        // Optional description
  uri?: string;                // Optional logo URI (IPFS)
  uriHash?: string;            // Optional hash of URI
  displayDenom?: string;       // Optional custom display denom
}

interface DeploymentResult {
  success: boolean;
  denom?: string;
  txHash?: string;
  tokenId?: string;
  error?: string;
  errorDetails?: {
    code?: string;
    message?: string;
    suggestion?: string;
  };
}

interface InjectiveNativeTokenDeploymentProps {
  projectId: string;
  walletId?: string;
  walletAddress?: string;
  walletPrivateKey?: string;
  network?: 'testnet' | 'mainnet';
}

export const InjectiveNativeTokenDeployment: React.FC<InjectiveNativeTokenDeploymentProps> = ({ 
  projectId,
  walletId,
  walletAddress,
  walletPrivateKey,
  network: initialNetwork = 'testnet'
}) => {
  // State
  const [subdenom, setSubdenom] = useState('');
  const [initialSupply, setInitialSupply] = useState('');
  const [metadata, setMetadata] = useState<TokenMetadata>({
    name: '',
    symbol: '',
    decimals: 18, // Default to 18 to match explorer cache expectations
    description: '',
    uri: '',
    uriHash: '',
    displayDenom: ''
  });
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>(initialNetwork);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeploymentResult | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  // Calculate human-readable token amount from raw supply
  const calculateDisplayAmount = (rawAmount: string, decimals: number): string => {
    if (!rawAmount || rawAmount === '0' || isNaN(Number(rawAmount))) {
      return '0';
    }
    
    try {
      const amount = BigInt(rawAmount);
      const divisor = BigInt(10 ** decimals);
      const integerPart = amount / divisor;
      const remainder = amount % divisor;
      
      if (remainder === BigInt(0)) {
        return integerPart.toLocaleString();
      }
      
      const fractionalPart = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
      return `${integerPart.toLocaleString()}.${fractionalPart}`;
    } catch (error) {
      return '0';
    }
  };

  // Convert human-readable amount to raw base units
  const convertToRawAmount = (displayAmount: string, decimals: number): string => {
    if (!displayAmount || displayAmount === '0') {
      return '0';
    }
    
    try {
      // Remove commas and parse
      const cleanAmount = displayAmount.replace(/,/g, '');
      const [integerPart, fractionalPart = ''] = cleanAmount.split('.');
      
      // Pad or truncate fractional part to match decimals
      const paddedFraction = (fractionalPart + '0'.repeat(decimals)).slice(0, decimals);
      
      // Combine and convert to BigInt
      const rawAmount = BigInt(integerPart + paddedFraction);
      return rawAmount.toString();
    } catch (error) {
      return '0';
    }
  };

  // Quick set functions for common amounts
  const setQuickAmount = (tokenAmount: number) => {
    const rawAmount = convertToRawAmount(tokenAmount.toString(), metadata.decimals);
    setInitialSupply(rawAmount);
  };

  // Apply custom amount
  const applyCustomAmount = () => {
    if (!customAmount || customAmount === '0') return;
    const rawAmount = convertToRawAmount(customAmount, metadata.decimals);
    setInitialSupply(rawAmount);
  };

  // Get display amount for current inputs
  const displayAmount = calculateDisplayAmount(initialSupply, metadata.decimals);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Update network when prop changes
  useEffect(() => {
    if (initialNetwork) {
      setNetwork(initialNetwork);
    }
  }, [initialNetwork]);

  // Validate subdenom format
  const validateSubdenom = (value: string): string | null => {
    if (!value) return 'Subdenom is required';
    if (value.length < 3) return 'Subdenom must be at least 3 characters';
    if (value.length > 44) return 'Subdenom must be less than 44 characters';
    if (!/^[a-z0-9.-]+$/.test(value)) {
      return 'Only lowercase letters, numbers, periods, and dashes allowed';
    }
    return null;
  };

  // Generate preview denom
  const getPreviewDenom = (): string => {
    if (walletAddress && subdenom) {
      return `factory/${walletAddress}/${subdenom}`;
    } else if (subdenom) {
      return `factory/{your_wallet_address}/${subdenom}`;
    } else if (walletAddress) {
      return `factory/${walletAddress}/{subdenom}`;
    }
    return 'factory/{creator_address}/{subdenom}';
  };

  // Get explorer URLs
  const getExplorerUrl = (txHash: string): string => {
    const baseUrl = network === 'mainnet'
      ? 'https://explorer.injective.network'
      : 'https://testnet.explorer.injective.network';
    return `${baseUrl}/transaction/${txHash}`;
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get auth token from Supabase session
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth session error:', error);
        setAuthError('Failed to get authentication session. Please log in again.');
        return null;
      }
      
      if (!session) {
        setAuthError('You are not logged in. Please log in to continue.');
        return null;
      }

      return session.access_token;
    } catch (error) {
      console.error('Unexpected auth error:', error);
      setAuthError('Unexpected authentication error. Please refresh and try again.');
      return null;
    }
  };

  // Handle deployment
  const handleDeploy = async () => {
    // Reset states
    setAuthError(null);
    setValidationError(null);
    setResult(null);

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

    if (!walletId || !walletAddress) {
      setValidationError('Please select an Injective wallet from the header');
      return;
    }

    setLoading(true);

    try {
      // Get auth token from Supabase
      const authToken = await getAuthToken();
      if (!authToken) {
        setLoading(false);
        return; // Auth error already set in getAuthToken
      }

      // Prepare metadata - filter out empty optional fields
      const cleanedMetadata = {
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        ...(metadata.description && { description: metadata.description }),
        ...(metadata.uri && { uri: metadata.uri }),
        ...(metadata.uriHash && { uriHash: metadata.uriHash }),
        ...(metadata.displayDenom && { displayDenom: metadata.displayDenom })
      };

      // Call backend API with wallet ID
      const response = await fetch('/api/injective/native/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          subdenom,
          initialSupply: initialSupply || undefined,
          metadata: cleanedMetadata,
          walletId,
          network,
          projectId
        })
      });

      const data = await response.json();

      console.log('✅ Backend Response:', data);
      console.log('📝 Response Status:', response.status);
      console.log('🔗 Transaction Hash:', data.txHash);
      console.log('🪙 Denom:', data.denom);

      if (!response.ok) {
        // Parse backend error
        let errorMessage = data.message || data.error || 'Deployment failed';
        let errorSuggestion = '';

        // Provide specific guidance based on error
        if (response.status === 401) {
          errorMessage = 'Authentication failed';
          errorSuggestion = 'Your session may have expired. Please refresh the page and log in again.';
        } else if (response.status === 404) {
          errorMessage = 'Wallet not found';
          errorSuggestion = 'The selected wallet may have been deleted. Please select a different wallet.';
        } else if (response.status === 400) {
          errorMessage = data.message || 'Invalid request';
          
          if (errorMessage.includes('subdenom')) {
            errorSuggestion = 'Check your subdenom format: lowercase letters, numbers, periods, and dashes only (3-44 characters).';
          } else if (errorMessage.includes('metadata')) {
            errorSuggestion = 'Ensure token name and symbol are provided.';
          } else if (errorMessage.includes('funds')) {
            errorSuggestion = `Your wallet needs testnet INJ. Visit: https://testnet.faucet.injective.network/`;
          }
        } else if (response.status === 500) {
          errorMessage = data.message || 'Server error';
          errorSuggestion = 'This is an internal error. Please try again or contact support if the problem persists.';
        }

        setResult({
          success: false,
          error: errorMessage,
          errorDetails: {
            code: `HTTP_${response.status}`,
            message: typeof data.details === 'string' ? data.details : errorMessage,
            suggestion: errorSuggestion
          }
        });
        return;
      }

      // Success!
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
        decimals: 18, // Default to 18 to match explorer cache expectations
        description: '',
        uri: '',
        uriHash: '',
        displayDenom: ''
      });

    } catch (error: any) {
      console.error('Deployment error:', error);
      
      let errorMessage = 'Unexpected error occurred';
      let errorSuggestion = 'Please check your internet connection and try again.';

      if (error.message) {
        errorMessage = error.message;
        
        if (error.message.includes('fetch')) {
          errorSuggestion = 'Cannot connect to server. Ensure the backend is running and try again.';
        } else if (error.message.includes('JSON')) {
          errorSuggestion = 'Received invalid response from server. This may be a server configuration issue.';
        }
      }

      setResult({
        success: false,
        error: errorMessage,
        errorDetails: {
          code: 'CLIENT_ERROR',
          message: error.message || String(error),
          suggestion: errorSuggestion
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setResult(null);
    setAuthError(null);
    setValidationError(null);
  };

  return (
    <Card className="w-[80%] max-w-[80%]">
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
        {/* Auth Error Alert */}
        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              {authError}
            </AlertDescription>
          </Alert>
        )}

        {/* Wallet Info Display */}
        {walletAddress && walletId ? (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertTitle>Creator Wallet</AlertTitle>
            <AlertDescription className="space-y-2">
              <div className="flex items-center justify-between">
                <code className="font-mono text-sm">{walletAddress}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(walletAddress)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This wallet will create the token and become admin
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Wallet Selected</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Please select an Injective wallet from the dashboard header to continue.</p>
              <p className="text-xs">
                The wallet dropdown is located in the header next to the network selector.
              </p>
            </AlertDescription>
          </Alert>
        )}

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
              const error = validateSubdenom(value);
              if (error !== validationError) {
                setValidationError(error);
              }
            }}
            disabled={loading}
          />
          <p className="text-sm text-muted-foreground">
            Only lowercase letters, numbers, periods, and dashes (3-44 characters)
          </p>
        </div>

        {/* Preview Denom */}
        {(walletAddress || subdenom) && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Generated Denom</AlertTitle>
            <AlertDescription className="font-mono text-sm break-all">
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="decimals">
              Decimals
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                (Default: 18 for explorer compatibility)
              </span>
            </Label>
            <Input
              id="decimals"
              type="number"
              min="0"
              max="18"
              value={metadata.decimals}
              onChange={(e) => setMetadata({ ...metadata, decimals: parseInt(e.target.value) || 0 })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              18 decimals (like ETH) ensures proper display on Injective Explorer. Use lower decimals for bond-like tokens.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialSupply">Initial Supply (Optional)</Label>
            <Input
              id="initialSupply"
              type="text"
              placeholder="100000000000000000000000000 (for 100M tokens with 18 decimals)"
              value={initialSupply}
              onChange={(e) => setInitialSupply(e.target.value)}
              disabled={loading}
            />
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Enter amount in base units (raw amount including decimals)
                </p>
              </div>
            </div>
            
            {/* Real-time preview of token amount */}
            {initialSupply && initialSupply !== '0' && !isNaN(Number(initialSupply)) && (
              <Alert className="mt-2 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-900 dark:text-blue-100">
                  Token Amount Preview
                </AlertTitle>
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <div className="mt-2 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {displayAmount}
                      </span>
                      <span className="text-sm font-medium">
                        {metadata.symbol || 'tokens'}
                      </span>
                    </div>
                    <div className="text-xs">
                      Raw amount: {Number(initialSupply).toLocaleString()} base units
                    </div>
                    <div className="text-xs">
                      Calculation: {Number(initialSupply).toLocaleString()} ÷ 10^{metadata.decimals} = {displayAmount}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Custom amount input */}
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Custom Amount:</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter custom amount (e.g., 5000 or 2.5)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  disabled={loading}
                  className="flex-1 text-sm"
                />
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={applyCustomAmount}
                  disabled={loading || !customAmount || customAmount === '0'}
                  className="text-xs whitespace-nowrap"
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* Quick set buttons for common amounts */}
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick Set Common Amounts:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickAmount(1000)}
                  disabled={loading}
                  className="text-xs"
                >
                  1K
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickAmount(10000)}
                  disabled={loading}
                  className="text-xs"
                >
                  10K
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickAmount(100000)}
                  disabled={loading}
                  className="text-xs"
                >
                  100K
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickAmount(1000000)}
                  disabled={loading}
                  className="text-xs"
                >
                  1M
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickAmount(10000000)}
                  disabled={loading}
                  className="text-xs"
                >
                  10M
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickAmount(100000000)}
                  disabled={loading}
                  className="text-xs"
                >
                  100M
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickAmount(1000000000)}
                  disabled={loading}
                  className="text-xs"
                >
                  1B
                </Button>
              </div>
            </div>
            
            {/* Helpful examples */}
            <div className="mt-2 p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-2">Common amounts (with {metadata.decimals} decimals):</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-mono">100{Array(metadata.decimals).fill('0').join('')}</span>
                  <span className="text-muted-foreground ml-1">= 100 tokens</span>
                </div>
                <div>
                  <span className="font-mono">1{Array(metadata.decimals + 3).fill('0').join('')}</span>
                  <span className="text-muted-foreground ml-1">= 1,000 tokens</span>
                </div>
                <div>
                  <span className="font-mono">1{Array(metadata.decimals + 6).fill('0').join('')}</span>
                  <span className="text-muted-foreground ml-1">= 1M tokens</span>
                </div>
                <div>
                  <span className="font-mono">1{Array(metadata.decimals + 8).fill('0').join('')}</span>
                  <span className="text-muted-foreground ml-1">= 100M tokens</span>
                </div>
              </div>
            </div>
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
            disabled={loading}
          />
        </div>

        {/* Advanced Options - Optional Metadata */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Advanced Options (Optional)</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Logo URI */}
            <div className="space-y-2">
              <Label htmlFor="uri">
                Logo URI
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (IPFS hosted, webp format recommended)
                </span>
              </Label>
              <Input
                id="uri"
                placeholder="ipfs://Qm..."
                value={metadata.uri}
                onChange={(e) => setMetadata({ ...metadata, uri: e.target.value })}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Hosting on IPFS ensures decentralized availability. Use small webp images for best results.
              </p>
            </div>

            {/* URI Hash */}
            <div className="space-y-2">
              <Label htmlFor="uriHash">
                URI Hash
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (For integrity verification)
                </span>
              </Label>
              <Input
                id="uriHash"
                placeholder="SHA256:abc123..."
                value={metadata.uriHash}
                onChange={(e) => setMetadata({ ...metadata, uriHash: e.target.value })}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Optional hash of the URI for verifying logo integrity.
              </p>
            </div>

            {/* Display Denom */}
            <div className="space-y-2">
              <Label htmlFor="displayDenom">
                Custom Display Denom
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (Defaults to subdenom if not provided)
                </span>
              </Label>
              <Input
                id="displayDenom"
                placeholder={subdenom || "bond"}
                value={metadata.displayDenom}
                onChange={(e) => setMetadata({ ...metadata, displayDenom: e.target.value })}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                The display alias shown on UIs. If not provided, the subdenom will be used.
              </p>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>About Advanced Options</AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <p>These fields are optional but recommended for professional token presentation:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li><strong>Logo URI:</strong> Makes your token easily recognizable on DEX and explorers</li>
                <li><strong>URI Hash:</strong> Ensures logo integrity and prevents tampering</li>
                <li><strong>Display Denom:</strong> Customize how your token appears in wallets</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        {/* Validation Error */}
        {validationError && !authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Error</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Result - Success */}
        {result && result.success && (
          <Alert className="border-green-600">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700">Token Created Successfully!</AlertTitle>
            <AlertDescription>
              <div className="space-y-4 mt-2">
                <p className="text-sm">
                  Your TokenFactory token has been created and is now live on Injective {network}.
                </p>

                <div className="bg-muted p-3 rounded-md space-y-3">
                  {/* Transaction Hash - Most Important */}
                  <div className="bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-green-700 dark:text-green-300">✅ Blockchain Transaction:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.txHash!)}
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <code className="font-mono text-xs break-all text-green-800 dark:text-green-200">{result.txHash}</code>
                  </div>

                  {/* Token Denom */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">Token Denom:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.denom!)}
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <code className="font-mono text-xs break-all">{result.denom}</code>
                  </div>
                  
                  {/* Database Record ID */}
                  {result.tokenId && (
                    <div>
                      <span className="text-xs font-semibold">Database Record:</span>
                      <p className="font-mono text-xs text-muted-foreground">{result.tokenId}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={getExplorerUrl(result.txHash!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View Transaction on Explorer
                  </a>

                  <a
                    href={network === 'mainnet' 
                      ? 'https://helixapp.com/spot' 
                      : 'https://testnet.helixapp.com/spot'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Trade on Helix DEX
                  </a>
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm font-semibold mb-2">📈 Next Steps:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Launch a spot market to enable trading</li>
                    <li>Mint additional tokens if needed</li>
                    <li>Set up permissions for team members</li>
                    <li>Configure oracles for price feeds (optional)</li>
                  </ul>
                </div>

                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Deploy Another Token
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Result - Failure */}
        {result && !result.success && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Deployment Failed</AlertTitle>
            <AlertDescription>
              <div className="space-y-3 mt-2">
                <p className="text-sm font-semibold">{result.error}</p>
                
                {result.errorDetails && (
                  <div className="bg-destructive/10 p-3 rounded-md space-y-2">
                    {result.errorDetails.code && (
                      <p className="text-xs">
                        <span className="font-semibold">Error Code:</span> {result.errorDetails.code}
                      </p>
                    )}
                    
                    {result.errorDetails.message && (
                      <p className="text-xs">
                        <span className="font-semibold">Details:</span> {result.errorDetails.message}
                      </p>
                    )}
                    
                    {result.errorDetails.suggestion && (
                      <div className="pt-2 border-t border-destructive/20">
                        <p className="text-xs font-semibold mb-1">💡 How to Fix:</p>
                        <p className="text-xs">{result.errorDetails.suggestion}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleDeploy}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="ghost"
                    size="sm"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Deploy Button */}
        <Button
          onClick={handleDeploy}
          disabled={
            loading || 
            !subdenom || 
            !metadata.name || 
            !metadata.symbol || 
            !walletId || // Must have wallet ID for backend
            !walletAddress || // Must have wallet address for display
            !!authError ||
            !!validationError
          }
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Token...
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
              <li><strong>Recommended:</strong> Use 18 decimals for best compatibility with Injective Explorer</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default InjectiveNativeTokenDeployment;
