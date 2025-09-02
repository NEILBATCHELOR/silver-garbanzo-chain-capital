import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

// Import the existing operations components
import OperationsPanel from '@/components/tokens/operations/OperationsPanel';
import { getToken } from '@/components/tokens/services/tokenService';
import TokenPageLayout from '@/components/tokens/layout/TokenPageLayout';

// Types
interface Token {
  id: string;
  name: string;
  symbol: string;
  standard: string;
  status: string;
  address?: string;
  isPaused?: boolean;
  hasPauseFeature?: boolean;
  created_at: string;
  updated_at: string;
}

interface TokenOperationsPageProps {}

/**
 * TokenOperationsPage - Unified interface for all token operations
 * 
 * Replaces the fragmented TokenMintPage approach with a comprehensive
 * operations center that includes:
 * - Mint Operations (all standards)
 * - Burn Operations (all standards)  
 * - Pause/Unpause Operations
 * - Lock Operations
 * - Block Operations (ERC-20, ERC-1400)
 * 
 * Features:
 * - Standard-aware operation visibility
 * - Deployment validation and redirection
 * - Real-time status updates
 * - Comprehensive error handling
 */
const TokenOperationsPage: React.FC<TokenOperationsPageProps> = () => {
  const { tokenId, projectId } = useParams<{ tokenId: string; projectId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State management
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch token data
  const fetchTokenData = async () => {
    if (!tokenId) {
      setError('Token ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tokenData = await getToken(tokenId);
      
      if (!tokenData) {
        setError('Token not found');
        return;
      }

      setToken(tokenData as Token);
    } catch (err) {
      console.error('Error fetching token:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch token data');
      
      toast({
        title: "Error",
        description: "Failed to load token data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation back to dashboard
  const handleBackToDashboard = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/tokens`);
    } else {
      navigate('/tokens');
    }
  };

  // Handle navigation to token edit page
  const handleEditToken = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/tokens/${tokenId}/edit`);
    } else {
      navigate(`/tokens/${tokenId}/edit`);
    }
  };

  // Handle navigation to deployment page
  const handleDeployToken = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/tokens/${tokenId}/deploy`);
    } else {
      navigate(`/tokens/${tokenId}/deploy`);
    }
  };

  // Initialize component
  useEffect(() => {
    fetchTokenData();
  }, [tokenId]);

  // Refresh token data callback for operations
  const refreshTokenData = async () => {
    await fetchTokenData();
  };

  // Loading state
  if (loading) {
    return (
      <TokenPageLayout
        title="Loading Token Operations..."
        description="Please wait while we load the token operations interface"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </TokenPageLayout>
    );
  }

  // Error state
  if (error || !token) {
    return (
      <TokenPageLayout
        title="Token Operations Error"
        description="Unable to load token operations"
      >
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Token not found'}
            </AlertDescription>
          </Alert>
          
          <div className="mt-6 flex justify-center">
            <Button onClick={handleBackToDashboard} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Token Dashboard
            </Button>
          </div>
        </div>
      </TokenPageLayout>
    );
  }

  // Check if token is deployed
  const isDeployed = !!(token.address && token.address.trim());
  const canPerformOperations = isDeployed && token.status !== 'DRAFT';

  return (
    <TokenPageLayout
      title={`Token Operations - ${token.name}`}
      description={`Manage operations for ${token.symbol} (${token.standard})`}
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleBackToDashboard} 
              variant="outline" 
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold">{token.name} Operations</h1>
              <p className="text-muted-foreground">
                {token.symbol} • {token.standard}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge 
              variant={
                token.status === 'DEPLOYED' ? 'default' :
                token.status === 'DRAFT' ? 'secondary' :
                token.status === 'PAUSED' ? 'destructive' :
                'outline'
              }
            >
              {token.status}
            </Badge>
            
            <Button 
              onClick={handleEditToken} 
              variant="outline" 
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Token
            </Button>
          </div>
        </div>

        {/* Token Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Token Status
              {token.isPaused && (
                <Badge variant="destructive">Paused</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Current deployment and operational status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-lg font-semibold">{token.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Standard</p>
                <p className="text-lg font-semibold">{token.standard}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deployed</p>
                <p className="text-lg font-semibold">{isDeployed ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Operations</p>
                <p className="text-lg font-semibold">
                  {canPerformOperations ? 'Available' : 'Unavailable'}
                </p>
              </div>
            </div>
            
            {token.address && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground">Contract Address</p>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                  {token.address}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deployment Required Alert */}
        {!isDeployed && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>This token must be deployed to blockchain before operations can be performed.</span>
              <Button 
                onClick={handleDeployToken}
                size="sm"
                className="ml-4"
              >
                Deploy Token
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Operations Panel */}
        {canPerformOperations ? (
          <OperationsPanel
            tokenId={tokenId!}
            tokenStandard={token.standard}
            tokenName={token.name}
            tokenSymbol={token.symbol}
            isDeployed={isDeployed}
            isPaused={token.isPaused || false}
            hasPauseFeature={token.hasPauseFeature || false}
            refreshTokenData={refreshTokenData}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Operations Unavailable</CardTitle>
              <CardDescription>
                Token operations are not available in the current state
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {!isDeployed 
                    ? 'Deploy your token to blockchain to enable operations'
                    : 'Token operations are currently unavailable'
                  }
                </p>
                {!isDeployed && (
                  <Button onClick={handleDeployToken}>
                    Deploy Token
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Available Operations</CardTitle>
            <CardDescription>
              Operations available for {token.standard} tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Mint Operations */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Mint Operations</h4>
                <p className="text-sm text-muted-foreground">
                  Create new tokens and distribute to addresses
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Available for all standards
                </p>
              </div>

              {/* Burn Operations */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Burn Operations</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently destroy tokens from circulation
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Available for most standards
                </p>
              </div>

              {/* Pause Operations */}
              {token.hasPauseFeature && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Pause Operations</h4>
                  <p className="text-sm text-muted-foreground">
                    Emergency pause/unpause token transfers
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Available if pause feature enabled
                  </p>
                </div>
              )}

              {/* Lock Operations */}
              {['ERC-20', 'ERC-721', 'ERC-1155', 'ERC-1400', 'ERC-3525'].includes(token.standard) && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Lock Operations</h4>
                  <p className="text-sm text-muted-foreground">
                    Temporarily restrict token transfers
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Available for most standards
                  </p>
                </div>
              )}

              {/* Block Operations */}
              {['ERC-20', 'ERC-1400'].includes(token.standard) && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Block Operations</h4>
                  <p className="text-sm text-muted-foreground">
                    Block specific addresses from token interactions
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Available for ERC-20 and ERC-1400
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TokenPageLayout>
  );
};

export default TokenOperationsPage;
