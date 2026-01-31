/**
 * MPT Updater Component
 * 
 * Comprehensive UI for MPTokenIssuanceSet operations:
 * - Lock/Unlock tokens globally or for specific holders
 * - Set/Remove permissioned domains (requires requireAuth)
 * 
 * Following XRPL MPTokenIssuanceSet transaction specification
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Lock, Unlock, Shield, AlertCircle, Info } from 'lucide-react'
import { XRPLMPTService } from '@/services/wallet/ripple/mpt/XRPLMPTService'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import type { Wallet } from 'xrpl'

interface MPTUpdaterProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  mptIssuanceId: string
  isIssuer?: boolean
  canLock?: boolean
  requiresAuth?: boolean
  onSuccess?: () => void
}

export const MPTUpdater: React.FC<MPTUpdaterProps> = ({
  wallet,
  network = 'TESTNET',
  projectId,
  mptIssuanceId,
  isIssuer = false,
  canLock = false,
  requiresAuth = false,
  onSuccess
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  // Lock/Unlock state
  const [lockAction, setLockAction] = useState<'lock' | 'unlock'>('lock')
  const [lockScope, setLockScope] = useState<'all' | 'holder'>('all')
  const [lockHolderAddress, setLockHolderAddress] = useState('')
  
  // Domain state
  const [domainAction, setDomainAction] = useState<'set' | 'remove'>('set')
  const [domainId, setDomainId] = useState('')

  const handleLockUnlock = async () => {
    if (lockScope === 'holder' && !lockHolderAddress) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a holder address',
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
        holderAddress: lockScope === 'holder' ? lockHolderAddress : undefined
      })

      const scopeText = lockScope === 'all' ? 'all holders' : `holder ${lockHolderAddress}`
      toast({
        title: `MPT ${lockAction === 'lock' ? 'Locked' : 'Unlocked'} Successfully`,
        description: `${lockAction === 'lock' ? 'Locked' : 'Unlocked'} ${scopeText}`
      })

      onSuccess?.()
      setLockHolderAddress('')
    } catch (error) {
      console.error('Failed to lock/unlock MPT:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to lock/unlock MPT',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDomain = async () => {
    if (domainAction === 'set' && !domainId) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a domain ID',
        variant: 'destructive'
      })
      return
    }

    // Validate domain ID format (should be 64 hex characters)
    if (domainAction === 'set' && !/^[0-9A-Fa-f]{64}$/.test(domainId)) {
      toast({
        title: 'Validation Error',
        description: 'Domain ID must be 64 hexadecimal characters (256-bit hash)',
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
        domainId: domainAction === 'remove' ? '0' : domainId
      })

      toast({
        title: domainAction === 'set' ? 'Domain Set Successfully' : 'Domain Removed Successfully',
        description: domainAction === 'set' 
          ? `Permissioned domain ${domainId} has been set`
          : 'Domain requirement has been removed'
      })

      onSuccess?.()
      setDomainId('')
    } catch (error) {
      console.error('Failed to update domain:', error)
      
      // Provide specific error guidance
      const errorMessage = error instanceof Error ? error.message : String(error)
      let description = errorMessage
      
      if (errorMessage.includes('tecNO_PERMISSION')) {
        description = 'Cannot modify domain: Either the lsfMPTCanLock flag is not enabled, or the SingleAssetVault amendment is disabled.'
      } else if (errorMessage.includes('temMALFORMED')) {
        description = 'Transaction is malformed. Cannot specify both DomainID and Holder in the same transaction.'
      }
      
      toast({
        title: 'Error',
        description,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Only show tabs that are available
  const showLockTab = isIssuer && canLock
  const showDomainTab = isIssuer && requiresAuth

  if (!isIssuer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MPT Update</CardTitle>
          <CardDescription>
            Only the issuer can update MPT settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not Authorized</AlertTitle>
            <AlertDescription>
              You must be the MPT issuer to perform update operations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!showLockTab && !showDomainTab) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MPT Update</CardTitle>
          <CardDescription>
            No update operations available for this MPT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Operations Available</AlertTitle>
            <AlertDescription>
              This MPT does not have locking enabled and does not require authorization.
              No update operations can be performed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const defaultTab = showLockTab ? "lock" : "domain"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update MPT Settings</CardTitle>
        <CardDescription>
          Manage token locking and permissioned domains
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList className={`grid w-full ${showLockTab && showDomainTab ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {showLockTab && <TabsTrigger value="lock">Lock/Unlock</TabsTrigger>}
            {showDomainTab && <TabsTrigger value="domain">Permissioned Domains</TabsTrigger>}
          </TabsList>

          {showLockTab && (
            <TabsContent value="lock" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Token Locking</AlertTitle>
                <AlertDescription>
                  Locked tokens cannot be used in transactions except sending value back to the issuer.
                  You can lock/unlock globally or for specific holders.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Action</Label>
                  <RadioGroup value={lockAction} onValueChange={(value) => setLockAction(value as 'lock' | 'unlock')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="lock" id="lock" />
                      <Label htmlFor="lock" className="font-normal">Lock tokens</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="unlock" id="unlock" />
                      <Label htmlFor="unlock" className="font-normal">Unlock tokens</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Scope</Label>
                  <RadioGroup value={lockScope} onValueChange={(value) => setLockScope(value as 'all' | 'holder')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all" className="font-normal">All holders</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="holder" id="holder" />
                      <Label htmlFor="holder" className="font-normal">Specific holder</Label>
                    </div>
                  </RadioGroup>
                </div>

                {lockScope === 'holder' && (
                  <div className="space-y-2">
                    <Label htmlFor="lockHolderAddress">Holder Address</Label>
                    <Input
                      id="lockHolderAddress"
                      placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3wgC4j8S"
                      value={lockHolderAddress}
                      onChange={(e) => setLockHolderAddress(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}

                <Button
                  onClick={handleLockUnlock}
                  disabled={loading || (lockScope === 'holder' && !lockHolderAddress)}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {lockAction === 'lock' ? (
                        <Lock className="mr-2 h-4 w-4" />
                      ) : (
                        <Unlock className="mr-2 h-4 w-4" />
                      )}
                      {lockAction === 'lock' ? 'Lock' : 'Unlock'} Tokens
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          )}

          {showDomainTab && (
            <TabsContent value="domain" className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Permissioned Domains</AlertTitle>
                <AlertDescription>
                  <div className="space-y-1">
                    <p>Grant access to MPT holders through permissioned domains.</p>
                    <p className="text-xs mt-2">
                      <strong>Requirements:</strong>
                    </p>
                    <ul className="list-disc ml-4 text-xs space-y-0.5">
                      <li>MPT must have requireAuth flag enabled</li>
                      <li>Domain ID must be a 256-bit hash (64 hex characters)</li>
                      <li>Users in the domain can send/receive without explicit approval</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Action</Label>
                  <RadioGroup value={domainAction} onValueChange={(value) => setDomainAction(value as 'set' | 'remove')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="set" id="set" />
                      <Label htmlFor="set" className="font-normal">Set permissioned domain</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="remove" id="remove" />
                      <Label htmlFor="remove" className="font-normal">Remove domain requirement</Label>
                    </div>
                  </RadioGroup>
                </div>

                {domainAction === 'set' && (
                  <div className="space-y-2">
                    <Label htmlFor="domainId">Domain ID</Label>
                    <Input
                      id="domainId"
                      placeholder="0123456789ABCDEF... (64 hex characters)"
                      value={domainId}
                      onChange={(e) => setDomainId(e.target.value)}
                      disabled={loading}
                      maxLength={64}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {domainId.length}/64 characters
                      {domainId && !/^[0-9A-Fa-f]*$/.test(domainId) && (
                        <span className="text-destructive ml-2">• Must be hexadecimal</span>
                      )}
                    </p>
                  </div>
                )}

                {domainAction === 'remove' && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Remove Domain</AlertTitle>
                    <AlertDescription>
                      This will remove the permissioned domain, requiring explicit authorization for all holders.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleDomain}
                  disabled={loading || (domainAction === 'set' && !domainId)}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      {domainAction === 'set' ? 'Set Domain' : 'Remove Domain'}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}
