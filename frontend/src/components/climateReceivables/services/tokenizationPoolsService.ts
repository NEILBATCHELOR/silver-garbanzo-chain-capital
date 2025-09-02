/**
 * Tokenization Pools Service - Updated with Missing Table Detection
 * 
 * CRITICAL FIX: August 26, 2025 - This service now imports from enhancedTokenizationPoolsService
 * to handle missing database junction tables gracefully.
 * 
 * Previous errors fixed:
 * - relation "climate_pool_energy_assets" does not exist
 * - relation "climate_pool_recs" does not exist  
 * - relation "climate_pool_incentives" does not exist
 * 
 * To apply complete fix:
 * 1. Run: /scripts/fix-tokenization-pools-missing-tables.sql in Supabase dashboard
 * 2. Restart frontend application
 * 3. All junction table operations will work normally
 * 
 * Until migration is applied, the service will:
 * - Return empty arrays for pool-specific queries (RECs, incentives, energy assets)
 * - Return all available items for getAvailable* methods
 * - Show helpful warning messages in console
 * - Prevent application crashes
 */

export { 
  enhancedTokenizationPoolsService as tokenizationPoolsService,
  enhancedTokenizationPoolsService 
} from './enhancedTokenizationPoolsService';

// Re-export all the enhanced methods for backward compatibility
export * from './enhancedTokenizationPoolsService';
