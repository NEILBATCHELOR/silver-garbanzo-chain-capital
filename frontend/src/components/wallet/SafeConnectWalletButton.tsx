/**
 * Safe Connect Wallet Button Component
 * 
 * This wrapper safely handles wallet connection when AppKit is not available.
 * Falls back to basic functionality without breaking the app.
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useAccount, useDisconnect } from 'wagmi'
import { Wallet, LogOut, AlertTriangle } from 'lucide-react'

interface SafeConnectWalletButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showIcon?: boolean
  connectText?: string
  disconnectText?: string
}

// Check if AppKit is available
function isAppKitAvailable(): boolean {
  try {
    // Check if the AppKit context exists
    const projectId = import.meta.env.VITE_PUBLIC_PROJECT_ID
    return !!projectId
  } catch {
    return false
  }
}

export function SafeConnectWalletButton({
  variant = 'default',
  size = 'default',
  className = '',
  showIcon = true,
  connectText = 'Connect Wallet',
  disconnectText = 'Disconnect',
}: SafeConnectWalletButtonProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const appKitAvailable = isAppKitAvailable()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleConnect = () => {
    if (appKitAvailable) {
      // When AppKit is available, we would normally call open()
      // For now, show a message that wallet connection is temporarily disabled
      console.log('Wallet connection temporarily disabled - AppKit not initialized')
    } else {
      console.log('AppKit not available - please configure wallet connection')
    }
  }

  if (isConnected && address) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => disconnect()}
      >
        {showIcon && <LogOut className="w-4 h-4 mr-2" />}
        {formatAddress(address)}
      </Button>
    )
  }

  return (
    <Button
      variant={variant === 'default' ? 'outline' : variant}
      size={size}
      className={className}
      onClick={handleConnect}
      disabled={!appKitAvailable}
    >
      {showIcon && (
        appKitAvailable ? 
          <Wallet className="w-4 h-4 mr-2" /> : 
          <AlertTriangle className="w-4 h-4 mr-2" />
      )}
      {appKitAvailable ? connectText : 'Wallet Setup Required'}
    </Button>
  )
}

// Safe version of WalletAccount component
export function SafeWalletAccount() {
  const { address, isConnected } = useAccount()

  if (!isConnected || !address) {
    return (
      <SafeConnectWalletButton 
        variant="outline" 
        connectText="Connect to get started"
      />
    )
  }

  return (
    <Button
      variant="outline"
      disabled
      className="flex items-center gap-2"
    >
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      {address.slice(0, 6)}...{address.slice(-4)}
    </Button>
  )
}

// Safe network selector (disabled when AppKit not available)
export function SafeNetworkSelector() {
  const appKitAvailable = isAppKitAvailable()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={!appKitAvailable}
    >
      Networks
    </Button>
  )
}

export default SafeConnectWalletButton;
