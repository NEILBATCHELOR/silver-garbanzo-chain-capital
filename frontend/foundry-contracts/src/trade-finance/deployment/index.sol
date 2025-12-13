// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Trade Finance Deployment Module
 * @notice Central index for all deployment-related contracts
 * @dev Import contracts directly from their source files
 * 
 * Note: Solidity does not support JavaScript-style exports.
 * To use these contracts, import them directly:
 * 
 * import {TradeFinanceRegistry} from "src/trade-finance/deployment/TradeFinanceRegistry.sol";
 */

// ============ Registry Contracts ============

// TradeFinanceRegistry - available at ./TradeFinanceRegistry.sol

// ============ Documentation ============

/**
 * Deployment Documentation:
 * - Process Guide: /docs/TRADE_FINANCE_DEPLOYMENT_PROCESS.md
 * - Checklist: /docs/TRADE_FINANCE_DEPLOYMENT_CHECKLIST.md
 * - Verification: /docs/TRADE_FINANCE_DEPLOYMENT_VERIFICATION.md
 * 
 * Usage:
 * 1. Follow deployment process guide
 * 2. Use checklist to track progress
 * 3. Run verification after deployment
 * 
 * Integration:
 * - Integrates with FactoryRegistry (registered as "TradeFinance" standard)
 * - Provides market tracking and versioning
 * - Enables deployment verification via hash
 */
