/**
 * Shared interfaces for product forms
 */

// Base product form props that all forms should implement
export interface BaseProductFormProps {
  defaultValues?: any;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}
