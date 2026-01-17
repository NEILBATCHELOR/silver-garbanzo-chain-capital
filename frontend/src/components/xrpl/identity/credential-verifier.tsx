/**
 * Credential Verifier Component
 * Verify credentials on XRPL
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
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface CredentialVerifierProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

interface VerificationResult {
  valid: boolean
  credential: any
  issuer: string
  subject: string
}

export function CredentialVerifier({ wallet, network, projectId }: CredentialVerifierProps) {
  const { toast } = useToast()
  const [isVerifying, setIsVerifying] = useState(false)
  const [credentialId, setCredentialId] = useState('')
  const [result, setResult] = useState<VerificationResult | null>(null)

  const handleVerify = async () => {
    try {
      setIsVerifying(true)
      setResult(null)

      const client = await xrplClientManager.getClient(network)
      const credentialService = new XRPLCredentialService(client)

      const verification = await credentialService.verifyCredential(credentialId)

      setResult({
        valid: verification.isValid,
        credential: verification,
        issuer: verification.issuer,
        subject: verification.subject
      })

      toast({
        title: verification.isValid ? 'Valid Credential' : 'Invalid Credential',
        description: verification.isValid ? 'Credential verification passed' : 'Credential verification failed',
        variant: verification.isValid ? 'default' : 'destructive'
      })

    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credential Verifier</CardTitle>
        <CardDescription>
          Verify credentials on XRPL
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Verify the authenticity of credentials issued on XRPL
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          <div>
            <Label>Credential ID</Label>
            <Input
              placeholder="Enter credential identifier"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleVerify}
          disabled={isVerifying || !credentialId}
          className="w-full"
        >
          {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify Credential
        </Button>

        {result && (
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Verification Result</h3>
              <Badge variant={result.valid ? 'default' : 'destructive'}>
                {result.valid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Valid
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1" />
                    Invalid
                  </>
                )}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <Label className="text-xs">Issuer</Label>
                <p className="font-mono">{result.issuer}</p>
              </div>
              <div>
                <Label className="text-xs">Subject</Label>
                <p className="font-mono">{result.subject}</p>
              </div>
              {result.credential && (
                <div>
                  <Label className="text-xs">Credential Data</Label>
                  <pre className="text-xs overflow-auto bg-muted p-2 rounded">
                    {JSON.stringify(result.credential, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
