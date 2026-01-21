/**
 * VaultCard Component
 * 
 * Display individual vault information with deposit/withdraw actions
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  ExternalLink 
} from 'lucide-react';
import { cn } from '@/utils/utils';

interface VaultInfo {
  id: string;
  contract_address: string;
  contract_name: string;
  blockchain: string;
  network: string;
  product_id: string;
  product_type: string;
  is_active: boolean;
}

interface VaultPosition {
  shares: string;
  underlying_value: string;
  exchange_rate: string;
  total_deposited: string;
  total_withdrawn: string;
}

interface VaultCardProps {
  vault: VaultInfo;
  position?: VaultPosition;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export const VaultCard: React.FC<VaultCardProps> = ({
  vault,
  position,
  onDeposit,
  onWithdraw
}) => {
  const hasPosition = !!position;
  const currentValue = hasPosition ? parseFloat(position.underlying_value) : 0;
  const deposited = hasPosition ? parseFloat(position.total_deposited) : 0;
  const gain = currentValue - deposited;
  const gainPercent = deposited > 0 ? (gain / deposited) * 100 : 0;

  return (
    <Card className={cn(
      'transition-all',
      hasPosition && 'border-green-200 dark:border-green-900'
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{vault.contract_name}</CardTitle>
            <CardDescription className="text-xs">
              {vault.product_type.toUpperCase()} • {vault.network}
            </CardDescription>
          </div>
          <Badge variant={vault.is_active ? 'default' : 'secondary'}>
            {vault.is_active ? 'Active' : 'Paused'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position Info */}
        {hasPosition && position ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Shares</span>
              <span className="font-medium">
                {parseFloat(position.shares).toLocaleString('en-US', { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Value</span>
              <span className="font-medium">
                ${currentValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Deposited</span>
              <span className="font-medium">
                ${deposited.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Gain/Loss</span>
              <div className="flex items-center gap-1">
                <TrendingUp className={cn(
                  'h-3 w-3',
                  gain >= 0 ? 'text-green-600' : 'text-red-600'
                )} />
                <span className={cn(
                  'font-medium',
                  gain >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  ${gain.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  {' '}
                  ({gainPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No position in this vault
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onDeposit}
            className="w-full"
          >
            <ArrowDownToLine className="h-4 w-4 mr-1" />
            Deposit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onWithdraw}
            disabled={!hasPosition}
            className="w-full"
          >
            <ArrowUpFromLine className="h-4 w-4 mr-1" />
            Withdraw
          </Button>
        </div>

        {/* Contract Link */}
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs"
          asChild
        >
          <a
            href={`https://${vault.network === 'testnet' ? 'testnet.' : ''}blockscout.injective.network/address/${vault.contract_address}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Contract
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};
