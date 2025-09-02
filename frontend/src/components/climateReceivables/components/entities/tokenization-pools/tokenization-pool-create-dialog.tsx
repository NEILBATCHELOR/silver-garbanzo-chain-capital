import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { tokenizationPoolsService } from '../../services';
import { RiskLevel } from '../../types';

interface TokenizationPoolCreateDialogProps {
  onPoolCreated: () => void;
}

/**
 * Dialog component for creating a new tokenization pool
 */
const TokenizationPoolCreateDialog: React.FC<TokenizationPoolCreateDialogProps> = ({ 
  onPoolCreated 
}) => {
  const { projectId } = useParams<{ projectId?: string }>();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Define form schema with Zod
  const formSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    totalValue: z.coerce.number().nonnegative('Total value must be non-negative'),
    riskProfile: z.enum([RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH])
  });
  
  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      totalValue: 0,
      riskProfile: RiskLevel.MEDIUM
    }
  });
  
  /**
   * Handle form submission
   */
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSubmitting(true);
      
      // Convert to database format
      const formattedValues = {
        name: values.name,
        total_value: values.totalValue,
        risk_profile: values.riskProfile,
        project_id: projectId // Include project ID when creating pool
      };
      
      // Create new pool
      const newPool = await tokenizationPoolsService.create(formattedValues);
      
      toast({
        title: "Success",
        description: `Pool "${newPool.name}" created successfully.`,
      });
      
      // Reset form and close dialog
      form.reset();
      setOpen(false);
      
      // Notify parent component to refresh the list
      onPoolCreated();
    } catch (err) {
      console.error('Failed to create pool:', err);
      toast({
        title: "Error",
        description: "Failed to create pool. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  /**
   * Handle dialog close
   */
  const handleClose = () => {
    form.reset();
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Pool
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Tokenization Pool</DialogTitle>
          <DialogDescription>
            Enter the details for a new tokenization pool. The pool value will be updated automatically as receivables are added.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pool Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter pool name" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this tokenization pool
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Total Value */}
              <FormField
                control={form.control}
                name="totalValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Value ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Initial value of the pool (will be updated as receivables are added)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Risk Profile - Full width */}
            <FormField
              control={form.control}
              name="riskProfile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Profile</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk profile" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={RiskLevel.LOW}>
                        Low Risk - Conservative investments with stable returns
                      </SelectItem>
                      <SelectItem value={RiskLevel.MEDIUM}>
                        Medium Risk - Balanced approach with moderate volatility
                      </SelectItem>
                      <SelectItem value={RiskLevel.HIGH}>
                        High Risk - Aggressive investments with potential for higher returns
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The risk classification for this pool determines the types of receivables that can be added
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Creating...' : 'Create Pool'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TokenizationPoolCreateDialog;
