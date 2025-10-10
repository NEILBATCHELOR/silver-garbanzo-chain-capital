import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calculator, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface CalculationBreakdownProps {
  breakdown: {
    presentValue?: number
    accruedInterest?: number
    marketPrice?: number
    cleanPrice?: number
    dirtyPrice?: number
    ytm?: number
    spreadToBenchmark?: number
    components?: Array<{
      name: string
      value: number
      description?: string
    }>
  }
}

export function CalculationBreakdown({ breakdown }: CalculationBreakdownProps) {
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-'
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return '-'
    return `${(value * 100).toFixed(4)}%`
  }

  const formatBps = (value: number | undefined) => {
    if (value === undefined) return '-'
    return `${(value * 10000).toFixed(2)} bps`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calculation Breakdown
        </CardTitle>
        <CardDescription>
          Detailed components and intermediate values
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Components */}
        {(breakdown.marketPrice || breakdown.cleanPrice || breakdown.dirtyPrice) && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Price Components</div>
            <Table>
              <TableBody>
                {breakdown.cleanPrice !== undefined && (
                  <TableRow>
                    <TableCell className="font-medium">Clean Price</TableCell>
                    <TableCell className="text-right">
                      {breakdown.cleanPrice.toFixed(4)}%
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      Price without accrued interest
                    </TableCell>
                  </TableRow>
                )}
                {breakdown.accruedInterest !== undefined && (
                  <TableRow>
                    <TableCell className="font-medium">Accrued Interest</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(breakdown.accruedInterest)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      Interest earned since last payment
                    </TableCell>
                  </TableRow>
                )}
                {breakdown.dirtyPrice !== undefined && (
                  <TableRow>
                    <TableCell className="font-medium">Dirty Price</TableCell>
                    <TableCell className="text-right">
                      {breakdown.dirtyPrice.toFixed(4)}%
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      Price including accrued interest
                    </TableCell>
                  </TableRow>
                )}
                {breakdown.marketPrice !== undefined && (
                  <TableRow className="bg-accent">
                    <TableCell className="font-bold">Market Price</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(breakdown.marketPrice)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      Current market valuation
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Yield Components */}
        {(breakdown.ytm || breakdown.spreadToBenchmark) && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Yield Metrics</div>
            <Table>
              <TableBody>
                {breakdown.ytm !== undefined && (
                  <TableRow>
                    <TableCell className="font-medium">Yield to Maturity</TableCell>
                    <TableCell className="text-right">
                      {formatPercent(breakdown.ytm)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      Annualized return if held to maturity
                    </TableCell>
                  </TableRow>
                )}
                {breakdown.spreadToBenchmark !== undefined && (
                  <TableRow>
                    <TableCell className="font-medium">Spread to Benchmark</TableCell>
                    <TableCell className="text-right">
                      {formatBps(breakdown.spreadToBenchmark)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      Credit spread over risk-free rate
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Cash Flow Components */}
        {breakdown.presentValue !== undefined && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Valuation</div>
            <Table>
              <TableBody>
                <TableRow className="bg-accent">
                  <TableCell className="font-bold">Present Value</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(breakdown.presentValue)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    DCF valuation of future cash flows
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Additional Components */}
        {breakdown.components && breakdown.components.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Additional Components</div>
            <Table>
              <TableBody>
                {breakdown.components.map((component, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {component.name}
                        {component.description && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{component.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(component.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
