/**
 * Identity Management Page
 * 
 * Page for managing linked identities and accounts
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { IdentityManagement } from '@/components/auth/components';

const IdentityManagementPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <Helmet>
        <title>Linked Accounts - Chain Capital</title>
        <meta name="description" content="Manage your linked social accounts and sign-in methods" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Linked Accounts</h1>
              <p className="text-muted-foreground">
                Manage your linked social accounts and sign-in methods for enhanced security and convenience
              </p>
            </div>
            
            {/* Identity Management */}
            <IdentityManagement showAddButton={true} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default IdentityManagementPage;
