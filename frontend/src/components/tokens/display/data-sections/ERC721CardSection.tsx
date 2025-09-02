import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Image,
  Palette,
  Crown,
  DollarSign
} from 'lucide-react';

interface ERC721CardSectionProps {
  token: any;
  isExpanded: boolean;
  isLoading?: boolean;
}

const ERC721CardSection: React.FC<ERC721CardSectionProps> = ({
  token,
  isExpanded,
  isLoading = false
}) => {
  const properties = token.erc721Properties || {};
  const blocks = token.blocks || {};
  
  // Basic NFT information
  const assetType = properties.assetType || blocks.asset_type || 'Digital Art';
  const maxSupply = properties.maxSupply || blocks.max_supply;
  const hasRoyalty = properties.hasRoyalty || blocks.has_royalty;
  const royaltyPercentage = properties.royaltyPercentage || blocks.royalty_percentage;
  const baseUri = properties.baseUri || blocks.base_uri;
  const isMintable = properties.isMintable || blocks.is_mintable;

  if (!isExpanded) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">
            {assetType} NFT
          </span>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {maxSupply && (
            <Badge variant="outline" className="text-xs">
              Max: {parseInt(maxSupply).toLocaleString()}
            </Badge>
          )}
          {hasRoyalty && royaltyPercentage && (
            <Badge variant="outline" className="text-xs bg-green-50">
              {royaltyPercentage}% Royalty
            </Badge>
          )}
          {isMintable && (
            <Badge variant="outline" className="text-xs bg-blue-50">
              Mintable
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Basic NFT Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4 text-purple-500" />
            NFT Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Asset Type</p>
            <p className="text-base font-medium">{assetType}</p>
          </div>
          
          {maxSupply && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Max Supply</p>
              <p className="text-base font-medium">
                {parseInt(maxSupply).toLocaleString()}
              </p>
            </div>
          )}
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Metadata Storage</p>
            <p className="text-base font-medium">
              {properties.metadataStorage || blocks.metadata_storage || 'IPFS'}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">URI Storage</p>
            <p className="text-base font-medium">
              {properties.uriStorage || blocks.uri_storage || 'Immutable'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Royalty Information */}
      {hasRoyalty && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Royalty Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Royalty Percentage</p>
              <p className="text-base font-medium">{royaltyPercentage}%</p>
            </div>
            
            {properties.royaltyReceiver && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Royalty Receiver</p>
                <p className="text-sm font-mono truncate">
                  {properties.royaltyReceiver}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Base URI Information */}
      {baseUri && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-indigo-500" />
              Metadata Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Base URI</p>
              <p className="text-sm font-mono break-all bg-muted p-2 rounded">
                {baseUri}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attributes Summary */}
      {token.erc721Attributes && token.erc721Attributes.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Attributes ({token.erc721Attributes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {token.erc721Attributes.slice(0, 6).map((attr: any, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {attr.traitType}: {attr.value}
                </Badge>
              ))}
              {token.erc721Attributes.length > 6 && (
                <Badge variant="secondary" className="text-xs">
                  +{token.erc721Attributes.length - 6} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ERC721CardSection;
