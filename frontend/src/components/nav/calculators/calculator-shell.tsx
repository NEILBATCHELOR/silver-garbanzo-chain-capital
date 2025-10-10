/**
 * Calculator Shell - ENHANCED with Database Mode Support
 * Reusable wrapper component for all NAV calculators
 * Provides consistent header, actions, result display, and mode switching
 * 
 * NEW: Supports both standalone and database modes
 */

import { ReactNode, useState } from 'react'
import { Calculator, Play, RotateCcw, Save, Download, Info, Database, FileText, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CalculationResult, CalculationStatus, AssetType } from '@/types/nav'
import { CalculatorRegistryEntry } from './calculators.config'

// NEW: Mode type
export type CalculatorMode = 'standalone' | 'database'

interface CalculatorShellProps {
  calculator: CalculatorRegistryEntry
  children: ReactNode // The calculator form content
  schema?: any // Calculator schema from backend
  result?: CalculationResult
  error?: string
  isLoading?: boolean
  onCalculate?: () => void
  onReset?: () => void
  onSave?: () => void
  onExport?: () => void
  showActions?: boolean
  className?: string
  // NEW: Mode props
  mode?: CalculatorMode
  onModeChange?: (mode: CalculatorMode) => void
  // NEW: Database mode props
  assetId?: string
  assetName?: string
  onBackToList?: () => void
}

function getStatusBadge(status: CalculationStatus) {
  switch (status) {
    case CalculationStatus.COMPLETED:
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>
    case CalculationStatus.RUNNING:
      return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Running</Badge>
    case CalculationStatus.QUEUED:
      return <Badge variant="secondary">Queued</Badge>
    case CalculationStatus.FAILED:
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="secondary">Unknown</Badge>
  }
}

function getComplexityBadge(level: 'basic' | 'intermediate' | 'advanced') {
  switch (level) {
    case 'basic':
      return <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Basic</Badge>
    case 'intermediate':
      return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">Intermediate</Badge>
    case 'advanced':
      return <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">Advanced</Badge>
    default:
      return <Badge variant="secondary">Unknown</Badge>
  }
}

function getModeBadge(mode: CalculatorMode) {
  switch (mode) {
    case 'database':
      return (
        <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
          <Database className="h-3 w-3 mr-1" />
          Database Mode
        </Badge>
      )
    case 'standalone':
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <FileText className="h-3 w-3 mr-1" />
          Standalone Mode
        </Badge>
      )
  }
}

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(value)
}

// NEW: Database Mode Header
function DatabaseModeHeader({ 
  assetName, 
  onBackToList 
}: { 
  assetName?: string
  onBackToList?: () => void 
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      {onBackToList && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToList}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      )}
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-900">
          Calculating NAV for: {assetName || 'Selected Asset'}
        </p>
        <p className="text-xs text-blue-700">
          Data will be loaded automatically from the database
        </p>
      </div>
    </div>
  )
}

// NEW: Standalone Mode Header
function StandaloneModeHeader() {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 border rounded-lg">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          Manual Calculation Mode
        </p>
        <p className="text-xs text-muted-foreground">
          Enter all parameters manually for one-time calculations
        </p>
      </div>
    </div>
  )
}

