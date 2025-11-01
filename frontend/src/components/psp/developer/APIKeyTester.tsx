/**
 * API Key Tester Component
 * 
 * Allows immediate testing of newly created API keys.
 * Tests authentication, authorization, and basic endpoints.
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Play, Copy, Eye, EyeOff } from 'lucide-react'

interface TestResult {
  test: string
  status: 'success' | 'error' | 'pending'
  message: string
  statusCode?: number
  responseTime?: number
}

export function APIKeyTester() {
  const [apiKey, setApiKey] = useState('')
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox')
  const [showKey, setShowKey] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isTestingApiKey, setIsTestingApiKey] = useState(false)

  const testAPIKey = async () => {
    if (!apiKey.trim()) {
      return
    }

    setIsTestingApiKey(true)
    setTestResults([])

    const tests = [
      {
        name: 'Authentication',
        endpoint: '/api/psp/auth/api-keys',
        method: 'GET'
      },
      {
        name: 'Authorization',
        endpoint: '/api/psp/balances',
        method: 'GET'
      },
      {
        name: 'Market Data',
        endpoint: '/api/psp/market-rates',
        method: 'GET'
      }
    ]

    for (const test of tests) {
      const startTime = Date.now()

      try {
        const response = await fetch(test.endpoint, {
          method: test.method,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })

        const responseTime = Date.now() - startTime
        const data = await response.json()

        setTestResults(prev => [...prev, {
          test: test.name,
          status: response.ok ? 'success' : 'error',
          message: response.ok 
            ? `✓ ${test.name} successful (${responseTime}ms)`
            : `✗ ${data.error || data.message || 'Failed'}`,
          statusCode: response.status,
          responseTime
        }])
      } catch (error) {
        setTestResults(prev => [...prev, {
          test: test.name,
          status: 'error',
          message: `✗ ${error instanceof Error ? error.message : 'Network error'}`
        }])
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    setIsTestingApiKey(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key Tester</CardTitle>
        <CardDescription>
          Test your API key immediately after creation to verify it works correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment Selection */}
        <div className="flex gap-2">
          <Button
            variant={environment === 'sandbox' ? 'default' : 'outline'}
            onClick={() => setEnvironment('sandbox')}
            size="sm"
          >
            Sandbox
          </Button>
          <Button
            variant={environment === 'production' ? 'default' : 'outline'}
            onClick={() => setEnvironment('production')}
            size="sm"
          >
            Production
          </Button>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="warp_sandbox_xxx... or warp_live_xxx..."
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                  className="h-7 w-7 p-0"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-7 w-7 p-0"
                  disabled={!apiKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Test Button */}
        <Button
          onClick={testAPIKey}
          disabled={!apiKey.trim() || isTestingApiKey}
          className="w-full"
        >
          {isTestingApiKey ? (
            <>
              <Play className="mr-2 h-4 w-4 animate-pulse" />
              Testing API Key...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Test API Key
            </>
          )}
        </Button>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <Label>Test Results</Label>
            {testResults.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {result.status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">{result.test}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.message}
                    </p>
                  </div>
                </div>
                {result.statusCode && (
                  <Badge
                    variant={result.statusCode < 300 ? 'default' : 'destructive'}
                  >
                    {result.statusCode}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Success Summary */}
        {testResults.length > 0 && testResults.every(r => r.status === 'success') && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              🎉 All tests passed! Your API key is working correctly.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Summary */}
        {testResults.length > 0 && testResults.some(r => r.status === 'error') && (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              ⚠️ Some tests failed. Check the results above for details.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
