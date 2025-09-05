/**
 * Save as Valuation Component
 * Allows users to save calculation results as valuations with metadata
 */

import React, { useState } from 'react'
import { Save, Check, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/components/ui/use-toast'
import { CalculationResult } from '@/types/nav'
import { formatCurrency, formatDate } from '@/utils/nav'

const saveValuationSchema = z.object({
  name: z.string().min(1, 'Valuation name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  tags: z.string().optional(),
  isOfficial: z.boolean().optional(),
  approverNotes: z.string().optional()
})

type SaveValuationFormData = z.infer<typeof saveValuationSchema>

export interface SaveAsValuationProps {
  result: CalculationResult
  onSave: (metadata: Record<string, any>) => Promise<void>
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function SaveAsValuation({
  result,
  onSave,
  disabled = false,
  className = '',
  children
}: SaveAsValuationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const form = useForm<SaveValuationFormData>({
    resolver: zodResolver(saveValuationSchema),
    defaultValues: {
      name: `NAV Calculation - ${formatDate(result.valuationDate)}`,
      description: `NAV calculation for ${result.productType} on ${formatDate(result.valuationDate)}`,
      tags: '',
      isOfficial: false,
      approverNotes: ''
    }
  })

  const handleSave = async (data: SaveValuationFormData) => {
    try {
      setIsSaving(true)

      // Parse tags from comma-separated string
      const tags = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : []

      const metadata = {
        name: data.name,
        description: data.description,
        tags,
        isOfficial: data.isOfficial || false,
        approverNotes: data.approverNotes,
        savedAt: new Date().toISOString(),
        calculationDetails: {
          navValue: result.navValue,
          navPerShare: result.navPerShare,
          totalAssets: result.totalAssets,
          totalLiabilities: result.totalLiabilities,
          netAssets: result.netAssets,
          sharesOutstanding: result.sharesOutstanding,
          currency: result.currency
        }
      }

      await onSave(metadata)

      toast({
        title: 'Valuation Saved',
        description: `"${data.name}" has been saved successfully.`,
        duration: 3000,
      })

      setIsOpen(false)
      form.reset()
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save valuation',
        variant: 'destructive',
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const defaultTrigger = (
    <Button
      variant="default"
      size="sm"
      disabled={disabled}
      className={className}
    >
      <Save className="h-4 w-4 mr-2" />
      Save as Valuation
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Save as Valuation</DialogTitle>
          <DialogDescription>
            Save this calculation result as a valuation record for future reference.
          </DialogDescription>
        </DialogHeader>

        {/* Calculation Summary */}
        <div className="border rounded-lg p-4 bg-gray-50 mb-4">
          <h4 className="font-medium mb-2">Calculation Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">NAV Value:</span>
              <div className="font-medium">{formatCurrency(result.navValue, result.currency)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">NAV per Share:</span>
              <div className="font-medium">
                {result.navPerShare ? formatCurrency(result.navPerShare, result.currency) : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Valuation Date:</span>
              <div className="font-medium">{formatDate(result.valuationDate)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Product Type:</span>
              <div className="font-medium">{result.productType}</div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valuation Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter valuation name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional description of this valuation"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide additional context about this valuation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="quarterly, official, year-end (comma separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add tags to help organize and find this valuation later
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="approverNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Approval Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notes for the approval process"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Internal notes for compliance and approval workflow
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Valuation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Quick Save Button - for immediate saving without dialog
 */
export function QuickSaveValuation({
  result,
  onSave,
  disabled = false,
  className = ''
}: Pick<SaveAsValuationProps, 'result' | 'onSave' | 'disabled' | 'className'>) {
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleQuickSave = async () => {
    try {
      setIsSaving(true)

      const metadata = {
        name: `NAV Calculation - ${formatDate(result.valuationDate)}`,
        description: `Quick save NAV calculation for ${result.productType}`,
        tags: ['quick-save'],
        isOfficial: false,
        savedAt: new Date().toISOString(),
        calculationDetails: {
          navValue: result.navValue,
          currency: result.currency
        }
      }

      await onSave(metadata)

      toast({
        title: 'Valuation Saved',
        description: 'Calculation saved successfully.',
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save valuation',
        variant: 'destructive',
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleQuickSave}
      disabled={disabled || isSaving}
      className={className}
    >
      {isSaving ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
          Saving...
        </>
      ) : (
        <>
          <Save className="h-3 w-3 mr-2" />
          Quick Save
        </>
      )}
    </Button>
  )
}

export default SaveAsValuation
