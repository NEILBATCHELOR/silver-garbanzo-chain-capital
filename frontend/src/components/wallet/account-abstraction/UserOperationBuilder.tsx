/**
 * UserOperation Builder Component
 * 
 * Provides interface for building EIP-4337 UserOperations with batch transactions
 * Integrates with backend UserOperationService, PaymasterService, and BatchOperationService
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { 
  Zap, 
  Plus, 
  Trash2, 
  Eye, 
  Send, 
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Shield,
  Layers,
  ArrowRight,
  Coins,
  Fuel
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { 
  userOperationApiService, 
  BatchOperation, 
  UserOperationPaymaster, 
  GasPolicy, 
  UserOperationPreview, 
  UserOperationStatus 
} from '../../../services/wallet/UserOperationApiService'

// Types based on backend services
export interface UserOperationBuilderProps {
  onOperationComplete?: (userOpHash: string) => void
  initialOperations?: BatchOperation[]
}

export function UserOperationBuilder() {
  // Wallet connection
  const { address: walletAddress, isConnected } = useAccount()

  // State management
  const [operations, setOperations] = useState<BatchOperation[]>([
    {
      target: '',
      value: '0',
      data: '0x',
      description: 'Transaction 1'
    }
  ])
  
  const [paymasterPolicy, setPaymasterPolicy] = useState<UserOperationPaymaster>({
    type: 'user_pays'
  })
  
  const [gasPolicy, setGasPolicy] = useState<GasPolicy>({
    priorityLevel: 'medium'
  })
  
  // UserOperation state
  const [preview, setPreview] = useState<UserOperationPreview | null>(null)
  const [status, setStatus] = useState<UserOperationStatus | null>(null)
  const [currentTab, setCurrentTab] = useState('build')
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Operation management
  const addOperation = () => {
    setOperations([
      ...operations,
      {
        target: '',
        value: '0',
        data: '0x',
        description: `Transaction ${operations.length + 1}`
      }
    ])
  }

  const removeOperation = (index: number) => {
    if (operations.length > 1) {
      setOperations(operations.filter((_, i) => i !== index))
    }
  }

  const updateOperation = (index: number, field: keyof BatchOperation, value: string) => {
    const updated = operations.map((op, i) => 
      i === index ? { ...op, [field]: value } : op
    )
    setOperations(updated)
  }

  // Build UserOperation preview
  const buildUserOperation = useCallback(async () => {
    if (!walletAddress || !isConnected) {
      setError('Wallet not connected')
      return
    }

    // Validate operations
    const validOperations = operations.filter(op => 
      op.target && op.target.startsWith('0x') && op.target.length === 42
    )

    if (validOperations.length === 0) {
      setError('At least one valid operation is required')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      // Call backend UserOperationService via API service
      const response = await userOperationApiService.buildUserOperation({
        walletAddress,
        operations: validOperations,
        paymasterPolicy,
        gasPolicy,
        nonceKey: 0
      })

      if (response.success && response.data) {
        setPreview(response.data)
        setCurrentTab('preview')
      } else {
        throw new Error(response.error || 'Failed to build UserOperation')
      }

    } catch (error) {
      setError(`Failed to build UserOperation: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress, isConnected, operations, paymasterPolicy, gasPolicy])

  // Submit UserOperation
  const submitUserOperation = async () => {
    if (!preview || !walletAddress) return

    try {
      setIsLoading(true)
      setError('')

      // Submit UserOperation via API service
      const response = await userOperationApiService.submitUserOperation({
        userOpHash: preview.userOpHash,
        walletAddress
      })

      if (response.success && response.data) {
        setStatus(response.data)
        setCurrentTab('status')
      } else {
        throw new Error(response.error || 'Failed to submit UserOperation')
      }

    } catch (error) {
      setError(`Failed to submit UserOperation: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Poll UserOperation status
  const pollStatus = useCallback(async (userOpHash: string) => {
    try {
      const response = await userOperationApiService.getUserOperationStatus(userOpHash)

      if (response.success && response.data) {
        setStatus(prevStatus => ({
          ...prevStatus!,
          ...response.data
        }))
      }
    } catch (error) {
      console.warn('Failed to poll status:', error)
    }
  }, [])

  // Effects
  useEffect(() => {
    if (status && ['pending', 'submitted'].includes(status.status)) {
      const interval = setInterval(() => {
        pollStatus(status.userOpHash)
      }, 5000) // Poll every 5 seconds

      return () => clearInterval(interval)
    }
  }, [status, pollStatus])

  // Helper functions
  const formatGas = (gas: string): string => {
    return parseInt(gas, 16).toLocaleString()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'submitted': return <Send className="w-4 h-4 text-blue-500" />
      case 'included': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getPaymasterIcon = (type: string) => {
    switch (type) {
      case 'user_pays': return <Coins className="w-4 h-4" />
      case 'sponsored': return <Shield className="w-4 h-4 text-green-500" />
      case 'token_paymaster': return <Layers className="w-4 h-4 text-blue-500" />
      default: return <Fuel className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            UserOperation Builder
          </CardTitle>
          <CardDescription>
            Build and execute batch transactions using EIP-4337 Account Abstraction
          </CardDescription>
          {!isConnected && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to use UserOperation Builder
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="build">Build Operations</TabsTrigger>
          <TabsTrigger value="preview" disabled={!preview}>Preview & Submit</TabsTrigger>
          <TabsTrigger value="status" disabled={!status}>Transaction Status</TabsTrigger>
        </TabsList>

        {/* Build Tab */}
        <TabsContent value="build" className="space-y-4">
          {/* Operations List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Batch Operations ({operations.length})
                </span>
                <Button onClick={addOperation} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Operation
                </Button>
              </CardTitle>
              <CardDescription>
                Define the transactions to include in your batch operation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {operations.map((operation, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Operation {index + 1}</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{operation.value === '0' ? 'Call' : 'Transfer'}</Badge>
                      {operations.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOperation(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`target-${index}`}>Target Contract</Label>
                      <Input
                        id={`target-${index}`}
                        value={operation.target}
                        onChange={(e) => updateOperation(index, 'target', e.target.value)}
                        placeholder="0x..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`value-${index}`}>Value (ETH)</Label>
                      <Input
                        id={`value-${index}`}
                        type="number"
                        step="0.000001"
                        value={operation.value}
                        onChange={(e) => updateOperation(index, 'value', e.target.value)}
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`data-${index}`}>Call Data</Label>
                    <Input
                      id={`data-${index}`}
                      value={operation.data}
                      onChange={(e) => updateOperation(index, 'data', e.target.value)}
                      placeholder="0x"
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`description-${index}`}>Description (Optional)</Label>
                    <Input
                      id={`description-${index}`}
                      value={operation.description}
                      onChange={(e) => updateOperation(index, 'description', e.target.value)}
                      placeholder="Describe this operation"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Paymaster Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getPaymasterIcon(paymasterPolicy.type)}
                Gas Payment Method
              </CardTitle>
              <CardDescription>
                Choose how to pay for transaction gas fees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Button
                  variant={paymasterPolicy.type === 'user_pays' ? 'default' : 'outline'}
                  onClick={() => setPaymasterPolicy({ type: 'user_pays' })}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Coins className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">Pay with ETH</div>
                    <div className="text-sm opacity-70">Use wallet balance</div>
                  </div>
                </Button>

                <Button
                  variant={paymasterPolicy.type === 'sponsored' ? 'default' : 'outline'}
                  onClick={() => setPaymasterPolicy({ type: 'sponsored' })}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Shield className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">Sponsored</div>
                    <div className="text-sm opacity-70">Free gas</div>
                  </div>
                </Button>

                <Button
                  variant={paymasterPolicy.type === 'token_paymaster' ? 'default' : 'outline'}
                  onClick={() => setPaymasterPolicy({ type: 'token_paymaster' })}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Layers className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">Pay with Token</div>
                    <div className="text-sm opacity-70">ERC-20 token</div>
                  </div>
                </Button>
              </div>

              {paymasterPolicy.type === 'token_paymaster' && (
                <div className="space-y-2">
                  <Label>Token Contract Address</Label>
                  <Input
                    value={paymasterPolicy.tokenAddress || ''}
                    onChange={(e) => setPaymasterPolicy({
                      ...paymasterPolicy,
                      tokenAddress: e.target.value
                    })}
                    placeholder="0x... (USDC, DAI, etc.)"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gas Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Gas Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {['low', 'medium', 'high', 'urgent'].map((level) => (
                  <Button
                    key={level}
                    variant={gasPolicy.priorityLevel === level ? 'default' : 'outline'}
                    onClick={() => setGasPolicy({ priorityLevel: level as any })}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <div className="capitalize font-medium">{level}</div>
                    <div className="text-sm opacity-70">
                      {level === 'low' && '~5 min'}
                      {level === 'medium' && '~2 min'} 
                      {level === 'high' && '~1 min'}
                      {level === 'urgent' && '~30 sec'}
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={buildUserOperation}
              disabled={!isConnected || isLoading || operations.every(op => !op.target)}
            >
              {isLoading ? 'Building...' : 'Build UserOperation'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>UserOperation Preview</CardTitle>
              <CardDescription>
                Review the operation details before submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preview && (
                <div className="space-y-6">
                  {/* Operation Summary */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-3">Operation Summary</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Operations:</span>
                        <span>{operations.length} transactions</span>
                      </div>
                      <div className="flex justify-between">
                        <span>UserOp Hash:</span>
                        <span className="font-mono text-xs">{preview.userOpHash.slice(0, 16)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gas Payment:</span>
                        <span className="flex items-center gap-1">
                          {getPaymasterIcon(paymasterPolicy.type)}
                          <span className="capitalize">{paymasterPolicy.type.replace('_', ' ')}</span>
                        </span>
                      </div>
                      {preview.validUntil && (
                        <div className="flex justify-between">
                          <span>Valid Until:</span>
                          <span>{new Date(preview.validUntil * 1000).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gas Estimates */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Call Gas Limit</div>
                      <div className="font-mono text-lg">{formatGas(preview.gasEstimate.callGasLimit)}</div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Verification Gas</div>
                      <div className="font-mono text-lg">{formatGas(preview.gasEstimate.verificationGasLimit)}</div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Pre-verification Gas</div>
                      <div className="font-mono text-lg">{formatGas(preview.gasEstimate.preVerificationGas)}</div>
                    </div>
                  </div>

                  {/* Operations List */}
                  <div>
                    <h4 className="font-medium mb-3">Operations to Execute</h4>
                    <div className="space-y-2">
                      {operations.filter(op => op.target).map((operation, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{operation.description || `Operation ${index + 1}`}</div>
                            <Badge variant="outline">
                              {operation.value === '0' ? 'Call' : `${operation.value} ETH`}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground font-mono mt-1">
                            → {operation.target}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentTab('build')}>
                      Back to Build
                    </Button>
                    <Button 
                      onClick={submitUserOperation} 
                      disabled={isLoading}
                      className="ml-auto"
                    >
                      {isLoading ? 'Submitting...' : 'Submit UserOperation'}
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Status</CardTitle>
              <CardDescription>
                Monitor your UserOperation execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status && (
                <div className="space-y-6">
                  {/* Status Overview */}
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.status)}
                    <div>
                      <div className="font-medium text-lg capitalize">{status.status.replace('_', ' ')}</div>
                      <div className="text-sm text-muted-foreground">
                        UserOperation {status.userOpHash.slice(0, 16)}...
                      </div>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {status.status === 'pending' && '25%'}
                        {status.status === 'submitted' && '50%'}
                        {status.status === 'included' && '100%'}
                        {status.status === 'failed' && 'Failed'}
                      </span>
                    </div>
                    <Progress 
                      value={
                        status.status === 'pending' ? 25 :
                        status.status === 'submitted' ? 50 :
                        status.status === 'included' ? 100 : 0
                      }
                      className={status.status === 'failed' ? 'bg-red-200' : ''}
                    />
                  </div>

                  {/* Status Details */}
                  <div className="grid gap-2 text-sm">
                    {status.transactionHash && (
                      <div className="flex justify-between">
                        <span>Transaction Hash:</span>
                        <span className="font-mono">{status.transactionHash.slice(0, 16)}...</span>
                      </div>
                    )}
                    {status.blockNumber && (
                      <div className="flex justify-between">
                        <span>Block Number:</span>
                        <span>{status.blockNumber.toLocaleString()}</span>
                      </div>
                    )}
                    {status.gasUsed && (
                      <div className="flex justify-between">
                        <span>Gas Used:</span>
                        <span>{parseInt(status.gasUsed).toLocaleString()}</span>
                      </div>
                    )}
                    {status.actualGasCost && (
                      <div className="flex justify-between">
                        <span>Gas Cost:</span>
                        <span>{(parseInt(status.actualGasCost) / 1e18).toFixed(6)} ETH</span>
                      </div>
                    )}
                  </div>

                  {status.status === 'failed' && status.reason && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{status.reason}</AlertDescription>
                    </Alert>
                  )}

                  {status.status === 'included' && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        UserOperation successfully executed! All operations completed.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCurrentTab('build')
                        setPreview(null)
                        setStatus(null)
                        setOperations([{
                          target: '',
                          value: '0',
                          data: '0x',
                          description: 'Transaction 1'
                        }])
                      }}
                    >
                      New UserOperation
                    </Button>
                    
                    {status.transactionHash && (
                      <Button variant="outline" asChild>
                        <a 
                          href={`https://etherscan.io/tx/${status.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View on Etherscan
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
