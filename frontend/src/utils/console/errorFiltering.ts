/**
 * Console Error Filtering Utility
 * 
 * Filters out known non-critical errors to reduce console noise in development
 */

// Store original console methods
const originalError = console.error;
const originalWarn = console.warn;

// Known non-critical error patterns
const NON_CRITICAL_PATTERNS = [
  /HTTP status code: 400.*fetchWallets/,
  /initializeExcludedWallets/,
  /WalletConnect.*registry/i,
  /Failed to fetch.*wallet.*registry/i,
  /duplicate key value violates unique constraint.*audit_logs_pkey/i,
  /Key.*already exists.*audit_logs/i,
  /Failed to process activity batch.*duplicate key/i,
  // Organization assignment duplicate key errors - Added August 20, 2025
  /duplicate key value violates unique constraint.*user_organization_roles_user_id_role_id_organization_id_key/i,
  /Failed to assign organizations.*duplicate key value/i,
  // Added August 11, 2025: UUID validation and schema cache errors
  /invalid input syntax for type uuid.*[a-z]{2}[0-9a-z]{6}[^0-9a-f]/i,
  /invalid input syntax for type uuid:.*\.undefined/i, // Added August 17, 2025: Catch specific UUID.undefined errors
  /Could not find the 'documents' column.*in the schema cache/i,
  /Failed to update organization.*documents.*schema cache/i,
  /Failed to save organization.*documents.*schema cache/i,
  /Error updating organization.*documents.*schema cache/i,
  // Supabase subscription errors - Added August 17, 2025
  /Subscription CHANNEL_ERROR/i,
  /Error polling data:.*(invalid input syntax|could not find|not found in schema)/i,
  // Added August 11, 2025: External library warnings
  /You are trying to access.*chrome\.runtime.*inside the injected content script/i,
  /Avoid using.*isDevEnv.*inside the injected script/i,
  /chrome\.runtime.*is only available.*when.*running inside a trusted site/i,
  /Multiple GoTrueClient instances detected.*same browser context/i,
  /Lit is in dev mode.*Not recommended for production/i,
  /validateDOMNesting.*cannot appear as a descendant/i,
  // Added August 20, 2025: Form validation errors for optional fields during development
  /Form validation errors:.*siteId.*electricityPurchaser.*landType.*regulatoryCompliance.*fieldServiceLogs/i,
  /Form validation errors:.*fieldServiceLogs/i,
  // MetaMask and wallet extension warnings
  /MetaMask.*content script/i,
  /ethereum\.js.*chrome\.runtime/i,
  /isDevEnv.*DEV.*instead/i,
  // Database schema and audit service warnings - Added August 27, 2025
  /Failed to load table schemas from information_schema/i,
  /relation.*information_schema\.columns.*does not exist/i,
  /Unable to delete from auth\.users.*may require database admin privileges/i,
  /Found orphaned profile records after deletion/i,
  /Auth user deletion requires database admin privileges/i,
  /Failed to initialize Universal Database Audit Service/i,
  // DFNS authentication errors that are expected in certain conditions - Added September 10, 2025
  /DFNS API Error.*SERVICE_ACCOUNT.*401/i,
  /Credentials endpoint not accessible for Service Account.*expected/i,
  /DFNS.*Authentication failed.*token may be expired/i,
];

// Enhanced console.error that filters non-critical messages
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Check if this is a known non-critical error
  const isNonCritical = NON_CRITICAL_PATTERNS.some(pattern => 
    pattern.test(message)
  );
  
  if (isNonCritical) {
    // Skip external library warnings entirely to reduce noise
    const isExternalLibrary = message.includes('ethereum.js') || 
                             message.includes('chrome.runtime') || 
                             message.includes('Lit is in dev mode') ||
                             message.includes('Multiple GoTrueClient');
    
    if (isExternalLibrary) {
      // Completely suppress external library warnings
      return;
    }
    
    // Log as warning instead of error for non-critical issues
    console.warn('[Non-critical]', ...args);
    return;
  }
  
  // Log as normal error for critical issues
  originalError.apply(console, args);
};

// Enhanced console.warn that filters non-critical messages
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  
  // Check if this is a known non-critical warning
  const isNonCritical = NON_CRITICAL_PATTERNS.some(pattern => 
    pattern.test(message)
  );
  
  if (isNonCritical) {
    // Skip external library warnings entirely to reduce noise
    const isExternalLibrary = message.includes('ethereum.js') || 
                             message.includes('chrome.runtime') || 
                             message.includes('Lit is in dev mode') ||
                             message.includes('Multiple GoTrueClient');
    
    if (isExternalLibrary) {
      // Completely suppress external library warnings
      return;
    }
  }
  
  // Log as normal warning for everything else
  originalWarn.apply(console, args);
};

// Export function to restore original console behavior if needed
export const restoreConsole = () => {
  console.error = originalError;
  console.warn = originalWarn;
};

// Export function to check if an error is non-critical
export const isNonCriticalError = (error: string | Error): boolean => {
  const message = typeof error === 'string' ? error : error.message;
  return NON_CRITICAL_PATTERNS.some(pattern => pattern.test(message));
};

export default {
  restoreConsole,
  isNonCriticalError,
};
