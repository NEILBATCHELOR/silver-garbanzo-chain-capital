import React, { useState, useEffect } from 'react';
// Use the app's existing useUser hook
import { useUser } from '@/hooks/auth/user/useUser';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { X, Plus, Bell, Mail, Calendar, Info } from 'lucide-react';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { 
  NotificationSettings, 
  NotificationChannel, 
  EmailTemplate 
} from '@/types/notifications';
import { LifecycleEventType } from '@/types/products';
import { notificationSettingsService } from '@/services/products/notificationSettingsService';
import { lifecycleNotificationService } from '@/services/products/lifecycleNotificationService';
import { ProjectType } from '@/types/projects/projectTypes';

// Schema for form validation
const formSchema = z.object({
  disabled: z.boolean().default(false),
  notificationChannels: z.array(z.nativeEnum(NotificationChannel)).min(1, {
    message: "Select at least one notification channel",
  }),
  eventTypes: z.array(z.nativeEnum(LifecycleEventType)).default([]),
  advanceNoticeDays: z.array(z.number()).min(1, {
    message: "Select at least one advance notice period",
  }),
  emailTemplate: z.nativeEnum(EmailTemplate),
  emailRecipients: z.array(
    z.string().email("Invalid email address")
  ).max(10, {
    message: "Maximum 10 email recipients allowed"
  }).default([]),
});

interface NotificationSettingsFormProps {
  projectId?: string;
  projectType?: ProjectType;
  className?: string;
}

/**
 * Component for managing notification settings
 */
const NotificationSettingsForm: React.FC<NotificationSettingsFormProps> = ({
  projectId,
  projectType,
  className = ''
}) => {
  // Use the app's useUser hook instead of a mock user
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [newRecipient, setNewRecipient] = useState<string>('');
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      disabled: false,
      notificationChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      eventTypes: [],
      advanceNoticeDays: [1, 7, 30],
      emailTemplate: EmailTemplate.DEFAULT,
      emailRecipients: [],
    },
  });
  
  // Event type options based on project type
  const getEventTypeOptions = (): { value: LifecycleEventType; label: string }[] => {
    // Common event types for all product types
    const commonEventTypes = [
      { value: LifecycleEventType.ISSUANCE, label: 'Issuance' },
      { value: LifecycleEventType.MATURITY, label: 'Maturity' },
      { value: LifecycleEventType.AUDIT, label: 'Audit' },
    ];
    
    // Add product-specific event types
    if (projectType) {
      switch (projectType) {
        case ProjectType.STRUCTURED_PRODUCTS:
          return [
            ...commonEventTypes,
            { value: LifecycleEventType.COUPON_PAYMENT, label: 'Coupon Payment' },
            { value: LifecycleEventType.CALL, label: 'Call' },
            { value: LifecycleEventType.BARRIER_HIT, label: 'Barrier Hit' },
          ];
          
        case ProjectType.BONDS:
          return [
            ...commonEventTypes,
            { value: LifecycleEventType.COUPON_PAYMENT, label: 'Coupon Payment' },
            { value: LifecycleEventType.CALL, label: 'Call' },
            { value: LifecycleEventType.REDEMPTION, label: 'Redemption' },
          ];
          
        case ProjectType.EQUITY:
          return [
            ...commonEventTypes,
            { value: LifecycleEventType.DIVIDEND_PAYMENT, label: 'Dividend Payment' },
            { value: LifecycleEventType.CORPORATE_ACTION, label: 'Corporate Action' },
          ];
          
        case ProjectType.FIAT_BACKED_STABLECOIN:
        case ProjectType.CRYPTO_BACKED_STABLECOIN:
        case ProjectType.COMMODITY_BACKED_STABLECOIN:
        case ProjectType.ALGORITHMIC_STABLECOIN:
        case ProjectType.REBASING_STABLECOIN:
          return [
            ...commonEventTypes,
            { value: LifecycleEventType.DEPEG, label: 'Depeg' },
            { value: LifecycleEventType.REBASE, label: 'Rebase' },
            { value: LifecycleEventType.UPGRADE, label: 'Protocol Upgrade' },
          ];
          
        default:
          return commonEventTypes;
      }
    }
    
    // Default to all event types if no project type specified
    return Object.values(LifecycleEventType).map(type => ({
      value: type,
      label: lifecycleNotificationService.formatEventType(type),
    }));
  };
  
  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const settings = await notificationSettingsService.getOrCreateDefaultSettings(
          user.id,
          projectId
        );
        
        setSettings(settings);
        
        // Set form values
        form.reset({
          disabled: settings.disabled,
          notificationChannels: settings.notificationChannels,
          eventTypes: settings.eventTypes,
          advanceNoticeDays: settings.advanceNoticeDays,
          emailTemplate: settings.emailTemplate,
          emailRecipients: settings.emailRecipients,
        });
      } catch (error) {
        console.error('Error loading notification settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load notification settings',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only call loadSettings when user is available
    if (user && !userLoading) {
      loadSettings();
    }
  }, [user, userLoading, projectId, form, toast]);
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !settings) return;
    
    try {
      const updatedSettings = await notificationSettingsService.updateNotificationSettings(
        settings.id,
        {
          ...values,
        }
      );
      
      setSettings(updatedSettings);
      
      toast({
        title: 'Success',
        description: 'Notification settings saved successfully',
      });
      
      // Log successful update
      console.log('Notification settings updated:', updatedSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification settings',
        variant: 'destructive',
      });
    }
  };
  
  // Add email recipient
  const handleAddRecipient = () => {
    if (!newRecipient || !newRecipient.includes('@')) return;
    
    const currentRecipients = form.getValues('emailRecipients') || [];
    
    if (currentRecipients.includes(newRecipient)) {
      toast({
        title: 'Duplicate Email',
        description: 'This email address is already in the list',
        variant: 'destructive',
      });
      return;
    }
    
    form.setValue('emailRecipients', [...currentRecipients, newRecipient]);
    setNewRecipient('');
  };
  
  // Remove email recipient
  const handleRemoveRecipient = (email: string) => {
    const currentRecipients = form.getValues('emailRecipients') || [];
    form.setValue(
      'emailRecipients',
      currentRecipients.filter(r => r !== email)
    );
  };
  
  if (userLoading || isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Loading notification preferences...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="animate-pulse h-40 w-full max-w-md bg-slate-100 rounded"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (!user) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Sign in to manage notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You need to be signed in to access notification settings.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Manage how you receive notifications for product lifecycle events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="email">Email Notifications</TabsTrigger>
            <TabsTrigger value="events">Event Types</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TabsContent value="general">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="disabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Notifications</FormLabel>
                          <FormDescription>
                            Enable or disable all notifications for {projectId ? 'this project' : 'all projects'}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={!field.value}
                            onCheckedChange={(checked) => field.onChange(!checked)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notificationChannels"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Notification Channels</FormLabel>
                          <FormDescription>
                            Select how you want to receive notifications
                          </FormDescription>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="notificationChannels"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-slate-50 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(NotificationChannel.IN_APP)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, NotificationChannel.IN_APP]);
                                      } else {
                                        field.onChange(current.filter(
                                          (value) => value !== NotificationChannel.IN_APP
                                        ));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="flex items-center">
                                    <Bell className="h-4 w-4 mr-2" />
                                    In-App
                                  </FormLabel>
                                  <FormDescription>
                                    Show notifications in the application
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="notificationChannels"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-slate-50 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(NotificationChannel.EMAIL)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, NotificationChannel.EMAIL]);
                                      } else {
                                        field.onChange(current.filter(
                                          (value) => value !== NotificationChannel.EMAIL
                                        ));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="flex items-center">
                                    <Mail className="h-4 w-4 mr-2" />
                                    Email
                                  </FormLabel>
                                  <FormDescription>
                                    Send email notifications
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="notificationChannels"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-slate-50 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(NotificationChannel.CALENDAR)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, NotificationChannel.CALENDAR]);
                                      } else {
                                        field.onChange(current.filter(
                                          (value) => value !== NotificationChannel.CALENDAR
                                        ));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Calendar
                                  </FormLabel>
                                  <FormDescription>
                                    Add events to your calendar
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="advanceNoticeDays"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Advance Notice</FormLabel>
                          <FormDescription>
                            How many days before an event should you be notified?
                          </FormDescription>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[1, 7, 14, 30].map((days) => (
                            <FormField
                              key={days}
                              control={form.control}
                              name="advanceNoticeDays"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-slate-50 transition-colors">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(days)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, days]);
                                        } else {
                                          field.onChange(current.filter(
                                            (value) => value !== days
                                          ));
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>
                                      {days === 1 ? '1 day before' : `${days} days before`}
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-slate-50 p-4 rounded-md flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">About Notification Settings</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        These settings apply to {projectId ? 'this specific project' : 'all projects'}. 
                        You'll receive notifications based on your selected channels, event types, and advance notice preferences.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="email">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="emailTemplate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Template</FormLabel>
                        <FormDescription>
                          Choose your preferred email format for notifications
                        </FormDescription>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select email template" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={EmailTemplate.DEFAULT}>Standard Notification</SelectItem>
                            <SelectItem value={EmailTemplate.DETAILED}>Detailed Report</SelectItem>
                            <SelectItem value={EmailTemplate.URGENT}>Urgent Action Required</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-3">
                    <FormLabel>Additional Recipients</FormLabel>
                    <FormDescription>
                      Add other email addresses to receive notifications (optional)
                    </FormDescription>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.watch('emailRecipients')?.map((email) => (
                        <div
                          key={email}
                          className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-sm"
                        >
                          <span>{email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(email)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        placeholder="Enter email address"
                        type="email"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddRecipient();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleAddRecipient}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-md flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">About Email Notifications</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Email notifications are sent according to your advance notice preferences.
                        For critical events like maturity or liquidation, urgent emails may be sent
                        regardless of your template choice.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="events">
                <div className="space-y-6">
                  <div>
                    <FormLabel className="text-base">Event Types</FormLabel>
                    <FormDescription className="mb-4">
                      Select which types of events you want to be notified about.
                      {form.watch('eventTypes')?.length === 0 && (
                        <span className="block mt-1 text-sm font-medium">
                          If none are selected, you'll be notified about all events.
                        </span>
                      )}
                    </FormDescription>
                    
                    <ScrollArea className="h-[300px] rounded-md border p-4">
                      <div className="space-y-4">
                        {getEventTypeOptions().map((option) => (
                          <React.Fragment key={option.value}>
                            <FormField
                              control={form.control}
                              name="eventTypes"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option.value)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, option.value]);
                                        } else {
                                          field.onChange(current.filter(
                                            (value) => value !== option.value
                                          ));
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>{option.label}</FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                            <Separator className="my-2" />
                          </React.Fragment>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>
              
              <div className="mt-6 flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Notification Settings'}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NotificationSettingsForm;