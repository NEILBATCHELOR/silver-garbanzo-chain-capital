/**
 * Wallet Connect Button
 * 
 * Button to connect/disconnect wallet using AppKit
 * Updated to use official Reown AppKit API with enhanced dropdown UI
 */

import React from 'react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/utils';

interface WalletConnectButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function WalletConnectButton({
  variant = 'default',
  size = 'default',
  className,
}: WalletConnectButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { disconnect } = useDisconnect();

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    );
  }

  // Show connected state with dropdown
  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} className={cn('gap-2', className)}>
            <Wallet className="h-4 w-4" />
            <span className="font-mono">{formatAddress(address)}</span>
            {chain && (
              <Badge variant="outline" className="ml-2">
                {chain.name}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Connected Wallet</span>
              <span className="font-mono text-sm">{formatAddress(address)}</span>
            </div>
          </DropdownMenuLabel>
          {chain && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Network: {chain.name}
              </DropdownMenuLabel>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => open({ view: 'Account' })}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Account Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => open({ view: 'Networks' })}
          >
            <Badge className="mr-2 h-4 w-4" />
            Switch Network
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => disconnect()}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Show connect button
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => open()}
    >
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
