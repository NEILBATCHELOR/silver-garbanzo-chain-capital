/**
 * Holdings Table
 * Display MMF holdings in detail view
 * Read-only table with sorting and filtering
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowUpDown } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useMMFHoldings } from '@/hooks/mmf'
import { MMFHoldingType, type MMFHolding } from '@/types/nav/mmf'

interface HoldingsTableProps {
  fundId: string
}

type SortField = 'issuer' | 'par_value' | 'amortized_cost' | 'maturity' | 'rating'
type SortDirection = 'asc' | 'desc'

export function HoldingsTable({ fundId }: HoldingsTableProps) {
  const [holdingTypeFilter, setHoldingTypeFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('issuer')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const { data: holdingsData, isLoading } = useMMFHoldings(fundId)
  const holdings = holdingsData?.data || []

  // Apply filters
  const filteredHoldings = holdings.filter(holding => {
    if (holdingTypeFilter === 'all') return true
    if (holdingTypeFilter === 'daily_liquid') return holding.is_daily_liquid
    if (holdingTypeFilter === 'weekly_liquid') return holding.is_weekly_liquid || holding.is_daily_liquid
    return holding.holding_type === holdingTypeFilter
  })

  // Apply sorting
  const sortedHoldings = [...filteredHoldings].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'issuer':
        aValue = a.issuer_name
        bValue = b.issuer_name
        break
      case 'par_value':
        aValue = Number(a.par_value)
        bValue = Number(b.par_value)
        break
      case 'amortized_cost':
        aValue = Number(a.amortized_cost)
        bValue = Number(b.amortized_cost)
        break
      case 'maturity':
        aValue = new Date(a.effective_maturity_date).getTime()
        bValue = new Date(b.effective_maturity_date).getTime()
        break
      case 'rating':
        aValue = a.credit_rating
        bValue = b.credit_rating
        break
      default:
        return 0
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue)
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Calculate portfolio metrics
  const totalParValue = sortedHoldings.reduce((sum, h) => sum + Number(h.par_value), 0)
  const totalAmortizedCost = sortedHoldings.reduce((sum, h) => sum + Number(h.amortized_cost), 0)
  const totalMarketValue = sortedHoldings.reduce((sum, h) => sum + Number(h.market_value), 0)
  const dailyLiquid = sortedHoldings.filter(h => h.is_daily_liquid).reduce((sum, h) => sum + Number(h.amortized_cost), 0)
  const weeklyLiquid = sortedHoldings.filter(h => h.is_weekly_liquid || h.is_daily_liquid).reduce((sum, h) => sum + Number(h.amortized_cost), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portfolio Holdings</CardTitle>
            <CardDescription>
              {sortedHoldings.length} securities totaling ${totalAmortizedCost.toLocaleString()} amortized cost
            </CardDescription>
          </div>
          <Select value={holdingTypeFilter} onValueChange={setHoldingTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Holdings</SelectItem>
              <SelectItem value="daily_liquid">Daily Liquid</SelectItem>
              <SelectItem value="weekly_liquid">Weekly Liquid</SelectItem>
              <SelectItem value={MMFHoldingType.TREASURY}>Treasury</SelectItem>
              <SelectItem value={MMFHoldingType.AGENCY}>Agency</SelectItem>
              <SelectItem value={MMFHoldingType.COMMERCIAL_PAPER}>Commercial Paper</SelectItem>
              <SelectItem value={MMFHoldingType.CD}>Certificate of Deposit</SelectItem>
              <SelectItem value={MMFHoldingType.REPO}>Repurchase Agreement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Par Value</p>
            <p className="text-xl font-bold">${totalParValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amortized Cost</p>
            <p className="text-xl font-bold">${totalAmortizedCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Market Value</p>
            <p className="text-xl font-bold">${totalMarketValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Liquidity</p>
            <p className="text-sm font-semibold">
              Daily: {totalAmortizedCost > 0 ? ((dailyLiquid / totalAmortizedCost) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-sm font-semibold">
              Weekly: {totalAmortizedCost > 0 ? ((weeklyLiquid / totalAmortizedCost) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('issuer')}
                    className="h-8 px-2"
                  >
                    Issuer
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Security</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('par_value')}
                    className="h-8 px-2"
                  >
                    Par Value
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('amortized_cost')}
                    className="h-8 px-2"
                  >
                    Amortized Cost
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Market Value</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('maturity')}
                    className="h-8 px-2"
                  >
                    Maturity
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('rating')}
                    className="h-8 px-2"
                  >
                    Rating
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Liquidity</TableHead>
                <TableHead className="text-right">% of Portfolio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    Loading holdings...
                  </TableCell>
                </TableRow>
              ) : sortedHoldings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No holdings match your filter
                  </TableCell>
                </TableRow>
              ) : (
                sortedHoldings.map((holding) => {
                  const percentage = totalAmortizedCost > 0 
                    ? (Number(holding.amortized_cost) / totalAmortizedCost) * 100 
                    : 0

                  return (
                    <TableRow key={holding.id}>
                      <TableCell>
                        <Badge variant="outline">{holding.holding_type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {holding.issuer_name}
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <div className="truncate" title={holding.security_description}>
                          {holding.security_description}
                        </div>
                        {holding.cusip && (
                          <p className="text-xs text-muted-foreground">
                            CUSIP: {holding.cusip}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(holding.par_value).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(holding.amortized_cost).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(holding.market_value).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(holding.effective_maturity_date), 'MMM d, yyyy')}
                        </div>
                        {holding.days_to_maturity && (
                          <p className="text-xs text-muted-foreground">
                            {holding.days_to_maturity} days
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={holding.credit_rating.startsWith('AA') ? 'default' : 'secondary'}
                        >
                          {holding.credit_rating}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {holding.is_daily_liquid && (
                            <Badge variant="default" className="text-xs">Daily</Badge>
                          )}
                          {holding.is_weekly_liquid && !holding.is_daily_liquid && (
                            <Badge variant="secondary" className="text-xs">Weekly</Badge>
                          )}
                          {!holding.is_daily_liquid && !holding.is_weekly_liquid && (
                            <Badge variant="outline" className="text-xs">—</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {percentage.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
