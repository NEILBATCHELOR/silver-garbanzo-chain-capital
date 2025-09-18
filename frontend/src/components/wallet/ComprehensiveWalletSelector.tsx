/**
 * Simplified Wallet Selection Component
 * 
 * Clean interface for connecting external wallets without clutter
 */

'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppKit } from '@reown/appkit/react'
import { useAccount } from 'wagmi'
import { 
  Wallet, 
  CheckCircle2,
  ExternalLink,
  Shield,
  Smartphone,
  Globe,
  Users
} from 'lucide-react'

export function ComprehensiveWalletSelector() {
  const { open } = useAppKit()
  const { isConnected, connector } = useAccount()

  const handleConnectWallet = () => {
    open()
  }

  return (
    <div className="space-y-6">
      {/* Quick Connect */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            External Wallet Connection
          </CardTitle>
          <CardDescription>
            Connect your existing wallet to Chain Capital
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-green-800">
                Connected with {connector?.name || 'Unknown Wallet'}
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <Button onClick={handleConnectWallet} className="w-full" size="lg">
                <Wallet className="w-4 h-4 mr-2" />
                Connect External Wallet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Native AppKit Components */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Management</CardTitle>
          <CardDescription>
            Use these components to manage your wallet connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Connect Button</label>
              <appkit-button />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Network Button</label>
              <appkit-network-button />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Button</label>
              <appkit-account-button />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Wallet,
                title: '300+ Wallets Supported',
                description: 'Compatible with all major wallet providers'
              },
              {
                icon: Shield,
                title: 'Secure Connections',
                description: 'Industry-standard security with WalletConnect'
              },
              {
                icon: Users,
                title: 'Social Logins',
                description: 'Connect with Google, GitHub, Discord, and more'
              },
              {
                icon: Smartphone,
                title: 'Mobile Optimized',
                description: 'Seamless experience on mobile devices'
              },
              {
                icon: Globe,
                title: 'Multi-chain',
                description: 'Support for Ethereum, Polygon, Arbitrum, and more'
              },
              {
                icon: ExternalLink,
                title: 'DApp Ready',
                description: 'Full integration with decentralized applications'
              }
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <feature.icon className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h4 className="font-medium">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}