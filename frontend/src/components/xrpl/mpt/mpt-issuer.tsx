/**
 * MPT Issuer Component
 * 
 * Handles MPT token issuance and transfers:
 * - Issue MPT to authorized holders (issuer only)
 * - Transfer MPT between holders with pre-validation
 * - Clawback MPT from holders (issuer only, if enabled)
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Send, ArrowRightLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { XRPLMPTService } from '@/services/wallet/ripple/mpt/XRPLMPTService'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import type { Wallet } from 'xrpl'

interface MPTIssuerProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId: string
  mptIssuanceId: string
  isIssuer?: boolean
  canClawback?: boolean
  onSuccess?: () => void
}

export const MPTIssuer: React.FC<MPTIssuerProps> = ({
  wallet,
  network = 'TESTNET',
  projectId,
  mptIssuanceId,
  isIssuer = false,
  canClawback = false,
  onSuccess
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  
  // Issue state
  const [issueAddress, setIssueAddress] = useState('')
  const [issueAmount, setIssueAmount] = useState('')
  
  // Transfer state
  const [transferAddress, setTransferAddress] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferValidation, setTransferValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid'
    message: string
  }>({ status: 'idle', message: '' })
  
  // Clawback state
  const [clawbackAddress, setClawbackAddress] = useState('')
  const [clawbackAmount, setClawbackAmount] = useState('')

  const handleIssue = async () => {
    if (!issueAddress || !issueAmount) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both destination address and amount',
        variant: 'destructive'
      })
      return
    }

    const amount = parseFloat(issueAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be a positive number',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)

      const result = await mptService.issueMPT({
        projectId,
        issuerWallet: wallet,
        destination: issueAddress,
        mptIssuanceId,
        amount: issueAmount
      })

      toast({
        title: 'MPT Issued Successfully',
        description: (
          <div className="space-y-1">
            <p>Issued {issueAmount} tokens to {issueAddress}</p>
            <p className="text-xs text-muted-foreground">
              Transaction: {result.transactionHash}
            </p>
          </div>
        )
      })

      onSuccess?.()
      setIssueAddress('')
      setIssueAmount('')
    } catch (error) {
      console.error('Failed to issue MPT:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to issue MPT',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const validateTransferAddress = async (address: string): Promise<boolean> => {
    if (!address) {
      setTransferValidation({ status: 'idle', message: '' })
      return false
    }

    setTransferValidation({ status: 'checking', message: 'Validating receiver...' })
    
    try {
      const mptService = new XRPLMPTService(network)
      const status = await mptService.checkHolderStatus({
        holderAddress: address,
        mptIssuanceId
      })

      if (status.canReceive) {
        setTransferValidation({ 
          status: 'valid', 
          message: status.message 
        })
        return true
      } else {
        setTransferValidation({ 
          status: 'invalid', 
          message: status.message 
        })
        return false
      }
    } catch (error) {
      setTransferValidation({ 
        status: 'invalid', 
        message: error instanceof Error ? error.message : 'Failed to validate address'
      })
      return false
    }
  }

  const handleTransferAddressChange = (address: string) => {
    setTransferAddress(address)
    setTransferValidation({ status: 'idle', message: '' })
    
    // Debounce validation
    const timer = setTimeout(() => {
      validateTransferAddress(address)
    }, 1000)
    
    return () => clearTimeout(timer)
  }

  const handleTransfer = async () => {
    if (!transferAddress || !transferAmount) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both destination address and amount',
        variant: 'destructive'
      })
      return
    }

    const amount = parseFloat(transferAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be a positive number',
        variant: 'destructive'
      })
      return
    }

    // Check validation status before proceeding
    if (transferValidation.status === 'invalid') {
      toast({
        title: 'Cannot Transfer',
        description: transferValidation.message,
        variant: 'destructive'
      })
      return
    }

    // Perform final validation if not already done
    if (transferValidation.status !== 'valid') {
      setValidating(true)
      try {
        const isValid = await validateTransferAddress(transferAddress)
        
        // Check the returned validation result
        if (!isValid) {
          toast({
            title: 'Cannot Transfer',
            description: transferValidation.message || 'Receiver address is not authorized',
            variant: 'destructive'
          })
          return
        }
      } catch (error) {
        toast({
          title: 'Validation Failed',
          description: 'Unable to validate receiver address',
          variant: 'destructive'
        })
        return
      } finally {
        setValidating(false)
      }
    }

    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)

      const result = await mptService.transferMPT({
        projectId,
        senderWallet: wallet,
        destination: transferAddress,
        mptIssuanceId,
        amount: transferAmount
      })

      toast({
        title: 'MPT Transferred Successfully',
        description: (
          <div className="space-y-1">
            <p>Transferred {transferAmount} tokens to {transferAddress}</p>
            <p className="text-xs text-muted-foreground">
              Transaction: {result.transactionHash}
            </p>
          </div>
        )
      })

      onSuccess?.()
      setTransferAddress('')
      setTransferAmount('')
      setTransferValidation({ status: 'idle', message: '' })
    } catch (error) {
      console.error('Failed to transfer MPT:', error)
      
      // Provide specific guidance for common errors
      const errorMessage = error instanceof Error ? error.message : String(error)
      let description = errorMessage
      let title = 'Transfer Failed'
      
      if (errorMessage.includes('tecPATH_PARTIAL')) {
        title = 'Authorization Required'
        description = `Transfer failed: The destination account is not properly authorized. They must:\n\n1. Send MPTokenAuthorize transaction (Step 1)\n2. If MPT requires auth, get issuer authorization (Step 2)\n\nUse the Authorization tab to manage holder authorization.`
      } else if (errorMessage.includes('tecNO_AUTH')) {
        title = 'Authorization Required'
        description = 'Either you or the destination is not authorized for this MPT. Both accounts must be authorized.'
      } else if (errorMessage.includes('tecPATH_DRY') || errorMessage.includes('tecUNFUNDED')) {
        title = 'Insufficient Balance'
        description = 'You do not have enough tokens to complete this transfer.'
      } else if (errorMessage.includes('tecNO_LINE')) {
        title = 'No MPToken Entry'
        description = 'The destination has not created an MPToken entry. They must authorize the MPT first.'
      }
      
      toast({
        title,
        description,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClawback = async () => {
    if (!clawbackAddress || !clawbackAmount) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both holder address and amount',
        variant: 'destructive'
      })
      return
    }

    const amount = parseFloat(clawbackAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be a positive number',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)

      const result = await mptService.clawbackMPT({
        projectId,
        issuerWallet: wallet,
        holderAddress: clawbackAddress,
        mptIssuanceId,
        amount: clawbackAmount
      })

      toast({
        title: 'MPT Clawed Back Successfully',
        description: (
          <div className="space-y-1">
            <p>Clawed back {clawbackAmount} tokens from {clawbackAddress}</p>
            <p className="text-xs text-muted-foreground">
              Transaction: {result.transactionHash}
            </p>
          </div>
        )
      })

      onSuccess?.()
      setClawbackAddress('')
      setClawbackAmount('')
    } catch (error) {
      console.error('Failed to clawback MPT:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clawback MPT',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const tabCount = (isIssuer ? 1 : 0) + 1 + (isIssuer && canClawback ? 1 : 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>MPT Tokens</CardTitle>
        <CardDescription>
          Issue, transfer, or manage MPT tokens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={isIssuer ? "issue" : "transfer"}>
          <TabsList className={`grid w-full grid-cols-${tabCount}`}>
            {isIssuer && <TabsTrigger value="issue">Issue</TabsTrigger>}
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
            {isIssuer && canClawback && <TabsTrigger value="clawback">Clawback</TabsTrigger>}
          </TabsList>

          {isIssuer && (
            <TabsContent value="issue" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Issuer Action - Authorization Required</AlertTitle>
                <AlertDescription>
                  Before issuing tokens, the holder must first authorize themselves by sending an MPTokenAuthorize transaction.
                  If this MPT has the requireAuth flag enabled and the holder is not authorized, the issuance will fail with a tecNO_AUTH error.
                  Use the MPT Authorization tab to verify or manage holder authorization status.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="issueAddress">Destination Address</Label>
                <Input
                  id="issueAddress"
                  placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3wgC4j8S"
                  value={issueAddress}
                  onChange={(e) => setIssueAddress(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issueAmount">Amount</Label>
                <Input
                  id="issueAmount"
                  type="number"
                  placeholder="1000"
                  value={issueAmount}
                  onChange={(e) => setIssueAmount(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button
                onClick={handleIssue}
                disabled={loading || !issueAddress || !issueAmount}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Issuing...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Issue Tokens
                  </>
                )}
              </Button>
            </TabsContent>
          )}

          <TabsContent value="transfer" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Transfer Requirements</AlertTitle>
              <AlertDescription>
                <div className="space-y-1">
                  <p><strong>Before transferring, ensure the receiver has:</strong></p>
                  <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs">
                    <li>Authorized the MPT (Step 1: MPTokenAuthorize transaction)</li>
                    <li>If this MPT requires authorization, been granted permission by issuer (Step 2)</li>
                  </ul>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Without these, the transfer will fail with tecPATH_PARTIAL error.
                    Use the Authorization tab to manage holder authorization.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="transferAddress">Destination Address</Label>
              <Input
                id="transferAddress"
                placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3wgC4j8S"
                value={transferAddress}
                onChange={(e) => handleTransferAddressChange(e.target.value)}
                disabled={loading}
              />
              {transferValidation.status !== 'idle' && (
                <div className={`flex items-start gap-2 text-sm ${
                  transferValidation.status === 'valid' ? 'text-green-600' :
                  transferValidation.status === 'invalid' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {transferValidation.status === 'checking' && (
                    <Loader2 className="h-4 w-4 animate-spin mt-0.5" />
                  )}
                  {transferValidation.status === 'valid' && (
                    <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  )}
                  {transferValidation.status === 'invalid' && (
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                  )}
                  <span className="flex-1">{transferValidation.message}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transferAmount">Amount</Label>
              <Input
                id="transferAmount"
                type="number"
                placeholder="100"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleTransfer}
              disabled={loading || validating || !transferAddress || !transferAmount || transferValidation.status === 'invalid'}
              className="w-full"
            >
              {loading || validating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {validating ? 'Validating...' : 'Transferring...'}
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer Tokens
                </>
              )}
            </Button>
          </TabsContent>

          {isIssuer && canClawback && (
            <TabsContent value="clawback" className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Clawback Action</AlertTitle>
                <AlertDescription>
                  Retrieve tokens from a holder. This is a compliance feature and should be used carefully.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="clawbackAddress">Holder Address</Label>
                <Input
                  id="clawbackAddress"
                  placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3wgC4j8S"
                  value={clawbackAddress}
                  onChange={(e) => setClawbackAddress(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clawbackAmount">Amount</Label>
                <Input
                  id="clawbackAmount"
                  type="number"
                  placeholder="100"
                  value={clawbackAmount}
                  onChange={(e) => setClawbackAmount(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button
                onClick={handleClawback}
                disabled={loading || !clawbackAddress || !clawbackAmount}
                variant="destructive"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clawing Back...
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Clawback Tokens
                  </>
                )}
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}