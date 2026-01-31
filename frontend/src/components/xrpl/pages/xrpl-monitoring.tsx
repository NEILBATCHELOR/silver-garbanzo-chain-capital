/**
 * XRPL Monitoring Page
 * Complete real-time monitoring dashboard for XRPL wallets
 * 
 * Features:
 * - Activity Feed: Real transaction history from blockchain
 * - WebSocket Monitor: Live transaction stream
 * - Wallet Selection: Switch between predefined or custom wallets
 * - Network Selection: Mainnet/Testnet/Devnet support
 */

import React from 'react'
import { MonitoringDashboard } from '@/components/xrpl/monitoring'
import { Activity, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function XRPLMonitoringPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          XRPL Real-Time Monitoring
        </h1>
        <p className="text-muted-foreground mt-2">
          WebSocket monitoring and activity feeds for XRPL wallets
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How to Use</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Select a wallet from the dropdown (predefined wallets included)</li>
            <li>Choose "Activity Feed" tab to view past transactions with manual refresh</li>
            <li>Choose "WebSocket Monitor" tab to watch live transactions in real-time</li>
            <li>Click "Start" on WebSocket Monitor to begin listening for new transactions</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Monitoring Dashboard */}
      <MonitoringDashboard defaultNetwork="TESTNET" />

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
        <p className="font-medium mb-2">Predefined Test Wallets:</p>
        <ul className="space-y-1">
          <li>
            <strong>Holder Wallet:</strong> rfiqYTop8o3HTDwQihFiEseDcv1CVTjoDe -{' '}
            <a
              href="https://testnet.xrpl.org/accounts/rfiqYTop8o3HTDwQihFiEseDcv1CVTjoDe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View on Explorer
            </a>
          </li>
          <li>
            <strong>Issuer Wallet:</strong> rKPaP7wmyUstMh46P4jbZq1GGh2qFgQT6h -{' '}
            <a
              href="https://testnet.xrpl.org/accounts/rKPaP7wmyUstMh46P4jbZq1GGh2qFgQT6h"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View on Explorer
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
