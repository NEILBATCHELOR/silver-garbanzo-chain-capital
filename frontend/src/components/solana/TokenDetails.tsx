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
import { DeployerWalletOverview } from './DeployerWalletOverview';
import { TokenMetadataViewer } from './TokenMetadataViewer';
import { TokenMetadataManager } from './TokenMetadataManager';
import { TokenHolderAnalytics } from './TokenHolderAnalytics';
import { BlockchainTokenTransactionHistory } from './BlockchainTokenTransactionHistory';
import { TransactionSearch } from './TransactionSearch';
import { UnifiedSolanaTransfer } from './UnifiedSolanaTransfer';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { FullPageLoader } from './LoadingStates';
import { modernSolanaTokenQueryService, type TokenOnChainData } from '@/services/wallet/solana';
import { modernSolanaBlockchainQueryService } from '@/services/wallet/solana/ModernSolanaBlockchainQueryService';

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
    details?: {
      deployer_wallet?: string;
      user_id?: string;
      deployment_type?: string;
      token_type?: string;
      network?: string;
      [key: string]: any;
    };
  } | null;
}

interface TokenDetailsProps {
  projectId: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate if a string is a valid Solana address format
 * Solana addresses are base58-encoded strings, 32-44 characters long
 * UUIDs have hyphens and are exactly 36 characters with specific format
 */
function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  // UUIDs have hyphens - Solana addresses don't
  if (address.includes('-')) return false;
  
  // Solana addresses are typically 32-44 characters
  if (address.length < 32 || address.length > 44) return false;
  
  // Base58 alphabet (no 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
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
  
  // On-chain data (real-time from blockchain)
  const [onChainData, setOnChainData] = useState<TokenOnChainData | null>(null);
  const [isLoadingOnChain, setIsLoadingOnChain] = useState(false);
  
  // Metadata refresh key - increment to force TokenMetadataViewer re-mount
  const [metadataRefreshKey, setMetadataRefreshKey] = useState(0);

  // Load token on mount
  useEffect(() => {
    if (tokenId) {
      loadToken();
    }
  }, [tokenId]);

  /**
   * Load token details from database AND fetch live blockchain data
   * CRITICAL: Always prioritize on-chain metadata over database
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
        .in('status', ['success', 'deployed', 'DEPLOYED', 'SUCCESS'])
        .order('deployed_at', { ascending: false })
        .limit(1)
        .single();

      setToken({
        ...tokenData,
        deployment: deployment || null
      });
      
      // ALWAYS fetch real-time on-chain data if deployed
      if (deployment?.contract_address) {
        await loadOnChainData(deployment.contract_address, deployment.network);
      }
      
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
   * Load real-time data from Solana blockchain
   * CRITICAL: This fetches LIVE metadata including name/symbol from Token-2022 extension
   */
  const loadOnChainData = async (mintAddress: string, network: string) => {
    try {
      setIsLoadingOnChain(true);
      
      // Normalize network
      const normalizedNetwork = network.replace('solana-', '') as 'devnet' | 'testnet' | 'mainnet-beta';
      
      // Fetch complete on-chain metadata (includes name, symbol, supply, authorities)
      const metadata = await modernSolanaBlockchainQueryService.getOnChainMetadata(
        mintAddress,
        normalizedNetwork
      );
      
      // Format into TokenOnChainData structure
      const onChainInfo: TokenOnChainData = {
        mintAddress,
        supply: metadata.supply.toString(),
        decimals: metadata.decimals,
        mintAuthority: metadata.mintAuthority,
        freezeAuthority: metadata.freezeAuthority,
        supplyFormatted: formatSupply(metadata.supply.toString(), metadata.decimals),
        // CRITICAL: Include metadata fields
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        extensions: metadata.extensions
      };
      
      setOnChainData(onChainInfo);
      
      console.log('✅ Loaded live on-chain data:', {
        name: metadata.name,
        symbol: metadata.symbol,
        supply: onChainInfo.supplyFormatted
      });
      
    } catch (error) {
      console.error('Error loading on-chain data:', error);
      toast({
        title: 'Warning',
        description: 'Could not fetch live blockchain data. Showing database values.',
        variant: 'default'
      });
    } finally {
      setIsLoadingOnChain(false);
    }
  };

