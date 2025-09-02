import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Building, Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { climatePayersService } from '../../../services';
import { ClimatePayer } from '../../../types';

// Credit rating options
const CREDIT_RATINGS = [
  { value: 'AAA', label: 'AAA - Highest Grade' },
  { value: 'AA+', label: 'AA+ - High Grade' },
  { value: 'AA', label: 'AA - High Grade' },
  { value: 'AA-', label: 'AA- - High Grade' },
  { value: 'A+', label: 'A+ - Upper Medium Grade' },
  { value: 'A', label: 'A - Upper Medium Grade' },
  { value: 'A-', label: 'A- - Upper Medium Grade' },
  { value: 'BBB+', label: 'BBB+ - Lower Medium Grade' },
  { value: 'BBB', label: 'BBB - Lower Medium Grade' },
  { value: 'BBB-', label: 'BBB- - Lower Medium Grade' },
  { value: 'BB+', label: 'BB+ - Non-Investment Grade' },
  { value: 'BB', label: 'BB - Non-Investment Grade' },
  { value: 'BB-', label: 'BB- - Non-Investment Grade' },
  { value: 'B+', label: 'B+ - Highly Speculative' },
  { value: 'B', label: 'B - Highly Speculative' },
  { value: 'B-', label: 'B- - Highly Speculative' },
  { value: 'CCC', label: 'CCC - Substantial Risk' },
  { value: 'CC', label: 'CC - Extremely Speculative' },
  { value: 'C', label: 'C - Extremely Speculative' },
  { value: 'D', label: 'D - Default' },
  { value: 'NR', label: 'NR - Not Rated' },
];

// Form schema
const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }).max(255, { message: 'Name must be less than 255 characters' }),
  creditRating: z.string().optional(),
  financialHealthScore: z.coerce.number().min(0, { message: 'Score must be between 0 and 100' }).max(100, { message: 'Score must be between 0 and 100' }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PayerFormDialogProps {
  onPayerAdded?: (payer: ClimatePayer) => void;
  trigger?: React.ReactNode;
}

/**
 * Dialog component for adding new climate payers
 */
const PayerFormDialog: React.FC<PayerFormDialogProps> = ({ 
  onPayerAdded,
  trigger 
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      creditRating: '',
      financialHealthScore: undefined,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      // Prepare payer data
      const payerData = {
        name: values.name,
        credit_rating: values.creditRating || undefined,
        financial_health_score: values.financialHealthScore || undefined,
        payment_history: null, // Initialize as null for new payers
      };

      // Create the payer
      const newPayer = await climatePayersService.create(payerData);

      // Success feedback
      toast({
        title: 'Success',
        description: `Payer "${newPayer.name}" created successfully.`,
      });

      // Reset form and close dialog
      form.reset();
      setOpen(false);

      // Notify parent component
      if (onPayerAdded) {
        onPayerAdded(newPayer);
      }

    } catch (err) {
      console.error('Error creating payer:', err);
      toast({
        title: 'Error',
        description: 'Failed to create payer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setOpen(false);
  };

  // Handle financial health score changes
  const handleHealthScoreChange = (value: number[]) => {
    const score = value[0];
    form.setValue('financialHealthScore', score);
  };

  // Get health score color
  const getHealthScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  // Get health score label
  const getHealthScoreLabel = (score?: number) => {
    if (!score) return 'Not assessed';
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const currentScore = form.watch('financialHealthScore');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Payer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Add New Climate Payer
          </DialogTitle>
          <DialogDescription>
            Create a new payer for renewable energy receivables. Payers are entities responsible for payments (utilities, corporations, government agencies).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Payer Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payer Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Pacific Gas & Electric, Tesla Inc., Department of Energy"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormDescription>
                    Full legal name of the entity responsible for payment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Credit Rating */}
            <FormField
              control={form.control}
              name="creditRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Rating (Optional)</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={(value) => field.onChange(value || undefined)}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select credit rating" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CREDIT_RATINGS.map((rating) => (
                        <SelectItem key={rating.value} value={rating.value}>
                          {rating.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Credit rating from agencies like S&P, Moody's, or Fitch
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Financial Health Score */}
            <FormField
              control={form.control}
              name="financialHealthScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span>Financial Health Score (Optional)</span>
                    <span className={`text-sm font-medium ${getHealthScoreColor(currentScore)}`}>
                      {currentScore ? `${currentScore}/100 - ${getHealthScoreLabel(currentScore)}` : 'Not set'}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Slider
                      value={[currentScore || 0]}
                      onValueChange={handleHealthScoreChange}
                      min={0}
                      max={100}
                      step={5}
                      disabled={loading}
                      className="mb-2"
                    />
                  </FormControl>
                  <FormDescription>
                    Internal score (0-100) based on payment history, financial stability, and risk assessment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Building className="mr-2 h-4 w-4" />
                Create Payer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayerFormDialog;