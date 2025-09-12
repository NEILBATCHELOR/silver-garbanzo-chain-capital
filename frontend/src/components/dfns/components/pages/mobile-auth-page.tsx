import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Fingerprint,
  Shield,
  Clock,
  Wifi
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DfnsCrossDeviceWebAuthnService } from '@/services/dfns/crossDeviceWebAuthnService';
import { initializeDfnsService } from '@/services/dfns';

/**
 * Mobile Authentication Page
 * 
 * Handles WebAuthn authentication when user scans QR code on mobile device.
 * This page runs on mobile browser and communicates back to desktop.
 * UPDATED: Full DFNS integration with improved error handling
 */
export function MobileAuthPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ready' | 'authenticating' | 'success' | 'error' | 'expired'>('loading');
  const [error, setError] = useState<string>('');
  const [authData, setAuthData] = useState<{
    challengeId: string;
    origin: string;
    timestamp?: number;
  } | null>(null);
  const [crossDeviceService, setCrossDeviceService] = useState<DfnsCrossDeviceWebAuthnService | null>(null);
  const [challengeAge, setChallengeAge] = useState<number>(0);
  
  // Initialize DFNS service
  useEffect(() => {
    const initService = async () => {
      try {
        console.log('📱 Initializing DFNS service for mobile authentication...');
        const dfnsService = await initializeDfnsService();
        const userActionService = dfnsService.getUserActionSigningService();
        const service = new DfnsCrossDeviceWebAuthnService(userActionService);
        setCrossDeviceService(service);
        console.log('✅ DFNS service initialized successfully');
      } catch (err: any) {
        console.error('❌ Failed to initialize DFNS service:', err);
        setStatus('error');
        setError('Failed to initialize authentication service. Please ensure you have a stable internet connection.');
      }
    };

    initService();
  }, []);

  // Parse authentication data from URL
  useEffect(() => {
    if (!crossDeviceService) return;

    const encodedData = searchParams.get('d');
    if (!encodedData) {
      setStatus('error');
      setError('Invalid authentication URL - missing data parameter. Please scan a new QR code.');
      return;
    }

    try {
      const decoded = crossDeviceService.decodeMobileAuthData(encodedData);
      
      if (!decoded) {
        throw new Error('Failed to decode authentication data');
      }

      // Check if challenge is too old (more than 5 minutes)
      const now = Date.now();
      const age = decoded.timestamp ? now - decoded.timestamp : 0;
      setChallengeAge(age);

      if (age > 300000) { // 5 minutes
        setStatus('expired');
        setError('This authentication link has expired. Please scan a new QR code.');
        return;
      }

      setAuthData(decoded);
      setStatus('ready');
      
      console.log('✅ Authentication data parsed:', {
        challengeId: decoded.challengeId,
        origin: decoded.origin,
        age: Math.round(age / 1000) + 's'
      });
      
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to parse authentication data. Please scan a new QR code.');
    }
  }, [searchParams, crossDeviceService]);

  // Update challenge age every second
  useEffect(() => {
    if (!authData?.timestamp || status !== 'ready') return;

    const interval = setInterval(() => {
      const age = Date.now() - authData.timestamp!;
      setChallengeAge(age);

      if (age > 300000) { // 5 minutes
        setStatus('expired');
        setError('This authentication link has expired. Please scan a new QR code.');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [authData, status]);

  // Start WebAuthn authentication
  const handleAuthenticate = async () => {
    if (!authData || !crossDeviceService) return;

    try {
      setStatus('authenticating');
      setError('');
      
      console.log('📱 Starting mobile WebAuthn authentication...');

      // Check WebAuthn support with detailed diagnostics
      const webauthnSupported = !!(
        window.PublicKeyCredential &&
        navigator.credentials &&
        navigator.credentials.get
      );

      if (!webauthnSupported) {
        throw new Error('WebAuthn is not supported on this device. Please use a device with Touch ID, Face ID, or Windows Hello.');
      }

      // Check for platform authenticator
      let hasPlatformAuth = false;
      if ('isUserVerifyingPlatformAuthenticatorAvailable' in PublicKeyCredential) {
        try {
          hasPlatformAuth = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (e) {
          console.warn('Could not check platform authenticator availability:', e);
        }
      }

      if (!hasPlatformAuth) {
        console.warn('⚠️ Platform authenticator may not be available');
      }

      // Complete mobile authentication with full DFNS integration
      console.log('🔐 Calling DFNS cross-device authentication...');
      const result = await crossDeviceService.completeMobileAuth(authData.challengeId, authData.origin);
      
      if (result.success) {
        setStatus('success');
        console.log('✅ Mobile authentication completed successfully');
        
        // Optional: Auto-close tab after success (with delay)
        setTimeout(() => {
          if (confirm('Authentication successful! Close this tab?')) {
            window.close();
          }
        }, 3000);
      } else {
        setStatus('error');
        setError(result.error || 'Authentication failed for unknown reasons');
        console.error('❌ Mobile authentication failed:', result.error);
      }

    } catch (err: any) {
      setStatus('error');
      
      let errorMessage = err.message;
      
      // Enhanced error handling for WebAuthn-specific errors
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Authentication was cancelled. Please try again and complete the biometric prompt.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Security error - this usually means the connection is not secure. Ensure you\'re using HTTPS.';
      } else if (err.name === 'NetworkError') {
        errorMessage = 'Network error - check your internet connection and try again.';
      } else if (err.name === 'TimeoutError') {
        errorMessage = 'Authentication timed out. Please try again and complete the prompt quickly.';
      } else if (err.name === 'InvalidStateError') {
        errorMessage = 'Invalid authentication state. This may happen if you don\'t have any registered credentials.';
      } else if (err.message.includes('CHALLENGE_NOT_FOUND')) {
        errorMessage = 'Authentication session expired. Please scan a new QR code from your desktop.';
      } else if (err.message.includes('NO_WEBAUTHN_CREDENTIALS')) {
        errorMessage = 'No authentication credentials found. Please set up biometric authentication first.';
      }
      
      setError(errorMessage);
      console.error('❌ Mobile authentication error:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
    }
  };

  // Check if device supports WebAuthn with detailed diagnostics
  const checkWebAuthnSupport = (): {
    supported: boolean;
    features: string[];
    recommendations: string[];
    warnings: string[];
  } => {
    const features: string[] = [];
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Basic WebAuthn support
    const hasWebAuthn = !!(window.PublicKeyCredential && navigator.credentials);
    if (hasWebAuthn) {
      features.push('WebAuthn API available');
    } else {
      recommendations.push('Use a modern browser (Chrome 67+, Safari 14+, Firefox 60+, Edge 18+)');
      return { supported: false, features, recommendations, warnings };
    }

    // Platform authenticator check
    if ('isUserVerifyingPlatformAuthenticatorAvailable' in PublicKeyCredential) {
      features.push('Platform authenticator support detected');
    } else {
      warnings.push('Platform authenticator availability cannot be verified');
    }

    // HTTPS requirement
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
      features.push('Secure context (HTTPS)');
    } else {
      recommendations.push('Authentication requires HTTPS connection');
      return { supported: false, features, recommendations, warnings };
    }

    // Browser-specific checks
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      features.push('Safari WebAuthn support');
      if (userAgent.includes('mobile')) {
        features.push('iOS biometric authentication available');
      }
    } else if (userAgent.includes('chrome')) {
      features.push('Chrome WebAuthn support');
    } else if (userAgent.includes('firefox')) {
      features.push('Firefox WebAuthn support');
    }

    return { 
      supported: true, 
      features, 
      recommendations: recommendations.length ? recommendations : ['Your device is ready for authentication'],
      warnings
    };
  };

  const webauthnStatus = checkWebAuthnSupport();

  // Format time remaining
  const formatTimeRemaining = (): string => {
    const remaining = Math.max(0, 300000 - challengeAge); // 5 minutes
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="text-center space-y-2">
              <p className="font-medium">Initializing authentication...</p>
              <p className="text-sm text-muted-foreground">Connecting to DFNS service</p>
            </div>
          </div>
        );

      case 'ready':
        return (
          <div className="space-y-6">
            {/* Timer */}
            <div className="flex items-center justify-center space-x-2 text-sm bg-blue-50 rounded-lg p-3">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700">
                Expires in <span className="font-mono font-medium">{formatTimeRemaining()}</span>
              </span>
            </div>

            {/* Device Status */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">Device Security Check</h3>
              </div>
              
              <div className="space-y-2">
                {webauthnStatus.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    <span>{feature}</span>
                  </div>
                ))}
                
                {webauthnStatus.warnings.map((warning, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-orange-700">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{warning}</span>
                  </div>
                ))}
                
                {webauthnStatus.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-blue-700">
                    <Wifi className="h-3 w-3" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Authentication Instructions */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center space-x-2">
                <Fingerprint className="h-5 w-5 text-blue-600" />
                <span>Ready to Authenticate</span>
              </h3>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="space-y-2 text-sm text-blue-700">
                  <p className="font-medium">What happens next:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Tap "Authenticate" to begin</li>
                    <li>Complete biometric authentication (Touch ID, Face ID, or PIN)</li>
                    <li>Your desktop browser will be notified automatically</li>
                    <li>You can close this tab after seeing success</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Challenge Info */}
            {authData && (
              <div className="text-xs text-muted-foreground bg-gray-50 rounded p-3 space-y-1">
                <p><span className="font-medium">Challenge ID:</span> {authData.challengeId.substring(0, 12)}...</p>
                <p><span className="font-medium">Desktop Origin:</span> {authData.origin}</p>
                <p><span className="font-medium">Created:</span> {Math.round(challengeAge / 1000)}s ago</p>
              </div>
            )}

            {/* Authenticate Button */}
            <Button 
              onClick={handleAuthenticate}
              disabled={!webauthnStatus.supported}
              className="w-full"
              size="lg"
            >
              <Fingerprint className="h-4 w-4 mr-2" />
              Authenticate with {
                navigator.platform.includes('iPhone') || navigator.platform.includes('iPad') 
                  ? 'Touch ID / Face ID' 
                  : navigator.platform.includes('Mac') 
                    ? 'Touch ID' 
                    : 'Biometric Authentication'
              }
            </Button>

            {!webauthnStatus.supported && (
              <div className="text-sm text-muted-foreground bg-yellow-50 rounded p-3">
                <p className="font-medium text-yellow-800">Authentication not available</p>
                <p className="text-yellow-700">Your device or browser doesn't support the required authentication features.</p>
              </div>
            )}
          </div>
        );

      case 'authenticating':
        return (
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
              <Fingerprint className="h-8 w-8 absolute top-4 left-4 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-medium text-lg">Authenticating...</h3>
              <p className="text-muted-foreground">
                Please complete the biometric authentication prompt
              </p>
              <p className="text-sm text-blue-600">
                This may take up to 30 seconds to complete
              </p>
            </div>
            
            {/* Progress indicator */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-6">
            <CheckCircle className="h-16 w-16 text-green-600" />
            <div className="text-center space-y-3">
              <h3 className="font-medium text-xl text-green-900">Authentication Successful!</h3>
              <p className="text-green-700">
                Your desktop has been notified and the operation will continue automatically.
              </p>
              <p className="text-sm text-muted-foreground">
                You can safely close this tab now.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                onClick={() => window.close()}
                className="bg-green-600 hover:bg-green-700"
              >
                Close Tab
              </Button>
              <Button 
                onClick={() => {
                  setStatus('ready');
                  setError('');
                }}
                variant="outline"
              >
                Authenticate Again
              </Button>
            </div>
          </div>
        );

      case 'expired':
        return (
          <div className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                This authentication link has expired. Authentication links are valid for 5 minutes.
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-muted-foreground bg-gray-50 rounded p-3">
              <p className="font-medium mb-2">To continue:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Return to your desktop browser</li>
                <li>Generate a new QR code</li>
                <li>Scan the new code with this device</li>
              </ol>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {!webauthnStatus.supported ? (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">Device requirements:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Modern browser (Chrome 67+, Safari 14+, Firefox 60+)</li>
                    <li>Biometric authentication enabled (Touch ID, Face ID, Windows Hello)</li>
                    <li>Secure connection (HTTPS)</li>
                  </ul>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">Troubleshooting:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Ensure biometric authentication is enabled on your device</li>
                    <li>Try refreshing this page</li>
                    <li>Generate a new QR code from your desktop</li>
                    <li>Check your internet connection</li>
                  </ul>
                </div>
              )}
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    setStatus('ready');
                    setError('');
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={!webauthnStatus.supported}
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1"
                >
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Smartphone className="h-6 w-6" />
              <span>Mobile Authentication</span>
            </CardTitle>
            <p className="text-blue-100 text-sm">DFNS Secure WebAuthn</p>
          </CardHeader>
          <CardContent className="pt-6">
            {renderContent()}
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            Secured by DFNS WebAuthn • {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}