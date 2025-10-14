import React, { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2, Download, Upload, TrendingUp, AlertTriangle, Calculator } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useAddMarketPrices, useUpdateMarketPrice, useGetLatestYTM, useDeleteMarketPrice } from '@/hooks/bonds/useBondData'
import type { MarketPriceInput, MarketPrice } from '@/types/nav/bonds'
import { PriceSource } from '@/types/nav/bonds'

interface MarketPriceManagerProps {
  bondId: string
  existingPrices?: (MarketPrice | MarketPriceInput)[]
  onSuccess?: () => void
}

interface DataQualityMetrics {
  completeness: number
  staleness: 'current' | 'stale' | 'very_stale'
  gaps: number
  status: 'good' | 'warning' | 'poor'
}

// Type guard to check if a price has an id (is from database)
const hasId = (price: MarketPrice | MarketPriceInput): price is MarketPrice => {
  return 'id' in price && typeof price.id === 'string'
}

export function MarketPriceManager({
  bondId,
  existingPrices = [],
  onSuccess,
}: MarketPriceManagerProps) {
  const [prices, setPrices] = useState<(MarketPrice | MarketPriceInput)[]>(existingPrices)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [showChart, setShowChart] = useState(true)
  // Track edited prices: Map<priceId, updatedFields>
  const [editedPrices, setEditedPrices] = useState<Map<string, Partial<MarketPriceInput>>>(new Map())

  const addPricesMutation = useAddMarketPrices(bondId)
  const updatePriceMutation = useUpdateMarketPrice(bondId)
  const deletePriceMutation = useDeleteMarketPrice(bondId)
  const { data: latestYTM, isLoading: isLoadingYTM, refetch: refetchYTM } = useGetLatestYTM(bondId)

  const calculateDataQuality = (): DataQualityMetrics => {
    if (!prices.length) {
      return { completeness: 0, staleness: 'very_stale', gaps: 0, status: 'poor' }
    }

    const sortedPrices = [...prices].sort(
      (a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime()
    )

    const latestPrice = sortedPrices[0]
    const today = new Date()
    const daysSinceLatest = Math.floor(
      (today.getTime() - new Date(latestPrice.price_date).getTime()) / (1000 * 60 * 60 * 24)
    )

    let staleness: 'current' | 'stale' | 'very_stale'
    if (daysSinceLatest <= 7) staleness = 'current'
    else if (daysSinceLatest <= 30) staleness = 'stale'
    else staleness = 'very_stale'

    // Detect gaps (missing prices > 5 consecutive days)
    let gaps = 0
    for (let i = 0; i < sortedPrices.length - 1; i++) {
      const current = new Date(sortedPrices[i].price_date)
      const next = new Date(sortedPrices[i + 1].price_date)
      const daysDiff = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 5) gaps++
    }

    const completeness = Math.min(100, (prices.length / 365) * 100)

    let status: 'good' | 'warning' | 'poor'
    if (completeness >= 80 && staleness === 'current' && gaps < 3) status = 'good'
    else if (completeness >= 50 && staleness !== 'very_stale' && gaps < 10) status = 'warning'
    else status = 'poor'

    return { completeness, staleness, gaps, status }
  }

  const dataQuality = calculateDataQuality()

  const chartData = [...prices]
    .sort((a, b) => new Date(a.price_date).getTime() - new Date(b.price_date).getTime())
    .map((price) => ({
      date: format(new Date(price.price_date), 'MMM dd'),
      price: price.clean_price,
      dirty_price: price.dirty_price,
    }))

  const handleAddPrice = () => {
    const newPrice: MarketPriceInput = {
      price_date: new Date(),
      clean_price: 100, // Default to 100 (typical bond price) instead of 0
      dirty_price: 100, // Default to 100 instead of 0
      data_source: PriceSource.INTERNAL_PRICING,
      is_official_close: false,
    }
    setPrices([...prices, newPrice])
    setEditingIndex(prices.length)
  }

  const handleDeletePrice = async (index: number) => {
    const price = prices[index]
    
    // If price has an id, it's from the database - delete via API
    if (hasId(price)) {
      try {
        await deletePriceMutation.mutateAsync(price.id)
        // Remove from local state after successful API deletion
        setPrices(prices.filter((_, i) => i !== index))
        // Also remove from edited prices tracking if it was being edited
        if (editedPrices.has(price.id)) {
          const newEditedPrices = new Map(editedPrices)
          newEditedPrices.delete(price.id)
          setEditedPrices(newEditedPrices)
        }
        onSuccess?.()
      } catch (error) {
        console.error('Failed to delete market price:', error)
      }
    } else {
      // If no id, it's a new unsaved price - just remove from local state
      setPrices(prices.filter((_, i) => i !== index))
    }
  }

  const handleUpdatePrice = (index: number, field: keyof MarketPriceInput, value: any) => {
    const price = prices[index]
    const updated = [...prices]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-update dirty price if clean price changes
    if (field === 'clean_price') {
      updated[index].dirty_price = value
    }

    setPrices(updated)

    // Track edits for existing prices (those with IDs)
    if (hasId(price)) {
      const currentEdits = editedPrices.get(price.id) || {}
      setEditedPrices(new Map(editedPrices.set(price.id, {
        ...currentEdits,
        [field]: value,
        // Include dirty_price if clean_price changed
        ...(field === 'clean_price' ? { dirty_price: value } : {})
      })))
    }
  }

  const handleUseCalculatedYTM = async (index: number) => {
    try {
      const result = await refetchYTM()
      if (result.data?.ytm) {
        handleUpdatePrice(index, 'ytm', result.data.ytm)
      }
    } catch (error) {
      console.error('Failed to fetch calculated YTM:', error)
    }
  }

  const handleSave = async () => {
    try {
      // Separate new prices (without IDs) and edited prices (with IDs that were modified)
      const newPrices = prices.filter(p => !hasId(p)) as MarketPriceInput[]
      const hasNewPrices = newPrices.length > 0
      const hasEdits = editedPrices.size > 0
      
      // If nothing to save, exit early
      if (!hasNewPrices && !hasEdits) {
        console.log('No changes to save')
        onSuccess?.()
        return
      }
      
      // Validate all new prices before saving
      if (hasNewPrices) {
        const invalidPrices = newPrices.filter(
          (p) => p.clean_price <= 0 || p.dirty_price <= 0 || p.dirty_price < p.clean_price
        )
        
        if (invalidPrices.length > 0) {
          console.error('Validation failed: Invalid new prices found', invalidPrices)
          throw new Error(
            'All prices must be positive and dirty price must be >= clean price'
          )
        }

        // Validate YTM values are within reasonable range (-5% to 50%)
        const invalidYTM = newPrices.filter(
          (p) => p.ytm !== undefined && p.ytm !== null && (p.ytm < -0.05 || p.ytm > 0.50)
        )
        
        if (invalidYTM.length > 0) {
          console.error('Validation failed: Invalid YTM values found', invalidYTM)
          throw new Error(
            'YTM must be between -5% and 50%. Please check your values.'
          )
        }
      }

      // Save new prices
      if (hasNewPrices) {
        await addPricesMutation.mutateAsync(newPrices)
      }

      // Save edited prices
      if (hasEdits) {
        const updatePromises = Array.from(editedPrices.entries()).map(([priceId, updates]) => {
          // Validate edited prices
          const priceIndex = prices.findIndex(p => hasId(p) && p.id === priceId)
          if (priceIndex !== -1) {
            const price = prices[priceIndex]
            const updatedPrice = { ...price, ...updates }
            
            // Validate the updated price
            if (updatedPrice.clean_price <= 0 || updatedPrice.dirty_price <= 0) {
              throw new Error('All prices must be positive')
            }
            if (updatedPrice.dirty_price < updatedPrice.clean_price) {
              throw new Error('Dirty price must be >= clean price')
            }
            if (updatedPrice.ytm !== undefined && updatedPrice.ytm !== null) {
              if (updatedPrice.ytm < -0.05 || updatedPrice.ytm > 0.50) {
                throw new Error('YTM must be between -5% and 50%')
              }
            }
          }
          
          return updatePriceMutation.mutateAsync({ priceId, data: updates })
        })
        
        await Promise.all(updatePromises)
      }

      // Clear edited prices tracking
      setEditedPrices(new Map())
      
      onSuccess?.()
    } catch (error) {
      console.error('Failed to save market prices:', error)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Date', 'Clean Price', 'Dirty Price', 'Bid', 'Ask', 'YTM (%)', 'Spread (bps)', 'Source', 'Official']
    const rows = prices.map((p) => [
      p.price_date,
      p.clean_price,
      p.dirty_price,
      p.bid_price || '',
      p.ask_price || '',
      p.ytm ? (p.ytm * 100).toFixed(2) : '', // Convert decimal to percentage for export
      p.spread_to_benchmark || '',
      p.data_source,
      p.is_official_close,
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bond-${bondId}-market-prices.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Market Price Manager</CardTitle>
          <CardDescription>
            Manage bond market price history for mark-to-market valuation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleAddPrice} variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Add Price
            </Button>
            <Button onClick={handleExportCSV} variant="outline" disabled={!prices.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setShowChart(!showChart)} variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              {showChart ? 'Hide' : 'Show'} Chart
            </Button>
          </div>

          {/* Latest Calculated YTM Info */}
          {latestYTM && (
            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <div>
                    <strong>Latest Calculated YTM:</strong> {(latestYTM.ytm * 100).toFixed(2)}%
                    <span className="text-sm text-muted-foreground ml-2">
                      (from NAV calculation on {format(new Date(latestYTM.valuationDate), 'MMM dd, yyyy')})
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editingIndex !== null && handleUseCalculatedYTM(editingIndex)}
                    disabled={editingIndex === null}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Use for Current Row
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Data Quality Indicators */}
          {prices.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm font-semibold">Data Quality</div>
                    <Badge
                      variant={
                        dataQuality.status === 'good'
                          ? 'default'
                          : dataQuality.status === 'warning'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {dataQuality.status === 'good' && '●●●●●'}
                      {dataQuality.status === 'warning' && '●●●○○'}
                      {dataQuality.status === 'poor' && '●●○○○'}
                      <span className="ml-2">{Math.round(dataQuality.completeness)}% complete</span>
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Latest Price</div>
                    <div className="text-sm">
                      ${prices[0]?.clean_price.toFixed(2)} (
                      {format(new Date(prices[0]?.price_date), 'MMM dd')})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Staleness</div>
                    <Badge
                      variant={
                        dataQuality.staleness === 'current'
                          ? 'default'
                          : dataQuality.staleness === 'stale'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {dataQuality.staleness === 'current' && 'Current'}
                      {dataQuality.staleness === 'stale' && 'Stale'}
                      {dataQuality.staleness === 'very_stale' && 'Very Stale'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Data Gaps</div>
                    <div className="flex items-center gap-1 text-sm">
                      {dataQuality.gaps > 3 && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      {dataQuality.gaps} gaps detected
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Price Chart */}
      {showChart && prices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Price History</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#8884d8"
                  name="Clean Price"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="dirty_price"
                  stroke="#82ca9d"
                  name="Dirty Price"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Price History Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clean Price</TableHead>
                <TableHead>Dirty Price</TableHead>
                <TableHead>Bid</TableHead>
                <TableHead>Ask</TableHead>
                <TableHead>YTM</TableHead>
                <TableHead>Spread</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Official</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((price, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="date"
                        value={format(new Date(price.price_date), 'yyyy-MM-dd')}
                        onChange={(e) => handleUpdatePrice(index, 'price_date', new Date(e.target.value))}
                      />
                    ) : (
                      format(new Date(price.price_date), 'MMM dd, yyyy')
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={price.clean_price}
                        onChange={(e) =>
                          handleUpdatePrice(index, 'clean_price', parseFloat(e.target.value))
                        }
                      />
                    ) : (
                      `$${price.clean_price.toFixed(2)}`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={price.dirty_price}
                        onChange={(e) =>
                          handleUpdatePrice(index, 'dirty_price', parseFloat(e.target.value))
                        }
                      />
                    ) : (
                      `$${price.dirty_price.toFixed(2)}`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={price.bid_price || ''}
                        onChange={(e) =>
                          handleUpdatePrice(index, 'bid_price', parseFloat(e.target.value) || undefined)
                        }
                      />
                    ) : (
                      price.bid_price ? `$${price.bid_price.toFixed(2)}` : '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={price.ask_price || ''}
                        onChange={(e) =>
                          handleUpdatePrice(index, 'ask_price', parseFloat(e.target.value) || undefined)
                        }
                      />
                    ) : (
                      price.ask_price ? `$${price.ask_price.toFixed(2)}` : '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g., 6.50 for 6.50%"
                          value={price.ytm ? (price.ytm * 100).toFixed(2) : ''}
                          onChange={(e) => {
                            const percentageValue = parseFloat(e.target.value);
                            // Convert percentage to decimal for storage (e.g., 6.50 → 0.065)
                            const decimalValue = percentageValue ? percentageValue / 100 : undefined;
                            handleUpdatePrice(index, 'ytm', decimalValue);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUseCalculatedYTM(index)}
                          disabled={isLoadingYTM || !latestYTM}
                          title={latestYTM ? `Use calculated YTM: ${(latestYTM.ytm * 100).toFixed(2)}%` : 'No calculated YTM available'}
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      price.ytm ? `${(price.ytm * 100).toFixed(2)}%` : '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={price.spread_to_benchmark || ''}
                        onChange={(e) =>
                          handleUpdatePrice(
                            index,
                            'spread_to_benchmark',
                            parseFloat(e.target.value) || undefined
                          )
                        }
                      />
                    ) : (
                      price.spread_to_benchmark ? `${price.spread_to_benchmark.toFixed(2)} bps` : '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Select
                        value={price.data_source}
                        onValueChange={(value) =>
                          handleUpdatePrice(index, 'data_source', value as PriceSource)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bloomberg">Bloomberg</SelectItem>
                          <SelectItem value="reuters">Reuters</SelectItem>
                          <SelectItem value="ice">ICE</SelectItem>
                          <SelectItem value="tradeweb">TradeWeb</SelectItem>
                          <SelectItem value="markit">Markit</SelectItem>
                          <SelectItem value="internal_pricing">Internal Pricing</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="capitalize">{price.data_source.replace('_', ' ')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <input
                        type="checkbox"
                        checked={price.is_official_close}
                        onChange={(e) =>
                          handleUpdatePrice(index, 'is_official_close', e.target.checked)
                        }
                      />
                    ) : (
                      <Badge variant={price.is_official_close ? 'default' : 'outline'}>
                        {price.is_official_close ? 'Yes' : 'No'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {editingIndex === index ? (
                        <Button variant="ghost" size="sm" onClick={() => setEditingIndex(null)}>
                          Done
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setEditingIndex(index)}>
                          Edit
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePrice(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={
            (prices.filter(p => !hasId(p)).length === 0 && editedPrices.size === 0) ||
            addPricesMutation.isPending ||
            updatePriceMutation.isPending ||
            prices.some((p) => p.clean_price <= 0 || p.dirty_price <= 0 || p.dirty_price < p.clean_price)
          }
        >
          {(addPricesMutation.isPending || updatePriceMutation.isPending) ? 'Saving...' : (() => {
            const newCount = prices.filter(p => !hasId(p)).length
            const editCount = editedPrices.size
            const parts = []
            
            if (newCount > 0) {
              parts.push(`${newCount} New`)
            }
            if (editCount > 0) {
              parts.push(`${editCount} Edit${editCount !== 1 ? 's' : ''}`)
            }
            
            return parts.length > 0 ? `Save ${parts.join(' + ')}` : 'Save Changes'
          })()}
        </Button>
      </div>
    </div>
  )
}
