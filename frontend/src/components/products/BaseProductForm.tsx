/**
 * Base product form component that provides common functionality for all product forms
 */

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { BaseProduct } from '@/types/products';

// Define props for the base product form
interface BaseProductFormProps<T extends BaseProduct> {
  defaultValues?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  isSubmitting?: boolean;
  schema: z.ZodType<any, any>;
  title?: string;
  children: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
}

// Generic base product form component
export function BaseProductForm<T extends BaseProduct>({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  schema,
  title = 'Product Details',
  children,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  onCancel
}: BaseProductFormProps<T>) {
  // Initialize form with schema validation
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
  });

  // Handle form submission
  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting product form:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-4">
            {children}
          </CardContent>
          <CardFooter className="flex justify-between">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {cancelLabel}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
