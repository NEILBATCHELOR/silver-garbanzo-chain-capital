import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DfnsHorizontalNavigation from './dfns-horizontal-navigation';
import { DfnsDashboard } from './dfns-dashboard';

// Import individual page components
import DfnsWalletsPage from '../pages/dfns-wallets-page';
import DfnsAuthPage from '../pages/dfns-auth-page';
import DfnsPermissionsPage from '../pages/dfns-permissions-page';
import DfnsTransactionsPage from '../pages/dfns-transactions-page';
import DfnsPoliciesPage from '../pages/dfns-policies-page';
import DfnsAnalyticsPage from '../pages/dfns-analytics-page';
import DfnsSettingsPage from '../pages/dfns-settings-page';

/**
 * Main manager component for the DFNS module
 * Uses horizontal navigation similar to factoring dashboard
 */
export function DfnsManager() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Horizontal Navigation */}
      <DfnsHorizontalNavigation />
      
      {/* Main Content Area */}
      <div className="flex-1">
        <Routes>
          {/* Dashboard - Main entry point */}
          <Route path="/" element={<Navigate to="/wallet/dfns/dashboard" replace />} />
          <Route path="/dashboard" element={<DfnsDashboard />} />
          
          {/* Wallets Section */}
          <Route path="/wallets/*" element={<DfnsWalletsPage />} />
          
          {/* Authentication Section */}
          <Route path="/auth/*" element={<DfnsAuthPage />} />
          
          {/* Permissions Section */}
          <Route path="/permissions/*" element={<DfnsPermissionsPage />} />
          
          {/* Transactions Section */}
          <Route path="/transactions/*" element={<DfnsTransactionsPage />} />
          
          {/* Policies Section */}
          <Route path="/policies/*" element={<DfnsPoliciesPage />} />
          
          {/* Analytics Section */}
          <Route path="/analytics/*" element={<DfnsAnalyticsPage />} />
          
          {/* Settings Section */}
          <Route path="/settings/*" element={<DfnsSettingsPage />} />
          
          {/* Fallback - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/wallet/dfns/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}