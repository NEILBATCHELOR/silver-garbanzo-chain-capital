import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Layers,
  Gamepad2,
  Package
} from 'lucide-react';

interface ERC1155CardSectionProps {
  token: any;
  isExpanded: boolean;
  isLoading?: boolean;
}

const ERC1155CardSection: React.FC<ERC1155CardSectionProps> = ({
  token,
  isExpanded,
  isLoading = false
}) => {
  const properties = token.erc1155Properties || {};
  const blocks = token.blocks || {};
  
  const supportsBatching = properties.batchMinting || blocks.batch_minting;
  const hasContainer = properties.containerEnabled || blocks.container_enabled;
  const typesCount = token.erc1155Types?.length || 0;

  if (!isExpanded) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Multi-Token</span>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {typesCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {typesCount} Types
            </Badge>
          )}
          {supportsBatching && (
            <Badge variant="outline" className="text-xs bg-blue-50">
              Batch Minting
            </Badge>
          )}
          {hasContainer && (
            <Badge variant="outline" className="text-xs bg-green-50">
              Container Support
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
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-500" />
            Multi-Token Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Token Types</p>
            <p className="text-base font-medium">{typesCount || 'Not configured'}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Batch Operations</p>
            <Badge variant={supportsBatching ? "default" : "secondary"}>
              {supportsBatching ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Container Support</p>
            <Badge variant={hasContainer ? "default" : "secondary"}>
              {hasContainer ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">URI Storage</p>
            <p className="text-base font-medium">
              {properties.uriStorage || blocks.uri_storage || 'Individual'}
            </p>
          </div>
        </CardContent>
      </Card>

      {token.erc1155Types && token.erc1155Types.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-500" />
              Token Types ({token.erc1155Types.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {token.erc1155Types.slice(0, 3).map((type: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <span className="font-medium">{type.name}</span>
                  <Badge variant="outline">{type.tokenTypeId}</Badge>
                </div>
              ))}
              {token.erc1155Types.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{token.erc1155Types.length - 3} more types
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ERC1155CardSection;
