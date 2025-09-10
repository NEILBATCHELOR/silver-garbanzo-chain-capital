import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { cn } from "@/utils";
import { 
  Settings, 
  Webhook, 
  Globe, 
  Bell,
  Key,
  Database,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DfnsSettingsPage: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Sub-navigation for settings section
  const settingsNavItems = [
    {
      icon: <Settings className="h-4 w-4" />,
      label: "General Settings",
      href: `/wallet/dfns/settings`,
      description: "Global DFNS configuration and preferences"
    },
    {
      icon: <Webhook className="h-4 w-4" />,
      label: "Webhooks",
      href: `/wallet/dfns/settings/webhooks`,
      description: "Configure webhook endpoints and events"
    },
    {
      icon: <Globe className="h-4 w-4" />,
      label: "Network Preferences",
      href: `/wallet/dfns/settings/networks`,
      description: "Preferred blockchain networks and settings"
    },
    {
      icon: <Bell className="h-4 w-4" />,
      label: "Notifications",
      href: `/wallet/dfns/settings/notifications`,
      description: "Configure alerts and notification preferences"
    },
    {
      icon: <Key className="h-4 w-4" />,
      label: "API Configuration",
      href: `/wallet/dfns/settings/api`,
      description: "API keys, rate limits, and endpoint settings"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DFNS Settings & Configuration</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure DFNS platform settings, preferences, and integrations
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              Configured
            </Badge>
            <Button size="sm" className="gap-2">
              <Database className="h-4 w-4" />
              Export Config
            </Button>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex space-x-6 overflow-x-auto">
          {settingsNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/wallet/dfns/settings' && pathname === '/wallet/dfns/settings');
              
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
          <Route path="/" element={<GeneralSettingsView />} />
          <Route path="/webhooks" element={<WebhooksView />} />
          <Route path="/networks" element={<NetworkPreferencesView />} />
          <Route path="/notifications" element={<NotificationsView />} />
          <Route path="/api" element={<ApiConfigurationView />} />
          <Route path="*" element={<Navigate to="/wallet/dfns/settings" replace />} />
        </Routes>
      </div>
    </div>
  );
};

// Individual view components
const GeneralSettingsView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">General Settings</h2>
      <p className="text-muted-foreground">
        Global DFNS platform configuration and user preferences.
      </p>
    </div>
    
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-medium mb-4">Platform Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Environment</span>
            <Badge variant="outline">Production</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">API Version</span>
            <Badge variant="outline">v1.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">User Action Signing</span>
            <Badge variant="secondary" className="bg-green-50 text-green-700">Enabled</Badge>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-medium mb-4">Security Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">WebAuthn</span>
            <Badge variant="secondary" className="bg-green-50 text-green-700">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Session Timeout</span>
            <Badge variant="outline">30 minutes</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Rate Limiting</span>
            <Badge variant="secondary" className="bg-green-50 text-green-700">Enabled</Badge>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const WebhooksView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Webhook Configuration</h2>
      <p className="text-muted-foreground">
        Configure webhook endpoints and event notifications.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Webhook className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Webhook Management</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will provide webhook endpoint configuration and event management.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <Webhook className="h-4 w-4 mr-2" />
            View Webhooks
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Add Endpoint
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const NetworkPreferencesView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Network Preferences</h2>
      <p className="text-muted-foreground">
        Configure preferred blockchain networks and connection settings.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Globe className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Network Configuration</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display network preferences for 30+ supported blockchain networks.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <Globe className="h-4 w-4 mr-2" />
            View Networks
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Configure RPCs
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const NotificationsView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Notification Settings</h2>
      <p className="text-muted-foreground">
        Configure alert preferences and notification channels.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Bell className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Notification Management</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will provide notification settings for alerts, security events, and system updates.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <Bell className="h-4 w-4 mr-2" />
            View Alerts
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Configure Channels
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const ApiConfigurationView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">API Configuration</h2>
      <p className="text-muted-foreground">
        Manage API keys, rate limits, and endpoint configurations.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Key className="h-12 w-12 text-purple-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">API Management</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display API configuration options, rate limits, and endpoint management.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <Key className="h-4 w-4 mr-2" />
            View API Keys
          </Button>
          <Button>
            <Shield className="h-4 w-4 mr-2" />
            Security Settings
          </Button>
        </div>
      </div>
    </div>
  </div>
);

export default DfnsSettingsPage;