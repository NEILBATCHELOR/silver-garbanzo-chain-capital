/**
 * MPT Dashboard Component
 * 
 * Displays list of MPT issuances for a project and provides management interface
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { XRPLMPTDatabaseService, type MPTIssuanceRecord } from '@/services/wallet/ripple/mpt/XRPLMPTDatabaseService'
import { XRPLMPTService } from '@/services/wallet/ripple/mpt/XRPLMPTService'
import { MPTManager } from './mpt-manager'
import { MPTUpdater } from './mpt-updater'
import { MPTAuthorizer } from './mpt-authorizer'
import { MPTIssuer } from './mpt-issuer'
import { MPTHolders } from './mpt-holders'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Wallet } from 'xrpl'

interface MPTDashboardProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  onCreateNew?: () => void
}

export const MPTDashboard: React.FC<MPTDashboardProps> = ({
  wallet,
  network = 'TESTNET',
  projectId,
  onCreateNew
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [issuances, setIssuances] = useState<MPTIssuanceRecord[]>([])
  const [selectedIssuance, setSelectedIssuance] = useState<MPTIssuanceRecord | null>(null)
  const [holderBalance, setHolderBalance] = useState<string>('0')
  const [loadingBalance, setLoadingBalance] = useState(false)

  const loadIssuances = async (showToast = false) => {
    setLoading(true)
    try {
      const data = await XRPLMPTDatabaseService.getIssuances(projectId)
      setIssuances(data)
      
      // CRITICAL FIX: Update selectedIssuance with fresh data from database
      // Without this, the UI shows stale outstanding_amount even though DB is updated
      if (selectedIssuance) {
        const updatedSelected = data.find(i => i.issuance_id === selectedIssuance.issuance_id)
        if (updatedSelected) {
          console.log('🔄 Updating selected issuance with fresh data:', {
            old: selectedIssuance.outstanding_amount,
            new: updatedSelected.outstanding_amount
          })
          setSelectedIssuance(updatedSelected)
        }
      }
      
      if (showToast) {
        toast({
          title: 'Refreshed',
          description: 'MPT data updated from blockchain'
        })
      }
    } catch (error) {
      console.error('Failed to load MPT issuances:', error)
      toast({
        title: 'Error',
        description: 'Failed to load MPT issuances',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadHolderBalance = async (issuanceId: string) => {
    if (!issuanceId) return
    
    setLoadingBalance(true)
    try {
      const mptService = new XRPLMPTService(network)
      const status = await mptService.checkHolderStatus({
        holderAddress: wallet.address,
        mptIssuanceId: issuanceId
      })
      setHolderBalance(status.balance)
    } catch (error) {
      console.error('Failed to load holder balance:', error)
      setHolderBalance('0')
    } finally {
      setLoadingBalance(false)
    }
  }

  useEffect(() => {
    loadIssuances()
  }, [projectId])

  useEffect(() => {
    if (selectedIssuance) {
      loadHolderBalance(selectedIssuance.issuance_id)
    }
  }, [selectedIssuance, wallet.address])

  const handleSelectIssuance = (issuance: MPTIssuanceRecord) => {
    setSelectedIssuance(issuance)
  }

  const handleBack = () => {
    setSelectedIssuance(null)
    loadIssuances()
  }

  const handleSyncFromBlockchain = async () => {
    if (!selectedIssuance) return
    
    setSyncing(true)
    try {
      const mptService = new XRPLMPTService(network)
      const result = await mptService.syncIssuanceFromBlockchain({
        projectId,
        mptIssuanceId: selectedIssuance.issuance_id
      })

      toast({
        title: 'Synced from Blockchain',
        description: `Outstanding: ${result.outstandingAmount} | Holders updated: ${result.holdersUpdated}`
      })

      // Reload data to show updated values
      await loadIssuances()
      await loadHolderBalance(selectedIssuance.issuance_id)
    } catch (error) {
      console.error('Failed to sync from blockchain:', error)
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync from blockchain',
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
    }
  }

  const isIssuer = selectedIssuance?.issuer_address === wallet.address

  const getExplorerUrl = (issuanceId: string) => {
    const explorers: Record<string, string> = {
      MAINNET: 'https://xrpl.org',
      TESTNET: 'https://testnet.xrpl.org',
      DEVNET: 'https://devnet.xrpl.org'
    }
    const baseUrl = explorers[network] || explorers.TESTNET
    return `${baseUrl}/mpt/${issuanceId}`
  }

  if (selectedIssuance) {
    const tabCount = isIssuer ? 4 : 3
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{selectedIssuance.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{selectedIssuance.ticker}</span>
              <span>•</span>
              <span className="font-mono text-xs">{selectedIssuance.issuance_id}</span>
              <a 
                href={getExplorerUrl(selectedIssuance.issuance_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                View on Explorer
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSyncFromBlockchain}
              disabled={syncing || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from Blockchain'}
            </Button>
            <Button variant="outline" onClick={handleBack}>
              Back to List
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedIssuance.outstanding_amount || '0'}
              </div>
              <p className="text-xs text-muted-foreground">tokens issued</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Max Supply</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedIssuance.maximum_amount || 'Unlimited'}
              </div>
              <p className="text-xs text-muted-foreground">maximum tokens</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBalance ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {holderBalance}
                  </div>
                  <p className="text-xs text-muted-foreground">tokens held</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={selectedIssuance.status === 'active' ? 'default' : 'secondary'}>
                {selectedIssuance.status || 'active'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {isIssuer ? 'Issuer' : 'Holder'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tokens" className="w-full">
          <TabsList className={`grid w-full grid-cols-${tabCount}`}>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="holders">Holders</TabsTrigger>
            <TabsTrigger value="authorize">Authorization</TabsTrigger>
            {isIssuer && <TabsTrigger value="manage">Manager</TabsTrigger>}
          </TabsList>

          <TabsContent value="tokens" className="mt-4">
            <MPTIssuer
              wallet={wallet}
              network={network}
              projectId={projectId}
              mptIssuanceId={selectedIssuance.issuance_id}
              isIssuer={isIssuer}
              canClawback={selectedIssuance.can_clawback}
              onSuccess={async () => {
                console.log('🔄 Token operation completed, refreshing from blockchain...')
                // Wait for blockchain validation (4s) + buffer (1s) = 5s total
                // This ensures the transaction is in a validated ledger before we query
                await new Promise(resolve => setTimeout(resolve, 5000))
                console.log('📥 Reloading data from database...')
                await loadIssuances(true)
                await loadHolderBalance(selectedIssuance.issuance_id)
                console.log('✅ Refresh complete!')
              }}
            />
          </TabsContent>

          <TabsContent value="holders" className="mt-4">
            <MPTHolders
              mptIssuanceId={selectedIssuance.issuance_id}
              network={network}
            />
          </TabsContent>

          <TabsContent value="authorize" className="mt-4">
            <MPTAuthorizer
              wallet={wallet}
              network={network}
              projectId={projectId}
              mptIssuanceId={selectedIssuance.issuance_id}
              isIssuer={isIssuer}
              onSuccess={async () => {
                console.log('🔄 Authorization operation completed, refreshing from blockchain...')
                // Wait for blockchain validation (4s) + buffer (1s) = 5s total
                await new Promise(resolve => setTimeout(resolve, 5000))
                console.log('📥 Reloading data from database...')
                await loadIssuances(true)
                await loadHolderBalance(selectedIssuance.issuance_id)
                console.log('✅ Refresh complete!')
              }}
            />
          </TabsContent>

          {isIssuer && (
            <TabsContent value="manage" className="mt-4">
              <MPTManager
                wallet={wallet}
                network={network}
                projectId={projectId}
                mptIssuanceId={selectedIssuance.issuance_id}
                onSuccess={handleBack}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (issuances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No MPT Issuances</CardTitle>
          <CardDescription>
            You haven't created any MPT issuances yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onCreateNew}>
            Create Your First MPT
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Purpose Tokens (MPT)</CardTitle>
        <CardDescription>
          Create, manage, and transfer MPT tokens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-medium">Manager</h4>
          <Button onClick={onCreateNew} size="sm">
            Create New
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Asset Class</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issuances.map((issuance) => (
              <TableRow key={issuance.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{issuance.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {issuance.ticker}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {issuance.asset_class && (
                      <Badge variant="outline" className="w-fit">
                        {issuance.asset_class}
                      </Badge>
                    )}
                    {issuance.asset_subclass && (
                      <span className="text-xs text-muted-foreground">
                        {issuance.asset_subclass}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{issuance.outstanding_amount || '0'}</TableCell>
                <TableCell>
                  <Badge 
                    variant={issuance.status === 'active' ? 'default' : 'secondary'}
                  >
                    {issuance.status || 'active'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectIssuance(issuance)}
                  >
                    Manage
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}