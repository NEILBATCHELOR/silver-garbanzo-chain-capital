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
  Shield
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DfnsCrossDeviceWebAuthnService } from '@/services/dfns/crossDeviceWebAuthnService';
import { DfnsUserActionSigningService } from '@/services/dfns/userActionSigningService';
import { initializeDfnsService } from '@/services/dfns';

/**
 * Mobile Authentication Page
 * 
 * Handles WebAuthn authentication when user scans QR code on mobile device.
 * This page runs on mobile browser and communicates back to desktop.
 */
export function MobileAuthPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ready' | 'authenticating' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [authData, setAuthData] = useState<{
    challengeId: string;
    origin: string;
  } | null>(null);
  const [crossDeviceService, setCrossDeviceService] = useState<DfnsCrossDeviceWebAuthnService | null>(null);
  
  // Initialize DFNS service
  useEffect(() => {
    const initService = async () => {
      try {
        const dfnsService = await initializeDfnsService();
        const userActionService = dfnsService.getUserActionSigningService();
        const service = new DfnsCrossDeviceWebAuthnService(userActionService);
        setCrossDeviceService(service);
      } catch (err: any) {
        console.error('Failed to initialize DFNS service:', err);
        setStatus('error');
        setError('Failed to initialize authentication service');
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
      setError('Invalid authentication URL - missing data parameter');
      return;
    }

    try {
      const decoded = crossDeviceService.decodeMobileAuthData(encodedData);
      
      if (!decoded) {
        throw new Error('Failed to decode authentication data');
      }

      setAuthData(decoded);
      setStatus('ready');
      
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to parse authentication data');
    }
  }, [searchParams, crossDeviceService]);

  // Start WebAuthn authentication
  const handleAuthenticate = async () => {
    if (!authData || !crossDeviceService) return;

    try {
      setStatus('authenticating');
      
      // Check WebAuthn support
      const webauthnSupported = !!(
        window.PublicKeyCredential &&
        navigator.credentials &&
        navigator.credentials.get
      );

      if (!webauthnSupported) {
        throw new Error('WebAuthn is not supported on this device. Please use a device with Touch ID, Face ID, or Windows Hello.');
      }

      // Complete mobile authentication with full DFNS integration
      const result = await crossDeviceService.completeMobileAuth(authData.challengeId, authData.origin);
      
      if (result.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setError(result.error || 'Authentication failed');
      }

    } catch (err: any) {
      setStatus('error');
      setError(err.message);
      console.error('Mobile authentication failed:', err);
    }
  };

  // Check if device supports WebAuthn
  const checkWebAuthnSupport = (): {
    supported: boolean;
    features: string[];
    recommendations: string[];
  } => {
    const features: string[] = [];
    const recommendations: string[] = [];

    // Basic WebAuthn support
    const hasWebAuthn = !!(window.PublicKeyCredential && navigator.credentials);
    if (hasWebAuthn) {
      features.push('WebAuthn API available');
    } else {
      recommendations.push('Use a modern browser (Chrome, Safari, Firefox, Edge)');
      return { supported: false, features, recommendations };
    }

    // Platform authenticator (Touch ID, Face ID, etc.)
    if ('isUserVerifyingPlatformAuthenticatorAvailable' in PublicKeyCredential) {
      features.push('Platform authenticator support');
    } else {
      recommendations.push('Update your browser for best compatibility');
    }

    // HTTPS requirement
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
      features.push('Secure context (HTTPS)');
    } else {
      recommendations.push('Authentication requires HTTPS connection');
      return { supported: false, features, recommendations };
    }

    return { 
      supported: true, 
      features, 
      recommendations: recommendations.length ? recommendations : ['Your device is ready for authentication'] 
    };
  };

  const webauthnStatus = checkWebAuthnSupport();

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Loading authentication data...</p>
          </div>
        );

      case 'ready':
        return (
          <div className="space-y-6">
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
                
                {webauthnStatus.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-orange-700">
                    <AlertTriangle className="h-3 w-3" />
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
                  <p className="font-medium">When you tap "Authenticate":</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Your device will prompt for biometric authentication</li>
                    <li>Use Touch ID, Face ID, or your device PIN</li>
                    <li>The desktop will be notified automatically</li>
                    <li>You can close this tab after success</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Challenge Info */}
            {authData && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Challenge ID: {authData.challengeId.substring(0, 8)}...</p>
                <p>Desktop Origin: {authData.origin}</p>
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
              Authenticate with {navigator.platform.includes('iPhone') ? 'Touch ID' : navigator.platform.includes('Mac') ? 'Touch ID' : 'Device Security'}
            </Button>
          </div>
        );

      case 'authenticating':
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <Fingerprint className="h-6 w-6 absolute top-3 left-3 text-white" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-medium">Authenticating...</p>
              <p className="text-sm text-muted-foreground">
                Please complete the biometric authentication prompt
              </p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <div className="text-center space-y-2">
              <h3 className="font-medium text-green-900">Authentication Successful!</h3>
              <p className="text-sm text-green-700">
                Your desktop has been notified. You can now close this tab.
              </p>
            </div>
            <Button 
              onClick={() => window.close()}
              variant="outline"
              className="mt-4"
            >
              Close Tab
            </Button>
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
            
            {!webauthnStatus.supported && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Troubleshooting suggestions:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Ensure you're using a modern browser</li>
                  <li>Check that biometric authentication is enabled</li>
                  <li>Try refreshing the page</li>
                  <li>Use a different device if available</li>
                </ul>
              </div>
            )}
            
            <Button
              onClick={() => {
                setStatus('ready');
                setError('');
              }}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Smartphone className="h-6 w-6 text-blue-600" />
              <span>Mobile Authentication</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            Secured by DFNS • {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
