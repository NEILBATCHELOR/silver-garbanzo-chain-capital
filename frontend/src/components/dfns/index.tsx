/**
 * DFNS Components Export Index
 * 
 * Centralized exports for all DFNS components
 */

import React from 'react';

/**
 * Placeholder DFNS Wallet Dashboard Component
 * TODO: Replace with actual implementation using DFNS services
 */
export const DfnsWalletDashboard: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            DFNS Wallet Dashboard
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            DFNS wallet integration coming soon
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              <strong>Implementation Status:</strong> DFNS authentication, user action signing, and Policy Engine APIs are complete.
              Wallet dashboard components will be implemented in the next phase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Import Policy Components
export * from './policies';

// Export all DFNS components
export default {
  DfnsWalletDashboard,
};
