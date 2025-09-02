/**
 * RestrictionManagement - Compliance Restriction Management Interface
 * 
 * Manages transaction restrictions, whitelisting, blacklisting, and compliance rules
 * for smart contract wallets with real-time validation
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { 
  Shield, 
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Globe,
  Calendar,
  AlertTriangle,
  Settings,
  RefreshCw
} from 'lucide-react'
import { UnifiedWallet } from '@/services/wallet/smart-contract/unifiedWalletService'

interface RestrictionManagementProps {
  walletId: string
  wallet: UnifiedWallet
}

interface RestrictionRule {
  id: string
  type: 'whitelist' | 'blacklist' | 'amount_limit' | 'time_restriction' | 'custom'
  name: string
  description: string
  isActive: boolean
  config: {
    // Address restrictions
    addresses?: string[]
    
    // Amount restrictions (in USD, ETH, BTC)
    maxTransactionAmount?: { value: string; currency: 'USD' | 'ETH' | 'BTC' }
    maxDailyAmount?: { value: string; currency: 'USD' | 'ETH' | 'BTC' }
    
    // Time restrictions
    allowedHours?: { start: number; end: number }
    allowedDays?: number[] // 0-6, Sunday-Saturday
    timezone?: string
    
    // Custom restriction
    contractAddress?: string
    functionSelector?: string
    parameters?: any
  }
  createdAt: string
  updatedAt: string
}

interface ValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
}

export function RestrictionManagement({ walletId, wallet }: RestrictionManagementProps) {
  const [restrictions, setRestrictions] = useState<RestrictionRule[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRule, setEditingRule] = useState<RestrictionRule | null>(null)
  const [newRule, setNewRule] = useState<Partial<RestrictionRule>>({
    type: 'whitelist',
    name: '',
    description: '',
    isActive: true,
    config: {}
  })
  const [testAddress, setTestAddress] = useState('')
  const [testAmount, setTestAmount] = useState('')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadRestrictions()
  }, [walletId])

  const loadRestrictions = async () => {
    try {
      setLoading(true)
      // In real implementation, this would fetch from the backend
      // For now, simulate with sample data
      const sampleRestrictions: RestrictionRule[] = [
        {
          id: '1',
          type: 'whitelist',
          name: 'Approved Exchanges',
          description: 'Only allow transactions to approved exchange addresses',
          isActive: true,
          config: {
            addresses: [
              '0x1234567890123456789012345678901234567890',
              '0x2345678901234567890123456789012345678901'
            ]
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          type: 'amount_limit',
          name: 'Daily Transaction Limit',
          description: 'Maximum $10,000 USD in transactions per day',
          isActive: true,
          config: {
            maxDailyAmount: { value: '10000', currency: 'USD' as const }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      setRestrictions(sampleRestrictions)
    } catch (error) {
      console.error('Failed to load restrictions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load restrictions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddRestriction = async () => {
    try {
      setLoading(true)
      
      if (!newRule.name || !newRule.type) {
        toast({
          title: 'Validation Error',
          description: 'Please provide a name and type for the restriction',
          variant: 'destructive',
        })
        return
      }

      const rule: RestrictionRule = {
        id: Date.now().toString(),
        type: newRule.type as RestrictionRule['type'],
        name: newRule.name,
        description: newRule.description || '',
        isActive: newRule.isActive ?? true,
        config: newRule.config || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setRestrictions(prev => [...prev, rule])
      setNewRule({
        type: 'whitelist',
        name: '',
        description: '',
        isActive: true,
        config: {}
      })
      setShowAddForm(false)

      toast({
        title: 'Restriction Added',
        description: `Successfully added ${rule.name}`,
      })
    } catch (error) {
      console.error('Failed to add restriction:', error)
      toast({
        title: 'Error',
        description: 'Failed to add restriction',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRestriction = async (id: string, isActive: boolean) => {
    try {
      setRestrictions(prev => prev.map(rule => 
        rule.id === id 
          ? { ...rule, isActive, updatedAt: new Date().toISOString() }
          : rule
      ))

      toast({
        title: isActive ? 'Restriction Enabled' : 'Restriction Disabled',
        description: `Restriction has been ${isActive ? 'enabled' : 'disabled'}`,
      })
    } catch (error) {
      console.error('Failed to toggle restriction:', error)
    }
  }

  const handleDeleteRestriction = async (id: string) => {
    try {
      setRestrictions(prev => prev.filter(rule => rule.id !== id))
      toast({
        title: 'Restriction Deleted',
        description: 'Restriction has been removed',
      })
    } catch (error) {
      console.error('Failed to delete restriction:', error)
    }
  }

  const handleTestRestrictions = async () => {
    try {
      setLoading(true)
      
      // Simulate validation
      const result: ValidationResult = {
        isValid: Math.random() > 0.3, // 70% chance of being valid
        warnings: [],
        errors: []
      }

      // Check whitelist/blacklist
      const hasWhitelist = restrictions.some(r => r.type === 'whitelist' && r.isActive)
      const hasBlacklist = restrictions.some(r => r.type === 'blacklist' && r.isActive)
      
      if (hasWhitelist && testAddress) {
        const whitelistRule = restrictions.find(r => r.type === 'whitelist' && r.isActive)
        if (whitelistRule && !whitelistRule.config.addresses?.includes(testAddress)) {
          result.isValid = false
          result.errors.push('Address is not in whitelist')
        }
      }

      if (hasBlacklist && testAddress) {
        const blacklistRule = restrictions.find(r => r.type === 'blacklist' && r.isActive)
        if (blacklistRule && blacklistRule.config.addresses?.includes(testAddress)) {
          result.isValid = false
          result.errors.push('Address is blacklisted')
        }
      }

      // Check amount limits
      if (testAmount) {
        const amountValue = parseFloat(testAmount)
        const amountRule = restrictions.find(r => r.type === 'amount_limit' && r.isActive)
        if (amountRule && amountRule.config.maxTransactionAmount) {
          const limit = parseFloat(amountRule.config.maxTransactionAmount.value)
          if (amountValue > limit) {
            result.isValid = false
            result.errors.push(`Amount exceeds transaction limit of ${limit} ${amountRule.config.maxTransactionAmount.currency}`)
          }
        }
      }

      // Add warnings for time restrictions
      const timeRule = restrictions.find(r => r.type === 'time_restriction' && r.isActive)
      if (timeRule) {
        result.warnings.push('Transaction may be restricted by time-based rules')
      }

      setValidationResult(result)
    } catch (error) {
      console.error('Failed to test restrictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRestrictionIcon = (type: string) => {
    switch (type) {
      case 'whitelist':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'blacklist':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'amount_limit':
        return <DollarSign className="w-4 h-4 text-blue-600" />
      case 'time_restriction':
        return <Clock className="w-4 h-4 text-purple-600" />
      default:
        return <Settings className="w-4 h-4 text-gray-600" />
    }
  }

  const getRestrictionTypeLabel = (type: string) => {
    switch (type) {
      case 'whitelist':
        return 'Address Whitelist'
      case 'blacklist':
        return 'Address Blacklist'
      case 'amount_limit':
        return 'Amount Limit'
      case 'time_restriction':
        return 'Time Restriction'
      case 'custom':
        return 'Custom Rule'
      default:
        return type
    }
  }

  const renderConfigForm = () => {
    const { type, config } = newRule

    switch (type) {
      case 'whitelist':
      case 'blacklist':
        return (
          <div className="space-y-2">
            <Label>Addresses</Label>
            <Textarea
              placeholder="Enter addresses, one per line&#10;0x1234567890123456789012345678901234567890&#10;0x2345678901234567890123456789012345678901"
              value={(config?.addresses || []).join('\n')}
              onChange={(e) => setNewRule(prev => ({
                ...prev,
                config: {
                  ...prev.config,
                  addresses: e.target.value.split('\n').filter(addr => addr.trim())
                }
              }))}
              rows={4}
            />
          </div>
        )
      
      case 'amount_limit':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Transaction Amount</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Amount"
                  value={config?.maxTransactionAmount?.value || ''}
                  onChange={(e) => setNewRule(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      maxTransactionAmount: {
                        ...prev.config?.maxTransactionAmount,
                        value: e.target.value
                      }
                    }
                  }))}
                />
                <Select
                  value={config?.maxTransactionAmount?.currency || 'USD'}
                  onValueChange={(currency) => setNewRule(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      maxTransactionAmount: {
                        ...prev.config?.maxTransactionAmount,
                        currency: currency as 'USD' | 'ETH' | 'BTC'
                      }
                    }
                  }))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Daily Amount</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Amount"
                  value={config?.maxDailyAmount?.value || ''}
                  onChange={(e) => setNewRule(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      maxDailyAmount: {
                        ...prev.config?.maxDailyAmount,
                        value: e.target.value
                      }
                    }
                  }))}
                />
                <Select
                  value={config?.maxDailyAmount?.currency || 'USD'}
                  onValueChange={(currency) => setNewRule(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      maxDailyAmount: {
                        ...prev.config?.maxDailyAmount,
                        currency: currency as 'USD' | 'ETH' | 'BTC'
                      }
                    }
                  }))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )
      
      case 'time_restriction':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Allowed Hours (24-hour format)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Start hour (0-23)"
                  min="0"
                  max="23"
                  value={config?.allowedHours?.start || ''}
                  onChange={(e) => setNewRule(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      allowedHours: {
                        ...prev.config?.allowedHours,
                        start: parseInt(e.target.value) || 0
                      }
                    }
                  }))}
                />
                <span>to</span>
                <Input
                  type="number"
                  placeholder="End hour (0-23)"
                  min="0"
                  max="23"
                  value={config?.allowedHours?.end || ''}
                  onChange={(e) => setNewRule(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      allowedHours: {
                        ...prev.config?.allowedHours,
                        end: parseInt(e.target.value) || 23
                      }
                    }
                  }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={config?.timezone || 'UTC'}
                onValueChange={(timezone) => setNewRule(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    timezone
                  }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Transaction Restrictions</h3>
          <p className="text-sm text-muted-foreground">
            Configure compliance rules and transaction restrictions for this wallet
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Restriction
        </Button>
      </div>

      {/* Add Restriction Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Restriction</CardTitle>
            <CardDescription>
              Create a new compliance rule for this wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Restriction name"
                  value={newRule.name || ''}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newRule.type}
                  onValueChange={(type) => setNewRule(prev => ({ 
                    ...prev, 
                    type: type as RestrictionRule['type'],
                    config: {} // Reset config when type changes
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whitelist">Address Whitelist</SelectItem>
                    <SelectItem value="blacklist">Address Blacklist</SelectItem>
                    <SelectItem value="amount_limit">Amount Limit</SelectItem>
                    <SelectItem value="time_restriction">Time Restriction</SelectItem>
                    <SelectItem value="custom">Custom Rule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this restriction does"
                value={newRule.description || ''}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {renderConfigForm()}

            <div className="flex items-center space-x-2">
              <Switch
                checked={newRule.isActive ?? true}
                onCheckedChange={(isActive) => setNewRule(prev => ({ ...prev, isActive }))}
              />
              <Label>Enable this restriction immediately</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddRestriction} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Add Restriction
                  </>
                )}
              </Button>
              <Button onClick={() => setShowAddForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Restrictions</CardTitle>
          <CardDescription>
            {restrictions.filter(r => r.isActive).length} of {restrictions.length} restrictions are currently active
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restrictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No restrictions configured</p>
              <p className="text-sm">Add restrictions to enhance wallet security and compliance</p>
            </div>
          ) : (
            <div className="space-y-3">
              {restrictions.map((rule) => (
                <div key={rule.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getRestrictionIcon(rule.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {getRestrictionTypeLabel(rule.type)}
                          </Badge>
                          {rule.isActive ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 text-xs">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                        
                        {/* Rule Configuration Summary */}
                        <div className="mt-2 text-xs text-muted-foreground">
                          {rule.type === 'whitelist' && rule.config.addresses && (
                            <span>{rule.config.addresses.length} whitelisted addresses</span>
                          )}
                          {rule.type === 'blacklist' && rule.config.addresses && (
                            <span>{rule.config.addresses.length} blacklisted addresses</span>
                          )}
                          {rule.type === 'amount_limit' && (
                            <span>
                              {rule.config.maxTransactionAmount && 
                                `Max transaction: ${rule.config.maxTransactionAmount.value} ${rule.config.maxTransactionAmount.currency}`
                              }
                              {rule.config.maxDailyAmount && 
                                ` • Max daily: ${rule.config.maxDailyAmount.value} ${rule.config.maxDailyAmount.currency}`
                              }
                            </span>
                          )}
                          {rule.type === 'time_restriction' && rule.config.allowedHours && (
                            <span>
                              Allowed hours: {rule.config.allowedHours.start}:00 - {rule.config.allowedHours.end}:00
                              {rule.config.timezone && ` (${rule.config.timezone})`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(isActive) => handleToggleRestriction(rule.id, isActive)}
                      />
                      <Button
                        onClick={() => handleDeleteRestriction(rule.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Test Restrictions
          </CardTitle>
          <CardDescription>
            Test how your restrictions would apply to a sample transaction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Test Address</Label>
              <Input
                placeholder="0x1234567890123456789012345678901234567890"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Test Amount (USD)</Label>
              <Input
                placeholder="1000"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleTestRestrictions} disabled={loading || !testAddress}>
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Test Transaction
              </>
            )}
          </Button>

          {validationResult && (
            <Alert className={validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {validationResult.isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <div className={validationResult.isValid ? 'text-green-800' : 'text-red-800'}>
                    <strong>{validationResult.isValid ? 'Transaction would be allowed' : 'Transaction would be blocked'}</strong>
                  </div>
                  {validationResult.errors.length > 0 && (
                    <div>
                      <strong>Errors:</strong>
                      <ul className="list-disc list-inside text-sm mt-1">
                        {validationResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <div>
                      <strong>Warnings:</strong>
                      <ul className="list-disc list-inside text-sm mt-1">
                        {validationResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
