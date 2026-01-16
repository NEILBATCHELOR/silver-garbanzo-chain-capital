/**
 * AMM Pool Creator Component
 * Allows users to create new AMM liquidity pools
 */

import React, { useState, useMemo } from 'react'
import type { AMMPoolCreatorProps, CreatePoolFormData } from './types'
import { XRPLAMMService, XRPLAMMDatabaseService, type AMMCurrency, type AMMPoolInfo } from '@/services/wallet/ripple/defi'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { supabase } from '@/infrastructure/database/client'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Loader2, Plus, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function AMMPoolCreator({ wallet, network, projectId, onSuccess }: AMMPoolCreatorProps) {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<CreatePoolFormData>({
    asset1Currency: 'XRP',
    asset1Amount: '',
    asset2Currency: 'USD',
    asset2Issuer: '',
    asset2Amount: '',
    tradingFee: 5 // 0.5% default
  })

  // Initialize services
  const databaseService = useMemo(() => {
    return new XRPLAMMDatabaseService(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
  }, [])

  const handleCreate = async () => {
    try {
      setIsCreating(true)

      // Validate inputs
      if (!formData.asset1Amount || !formData.asset2Amount) {
        toast({
          title: 'Validation Error',
          description: 'Please enter amounts for both assets',
          variant: 'destructive'
        })
        return
      }

      if (formData.asset2Currency !== 'XRP' && !formData.asset2Issuer) {
        toast({
          title: 'Validation Error',
          description: 'Please enter an issuer address for the token',
          variant: 'destructive'
        })
        return
      }

      // Get XRPL client
      const client = await xrplClientManager.getClient(network)
      const ammService = new XRPLAMMService(client)

      // Format currencies for AMM
      const asset1: AMMCurrency = formData.asset1Currency === 'XRP'
        ? { currency: 'XRP', value: formData.asset1Amount }
        : {
            currency: formData.asset1Currency,
            issuer: formData.asset1Issuer!,
            value: formData.asset1Amount
          }

      const asset2: AMMCurrency = formData.asset2Currency === 'XRP'
        ? { currency: 'XRP', value: formData.asset2Amount }
        : {
            currency: formData.asset2Currency,
            issuer: formData.asset2Issuer!,
            value: formData.asset2Amount
          }

      // Create pool on blockchain
      const result = await ammService.createAMMPool({
        wallet,
        asset1,
        asset2,
        tradingFee: formData.tradingFee
      })

      // Save to database if projectId provided
      if (projectId) {
        const poolInfo: AMMPoolInfo = {
          ammId: result.poolId,
          asset1,
          asset2,
          asset1Balance: formData.asset1Amount,
          asset2Balance: formData.asset2Amount,
          lpTokenSupply: '0', // Will be updated
          tradingFee: formData.tradingFee
        }

        await databaseService.saveAMMPool(projectId, poolInfo, result)
      }

      toast({
        title: 'Pool Created',
        description: `AMM pool ${result.poolId} created successfully`
      })

      // Reset form
      setFormData({
        asset1Currency: 'XRP',
        asset1Amount: '',
        asset2Currency: 'USD',
        asset2Issuer: '',
        asset2Amount: '',
        tradingFee: 5
      })

      // Call success callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error creating pool:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create pool',
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create AMM Pool
        </CardTitle>
        <CardDescription>
          Create a new Automated Market Maker liquidity pool
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>What is an AMM?</AlertTitle>
          <AlertDescription>
            An Automated Market Maker (AMM) allows you to provide liquidity for token pairs and earn trading fees.
            You'll receive LP tokens representing your share of the pool.
          </AlertDescription>
        </Alert>

        {/* Asset 1 */}
        <div className="space-y-4">
          <div>
            <Label>Asset 1</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input
                placeholder="Currency (e.g., XRP)"
                value={formData.asset1Currency}
                onChange={(e) => setFormData({ ...formData, asset1Currency: e.target.value.toUpperCase() })}
              />
              {formData.asset1Currency !== 'XRP' && (
                <Input
                  placeholder="Issuer Address"
                  value={formData.asset1Issuer || ''}
                  onChange={(e) => setFormData({ ...formData, asset1Issuer: e.target.value })}
                />
              )}
            </div>
          </div>
          <div>
            <Label>Asset 1 Amount</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={formData.asset1Amount}
              onChange={(e) => setFormData({ ...formData, asset1Amount: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>

        {/* Asset 2 */}
        <div className="space-y-4">
          <div>
            <Label>Asset 2</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input
                placeholder="Currency"
                value={formData.asset2Currency}
                onChange={(e) => setFormData({ ...formData, asset2Currency: e.target.value.toUpperCase() })}
              />
              {formData.asset2Currency !== 'XRP' && (
                <Input
                  placeholder="Issuer Address"
                  value={formData.asset2Issuer || ''}
                  onChange={(e) => setFormData({ ...formData, asset2Issuer: e.target.value })}
                />
              )}
            </div>
          </div>
          <div>
            <Label>Asset 2 Amount</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={formData.asset2Amount}
              onChange={(e) => setFormData({ ...formData, asset2Amount: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>

        {/* Trading Fee */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Trading Fee</Label>
            <span className="text-sm text-muted-foreground">{formData.tradingFee / 10}%</span>
          </div>
          <Slider
            value={[formData.tradingFee]}
            onValueChange={([value]) => setFormData({ ...formData, tradingFee: value })}
            min={0}
            max={1000}
            step={1}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground">
            Set the trading fee (0-100%). Lower fees attract more traders, higher fees increase your earnings per trade.
          </p>
        </div>

        <Button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full"
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Pool...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create AMM Pool
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
