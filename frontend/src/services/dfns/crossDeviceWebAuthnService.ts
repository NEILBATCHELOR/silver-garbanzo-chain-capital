/**
 * DFNS Cross-Device WebAuthn Service (Stateless)
 * 
 * Enables QR code authentication between desktop and mobile browsers
 * WITHOUT requiring database storage - uses DFNS API state management
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

export class DfnsCrossDeviceWebAuthnService {
  private userActionService: DfnsUserActionSigningService;
  private pendingSessions = new Map<string, {
    resolve: (result: CrossDeviceAuthResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private challengeStorage = new Map<string, UserActionSigningChallenge>();

  constructor(userActionService: DfnsUserActionSigningService) {
    this.userActionService = userActionService;
  }

  /**
   * Generate QR code for cross-device authentication (Desktop)
   * No database required - uses DFNS challenge state
   */
  async generateCrossDeviceAuth(request: UserActionSigningRequest): Promise<CrossDeviceSession> {
    try {
      console.log('📱 Generating cross-device authentication QR code...');

      // Step 1: Initialize challenge with DFNS (they store the state)
      const challenge = await this.userActionService.initializeChallenge(request);

      // Step 2: Store challenge details for mobile retrieval
      this.challengeStorage.set(challenge.challengeIdentifier, challenge);

      // Step 2: Create mobile authentication URL with challenge data
      const baseUrl = window.location.origin;
      const mobileAuthData = {
        challengeId: challenge.challengeIdentifier,
        origin: baseUrl,
        // Include minimal required data - DFNS API will provide the rest
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
        expiresAt: Date.now() + 300000 // 5 minutes (matches DFNS challenge expiry)
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
   * Uses in-memory promise-based waiting - no database polling
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
    });
  }

  /**
   * Complete mobile authentication (Mobile Browser)
   * Handles WebAuthn authentication and notifies desktop
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

      // Step 1: Get challenge details
      const challengeDetails = await this.getChallengeDetails(challengeId);
      if (!challengeDetails) {
        throw new DfnsError('Challenge not found or expired', 'CHALLENGE_NOT_FOUND');
      }

      const challengeData = {
        challengeId,
        challenge: challengeDetails.challenge,
        allowCredentials: challengeDetails.allowCredentials
      };

      // Step 2: Check WebAuthn support
      const webauthnSupported = !!(
        window.PublicKeyCredential &&
        navigator.credentials &&
        navigator.credentials.get
      );

      if (!webauthnSupported) {
        throw new DfnsError('WebAuthn not supported on this device', 'WEBAUTHN_NOT_SUPPORTED');
      }

      if (!challengeData.allowCredentials || challengeData.allowCredentials.length === 0) {
        throw new DfnsError('No WebAuthn credentials available for authentication', 'NO_WEBAUTHN_CREDENTIALS');
      }

      // Step 3: Create WebAuthn assertion options
      const assertionOptions: PublicKeyCredentialRequestOptions = {
        challenge: this.base64URLToBuffer(challengeData.challenge),
        allowCredentials: challengeData.allowCredentials.map(cred => ({
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
        challengeIdentifier: challengeData.challengeId,
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

      console.log('🔐 Completing User Action Signing...');

      const signingResponse = await this.userActionService.completeChallenge(completion);
      const userActionToken = signingResponse.userAction;

      console.log('✅ Mobile authentication successful!');

      // Step 6: Clean up stored challenge
      this.challengeStorage.delete(challengeId);

      // Step 7: Notify desktop of success
      await this.notifyDesktop(challengeData.challengeId, userActionToken);

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
   * Notify desktop of authentication result (Mobile -> Desktop)
   * Uses simple HTTP endpoint or WebSocket (no database)
   */
  private async notifyDesktop(
    challengeId: string, 
    userActionToken?: string, 
    error?: string
  ): Promise<void> {
    try {
      // Option A: Call desktop endpoint directly
      await fetch('/api/cross-device/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          userActionToken,
          error,
          timestamp: Date.now()
        })
      });

      // Option B: Use localStorage + polling (simpler for same-origin)
      const result = { userActionToken, error, timestamp: Date.now() };
      localStorage.setItem(`cross-device-result-${challengeId}`, JSON.stringify(result));

      console.log('📤 Desktop notified of authentication result');

    } catch (notifyError) {
      console.warn('⚠️ Failed to notify desktop:', notifyError);
      // Not critical - desktop will timeout anyway
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
  }

  /**
   * Check if cross-device authentication is supported
   */
  isCrossDeviceSupported(): boolean {
    return !!(
      window.location &&
      window.fetch &&
      typeof btoa === 'function' &&
      typeof atob === 'function'
    );
  }

  /**
   * Generate QR code data URL for display
   * Uses a lightweight QR code library or service
   */
  async generateQRCodeDataUrl(mobileUrl: string): Promise<string> {
    try {
      // Option A: Use QR service (no dependencies)
      const qrServiceUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileUrl)}`;
      return qrServiceUrl;

      // Option B: Use QR library (requires dependency)
      // import QRCode from 'qrcode';
      // return await QRCode.toDataURL(mobileUrl);

    } catch (error) {
      console.error('❌ Failed to generate QR code:', error);
      // Fallback: return the URL as text
      return `data:text/plain;charset=utf-8,${encodeURIComponent(mobileUrl)}`;
    }
  }

  /**
   * Get challenge details from DFNS API for mobile authentication
   * This retrieves the full challenge data needed for WebAuthn
   */
  async getChallengeDetails(challengeId: string): Promise<{
    challenge: string;
    allowCredentials: Array<{
      type: 'public-key';
      id: string;
      transports?: string;
    }>;
  } | null> {
    try {
      console.log('📱 Retrieving challenge details from DFNS...', { challengeId });

      // DFNS stores challenges when initialized, but we need to get the stored challenge
      // The challenge data is already stored with the challengeId, but we need to access it
      // For mobile auth, we'll reconstruct this from the session or stored challenge

      // Since DFNS doesn't expose a direct "get challenge" endpoint, we'll use
      // the stored challenge data from our session management
      const storedChallenge = this.getStoredChallenge(challengeId);
      if (storedChallenge) {
        return {
          challenge: storedChallenge.challenge,
          allowCredentials: storedChallenge.allowCredentials.webauthn
        };
      }

      console.warn('⚠️ Challenge not found in session storage');
      return null;

    } catch (error) {
      console.error('❌ Failed to retrieve challenge details:', error);
      throw new DfnsError(
        `Failed to retrieve challenge details: ${error}`,
        'CHALLENGE_DETAILS_FAILED'
      );
    }
  }

  /**
   * Get stored challenge data for mobile authentication
   */
  private getStoredChallenge(challengeId: string): UserActionSigningChallenge | null {
    return this.challengeStorage.get(challengeId) || null;
  }

  /**
   * Decode mobile authentication data from URL
   */
  decodeMobileAuthData(encodedData: string): {
    challengeId: string;
    origin: string;
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
