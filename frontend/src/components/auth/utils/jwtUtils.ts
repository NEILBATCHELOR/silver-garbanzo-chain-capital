/**
 * JWT Management Utilities
 * 
 * Utilities for handling JWTs from Supabase authentication
 */

import type { AuthSession } from '../types/authTypes';

/**
 * JWT token information
 */
export interface JWTInfo {
  header: Record<string, any>;
  payload: Record<string, any>;
  signature: string;
  raw: string;
  isExpired: boolean;
  expiresAt: Date | null;
  issuedAt: Date | null;
  issuer: string | null;
  audience: string | null;
  subject: string | null;
  role: string | null;
  email: string | null;
  userId: string | null;
}

/**
 * Decode a JWT token without verification
 * Note: This is for reading purposes only, verification is handled by Supabase
 */
export const decodeJWT = (token: string): JWTInfo | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const [headerB64, payloadB64, signature] = parts;
    
    // Decode header and payload
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // Extract common fields
    const expiresAt = payload.exp ? new Date(payload.exp * 1000) : null;
    const issuedAt = payload.iat ? new Date(payload.iat * 1000) : null;
    const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() : false;

    return {
      header,
      payload,
      signature,
      raw: token,
      isExpired,
      expiresAt,
      issuedAt,
      issuer: payload.iss || null,
      audience: payload.aud || null,
      subject: payload.sub || null,
      role: payload.role || null,
      email: payload.email || null,
      userId: payload.sub || null,
    };
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

/**
 * Get JWT information from session
 */
export const getJWTInfo = (session: AuthSession | null): {
  accessToken: JWTInfo | null;
  refreshToken: string | null;
} => {
  if (!session) {
    return {
      accessToken: null,
      refreshToken: null,
    };
  }

  return {
    accessToken: decodeJWT(session.access_token),
    refreshToken: session.refresh_token,
  };
};

/**
 * Extract user claims from JWT
 */
export const getUserClaims = (session: AuthSession | null): Record<string, any> => {
  const jwtInfo = getJWTInfo(session);
  
  if (!jwtInfo.accessToken) {
    return {};
  }

  const { payload } = jwtInfo.accessToken;
  
  // Return common user claims
  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    aud: payload.aud,
    exp: payload.exp,
    iat: payload.iat,
    iss: payload.iss,
    app_metadata: payload.app_metadata || {},
    user_metadata: payload.user_metadata || {},
    // Custom claims
    ...Object.keys(payload).reduce((claims, key) => {
      if (!['sub', 'email', 'role', 'aud', 'exp', 'iat', 'iss', 'app_metadata', 'user_metadata'].includes(key)) {
        claims[key] = payload[key];
      }
      return claims;
    }, {} as Record<string, any>),
  };
};

/**
 * Check if user has specific role
 */
export const hasRole = (session: AuthSession | null, role: string): boolean => {
  const claims = getUserClaims(session);
  return claims.role === role;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (session: AuthSession | null, roles: string[]): boolean => {
  const claims = getUserClaims(session);
  return roles.includes(claims.role);
};

/**
 * Get user permissions from JWT (if included in claims)
 */
export const getUserPermissions = (session: AuthSession | null): string[] => {
  const claims = getUserClaims(session);
  return claims.permissions || claims.app_metadata?.permissions || [];
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (session: AuthSession | null, permission: string): boolean => {
  const permissions = getUserPermissions(session);
  return permissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (session: AuthSession | null, permissions: string[]): boolean => {
  const userPermissions = getUserPermissions(session);
  return permissions.some(permission => userPermissions.includes(permission));
};

/**
 * Get session expiry information
 */
export const getSessionExpiry = (session: AuthSession | null): {
  expiresAt: Date | null;
  isExpired: boolean;
  timeUntilExpiry: number; // in milliseconds
  timeUntilExpiryFormatted: string;
} => {
  const jwtInfo = getJWTInfo(session);
  
  if (!jwtInfo.accessToken?.expiresAt) {
    return {
      expiresAt: null,
      isExpired: false,
      timeUntilExpiry: Infinity,
      timeUntilExpiryFormatted: 'Never',
    };
  }

  const expiresAt = jwtInfo.accessToken.expiresAt;
  const timeUntilExpiry = expiresAt.getTime() - Date.now();
  const isExpired = timeUntilExpiry <= 0;

  const formatTimeUntilExpiry = (ms: number): string => {
    if (ms <= 0) return 'Expired';
    
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    return 'Less than a minute';
  };

  return {
    expiresAt,
    isExpired,
    timeUntilExpiry,
    timeUntilExpiryFormatted: formatTimeUntilExpiry(timeUntilExpiry),
  };
};

/**
 * Validate JWT format (basic validation)
 */
export const isValidJWTFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Try to decode header and payload
    atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
    atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return true;
  } catch {
    return false;
  }
};

/**
 * Extract token type (Bearer, etc.)
 */
export const extractTokenType = (authHeader: string): { type: string; token: string } | null => {
  if (!authHeader || typeof authHeader !== 'string') return null;
  
  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2) return null;
  
  return {
    type: parts[0],
    token: parts[1],
  };
};

/**
 * Create authorization header
 */
export const createAuthHeader = (token: string, type: string = 'Bearer'): string => {
  return `${type} ${token}`;
};

/**
 * Get token from session for API calls
 */
export const getApiToken = (session: AuthSession | null): string | null => {
  return session?.access_token || null;
};

/**
 * Create headers for authenticated API calls
 */
export const createAuthHeaders = (session: AuthSession | null): Record<string, string> => {
  const token = getApiToken(session);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = createAuthHeader(token);
  }
  
  return headers;
};

/**
 * JWT utility object with common methods
 */
export const jwtUtils = {
  decode: decodeJWT,
  getInfo: getJWTInfo,
  getUserClaims,
  hasRole,
  hasAnyRole,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  getSessionExpiry,
  isValidFormat: isValidJWTFormat,
  extractTokenType,
  createAuthHeader,
  getApiToken,
  createAuthHeaders,
};

export default jwtUtils;
