/**
 * Schema Form Component
 * Dynamic form generator based on calculator schema from backend
 * Supports validation, formatting, and field types
 */

import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, CalendarDays, DollarSign, Hash, Percent, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/utils/shared/utils'
import { CalculatorSchema, CalculatorInputField } from '@/types/nav'

interface SchemaFormProps {
  schema: CalculatorSchema
  initialData?: Record<string, any>
  onSubmit: (data: Record<string, any>) => void
  onReset?: () => void
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

// Field validation utilities
function createZodSchemaFromField(field: CalculatorInputField): z.ZodTypeAny {
  let schema: z.ZodTypeAny
  
  switch (field.type) {
    case 'string':
      schema = z.string()
      if (field.validation?.pattern) {
        schema = (schema as z.ZodString).regex(new RegExp(field.validation.pattern))
      }
      break
    
    case 'number':
      schema = z.coerce.number()
      if (field.validation?.min !== undefined) {
        schema = (schema as z.ZodNumber).min(field.validation.min)
      }
      if (field.validation?.max !== undefined) {
        schema = (schema as z.ZodNumber).max(field.validation.max)
      }
      break
    
    case 'date':
      schema = z.date()
      break
    
    case 'boolean':
      schema = z.boolean()
      break
    
    case 'select':
    case 'multiselect':
      if (field.validation?.options) {
        const values = field.validation.options.map(opt => opt.value)
        schema = field.type === 'multiselect' 
          ? z.array(z.enum(values as [string, ...string[]]))
          : z.enum(values as [string, ...string[]])
      } else {
        schema = field.type === 'multiselect' ? z.array(z.string()) : z.string()
      }
      break
    
    default:
      schema = z.string()
  }
  
  return field.required ? schema : schema.optional()
}

// Format display values
function formatFieldValue(value: any, field: CalculatorInputField): string {
  if (value === null || value === undefined) return ''
  
  switch (field.format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD' // Default, could be configurable
      }).format(Number(value))
    
    case 'percentage':
      return `${Number(value)}%`
    
    case 'date':
      return value instanceof Date ? format(value, 'PPP') : String(value)
    
    case 'decimal':
      return Number(value).toLocaleString('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      })
    
    default:
      return String(value)
  }
}

// Get field icon
function getFieldIcon(field: CalculatorInputField) {
  switch (field.format) {
    case 'currency':
      return <DollarSign className="h-4 w-4" />
    case 'percentage':
      return <Percent className="h-4 w-4" />
    case 'date':
      return <Calendar className="h-4 w-4" />
    default:
      switch (field.type) {
        case 'number':
          return <Hash className="h-4 w-4" />
        default:
          return null
      }
  }
}

