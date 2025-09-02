import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { 
  TokenCardData,
  TokenDetailData,
  getTokenDetailData
} from '../services/token-card-service';
import { 
  getStandardConfig, 
  getStatusBorderColor
} from './utils/token-display-utils';

// Import shared components
import TokenHeader from './shared/TokenHeader';
import TokenActions from './shared/TokenActions';
import TokenMetadata from './shared/TokenMetadata';

// Import optimized data section components
import ERC20CardSection from './data-sections/ERC20CardSection';
import ERC721CardSection from './data-sections/ERC721CardSection';
import ERC1155CardSection from './data-sections/ERC1155CardSection';
import ERC1400CardSection from './data-sections/ERC1400CardSection';
import ERC3525CardSection from './data-sections/ERC3525CardSection';
import ERC4626CardSection from './data-sections/ERC4626CardSection';

/**
 * Helper function to format token supply correctly
 */
const getFormattedSupply = (token: TokenCardData): string => {
  // For NFT standards, supply might not be relevant or is handled differently
  if (token.standard === 'ERC-721') {
    // NFTs typically don't have a traditional "supply" - they have max supply or are unlimited
    return 'NFT Collection';
  }
  
  // Check total_supply first (main token table)
  let supply = token.total_supply;
  
  // If total_supply is empty/null, try to get from properties for ERC-20
  if ((!supply || supply.trim() === '') && token.standard === 'ERC-20') {
    // Note: We don't have access to properties here in card view, 
    // but total_supply should be populated from the service
    supply = undefined;
  }
  
  // Handle empty or invalid supply
  if (!supply || supply.trim() === '' || supply === '0') {
    if (token.standard === 'ERC-1155') {
      return 'Multi-Token';
    }
    return 'Not Set';
  }
  
  // Parse and format the supply number
  try {
    const supplyNumber = parseFloat(supply);
    if (isNaN(supplyNumber)) {
      return 'Invalid';
    }
    
    // Format large numbers with appropriate suffixes
    if (supplyNumber >= 1e12) {
      return `${(supplyNumber / 1e12).toFixed(1)}T`;
    } else if (supplyNumber >= 1e9) {
      return `${(supplyNumber / 1e9).toFixed(1)}B`;
    } else if (supplyNumber >= 1e6) {
      return `${(supplyNumber / 1e6).toFixed(1)}M`;
    } else if (supplyNumber >= 1e3) {
      return `${(supplyNumber / 1e3).toFixed(1)}K`;
    }
    
    return supplyNumber.toLocaleString();
  } catch (error) {
    console.warn('Error formatting supply for token:', token.id, error);
    return 'Error';
  }
};

interface OptimizedTokenCardProps {
  token: TokenCardData;
  onView?: (token: TokenCardData) => void;
  onEdit?: (token: TokenCardData) => void;
  onDeploy?: (token: TokenCardData) => void;
  onDelete?: (token: TokenCardData) => void;
  onUpdateStatus?: (token: TokenCardData) => void;
  className?: string;
  defaultExpanded?: boolean;
}

