/**
 * XRPL Multi-Signature Page
 * Main page for XRPL multi-sig account management
 */

import React from 'react'
import { useParams } from 'react-router-dom'
import type { Wallet } from 'xrpl'
import { XRPLMultiSigManager } from '../multisig'
import { XRPLDashboardHeader } from '../shared/xrpl-dashboard-header'
import { XRPLBreadcrumb } from '../shared/xrpl-navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield } from 'lucide-react'

interface XRPLMultiSigPageProps {
  wallet?: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function XRPLMultiSigPage({ wallet, network, projectId: propsProjectId }: XRPLMultiSigPageProps = {}) {
  const { projectId: paramsProjectId } = useParams<{ projectId: string }>()
  
  // Use props projectId if provided, otherwise use params
  const projectId = propsProjectId || paramsProjectId
  
  // Get wallet address from wallet if provided
  const walletAddress = wallet?.address || ''

  if (!projectId) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Project ID is required for multi-signature management.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <XRPLBreadcrumb currentPage="Multi-Sig" />
      <XRPLDashboardHeader
        title="Multi-Signature Accounts"
        subtitle="Manage XRPL multi-signature accounts with multiple authorized signers"
        projectId={projectId}
        walletAddress={walletAddress}
      />

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="h-5 w-5 text-primary mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold">About XRPL Multi-Signature</h3>
              <p className="text-sm text-muted-foreground">
                Multi-signature accounts on XRPL require multiple authorized signers to approve
                transactions. Each signer has a weight, and transactions require signatures with
                a combined weight meeting or exceeding the configured quorum.
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Enterprise-grade security for high-value accounts</li>
                <li>Flexible weight-based authorization system</li>
                <li>Support for up to 8 signers per account</li>
                <li>Compatible with all XRPL transaction types</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Sig Manager */}
      <XRPLMultiSigManager
        projectId={projectId}
        walletAddress={walletAddress}
        defaultTab="transactions"
      />
    </div>
  )
}

export default XRPLMultiSigPage
