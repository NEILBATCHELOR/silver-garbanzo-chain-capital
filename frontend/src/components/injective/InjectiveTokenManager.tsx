import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Coins,
  ExternalLink,
  Loader2,
  Plus,
  Minus,
  Settings,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Copy,
  CheckCircle2,
  ArrowLeftRight,
  Filter
} from 'lucide-react';
import { MTSUtilities, mtsUtilitiesTestnet, mtsUtilitiesMainnet } from '@/services/wallet/injective';
import { Network } from '@injectivelabs/networks';
import { cn } from '@/utils/utils';

/**
 * Enhanced Injective Token Manager with MTS Integration and Project Awareness
 * 
 * Features:
 * - Project-scoped token listing
 * - Shows MTS status (EVM-compatible yes/no)
 * - Displays both Native denom and EVM address
 * - Mint, burn, metadata, market actions
 * - MTS cross-VM transfers
 */

interface Token {
  id: string;
  project_id: string | null;
  denom: string;
  subdenom: string;
  creator_address: string;
  total_supply: string;
  circulating_supply: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  admin_address: string;
  network: 'mainnet' | 'testnet';
  status: string;
  created_at: string;
  // MTS fields (calculated)
  mts_enabled?: boolean;
  evm_address?: string;
}

interface ActionResult {
  success: boolean;
  message?: string;
  txHash?: string;
}

interface InjectiveTokenManagerProps {
  projectId?: string;
  showProjectFilter?: boolean;
}

