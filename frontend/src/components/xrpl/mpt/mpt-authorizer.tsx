/**
 * MPT Authorization Component
 * 
 * Handles XRPL MPT two-step authorization for allow-listed MPTs:
 * 
 * STEP 1 (Holder): Holder indicates willingness to hold the MPT
 * - Creates MPToken entry with Flags=0
 * - Holder sends MPTokenAuthorize transaction
 * 
 * STEP 2 (Issuer): Issuer grants permission to the holder
 * - Sets lsfMPTAuthorized flag (0x0002)
 * - Issuer sends MPTokenAuthorize with Holder field
 * 
 * Both steps are required for MPTs with lsfMPTRequireAuth flag.
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, UserCheck, UserX, Info, CheckCircle2 } from 'lucide-react'
import { XRPLMPTService } from '@/services/wallet/ripple/mpt/XRPLMPTService'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import type { Wallet } from 'xrpl'

interface MPTAuthorizerProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  mptIssuanceId: string
  isIssuer?: boolean
  onSuccess?: () => void
}

export const MPTAuthorizer: React.FC<MPTAuthorizerProps> = ({
  wallet,
  network = 'TESTNET',
  projectId,
  mptIssuanceId,
  isIssuer = false,
  onSuccess
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [holderAddress, setHolderAddress] = useState('')

  // Step 1: Holder indicates willingness (creates MPToken entry)
  const handleHolderAuthorize = async () => {
    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)

      const result = await mptService.authorizeMPTHolder({
        projectId,
        holderWallet: wallet,
        mptIssuanceId
      })

      toast({
        title: 'Step 1 Complete',
        description: (
          <div className="space-y-1">
            <p>✓ MPToken entry created</p>
            <p className="text-xs">Now the issuer must grant permission (Step 2)</p>
            <p className="text-xs text-muted-foreground">
              TX: {result.transactionHash}
            </p>
          </div>
        )
      })

      onSuccess?.()
    } catch (error) {
      console.error('Failed to authorize MPT holder:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to authorize MPT holder',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Issuer grants permission (sets lsfMPTAuthorized flag)
  const handleIssuerAuthorize = async () => {
    if (!holderAddress) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a holder address to authorize',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)

      const result = await mptService.issuerAuthorizeMPTHolder({
        projectId,
        issuerWallet: wallet,
        holderAddress,
        mptIssuanceId
      })

      toast({
        title: 'Authorization Granted',
        description: (
          <div className="space-y-1">
            <p>✓ Holder {holderAddress.substring(0, 10)}... is now authorized</p>
            <p className="text-xs">They can now receive MPT tokens</p>
            <p className="text-xs text-muted-foreground">
              TX: {result.transactionHash}
            </p>
          </div>
        )
      })

      onSuccess?.()
      setHolderAddress('')
    } catch (error) {
      console.error('Failed to authorize holder as issuer:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to authorize holder',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnauthorize = async () => {
    if (isIssuer && !holderAddress) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a holder address to revoke authorization',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)

      await mptService.unauthorizeMPTHolder({
        projectId,
        mptIssuanceId,
        ...(isIssuer ? {
          issuerWallet: wallet,
          holderAddress
        } : {
          holderWallet: wallet
        })
      })

      toast({
        title: 'Authorization Revoked',
        description: isIssuer 
          ? `Holder ${holderAddress} authorization revoked`
          : 'Your authorization has been revoked. Balance must be zero.'
      })

      onSuccess?.()
      if (isIssuer) {
        setHolderAddress('')
      }
    } catch (error) {
      console.error('Failed to unauthorize MPT holder:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke authorization',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (isIssuer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Issuer: Grant Authorization to Holders</CardTitle>
          <CardDescription>
            Step 2 of MPT authorization - Grant permission to holders who have indicated willingness
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Two-Step Authorization Process</AlertTitle>
            <AlertDescription className="space-y-2">
              <p><strong>Step 1 (Holder):</strong> Holder sends MPTokenAuthorize to create MPToken entry</p>
              <p><strong>Step 2 (Issuer - YOU):</strong> Grant permission by authorizing the holder</p>
              <p className="text-xs mt-2">Only holders who completed Step 1 can be authorized</p>
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="authorize">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="authorize">Authorize Holder</TabsTrigger>
              <TabsTrigger value="revoke">Revoke Access</TabsTrigger>
            </TabsList>

            <TabsContent value="authorize" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="holderAddressAuth">Holder Address</Label>
                <Input
                  id="holderAddressAuth"
                  placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3wgC4j8S"
                  value={holderAddress}
                  onChange={(e) => setHolderAddress(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Address of the holder who completed Step 1 (sent MPTokenAuthorize)
                </p>
              </div>

              <Button
                onClick={handleIssuerAuthorize}
                disabled={loading || !holderAddress}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authorizing...
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Grant Authorization (Step 2)
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="revoke" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="holderAddressRevoke">Holder Address</Label>
                <Input
                  id="holderAddressRevoke"
                  placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3wgC4j8S"
                  value={holderAddress}
                  onChange={(e) => setHolderAddress(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Address of the holder whose authorization to revoke (balance must be zero)
                </p>
              </div>

              <Button
                onClick={handleUnauthorize}
                disabled={loading || !holderAddress}
                variant="destructive"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Revoke Authorization
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
  }

  // Holder view
  return (
    <Card>
      <CardHeader>
        <CardTitle>Holder: Indicate Willingness to Hold MPT</CardTitle>
        <CardDescription>
          Step 1 of MPT authorization - Create your MPToken entry
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Two-Step Authorization</AlertTitle>
          <AlertDescription className="space-y-2">
            <p><strong>Step 1 (YOU):</strong> Click "Authorize" to indicate willingness</p>
            <p><strong>Step 2 (Issuer):</strong> Issuer must grant you permission</p>
            <p className="text-xs mt-2">Both steps required before you can receive tokens</p>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={handleHolderAuthorize}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Authorize (Step 1)
              </>
            )}
          </Button>

          <Button
            onClick={handleUnauthorize}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Revoke (Opt Out)
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          To opt-out later, your balance must be zero
        </p>
      </CardContent>
    </Card>
  )
}
