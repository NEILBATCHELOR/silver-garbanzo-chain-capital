/**
 * Database Change Log Component
 * 
 * Displays real-time database operations tracked automatically by the Universal Database Audit Service
 * Shows CRUD operations (INSERT, UPDATE, DELETE, UPSERT) as they happen through the client.ts proxy
 */

import React, { useState, useEffect, useCallback } from 'react';
import { universalDatabaseAuditService } from '@/services/audit/UniversalDatabaseAuditService';
import { supabase } from '@/infrastructure/database/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  RefreshCw, 
  Edit, 
  Plus, 
  Trash2, 
  Eye,
  ArrowRight,
  Calendar,
  User,
  TrendingUp,
  PieChart,
  Activity,
  Table
} from 'lucide-react';
import { format } from 'date-fns';

interface DatabaseChangeLogProps {
  limit?: number;
  showHeader?: boolean;
  refreshInterval?: number;
}

interface DatabaseOperation {
  id: string;
  timestamp: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id?: string;
  username?: string;
  details?: string;
  metadata?: any;
  old_data?: any;
  new_data?: any;
  severity?: string;
  status?: string;
}

interface DatabaseStats {
  total_tables: number;
  tables_by_category: Record<string, number>;
  recent_operations: DatabaseOperation[];
  operation_counts: Record<string, number>;
  most_active_tables: { table: string; count: number }[];
  audit_coverage: {
    total_tables: number;
    audited_tables: number;
    coverage_percentage: number;
    unaudited_tables: string[];
  };
}

const DatabaseChangeLog: React.FC<DatabaseChangeLogProps> = ({
  limit = 100,
  showHeader = true,
  refreshInterval = 30000
}) => {
  const [operations, setOperations] = useState<DatabaseOperation[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('operations');

  const loadDatabaseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load recent operations from audit_logs table
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (auditError) {
        throw new Error(`Failed to load audit logs: ${auditError.message}`);
      }

      // Format operations data
      const formattedOperations = (auditData || []).map(row => ({
        id: row.id || `${row.timestamp}-${row.action}`,
        timestamp: row.timestamp || new Date().toISOString(),
        action: row.action || 'unknown',
        entity_type: row.entity_type || 'unknown',
        entity_id: row.entity_id || 'unknown',
        user_id: row.user_id,
        username: row.username || 'system',
        details: row.details,
        metadata: row.metadata,
        old_data: row.old_data,
        new_data: row.new_data,
        severity: row.severity || 'low',
        status: row.status || 'success'
      }));

      setOperations(formattedOperations);

      // Load database statistics
      const databaseStats = await universalDatabaseAuditService.getDatabaseStatistics();
      setStats(databaseStats);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load database operations');
      console.error('Error loading database data:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(loadDatabaseData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadDatabaseData, refreshInterval]);

  const getOperationIcon = (action: string) => {
    const normalizedAction = action.toLowerCase();
    if (normalizedAction.includes('insert') || normalizedAction.includes('create')) return Plus;
    if (normalizedAction.includes('update') || normalizedAction.includes('modify') || normalizedAction.includes('upsert')) return Edit;
    if (normalizedAction.includes('delete') || normalizedAction.includes('remove')) return Trash2;
    if (normalizedAction.includes('select') || normalizedAction.includes('read')) return Eye;
    return Database;
  };

  const getOperationColor = (action: string) => {
    const normalizedAction = action.toLowerCase();
    if (normalizedAction.includes('insert') || normalizedAction.includes('create')) return 'text-green-500';
    if (normalizedAction.includes('update') || normalizedAction.includes('modify') || normalizedAction.includes('upsert')) return 'text-blue-500';
    if (normalizedAction.includes('delete') || normalizedAction.includes('remove')) return 'text-red-500';
    if (normalizedAction.includes('select') || normalizedAction.includes('read')) return 'text-gray-500';
    return 'text-purple-500';
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-500">
            <Database className="h-5 w-5" />
            <span>Error loading database operations: {error}</span>
          </div>
          <Button onClick={loadDatabaseData} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Database Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
              <Table className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_tables}</div>
              <p className="text-xs text-muted-foreground">Database tables</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Audit Coverage</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.audit_coverage?.coverage_percentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{stats.audit_coverage?.audited_tables} of {stats.audit_coverage?.total_tables} tables</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Operations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{operations.length}</div>
              <p className="text-xs text-muted-foreground">Last {limit} operations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tables</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.most_active_tables?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Tables with activity</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card>
        {showHeader && (
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Activity Monitor
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadDatabaseData} 
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
        )}

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="pt-4 pb-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="operations">Recent Operations</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="tables">Table Activity</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="operations" className="mt-4">
              <ScrollArea className="h-96">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading database operations...</span>
                  </div>
                ) : operations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No database operations found</p>
                    <p className="text-sm">Database operations will appear here automatically</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {operations.map((operation) => {
                      const OperationIcon = getOperationIcon(operation.action);
                      const operationColor = getOperationColor(operation.action);
                      
                      return (
                        <div
                          key={operation.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <OperationIcon className={`h-5 w-5 mt-0.5 ${operationColor}`} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{operation.action.toUpperCase()}</span>
                                <Badge variant="outline" className="text-xs">
                                  {operation.entity_type}
                                </Badge>
                                <Badge variant={getSeverityBadgeVariant(operation.severity)} className="text-xs">
                                  {operation.severity}
                                </Badge>
                                {operation.metadata?.source && (
                                  <Badge variant="secondary" className="text-xs">
                                    {operation.metadata.source}
                                  </Badge>
                                )}
                              </div>
                              
                              {operation.details && (
                                <p className="text-sm text-muted-foreground mb-2">{operation.details}</p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(operation.timestamp), 'MMM dd, HH:mm:ss')}
                                </span>
                                
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {operation.username || 'system'}
                                </span>
                                
                                {operation.entity_id && operation.entity_id !== 'unknown' && (
                                  <span>ID: {operation.entity_id.length > 20 ? `${operation.entity_id.substring(0, 20)}...` : operation.entity_id}</span>
                                )}
                              </div>

                              {/* Show tracking metadata if available */}
                              {operation.metadata?.operation_type && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Operation: {operation.metadata.operation_type}
                                  {operation.metadata.method && ` via ${operation.metadata.method}`}
                                  {operation.metadata.tracked_by && ` • Tracked by ${operation.metadata.tracked_by}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              {stats && (
                <div className="space-y-6">
                  {/* Operation Counts */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Operation Counts (Last 24h)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(stats.operation_counts).map(([operation, count]) => {
                        const Icon = getOperationIcon(operation);
                        const color = getOperationColor(operation);
                        return (
                          <Card key={operation}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${color}`} />
                                <span className="font-medium">{operation}</span>
                              </div>
                              <div className="text-2xl font-bold mt-2">{count}</div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tables" className="mt-4">
              {stats && (
                <div className="space-y-6">
                  {/* Most Active Tables */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Most Active Tables (Last 24h)</h3>
                    <div className="space-y-2">
                      {stats.most_active_tables?.length > 0 ? (
                        stats.most_active_tables.map(({ table, count }) => (
                          <div key={table} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Table className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{table}</span>
                            </div>
                            <Badge variant="secondary">{count} operations</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No table activity in the last 24 hours</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseChangeLog;