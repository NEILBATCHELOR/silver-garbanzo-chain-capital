import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { v4 as uuidv4 } from 'uuid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWrapper } from '@/components/ui/date-picker-wrapper';
import { 
  CreateLifecycleEventRequest, 
  EventStatus, 
  LifecycleEventType, 
  ProductLifecycleEvent 
} from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';

interface LifecycleEventFormProps {
  productId: string;
  productType: ProjectType;
  initialEvent?: ProductLifecycleEvent;
  onSubmit: (event: CreateLifecycleEventRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const eventSchema = z.object({
  eventType: z.nativeEnum(LifecycleEventType),
  eventDate: z.date(),
  quantity: z.number().optional(),
  transactionHash: z.string().optional(),
  actor: z.string().optional(),
  details: z.string().optional(),
});

type FormValues = z.infer<typeof eventSchema>;

/**
 * Form component for adding or editing product lifecycle events
 */
const LifecycleEventForm: React.FC<LifecycleEventFormProps> = ({
  productId,
  productType,
  initialEvent,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const { user } = useAuth();
  const currentUserName = user?.user_metadata?.full_name || user?.email || 'System';
  
  // Generate a unique submission ID that persists through re-renders
  const submissionIdRef = useRef(uuidv4());
  // Initialize form with default values or from initialEvent if editing
  const form = useForm<FormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: initialEvent ? {
      eventType: initialEvent.eventType,
      eventDate: initialEvent.eventDate,
      quantity: initialEvent.quantity || undefined,
      transactionHash: initialEvent.transactionHash || '',
      actor: initialEvent.actor || currentUserName,
      details: initialEvent.details || '',
    } : {
      eventType: LifecycleEventType.ISSUANCE,
      eventDate: new Date(),
      quantity: undefined,
      transactionHash: '',
      actor: currentUserName,
      details: '',
    },
  });

  const [submissionLock, setSubmissionLock] = useState(false);
  const submissionInProgressRef = useRef(false);

  const handleSubmit = async (values: FormValues) => {
    // Double-check both state and ref to prevent race conditions
    if (submissionLock || isSubmitting || submissionInProgressRef.current) {
      console.log('Submission already in progress, preventing duplicate submission');
      return;
    }
    
    try {
      // Set both state and ref for most reliable prevention
      setSubmissionLock(true);
      submissionInProgressRef.current = true;
      
      // Ensure all required fields are included
      const eventData: CreateLifecycleEventRequest = {
        productId,
        productType,
        eventType: values.eventType,
        eventDate: values.eventDate,
        quantity: values.quantity,
        transactionHash: values.transactionHash || submissionIdRef.current, // Use submission ID as fallback
        actor: values.actor,
        details: values.details,
        // Add client-side metadata to help with deduplication
        metadata: {
          submissionId: submissionIdRef.current,
          timestamp: Date.now()
        }
      };
      
      await onSubmit(eventData);
      // We intentionally do NOT reset the lock here - the form will be unmounted by the parent
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Handle duplicate event errors with user-friendly message
      if (error instanceof Error && 
          (error.message.includes('similar event was recently created') ||
           error.message.includes('Duplicate event detected'))) {
        // For duplicate errors, show a toast or alert instead of logging error
        console.warn('Duplicate event prevented:', error.message);
        // You could add a toast notification here if available
        // toast.warning('This event was already created recently. Please wait a moment before trying again.');
      }
      
      // Reset submission lock on error
      setSubmissionLock(false);
      submissionInProgressRef.current = false;
    }
  };
  
  // This cleanup is important to avoid issues with stale refs
  useEffect(() => {
    return () => {
      submissionInProgressRef.current = false;
    };
  }, []);

  // Get event type display name
  const getEventTypeDisplay = (type: LifecycleEventType): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card className="w-full border-0 shadow-none">
      {/* Removed CardHeader and CardTitle as they're now in the Dialog */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(LifecycleEventType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {getEventTypeDisplay(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Event Date</FormLabel>
                  <DatePickerWrapper
                    date={field.value}
                    setDate={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter quantity"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? undefined : parseFloat(value));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Numeric value associated with this event (e.g., amount, count)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <FormControl>
                    <Input value={currentUserName} disabled {...field} />
                  </FormControl>
                  <FormDescription>
                    User responsible for this event (automatically populated)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transactionHash"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Hash (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter transaction hash" {...field} />
                  </FormControl>
                  <FormDescription>
                    Blockchain transaction hash or other reference ID
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter event details" 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Additional information about this event
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : initialEvent ? 'Update Event' : 'Add Event'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default LifecycleEventForm;
