import { useState } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { History, Download, Filter } from 'lucide-react'

import { useBondCalculationHistory } from '@/hooks/bonds/useBondData'

interface NAVHistoryTableProps {
  bondId: string
  bondName: string
}

export function NAVHistoryTable({ bondId, bondName }: NAVHistoryTableProps) {
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const { data: historyData, isLoading } = useBondCalculationHistory(bondId)

  const filteredData = historyData?.data.filter((item) => {
    if (methodFilter === 'all') return true
    return item.calculationMethod === methodFilter
  })

  const exportToCSV = () => {
    if (!filteredData) return

    const headers = [
      'Calculation Date',
      'Net Asset Value',
      'NAV Per Share',
      'Status',
      'Calculated At',
    ]
    const rows = filteredData.map((item) => [
      format(new Date(item.valuation_date), 'yyyy-MM-dd'),
      item.result_nav_value.toString(),
      item.nav_per_share?.toString() || 'N/A',
      item.status || 'completed',
      format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss'),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bondName.replace(/\s+/g, '_')}_nav_history.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            NAV History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading history...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              NAV Calculation History
            </CardTitle>
            <CardDescription>{bondName}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="DCF_YTM">DCF with YTM</SelectItem>
                <SelectItem value="MARK_TO_MARKET">Mark-to-Market</SelectItem>
                <SelectItem value="AMORTIZED_COST">Amortized Cost</SelectItem>
                <SelectItem value="OAS">Option-Adjusted Spread</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">NAV Value</TableHead>
                <TableHead className="text-right">NAV Per Share</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Calculated At</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData && filteredData.length > 0 ? (
                filteredData.map((item, index) => {
                  const previousNAV = index < filteredData.length - 1
                    ? filteredData[index + 1].result_nav_value
                    : null
                  const change = previousNAV
                    ? item.result_nav_value - previousNAV
                    : null
                  const changePercent = previousNAV && change
                    ? (change / previousNAV) * 100
                    : null

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {format(new Date(item.valuation_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${item.result_nav_value.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.nav_per_share 
                          ? `$${item.nav_per_share.toLocaleString('en-US', {
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            })}`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'completed'
                              ? 'default'
                              : item.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {item.status || 'completed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(item.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        {change !== null && changePercent !== null ? (
                          <div className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                            <div className="font-medium">
                              {change >= 0 ? '+' : ''}
                              ${Math.abs(change).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <div className="text-xs">
                              ({changePercent >= 0 ? '+' : ''}
                              {changePercent.toFixed(2)}%)
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No calculation history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
