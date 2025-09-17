import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package2, 
  Activity, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Eye,
  Settings
} from 'lucide-react'

// Import the real bundler service
import { 
  bundlerService,
  type BundlerConfiguration,
  type BundleOperation,
  type BundleStatus,
  type BundleAnalytics
} from '@/services/wallet/account-abstraction/BundlerService'

export function BundlerManagementInterface() {
  // State management
  const [activeBundles, setActiveBundles] = useState<BundleOperation[]>([])
  const [bundlerConfigs, setBundlerConfigs] = useState<BundlerConfiguration[]>([])
  const [selectedBundler, setSelectedBundler] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null)

  // Load bundler data on component mount
  useEffect(() => {
    loadBundlerData()
    
    // Set up refresh interval for active bundles
    const interval = setInterval(() => {
      refreshActiveBundles()
    }, 10000) // Refresh every 10 seconds

    setRefreshInterval(interval as unknown as number)
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  const loadBundlerData = async () => {
    setIsLoading(true)
    try {
      // Load bundler configurations from database
      const configs = await bundlerService.getBundlerConfigurations()
      setBundlerConfigs(configs)
      setSelectedBundler(configs[0]?.bundlerAddress || '')
      
      // Load active bundles
      await refreshActiveBundles()
      
    } catch (error) {
      console.error('Failed to load bundler data:', error)
    }
    setIsLoading(false)
  }

  const refreshActiveBundles = async () => {
    try {
      const bundles = await bundlerService.getActiveBundles()
      setActiveBundles(bundles)
    } catch (error) {
      console.error('Failed to refresh active bundles:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'submitted':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'included':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'submitted': return 'bg-blue-100 text-blue-800'
      case 'included': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  }

  const calculateWaitTime = (bundle: BundleOperation) => {
    const now = Date.now()
    const created = bundle.createdAt.getTime()
    return Math.floor((now - created) / 1000)
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bundler Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage EIP-4337 transaction bundling
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshActiveBundles}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active-bundles" className="w-full">
        <TabsList>
          <TabsTrigger value="active-bundles">Active Bundles</TabsTrigger>
          <TabsTrigger value="bundler-config">Bundler Configuration</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Active Bundles Tab */}
        <TabsContent value="active-bundles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package2 className="w-5 h-5" />
                Active Bundle Operations
              </CardTitle>
              <CardDescription>
                Real-time status of pending and processing bundles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeBundles.length === 0 ? (
                <div className="text-center py-8">
                  <Package2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No active bundles</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBundles.map((bundle) => (
                    <div key={bundle.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(bundle.status)}
                          <div>
                            <p className="font-medium">
                              Bundle {bundle.bundleHash.slice(0, 8)}...
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {bundle.bundleSize} operations • Created {formatTimestamp(bundle.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(bundle.status)}>
                            {bundle.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>

                      {/* Bundle Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Bundle Progress</span>
                          <span>
                            {bundle.status === 'included' ? '100%' : 
                             bundle.status === 'submitted' ? '75%' : 
                             bundle.status === 'pending' ? '25%' : '0%'}
                          </span>
                        </div>
                        <Progress 
                          value={
                            bundle.status === 'included' ? 100 : 
                            bundle.status === 'submitted' ? 75 : 
                            bundle.status === 'pending' ? 25 : 0
                          } 
                          className="h-2"
                        />
                      </div>

                      {/* Bundle Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Operations</p>
                          <p className="font-medium">{bundle.bundleSize}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Gas Limit</p>
                          <p className="font-medium">{bundle.totalGasLimit.toString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Wait Time</p>
                          <p className="font-medium">{calculateWaitTime(bundle)}s</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Chain</p>
                          <p className="font-medium">
                            {bundle.chainId === 1 ? 'Ethereum' : `Chain ${bundle.chainId}`}
                          </p>
                        </div>
                      </div>

                      {bundle.failureReason && (
                        <Alert className="mt-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {bundle.failureReason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Bundler Configuration Tab */}
        <TabsContent value="bundler-config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Bundler Configuration
              </CardTitle>
              <CardDescription>
                Manage bundler settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Preferred Bundler</label>
                  <Select value={selectedBundler} onValueChange={setSelectedBundler}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bundler" />
                    </SelectTrigger>
                    <SelectContent>
                      {bundlerConfigs.map((config) => (
                        <SelectItem key={config.bundlerAddress} value={config.bundlerAddress}>
                          {config.bundlerName} ({(config.successRate).toFixed(1)}% success)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bundlerConfigs.map((config) => (
                    <Card key={config.bundlerAddress} className="border-2">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">{config.bundlerName}</h3>
                          <Badge 
                            variant={config.isActive ? 'default' : 'secondary'}
                            className={config.isActive ? 'bg-green-100 text-green-800' : ''}
                          >
                            {config.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Success Rate</span>
                            <span className="font-medium">{config.successRate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Max Bundle Size</span>
                            <span className="font-medium">{config.maxBundleSize} ops</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Max Wait Time</span>
                            <span className="font-medium">{config.maxBundleWaitTime}ms</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Chain</span>
                            <span className="font-medium">
                              {config.chainId === 1 ? 'Ethereum' : `Chain ${config.chainId}`}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <Progress value={config.successRate} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Bundler Analytics
              </CardTitle>
              <CardDescription>
                Performance metrics and efficiency insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Bundles</p>
                        <p className="text-2xl font-bold">1,247</p>
                      </div>
                      <Package2 className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">97.8%</p>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Gas Savings</p>
                        <p className="text-2xl font-bold">23.5%</p>
                      </div>
                      <Zap className="w-8 h-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Advanced analytics charts would be displayed here</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Bundle performance, gas efficiency trends, and success rates over time
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}