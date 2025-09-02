import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationSettingsForm from './notification-settings-form';
import { ProjectType } from '@/types/projects/projectTypes';

interface NotificationSettingsTabProps {
  projectId: string;
  projectType: ProjectType;
  className?: string;
}

/**
 * Component for the notification settings tab in project settings
 * This is a new component that doesn't overwrite existing functionality
 */
const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({
  projectId,
  projectType,
  className = ''
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Configure how you receive notifications for lifecycle events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NotificationSettingsForm 
          projectId={projectId} 
          projectType={projectType}
        />
      </CardContent>
    </Card>
  );
};

export default NotificationSettingsTab;