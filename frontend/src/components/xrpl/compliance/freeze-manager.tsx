/**
 * Freeze Manager Component
 * Manage asset freeze controls for compliance
 */

import React, { useState } from 'react'
import type { Wallet } from 'xrpl'
import { XRPLFreezeService } from '@/services/wallet/ripple/compliance'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FreezeManagerProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export function FreezeManager({ wallet, network, projectId }: FreezeManagerProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [globalFreezeEnabled, setGlobalFreezeEnabled] = useState(false)
  const [individualData, setIndividualData] = useState({
    address: '',
    currency: '',
    freeze: true
  })

  const handleGlobalFreeze = async (enable: boolean) => {
    try {
      setIsProcessing(true)

      const client = await xrplClientManager.getClient(network)
      const freezeService = new XRPLFreezeService(client)

      if (enable) {
        await freezeService.enableGlobalFreeze(wallet)
      } else {
        await freezeService.disableGlobalFreeze(wallet)
      }

      setGlobalFreezeEnabled(enable)

      toast({
        title: enable ? 'Global Freeze Enabled' : 'Global Freeze Disabled',
        description: `All trust lines are now ${enable ? 'frozen' : 'unfrozen'}`
      })

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

  const handleIndividualFreeze = async () => {
    try {
      setIsProcessing(true)

      const client = await xrplClientManager.getClient(network)
      const freezeService = new XRPLFreezeService(client)

      if (individualData.freeze) {
        await freezeService.freezeTrustLine(wallet, {
          holderAddress: individualData.address,
          currency: individualData.currency
        })
      } else {
        await freezeService.unfreezeTrustLine(wallet, {
          holderAddress: individualData.address,
          currency: individualData.currency
        })
      }

      toast({
        title: individualData.freeze ? 'Trust Line Frozen' : 'Trust Line Unfrozen',
        description: `${individualData.currency} trust line with ${individualData.address.slice(0, 8)}...`
      })

      setIndividualData({ address: '', currency: '', freeze: true })

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Freeze Manager</CardTitle>
        <CardDescription>
          Control asset freeze settings for compliance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="global">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="global">Global Freeze</TabsTrigger>
            <TabsTrigger value="individual">Individual Freeze</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-4">
            <Alert>
              <AlertDescription>
                Global freeze affects all trust lines. Use with caution.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Global Freeze Status</Label>
                <p className="text-sm text-muted-foreground">
                  {globalFreezeEnabled ? 'All trust lines frozen' : 'All trust lines active'}
                </p>
              </div>
              <Switch
                checked={globalFreezeEnabled}
                onCheckedChange={handleGlobalFreeze}
                disabled={isProcessing}
              />
            </div>
          </TabsContent>

          <TabsContent value="individual" className="space-y-4">
            <Alert>
              <AlertDescription>
                Freeze or unfreeze specific trust lines
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div>
                <Label>Counterparty Address</Label>
                <Input
                  placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3HMfeeXX"
                  value={individualData.address}
                  onChange={(e) => setIndividualData({ ...individualData, address: e.target.value })}
                />
              </div>

              <div>
                <Label>Currency Code</Label>
                <Input
                  placeholder="USD"
                  value={individualData.currency}
                  onChange={(e) => setIndividualData({ ...individualData, currency: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={individualData.freeze}
                  onCheckedChange={(checked) => setIndividualData({ ...individualData, freeze: checked })}
                />
                <Label>{individualData.freeze ? 'Freeze' : 'Unfreeze'} Trust Line</Label>
              </div>
            </div>

            <Button
              onClick={handleIndividualFreeze}
              disabled={isProcessing || !individualData.address || !individualData.currency}
              className="w-full"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {individualData.freeze ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              {individualData.freeze ? 'Freeze' : 'Unfreeze'} Trust Line
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
