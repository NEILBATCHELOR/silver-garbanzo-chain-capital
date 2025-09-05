/**
 * Calculator Detail Page
 * Dynamic page that loads and displays calculator-specific forms
 */

import React, { Suspense } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Calculator, Clock, Info, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useCalculator } from '@/hooks/nav'
import { useCalculatorSchema } from '@/hooks/nav'
import { getCalculatorComponent } from '@/components/nav/calculators/calculators.config'
import { CalculatorShell } from '@/components/nav/calculators'

export default function CalculatorDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  // Get calculator info and schema
  const {
    calculator,
    hasPermission,
    requiredPermissions,
    isLoading: isLoadingCalculator,
    isError: isCalculatorError,
    error: calculatorError
  } = useCalculator(slug || '')

  const {
    schema,
    isLoading: isLoadingSchema,
    isError: isSchemaError,
    error: schemaError
  } = useCalculatorSchema(slug || '', {
    enabled: !!slug && hasPermission
  })

  // Get the calculator component
  const CalculatorComponent = slug ? getCalculatorComponent(slug) : null

  if (isLoadingCalculator) {
    return <CalculatorDetailSkeleton />
  }

  if (isCalculatorError || !calculator) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/nav/calculators')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculators
          </Button>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Calculator Not Found</CardTitle>
            <CardDescription className="text-red-600">
              {calculatorError?.message || 'The requested calculator could not be found.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/nav/calculators">Browse All Calculators</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/nav/calculators')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculators
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to use this calculator. Required permissions: {requiredPermissions.join(', ')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isSchemaError || !CalculatorComponent) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/nav/calculators')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculators
          </Button>
        </div>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Calculator Temporarily Unavailable</CardTitle>
            <CardDescription className="text-yellow-700">
              {schemaError?.message || 'This calculator is currently being updated. Please try again later.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/nav/calculators')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculators
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Calculator className="h-8 w-8 text-primary" />
              <span>{calculator.name}</span>
            </h1>
            <p className="text-muted-foreground mt-1">{calculator.description}</p>
          </div>
        </div>
      </div>

      {/* Calculator Info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calculator Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <Badge variant="outline" className="mt-1">
                  {calculator.category}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Complexity</p>
                <ComplexityBadge level={calculator.complexityLevel} />
              </div>

              {calculator.estimatedDuration && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duration</p>
                  <div className="flex items-center mt-1 text-sm">
                    <Clock className="h-3 w-3 mr-1" />
                    {calculator.estimatedDuration}
                  </div>
                </div>
              )}

              {calculator.assetTypes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Asset Types</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {calculator.assetTypes.map(assetType => (
                      <Badge key={assetType} variant="secondary" className="text-xs">
                        {assetType}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {calculator.features && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Features</p>
                  <ul className="mt-2 space-y-1">
                    {calculator.features.map((feature, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-2 flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    All calculations are performed using real-time market data and industry-standard methodologies.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calculator Form */}
        <div className="lg:col-span-3">
          <Suspense fallback={<CalculatorFormSkeleton />}>
            <CalculatorShell
              calculator={calculator}
              schema={schema}
              isLoading={isLoadingSchema}
            >
              {CalculatorComponent && (
                <CalculatorComponent
                  onSubmit={handleCalculatorSubmit}
                  onReset={handleCalculatorReset}
                  isLoading={false}
                />
              )}
            </CalculatorShell>
          </Suspense>
        </div>
      </div>
    </div>
  )

  function handleCalculatorSubmit(data: any) {
    console.log('Calculator submission:', data)
    // TODO: Integrate with useAsyncCalculation hook
    // This will be implemented when the calculator forms are updated
  }

  function handleCalculatorReset() {
    console.log('Calculator reset')
    // Handle form reset
  }
}

function CalculatorDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center space-x-4">
        <Skeleton className="h-9 w-32" />
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-3">
          <CalculatorFormSkeleton />
        </div>
      </div>
    </div>
  )
}

function CalculatorFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  )
}

interface ComplexityBadgeProps {
  level: 'basic' | 'intermediate' | 'advanced'
}

function ComplexityBadge({ level }: ComplexityBadgeProps) {
  const variants = {
    basic: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Basic' },
    intermediate: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Intermediate' },
    advanced: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Advanced' }
  }

  const variant = variants[level]
  
  return (
    <Badge 
      className={`${variant.color} border text-xs mt-1`}
      variant="outline"
    >
      {variant.label}
    </Badge>
  )
}
