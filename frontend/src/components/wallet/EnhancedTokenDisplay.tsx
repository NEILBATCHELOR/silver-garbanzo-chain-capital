/**
 * Enhanced Token Display Component
 * 
 * Displays comprehensive token balances including ERC-721, ERC-1155, ERC-3525, and ERC-4626
 * Provides detailed information about NFTs, semi-fungible tokens, and tokenized vaults
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Coins, 
  Image as ImageIcon, 
  Layers, 
  Vault,
  ExternalLink,
  ChevronRight,
  Zap,
  Trophy,
  Wallet
} from 'lucide-react';

// Import types
import type {
  ERC721Balance,
  ERC1155Balance,
  ERC3525Balance,
  ERC4626Balance,
  EnhancedToken,
  TokenStandard
} from '@/services/wallet';

interface EnhancedTokenDisplayProps {
  enhancedTokens: EnhancedToken[];
  isLoading?: boolean;
}

const TokenStandardIcon = ({ standard }: { standard: TokenStandard }) => {
  switch (standard) {
    case 'ERC-721':
      return <ImageIcon className="w-4 h-4" />;
    case 'ERC-1155':
      return <Layers className="w-4 h-4" />;
    case 'ERC-3525':
      return <Zap className="w-4 h-4" />;
    case 'ERC-4626':
      return <Vault className="w-4 h-4" />;
    default:
      return <Coins className="w-4 h-4" />;
  }
};

const TokenStandardBadge = ({ standard }: { standard: TokenStandard }) => {
  const colors = {
    'ERC-721': 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    'ERC-1155': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    'ERC-3525': 'bg-orange-100 text-orange-800 hover:bg-orange-200',
    'ERC-4626': 'bg-green-100 text-green-800 hover:bg-green-200'
  };

  return (
    <Badge className={colors[standard]}>
      <TokenStandardIcon standard={standard} />
      <span className="ml-1">{standard}</span>
    </Badge>
  );
};

export default function EnhancedTokenDisplay({ enhancedTokens, isLoading = false }: EnhancedTokenDisplayProps) {
  const [selectedTokenType, setSelectedTokenType] = useState<TokenStandard | 'all'>('all');

  // Filter tokens by type
  const filteredTokens = selectedTokenType === 'all' 
    ? enhancedTokens 
    : enhancedTokens.filter(token => token.standard === selectedTokenType);

  // Group tokens by standard
  const tokensByStandard = enhancedTokens.reduce((acc, token) => {
    if (!acc[token.standard]) {
      acc[token.standard] = [];
    }
    acc[token.standard].push(token);
    return acc;
  }, {} as Record<TokenStandard, EnhancedToken[]>);

  const totalValue = enhancedTokens.reduce((sum, token) => sum + token.valueUsd, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Enhanced Tokens
          </CardTitle>
          <CardDescription>Loading advanced token balances...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (enhancedTokens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Enhanced Tokens
          </CardTitle>
          <CardDescription>NFTs, Semi-Fungible Tokens, and Tokenized Vaults</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No enhanced tokens found</p>
            <p className="text-sm">NFTs and advanced tokens will appear here</p>
          </div>
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
              <Trophy className="w-5 h-5" />
              Enhanced Tokens
            </CardTitle>
            <CardDescription>
              NFTs, Semi-Fungible Tokens, and Tokenized Vaults
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{enhancedTokens.length}</div>
            <div className="text-sm text-muted-foreground">
              ${totalValue.toFixed(2)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Token Type Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={selectedTokenType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTokenType('all')}
          >
            All ({enhancedTokens.length})
          </Button>
          {Object.entries(tokensByStandard).map(([standard, tokens]) => (
            <Button
              key={standard}
              variant={selectedTokenType === standard ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTokenType(standard as TokenStandard)}
              className="flex items-center gap-2"
            >
              <TokenStandardIcon standard={standard as TokenStandard} />
              {standard} ({tokens.length})
            </Button>
          ))}
        </div>

        {/* Token List */}
        <div className="space-y-4">
          {filteredTokens.map((token, index) => (
            <div key={`${token.contractAddress}-${index}`}>
              {token.standard === 'ERC-721' && (
                <ERC721TokenCard token={token as ERC721Balance} />
              )}
              {token.standard === 'ERC-1155' && (
                <ERC1155TokenCard token={token as ERC1155Balance} />
              )}
              {token.standard === 'ERC-3525' && (
                <ERC3525TokenCard token={token as ERC3525Balance} />
              )}
              {token.standard === 'ERC-4626' && (
                <ERC4626TokenCard token={token as ERC4626Balance} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ERC-721 NFT Display Component
function ERC721TokenCard({ token }: { token: ERC721Balance }) {
  const [showAllNFTs, setShowAllNFTs] = useState(false);
  const displayedNFTs = showAllNFTs ? token.ownedTokens : token.ownedTokens.slice(0, 3);

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TokenStandardBadge standard="ERC-721" />
            <div>
              <h4 className="font-medium">{token.name}</h4>
              <p className="text-sm text-muted-foreground">{token.symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">{token.totalCount} NFTs</div>
            {token.floorPrice && (
              <div className="text-sm text-muted-foreground">
                Floor: ${token.floorPrice.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {displayedNFTs.map((nft) => (
            <div key={nft.tokenId} className="border rounded-lg p-3">
              {nft.metadata?.image && (
                <img 
                  src={nft.metadata.image} 
                  alt={nft.metadata.name || `Token #${nft.tokenId}`}
                  className="w-full aspect-square object-cover rounded mb-2"
                />
              )}
              <div className="text-sm">
                <div className="font-medium truncate">
                  {nft.metadata?.name || `#${nft.tokenId}`}
                </div>
                <div className="text-muted-foreground">
                  Token #{nft.tokenId}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {token.ownedTokens.length > 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllNFTs(!showAllNFTs)}
            className="w-full"
          >
            {showAllNFTs ? 'Show Less' : `Show All ${token.totalCount} NFTs`}
            <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${showAllNFTs ? 'rotate-90' : ''}`} />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ERC-1155 Multi-Token Display Component
function ERC1155TokenCard({ token }: { token: ERC1155Balance }) {
  return (
    <Card className="border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TokenStandardBadge standard="ERC-1155" />
            <div>
              <h4 className="font-medium">{token.name}</h4>
              <p className="text-sm text-muted-foreground">{token.symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">{token.tokenTypes.length} Types</div>
            <div className="text-sm text-muted-foreground">
              ${token.totalValueUsd.toFixed(2)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {token.tokenTypes.map((tokenType) => (
            <div key={tokenType.tokenId} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {tokenType.metadata?.image && (
                  <img 
                    src={tokenType.metadata.image} 
                    alt={tokenType.metadata.name || `Token ${tokenType.tokenId}`}
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <div>
                  <div className="font-medium">
                    {tokenType.metadata?.name || `Token #${tokenType.tokenId}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Balance: {Number(tokenType.balance).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">
                  ${tokenType.valueUsd.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ERC-3525 Semi-Fungible Token Display Component
function ERC3525TokenCard({ token }: { token: ERC3525Balance }) {
  const [showAllTokens, setShowAllTokens] = useState(false);
  const displayedTokens = showAllTokens ? token.ownedTokens : token.ownedTokens.slice(0, 5);

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TokenStandardBadge standard="ERC-3525" />
            <div>
              <h4 className="font-medium">{token.name}</h4>
              <p className="text-sm text-muted-foreground">{token.symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">{token.ownedTokens.length} SFTs</div>
            <div className="text-sm text-muted-foreground">
              Total: {Number(token.totalValue).toFixed(token.valueDecimals)} units
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedTokens.map((sftToken) => (
            <div key={sftToken.tokenId} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-orange-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-medium">Token #{sftToken.tokenId}</div>
                  <div className="text-sm text-muted-foreground">
                    Slot: {sftToken.slot}
                  </div>
                  {sftToken.slotMetadata?.name && (
                    <div className="text-xs text-muted-foreground">
                      {sftToken.slotMetadata.name}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">
                  {sftToken.formattedValue}
                </div>
                <div className="text-xs text-muted-foreground">
                  {token.valueDecimals} decimals
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {token.ownedTokens.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllTokens(!showAllTokens)}
            className="w-full mt-3"
          >
            {showAllTokens ? 'Show Less' : `Show All ${token.ownedTokens.length} Tokens`}
            <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${showAllTokens ? 'rotate-90' : ''}`} />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ERC-4626 Tokenized Vault Display Component
function ERC4626TokenCard({ token }: { token: ERC4626Balance }) {
  return (
    <Card className="border-green-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TokenStandardBadge standard="ERC-4626" />
            <div>
              <h4 className="font-medium">{token.name}</h4>
              <p className="text-sm text-muted-foreground">{token.symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">${token.valueUsd.toFixed(2)}</div>
            {token.apy && (
              <div className="text-sm text-green-600">
                {token.apy.toFixed(2)}% APY
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Vault Shares</div>
            <div className="font-mono">{Number(token.shares).toFixed(4)}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Underlying Asset</div>
            <div className="font-medium">{token.underlyingSymbol}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Asset Value</div>
            <div className="font-mono">{Number(token.underlyingValue).toFixed(6)}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Share Price</div>
            <div className="font-mono">${token.sharePrice.toFixed(4)}</div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full mt-4 flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          View Vault Details
        </Button>
      </CardContent>
    </Card>
  );
}
