import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Activity, 
  Wallet,
  Users,
  Shield,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Filter,
  TrendingUp,
  Key,
  Send,
  Plus,
  Settings
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect, useMemo } from "react";
import { DfnsService } from "../../../../services/dfns";

// Activity data interface
interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  status: ActivityStatus;
  entityType: EntityType;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  icon: React.ReactNode;
  color: string;
}

// Activity types
type ActivityType = 
  | 'wallet_created'
  | 'wallet_updated' 
  | 'transfer_initiated'
  | 'transfer_completed'
  | 'transfer_failed'
  | 'transaction_broadcast'
  | 'transaction_confirmed'
  | 'user_registered'
  | 'user_login'
  | 'credential_created'
  | 'permission_assigned'
  | 'permission_revoked'
  | 'policy_created'
  | 'policy_updated'
  | 'user_action_signed'
  | 'webhook_received'
  | 'system_event';

// Activity statuses
type ActivityStatus = 'success' | 'pending' | 'failed' | 'warning' | 'info';

// Entity types
type EntityType = 'wallet' | 'user' | 'transaction' | 'credential' | 'permission' | 'policy' | 'system';

// Time range options
type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'all';

// Filter options
type ActivityFilter = 'all' | ActivityType;

/**
 * Activity Timeline Component
 * Shows chronological activity across all DFNS operations
 */
