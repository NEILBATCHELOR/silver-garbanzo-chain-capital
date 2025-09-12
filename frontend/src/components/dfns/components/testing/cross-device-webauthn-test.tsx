import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TestTube, 
  QrCode, 
  CheckCircle, 
  AlertTriangle,
  Smartphone,
  Monitor,
  Zap
} from 'lucide-react';
import { CrossDeviceAuthDialog } from '@/components/dfns/components/dialogs/cross-device-auth-dialog';
import { UserActionSigningRequest } from '@/services/dfns/userActionSigningService';

/**
 * Cross-Device WebAuthn Test Component
 * 
 * Test the stateless cross-device WebAuthn implementation with DFNS integration
 */
export function CrossDeviceWebAuthnTest() {
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    userActionToken?: string;
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Test wallet creation request (common use case)
  const testWalletCreationRequest: UserActionSigningRequest = {
    userActionPayload: JSON.stringify({
      network: 'Ethereum',
      name: 'Test Wallet - Cross Device Auth'
    }),
    userActionHttpMethod: 'POST',
    userActionHttpPath: '/wallets'
  };

  // Test transfer request
  const testTransferRequest: UserActionSigningRequest = {
    userActionPayload: JSON.stringify({
      walletId: 'test-wallet-id',
      to: '0x742d35Cc6634C0532925a3b8D',
      amount: '0.001',
      asset: 'ETH'
    }),
    userActionHttpMethod: 'POST',
    userActionHttpPath: '/wallets/test-wallet-id/transfers'
  };

  const handleStartTest = (testType: 'wallet' | 'transfer') => {
    setTestResult(null);
    setIsLoading(true);
    setShowQRDialog(true);
  };

  const handleAuthComplete = (userActionToken: string) => {
    console.log('✅ Cross-device authentication completed!', { userActionToken });
    
    setTestResult({
      success: true,
      message: 'Cross-device WebAuthn authentication completed successfully!',
      userActionToken: userActionToken.substring(0, 20) + '...' // Truncate for display
    });
    
    setShowQRDialog(false);
    setIsLoading(false);
  };

  const handleAuthError = (error: string) => {
    console.error('❌ Cross-device authentication failed:', error);
    
    setTestResult({
      success: false,
      message: 'Cross-device authentication failed',
      error
    });
    
    setShowQRDialog(false);
    setIsLoading(false);
  };

  const handleDialogClose = () => {
    setShowQRDialog(false);
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-6 w-6 text-blue-600" />
            <span>DFNS Cross-Device WebAuthn Test</span>
            <Badge variant="secondary">Stateless Implementation</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Test Description */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium mb-2 text-blue-900">How This Works</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <div className="flex items-center space-x-2">
                <Monitor className="h-4 w-4" />
                <span><strong>Desktop:</strong> Generates QR code with DFNS challenge</span>
              </div>
              <div className="flex items-center space-x-2">
                <QrCode className="h-4 w-4" />
                <span><strong>QR Code:</strong> Contains challenge ID and mobile URL</span>
              </div>
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4" />
                <span><strong>Mobile:</strong> Scans QR, performs WebAuthn, notifies desktop</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span><strong>Result:</strong> Desktop receives User Action Token for DFNS operations</span>
              </div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Wallet Creation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Test cross-device WebAuthn for creating a new wallet (most common use case)
                </p>
                <Button
                  onClick={() => handleStartTest('wallet')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Asset Transfer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Test cross-device WebAuthn for asset transfers (high-security operation)
                </p>
                <Button
                  onClick={() => handleStartTest('transfer')}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert className={`border-2 ${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center space-x-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <div className="flex-1">
                  <AlertDescription className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                    <div className="space-y-1">
                      <p className="font-medium">{testResult.message}</p>
                      {testResult.success && testResult.userActionToken && (
                        <p className="text-xs">
                          <span className="font-medium">User Action Token:</span> {testResult.userActionToken}
                        </p>
                      )}
                      {testResult.error && (
                        <p className="text-xs">
                          <span className="font-medium">Error:</span> {testResult.error}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Implementation Details */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-lg">Implementation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">✅ Features Implemented</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Stateless architecture (no database)</li>
                    <li>• DFNS API integration</li>
                    <li>• QR code generation</li>
                    <li>• Mobile WebAuthn authentication</li>
                    <li>• Cross-device communication</li>
                    <li>• User Action Token generation</li>
                    <li>• 5-minute session expiration</li>
                    <li>• Multiple communication channels</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">🔧 Technical Stack</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• DFNS User Action Signing</li>
                    <li>• WebAuthn Credential Assertion</li>
                    <li>• BroadcastChannel API</li>
                    <li>• localStorage communication</li>
                    <li>• postMessage fallback</li>
                    <li>• In-memory challenge cache</li>
                    <li>• QR code service integration</li>
                    <li>• Promise-based waiting</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Testing Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Click "Generate QR Code" to start a test</li>
                <li>A dialog will appear with a QR code</li>
                <li>Scan the QR code with your mobile device</li>
                <li>Complete the WebAuthn authentication on mobile</li>
                <li>Return to this page to see the result</li>
                <li>The User Action Token can be used for DFNS operations</li>
              </ol>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Cross-Device Auth Dialog */}
      <CrossDeviceAuthDialog
        open={showQRDialog}
        onClose={handleDialogClose}
        userActionRequest={testWalletCreationRequest}
        onAuthComplete={handleAuthComplete}
        onError={handleAuthError}
      />
    </div>
  );
}