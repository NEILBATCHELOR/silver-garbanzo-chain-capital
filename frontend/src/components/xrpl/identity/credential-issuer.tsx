/**
 * Credential Issuer Component
 * Issue verifiable credentials on XRPL
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { XRPLCredentialService } from '@/services/wallet/ripple/credentials'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, FileCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CredentialIssuerProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function CredentialIssuer({ wallet, network, projectId }: CredentialIssuerProps) {
  const { toast } = useToast()
  const [isIssuing, setIsIssuing] = useState(false)
  const [credentialData, setCredentialData] = useState({
    subject: '',
    credentialType: '',
    claims: ''
  })

  const handleIssue = async () => {
    try {
      setIsIssuing(true)

      if (!projectId) {
        throw new Error('Project ID is required for credential issuance')
      }

      const client = await xrplClientManager.getClient(network)
      const credentialService = new XRPLCredentialService(client)

      await credentialService.issueCredential(
        projectId,
        wallet,
        {
          subject: credentialData.subject,
          credentialType: credentialData.credentialType,
          data: JSON.parse(credentialData.claims)
        }
      )

      toast({
        title: 'Credential Issued',
        description: `Credential issued to ${credentialData.subject.slice(0, 8)}...`
      })

      setCredentialData({ subject: '', credentialType: '', claims: '' })

    } catch (error) {
      toast({
        title: 'Issuance Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsIssuing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credential Issuer</CardTitle>
        <CardDescription>
          Issue verifiable credentials (XLS-70d)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Issue tamper-proof verifiable credentials on XRPL
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          <div>
            <Label>Subject Address</Label>
            <Input
              placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3HMfeeXX"
              value={credentialData.subject}
              onChange={(e) => setCredentialData({ ...credentialData, subject: e.target.value })}
            />
          </div>

          <div>
            <Label>Credential Type</Label>
            <Input
              placeholder="KYCCredential"
              value={credentialData.credentialType}
              onChange={(e) => setCredentialData({ ...credentialData, credentialType: e.target.value })}
            />
          </div>

          <div>
            <Label>Claims (JSON)</Label>
            <Textarea
              placeholder='{"name": "John Doe", "verified": true, ...}'
              rows={8}
              value={credentialData.claims}
              onChange={(e) => setCredentialData({ ...credentialData, claims: e.target.value })}
            />
          </div>
        </div>

        <Button
          onClick={handleIssue}
          disabled={isIssuing || !credentialData.subject || !credentialData.credentialType || !credentialData.claims}
          className="w-full"
        >
          {isIssuing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <FileCheck className="h-4 w-4 mr-2" />
          Issue Credential
        </Button>
      </CardContent>
    </Card>
  )
}
