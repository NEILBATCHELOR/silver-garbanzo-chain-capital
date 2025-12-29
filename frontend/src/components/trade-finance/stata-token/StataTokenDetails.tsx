/**
 * StataTokenDetails Component
 * Detailed statistics and information for a specific StataToken
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useStataToken,
  useStataTokenStats,
  useStataTokenAPR,
  useUserStataOperations,
} from '@/hooks/trade-finance';
import { formatUnits, formatEther } from 'viem';
import { useState } from 'react';
import {
  TrendingUp,
  Coins,
  Users,
  Activity,
  AlertCircle,
  ExternalLink,
  Clock,
  Lock,
  Unlock,
} from 'lucide-react';
import { cn } from '@/utils/utils';
import { WrapUnwrapModal } from './WrapUnwrapModal';

interface StataTokenDetailsProps {
  stataTokenAddress: string;
  className?: string;
}

export function StataTokenDetails({
  stataTokenAddress,
  className,
}: StataTokenDetailsProps) {
  const [isWrapModalOpen, setIsWrapModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'wrap' | 'unwrap'>('wrap');

  const { data: stataToken, isLoading, error } = useStataToken(stataTokenAddress);
  const { data: stats } = useStataTokenStats(stataTokenAddress);
  const { data: apr } = useStataTokenAPR(stataTokenAddress);
  const { data: userOperations } = useUserStataOperations(10, 0);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !stataToken) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Error Loading StataToken</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load StataToken details. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalAssetsFormatted = formatUnits(BigInt(stataToken.total_assets || '0'), 18);
  const totalSharesFormatted = formatUnits(BigInt(stataToken.total_shares || '0'), 18);
  const sharePrice = BigInt(stataToken.total_shares) > BigInt(0)
    ? (BigInt(stataToken.total_assets) * BigInt(10 ** 18)) / BigInt(stataToken.total_shares)
    : BigInt(10 ** 18);
  const sharePriceFormatted = formatUnits(sharePrice, 18);

  const handleWrap = () => {
    setModalMode('wrap');
    setIsWrapModalOpen(true);
  };

  const handleUnwrap = () => {
    setModalMode('unwrap');
    setIsWrapModalOpen(true);
  };

  return (
    <>
      <div className={cn('space-y-6', className)}>
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{stataToken.symbol}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {stataToken.name}
                </p>
              </div>
              <div className="flex gap-2">
                {stataToken.is_paused ? (
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
                <Badge variant="secondary">{stataToken.commodity_type}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stataToken.is_paused && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This StataToken is currently paused. Wrap/unwrap operations are disabled.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleWrap}
                disabled={stataToken.is_paused}
                className="flex-1"
              >
                <Coins className="mr-2 h-4 w-4" />
                Wrap cTokens
              </Button>
              <Button
                onClick={handleUnwrap}
                disabled={stataToken.is_paused}
                variant="outline"
                className="flex-1"
              >
                <Coins className="mr-2 h-4 w-4" />
                Unwrap to cTokens
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* APR Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Current APR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {apr !== undefined ? `${apr.toFixed(2)}%` : 'Loading...'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Auto-compounding yield
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Assets Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Coins className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {parseFloat(totalAssetsFormatted).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    cTokens locked
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Share Price Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Share Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {parseFloat(sharePriceFormatted).toFixed(6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    cTokens per share
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Shares Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {parseFloat(totalSharesFormatted).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    StataToken shares
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deployment Date Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Deployed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-8 w-8 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">
                    {new Date(stataToken.deployed_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(stataToken.deployed_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chain Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Network</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold">{stataToken.chain_id}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Chain ID</p>
                  <p className="text-xs text-muted-foreground">
                    {stataToken.chain_id === 1
                      ? 'Ethereum Mainnet'
                      : `Chain ${stataToken.chain_id}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contract Addresses */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">StataToken</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {stataToken.stata_token_address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://etherscan.io/address/${stataToken.stata_token_address}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-1">Underlying cToken</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {stataToken.ctoken_address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://etherscan.io/address/${stataToken.ctoken_address}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-1">Commodity Asset</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {stataToken.underlying_address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://etherscan.io/address/${stataToken.underlying_address}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Operations */}
        {userOperations && userOperations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Recent Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {userOperations.slice(0, 5).map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={op.operation_type === 'wrap' ? 'default' : 'secondary'}>
                        {op.operation_type}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {formatUnits(BigInt(op.assets_amount), 18)} cTokens
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(op.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://etherscan.io/tx/${op.transaction_hash}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Wrap/Unwrap Modal */}
      <WrapUnwrapModal
        isOpen={isWrapModalOpen}
        onClose={() => setIsWrapModalOpen(false)}
        stataTokenAddress={stataTokenAddress}
        mode={modalMode}
      />
    </>
  );
}