  /**
   * Handle metadata update from TokenMetadataManager
   * Refreshes both database and blockchain data
   */
  const handleMetadataUpdated = async () => {
    try {
      // First, fetch updated metadata from blockchain
      if (token?.deployment?.contract_address) {
        const normalizedNetwork = token.deployment.network.replace('solana-', '') as 'devnet' | 'testnet' | 'mainnet-beta';
        
        // Get fresh mint data including updated metadata
        const mintData = await modernSolanaTokenQueryService.getMintData(
          token.deployment.contract_address,
          normalizedNetwork
        );
        
        // Update on-chain data state
        setOnChainData(mintData);
      }
      
      // Reload token from database (will get any database updates)
      await loadToken();
      
      // Increment key to force TokenMetadataViewer to remount and refetch
      setMetadataRefreshKey(prev => prev + 1);
      
      toast({
        title: 'Success',
        description: 'Metadata updated and refreshed',
      });
    } catch (error) {
      console.error('Error refreshing after metadata update:', error);
      toast({
        title: 'Warning',
        description: 'Metadata updated but refresh failed. Try refreshing the page.',
        variant: 'default'
      });
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
    <div className="space-y-6 p-6">
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
              {/* ALWAYS prioritize on-chain metadata over database */}
              <h2 className="text-2xl font-bold">
                {onChainData?.name || token.name}
              </h2>
              <Badge variant="secondary">
                {onChainData?.symbol || token.symbol}
              </Badge>
              {isLoadingOnChain && (
                <Badge variant="outline" className="animate-pulse">
                  ↻ Loading live data...
                </Badge>
              )}
              {onChainData && !isLoadingOnChain && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  ✓ Live
                </Badge>
              )}
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
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/projects/${projectId}/solana/${tokenId}/operations`)}
              >
                Token Operations
              </Button>
              <Badge variant={token.deployment.network === 'devnet' ? 'secondary' : 'default'}>
                {token.deployment.network}
              </Badge>
            </>
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
                
                {/* Current Supply (from blockchain) */}
                {onChainData && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Current Supply {isLoadingOnChain && <span className="text-xs">(loading...)</span>}
                    </label>
                    <div className="mt-1 space-y-1">
                      <p className="text-lg font-semibold text-green-600">
                        {onChainData.supplyFormatted} {token.symbol}
                      </p>
                      {token.total_supply && token.total_supply !== '0' && (
                        <p className="text-xs text-muted-foreground">
                          Max Supply: {token.total_supply} {token.symbol}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        ✅ Live data
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Fallback to database value if on-chain not loaded */}
                {!onChainData && token.total_supply && (
                  <InfoRow label="Total Supply (Database)" value={token.total_supply} />
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
                  {(token.deployment.details?.deployer_wallet || onChainData?.mintAuthority) && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Deployer Wallet {!token.deployment.details?.deployer_wallet && '(Mint Authority)'}
                      </label>
                      <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                        {(token.deployment.details?.deployer_wallet || onChainData?.mintAuthority || '').slice(0, 8)}...
                        {(token.deployment.details?.deployer_wallet || onChainData?.mintAuthority || '').slice(-6)}
                      </code>
                    </div>
                  )}
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

          {/* Deployer Wallet Overview */}
          {token.deployment && onChainData?.mintAuthority && isValidSolanaAddress(onChainData.mintAuthority) && (
            <DeployerWalletOverview
              deployerAddress={onChainData.mintAuthority}
              network={token.deployment.network as SolanaNetwork}
              highlightToken={token.deployment.contract_address}
            />
          )}
        </TabsContent>

        {/* METADATA TAB */}
        <TabsContent value="metadata" className="space-y-6">
          {token.deployment && (
            <>
              {/* Token-2022 / On-chain Metadata Viewer */}
              <TokenMetadataViewer
                key={`metadata-viewer-${metadataRefreshKey}`}
                tokenAddress={token.deployment.contract_address}
                network={token.deployment.network as 'mainnet-beta' | 'devnet' | 'testnet'}
                tokenType={(token.deployment.solana_token_type || 'SPL') as 'SPL' | 'Token2022'}
              />

              {/* Metaplex Metadata Manager (for SPL tokens) */}
              {token.deployment.solana_token_type === 'SPL' && (
                <div className="mt-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">Metaplex Metadata Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Add, view, and update Metaplex metadata for your SPL token
                    </p>
                  </div>
                  <TokenMetadataManager
                    mintAddress={token.deployment.contract_address}
                    network={token.deployment.network as 'mainnet-beta' | 'devnet' | 'testnet'}
                    projectId={token.project_id}
                    onMetadataUpdated={handleMetadataUpdated}
                  />
                </div>
              )}
            </>
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
            <BlockchainTokenTransactionHistory
              tokenAddress={token.deployment.contract_address}
              tokenSymbol={token.symbol}
              decimals={token.decimals}
              network={token.deployment.network.replace('solana-', '') as SolanaNetwork}
              currentUserAddress={token.deployment.details?.deployer_wallet || token.deployment.deployed_by}
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
          <UnifiedSolanaTransfer
            projectId={token.project_id}
            tokenId={token.id}
            onTransferComplete={() => {
              toast({
                title: 'Transfer Complete',
                description: 'Token transfer completed successfully'
              });
              // Refresh token data to update balances
              loadToken();
              // Switch to history tab to see the transaction
              setActiveTab('history');
            }}
          />
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format token supply with decimals
 */
function formatSupply(supply: string, decimals: number): string {
  try {
    const supplyBigInt = BigInt(supply);
    const divisor = BigInt(10 ** decimals);
    
    // Calculate integer and fractional parts
    const integerPart = supplyBigInt / divisor;
    const remainder = supplyBigInt % divisor;
    
    // Format fractional part with proper padding
    const fractionalPart = remainder.toString().padStart(decimals, '0');
    
    // Combine and remove trailing zeros
    const combined = `${integerPart}.${fractionalPart}`;
    const formatted = parseFloat(combined).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals > 4 ? 4 : decimals
    });
    
    return formatted;
  } catch (error) {
    console.error('Error formatting supply:', error);
    return supply;
  }
}

export default TokenDetails;
