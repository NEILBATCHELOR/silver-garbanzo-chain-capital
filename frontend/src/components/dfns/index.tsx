/**
 * DFNS Components Export Index
 * 
 * Centralized exports for all DFNS components
 */

// Import core components
import { DfnsManager } from './components/core';

/**
 * Main DFNS Wallet Dashboard Component
 * Enterprise-ready DFNS integration with complete API coverage
 */
export const DfnsWalletDashboard = DfnsManager;

// Export core components
export * from './components/core';

// Export wallet components
export * from './wallets';

// Export all DFNS components
export default {
  DfnsWalletDashboard,
};
