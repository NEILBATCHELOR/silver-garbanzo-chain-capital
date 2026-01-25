/**
 * Solana Token List Component
 * Displays all deployed Solana tokens for a project
 * 
 * Features:
 * - Filter by SPL vs Token-2022
 * - Search by name/symbol/address
 * - View token details
 * - Quick transfer action
 * - Explorer links
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/database/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  ExternalLink,
  Send,
  Eye,
  RefreshCw,
  Filter,
  MoreVertical,
  Copy,
  CheckCircle2
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface SolanaToken {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  standard: string;
  status: string;
  address: string | null;
  blockchain: string | null;
  metadata: any;
  created_at: string;
  deployment: {
    id: string;
    network: string;
    contract_address: string;
    transaction_hash: string;
    deployed_at: string;
    solana_token_type: 'SPL' | 'Token2022' | null;
    solana_extensions: string[] | null;
    block_explorer_url: string | null;
  } | null;
}

interface TokenListProps {
  projectId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TokenList({ projectId }: TokenListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tokens, setTokens] = useState<SolanaToken[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<SolanaToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tokenTypeFilter, setTokenTypeFilter] = useState<'all' | 'SPL' | 'Token2022'>('all');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
  }, [projectId]);

  // Filter tokens when search or filter changes
  useEffect(() => {
    filterTokens();
  }, [tokens, searchTerm, tokenTypeFilter]);

  /**
   * Load Solana tokens from database
   */
  const loadTokens = async () => {
    try {
      setIsLoading(true);

      // Query tokens with their deployments
      const { data: tokensData, error: tokensError } = await supabase
        .from('tokens')
        .select('*')
        .eq('project_id', projectId)
        .in('standard', ['SPL', 'Token2022'])
        .order('created_at', { ascending: false });

      if (tokensError) throw tokensError;

      // Get deployment info for each token
      const tokensWithDeployments = await Promise.all(
        (tokensData || []).map(async (token) => {
          // Query for successful deployments (status can be 'success', 'deployed', 'DEPLOYED', 'SUCCESS')
          const { data: deployment } = await supabase
            .from('token_deployments')
            .select('*')
            .eq('token_id', token.id)
            .in('status', ['success', 'deployed', 'DEPLOYED', 'SUCCESS'])
            .order('deployed_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...token,
            deployment: deployment || null
          };
        })
      );

      setTokens(tokensWithDeployments);
    } catch (error: any) {
      console.error('Error loading tokens:', error);
      toast({
        title: 'Error Loading Tokens',
        description: error.message || 'Failed to load tokens',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filter tokens based on search and type filter
   */
  const filterTokens = () => {
    let filtered = tokens;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (token) =>
          token.name.toLowerCase().includes(search) ||
          token.symbol.toLowerCase().includes(search) ||
          token.deployment?.contract_address?.toLowerCase().includes(search)
      );
    }

    // Filter by token type
    if (tokenTypeFilter !== 'all') {
      filtered = filtered.filter(
        (token) => token.deployment?.solana_token_type === tokenTypeFilter
      );
    }

    setFilteredTokens(filtered);
  };

  /**
   * Copy address to clipboard
   */
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);

    toast({
      title: 'Address Copied',
      description: 'Token address copied to clipboard'
    });
  };

  /**
   * Format network name for display
   */
  const formatNetwork = (network: string) => {
    // Remove "solana-" prefix if present
    return network.replace(/^solana-/, '');
  };

  /**
   * Get explorer URL
   */
  const getExplorerUrl = (address: string, network: string) => {
    // Extract network without solana- prefix
    const networkName = network.replace(/^solana-/, '');
    const cluster = networkName === 'mainnet-beta' ? '' : `?cluster=${networkName}`;
    return `https://explorer.solana.com/address/${address}${cluster}`;
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Get token type badge color
   */
  const getTokenTypeBadgeVariant = (type: string | null) => {
    if (type === 'Token2022') return 'default';
    return 'secondary';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Solana Tokens</CardTitle>
              <CardDescription>
                Manage your deployed SPL and Token-2022 tokens
              </CardDescription>
            </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadTokens}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => navigate(`/projects/${projectId}/solana/deploy`)}>
              Deploy New Token
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, symbol, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                {tokenTypeFilter === 'all' ? 'All Types' : tokenTypeFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTokenTypeFilter('all')}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTokenTypeFilter('SPL')}>
                SPL Tokens
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTokenTypeFilter('Token2022')}>
                Token-2022
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tokens Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="space-y-2 flex-1 ml-4">
                  <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchTerm || tokenTypeFilter !== 'all'
                ? 'No tokens match your filters'
                : 'No Solana tokens deployed yet'}
            </p>
            {!searchTerm && tokenTypeFilter === 'all' && (
              <Button onClick={() => navigate(`/projects/${projectId}/solana/deploy`)}>
                Deploy Your First Token
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Transaction Hash</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Deployed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTokens.map((token) => (
                <TableRow key={token.id}>
                  {/* Token Info */}
                  <TableCell>
                    <div>
                      <div className="font-medium">{token.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {token.symbol} • {token.decimals} decimals
                      </div>
                    </div>
                  </TableCell>

                  {/* Token Type */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getTokenTypeBadgeVariant(token.deployment?.solana_token_type || null)}>
                        {token.deployment?.solana_token_type || 'SPL'}
                      </Badge>
                      {token.deployment?.solana_extensions && token.deployment.solana_extensions.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          +{token.deployment.solana_extensions.length} ext
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Address */}
                  <TableCell>
                    {token.deployment?.contract_address ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {token.deployment.contract_address.slice(0, 8)}...
                          {token.deployment.contract_address.slice(-6)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyAddress(token.deployment!.contract_address)}
                        >
                          {copiedAddress === token.deployment.contract_address ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not deployed</span>
                    )}
                  </TableCell>

                  {/* Transaction Hash */}
                  <TableCell>
                    {token.deployment?.transaction_hash ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {token.deployment.transaction_hash.slice(0, 8)}...
                          {token.deployment.transaction_hash.slice(-6)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const explorerUrl = getExplorerUrl(
                              token.deployment!.transaction_hash,
                              token.deployment!.network
                            ).replace('/address/', '/tx/');
                            window.open(explorerUrl, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Network */}
                  <TableCell>
                    {token.deployment?.network && (
                      <Badge variant="outline">
                        {formatNetwork(token.deployment.network)}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Deployed Date */}
                  <TableCell>
                    {token.deployment?.deployed_at ? (
                      <span className="text-sm text-muted-foreground">
                        {formatDate(token.deployment.deployed_at)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/projects/${projectId}/solana/${token.id}/details`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>

                        {token.deployment?.contract_address && (
                          <>
                            <DropdownMenuItem
                              onClick={() => navigate(`/projects/${projectId}/solana/${token.id}/transfer`)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Transfer Tokens
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                window.open(
                                  getExplorerUrl(
                                    token.deployment.contract_address,
                                    token.deployment.network
                                  ),
                                  '_blank'
                                )
                              }
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View on Explorer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

export default TokenList;
