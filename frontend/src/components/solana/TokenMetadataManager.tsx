/**
 * Token Metadata Manager Component - ENHANCED
 * 
 * Supports BOTH metadata approaches:
 * - Metaplex Metadata (SPL tokens)
 * - Token-2022 On-Chain Metadata (Token-2022 tokens with metadata extension)
 * 
 * Automatically detects which type and uses the correct service
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Save, ExternalLink, Info } from 'lucide-react';
import { metaplexTokenMetadataService } from '@/services/wallet/solana/MetaplexTokenMetadataService';
import { token2022MetadataService } from '@/services/wallet/solana/Token2022MetadataService';
import { normalizeSolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaUtils';
import { SolanaWalletSelector, type SelectedSolanaWallet } from './SolanaWalletSelector';
import type { MetadataInfo } from '@/services/wallet/solana/MetaplexTokenMetadataService';
import type { Token2022MetadataInfo } from '@/services/wallet/solana/Token2022MetadataService';

interface TokenMetadataManagerProps {
  mintAddress: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet' | string; // Allow string for database formats
  projectId: string; // Required for wallet selection
  onMetadataUpdated?: () => void | Promise<void>; // Callback when metadata is successfully updated
}

type TokenType = 'SPL' | 'Token2022' | 'Unknown';
type UnifiedMetadata = MetadataInfo | Token2022MetadataInfo;

export function TokenMetadataManager({
  mintAddress,
  network: networkProp,
  projectId,
  onMetadataUpdated
}: TokenMetadataManagerProps) {
  // Normalize network format (handles both "devnet" and "solana-devnet")
  const network = normalizeSolanaNetwork(networkProp);
  
  const [tokenType, setTokenType] = useState<TokenType>('Unknown');
  const [metadata, setMetadata] = useState<UnifiedMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showAddMetadata, setShowAddMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Wallet selection state
  const [selectedWallet, setSelectedWallet] = useState<SelectedSolanaWallet | null>(null);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  // Form state for updates AND additions
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    uri: '',
    sellerFeeBasisPoints: 0,
    isMutable: true,
    additionalMetadata: new Map<string, string>()
  });

  // Get Solana Explorer URL with proper cluster
  const getExplorerUrl = () => {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/address/${mintAddress}${cluster}`;
  };

  // Detect token type and fetch metadata
  const handleFetchMetadata = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Try Token-2022 first (modern approach)
      const token2022Result = await token2022MetadataService.fetchMetadata(
        mintAddress,
        network
      );

      if (token2022Result.success && token2022Result.metadata) {
        // Token-2022 with on-chain metadata
        setTokenType('Token2022');
        setMetadata(token2022Result.metadata);
        setFormData({
          name: token2022Result.metadata.name,
          symbol: token2022Result.metadata.symbol,
          uri: token2022Result.metadata.uri,
          sellerFeeBasisPoints: 0, // Token-2022 doesn't use seller fees
          isMutable: true, // Token-2022 metadata is mutable if update authority exists
          additionalMetadata: new Map(Object.entries(token2022Result.metadata.additionalMetadata || {}))
        });
        setSuccess('Token-2022 metadata fetched successfully');
      } else {
        // Try Metaplex (SPL token approach)
        const metaplexResult = await metaplexTokenMetadataService.fetchMetadata(
          mintAddress,
          network
        );

        if (metaplexResult.success && metaplexResult.metadata) {
          // SPL token with Metaplex metadata
          setTokenType('SPL');
          setMetadata(metaplexResult.metadata);
          setFormData({
            name: metaplexResult.metadata.name,
            symbol: metaplexResult.metadata.symbol,
            uri: metaplexResult.metadata.uri,
            sellerFeeBasisPoints: metaplexResult.metadata.sellerFeeBasisPoints,
            isMutable: metaplexResult.metadata.isMutable,
            additionalMetadata: new Map()
          });
          setSuccess('SPL token metadata fetched successfully');
        } else {
          // No metadata found - this is an SPL token without metadata
          setTokenType('SPL'); // We know it's SPL, just without metadata
          setMetadata(null);
          setError(null); // Clear error
          setSuccess(null);
          // The UI will show the "Add Metadata" option
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMetadata(null);
      setTokenType('Unknown');
    } finally {
      setLoading(false);
    }
  };

  // Update metadata (dispatch to correct service based on token type)
  const handleUpdateMetadata = async () => {
    if (!selectedWallet) {
      setError('Please select a wallet with update authority');
      setShowWalletSelector(true);
      return;
    }

    if (tokenType === 'SPL' && metadata && !(metadata as MetadataInfo).isMutable) {
      setError('This token metadata is immutable and cannot be updated');
      return;
    }

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      if (tokenType === 'Token2022') {
        // Update Token-2022 on-chain metadata
        const result = await token2022MetadataService.updateMetadata(
          {
            name: formData.name,
            symbol: formData.symbol,
            uri: formData.uri,
            additionalMetadata: formData.additionalMetadata
          },
          {
            network,
            mintAddress,
            updateAuthorityPrivateKey: selectedWallet.privateKey
          }
        );

        if (result.success) {
          setSuccess(`Token-2022 metadata updated! Signature: ${result.signature}`);
          await handleFetchMetadata();
          
          // Notify parent component of update
          if (onMetadataUpdated) {
            await onMetadataUpdated();
          }
        } else {
          setError(result.error || 'Failed to update metadata');
        }
      } else if (tokenType === 'SPL') {
        // Update Metaplex metadata
        const result = await metaplexTokenMetadataService.updateMetadata(
          {
            name: formData.name,
            symbol: formData.symbol,
            uri: formData.uri,
            sellerFeeBasisPoints: formData.sellerFeeBasisPoints
          },
          {
            network,
            mintAddress,
            updateAuthorityPrivateKey: selectedWallet.privateKey
          }
        );

        if (result.success) {
          setSuccess(`Metaplex metadata updated! Signature: ${result.signature}`);
          await handleFetchMetadata();
          // Notify parent component of update
          if (onMetadataUpdated) {
            await onMetadataUpdated();
          }
        } else {
          setError(result.error || 'Failed to update metadata');
        }
      } else {
        setError('Cannot update metadata: Unknown token type');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUpdating(false);
    }
  };

  // Add metadata to SPL token (for tokens that don't have metadata yet)
  const handleAddMetadata = async () => {
    if (!selectedWallet) {
      setError('Please select a wallet to add metadata');
      setShowWalletSelector(true);
      return;
    }

    if (!formData.name || !formData.symbol || !formData.uri) {
      setError('Name, symbol, and URI are required');
      return;
    }

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      // Add Metaplex metadata to SPL token
      const result = await metaplexTokenMetadataService.addMetadata(
        {
          name: formData.name,
          symbol: formData.symbol,
          uri: formData.uri,
          sellerFeeBasisPoints: formData.sellerFeeBasisPoints
        },
        {
          network,
          mintAddress,
          payerPrivateKey: selectedWallet.privateKey,
          isMutable: formData.isMutable
        }
      );

      if (result.success) {
        setSuccess(`Metadata added successfully! Signature: ${result.signature}`);
        setShowAddMetadata(false);
        await handleFetchMetadata();
        // Notify parent component of update
        if (onMetadataUpdated) {
          await onMetadataUpdated();
        }
      } else {
        setError(result.error || 'Failed to add metadata');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAdding(false);
    }
  };

  // Check if metadata is mutable
  const isMetadataMutable = (): boolean => {
    if (tokenType === 'SPL' && metadata) {
      return (metadata as MetadataInfo).isMutable;
    }
    if (tokenType === 'Token2022') {
      return true; // Token-2022 metadata is always mutable if update authority is set
    }
    return false;
  };

  // Render metadata display based on token type
  const renderMetadataDisplay = () => {
    if (!metadata) return null;

    const isMutable = isMetadataMutable();

    if (tokenType === 'Token2022') {
      const token2022Meta = metadata as Token2022MetadataInfo;
      return (
        <>
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Token-2022 On-Chain Metadata</h3>
              <div className="flex gap-2">
                <Badge variant="default" className="bg-purple-500">Token-2022</Badge>
                <Badge variant={isMutable ? 'default' : 'secondary'}>
                  {isMutable ? 'Mutable' : 'Immutable'}
                </Badge>
              </div>
            </div>

            {/* Metadata Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{token2022Meta.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Symbol</Label>
                <p className="font-medium">{token2022Meta.symbol}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">URI</Label>
                <a
                  href={token2022Meta.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 text-xs break-all flex items-center gap-1"
                >
                  {token2022Meta.uri}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Update Authority</Label>
                <p className="font-mono text-xs truncate">{token2022Meta.updateAuthority}</p>
              </div>

              {/* Additional Metadata Fields */}
              {token2022Meta.additionalMetadata && Object.keys(token2022Meta.additionalMetadata).length > 0 && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Additional Fields</Label>
                  <div className="mt-2 space-y-1">
                    {Object.entries(token2022Meta.additionalMetadata).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-xs">
                        <span className="font-medium">{key}:</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      );
    } else if (tokenType === 'SPL') {
      const metaplexMeta = metadata as MetadataInfo;
      return (
        <>
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Metaplex Metadata (SPL Token)</h3>
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-500">SPL Token</Badge>
                <Badge variant={metaplexMeta.isMutable ? 'default' : 'secondary'}>
                  {metaplexMeta.isMutable ? 'Mutable' : 'Immutable'}
                </Badge>
                {metaplexMeta.primarySaleHappened && (
                  <Badge variant="outline">Primary Sale Done</Badge>
                )}
              </div>
            </div>

            {/* Metadata Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{metaplexMeta.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Symbol</Label>
                <p className="font-medium">{metaplexMeta.symbol}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">URI</Label>
                <a
                  href={metaplexMeta.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 text-xs break-all flex items-center gap-1"
                >
                  {metaplexMeta.uri}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div>
                <Label className="text-muted-foreground">Royalty</Label>
                <p className="font-medium">
                  {(metaplexMeta.sellerFeeBasisPoints / 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Metadata PDA</Label>
                <p className="font-mono text-xs truncate">{metaplexMeta.metadataPDA}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Update Authority</Label>
                <p className="font-mono text-xs truncate">{metaplexMeta.updateAuthority}</p>
              </div>
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Token Metadata Manager</span>
            <a
              href={getExplorerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-normal text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              View on Explorer
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This tool supports both <strong>SPL tokens</strong> (Metaplex metadata) and{' '}
              <strong>Token-2022</strong> (on-chain metadata). It will automatically detect which type your token is.
            </AlertDescription>
          </Alert>

          {/* Mint Address Display */}
          <div>
            <Label>Mint Address</Label>
            <Input value={mintAddress} readOnly className="font-mono text-xs" />
          </div>

          {/* Network Badge */}
          <div className="flex items-center gap-2">
            <Label>Network:</Label>
            <Badge variant="outline">{network}</Badge>
          </div>

          {/* Token Type Badge */}
          {tokenType !== 'Unknown' && (
            <div className="flex items-center gap-2">
              <Label>Token Type:</Label>
              <Badge 
                variant="outline"
                className={
                  tokenType === 'Token2022' 
                    ? 'bg-purple-50 text-purple-700 border-purple-300' 
                    : 'bg-green-50 text-green-700 border-green-300'
                }
              >
                {tokenType === 'Token2022' ? 'Token-2022 (On-Chain Metadata)' : 'SPL Token (Metaplex)'}
              </Badge>
            </div>
          )}

          {/* Fetch Button */}
          <Button
            onClick={handleFetchMetadata}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching Metadata...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Fetch Metadata
              </>
            )}
          </Button>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert>
              <AlertDescription className="text-green-600">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Add Metadata Button (show when no metadata found) */}
          {!metadata && !loading && tokenType === 'SPL' && (
            <div className="border-t pt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No metadata found for this SPL token. You can add Metaplex metadata to make it discoverable in wallets and marketplaces.
                </AlertDescription>
              </Alert>
              
              {/* Wallet Selector */}
              {!selectedWallet && (
                <div className="mt-4">
                  <SolanaWalletSelector
                    projectId={projectId}
                    network={network}
                    onWalletSelected={(wallet) => {
                      setSelectedWallet(wallet);
                      setShowWalletSelector(false);
                    }}
                    label="Select Wallet (Update Authority)"
                    description="This wallet will be used to add metadata and must have update authority"
                    autoSelectFirst={false}
                  />
                </div>
              )}

              {/* Selected Wallet Info */}
              {selectedWallet && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Selected Wallet</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {selectedWallet.address.slice(0, 8)}...{selectedWallet.address.slice(-8)}
                  </p>
                </div>
              )}
              
              {selectedWallet && (
                <Button
                  onClick={() => setShowAddMetadata(!showAddMetadata)}
                  variant="outline"
                  className="w-full mt-4"
                >
                  {showAddMetadata ? 'Cancel' : 'Add Metaplex Metadata'}
                </Button>
              )}

              {showAddMetadata && (
                <div className="mt-4 space-y-3 border p-4 rounded-lg bg-muted/10">
                  <h3 className="text-lg font-semibold">Add Metaplex Metadata</h3>
                  
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Token Name"
                    />
                  </div>

                  <div>
                    <Label>Symbol *</Label>
                    <Input
                      value={formData.symbol}
                      onChange={(e) =>
                        setFormData({ ...formData, symbol: e.target.value })
                      }
                      placeholder="TKN"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <Label>Metadata URI *</Label>
                    <Input
                      value={formData.uri}
                      onChange={(e) =>
                        setFormData({ ...formData, uri: e.target.value })
                      }
                      placeholder="https://arweave.net/..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      JSON file with additional token information
                    </p>
                  </div>

                  <div>
                    <Label>Royalty (basis points, 100 = 1%)</Label>
                    <Input
                      type="number"
                      value={formData.sellerFeeBasisPoints}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sellerFeeBasisPoints: parseInt(e.target.value) || 0
                        })
                      }
                      placeholder="500"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {(formData.sellerFeeBasisPoints / 100).toFixed(2)}% royalty fee
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isMutable"
                      checked={formData.isMutable}
                      onChange={(e) =>
                        setFormData({ ...formData, isMutable: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isMutable" className="cursor-pointer">
                      Mutable (allow future updates)
                    </Label>
                  </div>

                  <Button
                    onClick={handleAddMetadata}
                    disabled={adding}
                    className="w-full"
                  >
                    {adding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding Metadata...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Add Metadata
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Metadata Display */}
          {renderMetadataDisplay()}

          {/* Update Form (only if mutable and wallet selected) */}
          {metadata && isMetadataMutable() && selectedWallet && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-lg font-semibold">Update Metadata</h3>

              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Token Name"
                  />
                </div>

                <div>
                  <Label>Symbol</Label>
                  <Input
                    value={formData.symbol}
                    onChange={(e) =>
                      setFormData({ ...formData, symbol: e.target.value })
                    }
                    placeholder="TKN"
                  />
                </div>

                <div>
                  <Label>Metadata URI</Label>
                  <Input
                    value={formData.uri}
                    onChange={(e) =>
                      setFormData({ ...formData, uri: e.target.value })
                    }
                    placeholder="https://arweave.net/..."
                  />
                </div>

                {tokenType === 'SPL' && (
                  <div>
                    <Label>Royalty (basis points, 100 = 1%)</Label>
                    <Input
                      type="number"
                      value={formData.sellerFeeBasisPoints}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sellerFeeBasisPoints: parseInt(e.target.value) || 0
                        })
                      }
                      placeholder="500"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {(formData.sellerFeeBasisPoints / 100).toFixed(2)}%
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleUpdateMetadata}
                  disabled={updating}
                  className="w-full"
                >
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Metadata...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Metadata
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Immutable Warning */}
          {metadata && !isMetadataMutable() && (
            <Alert>
              <AlertDescription>
                This token metadata is <strong>immutable</strong> and cannot be updated.
              </AlertDescription>
            </Alert>
          )}

          {/* Missing Wallet Warning */}
          {metadata && isMetadataMutable() && !selectedWallet && (
            <div className="border-t pt-4 space-y-4">
              <Alert>
                <AlertDescription>
                  To update this metadata, please select a wallet with update authority.
                </AlertDescription>
              </Alert>
              
              <SolanaWalletSelector
                projectId={projectId}
                network={network}
                onWalletSelected={(wallet) => {
                  setSelectedWallet(wallet);
                  setShowWalletSelector(false);
                }}
                label="Select Wallet (Update Authority)"
                description="This wallet must have update authority for the token metadata"
                autoSelectFirst={false}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