function ResultsSection({ result }: { result: CalculationResult }) {
  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Calculation Results
        </h3>
        <div className="flex items-center gap-2">
          {getStatusBadge(result.status)}
          <span className="text-sm text-muted-foreground">
            {new Date(result.calculatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">NAV Value</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(result.navValue, result.currency)}
          </p>
        </div>

        {result.navPerShare && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">NAV Per Share</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(result.navPerShare, result.currency)}
            </p>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
          <p className="text-lg font-semibold text-foreground">
            {formatCurrency(result.totalAssets, result.currency)}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Total Liabilities</p>
          <p className="text-lg font-semibold text-foreground">
            {formatCurrency(result.totalLiabilities, result.currency)}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Net Assets</p>
          <p className="text-lg font-semibold text-foreground">
            {formatCurrency(result.netAssets, result.currency)}
          </p>
        </div>

        {result.sharesOutstanding && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Shares Outstanding</p>
            <p className="text-lg font-semibold text-foreground">
              {result.sharesOutstanding.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground pt-2 border-t">
        <p>Run ID: {result.runId}</p>
        <p>Valuation Date: {new Date(result.valuationDate).toLocaleDateString()}</p>
      </div>
    </div>
  )
}

export function CalculatorShell({
  calculator,
  children,
  schema,
  result,
  error,
  isLoading = false,
  onCalculate,
  onReset,
  onSave,
  onExport,
  showActions = true,
  className = '',
  // NEW: Mode props
  mode = 'standalone',
  onModeChange,
  assetId,
  assetName,
  onBackToList
}: CalculatorShellProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasResult = result && result.status === CalculationStatus.COMPLETED
  const hasError = error || (result && result.status === CalculationStatus.FAILED)
  
  // NEW: Check if calculator supports multiple modes
  const supportsModes = calculator.modes && calculator.modes.length > 1
  const supportsDatabase = calculator.modes?.includes('database')
  const currentMode = mode || calculator.defaultMode || 'standalone'

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl">{calculator.name}</CardTitle>
                {getComplexityBadge(calculator.complexityLevel)}
                {getModeBadge(currentMode)}
                {calculator.estimatedDuration && (
                  <Badge variant="outline" className="text-xs">
                    {calculator.estimatedDuration}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {calculator.description}
              </p>
              
              {/* NEW: Mode Switcher */}
              {supportsModes && onModeChange && (
                <div className="pt-2">
                  <Tabs value={currentMode} onValueChange={(value) => onModeChange(value as CalculatorMode)}>
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="standalone" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        Standalone
                      </TabsTrigger>
                      <TabsTrigger 
                        value="database" 
                        disabled={!supportsDatabase}
                        className="text-xs"
                      >
                        <Database className="h-3 w-3 mr-1" />
                        Database
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
              
              {calculator.features && calculator.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {calculator.features.slice(0, 3).map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {calculator.features.length > 3 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-xs cursor-help">
                            +{calculator.features.length - 3} more
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            {calculator.features.slice(3).map((feature, index) => (
                              <p key={index} className="text-xs">{feature}</p>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Calculator Information</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Asset Types:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {calculator.assetTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-medium">Category:</span>
                <p className="text-muted-foreground">{calculator.category}</p>
              </div>
            </div>
            
            {/* NEW: Mode information */}
            {calculator.modes && (
              <div className="text-sm">
                <span className="font-medium">Supported Modes:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {calculator.modes.map((m) => (
                    <Badge key={m} variant="secondary" className="text-xs">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {calculator.tags && (
              <div className="text-sm">
                <span className="font-medium">Tags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {calculator.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* NEW: Mode-specific headers */}
        {currentMode === 'database' && assetId && (
          <div className="mt-4">
            <DatabaseModeHeader assetName={assetName} onBackToList={onBackToList} />
          </div>
        )}
        {currentMode === 'standalone' && (
          <div className="mt-4">
            <StandaloneModeHeader />
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="pt-6 space-y-6">
        {/* Calculator Form */}
        <div className="space-y-4">
          {children}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                onClick={onCalculate || (() => {})}
                disabled={isLoading || !onCalculate}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Calculate
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={onReset || (() => {})}
                disabled={isLoading || !onReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            {hasResult && (
              <div className="flex items-center gap-2">
                {onSave && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSave}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                )}
                {onExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExport}
                    disabled={isLoading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {hasError && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="rounded-full bg-destructive/20 p-1 mt-0.5">
                <div className="w-2 h-2 bg-destructive rounded-full" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-destructive">Calculation Error</p>
                <p className="text-sm text-destructive/80 mt-1">
                  {error || result?.errorMessage || 'An unknown error occurred during calculation.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {hasResult && <ResultsSection result={result} />}
      </CardContent>
    </Card>
  )
}

export default CalculatorShell
