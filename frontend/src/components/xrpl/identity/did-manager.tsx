/**
 * DID Manager Component
 * Manage Decentralized Identifiers on XRPL
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { XRPLDIDService } from '@/services/wallet/ripple/identity'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DIDManagerProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function DIDManager({ wallet, network, projectId }: DIDManagerProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [didData, setDidData] = useState({
    uri: '',
    document: ''
  })

  const handleSetDID = async () => {
    try {
      setIsProcessing(true)

      const client = await xrplClientManager.getClient(network)
      const didService = new XRPLDIDService(client)

      await didService.setDID(wallet, {
        didDocument: didData.document ? JSON.parse(didData.document) : undefined,
        uri: didData.uri
      })

      toast({
        title: 'DID Set Successfully',
        description: 'Your DID document has been published'
      })

      setDidData({ uri: '', document: '' })

    } catch (error) {
      toast({
        title: 'Operation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteDID = async () => {
    try {
      setIsProcessing(true)

      const client = await xrplClientManager.getClient(network)
      const didService = new XRPLDIDService(client)

      await didService.deleteDID(wallet)

      toast({
        title: 'DID Deleted',
        description: 'Your DID document has been removed'
      })

    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>DID Manager</CardTitle>
        <CardDescription>
          Manage your Decentralized Identifier (XLS-40)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create/Update DID</TabsTrigger>
            <TabsTrigger value="delete">Delete DID</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <Alert>
              <AlertDescription>
                Create or update your decentralized identifier on XRPL
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div>
                <Label>DID URI</Label>
                <Input
                  placeholder="did:xrpl:..."
                  value={didData.uri}
                  onChange={(e) => setDidData({ ...didData, uri: e.target.value })}
                />
              </div>

              <div>
                <Label>DID Document (JSON)</Label>
                <Textarea
                  placeholder='{"@context": "https://www.w3.org/ns/did/v1", ...}'
                  rows={10}
                  value={didData.document}
                  onChange={(e) => setDidData({ ...didData, document: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={handleSetDID}
              disabled={isProcessing || !didData.uri || !didData.document}
              className="w-full"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4 mr-2" />
              Set DID
            </Button>
          </TabsContent>

          <TabsContent value="delete" className="space-y-4">
            <Alert>
              <AlertDescription>
                Permanently delete your DID from the XRPL
              </AlertDescription>
            </Alert>

            <Button
              variant="destructive"
              onClick={handleDeleteDID}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Delete DID
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
