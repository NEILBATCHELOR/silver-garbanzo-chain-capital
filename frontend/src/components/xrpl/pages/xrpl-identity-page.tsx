/**
 * XRPL Identity Page
 * Decentralized identity management with DIDs and credentials
 */

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Wallet } from 'xrpl'

// Import identity components
import { DIDManager } from '../identity/did-manager'
import { CredentialIssuer } from '../identity/credential-issuer'
import { CredentialVerifier } from '../identity/credential-verifier'

interface XRPLIdentityPageProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function XRPLIdentityPage({ wallet, network, projectId }: XRPLIdentityPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Identity Management</h2>
        <p className="text-muted-foreground">
          Manage DIDs and verifiable credentials on XRPL
        </p>
      </div>

      <Tabs defaultValue="did" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="did">DID Manager</TabsTrigger>
          <TabsTrigger value="issue">Issue Credentials</TabsTrigger>
          <TabsTrigger value="verify">Verify Credentials</TabsTrigger>
        </TabsList>

        <TabsContent value="did">
          <Card>
            <CardHeader>
              <CardTitle>Decentralized Identifiers (DIDs)</CardTitle>
              <CardDescription>
                Create and manage your decentralized identities (XLS-40)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DIDManager wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issue">
          <Card>
            <CardHeader>
              <CardTitle>Credential Issuance</CardTitle>
              <CardDescription>
                Issue verifiable credentials to other addresses (XLS-70d)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CredentialIssuer wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verify">
          <Card>
            <CardHeader>
              <CardTitle>Credential Verification</CardTitle>
              <CardDescription>
                Verify credentials and check their validity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CredentialVerifier wallet={wallet} network={network} projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
