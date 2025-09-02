# Financial Products Notification System Implementation

This document describes the implementation of a notification system for financial product lifecycle events in the Chain Capital application.

## Overview

The notification system enables users to:

1. **Receive notifications** about upcoming lifecycle events for financial products
2. **Configure notification preferences** for different event types and notification channels
3. **Send email notifications** to multiple recipients
4. **Add events to calendar** for better planning and management

## Components Implemented

### 1. Database Schema

A new `notification_settings` table was created to store user preferences for notifications:

```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  event_types TEXT[], 
  notification_channels TEXT[],
  email_recipients TEXT[],
  email_template TEXT DEFAULT 'default',
  advance_notice_days INTEGER[] DEFAULT '{1, 7, 30}',
  disabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. TypeScript Interfaces

New TypeScript interfaces were created to define notification settings:

- `NotificationSettings`: Core interface for notification preferences
- `NotificationChannel`: Enum for notification channels (email, in-app, calendar)
- `EmailTemplate`: Enum for email template styles

### 3. Service Layer

Two services handle notification functionality:

- `NotificationSettingsService`: CRUD operations for notification settings
- `LifecycleNotificationService`: Enhanced with methods to filter events based on settings

### 4. UI Components

Several UI components were implemented:

- `NotificationSettingsForm`: Form for managing notification preferences
- `LifecycleNotifications`: Bell icon with dropdown for upcoming notifications
- `EmailNotification`: Dialog for sending email notifications
- `LifecycleTimeline`: Timeline view of lifecycle events
- `ProductLifecycleManager`: Main component that integrates all lifecycle features

### 5. Integration

The notification system is integrated into:

- Project details page under the "Settings" tab
- Product lifecycle management interface

## Features

### Notification Channels

Users can choose to receive notifications through:

- **In-app notifications**: Shown in the notification bell dropdown
- **Email notifications**: Sent to the user and optional additional recipients
- **Calendar integration**: Events can be added to the user's calendar

### Notification Settings

Users can configure:

- **Event types**: Select which types of events to be notified about
- **Advance notice**: How many days before an event to receive notifications
- **Email recipients**: Additional email addresses to include
- **Email template**: Choose between standard, detailed, or urgent templates
- **Enable/disable**: Turn notifications on or off for specific projects

### Filtering and Prioritization

The system includes intelligent filtering and prioritization:

- Events are filtered based on user preferences
- Events are prioritized by proximity and importance
- Critical events (maturity, liquidation) have higher priority

## Technical Details

### Database Tables

- `notification_settings`: Stores user notification preferences
- `product_lifecycle_events`: Stores lifecycle events for financial products

### Services

- `NotificationSettingsService`: Manages notification settings
- `LifecycleNotificationService`: Handles notification logic and event formatting

### Components

- `NotificationSettingsForm`: Settings management UI
- `LifecycleNotifications`: Notification bell and dropdown
- `EmailNotification`: Email composition dialog
- `LifecycleTimeline`: Timeline visualization
- `ProductLifecycleManager`: Main lifecycle management UI

## Usage

### Viewing Notifications

1. Click the notification bell icon in the product details page
2. View upcoming notifications in the dropdown
3. Dismiss or take action on individual notifications

### Configuring Notification Settings

1. Navigate to a project's details page
2. Go to the "Settings" tab
3. Configure notification preferences in the Notification Settings card

### Sending Email Notifications

1. Click the "Send Email Notification" button for an event
2. Add recipients and customize the email content
3. Send the notification to all recipients

## Future Enhancements

- **Push notifications**: Add support for browser push notifications
- **SMS notifications**: Add support for text message notifications
- **Advanced filtering**: More granular control over which events trigger notifications
- **Custom templates**: Allow users to create custom email templates
- **Notification history**: Track and display notification history

## Dependencies

- **date-fns**: For date formatting and manipulation
- **lucide-react**: For icons
- **react-hook-form**: For form handling
- **zod**: For form validation
- **shadcn/ui**: For UI components
