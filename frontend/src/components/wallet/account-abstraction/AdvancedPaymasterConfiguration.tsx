'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Fuel, 
  Settings, 
  Plus, 
  Trash2, 
  Clock, 
  Shield, 
  Users,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit
} from 'lucide-react'
import { 
  paymasterApiService, 
  PaymasterPolicy, 
  PaymasterConfiguration,
  CreatePaymasterPolicyRequest 
} from '../../../services/wallet/PaymasterApiService'

export function AdvancedPaymasterConfiguration() {
  // State management
  const [paymasters, setPaymasters] = useState<PaymasterConfiguration[]>([])
  const [selectedPaymaster, setSelectedPaymaster] = useState<string>('')
  const [newPolicyDialog, setNewPolicyDialog] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<PaymasterPolicy | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New policy form state
  const [newPolicy, setNewPolicy] = useState({
    policyName: '',
    policyType: 'spending_limit' as PaymasterPolicy['policyType'],
    dailyLimit: '',
    monthlyLimit: '',
    whitelistedAddresses: '',
    timeRestrictions: {
      startHour: 0,
      endHour: 23,
      allowedDays: [0, 1, 2, 3, 4, 5, 6]
    }
  })

  // Load paymaster data on component mount
  useEffect(() => {
    loadPaymasterData()
  }, [])

  const loadPaymasterData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await paymasterApiService.getPaymasterConfigurations()
      
      if (response.success && response.data) {
        setPaymasters(response.data)
        setSelectedPaymaster(response.data[0]?.paymasterAddress || '')
      } else {
        setError(response.error || 'Failed to load paymaster configurations')
      }
    } catch (error) {
      setError('Network error loading paymaster data')
      console.error('Failed to load paymaster data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePolicy = async () => {
    try {
      // Validate form
      if (!newPolicy.policyName.trim()) {
        setError('Policy name is required')
        return
      }

      if (!selectedPaymaster) {
        setError('Please select a paymaster')
        return
      }

      setIsLoading(true)
      setError(null)

      const request: CreatePaymasterPolicyRequest = {
        policyName: newPolicy.policyName,
        paymasterAddress: selectedPaymaster,
        chainId: 1,
        policyType: newPolicy.policyType,
        policyConfig: {},
        dailyLimit: newPolicy.dailyLimit ? BigInt(newPolicy.dailyLimit) : undefined,
        monthlyLimit: newPolicy.monthlyLimit ? BigInt(newPolicy.monthlyLimit) : undefined,
        whitelistedAddresses: newPolicy.whitelistedAddresses
          .split(',')
          .map(addr => addr.trim())
          .filter(addr => addr.length > 0),
        blacklistedAddresses: [],
        allowedFunctions: [],
        timeRestrictions: newPolicy.timeRestrictions
      }

      const response = await paymasterApiService.createPolicy(request)

      if (response.success) {
        // Refresh the data
        await loadPaymasterData()
        
        // Reset form and close dialog
        setNewPolicy({
          policyName: '',
          policyType: 'spending_limit',
          dailyLimit: '',
          monthlyLimit: '',
          whitelistedAddresses: '',
          timeRestrictions: {
            startHour: 0,
            endHour: 23,
            allowedDays: [0, 1, 2, 3, 4, 5, 6]
          }
        })
        setNewPolicyDialog(false)
      } else {
        setError(response.error || 'Failed to create policy')
      }
    } catch (error) {
      setError('Network error creating policy')
      console.error('Failed to create policy:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTogglePolicy = async (policyId: string, isActive: boolean) => {
    try {
      setError(null)
      const response = await paymasterApiService.togglePolicy(policyId, isActive)
      
      if (response.success) {
        await loadPaymasterData() // Refresh data
      } else {
        setError(response.error || 'Failed to toggle policy')
      }
    } catch (error) {
      setError('Network error toggling policy')
      console.error('Failed to toggle policy:', error)
    }
  }

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) {
      return
    }

    try {
      setError(null)
      const response = await paymasterApiService.deletePolicy(policyId)
      
      if (response.success) {
        await loadPaymasterData() // Refresh data
      } else {
        setError(response.error || 'Failed to delete policy')
      }
    } catch (error) {
      setError('Network error deleting policy')
      console.error('Failed to delete policy:', error)
    }
  }

  const formatEther = (wei: bigint) => {
    return (Number(wei) / 10**18).toFixed(4)
  }

  const getPolicyTypeIcon = (type: string) => {
    switch (type) {
      case 'whitelist': return <Users className="w-4 h-4" />
      case 'rate_limit': return <Clock className="w-4 h-4" />
      case 'spending_limit': return <Fuel className="w-4 h-4" />
      case 'time_based': return <Clock className="w-4 h-4" />
      default: return <Shield className="w-4 h-4" />
    }
  }

  const getPolicyTypeColor = (type: string) => {
    switch (type) {
      case 'whitelist': return 'bg-blue-100 text-blue-800'
      case 'rate_limit': return 'bg-yellow-100 text-yellow-800'
      case 'spending_limit': return 'bg-green-100 text-green-800'
      case 'time_based': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const selectedPaymasterData = paymasters.find(p => p.paymasterAddress === selectedPaymaster)

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Paymaster Configuration</h2>
          <p className="text-muted-foreground">
            Configure sophisticated sponsorship rules and policies
          </p>
        </div>
      </div>

      <Tabs defaultValue="policies" className="w-full">
        <TabsList>
          <TabsTrigger value="policies">Sponsorship Policies</TabsTrigger>
          <TabsTrigger value="paymasters">Paymaster Management</TabsTrigger>
          <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
        </TabsList>

        {/* Sponsorship Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Sponsorship Policies
                  </CardTitle>
                  <CardDescription>
                    Configure rules that determine when transactions should be sponsored
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedPaymaster} onValueChange={setSelectedPaymaster}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select paymaster" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymasters.map((paymaster) => (
                        <SelectItem key={paymaster.paymasterAddress} value={paymaster.paymasterAddress}>
                          {paymaster.paymasterName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Dialog open={newPolicyDialog} onOpenChange={setNewPolicyDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Policy
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Sponsorship Policy</DialogTitle>
                        <DialogDescription>
                          Define rules for when transactions should be sponsored
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Policy Name</Label>
                          <Input
                            value={newPolicy.policyName}
                            onChange={(e) => setNewPolicy(prev => ({ ...prev, policyName: e.target.value }))}
                            placeholder="e.g., VIP Users Policy"
                          />
                        </div>

                        <div>
                          <Label>Policy Type</Label>
                          <Select 
                            value={newPolicy.policyType} 
                            onValueChange={(value) => setNewPolicy(prev => ({ 
                              ...prev, 
                              policyType: value as PaymasterPolicy['policyType'] 
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="whitelist">Whitelist Addresses</SelectItem>
                              <SelectItem value="spending_limit">Spending Limits</SelectItem>
                              <SelectItem value="rate_limit">Rate Limiting</SelectItem>
                              <SelectItem value="time_based">Time Restrictions</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {newPolicy.policyType === 'spending_limit' && (
                          <>
                            <div>
                              <Label>Daily Limit (Wei)</Label>
                              <Input
                                value={newPolicy.dailyLimit}
                                onChange={(e) => setNewPolicy(prev => ({ ...prev, dailyLimit: e.target.value }))}
                                placeholder="1000000000000000000"
                              />
                            </div>
                            <div>
                              <Label>Monthly Limit (Wei)</Label>
                              <Input
                                value={newPolicy.monthlyLimit}
                                onChange={(e) => setNewPolicy(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                                placeholder="30000000000000000000"
                              />
                            </div>
                          </>
                        )}

                        {newPolicy.policyType === 'whitelist' && (
                          <div>
                            <Label>Whitelisted Addresses</Label>
                            <Textarea
                              value={newPolicy.whitelistedAddresses}
                              onChange={(e) => setNewPolicy(prev => ({ ...prev, whitelistedAddresses: e.target.value }))}
                              placeholder="0x123..., 0x456..."
                              rows={3}
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setNewPolicyDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreatePolicy}>
                            Create Policy
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedPaymasterData?.policies.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No policies configured</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first sponsorship policy to start managing transaction sponsorship
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedPaymasterData?.policies.map((policy) => (
                    <div key={policy.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getPolicyTypeIcon(policy.policyType)}
                          <div>
                            <p className="font-medium">{policy.policyName}</p>
                            <p className="text-sm text-muted-foreground">
                              Created {policy.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPolicyTypeColor(policy.policyType)}>
                            {policy.policyType.replace('_', ' ')}
                          </Badge>
                          <Switch
                            checked={policy.isActive}
                            onCheckedChange={(checked) => handleTogglePolicy(policy.id, checked)}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingPolicy(policy)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeletePolicy(policy.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Policy Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t text-sm">
                        {policy.dailyLimit && (
                          <div>
                            <p className="text-muted-foreground">Daily Limit</p>
                            <p className="font-medium">{formatEther(policy.dailyLimit)} ETH</p>
                          </div>
                        )}
                        {policy.monthlyLimit && (
                          <div>
                            <p className="text-muted-foreground">Monthly Limit</p>
                            <p className="font-medium">{formatEther(policy.monthlyLimit)} ETH</p>
                          </div>
                        )}
                        {policy.whitelistedAddresses.length > 0 && (
                          <div>
                            <p className="text-muted-foreground">Whitelisted</p>
                            <p className="font-medium">{policy.whitelistedAddresses.length} addresses</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium flex items-center gap-1">
                            {policy.isActive ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                Active
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                Inactive
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Paymaster Management Tab */}
        <TabsContent value="paymasters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="w-5 h-5" />
                Paymaster Overview
              </CardTitle>
              <CardDescription>
                Monitor paymaster budgets and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paymasters.map((paymaster) => (
                  <Card key={paymaster.paymasterAddress} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{paymaster.paymasterName}</h3>
                        <Badge 
                          variant={paymaster.isActive ? 'default' : 'secondary'}
                          className={paymaster.isActive ? 'bg-green-100 text-green-800' : ''}
                        >
                          {paymaster.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Daily Budget Usage</span>
                            <span className="font-medium">
                              {formatEther(paymaster.dailyBudget - paymaster.remainingBudget)} / {formatEther(paymaster.dailyBudget)} ETH
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (Number(paymaster.dailyBudget - paymaster.remainingBudget) / Number(paymaster.dailyBudget)) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Sponsored</p>
                            <p className="font-medium">{formatEther(paymaster.totalSponsored)} ETH</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Success Rate</p>
                            <p className="font-medium">{paymaster.successRate.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Active Policies</p>
                            <p className="font-medium">{paymaster.policies.filter(p => p.isActive).length}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Chain</p>
                            <p className="font-medium">
                              {paymaster.chainId === 1 ? 'Ethereum' : `Chain ${paymaster.chainId}`}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <Button variant="outline" size="sm" className="w-full">
                            <Settings className="w-4 h-4 mr-2" />
                            Configure Paymaster
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usage Analytics
              </CardTitle>
              <CardDescription>
                Sponsorship patterns and policy effectiveness
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Sponsored</p>
                        <p className="text-2xl font-bold">2,847</p>
                        <p className="text-xs text-muted-foreground">transactions</p>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Cost Saved</p>
                        <p className="text-2xl font-bold">12.3 ETH</p>
                        <p className="text-xs text-muted-foreground">for users</p>
                      </div>
                      <Fuel className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Policy Efficiency</p>
                        <p className="text-2xl font-bold">94.2%</p>
                        <p className="text-xs text-muted-foreground">approval rate</p>
                      </div>
                      <Shield className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Detailed analytics charts would be displayed here</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Policy performance, sponsorship trends, and user behavior analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}