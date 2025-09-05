/**
 * Private Debt Calculator Form
 * Private debt NAV with credit risk and recovery rate analysis
 */

import { useState, useEffect, useCallback } from 'react'
import { useCalculatorSchema } from '@/hooks/nav/useCalculatorSchema'
import { useCalculateNav } from '@/hooks/nav/useCalculateNav'
import SchemaForm from './schema-form'
import { CalculatorFormProps } from './calculators.config'
import { CalculationResult, AssetType, NavCalculationRequest } from '@/types/nav'

export function PrivateDebtCalculatorForm({
  onSubmit,
  onReset,
  isLoading = false,
  initialData = {},
  error
}: CalculatorFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData)
  
  const { 
    schema, 
    isLoading: isSchemaLoading,
    isError: isSchemaError,
    error: schemaError
  } = useCalculatorSchema('private-debt')

  const {
    calculate,
    result,
    isLoading: isCalculating,
    reset: resetCalculation
  } = useCalculateNav({
    onSuccess: (result: CalculationResult) => {
      onSubmit?.(result)
    }
  })

  useEffect(() => {
    if (Object.keys(initialData).length) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleSubmit = useCallback(async (data: Record<string, any>) => {
    setFormData(data)
    const request: NavCalculationRequest = {
      productType: AssetType.PRIVATE_DEBT,
      valuationDate: data.valuationDate,
      targetCurrency: data.currency,
    }
    await calculate(request)
  }, [calculate])

  const handleReset = useCallback(() => {
    setFormData({})
    resetCalculation()
    onReset?.()
  }, [resetCalculation, onReset])

  if (isSchemaLoading) {
    return <div className="p-8 text-center">Loading calculator schema...</div>
  }

  if (isSchemaError) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg">
        <h3 className="font-medium text-destructive">Schema Error</h3>
        <p className="text-sm text-destructive/80 mt-1">
          {schemaError?.message || 'Failed to load calculator schema'}
        </p>
      </div>
    )
  }

  return schema ? (
    <SchemaForm
      schema={schema}
      initialData={formData}
      onSubmit={handleSubmit}
      onReset={handleReset}
      isLoading={isLoading || isCalculating}
    />
  ) : null
}

export default PrivateDebtCalculatorForm
