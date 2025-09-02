/**
 * EmergencyLockControls - Emergency Wallet Lock/Unlock Management
 * 
 * Provides emergency wallet lock/unlock controls with guardian recovery,
 * time-based unlocks, and comprehensive security event logging
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { 
  Lock, 
  Unlock,
  Shield,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Timer
} from 'lucide-react'
import { UnifiedWallet } from '@/services/wallet/smart-contract/unifiedWalletService'

interface EmergencyLockControlsProps {
  walletId: string
  wallet: UnifiedWallet
}

interface LockStatus {
  isLocked: boolean
  lockType?: 'emergency' | 'security' | 'maintenance' | 'guardian_triggered'
  lockedAt?: string
  lockedBy?: string
  reason?: string
  unlockTime?: string
  canUnlock: boolean
  requiresGuardianApproval: boolean
  guardianApprovals?: {
    guardianAddress: string
    approved: boolean
    timestamp?: string
  }[]
}

interface SecurityEvent {
  id: string
  type: 'lock' | 'unlock' | 'lock_attempt' | 'unlock_attempt'
  timestamp: string
  triggeredBy: string
  reason: string
  success: boolean
  details?: any
}

export function EmergencyLockControls({ walletId, wallet }: EmergencyLockControlsProps) {
  const [lockStatus, setLockStatus] = useState<LockStatus>({
    isLocked: wallet.security.isLocked,
    canUnlock: false,
    requiresGuardianApproval: wallet.security.guardianCount > 0
  })
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [showLockForm, setShowLockForm] = useState(false)
  const [lockReason, setLockReason] = useState('')
  const [lockType, setLockType] = useState<'emergency' | 'security' | 'maintenance'>('emergency')
  const [unlockDuration, setUnlockDuration] = useState('24') // hours
  const { toast } = useToast()

  useEffect(() => {
    loadLockStatus()
    loadSecurityEvents()
  }, [walletId])

  const loadLockStatus = async () => {
    try {
      setLoading(true)
      // In real implementation, this would fetch from backend
      // For now, simulate based on wallet state
      const status: LockStatus = {
        isLocked: wallet.security.isLocked,
        canUnlock: !wallet.security.isLocked,
        requiresGuardianApproval: wallet.security.guardianCount > 0,
        lockType: wallet.security.isLocked ? 'emergency' : undefined,
        lockedAt: wallet.security.isLocked ? new Date().toISOString() : undefined,
        lockedBy: wallet.security.isLocked ? 'Owner' : undefined,
        reason: wallet.security.isLocked ? 'Manual emergency lock' : undefined
      }

      if (wallet.security.guardianCount > 0 && wallet.security.isLocked) {
        status.guardianApprovals = Array(wallet.security.guardianCount).fill(null).map((_, i) => ({
          guardianAddress: `0x${i.toString().padStart(40, '0')}`,
          approved: false
        }))
      }

      setLockStatus(status)
    } catch (error) {
      console.error('Failed to load lock status:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSecurityEvents = async () => {
    try {
      // In real implementation, this would fetch from backend
      // For now, simulate with sample events
      const events: SecurityEvent[] = [
        {
          id: '1',
          type: 'lock',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          triggeredBy: 'Owner',
          reason: 'Suspicious activity detected',
          success: true
        },
        {
          id: '2',
          type: 'unlock_attempt',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          triggeredBy: 'Owner',
          reason: 'Manual unlock request',
          success: false,
          details: { reason: 'Guardian approval required' }
        }
      ]
      setSecurityEvents(events)
    } catch (error) {
      console.error('Failed to load security events:', error)
    }
  }

  const handleEmergencyLock = async () => {
    try {
      setLoading(true)
      
      // Simulate emergency lock
      const newStatus: LockStatus = {
        isLocked: true,
        lockType: lockType,
        lockedAt: new Date().toISOString(),
        lockedBy: 'Owner',
        reason: lockReason || 'Emergency lock triggered',
        canUnlock: false,
        requiresGuardianApproval: wallet.security.guardianCount > 0,
        unlockTime: lockType === 'maintenance' ? 
          new Date(Date.now() + parseInt(unlockDuration) * 60 * 60 * 1000).toISOString() : 
          undefined
      }

      if (wallet.security.guardianCount > 0) {
        newStatus.guardianApprovals = Array(wallet.security.guardianCount).fill(null).map((_, i) => ({
          guardianAddress: `0x${i.toString().padStart(40, '0')}`,
          approved: false
        }))
      }

      setLockStatus(newStatus)
      
      // Add security event
      const newEvent: SecurityEvent = {
        id: Date.now().toString(),
        type: 'lock',
        timestamp: new Date().toISOString(),
        triggeredBy: 'Owner',
        reason: lockReason || 'Emergency lock triggered',
        success: true
      }
      setSecurityEvents(prev => [newEvent, ...prev])

      setShowLockForm(false)
      setLockReason('')

      toast({
        title: 'Wallet Locked',
        description: 'Wallet has been successfully locked for security',
      })
    } catch (error) {
      console.error('Failed to lock wallet:', error)
      toast({
        title: 'Lock Failed',
        description: 'Failed to lock wallet',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRequestUnlock = async () => {
    try {
      setLoading(true)
      
      if (lockStatus.requiresGuardianApproval) {
        // Request guardian approval
        const newEvent: SecurityEvent = {
          id: Date.now().toString(),
          type: 'unlock_attempt',
          timestamp: new Date().toISOString(),
          triggeredBy: 'Owner',
          reason: 'Manual unlock request - awaiting guardian approval',
          success: false,
          details: { status: 'pending_guardian_approval' }
        }
        setSecurityEvents(prev => [newEvent, ...prev])

        toast({
          title: 'Unlock Requested',
          description: 'Guardian approval is required to unlock the wallet',
        })
      } else {
        // Direct unlock
        setLockStatus(prev => ({
          ...prev,
          isLocked: false,
          lockType: undefined,
          lockedAt: undefined,
          lockedBy: undefined,
          reason: undefined,
          canUnlock: true
        }))

        const newEvent: SecurityEvent = {
          id: Date.now().toString(),
          type: 'unlock',
          timestamp: new Date().toISOString(),
          triggeredBy: 'Owner',
          reason: 'Manual unlock',
          success: true
        }
        setSecurityEvents(prev => [newEvent, ...prev])

        toast({
          title: 'Wallet Unlocked',
          description: 'Wallet has been successfully unlocked',
        })
      }
    } catch (error) {
      console.error('Failed to request unlock:', error)
      toast({
        title: 'Unlock Failed',
        description: 'Failed to request wallet unlock',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateGuardianApproval = async () => {
    try {
      // Simulate guardian approval for demo
      if (lockStatus.guardianApprovals) {
        const updatedApprovals = lockStatus.guardianApprovals.map((approval, index) => 
          index === 0 ? { ...approval, approved: true, timestamp: new Date().toISOString() } : approval
        )

        const allApproved = updatedApprovals.every(approval => approval.approved)
        
        setLockStatus(prev => ({
          ...prev,
          guardianApprovals: updatedApprovals,
          canUnlock: allApproved,
          isLocked: allApproved ? false : prev.isLocked
        }))

        if (allApproved) {
          const newEvent: SecurityEvent = {
            id: Date.now().toString(),
            type: 'unlock',
            timestamp: new Date().toISOString(),
            triggeredBy: 'Guardian',
            reason: 'Guardian approval received - wallet unlocked',
            success: true
          }
          setSecurityEvents(prev => [newEvent, ...prev])

          toast({
            title: 'Wallet Unlocked',
            description: 'Guardian approval received - wallet unlocked',
          })
        } else {
          toast({
            title: 'Guardian Approval',
            description: 'Guardian approval received - awaiting remaining approvals',
          })
        }
      }
    } catch (error) {
      console.error('Failed to simulate guardian approval:', error)
    }
  }

  const getLockTypeColor = (type?: string) => {
    switch (type) {
      case 'emergency':
        return 'bg-red-100 text-red-800'
      case 'security':
        return 'bg-orange-100 text-orange-800'
      case 'maintenance':
        return 'bg-blue-100 text-blue-800'
      case 'guardian_triggered':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getLockTypeIcon = (type?: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'security':
        return <Shield className="w-4 h-4 text-orange-600" />
      case 'maintenance':
        return <Settings className="w-4 h-4 text-blue-600" />
      case 'guardian_triggered':
        return <Users className="w-4 h-4 text-purple-600" />
      default:
        return <Lock className="w-4 h-4 text-gray-600" />
    }
  }

  const getEventIcon = (type: string, success: boolean) => {
    if (type === 'lock') {
      return success ? <Lock className="w-4 h-4 text-red-600" /> : <XCircle className="w-4 h-4 text-gray-600" />
    } else if (type === 'unlock') {
      return success ? <Unlock className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-600" />
    } else {
      return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Lock Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {lockStatus.isLocked ? (
              <Lock className="w-5 h-5 text-red-600" />
            ) : (
              <Unlock className="w-5 h-5 text-green-600" />
            )}
            Wallet Lock Status
          </CardTitle>
          <CardDescription>
            {lockStatus.isLocked ? 'This wallet is currently locked' : 'This wallet is currently unlocked'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lockStatus.isLocked ? (
              <Alert className="border-red-200 bg-red-50">
                <Lock className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-red-800">Wallet is locked</strong>
                      {lockStatus.lockType && (
                        <Badge className={getLockTypeColor(lockStatus.lockType)}>
                          {lockStatus.lockType.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    {lockStatus.reason && (
                      <p className="text-red-700 text-sm">Reason: {lockStatus.reason}</p>
                    )}
                    {lockStatus.lockedAt && (
                      <p className="text-red-700 text-sm">
                        Locked at: {new Date(lockStatus.lockedAt).toLocaleString()}
                      </p>
                    )}
                    {lockStatus.unlockTime && (
                      <p className="text-red-700 text-sm">
                        Scheduled unlock: {new Date(lockStatus.unlockTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <Unlock className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong className="text-green-800">Wallet is unlocked and operational</strong>
                </AlertDescription>
              </Alert>
            )}

            {/* Guardian Approval Status */}
            {lockStatus.isLocked && lockStatus.guardianApprovals && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Guardian Approvals Required
                </h4>
                <div className="space-y-2">
                  {lockStatus.guardianApprovals.map((approval, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="font-mono">
                        Guardian {index + 1}: {approval.guardianAddress.slice(0, 10)}...{approval.guardianAddress.slice(-8)}
                      </span>
                      {approval.approved ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approved</span>
                          {approval.timestamp && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(approval.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Demo Button for Guardian Approval */}
                  {lockStatus.guardianApprovals.some(a => !a.approved) && (
                    <Button
                      onClick={handleSimulateGuardianApproval}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Simulate Guardian Approval
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {lockStatus.isLocked ? (
                <Button
                  onClick={handleRequestUnlock}
                  disabled={loading || (!lockStatus.canUnlock && lockStatus.requiresGuardianApproval)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      {lockStatus.requiresGuardianApproval && !lockStatus.canUnlock ? 'Request Unlock' : 'Unlock Wallet'}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setShowLockForm(!showLockForm)}
                  variant="destructive"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Emergency Lock
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Lock Form */}
      {showLockForm && !lockStatus.isLocked && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Emergency Lock Wallet
            </CardTitle>
            <CardDescription>
              Lock your wallet immediately to prevent unauthorized access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Lock Type</Label>
              <Select value={lockType} onValueChange={(value) => setLockType(value as typeof lockType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Emergency Lock</SelectItem>
                  <SelectItem value="security">Security Lock</SelectItem>
                  <SelectItem value="maintenance">Maintenance Lock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lockType === 'maintenance' && (
              <div className="space-y-2">
                <Label>Auto-unlock Duration (hours)</Label>
                <Select value={unlockDuration} onValueChange={setUnlockDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="Describe why you're locking the wallet"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                rows={3}
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Locking your wallet will prevent all transactions until unlocked.
                {wallet.security.guardianCount > 0 && ' Guardian approval will be required to unlock.'}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={handleEmergencyLock} disabled={loading} variant="destructive">
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Locking...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Lock Wallet
                  </>
                )}
              </Button>
              <Button onClick={() => setShowLockForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Events Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Security Events
          </CardTitle>
          <CardDescription>
            Recent lock/unlock events and security activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No security events recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getEventIcon(event.type, event.success)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">
                          {event.type.replace('_', ' ')}
                        </span>
                        {event.success ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">Success</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 text-xs">Failed</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.reason}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      Triggered by: {event.triggeredBy}
                    </div>
                    {event.details && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Details: {JSON.stringify(event.details)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
