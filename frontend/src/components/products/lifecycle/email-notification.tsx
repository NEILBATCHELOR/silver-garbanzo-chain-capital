import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, X, Send, Plus } from 'lucide-react';
import { ProductLifecycleEvent } from '@/types/products';
import { NotificationSettings, EmailTemplate, NotificationChannel } from '@/types/notifications/notificationSettings';
import { notificationSettingsService } from '@/services/products/notificationSettingsService';
import { lifecycleNotificationService } from '@/services/products/lifecycleNotificationService';
import { format } from 'date-fns';

interface EmailNotificationProps {
  event: ProductLifecycleEvent;
  onSend: (recipients: string[], subject: string, body: string) => Promise<boolean>;
  notificationSettings?: NotificationSettings;
  defaultRecipients?: string[];
  className?: string;
}

/**
 * Component for sending email notifications for lifecycle events
 */
const EmailNotification: React.FC<EmailNotificationProps> = ({
  event,
  onSend,
  notificationSettings,
  defaultRecipients = [],
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [recipients, setRecipients] = useState<string[]>(
    notificationSettings?.emailRecipients?.length ? 
      [...defaultRecipients, ...notificationSettings.emailRecipients] : 
      defaultRecipients
  );
  const [newRecipient, setNewRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>(
    lifecycleNotificationService.generateEmailSubject(event)
  );
  const [body, setBody] = useState<string>(
    generateEmailBody(event)
  );
  const [template, setTemplate] = useState<string>(
    notificationSettings?.emailTemplate || 'default'
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendCopy, setSendCopy] = useState<boolean>(true);

  // Update recipients when notification settings change
  useEffect(() => {
    if (notificationSettings?.emailRecipients?.length) {
      setRecipients([
        ...defaultRecipients,
        ...notificationSettings.emailRecipients.filter(email => !defaultRecipients.includes(email))
      ]);
    }
  }, [notificationSettings, defaultRecipients]);
  
  // Update template when notification settings change
  useEffect(() => {
    if (notificationSettings?.emailTemplate) {
      setTemplate(notificationSettings.emailTemplate);
    }
  }, [notificationSettings]);
  
  const handleAddRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient('');
    }
  };
  
  const handleRemoveRecipient = (recipient: string) => {
    setRecipients(recipients.filter(r => r !== recipient));
  };
  
  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    
    // Update subject and body based on template
    if (value === 'default') {
      setSubject(lifecycleNotificationService.generateEmailSubject(event));
      setBody(generateEmailBody(event));
    } else if (value === 'detailed') {
      setSubject(`Detailed Report: ${lifecycleNotificationService.generateEmailSubject(event)}`);
      setBody(generateDetailedEmailBody(event));
    } else if (value === 'urgent') {
      setSubject(`URGENT ACTION REQUIRED: ${lifecycleNotificationService.formatEventType(event.eventType)}`);
      setBody(generateUrgentEmailBody(event));
    }
  };
  
  const handleSend = async () => {
    if (recipients.length === 0) return;
    
    setIsSending(true);
    
    // Add current user email if sendCopy is checked
    let finalRecipients = [...recipients];
    if (sendCopy && defaultRecipients.length > 0 && !recipients.includes(defaultRecipients[0])) {
      finalRecipients.push(defaultRecipients[0]);
    }
    
    const success = await onSend(finalRecipients, subject, body);
    setIsSending(false);
    
    if (success) {
      setIsOpen(false);
    }
  };
  
  // Check if email notifications are enabled in settings
  const emailNotificationsEnabled = notificationSettings ? 
    !notificationSettings.disabled && 
    notificationSettings.notificationChannels.includes(NotificationChannel.EMAIL) : 
    true;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={className}
          disabled={!emailNotificationsEnabled}
          title={!emailNotificationsEnabled ? "Email notifications are disabled in settings" : ""}
        >
          <Mail className="mr-2 h-4 w-4" />
          Send Email Notification
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send Email Notification</DialogTitle>
          <DialogDescription>
            Send an email notification about the upcoming event to team members
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email Template</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Standard Notification</SelectItem>
                <SelectItem value="detailed">Detailed Report</SelectItem>
                <SelectItem value="urgent">Urgent Action Required</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Recipients</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {recipients.map(recipient => (
                <div 
                  key={recipient}
                  className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-sm"
                >
                  <span>{recipient}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveRecipient(recipient)}
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
            {notificationSettings?.emailRecipients?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Default recipients from your notification settings have been added.
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Email Body</Label>
            <Textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px]"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="send-copy" 
              checked={sendCopy}
              onCheckedChange={(checked) => setSendCopy(checked as boolean)}
            />
            <Label htmlFor="send-copy">Send a copy to myself</Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSend}
            disabled={recipients.length === 0 || isSending}
          >
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Generate standard email body for event notification
 */
function generateEmailBody(event: ProductLifecycleEvent): string {
  const message = lifecycleNotificationService.generateNotificationMessage(event);
  const dateStr = format(new Date(event.eventDate), 'MMMM d, yyyy');
  
  return `Hello,

This is a notification about an upcoming financial product lifecycle event.

${message}

Event Date: ${dateStr}
${event.quantity ? `Amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(event.quantity)}` : ''}

Please review the details and take appropriate action as needed.

Regards,
Chain Capital Team`;
}

/**
 * Generate detailed email body with more information
 */
function generateDetailedEmailBody(event: ProductLifecycleEvent): string {
  const standard = generateEmailBody(event);
  const productType = lifecycleNotificationService.formatProductType(event.productType);
  const eventType = lifecycleNotificationService.formatEventType(event.eventType);
  
  return `${standard}

DETAILED INFORMATION
-------------------
Event Type: ${eventType}
Product Type: ${productType}
Event ID: ${event.id}
Status: ${event.status}
${event.actor ? `Actor: ${event.actor}` : ''}
${event.transactionHash ? `Transaction Hash: ${event.transactionHash}` : ''}

This is an automated notification. Please do not reply to this email.`;
}

/**
 * Generate urgent email body for critical events
 */
function generateUrgentEmailBody(event: ProductLifecycleEvent): string {
  const message = lifecycleNotificationService.generateNotificationMessage(event);
  const dateStr = format(new Date(event.eventDate), 'MMMM d, yyyy');
  
  return `URGENT ACTION REQUIRED

This is a notification about an upcoming financial product lifecycle event that requires immediate attention.

${message}

Event Date: ${dateStr}
${event.quantity ? `Amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(event.quantity)}` : ''}

Please review the details and take appropriate action IMMEDIATELY.

If you have any questions, please contact the operations team.

Regards,
Chain Capital Team`;
}

export default EmailNotification;