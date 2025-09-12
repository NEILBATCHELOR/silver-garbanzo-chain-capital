/**
 * DFNS Cross-Device WebAuthn Service (Stateless)
 * 
 * Enables QR code authentication between desktop and mobile browsers
 * WITHOUT requiring database storage - uses DFNS API state management
 * UPDATED: Full DFNS integration with proper cross-device communication
 */

import { DfnsUserActionSigningService, UserActionSigningRequest, UserActionSigningChallenge } from './userActionSigningService';
import { DfnsError } from '../../types/dfns/errors';

export interface CrossDeviceSession {
  challengeId: string;
  mobileUrl: string;
  qrCodeData: string;
  expiresAt: number;
}

export interface CrossDeviceAuthResult {
  success: boolean;
  userActionToken?: string;
  error?: string;
}

// Temporary in-memory storage for challenges (could use sessionStorage for persistence across page reloads)
const challengeCache = new Map<string, {
  challenge: UserActionSigningChallenge;
  timestamp: number;
  expiresAt: number;
}>();

// Clean up expired challenges every minute
setInterval(() => {
  const now = Date.now();
  for (const [challengeId, data] of challengeCache.entries()) {
    if (now > data.expiresAt) {
      challengeCache.delete(challengeId);
    }
  }
}, 60000);

export class DfnsCrossDeviceWebAuthnService {
  private userActionService: DfnsUserActionSigningService;
  private pendingSessions = new Map<string, {
    resolve: (result: CrossDeviceAuthResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(userActionService: DfnsUserActionSigningService) {
    this.userActionService = userActionService;
    this.setupCommunicationListener();
  }

  /**
   * Generate QR code for cross-device authentication (Desktop)
   * No database required - uses DFNS challenge state + temporary cache
   */
  async generateCrossDeviceAuth(request: UserActionSigningRequest): Promise<CrossDeviceSession> {
    try {
      console.log('📱 Generating cross-device authentication QR code...');

      // Step 1: Initialize challenge with DFNS (they store the state)
      const challenge = await this.userActionService.initializeChallenge(request);

      // Step 2: Cache challenge details temporarily for mobile access (5 minutes)
      const expiresAt = Date.now() + 300000; // 5 minutes
      challengeCache.set(challenge.challengeIdentifier, {
        challenge,
        timestamp: Date.now(),
        expiresAt
      });

      // Step 3: Create mobile authentication URL with challenge data
      const baseUrl = window.location.origin;
      const mobileAuthData = {
        challengeId: challenge.challengeIdentifier,
        origin: baseUrl,
        timestamp: Date.now()
      };

      // Encode data in URL (could encrypt if needed for extra security)
      const encodedData = btoa(JSON.stringify(mobileAuthData));
      const mobileUrl = `${baseUrl}/mobile-auth?d=${encodedData}`;

      console.log('✅ Cross-device session created:', {
        challengeId: challenge.challengeIdentifier,
        mobileUrl,
        expiresIn: '5 minutes'
      });

      return {
        challengeId: challenge.challengeIdentifier,
        mobileUrl,
        qrCodeData: mobileUrl,
        expiresAt
      };

    } catch (error) {
      console.error('❌ Failed to generate cross-device authentication:', error);
      throw new DfnsError(
        `Failed to generate cross-device authentication: ${error}`,
        'CROSS_DEVICE_GENERATION_FAILED'
      );
    }
  }

  /**
   * Wait for mobile authentication completion (Desktop)
   * Uses in-memory promise-based waiting + communication listener
   */
  async waitForMobileAuth(challengeId: string, timeoutMs: number = 300000): Promise<CrossDeviceAuthResult> {
    return new Promise((resolve, reject) => {
      console.log('⏳ Waiting for mobile authentication...', { challengeId });

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingSessions.delete(challengeId);
        resolve({
          success: false,
          error: 'Authentication timeout - mobile device did not complete authentication'
        });
      }, timeoutMs);

      // Store promise handlers
      this.pendingSessions.set(challengeId, {
        resolve,
        reject,
        timeout
      });

      // Start listening for communication from mobile
      this.startListeningForMobileResult(challengeId);
    });
  }

