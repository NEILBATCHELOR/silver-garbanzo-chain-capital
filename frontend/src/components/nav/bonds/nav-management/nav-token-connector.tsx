import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link2, Plus, Trash, AlertCircle, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const tokenConnectionSchema = z.object({
  tokenId: z.string().min(1, 'Token is required'),
  parityRatio: z.number().positive('Parity ratio must be positive'),
  collateralRatio: z.number().positive('Collateral ratio must be positive'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
})

type TokenConnectionFormValues = z.infer<typeof tokenConnectionSchema>

interface TokenConnection {
  id: string
  tokenId: string
  tokenName: string
  tokenSymbol: string
  parityRatio: number
  collateralRatio: number
  effectiveDate: string
  status: 'active' | 'inactive'
  createdAt: string
}

interface NAVTokenConnectorProps {
  bondId: string
  bondName: string
  availableTokens: Array<{
    id: string
    name: string
    symbol: string
  }>
  existingConnections: TokenConnection[]
  onConnect: (connection: TokenConnectionFormValues) => Promise<void>
  onDisconnect: (connectionId: string) => Promise<void>
}

export function NAVTokenConnector({
  bondId,
  bondName,
  availableTokens,
  existingConnections,
  onConnect,
  onDisconnect,
}: NAVTokenConnectorProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const form = useForm<TokenConnectionFormValues>({
    resolver: zodResolver(tokenConnectionSchema),
    defaultValues: {
      tokenId: '',
      parityRatio: 1.0,
      collateralRatio: 1.0,
      effectiveDate: new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (values: TokenConnectionFormValues) => {
    try {
      setIsConnecting(true)
      await onConnect(values)
      form.reset()
      setShowForm(false)
    } catch (error) {
      console.error('Connection error:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    if (window.confirm('Are you sure you want to disconnect this token?')) {
      await onDisconnect(connectionId)
    }
  }

  const getHealthStatus = (connection: TokenConnection): {
    status: 'healthy' | 'warning' | 'critical'
    message: string
  } => {
    // Example health check logic
    if (connection.collateralRatio < 1.0) {
      return { status: 'critical', message: 'Under-collateralized' }
    }
    if (connection.collateralRatio < 1.1) {
      return { status: 'warning', message: 'Low collateral buffer' }
    }
    return { status: 'healthy', message: 'Well-collateralized' }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Token Connections
              </CardTitle>
              <CardDescription>
                Link {bondName} to tokens for NAV updates
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Token
            </Button>
          </div>
        </CardHeader>
        {showForm && (
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="tokenId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a token" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTokens.map((token) => (
                            <SelectItem key={token.id} value={token.id}>
                              {token.name} ({token.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The token to receive NAV updates
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="parityRatio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parity Ratio</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          NAV per token (e.g., 1.00 = 1:1)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="collateralRatio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collateral Ratio</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Required collateral coverage
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        When this connection becomes active
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={isConnecting}>
                    {isConnecting ? 'Connecting...' : 'Connect Token'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        )}
      </Card>

      {/* Connections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Connections</CardTitle>
          <CardDescription>
            {existingConnections.length} token{existingConnections.length !== 1 ? 's' : ''}{' '}
            connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingConnections.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead className="text-right">Parity Ratio</TableHead>
                    <TableHead className="text-right">Collateral Ratio</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingConnections.map((connection) => {
                    const health = getHealthStatus(connection)
                    return (
                      <TableRow key={connection.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{connection.tokenName}</div>
                            <div className="text-sm text-muted-foreground">
                              {connection.tokenSymbol}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {connection.parityRatio.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {connection.collateralRatio.toFixed(2)}
                        </TableCell>
                        <TableCell>{connection.effectiveDate}</TableCell>
                        <TableCell>
                          <Badge variant={connection.status === 'active' ? 'default' : 'secondary'}>
                            {connection.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              health.status === 'healthy'
                                ? 'default'
                                : health.status === 'warning'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {health.status === 'healthy' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {health.status === 'warning' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {health.status === 'critical' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {health.message}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect(connection.id)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tokens connected yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(true)}
                className="mt-4"
              >
                Connect Your First Token
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>About Token Connections</AlertTitle>
        <AlertDescription>
          Connecting a bond to a token allows automatic NAV updates to flow to the token's price.
          The parity ratio determines how much NAV backs each token unit, while the collateral ratio
          ensures over-collateralization for security.
        </AlertDescription>
      </Alert>
    </div>
  )
}