// Individual field components
function StringField({ field, control }: { field: CalculatorInputField, control: any }) {
  return (
    <FormField
      control={control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            {getFieldIcon(field)}
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
            {field.units && <Badge variant="secondary" className="text-xs">{field.units}</Badge>}
          </FormLabel>
          <FormControl>
            <Input
              {...formField}
              placeholder={field.placeholder}
              disabled={control._formState.isSubmitting}
            />
          </FormControl>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function NumberField({ field, control }: { field: CalculatorInputField, control: any }) {
  const [showFormatted, setShowFormatted] = useState(false)
  
  return (
    <FormField
      control={control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            {getFieldIcon(field)}
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
            {field.units && <Badge variant="secondary" className="text-xs">{field.units}</Badge>}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                {...formField}
                type="number"
                placeholder={field.placeholder}
                disabled={control._formState.isSubmitting}
                step={field.format === 'currency' || field.format === 'decimal' ? '0.01' : '1'}
                min={field.validation?.min}
                max={field.validation?.max}
              />
              {field.format && formField.value && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowFormatted(!showFormatted)}
                  >
                    {showFormatted ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              )}
            </div>
          </FormControl>
          {showFormatted && formField.value && (
            <div className="text-sm text-muted-foreground">
              Formatted: {formatFieldValue(formField.value, field)}
            </div>
          )}
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function DateField({ field, control }: { field: CalculatorInputField, control: any }) {
  return (
    <FormField
      control={control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !formField.value && "text-muted-foreground"
                  )}
                  disabled={control._formState.isSubmitting}
                >
                  {formField.value ? (
                    format(formField.value, "PPP")
                  ) : (
                    <span>{field.placeholder || "Pick a date"}</span>
                  )}
                  <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={formField.value}
                onSelect={formField.onChange}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function BooleanField({ field, control }: { field: CalculatorInputField, control: any }) {
  return (
    <FormField
      control={control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-base">{field.label}</FormLabel>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
          </div>
          <FormControl>
            <Switch
              checked={formField.value}
              onCheckedChange={formField.onChange}
              disabled={control._formState.isSubmitting}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function SelectField({ field, control }: { field: CalculatorInputField, control: any }) {
  return (
    <FormField
      control={control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </FormLabel>
          <Select
            onValueChange={formField.onChange}
            defaultValue={formField.value}
            disabled={control._formState.isSubmitting}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {field.validation?.options?.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// Main schema form component
export function SchemaForm({
  schema,
  initialData = {},
  onSubmit,
  onReset,
  isLoading = false,
  disabled = false,
  className = ''
}: SchemaFormProps) {
  // Generate Zod schema from field definitions
  const zodSchema = useMemo(() => {
    const schemaObject: Record<string, z.ZodTypeAny> = {}
    
    schema.inputs.forEach(field => {
      schemaObject[field.name] = createZodSchemaFromField(field)
    })
    
    return z.object(schemaObject)
  }, [schema])

  // Initialize form with validation
  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: initialData,
    mode: 'onBlur'
  })

  // Reset form when initial data changes
  useEffect(() => {
    form.reset(initialData)
  }, [initialData, form])

  // Handle form submission
  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data)
  })

  // Handle form reset
  const handleReset = () => {
    form.reset()
    onReset?.()
  }

  // Render field based on type
  const renderField = (field: CalculatorInputField) => {
    const key = `field-${field.name}`
    
    switch (field.type) {
      case 'string':
        return <StringField key={key} field={field} control={form.control} />
      
      case 'number':
        return <NumberField key={key} field={field} control={form.control} />
      
      case 'date':
        return <DateField key={key} field={field} control={form.control} />
      
      case 'boolean':
        return <BooleanField key={key} field={field} control={form.control} />
      
      case 'select':
        return <SelectField key={key} field={field} control={form.control} />
      
      case 'multiselect':
        // TODO: Implement multiselect component
        return <SelectField key={key} field={field} control={form.control} />
      
      default:
        return <StringField key={key} field={field} control={form.control} />
    }
  }

  return (
    <TooltipProvider>
      <Form {...form}>
        <form 
          onSubmit={handleSubmit} 
          className={cn("space-y-6", className)}
        >
          {/* Form Description */}
          {schema.description && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{schema.description}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schema.inputs.map(renderField)}
          </div>

          {/* Form Actions - Handled by parent CalculatorShell */}
          <div className="sr-only">
            <Button type="submit" disabled={disabled || isLoading}>
              Submit
            </Button>
            <Button type="button" onClick={handleReset} disabled={disabled || isLoading}>
              Reset
            </Button>
          </div>

          {/* Validation Summary */}
          {Object.keys(form.formState.errors).length > 0 && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <h4 className="text-sm font-medium text-destructive mb-2">
                Please fix the following errors:
              </h4>
              <ul className="text-sm text-destructive space-y-1">
                {Object.entries(form.formState.errors).map(([key, error]) => (
                  <li key={key}>
                    • {schema.inputs.find(f => f.name === key)?.label || key}: {(error as any)?.message || 'Invalid value'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </Form>
    </TooltipProvider>
  )
}

export default SchemaForm
