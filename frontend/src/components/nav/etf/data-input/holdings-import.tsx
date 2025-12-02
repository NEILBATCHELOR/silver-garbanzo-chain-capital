import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import type { CreateETFHoldingInput, ETFProduct, ETFWithLatestNAV, Blockchain } from '@/types/nav/etf'
import { etfService } from '@/services/nav/etfService'
import { toast } from 'sonner'
import { cn } from '@/utils/utils'

interface HoldingRow {
  row: number
  data: Partial<CreateETFHoldingInput>
  errors: string[]
  status: 'pending' | 'success' | 'error'
}

interface HoldingsImportProps {
  product: ETFProduct | ETFWithLatestNAV
  onSuccess?: () => void
  onCancel?: () => void
}

export function HoldingsImport({ product, onSuccess, onCancel }: HoldingsImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [holdings, setHoldings] = useState<HoldingRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    await processCSV(selectedFile)
  }

  const processCSV = async (file: File) => {
    setIsProcessing(true)
    
    try {
      const text = await file.text()
      const rows = text.split('\n').filter(row => row.trim())
      
      if (rows.length < 2) {
        throw new Error('CSV file must contain headers and at least one data row')
      }

      const headers = rows[0].split(',').map(h => h.trim().toLowerCase())
      const parsedHoldings: HoldingRow[] = []

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(v => v.trim())
        const rowData: Partial<CreateETFHoldingInput> = {}
        const errors: string[] = []

        headers.forEach((header, index) => {
          const value = values[index]
          
          switch (header) {
            case 'security_name':
              rowData.security_name = value
              if (!value) errors.push('Security name is required')
              break
            case 'security_ticker':
              rowData.security_ticker = value || undefined
              break
            case 'security_type':
              rowData.security_type = value as any
              if (!value) errors.push('Security type is required')
              break
            case 'quantity':
              rowData.quantity = parseFloat(value)
              if (isNaN(rowData.quantity) || rowData.quantity <= 0) {
                errors.push('Quantity must be a positive number')
              }
              break
            case 'price_per_unit':
              rowData.price_per_unit = parseFloat(value)
              if (isNaN(rowData.price_per_unit) || rowData.price_per_unit <= 0) {
                errors.push('Price must be a positive number')
              }
              break
            case 'weight_percentage':
              rowData.weight_percentage = parseFloat(value)
              if (isNaN(rowData.weight_percentage)) {
                errors.push('Weight percentage must be a number')
              }
              break
            case 'currency':
              rowData.currency = value || 'USD'
              break
            case 'sector':
              rowData.sector = value || undefined
              break
            case 'country':
              rowData.country = value || undefined
              break
            case 'blockchain':
              rowData.blockchain = (value as Blockchain | string) || undefined
              break
            case 'contract_address':
              rowData.contract_address = value || undefined
              break
            case 'custody_address':
              rowData.custody_address = value || undefined
              break
            case 'custodian_name':
              rowData.custodian_name = value || undefined
              break
            case 'is_staked':
              rowData.is_staked = value.toLowerCase() === 'true' || value === '1'
              break
            case 'staking_apr':
              if (value) {
                rowData.staking_apr = parseFloat(value)
              }
              break
          }
        })

        // Calculate market value
        if (rowData.quantity && rowData.price_per_unit) {
          rowData.market_value = rowData.quantity * rowData.price_per_unit
        }

        parsedHoldings.push({
          row: i,
          data: rowData,
          errors,
          status: errors.length > 0 ? 'error' : 'pending',
        })
      }

      setHoldings(parsedHoldings)
      toast.success(`Parsed ${parsedHoldings.length} holdings from CSV`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse CSV'
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    const validHoldings = holdings.filter(h => h.status === 'pending' || h.status === 'error' && h.errors.length === 0)
    
    if (validHoldings.length === 0) {
      toast.error('No valid holdings to import')
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      const totalHoldings = validHoldings.length
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < validHoldings.length; i++) {
        const holding = validHoldings[i]
        
        try {
          const data: CreateETFHoldingInput = {
            ...holding.data,
            fund_product_id: product.id,
            as_of_date: new Date(),
          } as CreateETFHoldingInput

          const response = await etfService.createHolding(product.id, data)
          
          if (response.success) {
            holding.status = 'success'
            successCount++
          } else {
            throw new Error(response.error || 'Failed to create holding')
          }
        } catch (error) {
          holding.status = 'error'
          holding.errors.push(error instanceof Error ? error.message : 'Unknown error')
          errorCount++
        }

        setImportProgress(((i + 1) / totalHoldings) * 100)
        setHoldings([...holdings])
      }

      toast.success(`Import complete: ${successCount} succeeded, ${errorCount} failed`)
      
      if (successCount > 0 && errorCount === 0) {
        onSuccess?.()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed'
      toast.error(message)
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'security_name',
      'security_ticker',
      'security_type',
      'quantity',
      'price_per_unit',
      'weight_percentage',
      'currency',
      'sector',
      'country',
      'blockchain',
      'contract_address',
      'custody_address',
      'custodian_name',
      'is_staked',
      'staking_apr'
    ]
    
    const exampleRow = [
      'Bitcoin',
      'BTC',
      'crypto',
      '10.5',
      '45000.00',
      '25.00',
      'USD',
      'Cryptocurrency',
      '',
      'bitcoin',
      '',
      'bc1q...',
      'Coinbase Custody',
      'false',
      ''
    ]

    const csvContent = [
      headers.join(','),
      exampleRow.join(',')
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'etf_holdings_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Template downloaded')
  }

  const totalValid = holdings.filter(h => h.errors.length === 0).length
  const totalErrors = holdings.filter(h => h.errors.length > 0).length
  const totalSuccess = holdings.filter(h => h.status === 'success').length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Import Holdings</CardTitle>
        <CardDescription>
          Import multiple holdings from a CSV file to {product.fund_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">CSV File</span>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {!file && (
            <Button
              variant="outline"
              className="w-full h-24 border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm">Click to upload CSV file</span>
              </div>
            </Button>
          )}

          {file && (
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>File Selected</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setHoldings([])
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  Remove
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Processing CSV</AlertTitle>
            <AlertDescription>
              Parsing and validating holdings...
            </AlertDescription>
          </Alert>
        )}

        {/* Import Summary */}
        {holdings.length > 0 && !isProcessing && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Import Summary</h3>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                    {totalValid} Valid
                  </Badge>
                  <Badge variant="outline">
                    <XCircle className="mr-1 h-3 w-3 text-red-500" />
                    {totalErrors} Errors
                  </Badge>
                  {totalSuccess > 0 && (
                    <Badge variant="outline">
                      <CheckCircle className="mr-1 h-3 w-3 text-blue-500" />
                      {totalSuccess} Imported
                    </Badge>
                  )}
                </div>
              </div>

              {totalErrors > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    {totalErrors} row{totalErrors > 1 ? 's have' : ' has'} validation errors. 
                    Fix the errors in your CSV or proceed to import only valid rows.
                  </AlertDescription>
                </Alert>
              )}

              {/* Import Progress */}
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importing holdings...</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}

              {/* Holdings Table */}
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Security</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Market Value</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.map((holding, index) => (
                      <TableRow key={index}>
                        <TableCell>{holding.row}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{holding.data.security_name}</span>
                            {holding.data.security_ticker && (
                              <span className="text-sm text-muted-foreground">{holding.data.security_ticker}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{holding.data.security_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {holding.data.quantity?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${holding.data.price_per_unit?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${holding.data.market_value?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {holding.status === 'pending' && holding.errors.length === 0 && (
                            <Badge variant="secondary">Ready</Badge>
                          )}
                          {holding.status === 'pending' && holding.errors.length > 0 && (
                            <Badge variant="destructive">Errors</Badge>
                          )}
                          {holding.status === 'success' && (
                            <Badge variant="default">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Success
                            </Badge>
                          )}
                          {holding.status === 'error' && holding.errors.length > 0 && (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Error Details */}
              {holdings.some(h => h.errors.length > 0) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Details</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {holdings
                        .filter(h => h.errors.length > 0)
                        .map((holding, index) => (
                          <li key={index}>
                            Row {holding.row}: {holding.errors.join(', ')}
                          </li>
                        ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button 
              variant="outline" 
              onClick={onCancel} 
              disabled={isProcessing || isImporting}
            >
              Cancel
            </Button>
          )}
          {holdings.length > 0 && totalValid > 0 && (
            <Button 
              onClick={handleImport} 
              disabled={isProcessing || isImporting || totalValid === 0}
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              Import {totalValid} Holding{totalValid > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
