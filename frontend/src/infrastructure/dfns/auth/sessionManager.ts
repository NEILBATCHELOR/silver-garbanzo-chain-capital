/**
 * DFNS Session Manager
 * 
 * Manages user authentication sessions and tokens
 */

import type {
  DfnsAuthTokenResponse,
  DfnsAuthSession,
} from '../../../types/dfns';
import { DfnsAuthenticationError } from '../../../types/dfns/errors';

export class DfnsSessionManager {
  private static readonly SESSION_KEY = 'dfns_session';
  private static readonly TOKEN_KEY = 'dfns_token';
  private static readonly REFRESH_TOKEN_KEY = 'dfns_refresh_token';
  
  private currentSession: DfnsAuthSession | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadStoredSession();
  }

  /**
   * Create new session from authentication response
   */
  createSession(authResponse: DfnsAuthTokenResponse): DfnsAuthSession {
    const session: DfnsAuthSession = {
      id: this.generateSessionId(),
      user_id: authResponse.user.id,
      token: authResponse.token,
      refresh_token: authResponse.refreshToken,
      expires_at: new Date(Date.now() + authResponse.expiresIn * 1000).toISOString(),
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      is_active: true,
    };

    this.setCurrentSession(session);
    this.scheduleTokenRefresh(authResponse.expiresIn);

    return session;
  }

  /**
   * Get current active session
   */
  getCurrentSession(): DfnsAuthSession | null {
    if (this.currentSession && !this.isSessionExpired(this.currentSession)) {
      return this.currentSession;
    }
    
    this.clearSession();
    return null;
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    const session = this.getCurrentSession();
    return session?.token || null;
  }

  /**
   * Update session with new token data
   */
  updateSession(authResponse: DfnsAuthTokenResponse): void {
    if (!this.currentSession) {
      throw new DfnsAuthenticationError('No active session to update');
    }

    this.currentSession.token = authResponse.token;
    this.currentSession.refresh_token = authResponse.refreshToken;
    this.currentSession.expires_at = new Date(Date.now() + authResponse.expiresIn * 1000).toISOString();
    this.currentSession.last_used_at = new Date().toISOString();

    this.persistSession();
    this.scheduleTokenRefresh(authResponse.expiresIn);
  }

  /**
   * Update last used timestamp
   */
  updateLastUsed(): void {
    if (this.currentSession) {
      this.currentSession.last_used_at = new Date().toISOString();
      this.persistSession();
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentSession() !== null;
  }

  /**
   * Check if session needs refresh
   */
  needsRefresh(): boolean {
    const session = this.currentSession;
    if (!session) return false;

    const expiresAt = new Date(session.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return expiresAt <= fiveMinutesFromNow;
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.currentSession = null;
    this.clearTokenRefreshTimer();
    this.removeStoredSession();
  }

  /**
   * Set current session and persist it
   */
  private setCurrentSession(session: DfnsAuthSession): void {
    this.currentSession = session;
    this.persistSession();
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: DfnsAuthSession): boolean {
    return new Date(session.expires_at) <= new Date();
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresInSeconds: number): void {
    this.clearTokenRefreshTimer();

    // Refresh 5 minutes before expiration
    const refreshIn = Math.max(0, (expiresInSeconds - 300) * 1000);
    
    this.refreshTimer = setTimeout(() => {
      if (this.currentSession?.refresh_token) {
        this.emitRefreshNeeded();
      }
    }, refreshIn);
  }

  /**
   * Clear token refresh timer
   */
  private clearTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Emit refresh needed event
   */
  private emitRefreshNeeded(): void {
    window.dispatchEvent(new CustomEvent('dfns:token-refresh-needed', {
      detail: { refreshToken: this.currentSession?.refresh_token }
    }));
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `dfns_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load session from storage
   */
  private loadStoredSession(): void {
    try {
      const sessionData = localStorage.getItem(DfnsSessionManager.SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (!this.isSessionExpired(session)) {
          this.currentSession = session;
          
          // Calculate remaining time and schedule refresh
          const expiresAt = new Date(session.expires_at);
          const now = new Date();
          const remainingSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
          
          if (remainingSeconds > 0) {
            this.scheduleTokenRefresh(remainingSeconds);
          }
        } else {
          this.removeStoredSession();
        }
      }
    } catch (error) {
      console.warn('Failed to load stored session:', error);
      this.removeStoredSession();
    }
  }

  /**
   * Persist session to storage
   */
  private persistSession(): void {
    if (this.currentSession) {
      localStorage.setItem(DfnsSessionManager.SESSION_KEY, JSON.stringify(this.currentSession));
      localStorage.setItem(DfnsSessionManager.TOKEN_KEY, this.currentSession.token);
      
      if (this.currentSession.refresh_token) {
        localStorage.setItem(DfnsSessionManager.REFRESH_TOKEN_KEY, this.currentSession.refresh_token);
      }
    }
  }

  /**
   * Remove session from storage
   */
  private removeStoredSession(): void {
    localStorage.removeItem(DfnsSessionManager.SESSION_KEY);
    localStorage.removeItem(DfnsSessionManager.TOKEN_KEY);
    localStorage.removeItem(DfnsSessionManager.REFRESH_TOKEN_KEY);
  }

  /**
   * Clean up on destruction
   */
  destroy(): void {
    this.clearTokenRefreshTimer();
    this.currentSession = null;
  }
}
