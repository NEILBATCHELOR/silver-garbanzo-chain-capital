import React, { useState } from 'react';
import { multiChainBalanceService, MultiChainBalance } from '@/services/wallet/MultiChainBalanceService';
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
      console.log(`Testing balance fetch for address: ${selectedAddress}`);
      
      const balances = await multiChainBalanceService.fetchMultiChainBalance(selectedAddress);
      setBalanceData(balances);
      
      console.log('Balance results:', balances);
      
    } catch (err) {
      console.error('Error fetching balances:', err);
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

        {/* Instructions */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <strong>Instructions:</strong> This tool tests the updated MultiChainBalanceService with testnet support.
          It should now fetch balances from Sepolia (Chain ID 11155111) and Holesky (Chain ID 17000) testnets,
          in addition to all mainnet chains. If you see zero balances but have funds on-chain, check the console
          for RPC connectivity issues.
        </div>
      </CardContent>
    </Card>
  );
}

export default TestnetBalanceChecker;