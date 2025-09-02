/**
 * Temporary client.ts modification to test audit proxy issue
 * Date: August 21, 2025
 * Purpose: Disable audit proxy to test if it's causing duplicate records
 */

// Add this flag at the top of client.ts after the imports
const AUDIT_PROXY_ENABLED = false; // Set to false to test duplicate issue

// Replace the main export line (around line 220) with:
export const supabase = AUDIT_PROXY_ENABLED 
  ? createAuditProxy(createSupabaseClient()) 
  : createSupabaseClient();

// Add console log to track which client is being used
console.log(`🔧 Supabase client mode: ${AUDIT_PROXY_ENABLED ? 'WITH audit proxy' : 'WITHOUT audit proxy'}`);

/**
 * TESTING INSTRUCTIONS:
 * 
 * 1. Apply this change to client.ts
 * 2. Restart the development server
 * 3. Try creating a token in TokenizationManager
 * 4. Check if duplicates still occur
 * 
 * Expected result: 
 * - If duplicates STOP → audit proxy is the issue
 * - If duplicates CONTINUE → look for other causes
 * 
 * After testing:
 * - Set AUDIT_PROXY_ENABLED back to true if needed
 * - Apply the UniversalDatabaseAuditService fix
 * - Implement proper singleton enforcement
 */

// Alternative: Completely bypass audit proxy with direct export
// export const supabase = createSupabaseClient();
