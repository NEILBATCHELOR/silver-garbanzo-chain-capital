/**
 * Bond History Modal
 * Displays calculation history for a bond
 */

import React from 'react'
import { format } from 'date-fns'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { useBondCalculationHistory } from '@/hooks/bonds/useBondData'

interface BondHistoryModalProps {
  bondId: string
  open: boolean
  onClose: () => void
}

export function BondHistoryModal({ bondId, open, onClose }: BondHistoryModalProps) {
  const { data: historyResponse, isLoading } = useBondCalculationHistory(bondId)

  const history = historyResponse?.data || []

  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value)
  }

  const formatDate = (dateValue: any, formatString = 'MMM dd, yyyy'): string => {
    if (!dateValue) return 'N/A'
    
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', dateValue)
        return 'Invalid Date'
      }
      return format(date, formatString)
    } catch (error) {
      console.error('Error formatting date:', error, dateValue)
      return 'Invalid Date'
    }
  }

  const getConfidenceBadge = (level?: 'high' | 'medium' | 'low') => {
    if (!level) {
      return <Badge variant="outline">N/A</Badge>
    }
    
    const variants = {
      high: 'default',
      medium: 'secondary',
      low: 'destructive',
    } as const

    return <Badge variant={variants[level]}>{level.toUpperCase()}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Calculation History
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Historical NAV calculations for this bond
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading calculation history...
          </div>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No calculation history available for this bond
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>NAV</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Convexity</TableHead>
                  <TableHead>Calculated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((calc) => {
                  // Safely calculate previous NAV change
                  const prev = history[history.indexOf(calc) + 1]
                  const navChange = prev && calc.netAssetValue && prev.netAssetValue
                    ? ((calc.netAssetValue - prev.netAssetValue) / prev.netAssetValue) * 100
                    : 0

                  return (
                    <TableRow key={calc.id}>
                      <TableCell>
                        {formatDate(calc.as_of_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {calc.netAssetValue ? formatCurrency(calc.netAssetValue) : 'N/A'}
                          {prev && navChange !== 0 && (
                            <span
                              className={`text-xs flex items-center ${
                                navChange > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {navChange > 0 ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {Math.abs(navChange).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{calc.calculationMethod || 'N/A'}</TableCell>
                      <TableCell>{getConfidenceBadge(calc.confidenceLevel)}</TableCell>
                      <TableCell>
                        {calc.riskMetrics?.duration
                          ? calc.riskMetrics.duration.toFixed(2)
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {calc.riskMetrics?.convexity
                          ? calc.riskMetrics.convexity.toFixed(2)
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(calc.calculatedAt, 'MMM dd, HH:mm')}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}