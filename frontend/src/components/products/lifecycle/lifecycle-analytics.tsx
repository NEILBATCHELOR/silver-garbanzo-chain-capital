import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  ProductLifecycleEvent, 
  EventStatus, 
  LifecycleEventType 
} from '@/types/products';

interface LifecycleAnalyticsProps {
  productId: string;
  events: ProductLifecycleEvent[];
  analyticsData?: {
    eventCounts: Record<LifecycleEventType, number>;
    statusCounts: Record<EventStatus, number>;
    valueChanges: { date: string; value: number }[];
    recentTrends: { eventType: LifecycleEventType; count: number }[];
  } | null;
  isLoading: boolean;
  onRefresh: () => void;
}

// Define chart colors
const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', 
  '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
];

// Define status colors
const STATUS_COLORS: Record<EventStatus, string> = {
  [EventStatus.SUCCESS]: '#10b981',
  [EventStatus.PENDING]: '#f59e0b',
  [EventStatus.PROCESSING]: '#3b82f6',
  [EventStatus.FAILED]: '#ef4444',
  [EventStatus.CANCELLED]: '#6b7280',
};

/**
 * Component for displaying analytics about product lifecycle events
 */
const LifecycleAnalytics: React.FC<LifecycleAnalyticsProps> = ({
  productId,
  events,
  analyticsData,
  isLoading,
  onRefresh
}) => {
  // Display loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Display empty state
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No lifecycle events available for analytics.
      </div>
    );
  }

  // Helper function to format event types for display
  const formatEventType = (type: LifecycleEventType): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Prepare data for event type pie chart
  const eventTypeData = analyticsData 
    ? Object.entries(analyticsData.eventCounts)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        name: formatEventType(type as LifecycleEventType),
        value: count
      }))
    : [];

  // Prepare data for status pie chart
  const statusData = analyticsData 
    ? Object.entries(analyticsData.statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status,
        value: count
      }))
    : [];

  // Prepare data for value changes line chart
  const valueChangesData = analyticsData?.valueChanges || [];

  // Prepare data for recent trends bar chart
  const recentTrendsData = analyticsData
    ? analyticsData.recentTrends.map(trend => ({
        name: formatEventType(trend.eventType),
        count: trend.count
      }))
    : [];

  // Count events by month
  const eventsByMonth: Record<string, number> = {};
  events.forEach(event => {
    const month = event.eventDate.toISOString().slice(0, 7); // YYYY-MM format
    eventsByMonth[month] = (eventsByMonth[month] || 0) + 1;
  });

  const eventTrendData = Object.entries(eventsByMonth)
    .map(([month, count]) => ({
      month,
      count
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analyticsData ? Object.keys(analyticsData.eventCounts).filter(
                key => analyticsData.eventCounts[key as LifecycleEventType] > 0
              ).length : 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analyticsData ? Math.round(
                (analyticsData.statusCounts[EventStatus.SUCCESS] || 0) / 
                events.length * 100
              ) : 0}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Last Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {events.length > 0 
                ? new Date(Math.max(...events.map(e => e.eventDate.getTime())))
                  .toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'N/A'
              }
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="distribution" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="distribution">Event Distribution</TabsTrigger>
          <TabsTrigger value="trends">Event Trends</TabsTrigger>
          <TabsTrigger value="values">Value Changes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="distribution">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Types</CardTitle>
                <CardDescription>
                  Distribution of events by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {eventTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {eventTypeData.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div 
                        className="w-3 h-3 mr-2 rounded-full" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      ></div>
                      <span className="text-sm truncate">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Event Status</CardTitle>
                <CardDescription>
                  Distribution of events by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry) => (
                          <Cell 
                            key={`cell-${entry.name}`} 
                            fill={STATUS_COLORS[entry.name as EventStatus] || '#6b7280'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center">
                      <div 
                        className="w-3 h-3 mr-2 rounded-full" 
                        style={{ backgroundColor: STATUS_COLORS[item.name as EventStatus] || '#6b7280' }}
                      ></div>
                      <span className="text-sm">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Event Trend Over Time</CardTitle>
              <CardDescription>
                Number of events by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={eventTrendData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 50,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45} 
                      textAnchor="end"
                      height={60}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [`${value} events`, 'Count']}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      name="Event Count"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {recentTrendsData.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Event Types</CardTitle>
                <CardDescription>
                  Event type distribution in the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={recentTrendsData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 50,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="count" 
                        name="Event Count" 
                        fill="#8884d8"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="values">
          {valueChangesData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Value Changes Over Time</CardTitle>
                <CardDescription>
                  Tracks quantitative changes recorded in events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={valueChangesData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 50,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45} 
                        textAnchor="end"
                        height={60}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [value.toLocaleString(), 'Value']}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleDateString(undefined, { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          });
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#82ca9d"
                        activeDot={{ r: 8 }}
                        name="Value"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No value change data available. Add events with quantity values to see this chart.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LifecycleAnalytics;
