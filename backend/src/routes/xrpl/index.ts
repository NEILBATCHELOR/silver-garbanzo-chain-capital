/**
 * XRPL Routes
 * Centralized export for all XRPL API routes
 */

// Legacy routes (using .routes.ts pattern - for backward compatibility)
export { default as mptRoutesLegacy } from './mpt.routes'
export { default as nftRoutesLegacy } from './nft.routes'
export { default as transactionsRoutes } from './transactions.routes'
export { default as walletsRoutes } from './wallets.routes'

// Aliases for backward compatibility with server imports (point to legacy implementations)
export { default as mptRoutes } from './mpt.routes'
export { default as nftRoutes } from './nft.routes'

// Phase 13-15 routes (DeFi & Identity features)
export { ammRoutes } from './amm'
export { dexRoutes } from './dex'
export { multiSigRoutes } from './multisig'
export { identityRoutes } from './identity'
export { complianceRoutes } from './compliance'
export { paymentRoutes as paymentsRoutes } from './payments.routes'

// Phase 19-20 routes (Enhanced Token/NFT & Advanced features - placeholders)
export { tokenRoutes } from './tokens'
export { nftRoutes as nftRoutesNew } from './nfts'
export { advancedRoutes } from './advanced'
export { monitoringRoutes } from './monitoring'

// MPT Database Synchronization routes
export { default as mptSyncRoutes } from './mpt-sync.routes'
export { default as mptMonitorRoutes } from './mpt-monitor.routes'
