import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Vault,
  TrendingUp,
  DollarSign,
  BarChart3
} from 'lucide-react';

interface ERC4626CardSectionProps {
  token: any;
  isExpanded: boolean;
  isLoading?: boolean;
}

const ERC4626CardSection: React.FC<ERC4626CardSectionProps> = ({
  token,
  isExpanded,
  isLoading = false
}) => {
  const properties = token.erc4626Properties || {};
  const blocks = token.blocks || {};
  
  const vaultType = properties.vaultType || blocks.vault_type || 'Yield Vault';
  const strategy = properties.vaultStrategy || blocks.vault_strategy;
  const expectedYield = properties.expectedYield || blocks.expected_yield;
  const strategyParamsCount = token.erc4626StrategyParams?.length || 0;
  const assetAllocationsCount = token.erc4626AssetAllocations?.length || 0;

  if (!isExpanded) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Vault className="h-4 w-4 text-cyan-500" />
          <span className="text-sm font-medium">{vaultType}</span>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {expectedYield && (
            <Badge variant="outline" className="text-xs bg-green-50">
              {expectedYield}% APY
            </Badge>
          )}
          {strategy && (
            <Badge variant="outline" className="text-xs">
              {strategy}
            </Badge>
          )}
          {strategyParamsCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {strategyParamsCount} Strategies
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
            <Vault className="h-4 w-4 text-cyan-500" />
            Vault Token Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Vault Type</p>
            <p className="text-base font-medium">{vaultType}</p>
          </div>
          
          {strategy && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Strategy</p>
              <p className="text-base font-medium">{strategy}</p>
            </div>
          )}
          
          {expectedYield && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Expected Yield</p>
              <Badge variant="default" className="bg-green-100 text-green-800">
                {expectedYield}% APY
              </Badge>
            </div>
          )}
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Asset Allocations</p>
            <p className="text-base font-medium">{assetAllocationsCount}</p>
          </div>
        </CardContent>
      </Card>

      {/* Fee Information */}
      {(properties.depositFee || properties.withdrawalFee || properties.performanceFee) && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-500" />
              Fee Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {properties.depositFee && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Deposit Fee</p>
                <p className="text-base font-medium">{properties.depositFee}%</p>
              </div>
            )}
            
            {properties.withdrawalFee && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Withdrawal Fee</p>
                <p className="text-base font-medium">{properties.withdrawalFee}%</p>
              </div>
            )}
            
            {properties.performanceFee && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Performance Fee</p>
                <p className="text-base font-medium">{properties.performanceFee}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {token.erc4626StrategyParams && token.erc4626StrategyParams.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Strategy Parameters ({token.erc4626StrategyParams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {token.erc4626StrategyParams.slice(0, 3).map((param: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <span className="font-medium">{param.parameterName}</span>
                  <Badge variant="outline">{param.parameterValue}</Badge>
                </div>
              ))}
              {token.erc4626StrategyParams.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{token.erc4626StrategyParams.length - 3} more parameters
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ERC4626CardSection;
