/**
 * Safe Connect Wallet Button
 * 
 * This component prevents automatic wallet connections and only triggers 
 * connections when the user explicitly clicks the button.
 * 
 * Fixes EIP-1193 error code 4001 by ensuring user-initiated connections only.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { 
  useEnhancedWalletManager, 
  WalletType, 
  WalletConnectionStatus 
} from '@/hooks/wallet/useEnhancedWalletManager';

interface SafeConnectWalletButtonProps {
  walletType?: WalletType;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export function SafeConnectWalletButton({
  walletType = WalletType.METAMASK,
  variant = 'default',
  size = 'default',
  className,
  children
}: SafeConnectWalletButtonProps) {
  const { 
    connection, 
    connectWallet, 
    disconnectWallet, 
    isConnecting 
  } = useEnhancedWalletManager();

  /**
   * Handle wallet connection with explicit user initiation
   */
  const handleConnect = async () => {
    // CRITICAL: Always pass userInitiated=true for button clicks
    await connectWallet(walletType, true);
  };

  /**
   * Handle wallet disconnection
   */
  const handleDisconnect = async () => {
    await disconnectWallet();
  };

  // Show loading state during connection
  if (isConnecting) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        className={className}
        disabled
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Connecting...
      </Button>
    );
  }

  // Show connected state with address
  if (connection.status === WalletConnectionStatus.CONNECTED && connection.address) {
    const shortAddress = `${connection.address.slice(0, 6)}...${connection.address.slice(-4)}`;
    
    return (
      <Button 
        variant="outline" 
        size={size} 
        className={className}
        onClick={handleDisconnect}
      >
        <Wallet className="w-4 h-4 mr-2" />
        {shortAddress}
      </Button>
    );
  }

  // Show error state
  if (connection.status === WalletConnectionStatus.ERROR) {
    return (
      <Button 
        variant="destructive" 
        size={size} 
        className={className}
        onClick={handleConnect}
      >
        <AlertCircle className="w-4 h-4 mr-2" />
        Retry Connection
      </Button>
    );
  }

  // Show user rejected state (less prominent - this is normal)
  if (connection.status === WalletConnectionStatus.USER_REJECTED) {
    return (
      <Button 
        variant="outline" 
        size={size} 
        className={className}
        onClick={handleConnect}
      >
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </Button>
    );
  }

  // Default: Show connect button
  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={handleConnect}
    >
      <Wallet className="w-4 h-4 mr-2" />
      {children || `Connect ${walletType}`}
    </Button>
  );
}

export default SafeConnectWalletButton;
