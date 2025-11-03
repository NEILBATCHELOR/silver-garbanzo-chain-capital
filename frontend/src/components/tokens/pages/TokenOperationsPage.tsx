import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Settings, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

// Import the PolicyAware operations panel
import PolicyAwareOperationsPanel from '@/components/tokens/operations/PolicyAwareOperationsPanel';
import { getToken, getTokens } from '@/components/tokens/services/tokenService';
import TokenPageLayout from '@/components/tokens/layout/TokenPageLayout';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// Types
interface Token {
  id: string;
  name: string;
  symbol: string;
  standard: string;
  status: string;
  address?: string;
  chain?: string;
  isPaused?: boolean;
  hasPauseFeature?: boolean;
  hasLockFeature?: boolean;
  hasBlockFeature?: boolean;
  created_at: string;
  updated_at: string;
}

interface TokenOperationsPageProps {}

/**
 * TokenOperationsPage - Unified interface for all token operations
 * 
 * Features token selection when no token is specified
 */
const TokenOperationsPage: React.FC<TokenOperationsPageProps> = () => {
  const { tokenId, projectId } = useParams<{ tokenId: string; projectId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State management
  const [token, setToken] = useState<Token | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTokenSelection, setShowTokenSelection] = useState(false);

  // Validate UUID format
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // Fetch available tokens for selection
  const fetchAvailableTokens = async () => {
    if (!projectId) return;
    
    try {
      const projectTokens = await getTokens(projectId);
      // Filter for deployed tokens that can have operations performed on them
      const deployedTokens = projectTokens.filter(t => 
        t.status === 'deployed' || t.address
      );
      setTokens(deployedTokens);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  // Fetch token data
  const fetchTokenData = async () => {
    // Check if we need to show token selection
    if (!tokenId || tokenId === 'select') {
      setShowTokenSelection(true);
      setLoading(false);
      await fetchAvailableTokens();
      return;
    }

    // Validate tokenId is a proper UUID
    if (!isValidUUID(tokenId)) {
      setShowTokenSelection(true);
      setLoading(false);
      await fetchAvailableTokens();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tokenData = await getToken(tokenId);

      if (!tokenData) {
        setError('Token not found');
        setShowTokenSelection(true);
        await fetchAvailableTokens();
        return;
      }

      // Check if token is deployed
      if (!tokenData.address && tokenData.status !== 'deployed') {
        setError('This token has not been deployed yet. Please deploy the token first.');
        toast({
          title: "Token Not Deployed",
          description: "Deploy the token to perform operations on it.",
          variant: "destructive",
        });

        // Redirect to deployment page
        setTimeout(() => {
          navigate(`/projects/${projectId}/tokens/${tokenId}/deploy`);
        }, 2000);
        return;
      }

      setToken(tokenData);
      setShowTokenSelection(false);
    } catch (error) {
      console.error('Error fetching token:', error);
      setError('Failed to load token data');
      setShowTokenSelection(true);
      await fetchAvailableTokens();
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount or when tokenId changes
  useEffect(() => {
    fetchTokenData();
  }, [tokenId]);

  // Handle token selection
  const handleTokenSelect = (selectedToken: Token) => {
    navigate(`/projects/${projectId}/tokens/${selectedToken.id}/operations`);
  };

  // Loading state
  if (loading) {
    return (
      <TokenPageLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TokenPageLayout>
    );
  }

  // Token Selection UI
  if (showTokenSelection) {
    return (
      <TokenPageLayout>
        <div className="container mx-auto p-4 max-w-6xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Select a Token for Operations
              </CardTitle>
              <CardDescription>
                Choose a deployed token to perform operations on
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tokens.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No deployed tokens found. Please deploy a token first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {tokens.map((t) => (
                    <Card 
                      key={t.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleTokenSelect(t)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{t.name}</h3>
                            <p className="text-sm text-muted-foreground">{t.symbol}</p>
                          </div>
                          <Badge variant="outline">{t.standard}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-sm">
                          {t.address && (
                            <p className="font-mono text-xs truncate">
                              {t.address}
                            </p>
                          )}
                          {t.chain && (
                            <p className="text-muted-foreground">
                              Chain: {t.chain}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TokenPageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <TokenPageLayout>
        <div className="container mx-auto p-4 max-w-6xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </div>
      </TokenPageLayout>
    );
  }

  // No token state
  if (!token) {
    return (
      <TokenPageLayout>
        <div className="container mx-auto p-4 max-w-6xl">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No token data available
            </AlertDescription>
          </Alert>
        </div>
      </TokenPageLayout>
    );
  }

  // Main operations view
  return (
    <TokenPageLayout>
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/projects/${projectId}/tokens`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Tokens
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}/tokens/${tokenId}/deploy`)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Deployment Settings
            </Button>
          </div>

          <div className="mt-4">
            <h1 className="text-3xl font-bold">{token.name} Operations</h1>
            <p className="text-muted-foreground mt-2">
              Perform policy-compliant operations on your {token.standard} token
            </p>
          </div>

          {/* Token Status */}
          <div className="flex items-center gap-4 mt-4">
            <Badge variant={token.status === 'deployed' ? 'success' : 'secondary'}>
              {token.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Symbol: {token.symbol}
            </span>
            {token.chain && (
              <span className="text-sm text-muted-foreground">
                Chain: {token.chain}
              </span>
            )}
            {token.isPaused && (
              <Badge variant="destructive">Paused</Badge>
            )}
          </div>

          {/* Contract Address */}
          {token.address && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Contract Address:</span>
                <code className="text-sm font-mono">{token.address}</code>
              </div>
            </div>
          )}
        </div>

        {/* PolicyAware Operations Panel */}
        <PolicyAwareOperationsPanel
          tokenId={token.id}
          projectId={projectId || ''} // 🆕 Add projectId
          tokenName={token.name}
          tokenSymbol={token.symbol}
          tokenStandard={token.standard}
          tokenAddress={token.address}
          chain={(token.chain as SupportedChain) || 'ethereum'}
          isDeployed={!!token.address && token.address !== ''}
        />

        {/* Feature Availability Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Available Features</CardTitle>
            <CardDescription>
              Operations available based on token configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${true ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Mint</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${true ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Burn</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${true ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Transfer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${token.hasPauseFeature ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Pause</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${token.hasLockFeature ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Lock</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${token.hasBlockFeature ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Block</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TokenPageLayout>
  );
};

export default TokenOperationsPage;
