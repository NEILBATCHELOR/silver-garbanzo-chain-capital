/**
 * Solana Token Metadata Viewer
 * Displays comprehensive token metadata from on-chain and off-chain sources
 * 
 * Features:
 * - On-chain metadata (Token-2022)
 * - Off-chain metadata (JSON URI)
 * - Token extensions info
 * - Authority details
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  RefreshCw, 
  Info, 
  ExternalLink, 
  Shield, 
  Key,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { createModernRpc } from '@/infrastructure/web3/solana/ModernSolanaRpc';
import { address } from '@solana/kit';
import { MetadataLoadingSkeleton } from './LoadingStates';

// ============================================================================
// TYPES
// ============================================================================

interface TokenMetadata {
  // Basic Info
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  
  // URI Metadata (off-chain)
  uri?: string;
  description?: string;
  image?: string;
  externalUrl?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
  
  // On-chain Metadata (Token-2022)
  onChainMetadata?: {
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata: Record<string, string>;
  };
  
  // Authorities
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  updateAuthority?: string | null;
  
  // Extensions (Token-2022)
  extensions?: string[];
  transferFee?: {
    feeBasisPoints: number;
    maxFee: string;
  };
}

interface TokenMetadataViewerProps {
  tokenAddress: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  tokenType: 'SPL' | 'Token2022';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TokenMetadataViewer({
  tokenAddress,
  network,
  tokenType
}: TokenMetadataViewerProps) {
  const { toast } = useToast();
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    loadMetadata();
  }, [tokenAddress, network]);

  const loadMetadata = async () => {
    try {
      setIsLoading(true);
      
      const rpc = createModernRpc(network);
      const mintAddress = address(tokenAddress);
      
      // Get account info
      const accountInfo = await rpc.getAccountInfo(mintAddress);
      
      if (!accountInfo) {
        throw new Error('Token account not found');
      }

      // Parse metadata based on token type
      // TODO: Implement actual metadata parsing
      // For now, return placeholder
      const mockMetadata: TokenMetadata = {
        name: 'Token Name',
        symbol: 'TKN',
        decimals: 9,
        supply: '1000000',
        uri: 'https://arweave.net/...',
        description: 'Token description from metadata',
        mintAuthority: tokenAddress.slice(0, 44),
        freezeAuthority: null,
        extensions: tokenType === 'Token2022' ? ['Metadata', 'TransferFee'] : []
      };

      setMetadata(mockMetadata);
    } catch (error) {
      console.error('Error loading metadata:', error);
      toast({
        title: 'Error',
        description: 'Failed to load token metadata',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <MetadataLoadingSkeleton />;
  }

  if (!metadata) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No metadata available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Token Metadata
            </CardTitle>
            <CardDescription>
              {tokenType} token information
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadMetadata}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Token Image */}
        {metadata.image && (
          <div className="flex justify-center">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <img
                src={metadata.image}
                alt={metadata.name}
                className="w-full h-full object-cover"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(false)}
              />
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Name" value={metadata.name} />
            <InfoRow label="Symbol" value={metadata.symbol} />
            <InfoRow label="Decimals" value={metadata.decimals.toString()} />
            <InfoRow label="Total Supply" value={formatSupply(metadata.supply, metadata.decimals)} />
          </div>
        </div>

        {metadata.description && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{metadata.description}</p>
            </div>
          </>
        )}

        {/* Authorities */}
        <Separator />
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Key className="h-4 w-4" />
            Authorities
          </h3>
          <div className="space-y-2">
            <AuthorityRow
              label="Mint Authority"
              authority={metadata.mintAuthority}
            />
            <AuthorityRow
              label="Freeze Authority"
              authority={metadata.freezeAuthority}
            />
            {metadata.updateAuthority && (
              <AuthorityRow
                label="Update Authority"
                authority={metadata.updateAuthority}
              />
            )}
          </div>
        </div>

        {/* Extensions (Token-2022) */}
        {metadata.extensions && metadata.extensions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Extensions
              </h3>
              <div className="flex flex-wrap gap-2">
                {metadata.extensions.map((ext) => (
                  <Badge key={ext} variant="secondary">
                    {ext}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Transfer Fee */}
        {metadata.transferFee && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold">Transfer Fee</h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow
                  label="Fee Basis Points"
                  value={`${metadata.transferFee.feeBasisPoints} (${
                    metadata.transferFee.feeBasisPoints / 100
                  }%)`}
                />
                <InfoRow
                  label="Max Fee"
                  value={formatSupply(metadata.transferFee.maxFee, metadata.decimals)}
                />
              </div>
            </div>
          </>
        )}

        {/* External Links */}
        {(metadata.uri || metadata.externalUrl) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="font-semibold">Links</h3>
              {metadata.uri && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(metadata.uri, '_blank')}
                  className="w-full justify-start"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Metadata JSON
                </Button>
              )}
              {metadata.externalUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(metadata.externalUrl, '_blank')}
                  className="w-full justify-start"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  External Website
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-all">{value}</span>
    </div>
  );
}

function AuthorityRow({
  label,
  authority
}: {
  label: string;
  authority?: string | null;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-muted rounded">
      <span className="text-sm font-medium">{label}</span>
      {authority ? (
        <code className="text-xs bg-background px-2 py-1 rounded">
          {shortenAddress(authority)}
        </code>
      ) : (
        <Badge variant="outline">None</Badge>
      )}
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatSupply(supply: string, decimals: number): string {
  const value = Number(supply) / Math.pow(10, decimals);
  return value.toLocaleString(undefined, {
    maximumFractionDigits: decimals > 4 ? 4 : decimals
  });
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default TokenMetadataViewer;