export const InjectiveTokenManager: React.FC<InjectiveTokenManagerProps> = ({ 
  projectId,
  showProjectFilter = true 
}) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [filterByProject, setFilterByProject] = useState(!!projectId);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [copiedDenom, setCopiedDenom] = useState<string | null>(null);

  // Action states
  const [actionType, setActionType] = useState<'mint' | 'burn' | 'metadata' | 'market' | 'mts' | null>(null);
  const [actionAmount, setActionAmount] = useState('');
  const [actionRecipient, setActionRecipient] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  // Load tokens
  useEffect(() => {
    loadTokens();
  }, [network, projectId, filterByProject]);

  const loadTokens = async () => {
    setLoading(true);
    try {
      let url = `/api/injective/native/tokens?network=${network}`;
      
      // Add project filter if enabled and projectId exists
      if (filterByProject && projectId) {
        url += `&project_id=${projectId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const tokensWithMTS = await enrichTokensWithMTS(data.tokens || []);
        setTokens(tokensWithMTS);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enrich tokens with MTS status
  const enrichTokensWithMTS = async (tokens: Token[]): Promise<Token[]> => {
    const mtsUtils = network === 'mainnet' ? mtsUtilitiesMainnet : mtsUtilitiesTestnet;
    
    const enriched = await Promise.all(
      tokens.map(async (token) => {
        try {
          // Check if token has MTS (would need ERC20 deployed)
          // For TokenFactory tokens, MTS requires registration
          // For now, mark as not MTS-enabled (future feature)
          return {
            ...token,
            mts_enabled: false,
            evm_address: undefined
          };
        } catch {
          return {
            ...token,
            mts_enabled: false,
            evm_address: undefined
          };
        }
      })
    );

    return enriched;
  };

  // Format supply with decimals
  const formatSupply = (supply: string, decimals: number): string => {
    const num = BigInt(supply);
    const divisor = BigInt(10 ** decimals);
    const integerPart = num / divisor;
    const remainder = num % divisor;
    
    if (remainder === BigInt(0)) {
      return integerPart.toString();
    }
    
    const fractionalPart = remainder.toString().padStart(decimals, '0');
    return `${integerPart}.${fractionalPart}`;
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDenom(type);
      setTimeout(() => setCopiedDenom(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get explorer URL
  const getExplorerUrl = (token: Token, type: 'token' | 'tx', hash?: string): string => {
    const baseUrl = token.network === 'mainnet'
      ? 'https://explorer.injective.network'
      : 'https://testnet.explorer.injective.network';
    
    if (type === 'tx' && hash) {
      return `${baseUrl}/transaction/${hash}`;
    }
    return baseUrl;
  };

  // Handle mint
  const handleMint = async () => {
    if (!selectedToken) return;

    setActionLoading(true);
    setActionResult(null);

    try {
      const response = await fetch(
        `/api/injective/native/tokens/${selectedToken.denom}/mint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            denom: selectedToken.denom,
            amount: actionAmount,
            recipient: actionRecipient || selectedToken.admin_address,
            adminAddress: selectedToken.admin_address,
            privateKey: '', // Would need to get from secure input
            useHSM: false
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        setActionResult({
          success: true,
          message: `Minted ${formatSupply(actionAmount, selectedToken.decimals)} tokens`,
          txHash: data.txHash
        });
        loadTokens();
      } else {
        setActionResult({
          success: false,
          message: data.message || 'Minting failed'
        });
      }
    } catch (error: any) {
      setActionResult({
        success: false,
        message: error.message || 'Unexpected error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle burn
  const handleBurn = async () => {
    if (!selectedToken) return;

    setActionLoading(true);
    setActionResult(null);

    try {
      const response = await fetch(
        `/api/injective/native/tokens/${selectedToken.denom}/burn`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            denom: selectedToken.denom,
            amount: actionAmount,
            holderAddress: selectedToken.admin_address,
            privateKey: '', // Would need to get from secure input
            useHSM: false
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        setActionResult({
          success: true,
          message: `Burned ${formatSupply(actionAmount, selectedToken.decimals)} tokens`,
          txHash: data.txHash
        });
        loadTokens();
      } else {
        setActionResult({
          success: false,
          message: data.message || 'Burning failed'
        });
      }
    } catch (error: any) {
      setActionResult({
        success: false,
        message: error.message || 'Unexpected error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open action dialog
  const openAction = (token: Token, type: 'mint' | 'burn' | 'metadata' | 'market' | 'mts') => {
    setSelectedToken(token);
    setActionType(type);
    setActionAmount('');
    setActionRecipient('');
    setActionResult(null);
  };

  // Close action dialog
  const closeAction = () => {
    setSelectedToken(null);
    setActionType(null);
    setActionAmount('');
    setActionRecipient('');
    setActionResult(null);
  };

  const getFilteredTokensCount = () => {
    return tokens.length;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Injective Token Manager
                {projectId && filterByProject && (
                  <Badge variant="secondary" className="ml-2">
                    <Filter className="h-3 w-3 mr-1" />
                    Project Scope
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage your Injective Native TokenFactory tokens with MTS support
                {projectId && filterByProject && (
                  <span className="block mt-1 text-xs">
                    Showing {getFilteredTokensCount()} token{getFilteredTokensCount() !== 1 ? 's' : ''} for this project
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {showProjectFilter && projectId && (
                <Button
                  variant={filterByProject ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterByProject(!filterByProject)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {filterByProject ? 'Project Only' : 'All Tokens'}
                </Button>
              )}
              <Select value={network} onValueChange={(value: 'testnet' | 'mainnet') => setNetwork(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="testnet">Testnet</SelectItem>
                  <SelectItem value="mainnet">Mainnet</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={loadTokens}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {filterByProject && projectId 
                  ? 'No tokens found for this project on ' + network
                  : 'No tokens found on ' + network
                }
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first token using the Deploy page
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Addresses</TableHead>
                  <TableHead className="text-right">Total Supply</TableHead>
                  <TableHead className="text-right">Circulating</TableHead>
                  <TableHead>MTS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-sm text-muted-foreground">{token.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {/* Native Denom */}
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            Native
                          </Badge>
                          <code className="text-xs truncate max-w-[200px]">
                            {token.subdenom}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => copyToClipboard(token.denom, `native-${token.id}`)}
                          >
                            {copiedDenom === `native-${token.id}` ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        {/* EVM Address (if MTS) */}
                        {token.mts_enabled && token.evm_address && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              EVM
                            </Badge>
                            <code className="text-xs truncate max-w-[200px]">
                              {token.evm_address.slice(0, 10)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => copyToClipboard(token.evm_address!, `evm-${token.id}`)}
                            >
                              {copiedDenom === `evm-${token.id}` ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatSupply(token.total_supply, token.decimals)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatSupply(token.circulating_supply, token.decimals)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={token.mts_enabled ? 'default' : 'outline'}
                        className={cn(
                          token.mts_enabled && 'bg-green-600'
                        )}
                      >
                        {token.mts_enabled ? '✓ Enabled' : 'Native Only'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={token.status === 'active' ? 'default' : 'outline'}>
                        {token.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(token, 'mint')}
                          title="Mint tokens"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(token, 'burn')}
                          title="Burn tokens"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        {token.mts_enabled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAction(token, 'mts')}
                            title="MTS Transfer"
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(token, 'market')}
                          title="Launch market"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionType !== null} onOpenChange={() => closeAction()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'mint' && 'Mint Tokens'}
              {actionType === 'burn' && 'Burn Tokens'}
              {actionType === 'metadata' && 'Update Metadata'}
              {actionType === 'market' && 'Launch Market'}
              {actionType === 'mts' && 'MTS Cross-VM Transfer'}
            </DialogTitle>
            <DialogDescription>
              {selectedToken?.symbol} ({selectedToken?.name})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === 'mint' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to Mint</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={`Amount in ${selectedToken?.symbol}`}
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter amount with {selectedToken?.decimals} decimals
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient (Optional)</Label>
                  <Input
                    id="recipient"
                    placeholder="inj1... (defaults to admin)"
                    value={actionRecipient}
                    onChange={(e) => setActionRecipient(e.target.value)}
                  />
                </div>
              </>
            )}

            {actionType === 'burn' && (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Burn</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder={`Amount in ${selectedToken?.symbol}`}
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter amount with {selectedToken?.decimals} decimals
                </p>
              </div>
            )}

            {actionType === 'market' && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Launch on DEX</AlertTitle>
                <AlertDescription>
                  Use the "Launch Market" page to create a spot market for this token on Injective DEX.
                </AlertDescription>
              </Alert>
            )}

            {actionType === 'mts' && (
              <Alert>
                <ArrowLeftRight className="h-4 w-4" />
                <AlertTitle>MTS Transfer</AlertTitle>
                <AlertDescription>
                  Use the "MTS Transfer" page to transfer tokens between Native and EVM environments.
                </AlertDescription>
              </Alert>
            )}

            {actionResult && (
              <Alert variant={actionResult.success ? 'default' : 'destructive'}>
                <AlertTitle>{actionResult.success ? 'Success!' : 'Error'}</AlertTitle>
                <AlertDescription>
                  {actionResult.message}
                  {actionResult.txHash && (
                    <div className="mt-2">
                      <a
                        href={getExplorerUrl(selectedToken!, 'tx', actionResult.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center text-sm"
                      >
                        View Transaction <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAction}>
              Close
            </Button>
            {actionType === 'mint' && (
              <Button
                onClick={handleMint}
                disabled={actionLoading || !actionAmount}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Minting...
                  </>
                ) : (
                  'Mint Tokens'
                )}
              </Button>
            )}
            {actionType === 'burn' && (
              <Button
                onClick={handleBurn}
                disabled={actionLoading || !actionAmount}
                variant="destructive"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Burning...
                  </>
                ) : (
                  'Burn Tokens'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InjectiveTokenManager;
