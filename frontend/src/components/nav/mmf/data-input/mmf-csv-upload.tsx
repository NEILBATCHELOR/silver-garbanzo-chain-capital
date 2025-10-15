/**
 * MMF CSV Upload
 * Bulk upload holdings from CSV file with validation
 * Provides template download and error reporting
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

import { useBulkUploadMMFHoldings, downloadMMFHoldingsTemplate } from '@/hooks/mmf'
import { MMFHoldingType, type MMFHoldingInput } from '@/types/nav/mmf'

interface MMFCsvUploadProps {
  fundId: string
  fundCurrency?: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface ParsedHolding {
  data: MMFHoldingInput
  rowNumber: number
  errors: string[]
}

export function MMFCsvUpload({ fundId, fundCurrency = 'USD', onSuccess, onCancel }: MMFCsvUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedHoldings, setParsedHoldings] = useState<ParsedHolding[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isValidating, setIsValidating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useBulkUploadMMFHoldings(fundId, {
    onSuccess: (response) => {
      setUploadProgress(100)
      onSuccess?.()
    }
  })

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    setIsValidating(true)
    
    try {
      const text = await selectedFile.text()
      const parsed = parseCSV(text, fundId, fundCurrency)
      setParsedHoldings(parsed)
    } catch (error) {
      alert('Failed to parse CSV: ' + (error as Error).message)
    } finally {
      setIsValidating(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadMMFHoldingsTemplate()
    } catch (error) {
      alert('Failed to download template')
    }
  }

  const handleUpload = async () => {
    const validHoldings = parsedHoldings
      .filter(h => h.errors.length === 0)
      .map(h => h.data)

    if (validHoldings.length === 0) {
      alert('No valid holdings to upload')
      return
    }

    try {
      await uploadMutation.mutateAsync({ holdings: validHoldings })
    } catch (error) {
      alert('Upload failed: ' + (error as Error).message)
    }
  }

  const handleReset = () => {
    setFile(null)
    setParsedHoldings([])
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validCount = parsedHoldings.filter(h => h.errors.length === 0).length
  const errorCount = parsedHoldings.filter(h => h.errors.length > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Bulk Upload Holdings</h3>
        <p className="text-sm text-muted-foreground">
          Upload multiple holdings from a CSV file
        </p>
      </div>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Download Template</CardTitle>
          <CardDescription>
            Get the CSV template with required columns and formatting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadTemplate} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </Button>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Required columns:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>holding_type (treasury, agency, commercial_paper, cd, repo)</li>
              <li>issuer_name</li>
              <li>security_description</li>
              <li>par_value, amortized_cost, market_value, current_price</li>
              <li>effective_maturity_date, final_maturity_date, acquisition_date (YYYY-MM-DD)</li>
              <li>credit_rating</li>
              <li>is_daily_liquid, is_weekly_liquid (true/false)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Upload CSV</CardTitle>
          <CardDescription>
            Select your CSV file with holdings data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button asChild variant="outline">
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  {file ? 'Change File' : 'Select File'}
                </span>
              </Button>
            </label>
            {file && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{file.name}</span>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {isValidating && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Validating...</p>
              <Progress value={50} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {parsedHoldings.length > 0 && !isValidating && (
        <>
          <Alert variant={errorCount > 0 ? 'destructive' : 'default'}>
            {errorCount === 0 ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>Validation Results</AlertTitle>
            <AlertDescription>
              {validCount} valid holdings, {errorCount} with errors
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Review holdings before uploading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Issuer</TableHead>
                      <TableHead>Security</TableHead>
                      <TableHead className="text-right">Par Value</TableHead>
                      <TableHead className="text-right">Amortized Cost</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedHoldings.map((holding, index) => (
                      <TableRow key={index}>
                        <TableCell>{holding.rowNumber}</TableCell>
                        <TableCell>
                          {holding.errors.length === 0 ? (
                            <Badge variant="default">Valid</Badge>
                          ) : (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{holding.data.holding_type}</Badge>
                        </TableCell>
                        <TableCell>{holding.data.issuer_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {holding.data.security_description}
                        </TableCell>
                        <TableCell className="text-right">
                          ${holding.data.par_value.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${holding.data.amortized_cost.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {holding.errors.length > 0 && (
                            <ul className="text-xs text-destructive">
                              {holding.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Actions */}
      {parsedHoldings.length > 0 && (
        <div className="flex gap-4">
          <Button
            onClick={handleUpload}
            disabled={validCount === 0 || uploadMutation.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload {validCount} Holdings
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      )}

      {uploadMutation.isPending && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Uploading...</p>
          <Progress value={uploadProgress} />
        </div>
      )}
    </div>
  )
}

// ==================== CSV PARSING ====================

function parseCSV(text: string, fundId: string, currency: string): ParsedHolding[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  const headers = lines[0].split(',').map(h => h.trim())
  const requiredHeaders = [
    'holding_type', 'issuer_name', 'security_description',
    'par_value', 'amortized_cost', 'market_value', 'current_price',
    'effective_maturity_date', 'final_maturity_date', 'acquisition_date',
    'credit_rating', 'is_daily_liquid', 'is_weekly_liquid'
  ]

  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
  }

  const holdings: ParsedHolding[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1
    const values = lines[i].split(',').map(v => v.trim())
    const errors: string[] = []

    try {
      const getField = (name: string) => {
        const index = headers.indexOf(name)
        return index >= 0 ? values[index] : ''
      }

      const holding: MMFHoldingInput = {
        fund_product_id: fundId,
        holding_type: getField('holding_type') as MMFHoldingType,
        issuer_name: getField('issuer_name'),
        security_description: getField('security_description'),
        par_value: parseFloat(getField('par_value')) || 0,
        amortized_cost: parseFloat(getField('amortized_cost')) || 0,
        market_value: parseFloat(getField('market_value')) || 0,
        current_price: parseFloat(getField('current_price')) || 0,
        effective_maturity_date: new Date(getField('effective_maturity_date')),
        final_maturity_date: new Date(getField('final_maturity_date')),
        acquisition_date: new Date(getField('acquisition_date')),
        credit_rating: getField('credit_rating'),
        is_daily_liquid: getField('is_daily_liquid').toLowerCase() === 'true',
        is_weekly_liquid: getField('is_weekly_liquid').toLowerCase() === 'true',
        is_government_security: getField('is_government_security')?.toLowerCase() === 'true' || false,
        is_affiliated_issuer: false,
        currency,
        cusip: getField('cusip') || null,
        isin: getField('isin') || null,
      }

      // Validate fields
      if (!holding.holding_type) errors.push('Missing holding type')
      if (!holding.issuer_name) errors.push('Missing issuer name')
      if (!holding.security_description) errors.push('Missing security description')
      if (holding.par_value <= 0) errors.push('Invalid par value')
      if (holding.amortized_cost <= 0) errors.push('Invalid amortized cost')
      if (holding.market_value <= 0) errors.push('Invalid market value')
      if (!holding.credit_rating) errors.push('Missing credit rating')
      if (isNaN(holding.effective_maturity_date.getTime())) errors.push('Invalid effective maturity date')
      if (isNaN(holding.final_maturity_date.getTime())) errors.push('Invalid final maturity date')
      if (isNaN(holding.acquisition_date.getTime())) errors.push('Invalid acquisition date')

      holdings.push({
        data: holding,
        rowNumber,
        errors
      })
    } catch (error) {
      holdings.push({
        data: {} as MMFHoldingInput,
        rowNumber,
        errors: [`Parse error: ${(error as Error).message}`]
      })
    }
  }

  return holdings
}
