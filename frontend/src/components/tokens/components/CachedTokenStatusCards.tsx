/**
 * Cached Token Status Cards Component
 * 
 * Optimized status cards with cached metric expansion and virtualized lists
 */

import React, { useMemo, useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TokenStatus } from '@/types/core/centralModels';
import { UnifiedTokenCard, type UnifiedTokenData } from '@/components/tokens/display';
import { useCachedComputation } from '../hooks/useCachedTokens';
import { useVirtualizer } from '@tanstack/react-virtual';

type TokenItem = UnifiedTokenData;

// Map to define status card appearance
const statusCardConfig = {
  [TokenStatus.DRAFT]: {
    label: 'Draft',
    icon: require('lucide-react').FileText,
    color: 'bg-slate-100',
    iconColor: 'text-slate-500'
  },
  [TokenStatus.REVIEW]: {
    label: 'Under Review',
    icon: require('lucide-react').Clock,
    color: 'bg-yellow-100',
    iconColor: 'text-yellow-500'
  },
  [TokenStatus.APPROVED]: {
    label: 'Approved',
    icon: require('lucide-react').CheckCircle,
    color: 'bg-green-100',
    iconColor: 'text-green-500'
  },
  [TokenStatus.REJECTED]: {
    label: 'Rejected',
    icon: require('lucide-react').XCircle,
    color: 'bg-red-100',
    iconColor: 'text-red-500'
  },
  [TokenStatus.READY_TO_MINT]: {
    label: 'Ready to Mint',
    icon: require('lucide-react').Activity,
    color: 'bg-indigo-100',
    iconColor: 'text-indigo-500'
  },
  [TokenStatus.MINTED]: {
    label: 'Minted',
    icon: require('lucide-react').CheckCircle,
    color: 'bg-blue-100',
    iconColor: 'text-blue-500'
  },
  [TokenStatus.DEPLOYED]: {
    label: 'Deployed',
    icon: require('lucide-react').CheckCircle,
    color: 'bg-purple-100',
    iconColor: 'text-purple-500'
  },
  [TokenStatus.PAUSED]: {
    label: 'Paused',
    icon: require('lucide-react').PauseCircle,
    color: 'bg-orange-100',
    iconColor: 'text-orange-500'
  },
  [TokenStatus.DISTRIBUTED]: {
    label: 'Distributed',
    icon: require('lucide-react').PlayCircle,
    color: 'bg-teal-100',
    iconColor: 'text-teal-500'
  }
};

interface CachedTokenStatusCardsProps {
  tokens: TokenItem[];
  statusCounts: Record<string, number>;
  projectId: string;
  expandedCards: Record<string, boolean>;
  onToggleCard: (status: string, e?: React.MouseEvent) => void;
  onViewToken: (token: TokenItem) => void;
  onApplyFilter: (status: string) => void;
}

export const CachedTokenStatusCards: React.FC<CachedTokenStatusCardsProps> = ({
  tokens,
  statusCounts,
  projectId,
  expandedCards,
  onToggleCard,
  onViewToken,
  onApplyFilter
}) => {
  // Cache tokens by status to avoid repeated filtering
  const tokensByStatus = useCachedComputation(
    `tokens-by-status-${projectId}-${tokens.length}`,
    () => {
      const grouped: Record<string, TokenItem[]> = {};
      
      tokens.forEach(token => {
        const status = token.status;
        if (!grouped[status]) {
          grouped[status] = [];
        }
        grouped[status].push(token);
      });
      
      return grouped;
    },
    [tokens, projectId],
    5 * 60 * 1000 // Cache for 5 minutes
  );

  const renderStatusCard = useCallback((status: string, config: any) => {
    const count = statusCounts[status] || 0;
    const StatusIcon = config.icon;
    const isExpanded = expandedCards[status] || false;
    
    // Get cached tokens for this status
    const tokensWithStatus = tokensByStatus[status] || [];
    
    return (
      <Card 
        key={status} 
        className={`shadow-sm transition-all duration-200 cursor-pointer ${isExpanded ? 'ring-2 ring-primary' : ''}`}
      >
        <div 
          className="p-4 pb-2 space-y-1.5 cursor-pointer"
          onClick={(e) => onToggleCard(status, e)}
        >
          <div className="flex justify-between items-start">
            <div className="text-sm font-medium">{config.label}</div>
            <div className="flex items-center">
              <div className="p-1.5 rounded-md bg-white/80 mr-2">
                <StatusIcon className={`h-4 w-4 ${config.iconColor}`} />
              </div>
              {isExpanded ? 
                <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                <ChevronDown className="h-4 w-4 text-gray-500" />
              }
            </div>
          </div>
          <div className="flex justify-between items-end pt-2">
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-xs text-muted-foreground">
              {count === 1 ? 'Token' : 'Tokens'}
            </div>
          </div>
        </div>
        
        {/* Expandable section with virtualized list for performance */}
        {isExpanded && (
          <StatusCardExpandedSection
            tokens={tokensWithStatus}
            onViewToken={onViewToken}
            onViewAll={() => onApplyFilter(status)}
          />
        )}
      </Card>
    );
  }, [statusCounts, expandedCards, tokensByStatus, onToggleCard, onViewToken, onApplyFilter]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Object.entries(statusCardConfig).map(([status, config]) => 
        renderStatusCard(status, config)
      )}
    </div>
  );
};

interface StatusCardExpandedSectionProps {
  tokens: TokenItem[];
  onViewToken: (token: TokenItem) => void;
  onViewAll: () => void;
}

const StatusCardExpandedSection: React.FC<StatusCardExpandedSectionProps> = ({
  tokens,
  onViewToken,
  onViewAll
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  // Use virtual scrolling for large lists
  const rowVirtualizer = useVirtualizer({
    count: Math.min(tokens.length, 5), // Show max 5 tokens in preview
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated height of each token row
    overscan: 2
  });

  if (tokens.length === 0) {
    return (
      <div className="bg-white/80 p-3 border-t">
        <div className="text-center text-sm text-muted-foreground py-4">
          No tokens with this status
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 p-3 border-t">
      <div 
        ref={parentRef}
        className="max-h-48 overflow-y-auto"
        style={{ height: '192px' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const token = tokens[virtualItem.index];
            if (!token) return null;

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
                <div 
                  className="p-2 text-sm hover:bg-gray-50 rounded cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewToken(token);
                  }}
                >
                  <div className="font-medium">{token.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {token.symbol} • {token.standard}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {tokens.length > 5 && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onViewAll();
          }}
        >
          View All {tokens.length} Tokens
        </Button>
      )}
    </div>
  );
};

export default CachedTokenStatusCards;