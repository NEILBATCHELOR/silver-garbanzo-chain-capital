import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { cn } from "@/utils";
import { 
  FileCheck, 
  Shield, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DfnsPoliciesPage: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Sub-navigation for policies section
  const policiesNavItems = [
    {
      icon: <FileCheck className="h-4 w-4" />,
      label: "Policy Dashboard",
      href: `/wallet/dfns/policies`,
      description: "Overview of all policies and rules"
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: "Approval Queue",
      href: `/wallet/dfns/policies/approvals`,
      description: "Pending policy approvals and reviews"
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Risk Management",
      href: `/wallet/dfns/policies/risk`,
      description: "Risk assessment and mitigation policies"
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Policy Settings",
      href: `/wallet/dfns/policies/settings`,
      description: "Configure policy enforcement and notifications"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Policy Engine & Approvals</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage policies, approval workflows, and risk management
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              Active Policies
            </Badge>
            <Button size="sm" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Create Policy
            </Button>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex space-x-6 overflow-x-auto">
          {policiesNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/wallet/dfns/policies' && pathname === '/wallet/dfns/policies');
              
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
          <Route path="/" element={<PolicyDashboardView />} />
          <Route path="/approvals" element={<ApprovalQueueView />} />
          <Route path="/risk" element={<RiskManagementView />} />
          <Route path="/settings" element={<PolicySettingsView />} />
          <Route path="*" element={<Navigate to="/wallet/dfns/policies" replace />} />
        </Routes>
      </div>
    </div>
  );
};

// Individual view components
const PolicyDashboardView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Policy Dashboard</h2>
      <p className="text-muted-foreground">
        Overview of all active policies and their enforcement status.
      </p>
    </div>
    
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <FileCheck className="h-5 w-5 text-green-600" />
          <Badge variant="secondary" className="bg-green-50 text-green-700">Active</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Total Policies</p>
        <p className="text-2xl font-bold">0</p>
      </div>
      
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Clock className="h-5 w-5 text-yellow-600" />
          <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">Pending</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Pending Approvals</p>
        <p className="text-2xl font-bold">0</p>
      </div>
      
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <CheckCircle className="h-5 w-5 text-blue-600" />
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">Enforced</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Enforced Rules</p>
        <p className="text-2xl font-bold">0</p>
      </div>
      
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Shield className="h-5 w-5 text-purple-600" />
          <Badge variant="secondary" className="bg-purple-50 text-purple-700">Protected</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Risk Policies</p>
        <p className="text-2xl font-bold">0</p>
      </div>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Policy Engine</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display the DFNS policy dashboard with policy management and enforcement metrics.
        </p>
        <Button>
          <FileCheck className="h-4 w-4 mr-2" />
          Create First Policy
        </Button>
      </div>
    </div>
  </div>
);

const ApprovalQueueView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Approval Queue</h2>
      <p className="text-muted-foreground">
        Review and approve pending transactions and policy changes.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Policy Approval Workflow</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display pending approvals that require review and authorization.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            View Queue
          </Button>
          <Button>
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve All
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const RiskManagementView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Risk Management</h2>
      <p className="text-muted-foreground">
        Configure risk assessment policies and automated risk mitigation.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-purple-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Risk Assessment Engine</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display risk policies and automated risk detection systems.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            View Risks
          </Button>
          <Button>
            <Shield className="h-4 w-4 mr-2" />
            Configure Rules
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const PolicySettingsView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Policy Settings</h2>
      <p className="text-muted-foreground">
        Configure global policy enforcement settings and notification preferences.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Settings className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Policy Configuration</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will provide policy configuration options and enforcement settings.
        </p>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Configure Settings
        </Button>
      </div>
    </div>
  </div>
);

export default DfnsPoliciesPage;