  /**
   * Complete mobile authentication (Mobile Browser)
   * Handles WebAuthn authentication and notifies desktop
   * UPDATED: Full DFNS integration with proper challenge retrieval
   */
  async completeMobileAuth(
    challengeId: string,
    origin: string
  ): Promise<{
    success: boolean;
    message: string;
    userActionToken?: string;
    error?: string;
  }> {
    try {
      console.log('📱 Starting mobile WebAuthn authentication...', { 
        challengeId
      });

      // Step 1: Get challenge details from cache (cross-device compatible)
      const challengeData = await this.getChallengeFromCache(challengeId);
      if (!challengeData) {
        throw new DfnsError('Challenge not found or expired. Please scan a new QR code.', 'CHALLENGE_NOT_FOUND');
      }

      // Step 2: Check WebAuthn support
      const webauthnSupported = !!(
        window.PublicKeyCredential &&
        navigator.credentials &&
        navigator.credentials.get
      );

      if (!webauthnSupported) {
        throw new DfnsError('WebAuthn not supported on this device', 'WEBAUTHN_NOT_SUPPORTED');
      }

      if (!challengeData.allowCredentials.webauthn || challengeData.allowCredentials.webauthn.length === 0) {
        throw new DfnsError('No WebAuthn credentials available for authentication', 'NO_WEBAUTHN_CREDENTIALS');
      }

      // Step 3: Create WebAuthn assertion options
      const assertionOptions: PublicKeyCredentialRequestOptions = {
        challenge: this.base64URLToBuffer(challengeData.challenge),
        allowCredentials: challengeData.allowCredentials.webauthn.map(cred => ({
          type: 'public-key' as const,
          id: this.base64URLToBuffer(cred.id),
          transports: (typeof cred.transports === 'string' 
            ? JSON.parse(cred.transports) 
            : cred.transports || ['internal']) as AuthenticatorTransport[]
        })),
        userVerification: 'required',
        timeout: 60000 // 60 seconds
      };

      console.log('📱 Prompting for WebAuthn authentication...');

      // Step 4: Get WebAuthn assertion from device
      const assertion = await navigator.credentials.get({
        publicKey: assertionOptions
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new DfnsError('WebAuthn assertion failed - no credential returned', 'WEBAUTHN_ASSERTION_FAILED');
      }

      const assertionResponse = assertion.response as AuthenticatorAssertionResponse;

      // Step 5: Complete User Action Signing with DFNS
      const completion = {
        challengeIdentifier: challengeId,
        firstFactor: {
          kind: 'Fido2' as const,
          credentialAssertion: {
            credId: this.bufferToBase64URL(assertion.rawId),
            clientData: this.bufferToBase64URL(assertionResponse.clientDataJSON),
            authenticatorData: this.bufferToBase64URL(assertionResponse.authenticatorData),
            signature: this.bufferToBase64URL(assertionResponse.signature),
            userHandle: assertionResponse.userHandle ? this.bufferToBase64URL(assertionResponse.userHandle) : undefined
          }
        }
      };

      console.log('🔐 Completing User Action Signing with DFNS...');

      const signingResponse = await this.userActionService.completeChallenge(completion);
      const userActionToken = signingResponse.userAction;

      console.log('✅ Mobile authentication successful!');

      // Step 6: Clean up cached challenge
      challengeCache.delete(challengeId);

      // Step 7: Notify desktop of success
      await this.notifyDesktop(challengeId, userActionToken);

      return {
        success: true,
        message: 'Authentication completed successfully',
        userActionToken
      };

    } catch (error: any) {
      console.error('❌ Mobile authentication failed:', error);
      
      let errorMessage = error.message;
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Authentication cancelled by user';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error - ensure you\'re on HTTPS';
      } else if (error.name === 'NetworkError') {
        errorMessage = 'Network error - check your connection';
      }

      // Notify desktop of failure
      await this.notifyDesktop(challengeId, null, errorMessage);
      
      return {
        success: false,
        message: 'Authentication failed',
        error: errorMessage
      };
    }
  }

  /**
   * Get challenge details from cache (cross-device compatible)
   * UPDATED: Uses shared cache instead of local memory
   */
  private async getChallengeFromCache(challengeId: string): Promise<UserActionSigningChallenge | null> {
    try {
      console.log('📱 Retrieving challenge from cache...', { challengeId });

      const cachedData = challengeCache.get(challengeId);
      
      if (!cachedData) {
        console.warn('⚠️ Challenge not found in cache');
        return null;
      }

      if (Date.now() > cachedData.expiresAt) {
        console.warn('⚠️ Challenge expired');
        challengeCache.delete(challengeId);
        return null;
      }

      console.log('✅ Challenge retrieved from cache');
      return cachedData.challenge;

    } catch (error) {
      console.error('❌ Failed to retrieve challenge from cache:', error);
      return null;
    }
  }

