/**
 * Social Recovery Interface
 * 
 * Provides interface for managing social recovery with guardians
 * Integrates with existing guardian system and smart contract wallets
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Key,
  UserPlus,
  UserMinus,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ExternalLink
} from 'lucide-react'
import { useAccount } from 'wagmi'

// Types based on existing guardian system
export interface Guardian {
  id: string;
  address: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'wallet' | 'email' | 'phone' | 'hardware';
  status: 'pending' | 'active' | 'suspended';
  addedAt: Date;
  lastActivity?: Date;
}

export interface RecoveryProcess {
  id: string;
  initiatorAddress: string;
  newOwner: string;
  guardiansRequired: number;
  guardiansApproved: Guardian[];
  guardiansRejected: Guardian[];
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled';
  createdAt: Date;
  executeAfter: Date;
  expiresAt: Date;
}

export interface GuardianPolicy {
  minGuardians: number;
  recoveryThreshold: number;
  recoveryDelay: number; // hours
  guardianAddDelay: number; // hours
  maxGuardians: number;
}

export interface RecoveryRequest {
  newOwnerAddress: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
}

export function SocialRecoveryInterface() {
  // Wallet connection
  const { address: walletAddress, isConnected } = useAccount()

  // State management
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [policy, setPolicy] = useState<GuardianPolicy>({
    minGuardians: 3,
    recoveryThreshold: 2, // 2 out of 3
    recoveryDelay: 24, // 24 hours
    guardianAddDelay: 24,
    maxGuardians: 5
  })
  
  // Recovery state
  const [activeRecovery, setActiveRecovery] = useState<RecoveryProcess | null>(null)
  const [recoveryRequest, setRecoveryRequest] = useState<RecoveryRequest>({
    newOwnerAddress: '',
    reason: '',
    urgency: 'medium'
  })
  
  // Guardian management
  const [newGuardian, setNewGuardian] = useState({
    address: '',
    name: '',
    email: '',
    phone: '',
    type: 'wallet' as Guardian['type']
  })
  
  // UI state
  const [currentTab, setCurrentTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAddGuardian, setShowAddGuardian] = useState(false)
  const [showPrivateInfo, setShowPrivateInfo] = useState(false)

  // Load guardians
  const loadGuardians = useCallback(async () => {
    if (!walletAddress) return

    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/wallet/guardians?wallet=${walletAddress}`)
      const data = await response.json()

      if (data.success) {
        setGuardians(data.data.guardians || [])
        if (data.data.policy) {
          setPolicy(data.data.policy)
        }
      }
    } catch (error) {
      console.warn('Failed to load guardians:', error)
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress])

  // Load active recovery
  const loadActiveRecovery = useCallback(async () => {
    if (!walletAddress) return

    try {
      const response = await fetch(`/api/wallet/recovery/active?wallet=${walletAddress}`)
      const data = await response.json()

      if (data.success && data.data.recovery) {
        setActiveRecovery(data.data.recovery)
      }
    } catch (error) {
      console.warn('Failed to load active recovery:', error)
    }
  }, [walletAddress])

  // Add guardian
  const addGuardian = async () => {
    if (!newGuardian.address || !newGuardian.name) {
      setError('Address and name are required')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/wallet/guardians/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress,
          guardian: newGuardian
        })
      })

      const data = await response.json()

      if (data.success) {
        await loadGuardians()
        setShowAddGuardian(false)
        setNewGuardian({
          address: '',
          name: '',
          email: '',
          phone: '',
          type: 'wallet'
        })
      } else {
        throw new Error(data.message || 'Failed to add guardian')
      }

    } catch (error) {
      setError(`Failed to add guardian: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Remove guardian
  const removeGuardian = async (guardianId: string) => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/wallet/guardians/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress,
          guardianId
        })
      })

      const data = await response.json()

      if (data.success) {
        await loadGuardians()
      } else {
        throw new Error(data.message || 'Failed to remove guardian')
      }

    } catch (error) {
      setError(`Failed to remove guardian: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Initiate recovery
  const initiateRecovery = async () => {
    if (!recoveryRequest.newOwnerAddress || !recoveryRequest.reason) {
      setError('New owner address and reason are required')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/wallet/recovery/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress,
          request: recoveryRequest
        })
      })

      const data = await response.json()

      if (data.success) {
        await loadActiveRecovery()
        setCurrentTab('recovery')
        setRecoveryRequest({
          newOwnerAddress: '',
          reason: '',
          urgency: 'medium'
        })
      } else {
        throw new Error(data.message || 'Failed to initiate recovery')
      }

    } catch (error) {
      setError(`Failed to initiate recovery: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Guardian approval/rejection
  const handleGuardianResponse = async (processId: string, approve: boolean) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/wallet/recovery/guardian-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processId,
          guardianAddress: walletAddress,
          approved: approve
        })
      })

      const data = await response.json()

      if (data.success) {
        await loadActiveRecovery()
      } else {
        throw new Error(data.message || 'Failed to submit response')
      }

    } catch (error) {
      setError(`Failed to submit guardian response: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Effects
  useEffect(() => {
    if (isConnected && walletAddress) {
      loadGuardians()
      loadActiveRecovery()
    }
  }, [isConnected, walletAddress, loadGuardians, loadActiveRecovery])

  // Helper functions
  const getGuardianIcon = (type: Guardian['type']) => {
    switch (type) {
      case 'wallet': return <Key className="w-4 h-4" />
      case 'email': return <Mail className="w-4 h-4" />
      case 'phone': return <Phone className="w-4 h-4" />
      case 'hardware': return <Shield className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="secondary">Active</Badge>
      case 'pending': return <Badge variant="outline">Pending</Badge>
      case 'suspended': return <Badge variant="destructive">Suspended</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const formatTimeRemaining = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    
    if (diff <= 0) return 'Now'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }

  const isRecoveryExecutable = () => {
    return activeRecovery && 
           activeRecovery.guardiansApproved.length >= policy.recoveryThreshold &&
           new Date() >= new Date(activeRecovery.executeAfter) &&
           activeRecovery.status === 'approved'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Social Recovery
          </CardTitle>
          <CardDescription>
            Manage guardians and recover your account without seed phrases
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="guardians">Guardians ({guardians.length})</TabsTrigger>
          <TabsTrigger value="recovery" className={activeRecovery ? 'bg-orange-50' : ''}>
            Recovery
            {activeRecovery && <Badge variant="outline" className="ml-1">Active</Badge>}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Security Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{guardians.filter(g => g.status === 'active').length}</div>
                  <div className="text-sm text-muted-foreground">Active Guardians</div>
                  <div className="text-xs text-muted-foreground">
                    of {policy.recoveryThreshold} required
                  </div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {activeRecovery ? (
                      <span className="text-orange-600">Active</span>
                    ) : (
                      <span className="text-green-600">Secure</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">Recovery Status</div>
                  <div className="text-xs text-muted-foreground">
                    {activeRecovery ? 'Recovery in progress' : 'No active recovery'}
                  </div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{policy.recoveryDelay}h</div>
                  <div className="text-sm text-muted-foreground">Recovery Delay</div>
                  <div className="text-xs text-muted-foreground">
                    Time before execution
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {guardians.filter(g => g.status === 'active').length < policy.recoveryThreshold && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You need at least {policy.recoveryThreshold} active guardians for recovery. Currently have {guardians.filter(g => g.status === 'active').length}.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                <Button onClick={() => setCurrentTab('guardians')}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Manage Guardians
                </Button>
                
                {!activeRecovery && (
                  <Button variant="outline" onClick={() => setCurrentTab('recovery')}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Start Recovery
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guardians Tab */}
        <TabsContent value="guardians" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Guardians ({guardians.length}/{policy.maxGuardians})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPrivateInfo(!showPrivateInfo)}
                  >
                    {showPrivateInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button onClick={() => setShowAddGuardian(true)} disabled={guardians.length >= policy.maxGuardians}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Guardian
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {guardians.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Guardians Added</h3>
                  <p className="text-muted-foreground mb-4">
                    Add trusted contacts to help recover your account
                  </p>
                  <Button onClick={() => setShowAddGuardian(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Your First Guardian
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {guardians.map((guardian) => (
                    <div key={guardian.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getGuardianIcon(guardian.type)}
                          <div>
                            <div className="font-medium">{guardian.name}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {guardian.address.slice(0, 8)}...{guardian.address.slice(-6)}
                            </div>
                            {showPrivateInfo && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {guardian.email && <div>📧 {guardian.email}</div>}
                                {guardian.phone && <div>📱 {guardian.phone}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusBadge(guardian.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGuardian(guardian.id)}
                            disabled={guardians.filter(g => g.status === 'active').length <= policy.minGuardians}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        Added {guardian.addedAt.toLocaleDateString()}
                        {guardian.lastActivity && (
                          <span className="ml-4">
                            Last active {guardian.lastActivity.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Guardian Dialog */}
          <Dialog open={showAddGuardian} onOpenChange={setShowAddGuardian}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Guardian</DialogTitle>
                <DialogDescription>
                  Add a trusted contact who can help recover your account
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Guardian Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['wallet', 'email', 'phone', 'hardware'].map((type) => (
                      <Button
                        key={type}
                        variant={newGuardian.type === type ? 'default' : 'outline'}
                        onClick={() => setNewGuardian({...newGuardian, type: type as Guardian['type']})}
                        className="flex items-center gap-2"
                      >
                        {getGuardianIcon(type as Guardian['type'])}
                        <span className="capitalize">{type}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guardian-name">Name</Label>
                  <Input
                    id="guardian-name"
                    value={newGuardian.name}
                    onChange={(e) => setNewGuardian({...newGuardian, name: e.target.value})}
                    placeholder="Guardian name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guardian-address">Wallet Address</Label>
                  <Input
                    id="guardian-address"
                    value={newGuardian.address}
                    onChange={(e) => setNewGuardian({...newGuardian, address: e.target.value})}
                    placeholder="0x..."
                  />
                </div>
                
                {newGuardian.type === 'email' && (
                  <div className="space-y-2">
                    <Label htmlFor="guardian-email">Email (Optional)</Label>
                    <Input
                      id="guardian-email"
                      type="email"
                      value={newGuardian.email}
                      onChange={(e) => setNewGuardian({...newGuardian, email: e.target.value})}
                      placeholder="guardian@example.com"
                    />
                  </div>
                )}
                
                {newGuardian.type === 'phone' && (
                  <div className="space-y-2">
                    <Label htmlFor="guardian-phone">Phone (Optional)</Label>
                    <Input
                      id="guardian-phone"
                      type="tel"
                      value={newGuardian.phone}
                      onChange={(e) => setNewGuardian({...newGuardian, phone: e.target.value})}
                      placeholder="+1234567890"
                    />
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddGuardian(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addGuardian} disabled={isLoading}>
                    {isLoading ? 'Adding...' : 'Add Guardian'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Recovery Tab */}
        <TabsContent value="recovery" className="space-y-4">
          {activeRecovery ? (
            /* Active Recovery Process */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-orange-500" />
                  Active Recovery Process
                </CardTitle>
                <CardDescription>
                  Recovery initiated for this account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recovery Status */}
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-orange-800">Recovery in Progress</span>
                  </div>
                  <div className="text-sm text-orange-700">
                    New owner: <span className="font-mono">{activeRecovery.newOwner}</span>
                  </div>
                  <div className="text-sm text-orange-700 mt-1">
                    Initiated: {new Date(activeRecovery.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Guardian Approvals</span>
                    <span>
                      {activeRecovery.guardiansApproved.length} of {policy.recoveryThreshold} required
                    </span>
                  </div>
                  <Progress 
                    value={(activeRecovery.guardiansApproved.length / policy.recoveryThreshold) * 100}
                    className="h-2"
                  />
                </div>

                {/* Guardian Responses */}
                <div>
                  <h4 className="font-medium mb-3">Guardian Responses</h4>
                  <div className="space-y-2">
                    {guardians.map((guardian) => {
                      const approved = activeRecovery.guardiansApproved.find(g => g.id === guardian.id)
                      const rejected = activeRecovery.guardiansRejected.find(g => g.id === guardian.id)
                      
                      return (
                        <div key={guardian.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            {getGuardianIcon(guardian.type)}
                            <span>{guardian.name}</span>
                          </div>
                          
                          <div>
                            {approved && (
                              <Badge variant="secondary">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                            {rejected && (
                              <Badge variant="destructive">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Rejected
                              </Badge>
                            )}
                            {!approved && !rejected && (
                              <Badge variant="outline">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Execution Status */}
                {activeRecovery.guardiansApproved.length >= policy.recoveryThreshold && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Ready for Execution</span>
                    </div>
                    <div className="text-sm text-green-700">
                      {isRecoveryExecutable() ? (
                        'Recovery can be executed now'
                      ) : (
                        `Can execute in: ${formatTimeRemaining(new Date(activeRecovery.executeAfter))}`
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isRecoveryExecutable() && (
                    <Button>
                      Execute Recovery
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  
                  <Button variant="outline" onClick={loadActiveRecovery}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Initiate Recovery */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Initiate Account Recovery
                </CardTitle>
                <CardDescription>
                  Start the recovery process to regain access to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Recovery requires approval from {policy.recoveryThreshold} out of {guardians.filter(g => g.status === 'active').length} active guardians.
                    There will be a {policy.recoveryDelay} hour delay before execution.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-owner">New Owner Address</Label>
                    <Input
                      id="new-owner"
                      value={recoveryRequest.newOwnerAddress}
                      onChange={(e) => setRecoveryRequest({
                        ...recoveryRequest,
                        newOwnerAddress: e.target.value
                      })}
                      placeholder="0x... (address that will control the account)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Recovery</Label>
                    <Input
                      id="reason"
                      value={recoveryRequest.reason}
                      onChange={(e) => setRecoveryRequest({
                        ...recoveryRequest,
                        reason: e.target.value
                      })}
                      placeholder="Lost access to private key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Urgency Level</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['low', 'medium', 'high', 'emergency'] as const).map((level) => (
                        <Button
                          key={level}
                          variant={recoveryRequest.urgency === level ? 'default' : 'outline'}
                          onClick={() => setRecoveryRequest({
                            ...recoveryRequest,
                            urgency: level
                          })}
                          className={`capitalize ${getUrgencyColor(level)}`}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={initiateRecovery}
                    disabled={!recoveryRequest.newOwnerAddress || !recoveryRequest.reason || isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Initiating...' : 'Initiate Recovery'}
                    <Send className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Policy Settings</CardTitle>
              <CardDescription>
                Configure how social recovery works for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Guardians</Label>
                  <Input
                    type="number"
                    value={policy.minGuardians}
                    onChange={(e) => setPolicy({
                      ...policy,
                      minGuardians: parseInt(e.target.value) || 1
                    })}
                    min={1}
                    max={10}
                  />
                  <div className="text-xs text-muted-foreground">
                    Minimum number of guardians required
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Recovery Threshold</Label>
                  <Input
                    type="number"
                    value={policy.recoveryThreshold}
                    onChange={(e) => setPolicy({
                      ...policy,
                      recoveryThreshold: parseInt(e.target.value) || 1
                    })}
                    min={1}
                    max={policy.maxGuardians}
                  />
                  <div className="text-xs text-muted-foreground">
                    Guardians needed to approve recovery
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Recovery Delay (hours)</Label>
                  <Input
                    type="number"
                    value={policy.recoveryDelay}
                    onChange={(e) => setPolicy({
                      ...policy,
                      recoveryDelay: parseInt(e.target.value) || 1
                    })}
                    min={1}
                    max={168} // 1 week max
                  />
                  <div className="text-xs text-muted-foreground">
                    Time delay before execution
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Maximum Guardians</Label>
                  <Input
                    type="number"
                    value={policy.maxGuardians}
                    onChange={(e) => setPolicy({
                      ...policy,
                      maxGuardians: parseInt(e.target.value) || 5
                    })}
                    min={policy.minGuardians}
                    max={20}
                  />
                  <div className="text-xs text-muted-foreground">
                    Maximum guardians allowed
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
