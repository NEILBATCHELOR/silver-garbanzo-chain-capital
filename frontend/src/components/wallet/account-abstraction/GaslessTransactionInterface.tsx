/**
 * Gasless Transaction Interface
 * 
 * Simplified interface for gasless transactions using account abstraction
 * Integrates with paymaster services for sponsored transactions
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
import { Progress } from '@/components/ui/progress'
import { 
  Zap, 
  Send, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Coins,
  ArrowRight,
  RefreshCw,
  Gift,
  CreditCard,
  Banknote,
  TrendingUp
} from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { parseEther, formatEther, isAddress } from 'viem'

// Common ERC-20 tokens for gasless payments
const SUPPORTED_TOKENS = [
  { symbol: 'USDC', address: '0xA0b86a33E6441146Da89e57d4a33C62E0a5C20cC', decimals: 6, logo: '💵' },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, logo: '💰' },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, logo: '🌟' },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, logo: '🔷' }
]

export interface GaslessTransactionRequest {
  type: 'transfer' | 'contract_call' | 'token_transfer';
  recipient: string;
  amount: string;
  token?: {
    address: string;
    symbol: string;
    decimals: number;
  };
  contractAddress?: string;
  calldata?: string;
  description: string;
}

export interface PaymasterQuote {
  paymasterAddress: string;
  sponsorType: 'full_sponsor' | 'token_paymaster';
  tokenPayment?: {
    tokenAddress: string;
    tokenAmount: string;
    exchangeRate: string;
  };
  gasEstimate: string;
  validUntil: number;
  sponsored: boolean;
}

export interface GaslessTransactionStatus {
  id: string;
  status: 'pending' | 'submitted' | 'included' | 'failed';
  userOpHash?: string;
  transactionHash?: string;
  gasSponsored: boolean;
  tokenUsed?: string;
  createdAt: Date;
  completedAt?: Date;
}

export function GaslessTransactionInterface() {
  // Wallet connection
  const { address: walletAddress, isConnected } = useAccount()
  const { data: ethBalance } = useBalance({ address: walletAddress })

  // State management
  const [transactionType, setTransactionType] = useState<'transfer' | 'contract_call' | 'token_transfer'>('transfer')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0])
  const [contractAddress, setContractAddress] = useState('')
  const [calldata, setCalldata] = useState('')
  const [description, setDescription] = useState('')
  
  // Paymaster state
  const [quote, setQuote] = useState<PaymasterQuote | null>(null)
  const [availableSponsors, setAvailableSponsors] = useState<string[]>([])
  const [selectedPaymaster, setSelectedPaymaster] = useState<'sponsored' | 'token_payment'>('sponsored')
  
  // Transaction state
  const [transactionStatus, setTransactionStatus] = useState<GaslessTransactionStatus | null>(null)
  const [currentTab, setCurrentTab] = useState('build')
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Load available sponsors
  const loadAvailableSponsors = useCallback(async () => {
    if (!walletAddress) return

    try {
      const response = await fetch(`/api/wallet/paymasters/sponsors?wallet=${walletAddress}`)
      const data = await response.json()

      if (data.success) {
        setAvailableSponsors(data.data.sponsors || [])
      }
    } catch (error) {
      console.warn('Failed to load sponsors:', error)
    }
  }, [walletAddress])

  // Get paymaster quote
  const getPaymasterQuote = useCallback(async () => {
    if (!walletAddress || !recipient || !amount) return

    try {
      setIsLoading(true)

      const request: GaslessTransactionRequest = {
        type: transactionType,
        recipient,
        amount,
        description: description || `${transactionType} transaction`
      }

      if (transactionType === 'token_transfer') {
        request.token = selectedToken
      }

      if (transactionType === 'contract_call') {
        request.contractAddress = contractAddress
        request.calldata = calldata
      }

      const response = await fetch('/api/wallet/paymasters/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress,
          request,
          paymasterType: selectedPaymaster
        })
      })

      const data = await response.json()

      if (data.success) {
        setQuote(data.data)
      } else {
        throw new Error(data.message || 'Failed to get quote')
      }

    } catch (error) {
      setError(`Failed to get paymaster quote: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress, recipient, amount, transactionType, selectedToken, contractAddress, calldata, description, selectedPaymaster])

  // Execute gasless transaction
  const executeGaslessTransaction = async () => {
    if (!quote || !walletAddress) return

    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/wallet/gasless/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress,
          quote,
          transactionDetails: {
            type: transactionType,
            recipient,
            amount,
            token: transactionType === 'token_transfer' ? selectedToken : undefined,
            contractAddress: transactionType === 'contract_call' ? contractAddress : undefined,
            calldata: transactionType === 'contract_call' ? calldata : undefined,
            description
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setTransactionStatus({
          id: data.data.transactionId,
          status: 'pending',
          userOpHash: data.data.userOpHash,
          gasSponsored: quote.sponsored,
          tokenUsed: quote.tokenPayment?.tokenAddress,
          createdAt: new Date()
        })
        setCurrentTab('status')
      } else {
        throw new Error(data.message || 'Failed to execute transaction')
      }

    } catch (error) {
      setError(`Failed to execute transaction: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Poll transaction status
  const pollTransactionStatus = useCallback(async (transactionId: string) => {
    try {
      const response = await fetch(`/api/wallet/gasless/status/${transactionId}`)
      const data = await response.json()

      if (data.success) {
        setTransactionStatus(prev => ({
          ...prev!,
          ...data.data,
          completedAt: data.data.status === 'included' ? new Date() : prev?.completedAt
        }))
      }
    } catch (error) {
      console.warn('Failed to poll transaction status:', error)
    }
  }, [])

  // Effects
  useEffect(() => {
    if (isConnected) {
      loadAvailableSponsors()
    }
  }, [isConnected, loadAvailableSponsors])

  useEffect(() => {
    if (transactionStatus && ['pending', 'submitted'].includes(transactionStatus.status)) {
      const interval = setInterval(() => {
        pollTransactionStatus(transactionStatus.id)
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [transactionStatus, pollTransactionStatus])

  // Helper functions
  const isValidTransaction = () => {
    if (!recipient || !isAddress(recipient)) return false
    if (!amount || parseFloat(amount) <= 0) return false
    
    if (transactionType === 'contract_call') {
      return contractAddress && isAddress(contractAddress) && calldata
    }
    
    return true
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'transfer': return <Send className="w-4 h-4" />
      case 'token_transfer': return <Coins className="w-4 h-4" />
      case 'contract_call': return <CreditCard className="w-4 h-4" />
      default: return <Send className="w-4 h-4" />
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Gasless Transactions
          </CardTitle>
          <CardDescription>
            Send transactions without paying gas fees using account abstraction
          </CardDescription>
          
          {/* Sponsor Status */}
          {availableSponsors.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Gift className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">
                {availableSponsors.length} sponsor{availableSponsors.length !== 1 ? 's' : ''} available
              </span>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="build">Build Transaction</TabsTrigger>
          <TabsTrigger value="status" disabled={!transactionStatus}>Transaction Status</TabsTrigger>
        </TabsList>

        {/* Build Tab */}
        <TabsContent value="build" className="space-y-4">
          {/* Transaction Type */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <Button
                  variant={transactionType === 'transfer' ? 'default' : 'outline'}
                  onClick={() => setTransactionType('transfer')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Send className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">ETH Transfer</div>
                    <div className="text-sm opacity-70">Send ETH</div>
                  </div>
                </Button>

                <Button
                  variant={transactionType === 'token_transfer' ? 'default' : 'outline'}
                  onClick={() => setTransactionType('token_transfer')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Coins className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">Token Transfer</div>
                    <div className="text-sm opacity-70">Send ERC-20</div>
                  </div>
                </Button>

                <Button
                  variant={transactionType === 'contract_call' ? 'default' : 'outline'}
                  onClick={() => setTransactionType('contract_call')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <CreditCard className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">Contract Call</div>
                    <div className="text-sm opacity-70">Execute function</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getTransactionIcon(transactionType)}
                Transaction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recipient */}
              <div className="space-y-2">
                <Label htmlFor="recipient">
                  {transactionType === 'contract_call' ? 'Contract Address' : 'Recipient Address'}
                </Label>
                <Input
                  id="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="flex-1"
                  />
                  
                  {transactionType === 'token_transfer' && (
                    <Select
                      value={selectedToken.address}
                      onValueChange={(address) => {
                        const token = SUPPORTED_TOKENS.find(t => t.address === address)
                        if (token) setSelectedToken(token)
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_TOKENS.map((token) => (
                          <SelectItem key={token.address} value={token.address}>
                            <div className="flex items-center gap-2">
                              <span>{token.logo}</span>
                              <span>{token.symbol}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {transactionType === 'transfer' && (
                    <div className="flex items-center px-3 bg-muted rounded">
                      ETH
                    </div>
                  )}
                </div>
              </div>

              {/* Contract Call Specific Fields */}
              {transactionType === 'contract_call' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="calldata">Call Data</Label>
                    <Input
                      id="calldata"
                      value={calldata}
                      onChange={(e) => setCalldata(e.target.value)}
                      placeholder="0x..."
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this transaction"
                />
              </div>
            </CardContent>
          </Card>

          {/* Gas Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Gas Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <Button
                  variant={selectedPaymaster === 'sponsored' ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymaster('sponsored')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  disabled={availableSponsors.length === 0}
                >
                  <Gift className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">Fully Sponsored</div>
                    <div className="text-sm opacity-70">
                      {availableSponsors.length > 0 ? 'Free gas!' : 'No sponsors available'}
                    </div>
                  </div>
                </Button>

                <Button
                  variant={selectedPaymaster === 'token_payment' ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymaster('token_payment')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Banknote className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">Pay with Token</div>
                    <div className="text-sm opacity-70">Use USDC/USDT</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quote Section */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Quote</CardTitle>
              <CardDescription>
                Get an estimate for your gasless transaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!quote ? (
                <div className="text-center py-6">
                  <Button
                    onClick={getPaymasterQuote}
                    disabled={!isValidTransaction() || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Getting Quote...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Get Quote
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Quote Details */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="grid gap-3">
                      <div className="flex justify-between">
                        <span>Gas Estimate:</span>
                        <span className="font-mono">{parseInt(quote.gasEstimate).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Sponsor Type:</span>
                        <Badge variant={quote.sponsored ? 'default' : 'outline'}>
                          {quote.sponsored ? 'Fully Sponsored' : 'Token Payment'}
                        </Badge>
                      </div>
                      
                      {quote.tokenPayment && (
                        <>
                          <Separator />
                          <div className="flex justify-between">
                            <span>Token Payment:</span>
                            <span>{quote.tokenPayment.tokenAmount} USDC</span>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Exchange Rate:</span>
                            <span>1 ETH = {quote.tokenPayment.exchangeRate} USDC</span>
                          </div>
                        </>
                      )}
                      
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Your Cost:</span>
                        <span className="text-green-600">
                          {quote.sponsored ? 'FREE' : `${quote.tokenPayment?.tokenAmount} USDC`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setQuote(null)}>
                      New Quote
                    </Button>
                    <Button 
                      onClick={executeGaslessTransaction}
                      disabled={isLoading}
                      className="ml-auto"
                    >
                      {isLoading ? 'Executing...' : 'Execute Transaction'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Status</CardTitle>
              <CardDescription>
                Monitor your gasless transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionStatus && (
                <div className="space-y-6">
                  {/* Status Overview */}
                  <div className="flex items-center gap-3">
                    {getStatusIcon(transactionStatus.status)}
                    <div>
                      <div className="font-medium text-lg capitalize">
                        {transactionStatus.status.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Transaction {transactionStatus.id.slice(0, 8)}...
                      </div>
                    </div>
                    
                    {transactionStatus.gasSponsored && (
                      <Badge variant="secondary" className="ml-auto">
                        <Gift className="w-3 h-3 mr-1" />
                        Sponsored
                      </Badge>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {transactionStatus.status === 'pending' && '25%'}
                        {transactionStatus.status === 'submitted' && '50%'}
                        {transactionStatus.status === 'included' && '100%'}
                        {transactionStatus.status === 'failed' && 'Failed'}
                      </span>
                    </div>
                    <Progress 
                      value={
                        transactionStatus.status === 'pending' ? 25 :
                        transactionStatus.status === 'submitted' ? 50 :
                        transactionStatus.status === 'included' ? 100 : 0
                      }
                      className={transactionStatus.status === 'failed' ? 'bg-red-200' : ''}
                    />
                  </div>

                  {/* Transaction Details */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="grid gap-2 text-sm">
                      {transactionStatus.userOpHash && (
                        <div className="flex justify-between">
                          <span>UserOp Hash:</span>
                          <span className="font-mono">{transactionStatus.userOpHash.slice(0, 16)}...</span>
                        </div>
                      )}
                      {transactionStatus.transactionHash && (
                        <div className="flex justify-between">
                          <span>Transaction Hash:</span>
                          <span className="font-mono">{transactionStatus.transactionHash.slice(0, 16)}...</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Gas Payment:</span>
                        <span>{transactionStatus.gasSponsored ? 'Sponsored' : 'Token Payment'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{transactionStatus.createdAt.toLocaleTimeString()}</span>
                      </div>
                      {transactionStatus.completedAt && (
                        <div className="flex justify-between">
                          <span>Completed:</span>
                          <span>{transactionStatus.completedAt.toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {transactionStatus.status === 'included' && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Transaction completed successfully! {transactionStatus.gasSponsored ? 'Gas was fully sponsored.' : 'Gas was paid with tokens.'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {transactionStatus.status === 'failed' && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Transaction failed. Please try again or contact support.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCurrentTab('build')
                        setTransactionStatus(null)
                        setQuote(null)
                        setRecipient('')
                        setAmount('')
                        setDescription('')
                      }}
                    >
                      New Transaction
                    </Button>
                    
                    {transactionStatus.transactionHash && (
                      <Button variant="outline" asChild>
                        <a 
                          href={`https://etherscan.io/tx/${transactionStatus.transactionHash}`}
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
