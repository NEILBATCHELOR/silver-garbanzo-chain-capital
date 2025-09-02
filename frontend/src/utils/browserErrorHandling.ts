/**
 * Browser Console Error Filter
 * Filters out known non-critical errors from browser extensions and injected scripts
 * Date: August 18, 2025
 */

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// List of error patterns to filter out (non-critical browser extension errors)
const FILTERED_ERROR_PATTERNS = [
  // Ethereum.js / MetaMask extension errors
  /You are trying to access `chrome\.runtime` inside the injected content script/,
  /chrome\.runtime is only available in the injected script when it is running inside a trusted site/,
  /Avoid using `isDevEnv\(\)` inside the injected script/,
  /chrome\.runtime is only available when the injected script is running inside a trusted site/,
  
  // GoTrueClient multiple instances (Supabase auth)
  /Multiple GoTrueClient instances detected/,
  /Detected multiple instances of GoTrueClient/,
  
  // Browser extension content script errors
  /Extension context invalidated/,
  /Could not establish connection\. Receiving end does not exist/,
  /The message port closed before a response was received/,
  
  // Web3 provider injection errors
  /window\.ethereum is not available/,
  /Provider not found/,
  /No provider was found/,
  
  // Non-critical network errors from extensions
  /net::ERR_BLOCKED_BY_CLIENT/,
  /net::ERR_FAILED.*extension/,
  
  // Chrome runtime errors from extensions
  /runtime\.lastError/,
  /Extension\\.runtime\.lastError/,
];

// List of warning patterns to filter out
const FILTERED_WARNING_PATTERNS = [
  // Development mode warnings
  /isDevEnv\(\)/,
  /chrome\.runtime/,
  /injected content script/,
  
  // React development warnings that aren't critical
  /Warning: Each child in a list should have a unique "key" prop/,
  /Warning: Failed prop type/,
];

/**
 * Filter console.error messages
 */
function filteredConsoleError(...args: any[]) {
  const message = args.join(' ');
  
  // Check if this error matches any filtered patterns
  const shouldFilter = FILTERED_ERROR_PATTERNS.some(pattern => 
    pattern.test(message)
  );
  
  // Only show non-filtered errors
  if (!shouldFilter) {
    originalConsoleError.apply(console, args);
  } else {
    // Optionally log filtered errors to a separate debug console
    if (process.env.NODE_ENV === 'development' && window.location.search.includes('debug=true')) {
      console.debug('[FILTERED ERROR]', ...args);
    }
  }
}

/**
 * Filter console.warn messages
 */
function filteredConsoleWarn(...args: any[]) {
  const message = args.join(' ');
  
  // Check if this warning matches any filtered patterns
  const shouldFilter = FILTERED_WARNING_PATTERNS.some(pattern => 
    pattern.test(message)
  );
  
  // Only show non-filtered warnings
  if (!shouldFilter) {
    originalConsoleWarn.apply(console, args);
  } else {
    // Optionally log filtered warnings to a separate debug console
    if (process.env.NODE_ENV === 'development' && window.location.search.includes('debug=true')) {
      console.debug('[FILTERED WARNING]', ...args);
    }
  }
}

/**
 * Initialize console error filtering
 */
export function initializeConsoleErrorFiltering() {
  // Only apply filtering in production or when explicitly enabled
  if (process.env.NODE_ENV === 'production' || window.location.search.includes('filter-console=true')) {
    console.error = filteredConsoleError;
    console.warn = filteredConsoleWarn;
    
    console.info('Console error filtering enabled. Add ?debug=true to URL to see filtered messages.');
  }
}

/**
 * Disable console error filtering (for debugging)
 */
export function disableConsoleErrorFiltering() {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.info('Console error filtering disabled.');
}

/**
 * Handle window.ethereum related errors gracefully
 */
export function initializeWeb3ErrorHandling() {
  // Prevent ethereum.js errors from breaking the app
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    
    // Filter out known ethereum.js errors
    if (
      message.includes('chrome.runtime') ||
      message.includes('ethereum.js') ||
      message.includes('injected content script')
    ) {
      event.preventDefault();
      event.stopPropagation();
      
      // Log as debug instead of error
      if (process.env.NODE_ENV === 'development') {
        console.debug('[FILTERED WEB3 ERROR]', message);
      }
    }
  });
  
  // Handle unhandled promise rejections from browser extensions
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason || '';
    
    if (
      reason.includes('chrome.runtime') ||
      reason.includes('Extension context') ||
      reason.includes('GoTrueClient')
    ) {
      event.preventDefault();
      
      // Log as debug instead of error
      if (process.env.NODE_ENV === 'development') {
        console.debug('[FILTERED PROMISE REJECTION]', reason);
      }
    }
  });
}

/**
 * Initialize Supabase client error handling
 */
export function initializeSupabaseErrorHandling() {
  // Store original Supabase client methods if needed
  const originalSupabaseError = console.error;
  
  // Monitor for multiple GoTrueClient instances
  let goTrueInstanceCount = 0;
  const originalGoTrueClient = (window as any).GoTrueClient;
  
  if (originalGoTrueClient) {
    (window as any).GoTrueClient = function(...args: any[]) {
      goTrueInstanceCount++;
      
      if (goTrueInstanceCount > 1) {
        console.debug(`[SUPABASE DEBUG] GoTrueClient instance #${goTrueInstanceCount} created`);
      }
      
      return new originalGoTrueClient(...args);
    };
  }
}

/**
 * Main initialization function
 */
export function initializeBrowserErrorHandling() {
  initializeConsoleErrorFiltering();
  initializeWeb3ErrorHandling();
  initializeSupabaseErrorHandling();
  
  console.info('Browser error handling initialized successfully');
}

// Export the original console methods for debugging
export const originalConsole = {
  error: originalConsoleError,
  warn: originalConsoleWarn
};