import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity,
  Wallet,
  ArrowRightLeft,
  Users,
  Settings,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services
import { getDfnsService, initializeDfnsService } from '@/services/dfns';

interface ActivityTimelineProps {
  className?: string;
  maxItems?: number;
}

interface ActivityItem {
  id: string;
  type: 'wallet_created' | 'transaction' | 'user_added' | 'permission_changed';
  title: string;
  description: string;
  timestamp: string;
  network?: string;
  status?: string;
}

/**
 * Activity Timeline Component
 * Shows recent activity across the DFNS platform
 */
export function ActivityTimeline({ className, maxItems = 10 }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'wallet_created':
        return <Wallet className="h-4 w-4 text-blue-500" />;
      case 'transaction':
        return <ArrowRightLeft className="h-4 w-4 text-green-500" />;
      case 'user_added':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'permission_changed':
        return <Settings className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Load activity data
  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        const dfnsService = await initializeDfnsService();
        const authService = dfnsService.getAuthenticationService();
        const authStatus = await authService.getAuthenticationStatus();

        if (!authStatus.isAuthenticated) {
          setError('Authentication required to view activity');
          return;
        }

        // Mock activity data - replace with real activity service
        const mockActivities: ActivityItem[] = [
          {
            id: '1',
            type: 'wallet_created',
            title: 'New Wallet Created',
            description: 'Ethereum wallet "Main Portfolio" created',
            timestamp: new Date().toISOString(),
            network: 'Ethereum',
            status: 'completed'
          },
          {
            id: '2',
            type: 'transaction',
            title: 'Asset Transfer',
            description: 'Transferred 0.5 ETH to 0x1234...5678',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            network: 'Ethereum',
            status: 'confirmed'
          }
        ];

        const finalActivities = mockActivities.slice(0, maxItems);
        setActivities(finalActivities);

      } catch (err: any) {
        console.error('Error loading activities:', err);
        setError(err.message || 'Failed to load activities');
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [maxItems, toast]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Loading activity data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading activities...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest {activities.length} activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.network && (
                      <Badge variant="outline" className="text-xs">
                        {activity.network}
                      </Badge>
                    )}
                    {activity.status && (
                      <Badge 
                        variant={activity.status === 'confirmed' || activity.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
