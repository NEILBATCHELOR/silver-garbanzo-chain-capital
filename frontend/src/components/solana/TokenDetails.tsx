/**
 * Solana Token Details Component - ENHANCED
 * Comprehensive token management interface with tabs
 * 
 * Features:
 * - Overview: Basic info, deployment details, balance
 * - Metadata: Detailed metadata viewer
 * - Holders: Analytics and distribution
 * - History: Transaction history (existing)
 * - Search: Advanced transaction search
 * - Transfer: Batch transfer functionality
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/infrastructure/database/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  CheckCircle2,
  RefreshCw,
  Info,
  Wallet,
  Users,
  History,
  Search,
  Send
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import our enhanced components
import { TokenBalanceDisplay } from './TokenBalanceDisplay';
import { TokenMetadataViewer } from './TokenMetadataViewer';
import { TokenHolderAnalytics } from './TokenHolderAnalytics';
import { TokenTransactionHistory } from './TokenTransactionHistory';
import { TransactionSearch } from './TransactionSearch';
import { BatchTransfer } from './BatchTransfer';
import { FullPageLoader } from './LoadingStates';

// ============================================================================
// TYPES
// ============================================================================

interface TokenDetails {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  standard: string;
  total_supply: string | null;
  metadata: any;
  status: string;
  created_at: string;
  project_id: string;
  deployment: {
    id: string;
    network: string;
    contract_address: string;
    transaction_hash: string;
    deployed_at: string;
    deployed_by: string;
    solana_token_type: 'SPL' | 'Token2022' | null;
    solana_extensions: string[] | null;
    deployment_data: any;
    block_explorer_url: string | null;
  } | null;
}

interface TokenDetailsProps {
  projectId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TokenDetails({ projectId }: TokenDetailsProps) {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setToken] = useState<TokenDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedTxHash, setCopiedTxHash] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [balance, setBalance] = useState('0');

  // Load token on mount
  useEffect(() => {
    if (tokenId) {
      loadToken();
    }
  }, [tokenId]);

  /**
   * Load token details from database
   */
  const loadToken = async () => {
    try {
      setIsLoading(true);

      // Load token
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .eq('project_id', projectId)
        .single();

      if (tokenError) throw tokenError;
      if (!tokenData) throw new Error('Token not found');

      // Load deployment
      const { data: deployment } = await supabase
        .from('token_deployments')
        .select('*')
        .eq('token_id', tokenId)
        .eq('status', 'deployed')
        .order('deployed_at', { ascending: false })
        .limit(1)
        .single();

      setToken({
        ...tokenData,
        deployment: deployment || null
      });
    } catch (error: any) {
      console.error('Error loading token:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load token details',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Copy to clipboard
   */
  const copyToClipboard = (text: string, type: 'address' | 'tx') => {
    navigator.clipboard.writeText(text);

    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedTxHash(true);
      setTimeout(() => setCopiedTxHash(false), 2000);
    }

    toast({
      title: 'Copied',
      description: `${type === 'address' ? 'Address' : 'Transaction hash'} copied to clipboard`
    });
  };

  /**
   * Get explorer URL
   */
  const getExplorerUrl = (address: string, network: string, type: 'address' | 'tx' = 'address') => {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/${type}/${address}${cluster}`;
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return <FullPageLoader text="Loading token details..." />;
  }

  if (!token) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>Token not found</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{token.name}</h2>
              <Badge variant="secondary">{token.symbol}</Badge>
              {token.deployment && (
                <Badge variant="outline">
                  {token.deployment.solana_token_type || 'SPL'}
                </Badge>
              )}
            </div>
            {token.deployment && (
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {token.deployment.contract_address.slice(0, 8)}...
                  {token.deployment.contract_address.slice(-6)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    window.open(
                      getExplorerUrl(
                        token.deployment!.contract_address,
                        token.deployment!.network
                      ),
                      '_blank'
                    )
                  }
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {token.deployment && (
            <Badge variant={token.deployment.network === 'devnet' ? 'secondary' : 'default'}>
              {token.deployment.network}
            </Badge>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={loadToken}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="metadata" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Metadata
          </TabsTrigger>
          <TabsTrigger value="holders" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Holders
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Transfer
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Token Information</CardTitle>
              <CardDescription>Basic details about this token</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Name" value={token.name} />
                <InfoRow label="Symbol" value={token.symbol} />
                <InfoRow label="Decimals" value={token.decimals.toString()} />
                <InfoRow label="Standard" value={token.standard} />
                {token.total_supply && (
                  <InfoRow label="Total Supply" value={token.total_supply} />
                )}
                <InfoRow label="Status" value={token.status} />
              </div>
            </CardContent>
          </Card>

          {/* Deployment Information */}
          {token.deployment && (
            <Card>
              <CardHeader>
                <CardTitle>Deployment Details</CardTitle>
                <CardDescription>
                  Information about this token's deployment on Solana
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contract Address */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Token Address
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-sm bg-muted px-3 py-2 rounded">
                      {token.deployment.contract_address}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(token.deployment!.contract_address, 'address')
                      }
                    >
                      {copiedAddress ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        window.open(
                          getExplorerUrl(
                            token.deployment!.contract_address,
                            token.deployment!.network
                          ),
                          '_blank'
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Transaction Hash */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Deployment Transaction
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-sm bg-muted px-3 py-2 rounded">
                      {token.deployment.transaction_hash}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(token.deployment!.transaction_hash, 'tx')
                      }
                    >
                      {copiedTxHash ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        window.open(
                          getExplorerUrl(
                            token.deployment!.transaction_hash,
                            token.deployment!.network,
                            'tx'
                          ),
                          '_blank'
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    label="Token Type"
                    value={token.deployment.solana_token_type || 'SPL'}
                  />
                  <InfoRow label="Network" value={token.deployment.network} />
                  <InfoRow label="Deployed At" value={formatDate(token.deployment.deployed_at)} />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Deployed By
                    </label>
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                      {token.deployment.deployed_by.slice(0, 8)}...
                      {token.deployment.deployed_by.slice(-6)}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extensions */}
          {token.deployment?.solana_extensions && token.deployment.solana_extensions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Token-2022 Extensions</CardTitle>
                <CardDescription>
                  Advanced features enabled for this token
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {token.deployment.solana_extensions.map((ext) => (
                    <Badge key={ext} variant="secondary">
                      {ext}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Balance Display */}
          {token.deployment && (
            <TokenBalanceDisplay
              tokenAddress={token.deployment.contract_address}
              ownerAddress={token.deployment.deployed_by}
              tokenSymbol={token.symbol}
              decimals={token.decimals}
              network={token.deployment.network as 'mainnet-beta' | 'devnet' | 'testnet'}
            />
          )}
        </TabsContent>

        {/* METADATA TAB */}
        <TabsContent value="metadata">
          {token.deployment && (
            <TokenMetadataViewer
              tokenAddress={token.deployment.contract_address}
              network={token.deployment.network as 'mainnet-beta' | 'devnet' | 'testnet'}
              tokenType={(token.deployment.solana_token_type || 'SPL') as 'SPL' | 'Token2022'}
            />
          )}
        </TabsContent>

        {/* HOLDERS TAB */}
        <TabsContent value="holders">
          {token.deployment && (
            <TokenHolderAnalytics
              tokenAddress={token.deployment.contract_address}
              network={token.deployment.network as 'mainnet-beta' | 'devnet' | 'testnet'}
              decimals={token.decimals}
              tokenSymbol={token.symbol}
            />
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          {token.deployment && (
            <TokenTransactionHistory
              tokenId={token.id}
              tokenSymbol={token.symbol}
              tokenAddress={token.deployment.contract_address}
              decimals={token.decimals}
              network={token.deployment.network}
              currentUserAddress={token.deployment.deployed_by}
            />
          )}
        </TabsContent>

        {/* SEARCH TAB */}
        <TabsContent value="search">
          {token.deployment && (
            <TransactionSearch
              tokenId={token.id}
              tokenSymbol={token.symbol}
              decimals={token.decimals}
              projectId={token.project_id}
              network={token.deployment.network}
            />
          )}
        </TabsContent>

        {/* TRANSFER TAB */}
        <TabsContent value="transfer">
          {token.deployment && (
            <BatchTransfer
              tokenAddress={token.deployment.contract_address}
              tokenSymbol={token.symbol}
              decimals={token.decimals}
              availableBalance={balance}
              network={token.deployment.network as 'mainnet-beta' | 'devnet' | 'testnet'}
              onTransferComplete={(results) => {
                toast({
                  title: 'Batch Transfer Complete',
                  description: `Processed ${results.length} transfers`
                });
                setActiveTab('history');
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <p className="text-lg mt-1">{value}</p>
    </div>
  );
}

export default TokenDetails;
