import React, { useState, useCallback } from 'react'
import { Upload, Download, FileText, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BondsAPI } from '@/infrastructure/api/nav/bonds-api'
import { bondProductInputSchema } from '@/types/nav/bonds-validation'
import type { BondProductInput } from '@/types/nav/bonds'

interface ValidationError {
  row: number
  field: string
  message: string
  value: any
}

interface UploadResult {
  success: boolean
  totalRows: number
  successCount: number
  failureCount: number
  errors: ValidationError[]
}

interface BondCSVUploadProps {
  projectId: string
  onUploadComplete?: (result: UploadResult) => void
}

type UploadStep = 'upload' | 'preview' | 'validating' | 'results'

export function BondCSVUpload({ projectId, onUploadComplete }: BondCSVUploadProps) {
  const [step, setStep] = useState<UploadStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [progress, setProgress] = useState(0)

  const CSV_COLUMNS = [
    'bond_type',
    'issuer_name',
    'asset_name',
    'isin',
    'cusip',
    'sedol',
    'issue_date',
    'maturity_date',
    'par_value',
    'currency',
    'coupon_rate',
    'coupon_frequency',
    'day_count_convention',
    'accounting_treatment',
    'callable',
    'puttable',
    'convertible',
  ]

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0]
    if (csvFile) {
      setFile(csvFile)
      parseCSV(csvFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  })

  const parseCSV = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter((line) => line.trim())

      if (lines.length < 2) {
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim())
      const rows = lines.slice(1, 11).map((line) => {
        const values = line.split(',').map((v) => v.trim())
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index]
          return obj
        }, {} as any)
      })

      setPreviewData(rows)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  const validateRow = (row: any, rowIndex: number): { valid: boolean; errors: ValidationError[] } => {
    try {
      const transformedRow: BondProductInput = {
        project_id: projectId,
        bond_type: row.bond_type,
        issuer_name: row.issuer_name,
        asset_name: row.asset_name,
        isin: row.isin || undefined,
        cusip: row.cusip || undefined,
        sedol: row.sedol || undefined,
        issue_date: row.issue_date,
        maturity_date: row.maturity_date,
        face_value: parseFloat(row.par_value || row.face_value),
        currency: row.currency,
        coupon_rate: parseFloat(row.coupon_rate),
        coupon_frequency: row.coupon_frequency,
        day_count_convention: row.day_count_convention,
        accounting_treatment: row.accounting_treatment,
        callable_features: row.callable === 'true' || row.callable === '1',
        puttable: row.puttable === 'true' || row.puttable === '1',
        convertible: row.convertible === 'true' || row.convertible === '1',
      }

      bondProductInputSchema.parse(transformedRow)
      return { valid: true, errors: [] }
    } catch (error: any) {
      const errors: ValidationError[] = error.errors?.map((err: any) => ({
        row: rowIndex + 2,
        field: err.path.join('.'),
        message: err.message,
        value: row[err.path[0]],
      })) || []

      return { valid: false, errors }
    }
  }

  const handleValidateAndUpload = async () => {
    if (!file) return

    setStep('validating')
    setProgress(0)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter((line) => line.trim())

      const headers = lines[0].split(',').map((h) => h.trim())

      // Validate structure
      const structureErrors: string[] = []
      for (const requiredColumn of CSV_COLUMNS.slice(0, 5)) {
        if (!headers.includes(requiredColumn)) {
          structureErrors.push(`Missing required column: ${requiredColumn}`)
        }
      }

      if (structureErrors.length > 0) {
        setUploadResult({
          success: false,
          totalRows: lines.length - 1,
          successCount: 0,
          failureCount: lines.length - 1,
          errors: structureErrors.map((msg, idx) => ({
            row: 0,
            field: 'structure',
            message: msg,
            value: '',
          })),
        })
        setStep('results')
        return
      }

      const allRows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim())
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index]
          return obj
        }, {} as any)
      })

      // Validate each row
      const validationResults = allRows.map((row, index) => {
        setProgress(((index + 1) / allRows.length) * 50)
        return validateRow(row, index)
      })

      const allErrors = validationResults.flatMap((r) => r.errors)

      if (allErrors.length === 0) {
        // All valid, upload to backend
        try {
          const bonds: BondProductInput[] = allRows.map((row) => ({
            project_id: projectId,
            bond_type: row.bond_type,
            issuer_name: row.issuer_name,
            asset_name: row.asset_name,
            isin: row.isin || undefined,
            cusip: row.cusip || undefined,
            sedol: row.sedol || undefined,
            issue_date: row.issue_date,
            maturity_date: row.maturity_date,
            face_value: parseFloat(row.par_value || row.face_value),
            currency: row.currency,
            coupon_rate: parseFloat(row.coupon_rate),
            coupon_frequency: row.coupon_frequency,
            day_count_convention: row.day_count_convention,
            accounting_treatment: row.accounting_treatment,
            callable_features: row.callable === 'true' || row.callable === '1',
            puttable: row.puttable === 'true' || row.puttable === '1',
            convertible: row.convertible === 'true' || row.convertible === '1',
          }))

          const result = await BondsAPI.bulkUpload({ bonds })

          setUploadResult({
            success: true,
            totalRows: allRows.length,
            successCount: result.success ? allRows.length : 0,
            failureCount: 0,
            errors: [],
          })
          setProgress(100)
          setStep('results')
          onUploadComplete?.(result as UploadResult)
        } catch (error) {
          setUploadResult({
            success: false,
            totalRows: allRows.length,
            successCount: 0,
            failureCount: allRows.length,
            errors: [
              {
                row: 0,
                field: 'upload',
                message: 'Failed to upload bonds to server',
                value: '',
              },
            ],
          })
          setStep('results')
        }
      } else {
        // Has validation errors
        setUploadResult({
          success: false,
          totalRows: allRows.length,
          successCount: validationResults.filter((r) => r.valid).length,
          failureCount: validationResults.filter((r) => !r.valid).length,
          errors: allErrors,
        })
        setProgress(100)
        setStep('results')
      }
    }
    reader.readAsText(file)
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await BondsAPI.downloadTemplate()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'bond-upload-template.csv'
      a.click()
    } catch (error) {
      console.error('Failed to download template:', error)
    }
  }

  const handleDownloadErrorReport = () => {
    if (!uploadResult) return

    const headers = ['Row', 'Field', 'Error Message', 'Value']
    const rows = uploadResult.errors.map((err) => [err.row, err.field, err.message, err.value])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bond-upload-errors.csv'
    a.click()
  }

  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setPreviewData([])
    setUploadResult(null)
    setProgress(0)
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Bonds CSV</CardTitle>
            <CardDescription>
              Upload a CSV file containing bond data or download a template to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                {isDragActive
                  ? 'Drop the CSV file here'
                  : 'Drag and drop a CSV file here, or click to select'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Supports CSV files up to 10MB</p>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleDownloadTemplate} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Data</CardTitle>
            <CardDescription>
              Review the first 10 rows of your CSV file before uploading
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>File: {file?.name}</AlertTitle>
              <AlertDescription>
                Showing first {previewData.length} rows of your data
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {CSV_COLUMNS.map((col) => (
                      <TableHead key={col} className="whitespace-nowrap">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      {CSV_COLUMNS.map((col) => (
                        <TableCell key={col} className="whitespace-nowrap">
                          {row[col] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button onClick={handleReset} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleValidateAndUpload}>Validate & Upload</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Validating */}
      {step === 'validating' && (
        <Card>
          <CardHeader>
            <CardTitle>Validating...</CardTitle>
            <CardDescription>Processing and validating your bond data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Validating bond data... Please do not close this window.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === 'results' && uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={uploadResult.success ? 'default' : 'destructive'}>
              {uploadResult.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Upload Successful!</AlertTitle>
                  <AlertDescription>
                    Successfully uploaded {uploadResult.successCount} of {uploadResult.totalRows}{' '}
                    bonds
                  </AlertDescription>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Upload Failed</AlertTitle>
                  <AlertDescription>
                    {uploadResult.successCount} succeeded, {uploadResult.failureCount} failed out of{' '}
                    {uploadResult.totalRows} bonds
                  </AlertDescription>
                </>
              )}
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{uploadResult.totalRows}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.successCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {uploadResult.failureCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {uploadResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Errors ({uploadResult.errors.length})</h3>
                  <Button onClick={handleDownloadErrorReport} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Error Report
                  </Button>
                </div>

                <ScrollArea className="h-[300px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadResult.errors.slice(0, 100).map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline">{error.row}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{error.field}</TableCell>
                          <TableCell className="text-sm">{error.message}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {error.value || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button onClick={handleReset} variant="outline">
                Upload Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
