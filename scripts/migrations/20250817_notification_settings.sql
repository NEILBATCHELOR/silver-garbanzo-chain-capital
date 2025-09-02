-- Migration to create notification_settings table for product lifecycle notifications

-- First, ensure we're working with the right schema
SET search_path TO public;

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  event_types TEXT[], -- Array of LifecycleEventType values
  notification_channels TEXT[], -- Array of channels: 'email', 'in_app', 'calendar'
  email_recipients TEXT[], -- Array of email addresses
  email_template TEXT DEFAULT 'default', -- 'default', 'detailed', or 'urgent'
  advance_notice_days INTEGER[] DEFAULT '{1, 7, 30}', -- Days before event to send notification
  disabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_project_id ON notification_settings(project_id);

-- Add comments for documentation
COMMENT ON TABLE notification_settings IS 'Stores user preferences for product lifecycle event notifications';
COMMENT ON COLUMN notification_settings.user_id IS 'User who owns these notification preferences';
COMMENT ON COLUMN notification_settings.project_id IS 'Optional project ID for project-specific settings, NULL for global settings';
COMMENT ON COLUMN notification_settings.event_types IS 'Array of event types to be notified about, empty array means all types';
COMMENT ON COLUMN notification_settings.notification_channels IS 'Channels to use for notifications (email, in_app, calendar)';
COMMENT ON COLUMN notification_settings.email_recipients IS 'Additional email recipients beyond the user';
COMMENT ON COLUMN notification_settings.email_template IS 'Preferred email template style';
COMMENT ON COLUMN notification_settings.advance_notice_days IS 'Days before events to send notifications';
COMMENT ON COLUMN notification_settings.disabled IS 'Whether notifications are disabled for this user/project';

-- Create RLS policies
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own notification settings
CREATE POLICY notification_settings_select_policy ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own notification settings
CREATE POLICY notification_settings_insert_policy ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own notification settings
CREATE POLICY notification_settings_update_policy ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own notification settings
CREATE POLICY notification_settings_delete_policy ON notification_settings
  FOR DELETE USING (auth.uid() = user_id);
