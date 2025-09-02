# Notification Settings Enhancement Plan

## Problem

We need to integrate the notification settings feature with the existing lifecycle management components without overwriting the current functionality.

## Solution

Instead of directly modifying the existing components, we've created a separate set of components for notification settings that can be used alongside the existing lifecycle management. 

## Current Status

We've created:

1. A SQL migration script for the `notification_settings` table
2. TypeScript interfaces for notification settings
3. A service for managing notification settings
4. A form component for configuring notification settings
5. A tab component that can be included in the project settings page

## Integration Plan

To fully integrate notification settings with the existing lifecycle management components, follow these steps:

### 1. Update LifecycleNotifications Component

Enhance the existing `LifecycleNotifications` component to respect user notification settings:

```typescript
// Add props to accept notification settings
interface LifecycleNotificationsProps {
  // existing props
  notificationSettings?: NotificationSettings;
}

// Filter events based on settings
const filteredEvents = notificationSettings ? 
  lifecycleNotificationService.filterEventsBySettings(upcomingEvents, notificationSettings) : 
  upcomingEvents;
```

### 2. Update EmailNotification Component

Enhance the existing `EmailNotification` component to use notification settings for recipients and templates:

```typescript
// Add props to accept notification settings
interface EmailNotificationProps {
  // existing props
  notificationSettings?: NotificationSettings;
}

// Initialize with settings if available
const [recipients, setRecipients] = useState<string[]>(
  notificationSettings?.emailRecipients?.length ? 
    [...defaultRecipients, ...notificationSettings.emailRecipients] : 
    defaultRecipients
);
```

### 3. Update ProductLifecycleManager Component

Modify the existing `ProductLifecycleManager` component to:

1. Load and use notification settings
2. Pass settings to child components
3. Add a settings tab for notification preferences

```typescript
// Add state for notification settings
const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);

// Load settings on component mount
useEffect(() => {
  const loadSettings = async () => {
    if (!user) return;
    
    try {
      const settings = await notificationSettingsService.getOrCreateDefaultSettings(
        user.id,
        projectId
      );
      
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };
  
  if (user) {
    loadSettings();
  }
}, [user, projectId]);

// Pass settings to child components
<LifecycleNotifications
  events={events}
  notificationSettings={notificationSettings || undefined}
/>

// Add settings tab
<TabsTrigger value="settings">Notification Settings</TabsTrigger>
<TabsContent value="settings">
  <NotificationSettingsForm
    projectId={projectId}
    projectType={projectType}
  />
</TabsContent>
```

### 4. Enhance LifecycleNotificationService

Add methods to the existing `LifecycleNotificationService` to filter events based on notification settings:

```typescript
// Add methods for notification settings
public filterEventsBySettings(
  events: ProductLifecycleEvent[],
  settings: NotificationSettings
): ProductLifecycleEvent[] {
  if (settings.disabled) return [];
  
  return events.filter(event => this.shouldSendNotification(event, settings));
}

public shouldSendNotification(
  event: ProductLifecycleEvent,
  settings: NotificationSettings
): boolean {
  // Check settings to determine if notification should be sent
  // ...
}
```

## Testing Plan

1. Test notification settings form independently
2. Test that notification settings are properly saved to the database
3. Test that lifecycle notifications are filtered based on settings
4. Test that email notifications use the configured recipients and template
5. Test that notification settings tab appears in the project settings page

## Future Enhancements

1. Add real-time notifications using Supabase subscriptions
2. Implement actual email sending functionality
3. Add calendar integration for exporting events
4. Create a notification history view
