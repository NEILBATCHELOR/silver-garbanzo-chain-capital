/**
 * Emergency Controls Component
 * Admin interface for emergency actions and circuit breakers
 * Features: Pause/unpause, circuit breakers, emergency withdrawals
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Shield, AlertCircle, CheckCircle2, Pause, Play, Zap, Lock, Unlock, Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ProtocolStatus {
  isPaused: boolean
  pausedAt: Date | null
  circuitBreakers: {
    oracleFailure: boolean
    highUtilization: boolean
    largeLiquidation: boolean
  }
  lastUpdate: Date
}

interface EmergencyControlsProps {
  poolAddress?: string
  chainId?: number
  networkType?: 'mainnet' | 'testnet'
  adminAddress?: string
  onStatusChange?: (status: ProtocolStatus) => void
}

export function EmergencyControls({
  poolAddress = '0x...',
  chainId = 11155111,
  networkType = 'testnet',
  adminAddress,
  onStatusChange
}: EmergencyControlsProps) {
  const [status, setStatus] = useState<ProtocolStatus>({
    isPaused: false,
    pausedAt: null,
    circuitBreakers: {
      oracleFailure: false,
      highUtilization: false,
      largeLiquidation: false
    },
    lastUpdate: new Date()
  })

  const [isLoading, setIsLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'pause' | 'unpause' | null>(null)
  const [confirmationText, setConfirmationText] = useState('')

  // Fetch protocol status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // TODO: Replace with actual service call
        // const poolService = createCommodityPoolService(config)
        // const result = await poolService.getProtocolStatus()

        // Mock data
        const mockStatus: ProtocolStatus = {
          isPaused: false,
          pausedAt: null,
          circuitBreakers: {
            oracleFailure: false,
            highUtilization: false,
            largeLiquidation: false
          },
          lastUpdate: new Date()
        }

        setStatus(mockStatus)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatus()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [poolAddress, chainId])

  const handlePauseClick = () => {
    setConfirmAction('pause')
    setConfirmationText('')
    setShowConfirmDialog(true)
  }

  const handleUnpauseClick = () => {
    setConfirmAction('unpause')
    setConfirmationText('')
    setShowConfirmDialog(true)
  }

  const executeAction = async () => {
    if (!confirmAction || !adminAddress) return

    // Require "CONFIRM" to proceed
    if (confirmationText !== 'CONFIRM') {
      toast.error('Type CONFIRM to proceed')
      return
    }

    try {
      setActionInProgress(confirmAction)
      setError(null)
      setShowConfirmDialog(false)

      // TODO: Replace with actual service call
      // const poolService = createCommodityPoolService(config)
      // if (confirmAction === 'pause') {
      //   await poolService.pauseProtocol(privateKey)
      // } else {
      //   await poolService.unpauseProtocol(privateKey)
      // }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      const newStatus: ProtocolStatus = {
        ...status,
        isPaused: confirmAction === 'pause',
        pausedAt: confirmAction === 'pause' ? new Date() : null,
        lastUpdate: new Date()
      }

      setStatus(newStatus)
      if (onStatusChange) onStatusChange(newStatus)

      toast.success(
        confirmAction === 'pause' 
          ? 'Protocol paused successfully' 
          : 'Protocol unpaused successfully'
      )

      setConfirmationText('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${confirmAction} protocol`
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setActionInProgress(null)
      setConfirmAction(null)
    }
  }

  const resetCircuitBreaker = async (breaker: keyof ProtocolStatus['circuitBreakers']) => {
    try {
      setActionInProgress(`reset-${breaker}`)
      setError(null)

      // TODO: Replace with actual service call
      // const poolService = createCommodityPoolService(config)
      // await poolService.resetCircuitBreaker(breaker, privateKey)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      const newStatus: ProtocolStatus = {
        ...status,
        circuitBreakers: {
          ...status.circuitBreakers,
          [breaker]: false
        },
        lastUpdate: new Date()
      }

      setStatus(newStatus)
      if (onStatusChange) onStatusChange(newStatus)

      toast.success(`${breaker} circuit breaker reset`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset circuit breaker'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setActionInProgress(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading protocol status...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const anyCircuitBreakerActive = Object.values(status.circuitBreakers).some(v => v)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                Emergency Controls
              </CardTitle>
              <CardDescription>
                Protocol safety controls and circuit breakers
              </CardDescription>
            </div>
            <Badge 
              variant={status.isPaused ? 'destructive' : 'default'}
              className="flex items-center gap-2"
            >
              {status.isPaused ? (
                <>
                  <Pause className="h-3 w-3" />
                  PAUSED
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  ACTIVE
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Protocol Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Protocol Status</h3>
            
            <Card className={status.isPaused ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {status.isPaused ? (
                      <Pause className="h-8 w-8 text-red-600" />
                    ) : (
                      <Play className="h-8 w-8 text-green-600" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {status.isPaused ? 'Protocol Paused' : 'Protocol Active'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {status.isPaused && status.pausedAt
                          ? `Paused at ${status.pausedAt.toLocaleString()}`
                          : 'All functions operational'}
                      </p>
                    </div>
                  </div>
                  
                  {status.isPaused ? (
                    <Button
                      onClick={handleUnpauseClick}
                      disabled={!!actionInProgress}
                      variant="default"
                    >
                      {actionInProgress === 'unpause' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Unpausing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Unpause
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePauseClick}
                      disabled={!!actionInProgress}
                      variant="destructive"
                    >
                      {actionInProgress === 'pause' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Pausing...
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause Protocol
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {status.isPaused && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Protocol is paused:</strong> Users cannot supply, borrow, or perform liquidations. 
                  Existing positions and repayments are unaffected.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Circuit Breakers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Circuit Breakers</h3>
              {anyCircuitBreakerActive && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Oracle Failure */}
              <Card className={status.circuitBreakers.oracleFailure ? 'border-red-500' : 'border-muted'}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Zap className={`h-5 w-5 ${status.circuitBreakers.oracleFailure ? 'text-red-600' : 'text-muted-foreground'}`} />
                        <span className="font-medium">Oracle Failure</span>
                      </div>
                      <Badge variant={status.circuitBreakers.oracleFailure ? 'destructive' : 'outline'}>
                        {status.circuitBreakers.oracleFailure ? 'ACTIVE' : 'OK'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Triggers when price feed stops updating or deviation exceeds 10%
                    </p>
                    {status.circuitBreakers.oracleFailure && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => resetCircuitBreaker('oracleFailure')}
                        disabled={!!actionInProgress}
                      >
                        {actionInProgress === 'reset-oracleFailure' ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3 w-3 mr-2" />
                            Reset
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* High Utilization */}
              <Card className={status.circuitBreakers.highUtilization ? 'border-red-500' : 'border-muted'}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className={`h-5 w-5 ${status.circuitBreakers.highUtilization ? 'text-red-600' : 'text-muted-foreground'}`} />
                        <span className="font-medium">High Utilization</span>
                      </div>
                      <Badge variant={status.circuitBreakers.highUtilization ? 'destructive' : 'outline'}>
                        {status.circuitBreakers.highUtilization ? 'ACTIVE' : 'OK'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Triggers when pool utilization exceeds 98%
                    </p>
                    {status.circuitBreakers.highUtilization && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => resetCircuitBreaker('highUtilization')}
                        disabled={!!actionInProgress}
                      >
                        {actionInProgress === 'reset-highUtilization' ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3 w-3 mr-2" />
                            Reset
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Large Liquidation */}
              <Card className={status.circuitBreakers.largeLiquidation ? 'border-red-500' : 'border-muted'}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className={`h-5 w-5 ${status.circuitBreakers.largeLiquidation ? 'text-red-600' : 'text-muted-foreground'}`} />
                        <span className="font-medium">Large Liquidation</span>
                      </div>
                      <Badge variant={status.circuitBreakers.largeLiquidation ? 'destructive' : 'outline'}>
                        {status.circuitBreakers.largeLiquidation ? 'ACTIVE' : 'OK'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Triggers when liquidations exceed 10% of TVL in 24 hours
                    </p>
                    {status.circuitBreakers.largeLiquidation && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => resetCircuitBreaker('largeLiquidation')}
                        disabled={!!actionInProgress}
                      >
                        {actionInProgress === 'reset-largeLiquidation' ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3 w-3 mr-2" />
                            Reset
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Circuit breakers automatically pause specific protocol functions when triggered. 
                Reset only after confirming the underlying issue is resolved.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Last Update */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Last updated: {status.lastUpdate.toLocaleString()}</span>
            <span>Network: {networkType}</span>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm {confirmAction === 'pause' ? 'Pause' : 'Unpause'} Protocol
            </DialogTitle>
            <DialogDescription>
              This is a critical action that affects all users.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {confirmAction === 'pause' ? (
                  <>
                    <strong>Pausing will:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Prevent new supplies and borrows</li>
                      <li>Disable liquidations</li>
                      <li>Allow repayments and withdrawals</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <strong>Unpausing will:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Resume all protocol functions</li>
                      <li>Enable supplies, borrows, and liquidations</li>
                      <li>Return protocol to normal operation</li>
                    </ul>
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm">Type <strong>CONFIRM</strong> to proceed</Label>
              <Input
                id="confirm"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="CONFIRM"
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setConfirmationText('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeAction}
              disabled={confirmationText !== 'CONFIRM'}
            >
              {confirmAction === 'pause' ? 'Pause Protocol' : 'Unpause Protocol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