const OptimizedTokenCard: React.FC<OptimizedTokenCardProps> = ({
  token,
  onView,
  onEdit,
  onDeploy,
  onDelete,
  onUpdateStatus,
  className = '',
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [detailData, setDetailData] = useState<TokenDetailData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [hasLoadedDetails, setHasLoadedDetails] = useState(false);
  
  // Get standard-specific configuration
  const standardConfig = getStandardConfig(token.standard);
  const statusBorderColor = getStatusBorderColor(token.status);
  
  // Handle card expansion with progressive loading
  const handleToggleExpand = useCallback(async () => {
    if (!isExpanded) {
      // Expanding - load detailed data if not already loaded
      if (!hasLoadedDetails && !isLoadingDetails) {
        setIsLoadingDetails(true);
        try {
          const details = await getTokenDetailData(token.id, token.standard);
          if (details) {
            setDetailData(details);
            setHasLoadedDetails(true);
          }
        } catch (error) {
          console.error('Failed to load token details:', error);
        } finally {
          setIsLoadingDetails(false);
        }
      }
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded, hasLoadedDetails, isLoadingDetails, token.id, token.standard]);

  // Get the appropriate data section component
  const getDataSection = () => {
    const dataToUse = hasLoadedDetails && detailData ? detailData : token;
    const commonProps = { 
      token: dataToUse, 
      isExpanded,
      isLoading: isLoadingDetails 
    };
    
    switch (token.standard) {
      case 'ERC-20':
        return <ERC20CardSection {...commonProps} />;
      case 'ERC-721':
        return <ERC721CardSection {...commonProps} />;
      case 'ERC-1155':
        return <ERC1155CardSection {...commonProps} />;
      case 'ERC-1400':
        return <ERC1400CardSection {...commonProps} />;
      case 'ERC-3525':
        return <ERC3525CardSection {...commonProps} />;
      case 'ERC-4626':
        return <ERC4626CardSection {...commonProps} />;
      default:
        return (
          <div className="text-center py-4 text-muted-foreground">
            <p>Unsupported token standard: {token.standard}</p>
          </div>
        );
    }
  };

  return (
    <Card 
      className={`
        ${className}
        ${standardConfig.bgGradient}
        ${standardConfig.borderColor}
        ${standardConfig.hoverShadow}
        ${statusBorderColor}
        border-l-4
        transition-all duration-200 hover:shadow-lg
        ${isExpanded ? 'min-h-fit' : 'h-fit'}
      `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <TokenHeader
              name={token.name}
              symbol={token.symbol}
              standard={token.standard}
              status={token.status}
              blockchain={token.blockchain}
              configMode={token.config_mode as "min" | "max" | "basic" | "advanced"}
              tokenTier={token.metadata?.tokenTier}
              address={token.address}
              showDeployedIndicator={true}
              compact={!isExpanded}
            />
          </div>
          
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpand}
            className="ml-2 flex-shrink-0"
            disabled={isLoadingDetails}
          >
            {isLoadingDetails ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Always show basic info in collapsed mode */}
        <div className="space-y-2">
          {/* Basic token information - always visible */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Decimals:</span>
              <span className="ml-2 font-medium">{token.decimals || '18'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Supply:</span>
              <span className="ml-2 font-medium">
                {getFormattedSupply(token)}
              </span>
            </div>
          </div>
          
          {/* Show deployed address if available */}
          {token.address && (
            <div className="text-sm">
              <span className="text-muted-foreground">Address:</span>
              <span className="ml-2 font-mono text-xs break-all">
                {token.address}
              </span>
            </div>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="space-y-4 border-t pt-4">
            {/* Data Section - Standard-specific content */}
            <div className="space-y-3">
              {getDataSection()}
            </div>

            {/* Metadata Section */}
            <TokenMetadata
              createdAt={token.created_at}
              updatedAt={token.updated_at}
              projectId={token.project_id}
              compact={false}
            />

            {/* Actions Section */}
            <TokenActions
              token={{
                ...token,
                // Convert to UnifiedTokenData format for compatibility
                project_id: token.project_id || '', // Ensure project_id is always present
                config_mode: token.config_mode as "min" | "max" | "basic" | "advanced",
                blocks: {},
                metadata: token.metadata,
                erc20Properties: hasLoadedDetails ? detailData?.erc20Properties : undefined,
                erc721Properties: hasLoadedDetails ? detailData?.erc721Properties : undefined,
                erc1155Properties: hasLoadedDetails ? detailData?.erc1155Properties : undefined,
                erc1400Properties: hasLoadedDetails ? detailData?.erc1400Properties : undefined,
                erc3525Properties: hasLoadedDetails ? detailData?.erc3525Properties : undefined,
                erc4626Properties: hasLoadedDetails ? detailData?.erc4626Properties : undefined,
              }}
              onView={onView ? (unifiedToken) => onView(token) : undefined}
              onEdit={onEdit ? (unifiedToken) => onEdit(token) : undefined}
              onDeploy={onDeploy ? (unifiedToken) => onDeploy(token) : undefined}
              onDelete={onDelete ? (unifiedToken) => onDelete(token) : undefined}
              onUpdateStatus={onUpdateStatus ? (unifiedToken) => onUpdateStatus(token) : undefined}
              layout="horizontal"
              compact={false}
            />
          </div>
        )}
        
        {/* Collapsed actions - minimal set */}
        {!isExpanded && (
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView?.(token);
              }}
            >
              View
            </Button>
            {token.status !== 'DEPLOYED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(token);
                }}
              >
                Edit
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OptimizedTokenCard;
