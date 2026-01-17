/**
 * XRPL Routes
 * Centralized export for all XRPL API routes
 */

// Legacy routes (using .routes.ts pattern - for backward compatibility)
export { default as mptRoutesLegacy } from './mpt.routes'
export { default as nftRoutesLegacy } from './nft.routes'
export { paymentRoutes as paymentsRoutesLegacy } from './payments.routes'
export { default as transactionsRoutes } from './transactions.routes'
export { default as walletsRoutes } from './wallets.routes'

// Phase 13-15 routes (DeFi & Identity features)
export { ammRoutes } from './amm'
export { dexRoutes } from './dex'
export { multiSigRoutes } from './multisig'
export { identityRoutes } from './identity'
export { complianceRoutes } from './compliance'
export { paymentRoutes } from './payments.routes'

// Phase 19-20 routes (Enhanced Token/NFT & Advanced features)
export { tokenRoutes } from './tokens'
export { nftRoutes } from './nfts'
export { advancedRoutes } from './advanced'
export { monitoringRoutes } from './monitoring'