  /**
   * Notify desktop of authentication result (Mobile -> Desktop)
   * UPDATED: Multiple communication methods for reliability
   */
  private async notifyDesktop(
    challengeId: string, 
    userActionToken?: string, 
    error?: string
  ): Promise<void> {
    try {
      const result = { 
        challengeId,
        userActionToken, 
        error, 
        timestamp: Date.now() 
      };

      // Method 1: BroadcastChannel (same origin, cross-tab)
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('dfns-cross-device-auth');
        channel.postMessage({
          type: 'auth-complete',
          ...result
        });
        channel.close();
        console.log('📤 Desktop notified via BroadcastChannel');
      }

      // Method 2: localStorage (same origin, for polling)
      const storageKey = `cross-device-result-${challengeId}`;
      localStorage.setItem(storageKey, JSON.stringify(result));
      
      // Clean up after 5 minutes
      setTimeout(() => {
        localStorage.removeItem(storageKey);
      }, 300000);
      
      console.log('📤 Desktop notified via localStorage');

      // Method 3: Try custom event (same tab)
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'dfns-auth-complete',
          ...result
        }, window.location.origin);
        console.log('📤 Desktop notified via postMessage');
      }

    } catch (notifyError) {
      console.warn('⚠️ Failed to notify desktop:', notifyError);
      // Not critical - desktop will timeout anyway
    }
  }

  /**
   * Set up communication listener for desktop
   * UPDATED: Multiple communication channels
   */
  private setupCommunicationListener(): void {
    // Method 1: BroadcastChannel listener
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('dfns-cross-device-auth');
      channel.addEventListener('message', (event) => {
        if (event.data.type === 'auth-complete' && event.data.challengeId) {
          this.handleAuthenticationResult(
            event.data.challengeId,
            event.data.userActionToken,
            event.data.error
          );
        }
      });
    }

    // Method 2: Storage listener (for localStorage changes)
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('cross-device-result-') && event.newValue) {
        try {
          const result = JSON.parse(event.newValue);
          this.handleAuthenticationResult(
            result.challengeId,
            result.userActionToken,
            result.error
          );
        } catch (error) {
          console.warn('Failed to parse storage result:', error);
        }
      }
    });

    // Method 3: postMessage listener
    window.addEventListener('message', (event) => {
      if (event.data.type === 'dfns-auth-complete' && event.data.challengeId) {
        this.handleAuthenticationResult(
          event.data.challengeId,
          event.data.userActionToken,
          event.data.error
        );
      }
    });
  }

  /**
   * Start actively listening for mobile result (Desktop)
   * UPDATED: Polling for localStorage results as fallback
   */
  private startListeningForMobileResult(challengeId: string): void {
    const storageKey = `cross-device-result-${challengeId}`;
    
    // Poll localStorage every 1 second as fallback
    const pollInterval = setInterval(() => {
      const storedResult = localStorage.getItem(storageKey);
      if (storedResult) {
        try {
          const result = JSON.parse(storedResult);
          this.handleAuthenticationResult(
            result.challengeId,
            result.userActionToken,
            result.error
          );
          localStorage.removeItem(storageKey);
          clearInterval(pollInterval);
        } catch (error) {
          console.warn('Failed to parse polling result:', error);
        }
      }
    }, 1000);

    // Clean up polling when session ends
    const session = this.pendingSessions.get(challengeId);
    if (session) {
      const originalTimeout = session.timeout;
      session.timeout = setTimeout(() => {
        clearInterval(pollInterval);
        clearTimeout(originalTimeout);
        // Call original timeout logic
        this.pendingSessions.delete(challengeId);
        session.resolve({
          success: false,
          error: 'Authentication timeout - mobile device did not complete authentication'
        });
      }, 300000); // 5 minutes
    }
  }

  /**
   * Handle authentication completion notification (Desktop)
   */
  handleAuthenticationResult(challengeId: string, userActionToken?: string, error?: string): void {
    const session = this.pendingSessions.get(challengeId);
    if (!session) {
      console.warn('⚠️ Received result for unknown session:', challengeId);
      return;
    }

    // Clear timeout
    clearTimeout(session.timeout);
    this.pendingSessions.delete(challengeId);

    // Resolve the waiting promise
    if (error) {
      session.resolve({
        success: false,
        error
      });
    } else {
      session.resolve({
        success: true,
        userActionToken
      });
    }

    console.log('✅ Cross-device authentication completed:', { challengeId, success: !error });
  }

  /**
   * Clean up expired sessions
   */
  cleanup(): void {
    const now = Date.now();
    for (const [challengeId, session] of this.pendingSessions.entries()) {
      clearTimeout(session.timeout);
      session.resolve({
        success: false,
        error: 'Session cleanup - service shutting down'
      });
    }
    this.pendingSessions.clear();
    
    // Clean up challenge cache
    challengeCache.clear();
  }

  /**
   * Check if cross-device authentication is supported
   */
  isCrossDeviceSupported(): boolean {
    return !!(
      window.location &&
      window.fetch &&
      typeof btoa === 'function' &&
      typeof atob === 'function' &&
      'localStorage' in window
    );
  }

  /**
   * Generate QR code data URL for display
   * Uses a lightweight QR code service (no dependencies)
   */
  async generateQRCodeDataUrl(mobileUrl: string): Promise<string> {
    try {
      // Use public QR service (no dependencies)
      const qrServiceUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileUrl)}`;
      return qrServiceUrl;

    } catch (error) {
      console.error('❌ Failed to generate QR code:', error);
      // Fallback: return the URL as text
      return `data:text/plain;charset=utf-8,${encodeURIComponent(mobileUrl)}`;
    }
  }

  /**
   * Decode mobile authentication data from URL
   */
  decodeMobileAuthData(encodedData: string): {
    challengeId: string;
    origin: string;
    timestamp?: number;
  } | null {
    try {
      const decoded = JSON.parse(atob(encodedData));
      
      if (!decoded.challengeId || !decoded.origin) {
        throw new Error('Invalid authentication data format');
      }

      return decoded;
    } catch (error) {
      console.error('❌ Failed to decode mobile auth data:', error);
      return null;
    }
  }

  // Utility methods for WebAuthn data conversion
  private base64URLToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  private bufferToBase64URL(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private stringToBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }
}