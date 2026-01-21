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
import { AlertCircle, CheckCircle, ExternalLink, Info, Loader2, TrendingUp } from 'lucide-react';

/**
 * Injective Market Launch Component
 * 
 * Launches spot markets on Injective DEX for TokenFactory tokens
 */

interface MarketConfig {
  ticker: string;
  baseDenom: string;
  quoteDenom: string;
  minPriceTickSize: string;
  minQuantityTickSize: string;
  makerFeeRate: string;
  takerFeeRate: string;
}

interface LaunchResult {
  success: boolean;
  marketId?: string;
  txHash?: string;
  error?: string;
}

interface Token {
  denom: string;
  name: string;
  symbol: string;
}

// Common quote denoms
const QUOTE_DENOMS = {
  'USDT': 'peggy0xdac17f958d2ee523a2206206994597c13d831ec7',
  'INJ': 'inj',
  'USDC': 'peggy0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
};

interface InjectiveMarketLaunchProps {
  projectId?: string;
}

export const InjectiveMarketLaunch: React.FC<InjectiveMarketLaunchProps> = ({ projectId }) => {
  const [config, setConfig] = useState<MarketConfig>({
    ticker: '',
    baseDenom: '',
    quoteDenom: QUOTE_DENOMS.USDT,
    minPriceTickSize: '0.01',
    minQuantityTickSize: '0.001',
    makerFeeRate: '0.001',
    takerFeeRate: '0.002'
  });

  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [launcherAddress, setLauncherAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [useHSM, setUseHSM] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [result, setResult] = useState<LaunchResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);

  // Load available tokens
  useEffect(() => {
    loadTokens();
  }, [network]);

  const loadTokens = async () => {
    setLoadingTokens(true);
    try {
      const response = await fetch(
        `/api/injective/native/tokens?network=${network}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableTokens(data.tokens || []);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Generate ticker from base and quote
  const generateTicker = (baseDenom: string, quoteDenom: string): string => {
    const baseToken = availableTokens.find(t => t.denom === baseDenom);
    const baseSymbol = baseToken?.symbol || 'TOKEN';
    const quoteSymbol = Object.keys(QUOTE_DENOMS).find(
      key => QUOTE_DENOMS[key as keyof typeof QUOTE_DENOMS] === quoteDenom
    ) || 'QUOTE';

    return `${baseSymbol}/${quoteSymbol}`;
  };

  // Handle base denom change
  const handleBaseDenomChange = (denom: string) => {
    setConfig(prev => ({
      ...prev,
      baseDenom: denom,
      ticker: generateTicker(denom, prev.quoteDenom)
    }));
  };

  // Handle quote denom change
  const handleQuoteDenomChange = (denom: string) => {
    setConfig(prev => ({
      ...prev,
      quoteDenom: denom,
      ticker: generateTicker(prev.baseDenom, denom)
    }));
  };

  // Get explorer URL
  const getExplorerUrl = (txHash: string): string => {
    const baseUrl = network === 'mainnet'
      ? 'https://explorer.injective.network'
      : 'https://testnet.explorer.injective.network';
    return `${baseUrl}/transaction/${txHash}`;
  };

  // Get DEX URL
  const getDEXUrl = (): string => {
    return network === 'mainnet'
      ? 'https://helixapp.com/spot'
      : 'https://testnet.helixapp.com/spot';
  };

  // Validate configuration
  const validateConfig = (): string | null => {
    if (!config.ticker) return 'Ticker is required';
    if (!config.baseDenom) return 'Base token is required';
    if (!config.quoteDenom) return 'Quote token is required';
    if (!launcherAddress.startsWith('inj1')) {
      return 'Invalid launcher address (must start with inj1)';
    }
    if (!privateKey && !useHSM) {
      return 'Private key or HSM signing required';
    }

    // Validate tick sizes
    if (parseFloat(config.minPriceTickSize) <= 0) {
      return 'Price tick size must be positive';
    }
    if (parseFloat(config.minQuantityTickSize) <= 0) {
      return 'Quantity tick size must be positive';
    }

    // Validate fee rates
    const makerFee = parseFloat(config.makerFeeRate);
    const takerFee = parseFloat(config.takerFeeRate);
    if (makerFee < 0 || makerFee > 0.05) {
      return 'Maker fee rate must be between 0% and 5%';
    }
    if (takerFee < 0 || takerFee > 0.05) {
      return 'Taker fee rate must be between 0% and 5%';
    }

    return null;
  };

  // Handle market launch
  const handleLaunch = async () => {
    const error = validateConfig();
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/injective/native/markets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          ...config,
          launcherAddress,
          privateKey: useHSM ? undefined : privateKey,
          useHSM,
          network
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          error: data.message || 'Market launch failed'
        });
        return;
      }

      setResult({
        success: true,
        marketId: data.marketId,
        txHash: data.txHash
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
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Launch Spot Market
            </CardTitle>
            <CardDescription>
              Create a spot market on Injective DEX
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

        {/* Launcher Address */}
        <div className="space-y-2">
          <Label htmlFor="launcherAddress">Launcher Address</Label>
          <Input
            id="launcherAddress"
            placeholder="inj1..."
            value={launcherAddress}
            onChange={(e) => setLauncherAddress(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Any Injective address can launch a market
          </p>
        </div>

        {/* Market Configuration */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="text-lg font-semibold">Market Configuration</h3>

          {/* Base Token Selection */}
          <div className="space-y-2">
            <Label htmlFor="baseDenom">
              Base Token <span className="text-red-500">*</span>
            </Label>
            <Select
              value={config.baseDenom}
              onValueChange={handleBaseDenomChange}
              disabled={loadingTokens}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTokens ? 'Loading tokens...' : 'Select base token'} />
              </SelectTrigger>
              <SelectContent>
                {availableTokens.map((token) => (
                  <SelectItem key={token.denom} value={token.denom}>
                    {token.symbol} - {token.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The token being traded (your TokenFactory token)
            </p>
          </div>

          {/* Quote Token Selection */}
          <div className="space-y-2">
            <Label htmlFor="quoteDenom">
              Quote Token <span className="text-red-500">*</span>
            </Label>
            <Select
              value={config.quoteDenom}
              onValueChange={handleQuoteDenomChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(QUOTE_DENOMS).map(([symbol, denom]) => (
                  <SelectItem key={denom} value={denom}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The currency used for pricing (typically USDT)
            </p>
          </div>

          {/* Ticker */}
          <div className="space-y-2">
            <Label htmlFor="ticker">
              Market Ticker <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ticker"
              value={config.ticker}
              onChange={(e) => setConfig({ ...config, ticker: e.target.value })}
              placeholder="BOND-A/USDT"
            />
          </div>

          {/* Tick Sizes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minPriceTickSize">
                Min Price Tick Size <span className="text-red-500">*</span>
              </Label>
              <Input
                id="minPriceTickSize"
                type="number"
                step="0.01"
                value={config.minPriceTickSize}
                onChange={(e) => setConfig({ ...config, minPriceTickSize: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Minimum price increment (e.g., 0.01 = $0.01)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minQuantityTickSize">
                Min Quantity Tick Size <span className="text-red-500">*</span>
              </Label>
              <Input
                id="minQuantityTickSize"
                type="number"
                step="0.001"
                value={config.minQuantityTickSize}
                onChange={(e) => setConfig({ ...config, minQuantityTickSize: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Minimum quantity increment (e.g., 0.001)
              </p>
            </div>
          </div>

          {/* Fee Rates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="makerFeeRate">Maker Fee Rate</Label>
              <Input
                id="makerFeeRate"
                type="number"
                step="0.0001"
                value={config.makerFeeRate}
                onChange={(e) => setConfig({ ...config, makerFeeRate: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Default: 0.001 (0.1%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="takerFeeRate">Taker Fee Rate</Label>
              <Input
                id="takerFeeRate"
                type="number"
                step="0.0001"
                value={config.takerFeeRate}
                onChange={(e) => setConfig({ ...config, takerFeeRate: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Default: 0.002 (0.2%)
              </p>
            </div>
          </div>
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
            <AlertTitle>{result.success ? 'Market Launched!' : 'Launch Failed'}</AlertTitle>
            <AlertDescription>
              {result.success ? (
                <div className="space-y-2">
                  <p>Your market is now live on Injective DEX!</p>
                  <div className="font-mono text-sm space-y-1">
                    <p><strong>Market ID:</strong> {result.marketId}</p>
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
                    <p>
                      <strong>Trade Now:</strong>{' '}
                      <a
                        href={getDEXUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center"
                      >
                        Injective DEX <ExternalLink className="ml-1 h-3 w-3" />
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

        {/* Launch Button */}
        <Button
          onClick={handleLaunch}
          disabled={loading || !config.baseDenom || !config.quoteDenom || !launcherAddress}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Launching Market...
            </>
          ) : (
            'Launch Market'
          )}
        </Button>

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>About Spot Markets</AlertTitle>
          <AlertDescription className="text-sm space-y-2">
            <p>
              Spot markets enable 24/7 trading of your tokens on Injective's on-chain DEX.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Permissionless market creation</li>
              <li>On-chain orderbook matching</li>
              <li>Sub-second finality</li>
              <li>Customizable fee structures</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default InjectiveMarketLaunch;
