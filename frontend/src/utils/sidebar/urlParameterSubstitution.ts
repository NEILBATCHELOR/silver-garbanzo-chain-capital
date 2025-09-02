/**
 * URL Parameter Substitution Utility
 * 
 * Handles replacement of placeholder parameters in sidebar URLs with actual values
 * from the current route context (useParams).
 * 
 * Supports placeholders like {projectId}, {organizationId}, {tokenId}, etc.
 */

export interface UrlParameters {
  projectId?: string;
  organizationId?: string;
  tokenId?: string;
  investorId?: string;
  userId?: string;
  templateId?: string;
  requestId?: string;
  walletId?: string;
  [key: string]: string | undefined;
}

/**
 * Replaces placeholder parameters in a URL with actual values
 * 
 * @param url - URL with placeholders like '/projects/{projectId}/tokens'
 * @param params - Object with parameter values to substitute
 * @param fallbackBehavior - How to handle missing parameters
 * @returns URL with placeholders replaced by actual values
 * 
 * @example
 * substituteUrlParameters('/projects/{projectId}/tokens', { projectId: 'abc123' })
 * // Returns: '/projects/abc123/tokens'
 * 
 * @example
 * substituteUrlParameters('/projects/{projectId}/tokens', {}, 'remove-item')
 * // Returns: null (indicates this item should be hidden)
 */
export function substituteUrlParameters(
  url: string, 
  params: UrlParameters,
  fallbackBehavior: 'keep-placeholder' | 'remove-item' | 'fallback-route' = 'fallback-route'
): string | null {
  // Extract all placeholder parameters from the URL
  const placeholderPattern = /\{([^}]+)\}/g;
  const matches = Array.from(url.matchAll(placeholderPattern));
  
  if (matches.length === 0) {
    // No placeholders, return URL as-is
    return url;
  }
  
  let processedUrl = url;
  let hasUnresolvedPlaceholders = false;
  
  // Replace each placeholder with its corresponding parameter value
  for (const match of matches) {
    const fullPlaceholder = match[0]; // e.g., '{projectId}'
    const parameterName = match[1];   // e.g., 'projectId'
    const parameterValue = params[parameterName];
    
    if (parameterValue) {
      processedUrl = processedUrl.replace(fullPlaceholder, parameterValue);
    } else {
      hasUnresolvedPlaceholders = true;
    }
  }
  
  // Handle unresolved placeholders based on fallback behavior
  if (hasUnresolvedPlaceholders) {
    switch (fallbackBehavior) {
      case 'keep-placeholder':
        // Keep the original URL with placeholders
        return url;
        
      case 'remove-item':
        // Indicate this item should be hidden from navigation
        return null;
        
      case 'fallback-route':
        // Try to create a reasonable fallback route
        return createFallbackRoute(url, params);
        
      default:
        return processedUrl;
    }
  }
  
  return processedUrl;
}

/**
 * Creates a fallback route when URL parameters are missing
 * 
 * @param originalUrl - Original URL with placeholders
 * @param params - Available parameters
 * @returns Fallback URL or null if no reasonable fallback exists
 */
function createFallbackRoute(originalUrl: string, params: UrlParameters): string | null {
  // Handle project-specific routes
  if (originalUrl.includes('/projects/{projectId}')) {
    // If no projectId available, fall back to general route without project context
    const fallbackUrl = originalUrl
      .replace('/projects/{projectId}', '')
      .replace(/^\/+/, '/'); // Remove leading slashes
    
    // Special cases for common patterns
    if (fallbackUrl === '/tokens' || fallbackUrl === '/tokens/') return '/tokens';
    if (fallbackUrl === '/factoring/dashboard') return '/factoring/dashboard';
    if (fallbackUrl === '/climate-receivables/dashboard') return '/climate-receivables/dashboard';
    if (fallbackUrl === '/captable/investors') return '/captable/investors';
    
    return fallbackUrl === '/' ? null : fallbackUrl;
  }
  
  // Handle organization-specific routes
  if (originalUrl.includes('/organization/{organizationId}')) {
    return originalUrl.includes('/compliance') ? '/compliance/management' : null;
  }
  
  // Handle user/investor-specific routes
  if (originalUrl.includes('/investor/{investorId}')) {
    return '/compliance/management/investors';
  }
  
  // For other cases, try removing the placeholder segment entirely
  const segments = originalUrl.split('/').filter(segment => !segment.includes('{') && segment !== '');
  return segments.length > 0 ? `/${segments.join('/')}` : null;
}

/**
 * Processes an array of URLs for parameter substitution
 * 
 * @param urls - Array of URLs that may contain placeholders
 * @param params - Parameter values for substitution
 * @param fallbackBehavior - How to handle missing parameters
 * @returns Array of processed URLs (null entries indicate items to hide)
 */
export function batchSubstituteUrlParameters(
  urls: string[],
  params: UrlParameters,
  fallbackBehavior: 'keep-placeholder' | 'remove-item' | 'fallback-route' = 'fallback-route'
): (string | null)[] {
  return urls.map(url => substituteUrlParameters(url, params, fallbackBehavior));
}

/**
 * Validates if all required parameters are available for a given URL
 * 
 * @param url - URL to check for required parameters
 * @param availableParams - Available parameter values
 * @returns Object with validation result and missing parameters
 */
export function validateUrlParameters(url: string, availableParams: UrlParameters) {
  const placeholderPattern = /\{([^}]+)\}/g;
  const matches = Array.from(url.matchAll(placeholderPattern));
  
  const requiredParams = matches.map(match => match[1]);
  const missingParams = requiredParams.filter(param => !availableParams[param]);
  
  return {
    isValid: missingParams.length === 0,
    requiredParams,
    missingParams,
    hasPlaceholders: requiredParams.length > 0
  };
}

/**
 * Extracts parameter names from URL placeholders
 * 
 * @param url - URL that may contain placeholders
 * @returns Array of parameter names found in the URL
 */
export function extractUrlParameterNames(url: string): string[] {
  const placeholderPattern = /\{([^}]+)\}/g;
  const matches = Array.from(url.matchAll(placeholderPattern));
  return matches.map(match => match[1]);
}
