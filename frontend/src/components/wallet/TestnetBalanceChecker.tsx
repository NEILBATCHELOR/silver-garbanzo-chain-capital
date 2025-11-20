import React, { useState } from 'react';
import { BalanceService } from '@/services/wallet/balances/index';

// Define local interface to match the fixed service
interface MultiChainBalance {
  address: string;
  totalUsdValue: number;
  chains: Array<{
    chainId: number | string; // Support both numeric (EVM) and string (Cosmos) chain IDs
    chainName: string;
    symbol: string;
    icon?: string; // Optional to match ChainBalance interface
    color?: string;
    chainType?: string;
    nativeBalance: string;
    nativeUsdValue: number;
    tokens: any[];
    erc20Tokens: any[];
    enhancedTokens: any[];
    totalUsdValue: number;
    isOnline: boolean;
    rpcProvider?: string; // Optional to match ChainBalance interface
    error?: string;
  }>;
  lastUpdated: Date;
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink } from 'lucide-react';

/**
 * Testnet Balance Checker Component
 * 
 * Quick testing tool to verify wallet balances on testnet networks
 * Specifically checks Sepolia and Holesky testnets for the reported zero balance issue
 */
export function TestnetBalanceChecker() {
  const [isLoading, setIsLoading] = useState(false);
  const [balanceData, setBalanceData] = useState<MultiChainBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Test addresses from your database
  const testAddresses = [
    '0x5b6eCF75De04C25764D9E67fF0E8e083e1e244c1',
    '0x36B9Fefd4356Bf5240c172408616B8fDFd21F2C9'
  ];

  const [selectedAddress, setSelectedAddress] = useState(testAddresses[0]);

  const testBalances = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🧪 FIXED: Testing balance fetch for address: ${selectedAddress}`);

      // Debug RPC configuration first
      BalanceService.debugConfiguration();

      const balances = await BalanceService.fetchMultiChainBalance(selectedAddress);
      setBalanceData(balances);

      console.log('✅ Balance results:', balances);

    } catch (err) {
      console.error('❌ Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBalance = (balance: string, symbol: string) => {
    const num = parseFloat(balance);
    if (num === 0) return `0 ${symbol}`;
    if (num < 0.0001) return `< 0.0001 ${symbol}`;
    return `${num.toFixed(6)} ${symbol}`;
  };

  const formatUsdValue = (value: number) => {
    if (value === 0) return '$0.00';
    if (value < 0.01) return '< $0.01';
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Testnet Balance Checker
        </CardTitle>
        <CardDescription>
          Test wallet balance fetching for Sepolia and Holesky testnets to diagnose zero balance issues
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Address Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Address:</label>
          <div className="space-y-2">
            {testAddresses.map((address) => (
              <label key={address} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="address"
                  value={address}
                  checked={selectedAddress === address}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                  className="text-blue-600"
                />
                <span className="font-mono text-sm">{address}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Test Button */}
        <Button
          onClick={testBalances}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Checking Balances...' : 'Test Testnet Balances'}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 font-medium">Error:</div>
            <div className="text-red-600 text-sm mt-1">{error}</div>
          </div>
        )}

        {/* Balance Results */}
        {balanceData && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-800">
                Total Portfolio Value: {formatUsdValue(balanceData.totalUsdValue)}
              </div>
              <div className="text-blue-600 text-sm mt-1">
                Address: <span className="font-mono">{balanceData.address}</span>
              </div>
              <div className="text-blue-600 text-sm">
                Last Updated: {balanceData.lastUpdated.toLocaleString()}
              </div>
            </div>

            {/* Chain Balances */}
            <div className="grid gap-4 md:grid-cols-2">
              {balanceData.chains.map((chain) => (
                <Card key={chain.chainId} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{chain.icon}</span>
                        <div>
                          <CardTitle className="text-base">{chain.chainName}</CardTitle>
                          <Badge
                            variant={chain.isOnline ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {chain.isOnline ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatUsdValue(chain.totalUsdValue)}</div>
                        <div className="text-sm text-gray-500">Total</div>
                        {chain.rpcProvider && (
                          <div className="text-xs text-blue-500">via {chain.rpcProvider}</div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {/* Native Balance */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{chain.symbol} (Native)</span>
                      <div className="text-right">
                        <div className="font-medium">{formatBalance(chain.nativeBalance, chain.symbol)}</div>
                        <div className="text-xs text-gray-500">{formatUsdValue(chain.nativeUsdValue)}</div>
                      </div>
                    </div>

                    {/* Token Balances */}
                    {chain.erc20Tokens.map((token, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{token.symbol}</span>
                        <div className="text-right">
                          <div className="font-medium">{formatBalance(token.balance, token.symbol)}</div>
                          <div className="text-xs text-gray-500">{formatUsdValue(token.valueUsd)}</div>
                        </div>
                      </div>
                    ))}

                    {/* Explorer Link */}
                    <div className="pt-2 border-t">
                      <a
                        href={`https://${chain.chainId === 11155111 ? 'sepolia' : chain.chainId === 17000 ? 'holesky' : 'etherscan'}.etherscan.io/address/${selectedAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        View on Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Error Info */}
                    {chain.error && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        Error: {chain.error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Instructions and Debug Info */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>Instructions:</strong> This tool tests the updated MultiChainBalanceService with proper RPC integration.
            It now uses your configured Alchemy endpoints instead of public nodes for better reliability.
          </div>

          {/* RPC Configuration Debug */}
          <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded border border-blue-200">
            <strong>FIXED Service - RPC Configuration:</strong>
            <div className="mt-1 font-mono space-y-1">
              <div>✨ Using Fixed MultiChainBalanceService</div>
              <div>📍 EVM-only chains to prevent address format errors</div>
              <div>Sepolia: {import.meta.env.VITE_SEPOLIA_RPC_URL ? '✅ Configured' : '❌ Missing'}</div>
              <div>Holesky: {(import.meta.env.VITE_HOLEKSY_RPC_URL || import.meta.env.VITE_HOLESKY_RPC_URL) ? '✅ Configured' : '❌ Missing'}</div>
              <div>Mainnet: {import.meta.env.VITE_MAINNET_RPC_URL ? '✅ Configured' : '❌ Missing'}</div>
            </div>
          </div>

          {/* Expected Transactions */}
          <div className="text-xs text-green-600 bg-green-50 p-3 rounded border border-green-200">
            <strong>Expected Transactions:</strong>
            <div className="mt-1 space-y-1">
              <div>📝 Sepolia: <a href="https://sepolia.etherscan.io/tx/0xebde303c1620849bc8d4aeb0f642259c7a3e86123f8e2a36d6993ce1b1c663d5" target="_blank" className="text-blue-600 underline">View on Etherscan</a></div>
              <div>📝 Holesky: <a href="https://holesky.etherscan.io/tx/0x4d88b09c4a55dbc338f913f6039c3f782b32b43ac4e4b2e5e82d0dc11f2518a6" target="_blank" className="text-blue-600 underline">View on Etherscan</a></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TestnetBalanceChecker;