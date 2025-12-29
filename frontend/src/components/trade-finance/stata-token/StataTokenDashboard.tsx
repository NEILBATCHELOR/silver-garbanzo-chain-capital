import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useStataTokens,
  useStataTokenAPR,
} from '@/hooks/trade-finance';
import { formatUnits } from 'viem';
import { useState } from 'react';
import { TrendingUp, Coins, Lock, Unlock } from 'lucide-react';
import { cn } from '@/utils/utils';
import { WrapUnwrapModal } from './WrapUnwrapModal';

interface StataTokenDashboardProps {
  className?: string;
  chainId?: number;
}

export function StataTokenDashboard({ className, chainId }: StataTokenDashboardProps) {
  const { data: stataTokens, isLoading, error } = useStataTokens(chainId);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'wrap' | 'unwrap'>('wrap');
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            StataTokens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Error Loading StataTokens</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load StataTokens. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleWrap = (tokenAddress: string) => {
    setSelectedToken(tokenAddress);
    setModalMode('wrap');
    setIsModalOpen(true);
  };

  const handleUnwrap = (tokenAddress: string) => {
    setSelectedToken(tokenAddress);
    setModalMode('unwrap');
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              StataTokens - Auto-Compounding Wrapped Tokens
            </span>
            <Badge variant="outline">
              {stataTokens?.length || 0} Tokens
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stataTokens && stataTokens.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stataTokens.map((token) => (
                <StataTokenCard
                  key={token.id}
                  token={token}
                  onWrap={handleWrap}
                  onUnwrap={handleUnwrap}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No StataTokens Available</p>
              <p className="text-sm text-muted-foreground mt-2">
                StataTokens will appear here once deployed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedToken && (
        <WrapUnwrapModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          stataTokenAddress={selectedToken}
          mode={modalMode}
        />
      )}
    </>
  );
}

// ============ StataToken Card Component ============

interface StataTokenCardProps {
  token: {
    stata_token_address: string;
    name: string;
    symbol: string;
    commodity_type: string;
    total_assets: string;
    total_shares: string;
    is_paused: boolean;
  };
  onWrap: (tokenAddress: string) => void;
  onUnwrap: (tokenAddress: string) => void;
}

function StataTokenCard({ token, onWrap, onUnwrap }: StataTokenCardProps) {
  const { data: apr, isLoading: aprLoading } = useStataTokenAPR(token.stata_token_address);

  const totalAssetsFormatted = formatUnits(BigInt(token.total_assets || '0'), 18);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{token.symbol}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{token.name}</p>
          </div>
          {token.is_paused ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Paused
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Unlock className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Commodity Type */}
        <div>
          <Badge variant="secondary">{token.commodity_type}</Badge>
        </div>

        {/* APR Display */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-green-600" />
            APR
          </span>
          {aprLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <span className="text-lg font-bold text-green-600">
              {apr?.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Total Value Locked */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total Value Locked</p>
          <p className="text-lg font-bold">
            {Number(totalAssetsFormatted).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })} cTokens
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => onWrap(token.stata_token_address)}
            disabled={token.is_paused}
          >
            Wrap
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUnwrap(token.stata_token_address)}
            disabled={token.is_paused}
          >
            Unwrap
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
