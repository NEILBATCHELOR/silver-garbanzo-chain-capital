import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { cn } from "@/utils";
import { 
  BarChart3, 
  Activity, 
  Shield, 
  TrendingUp,
  Users,
  Eye,
  PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DfnsAnalyticsPage: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Sub-navigation for analytics section
  const analyticsNavItems = [
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Overview",
      href: `/wallet/dfns/analytics`,
      description: "High-level analytics dashboard and insights"
    },
    {
      icon: <Activity className="h-4 w-4" />,
      label: "Activity Analytics",
      href: `/wallet/dfns/analytics/activity`,
      description: "User activity and system usage patterns"
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Security Metrics",
      href: `/wallet/dfns/analytics/security`,
      description: "Security events and threat analysis"
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Usage Statistics",
      href: `/wallet/dfns/analytics/usage`,
      description: "API usage and performance metrics"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Insights</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor usage patterns, security metrics, and performance insights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              Real-time Data
            </Badge>
            <Button size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex space-x-6 overflow-x-auto">
          {analyticsNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/wallet/dfns/analytics' && pathname === '/wallet/dfns/analytics');
              
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 py-2 px-3 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-gray-100",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<AnalyticsOverviewView />} />
          <Route path="/activity" element={<ActivityAnalyticsView />} />
          <Route path="/security" element={<SecurityMetricsView />} />
          <Route path="/usage" element={<UsageStatisticsView />} />
          <Route path="*" element={<Navigate to="/wallet/dfns/analytics" replace />} />
        </Routes>
      </div>
    </div>
  );
};

// Individual view components
const AnalyticsOverviewView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Analytics Overview</h2>
      <p className="text-muted-foreground">
        High-level view of key metrics and performance indicators.
      </p>
    </div>
    
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Users className="h-5 w-5 text-blue-600" />
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">Active</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Active Users</p>
        <p className="text-2xl font-bold">0</p>
      </div>
      
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Activity className="h-5 w-5 text-green-600" />
          <Badge variant="secondary" className="bg-green-50 text-green-700">Live</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">API Requests</p>
        <p className="text-2xl font-bold">0</p>
      </div>
      
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Shield className="h-5 w-5 text-purple-600" />
          <Badge variant="secondary" className="bg-purple-50 text-purple-700">Secure</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Security Events</p>
        <p className="text-2xl font-bold">0</p>
      </div>
      
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <Badge variant="secondary" className="bg-orange-50 text-orange-700">Up</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Performance</p>
        <p className="text-2xl font-bold">100%</p>
      </div>
    </div>
    
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Usage Trends</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            This will display usage analytics and trending metrics over time.
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center py-12">
          <PieChart className="h-12 w-12 text-purple-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Distribution Analysis</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            This will show distribution of operations, networks, and user activities.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ActivityAnalyticsView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Activity Analytics</h2>
      <p className="text-muted-foreground">
        Detailed analysis of user activity patterns and system usage.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Activity Pattern Analysis</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display user activity patterns, peak usage times, and operation frequency.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            View Activity
          </Button>
          <Button>
            <TrendingUp className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const SecurityMetricsView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Security Metrics</h2>
      <p className="text-muted-foreground">
        Security events, threat detection, and compliance monitoring.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-purple-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Security Event Monitoring</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display security events, authentication patterns, and threat analysis.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            View Security
          </Button>
          <Button>
            <Eye className="h-4 w-4 mr-2" />
            Security Report
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const UsageStatisticsView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Usage Statistics</h2>
      <p className="text-muted-foreground">
        API usage metrics, performance statistics, and resource utilization.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Performance & Usage Metrics</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display API usage statistics, response times, and performance metrics.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Usage
          </Button>
          <Button>
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance Report
          </Button>
        </div>
      </div>
    </div>
  </div>
);

export default DfnsAnalyticsPage;