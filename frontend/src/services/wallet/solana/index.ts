/**
 * Solana Services Index
 * Exports all Solana-related services
 * 
 * MIGRATION STATUS: ✅ Modern services available
 * - ModernSolanaWalletService: Uses @solana/kit + @solana/client
 * - ModernSPLTokenDeploymentService: Uses @solana/kit + @solana-program/token
 * - SolanaWalletService: Legacy wrapper (delegates to modern)
 * - SolanaTokenDeploymentService: Legacy wrapper (delegates to modern)
 */

// Export legacy service (with types)
export * from './SolanaWalletService';

// Export modern services
export { 
  ModernSolanaWalletService,
  modernSolanaWalletService,
  modernSolanaDevnetWalletService,
  modernSolanaTestnetWalletService,
  ModernSolanaWallet
} from './ModernSolanaWalletService';

export {
  ModernSPLTokenDeploymentService,
  modernSPLTokenDeploymentService,
  type ModernSPLTokenConfig,
  type ModernSPLDeploymentOptions,
  type ModernSPLDeploymentResult
} from './ModernSPLTokenDeploymentService';

// Export token services (legacy wrappers)
export * from './SolanaTokenDeploymentService';
export * from './SolanaToken2022Service';

// Export singleton instances for convenience
export { solanaWalletService, solanaDevnetWalletService, solanaTestnetWalletService } from './SolanaWalletService';
export { solanaTokenDeploymentService } from './SolanaTokenDeploymentService';
export { solanaToken2022Service } from './SolanaToken2022Service';
