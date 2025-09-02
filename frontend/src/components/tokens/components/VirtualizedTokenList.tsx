/**
 * Virtualized Token List Component
 * 
 * High-performance token list with virtual scrolling for handling large datasets
 */

import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { UnifiedTokenCard, type UnifiedTokenData } from '@/components/tokens/display';
import { Button } from '@/components/ui/button';
import { Plus, Layers } from 'lucide-react';
import { useCachedComputation } from '../hooks/useCachedTokens';

type TokenItem = UnifiedTokenData;

interface VirtualizedTokenListProps {
  tokens: TokenItem[];
  projectId: string;
  onViewToken: (token: TokenItem) => void;
  onEditToken: (tokenId: string) => void;
  onDeployToken: (tokenId: string) => void;
  onDeleteToken: (token: TokenItem) => void;
  onUpdateStatus: (token: TokenItem) => void;
  onCreateToken: () => void;
  onClearFilters: () => void;
  showGrouping?: boolean;
  hasFilters?: boolean;
}

interface TokenGroup {
  title: string;
  tokens: TokenItem[];
  tier: 'primary' | 'secondary' | 'tertiary';
  badgeColor: string;
}

export const VirtualizedTokenList: React.FC<VirtualizedTokenListProps> = ({
  tokens,
  projectId,
  onViewToken,
  onEditToken,
  onDeployToken,
  onDeleteToken,
  onUpdateStatus,
  onCreateToken,
  onClearFilters,
  showGrouping = true,
  hasFilters = false
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Memoize token groups with caching for performance
  const tokenGroups = useCachedComputation(
    `virtualized-token-groups-${projectId}-${tokens.length}-${showGrouping}`,
    (): TokenGroup[] => {
      if (!showGrouping) {
        return [{
          title: 'All Tokens',
          tokens,
          tier: 'primary',
          badgeColor: 'bg-blue-100 text-blue-800'
        }];
      }

      const primaryTokens = tokens.filter(token => 
        token.tokenTier === 'primary' || 
        (!token.tokenTier && !token.metadata?.primaryTokenId)
      );
      
      const secondaryTokens = tokens.filter(token => 
        token.tokenTier === 'secondary' || 
        (token.metadata?.primaryTokenId && token.metadata?.tokenTier !== 'tertiary')
      );
      
      const tertiaryTokens = tokens.filter(token => 
        token.tokenTier === 'tertiary' || 
        token.metadata?.tokenTier === 'tertiary'
      );

      const groups: TokenGroup[] = [];

      if (primaryTokens.length > 0) {
        groups.push({
          title: `Primary Tokens (${primaryTokens.length})`,
          tokens: primaryTokens,
          tier: 'primary',
          badgeColor: 'bg-blue-100 text-blue-800'
        });
      }

      if (secondaryTokens.length > 0) {
        // Group secondary tokens by their primary token
        const groupedSecondary = secondaryTokens.reduce((acc: Record<string, TokenItem[]>, token) => {
          const primaryId = token.metadata?.primaryTokenId || token.metadata?.parentId || 'unknown';
          if (!acc[primaryId]) {
            acc[primaryId] = [];
          }
          acc[primaryId].push(token);
          return acc;
        }, {});

        Object.entries(groupedSecondary).forEach(([primaryId, groupTokens]) => {
          const primaryToken = primaryTokens.find(t => t.id === primaryId);
          const primaryName = primaryToken?.name || 
                              groupTokens[0]?.metadata?.primaryTokenName || 
                              `Primary Token ${primaryId}`;
          
          groups.push({
            title: `${primaryName}'s Secondary Tokens (${groupTokens.length})`,
            tokens: groupTokens,
            tier: 'secondary',
            badgeColor: 'bg-purple-100 text-purple-800'
          });
        });
      }

      if (tertiaryTokens.length > 0) {
        // Group tertiary tokens by their primary token
        const groupedTertiary = tertiaryTokens.reduce((acc: Record<string, TokenItem[]>, token) => {
          const primaryId = token.metadata?.primaryTokenId || token.metadata?.parentId || 'unknown';
          if (!acc[primaryId]) {
            acc[primaryId] = [];
          }
          acc[primaryId].push(token);
          return acc;
        }, {});

        Object.entries(groupedTertiary).forEach(([primaryId, groupTokens]) => {
          const primaryToken = primaryTokens.find(t => t.id === primaryId);
          const primaryName = primaryToken?.name || 
                              groupTokens[0]?.metadata?.primaryTokenName || 
                              `Primary Token ${primaryId}`;
          
          groups.push({
            title: `${primaryName}'s Tertiary Tokens (${groupTokens.length})`,
            tokens: groupTokens,
            tier: 'tertiary',
            badgeColor: 'bg-green-100 text-green-800'
          });
        });
      }

      return groups;
    },
    [tokens, showGrouping, projectId],
    5 * 60 * 1000 // Cache for 5 minutes
  );

  // Create flat list of items for virtualization (includes headers and tokens)
  const virtualItems = useMemo(() => {
    const items: Array<{
      type: 'header' | 'token';
      group?: TokenGroup;
      token?: TokenItem;
      id: string;
    }> = [];

    tokenGroups.forEach((group) => {
      // Add group header
      items.push({
        type: 'header',
        group,
        id: `header-${group.title}`
      });

      // Add tokens in the group
      group.tokens.forEach((token) => {
        items.push({
          type: 'token',
          token,
          group,
          id: `token-${token.id}`
        });
      });
    });

    return items;
  }, [tokenGroups]);

  // Virtual scrolling configuration
  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index];
      return item.type === 'header' ? 60 : 120; // Headers are smaller than token cards
    },
    overscan: 5
  });

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/10">
        <Layers className="h-10 w-10 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No tokens found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilters ? 
            "No tokens match your current filters." : 
            "You haven't created any tokens yet."}
        </p>
        {hasFilters ? (
          <Button variant="outline" className="mt-4" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : (
          <Button className="mt-4" onClick={onCreateToken}>
            <Plus className="h-4 w-4 mr-2" />
            Create Token
          </Button>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={parentRef}
      className="h-[800px] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = virtualItems[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {item.type === 'header' ? (
                <TokenGroupHeader group={item.group!} />
              ) : (
                <VirtualizedTokenCard
                  token={item.token!}
                  tier={item.group!.tier}
                  onView={onViewToken}
                  onEdit={onEditToken}
                  onDeploy={onDeployToken}
                  onDelete={onDeleteToken}
                  onUpdateStatus={onUpdateStatus}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface TokenGroupHeaderProps {
  group: TokenGroup;
}

const TokenGroupHeader: React.FC<TokenGroupHeaderProps> = ({ group }) => {
  return (
    <div className="flex items-center mb-4 py-2">
      {group.tier !== 'primary' && (
        <div className={`w-1 h-6 rounded mr-3 ${
          group.tier === 'secondary' ? 'bg-purple-300' : 'bg-green-300'
        }`} />
      )}
      <div className={`text-xs font-medium px-2.5 py-1 rounded-full mr-2 ${group.badgeColor}`}>
        {group.tier.charAt(0).toUpperCase() + group.tier.slice(1)}
      </div>
      <h3 className="text-lg font-semibold">{group.title}</h3>
    </div>
  );
};

interface VirtualizedTokenCardProps {
  token: TokenItem;
  tier: 'primary' | 'secondary' | 'tertiary';
  onView: (token: TokenItem) => void;
  onEdit: (tokenId: string) => void;
  onDeploy: (tokenId: string) => void;
  onDelete: (token: TokenItem) => void;
  onUpdateStatus: (token: TokenItem) => void;
}

const VirtualizedTokenCard: React.FC<VirtualizedTokenCardProps> = ({
  token,
  tier,
  onView,
  onEdit,
  onDeploy,
  onDelete,
  onUpdateStatus
}) => {
  const displayConfig = useMemo(() => {
    return {
      layout: 'horizontal' as const,
      showActions: true,
      showFeatures: true,
      showMetadata: tier === 'primary',
      maxFeatures: tier === 'primary' ? 5 : 3,
      actionsLayout: 'horizontal' as const
    };
  }, [tier]);

  return (
    <div className="mb-4">
      <UnifiedTokenCard
        token={token}
        displayConfig={displayConfig}
        onView={() => onView(token)}
        onEdit={() => onEdit(token.id)}
        onDeploy={() => onDeploy(token.id)}
        onDelete={() => onDelete(token)}
        onUpdateStatus={() => onUpdateStatus(token)}
      />
    </div>
  );
};

export default VirtualizedTokenList;