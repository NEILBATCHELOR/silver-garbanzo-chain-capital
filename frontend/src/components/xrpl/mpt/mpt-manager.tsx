/**
 * MPT Management Component
 * 
 * Provides UI for managing existing MPT issuances:
 * - Lock/Unlock tokens (globally or per holder)
 * - Destroy issuance (if no holders exist)
 * - View issuance details
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Lock, Unlock, Trash2, AlertTriangle } from 'lucide-react'
import { XRPLMPTService } from '@/services/wallet/ripple/mpt/XRPLMPTService'
import type { Wallet } from 'xrpl'

interface MPTManagerProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  mptIssuanceId: string
  onSuccess?: () => void
}

export const MPTManager: React.FC<MPTManagerProps> = ({
  wallet,
  network = 'TESTNET',
  projectId,
  mptIssuanceId,
  onSuccess
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showDestroyDialog, setShowDestroyDialog] = useState(false)
  const [eligibility, setEligibility] = useState<{
    canDestroy: boolean
    outstandingAmount: string
    holdersCount: number
    obligations: string[]
  } | null>(null)
  
  // Lock/Unlock state
  const [lockAction, setLockAction] = useState<'lock' | 'unlock'>('lock')
  const [holderAddress, setHolderAddress] = useState('')
  const [applyToAllHolders, setApplyToAllHolders] = useState(true)

  const checkEligibility = async () => {
    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)
      const result = await mptService.checkDestructionEligibility({
        mptIssuanceId
      })
      setEligibility(result)
      setShowDestroyDialog(true)
    } catch (error) {
      console.error('Failed to check eligibility:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to check destruction eligibility',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLockUnlock = async () => {
    if (!applyToAllHolders && !holderAddress) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a holder address or select "Apply to all holders"',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)

      await mptService.updateMPTIssuance({
        projectId,
        issuerWallet: wallet,
        mptIssuanceId,
        lock: lockAction === 'lock',
        unlock: lockAction === 'unlock',
        holderAddress: applyToAllHolders ? undefined : holderAddress
      })

      toast({
        title: `MPT ${lockAction === 'lock' ? 'Locked' : 'Unlocked'} Successfully`,
        description: applyToAllHolders 
          ? `All holders have been ${lockAction === 'lock' ? 'locked' : 'unlocked'}`
          : `Holder ${holderAddress} has been ${lockAction === 'lock' ? 'locked' : 'unlocked'}`
      })

      onSuccess?.()
      setHolderAddress('')
    } catch (error) {
      console.error('Failed to update MPT:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update MPT',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDestroy = async () => {
    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)

      await mptService.destroyMPTIssuance({
        projectId,
        issuerWallet: wallet,
        mptIssuanceId
      })

      toast({
        title: 'MPT Issuance Destroyed',
        description: 'The MPT issuance has been permanently destroyed'
      })

      setShowDestroyDialog(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to destroy MPT:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to destroy MPT issuance',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Lock/Unlock Section */}
      <Card>
        <CardHeader>
          <CardTitle>Lock/Unlock Tokens</CardTitle>
          <CardDescription>
            Control whether tokens can be used in transactions (except sending back to issuer)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Label className="flex-1">Action</Label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={lockAction === 'lock' ? 'default' : 'outline'}
                onClick={() => setLockAction('lock')}
                disabled={loading}
              >
                <Lock className="mr-2 h-4 w-4" />
                Lock
              </Button>
              <Button
                type="button"
                variant={lockAction === 'unlock' ? 'default' : 'outline'}
                onClick={() => setLockAction('unlock')}
                disabled={loading}
              >
                <Unlock className="mr-2 h-4 w-4" />
                Unlock
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Apply to all holders</Label>
              <p className="text-sm text-muted-foreground">
                {lockAction === 'lock' ? 'Lock' : 'Unlock'} tokens for all holders
              </p>
            </div>
            <Switch
              checked={applyToAllHolders}
              onCheckedChange={setApplyToAllHolders}
              disabled={loading}
            />
          </div>

          {!applyToAllHolders && (
            <div className="space-y-2">
              <Label htmlFor="holderAddress">Holder Address</Label>
              <Input
                id="holderAddress"
                placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3wgC4j8S"
                value={holderAddress}
                onChange={(e) => setHolderAddress(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <Button
            onClick={handleLockUnlock}
            disabled={loading || (!applyToAllHolders && !holderAddress)}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {lockAction === 'lock' ? <Lock className="mr-2 h-4 w-4" /> : <Unlock className="mr-2 h-4 w-4" />}
                {lockAction === 'lock' ? 'Lock Tokens' : 'Unlock Tokens'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Destroy Section */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Destroy Issuance</CardTitle>
          <CardDescription>
            Permanently destroy this MPT issuance. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            disabled={loading}
            className="w-full"
            onClick={checkEligibility}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Destroy MPT Issuance
              </>
            )}
          </Button>

          <AlertDialog open={showDestroyDialog} onOpenChange={setShowDestroyDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  {eligibility?.canDestroy ? (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  )}
                  {eligibility?.canDestroy ? 'Destroy MPT Issuance?' : 'Cannot Destroy MPT Issuance'}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    {eligibility?.canDestroy ? (
                      <>
                        <div>
                          This will permanently destroy the MPT issuance. This action cannot be undone.
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          Issuance ID: {mptIssuanceId}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          This MPT issuance cannot be destroyed because it has outstanding obligations:
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-md space-y-2">
                          <div className="font-semibold text-orange-900 dark:text-orange-100">
                            Outstanding Obligations:
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-sm text-orange-800 dark:text-orange-200">
                            {eligibility?.obligations.map((obligation, index) => (
                              <li key={index}>{obligation}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-sm">
                          <div className="font-semibold mb-1">To destroy this issuance:</div>
                          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                            <li>All holders must send their tokens back to the issuer (burning them)</li>
                            <li>All holders must delete their MPToken entries using MPTokenAuthorize with tfMPTUnauthorize flag</li>
                            <li>Outstanding amount must be exactly 0</li>
                          </ol>
                        </div>
                      </>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>
                  {eligibility?.canDestroy ? 'Cancel' : 'Close'}
                </AlertDialogCancel>
                {eligibility?.canDestroy && (
                  <AlertDialogAction
                    onClick={handleDestroy}
                    disabled={loading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Destroying...
                      </>
                    ) : (
                      'Destroy Permanently'
                    )}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
