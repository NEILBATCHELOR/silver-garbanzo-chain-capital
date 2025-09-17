import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Key, 
  Plus, 
  Trash2, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit,
  RefreshCw,
  Coins,
  Timer
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { sessionKeyApiService, SessionKey, SessionKeyPermissions } from '../../../services/wallet/SessionKeyApiService'

// Simple DateRange type to replace missing date-range-picker
interface DateRange {
  from?: Date
  to?: Date
}

export function SessionKeyManager() {
  const { address: walletAddress, isConnected } = useAccount()
  
  // State management
  const [sessionKeys, setSessionKeys] = useState<SessionKey[]>([])
  const [newSessionKeyDialog, setNewSessionKeyDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // New session key form state
  const [newSessionKey, setNewSessionKey] = useState({
    spendingLimit: '',
    dailyLimit: '',
    allowedContracts: '',
    validityStart: '',
    validityEnd: '',
    allowedFunctions: '',
    enableTimeRestrictions: false,
    startHour: '9',
    endHour: '17',
    allowedDays: [1, 2, 3, 4, 5] // Monday to Friday
  })

  // Load session keys on component mount
  useEffect(() => {
    if (isConnected && walletAddress) {
      loadSessionKeys()
    }
  }, [isConnected, walletAddress])

  const loadSessionKeys = async () => {
    if (!walletAddress) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await sessionKeyApiService.getSessionKeysForWallet(walletAddress)
      
      if (response.success && response.data) {
        setSessionKeys(response.data)
      } else {
        setError(response.error || 'Failed to load session keys')
      }
    } catch (error) {
      setError('Network error loading session keys')
      console.error('Failed to load session keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createSessionKey = async () => {
    if (!walletAddress) return

    // Validate form fields
    if (!newSessionKey.spendingLimit || !newSessionKey.dailyLimit) {
      setError('Spending limit and daily limit are required')
      return
    }

    if (!newSessionKey.validityStart || !newSessionKey.validityEnd) {
      setError('Validity period is required')
      return
    }

    if (!newSessionKey.allowedContracts.trim()) {
      setError('At least one allowed contract address is required')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const permissions: SessionKeyPermissions = {
        maxSpendingAmount: BigInt(parseFloat(newSessionKey.spendingLimit) * 1e18),
        dailySpendingLimit: BigInt(parseFloat(newSessionKey.dailyLimit) * 1e18),
        allowedContracts: newSessionKey.allowedContracts
          .split(',')
          .map(addr => addr.trim())
          .filter(addr => addr.length > 0),
        allowedFunctions: newSessionKey.allowedFunctions
          .split(',')
          .map(func => func.trim())
          .filter(func => func.length > 0),
        timeRestrictions: newSessionKey.enableTimeRestrictions ? {
          startHour: parseInt(newSessionKey.startHour),
          endHour: parseInt(newSessionKey.endHour),
          allowedDays: newSessionKey.allowedDays
        } : undefined
      }

      const response = await sessionKeyApiService.createSessionKey({
        walletId: walletAddress,
        permissions,
        validityPeriod: {
          start: new Date(newSessionKey.validityStart),
          end: new Date(newSessionKey.validityEnd)
        }
      })

      if (response.success) {
        // Refresh the list
        await loadSessionKeys()
        setNewSessionKeyDialog(false)
        resetForm()
      } else {
        setError(response.error || 'Failed to create session key')
      }
    } catch (error) {
      setError('Network error creating session key')
      console.error('Failed to create session key:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const revokeSessionKey = async (sessionKeyId: string) => {
    if (!confirm('Are you sure you want to revoke this session key? This action cannot be undone.')) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await sessionKeyApiService.revokeSessionKey(sessionKeyId)
      
      if (response.success) {
        await loadSessionKeys()
      } else {
        setError(response.error || 'Failed to revoke session key')
      }
    } catch (error) {
      setError('Network error revoking session key')
      console.error('Failed to revoke session key:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setNewSessionKey({
      spendingLimit: '',
      dailyLimit: '',
      allowedContracts: '',
      validityStart: '',
      validityEnd: '',
      allowedFunctions: '',
      enableTimeRestrictions: false,
      startHour: '9',
      endHour: '17',
      allowedDays: [1, 2, 3, 4, 5]
    })
  }

  const formatAmount = (amount?: bigint) => {
    if (!amount) return 'N/A'
    return `${(Number(amount) / 1e18).toFixed(4)} ETH`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-yellow-100 text-yellow-800'
      case 'revoked': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateDaysRemaining = (endDate: Date) => {
    const now = new Date()
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Session Key Management
          </CardTitle>
          <CardDescription>
            Create and manage session keys for seamless transaction experiences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to manage session keys.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header with Create Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Session Key Management
              </CardTitle>
              <CardDescription>
                Create and manage session keys for seamless transaction experiences
              </CardDescription>
            </div>
            <Dialog open={newSessionKeyDialog} onOpenChange={setNewSessionKeyDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Session Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Session Key</DialogTitle>
                  <DialogDescription>
                    Set up a new session key with specific permissions and time limits
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Spending Limits */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Spending Limits</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="spendingLimit">Total Spending Limit (ETH)</Label>
                        <Input
                          id="spendingLimit"
                          type="number"
                          placeholder="1.0"
                          value={newSessionKey.spendingLimit}
                          onChange={(e) => setNewSessionKey(prev => ({ ...prev, spendingLimit: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dailyLimit">Daily Limit (ETH)</Label>
                        <Input
                          id="dailyLimit"
                          type="number"
                          placeholder="0.1"
                          value={newSessionKey.dailyLimit}
                          onChange={(e) => setNewSessionKey(prev => ({ ...prev, dailyLimit: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contract Permissions */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Contract Permissions</h3>
                    <div className="space-y-2">
                      <Label htmlFor="allowedContracts">Allowed Contract Addresses</Label>
                      <Input
                        id="allowedContracts"
                        placeholder="0x1234..., 0x5678..."
                        value={newSessionKey.allowedContracts}
                        onChange={(e) => setNewSessionKey(prev => ({ ...prev, allowedContracts: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allowedFunctions">Allowed Function Selectors</Label>
                      <Input
                        id="allowedFunctions"
                        placeholder="0xa9059cbb, 0x23b872dd"
                        value={newSessionKey.allowedFunctions}
                        onChange={(e) => setNewSessionKey(prev => ({ ...prev, allowedFunctions: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Validity Period */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Validity Period</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="validityStart">Start Date</Label>
                        <Input
                          id="validityStart"
                          type="datetime-local"
                          value={newSessionKey.validityStart}
                          onChange={(e) => setNewSessionKey(prev => ({ ...prev, validityStart: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validityEnd">End Date</Label>
                        <Input
                          id="validityEnd"
                          type="datetime-local"
                          value={newSessionKey.validityEnd}
                          onChange={(e) => setNewSessionKey(prev => ({ ...prev, validityEnd: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Time Restrictions */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enableTimeRestrictions"
                        checked={newSessionKey.enableTimeRestrictions}
                        onCheckedChange={(checked) => setNewSessionKey(prev => ({ ...prev, enableTimeRestrictions: checked }))}
                      />
                      <Label htmlFor="enableTimeRestrictions">Enable Time Restrictions</Label>
                    </div>
                    
                    {newSessionKey.enableTimeRestrictions && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startHour">Start Hour (24h)</Label>
                          <Select value={newSessionKey.startHour} onValueChange={(value) => setNewSessionKey(prev => ({ ...prev, startHour: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>{i}:00</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endHour">End Hour (24h)</Label>
                          <Select value={newSessionKey.endHour} onValueChange={(value) => setNewSessionKey(prev => ({ ...prev, endHour: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>{i}:00</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setNewSessionKeyDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createSessionKey} disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Session Key'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Session Keys List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Loading session keys...
              </div>
            </CardContent>
          </Card>
        ) : sessionKeys.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Key className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Session Keys</h3>
                <p className="text-gray-500">Create your first session key to enable seamless transactions.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          sessionKeys.map((sessionKey) => (
            <Card key={sessionKey.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Key className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        Session Key #{sessionKey.id.slice(0, 8)}...
                      </CardTitle>
                      <CardDescription>
                        {sessionKey.sessionKeyAddress.slice(0, 10)}...{sessionKey.sessionKeyAddress.slice(-8)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={getStatusColor(sessionKey.status)}>
                      {sessionKey.status}
                    </Badge>
                    {sessionKey.status === 'active' && (
                      <Button variant="destructive" size="sm" onClick={() => revokeSessionKey(sessionKey.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Spending Limit</Label>
                    <p className="text-sm font-mono">{formatAmount(sessionKey.spendingLimit)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Daily Limit</Label>
                    <p className="text-sm font-mono">{formatAmount(sessionKey.dailyLimit)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Usage Count</Label>
                    <p className="text-sm font-mono">{sessionKey.usageCount}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Days Remaining</Label>
                    <p className="text-sm font-mono">{calculateDaysRemaining(sessionKey.validityEnd)}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-sm font-medium text-gray-500">Allowed Contracts</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sessionKey.allowedTargets.map((contract, index) => (
                      <Badge key={index} variant="outline" className="text-xs font-mono">
                        {contract.slice(0, 6)}...{contract.slice(-4)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
