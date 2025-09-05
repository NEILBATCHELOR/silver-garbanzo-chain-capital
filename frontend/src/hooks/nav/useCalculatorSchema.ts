/**
 * useCalculatorSchema Hook
 * React hook for managing calculator schemas and validation
 * Maps calculator registry entries to form schemas for dynamic validation
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  getCalculatorById,
  type CalculatorRegistryEntry 
} from '@/components/nav/calculators/calculators.config'
import { NavError, convertToNavError, CalculatorSchema } from '@/types/nav'

export interface UseCalculatorSchemaResult {
  // Data
  schema: CalculatorSchema | null
  calculator: CalculatorRegistryEntry | null
  
  // State
  isLoading: boolean
  isError: boolean
  error: NavError | null
  
  // Validation helpers
  validateField: (fieldName: string, value: any) => string | null
  validateForm: (formData: any) => Record<string, string>
  isFormValid: (formData: any) => boolean
  
  // Schema utilities
  getRequiredFields: () => string[]
  getFieldSchema: (fieldName: string) => any
  getDefaultValues: () => Record<string, any>
}

interface UseCalculatorSchemaOptions {
  enabled?: boolean
}

export function useCalculatorSchema(
  calculatorId: string,
  options: UseCalculatorSchemaOptions = {}
): UseCalculatorSchemaResult {
  const { enabled = true } = options

  // Get calculator from registry
  const calculator = useMemo(() => {
    if (!calculatorId) return null
    return getCalculatorById(calculatorId)
  }, [calculatorId])

  // Query for dynamic schema (if needed in future)
  const query = useQuery({
    queryKey: ['nav', 'calculator-schema', calculatorId],
    queryFn: async (): Promise<CalculatorSchema | null> => {
      if (!calculator) {
        throw new Error(`Calculator with ID '${calculatorId}' not found`)
      }

      try {
        // TODO: When backend provides dynamic schemas, fetch them here
        // For now, create schema from calculator registry entry
        const schema: CalculatorSchema = {
          id: calculator.id,
          name: calculator.name,
          description: calculator.description,
          inputs: [], // Will be populated based on calculator type
          outputs: [] // Will be populated based on calculator type
        }

        return schema
      } catch (error) {
        throw convertToNavError(error)
      }
    },
    enabled: enabled && !!calculatorId && !!calculator,
    staleTime: 300000, // 5 minutes - schemas don't change often
    gcTime: 600000, // 10 minutes
    retry: 1
  })

  // Validation helpers
  const validateField = useMemo(() => {
    return (fieldName: string, value: any): string | null => {
      // TODO: Implement field-level validation based on schema
      // For now, return null (no validation errors)
      if (!query.data) return null
      
      const field = query.data.inputs.find(input => input.name === fieldName)
      if (!field) return null
      
      // Basic validation
      if (field.required && (value === undefined || value === null || value === '')) {
        return `${field.label} is required`
      }
      
      if (field.validation) {
        const validation = field.validation
        
        if (typeof value === 'number') {
          if (validation.min !== undefined && value < validation.min) {
            return `${field.label} must be at least ${validation.min}`
          }
          if (validation.max !== undefined && value > validation.max) {
            return `${field.label} must be at most ${validation.max}`
          }
        }
        
        if (typeof value === 'string' && validation.pattern) {
          const regex = new RegExp(validation.pattern)
          if (!regex.test(value)) {
            return `${field.label} format is invalid`
          }
        }
      }
      
      return null
    }
  }, [query.data])

  const validateForm = useMemo(() => {
    return (formData: any): Record<string, string> => {
      if (!query.data) return {}
      
      const errors: Record<string, string> = {}
      
      query.data.inputs.forEach(field => {
        const error = validateField(field.name, formData[field.name])
        if (error) {
          errors[field.name] = error
        }
      })
      
      return errors
    }
  }, [query.data, validateField])

  const isFormValid = useMemo(() => {
    return (formData: any): boolean => {
      const errors = validateForm(formData)
      return Object.keys(errors).length === 0
    }
  }, [validateForm])

  // Schema utilities
  const getRequiredFields = useMemo(() => {
    return (): string[] => {
      if (!query.data) return []
      return query.data.inputs
        .filter(input => input.required)
        .map(input => input.name)
    }
  }, [query.data])

  const getFieldSchema = useMemo(() => {
    return (fieldName: string) => {
      if (!query.data) return null
      return query.data.inputs.find(input => input.name === fieldName) || null
    }
  }, [query.data])

  const getDefaultValues = useMemo(() => {
    return (): Record<string, any> => {
      if (!query.data) return {}
      
      const defaults: Record<string, any> = {}
      query.data.inputs.forEach(input => {
        if (input.defaultValue !== undefined) {
          defaults[input.name] = input.defaultValue
        }
      })
      
      return defaults
    }
  }, [query.data])

  return {
    // Data
    schema: query.data || null,
    calculator,
    
    // State
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? convertToNavError(query.error) : null,
    
    // Validation helpers
    validateField,
    validateForm,
    isFormValid,
    
    // Schema utilities
    getRequiredFields,
    getFieldSchema,
    getDefaultValues
  }
}

export default useCalculatorSchema
