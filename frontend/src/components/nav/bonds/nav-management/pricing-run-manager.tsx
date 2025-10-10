import { useState } from 'react'
import { format } from 'date-fns'
import { Play, CheckCircle2, XCircle, Clock, AlertCircle, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Bond {
  id: string
  bondName: string
  issuer: string
  currentNAV?: number
  lastCalculated?: string
}

interface CalculationResult {
  bondId: string
  bondName: string
  status: 'pending' | 'calculating' | 'success' | 'error'
  navValue?: number
  errorMessage?: string
  calculatedAt?: string
}

interface PricingRunManagerProps {
  bonds: Bond[]
  onRunBatchCalculation: (bondIds: string[]) => Promise<CalculationResult[]>
}

export function PricingRunManager({ bonds, onRunBatchCalculation }: PricingRunManagerProps) {
  const [selectedBonds, setSelectedBonds] = useState<Set<string>>(new Set())
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<CalculationResult[]>([])
  const [progress, setProgress] = useState(0)

  const toggleBond = (bondId: string) => {
    const newSelected = new Set(selectedBonds)
    if (newSelected.has(bondId)) {
      newSelected.delete(bondId)
    } else {
      newSelected.add(bondId)
    }
    setSelectedBonds(newSelected)
  }

  const toggleAll = () => {
    if (selectedBonds.size === bonds.length) {
      setSelectedBonds(new Set())
    } else {
      setSelectedBonds(new Set(bonds.map((b) => b.id)))
    }
  }

  const runBatchCalculation = async () => {
    if (selectedBonds.size === 0) return

    setIsRunning(true)
    setProgress(0)

    try {
      const bondIds = Array.from(selectedBonds)
      const totalBonds = bondIds.length

      // Initialize results as pending
      const initialResults: CalculationResult[] = bondIds.map((id) => {
        const bond = bonds.find((b) => b.id === id)!
        return {
          bondId: id,
          bondName: bond.bondName,
          status: 'pending',
        }
      })
      setResults(initialResults)

      // Simulate batch processing with progress updates
      for (let i = 0; i < bondIds.length; i++) {
        const bond = bonds.find((b) => b.id === bondIds[i])!
        
        // Update status to calculating
        setResults((prev) =>
          prev.map((r) =>
            r.bondId === bondIds[i] ? { ...r, status: 'calculating' } : r
          )
        )

        // Simulate calculation (in real app, this would be API call)
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Update result (simulate success/failure)
        const success = Math.random() > 0.1 // 90% success rate
        setResults((prev) =>
          prev.map((r) =>
            r.bondId === bondIds[i]
              ? {
                  ...r,
                  status: success ? 'success' : 'error',
                  navValue: success ? (bond.currentNAV || 0) * (1 + (Math.random() - 0.5) * 0.02) : undefined,
                  errorMessage: success ? undefined : 'Calculation failed: Missing market data',
                  calculatedAt: success ? new Date().toISOString() : undefined,
                }
              : r
          )
        )

        // Update progress
        setProgress(((i + 1) / totalBonds) * 100)
      }

      // Call actual batch calculation API
      // const actualResults = await onRunBatchCalculation(bondIds)
      // setResults(actualResults)
    } catch (error) {
      console.error('Batch calculation error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const exportResults = () => {
    const headers = ['Bond', 'Status', 'NAV', 'Calculated At', 'Error']
    const rows = results.map((r) => [
      r.bondName,
      r.status,
      r.navValue?.toFixed(2) || '',
      r.calculatedAt ? format(new Date(r.calculatedAt), 'yyyy-MM-dd HH:mm:ss') : '',
      r.errorMessage || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch_calculation_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const successCount = results.filter((r) => r.status === 'success').length
  const errorCount = results.filter((r) => r.status === 'error').length

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Batch Pricing Run</CardTitle>
              <CardDescription>
                Calculate NAV for multiple bonds simultaneously
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {selectedBonds.size} / {bonds.length} selected
              </Badge>
              <Button
                onClick={runBatchCalculation}
                disabled={selectedBonds.size === 0 || isRunning}
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? 'Running...' : 'Run Calculation'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Processing {results.filter((r) => r.status === 'calculating').length} of{' '}
                  {selectedBonds.size} bonds...
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bond Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Bonds</CardTitle>
          <CardDescription>Choose which bonds to include in the batch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedBonds.size === bonds.length && bonds.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Bond</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead className="text-right">Current NAV</TableHead>
                  <TableHead>Last Calculated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonds.map((bond) => (
                  <TableRow key={bond.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedBonds.has(bond.id)}
                        onCheckedChange={() => toggleBond(bond.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{bond.bondName}</TableCell>
                    <TableCell>{bond.issuer}</TableCell>
                    <TableCell className="text-right font-mono">
                      {bond.currentNAV
                        ? `$${bond.currentNAV.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {bond.lastCalculated
                        ? format(new Date(bond.lastCalculated), 'MMM dd, HH:mm')
                        : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calculation Results</CardTitle>
                <CardDescription>
                  {successCount} successful, {errorCount} errors
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportResults}>
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bond</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">NAV</TableHead>
                    <TableHead>Calculated At</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.bondId}>
                      <TableCell className="font-medium">{result.bondName}</TableCell>
                      <TableCell>
                        {result.status === 'pending' && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {result.status === 'calculating' && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1 animate-spin" />
                            Calculating
                          </Badge>
                        )}
                        {result.status === 'success' && (
                          <Badge variant="default">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        )}
                        {result.status === 'error' && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {result.navValue
                          ? `$${result.navValue.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {result.calculatedAt
                          ? format(new Date(result.calculatedAt), 'MMM dd, HH:mm:ss')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {result.errorMessage && (
                          <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span>{result.errorMessage}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {errorCount > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Some calculations failed</AlertTitle>
                <AlertDescription>
                  {errorCount} bond{errorCount !== 1 ? 's' : ''} failed to calculate. Review the
                  error messages above and ensure all required data is available.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
