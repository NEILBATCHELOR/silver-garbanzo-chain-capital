/**
 * Admin Dashboard Page
 * 
 * Admin dashboard for user management and system administration
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { AdminUserManagement } from '@/components/auth/components';

const AdminDashboardPage: React.FC = () => {
  return (
    <ProtectedRoute 
      requiredRoles={['admin', 'super_admin']}
      requiredPermissions={['manage_users']}
    >
      <Helmet>
        <title>Admin Dashboard - Chain Capital</title>
        <meta name="description" content="Administer users and system settings" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage users, permissions, and system settings
              </p>
            </div>
            
            {/* User Management Section */}
            <AdminUserManagement 
              canCreate={true}
              canEdit={true}
              canDelete={true}
              canBan={true}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboardPage;