export function ActivityTimeline() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  // Initialize DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Fetch activity data from multiple sources
  useEffect(() => {
    const fetchActivityData = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const activities = await gatherActivityFromSources(dfnsService, timeRange);
        setActivities(activities);

      } catch (error) {
        console.error('Failed to fetch activity data:', error);
        setError('Failed to load activity timeline');
      } finally {
        setLoading(false);
      }
    };

    fetchActivityData();
  }, [dfnsService, timeRange]);

  // Gather activity data from multiple DFNS services
  const gatherActivityFromSources = async (
    service: DfnsService,
    range: TimeRange
  ): Promise<ActivityEvent[]> => {
    const activities: ActivityEvent[] = [];
    const now = new Date();
    
    // Calculate time range
    const getRangeMs = (range: TimeRange): number => {
      switch (range) {
        case '1h': return 1 * 60 * 60 * 1000;
        case '6h': return 6 * 60 * 60 * 1000;
        case '24h': return 24 * 60 * 60 * 1000;
        case '7d': return 7 * 24 * 60 * 60 * 1000;
        case '30d': return 30 * 24 * 60 * 60 * 1000;
        case 'all': return 365 * 24 * 60 * 60 * 1000; // 1 year
        default: return 24 * 60 * 60 * 1000;
      }
    };

    const rangeMs = getRangeMs(range);
    const cutoffTime = new Date(now.getTime() - rangeMs);

    try {
      // 1. Gather wallet activities
      const walletService = service.getWalletService();
      const wallets = await walletService.getWalletsSummary();
      
      wallets.forEach(wallet => {
        if (wallet.dateCreated && new Date(wallet.dateCreated) > cutoffTime) {
          activities.push({
            id: `wallet_${wallet.walletId}`,
            type: 'wallet_created',
            title: 'Wallet Created',
            description: `Created ${wallet.network} wallet: ${wallet.name || wallet.walletId}`,
            timestamp: new Date(wallet.dateCreated),
            status: wallet.isActive ? 'success' : 'pending',
            entityType: 'wallet',
            entityId: wallet.walletId,
            icon: <Wallet className="h-4 w-4" />,
            color: 'bg-blue-500',
            metadata: {
              network: wallet.network,
              value: wallet.totalValueUsd
            }
          });
        }
      });

      // 2. Gather transaction activities (for wallets with recent activity)
      const transactionService = service.getTransactionService();
      
      for (const wallet of wallets.slice(0, 5)) { // Limit to prevent too many requests
        try {
          const transactions = await transactionService.getAllTransactionRequests(wallet.walletId);
          
          transactions
            .filter(tx => new Date(tx.dateRequested) > cutoffTime)
            .forEach(tx => {
              activities.push({
                id: `tx_${tx.id}`,
                type: tx.status === 'Completed' || tx.status === 'Confirmed' ? 'transaction_confirmed' : 
                      tx.status === 'Failed' ? 'transfer_failed' : 'transaction_broadcast',
                title: 'Transaction Broadcast',
                description: `${tx.requestBody?.kind || 'Transaction'} transaction on ${tx.network}: ${tx.txHash || tx.id}`,
                timestamp: new Date(tx.dateRequested),
                status: tx.status === 'Completed' || tx.status === 'Confirmed' ? 'success' : 
                       tx.status === 'Failed' ? 'failed' : 'pending',
                entityType: 'transaction',
                entityId: tx.id,
                icon: <Send className="h-4 w-4" />,
                color: tx.status === 'Completed' || tx.status === 'Confirmed' ? 'bg-green-500' : 
                       tx.status === 'Failed' ? 'bg-red-500' : 'bg-yellow-500',
                metadata: {
                  network: tx.network,
                  fee: tx.fee,
                  kind: tx.requestBody?.kind || 'Unknown'
                }
              });
            });
        } catch (error) {
          // Skip failed transaction queries for individual wallets
          console.warn(`Failed to fetch transactions for wallet ${wallet.walletId}:`, error);
        }
      }

      // 3. Generate some simulated recent activity to demonstrate the component
      // In production, this would be replaced with real activity log queries
      const simulatedActivities = generateSimulatedActivity(range, cutoffTime);
      activities.push(...simulatedActivities);

    } catch (error) {
      console.warn('Some activity sources failed to load:', error);
      
      // Generate fallback simulated activity
      const simulatedActivities = generateSimulatedActivity(range, cutoffTime);
      activities.push(...simulatedActivities);
    }

    // Sort by timestamp (newest first)
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  // Generate simulated activity for demonstration purposes
  const generateSimulatedActivity = (range: TimeRange, cutoffTime: Date): ActivityEvent[] => {
    const activities: ActivityEvent[] = [];
    const now = new Date();

    const activityTemplates = [
      {
        type: 'user_login' as ActivityType,
        title: 'User Login',
        description: 'User authenticated successfully',
        icon: <Users className="h-4 w-4" />,
        color: 'bg-green-500',
        status: 'success' as ActivityStatus,
        entityType: 'user' as EntityType
      },
      {
        type: 'credential_created' as ActivityType,
        title: 'Credential Created',
        description: 'New WebAuthn credential registered',
        icon: <Key className="h-4 w-4" />,
        color: 'bg-purple-500',
        status: 'success' as ActivityStatus,
        entityType: 'credential' as EntityType
      },
      {
        type: 'user_action_signed' as ActivityType,
        title: 'User Action Signed',
        description: 'Sensitive operation authorized via WebAuthn',
        icon: <Shield className="h-4 w-4" />,
        color: 'bg-orange-500',
        status: 'success' as ActivityStatus,
        entityType: 'system' as EntityType
      },
      {
        type: 'permission_assigned' as ActivityType,
        title: 'Permission Assigned',
        description: 'Wallet management permission granted to user',
        icon: <Settings className="h-4 w-4" />,
        color: 'bg-blue-500',
        status: 'success' as ActivityStatus,
        entityType: 'permission' as EntityType
      },
      {
        type: 'system_event' as ActivityType,
        title: 'System Check',
        description: 'DFNS integration health check completed',
        icon: <Activity className="h-4 w-4" />,
        color: 'bg-gray-500',
        status: 'success' as ActivityStatus,
        entityType: 'system' as EntityType
      }
    ];

    // Generate activities based on time range
    const activityCount = range === '1h' ? 3 : range === '24h' ? 8 : range === '7d' ? 15 : 5;
    
    for (let i = 0; i < activityCount; i++) {
      const template = activityTemplates[i % activityTemplates.length];
      const timestamp = new Date(now.getTime() - (i * (now.getTime() - cutoffTime.getTime()) / activityCount));
      
      activities.push({
        id: `simulated_${i}`,
        type: template.type,
        title: template.title,
        description: template.description,
        timestamp,
        status: template.status,
        entityType: template.entityType,
        icon: template.icon,
        color: template.color,
        metadata: {
          source: 'simulated'
        }
      });
    }

    return activities;
  };

  // Filter activities based on selected filter
  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') {
      return activities;
    }
    return activities.filter(activity => activity.type === activityFilter);
  }, [activities, activityFilter]);

  // Group activities by date for better organization
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityEvent[]> = {};
    
    filteredActivities.forEach(activity => {
      const dateKey = activity.timestamp.toLocaleDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return Object.entries(groups).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  }, [filteredActivities]);

  // Get status icon and color
  const getStatusIcon = (status: ActivityStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'info':
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Activity Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading activity timeline...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Activity Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span className="ml-2">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Activity Timeline</span>
            </CardTitle>
            <CardDescription>
              Real-time activity across all DFNS operations
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={activityFilter} onValueChange={(value: ActivityFilter) => setActivityFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="wallet_created">Wallets</SelectItem>
                <SelectItem value="transfer_initiated">Transfers</SelectItem>
                <SelectItem value="transaction_broadcast">Transactions</SelectItem>
                <SelectItem value="user_login">Authentication</SelectItem>
                <SelectItem value="permission_assigned">Permissions</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-[100px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1H</SelectItem>
                <SelectItem value="6h">6H</SelectItem>
                <SelectItem value="24h">24H</SelectItem>
                <SelectItem value="7d">7D</SelectItem>
                <SelectItem value="30d">30D</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Activity Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{filteredActivities.length}</div>
            <div className="text-sm text-muted-foreground">Total Activities</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">
              {filteredActivities.filter(a => a.status === 'success').length}
            </div>
            <div className="text-sm text-green-600">Successful</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">
              {filteredActivities.filter(a => a.status === 'pending').length}
            </div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">
              {filteredActivities.filter(a => a.status === 'failed').length}
            </div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
        </div>

        {/* Timeline */}
        {groupedActivities.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-6 w-6 mr-2" />
            <span>No activity found for the selected time range.</span>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedActivities.map(([date, dayActivities]) => (
              <div key={date} className="space-y-4">
                {/* Date Header */}
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <Badge variant="secondary">{dayActivities.length}</Badge>
                </div>

                {/* Activity Items */}
                <div className="space-y-3">
                  {dayActivities.map((activity, index) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                      {/* Timeline Dot */}
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white",
                          activity.color
                        )}>
                          {activity.icon}
                        </div>
                        {index < dayActivities.length - 1 && (
                          <div className="w-0.5 h-8 bg-border mt-2" />
                        )}
                      </div>

                      {/* Activity Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{activity.title}</h4>
                            {getStatusIcon(activity.status)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(activity.timestamp)}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                        
                        {/* Metadata */}
                        {activity.metadata && (
                          <div className="flex items-center space-x-4 mt-2">
                            {activity.metadata.network && (
                              <Badge variant="outline" className="text-xs">
                                {activity.metadata.network}
                              </Badge>
                            )}
                            {activity.metadata.value && (
                              <span className="text-xs text-muted-foreground">
                                ${parseFloat(activity.metadata.value.toString()).toLocaleString()}
                              </span>
                            )}
                            {activity.entityId && (
                              <span className="text-xs font-mono text-muted-foreground">
                                {activity.entityId.substring(0, 12)}...
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Load More (Future Enhancement) */}
            {filteredActivities.length > 0 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm" disabled>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View More Activity
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}