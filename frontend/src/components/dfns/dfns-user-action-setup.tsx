import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, Key, Shield, Check, X, Loader2 } from 'lucide-react';
import { initializeDfnsService } from '@/services/dfns';
import { DfnsWebAuthnService } from '@/services/dfns/dfnsWebAuthnService';
import type { DfnsCreateWalletRequest, DfnsNetwork } from '@/types/dfns/wallets';

/**
 * DFNS User Action Signing Setup Component
 * 
 * This component helps users set up User Action Signing credentials
 * for performing sensitive DFNS operations like creating wallets.
 */
export function DfnsUserActionSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [webauthnService, setWebauthnService] = useState<DfnsWebAuthnService | null>(null);
  const [status, setStatus] = useState({
    supported: false,
    platformAuthenticator: false,
    credentials: [] as any[],
    canSign: false
  });

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      const dfnsService = await initializeDfnsService();
      const credentialService = dfnsService.getCredentialService();
      const userActionService = dfnsService.getUserActionSigningService();
      
      const webauthn = new DfnsWebAuthnService(credentialService, userActionService);
      setWebauthnService(webauthn);
      
      const webauthnStatus = await webauthn.getWebAuthnStatus();
      setStatus(webauthnStatus);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize DFNS services');
    }
  };

  const createPasskey = async () => {
    if (!webauthnService) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const credential = await webauthnService.createPasskeyCredential('My DFNS Device');
      setSuccess(`✅ Passkey created successfully! Credential ID: ${credential.id}`);
      
      // Refresh status
      const webauthnStatus = await webauthnService.getWebAuthnStatus();
      setStatus(webauthnStatus);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create passkey');
    } finally {
      setIsLoading(false);
    }
  };

  const testSigning = async () => {
    if (!webauthnService || !status.canSign) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const testResult = await webauthnService.testWebAuthnSigning();
      
      if (testResult.success) {
        setSuccess(`✅ User Action Signing test successful! Used credential: ${testResult.credentialId}`);
      } else {
        setError(`❌ Signing test failed: ${testResult.error}`);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing test failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            DFNS User Action Signing Setup
          </CardTitle>
          <CardDescription>
            Set up passkeys or key credentials to enable User Action Signing for sensitive DFNS operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* WebAuthn Support Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {status.supported ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">WebAuthn Support</span>
            </div>
            
            <div className="flex items-center gap-2">
              {status.platformAuthenticator ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Platform Auth</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={status.credentials.length > 0 ? "default" : "secondary"}>
                {status.credentials.length} Credentials
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {status.canSign ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Check className="h-3 w-3 mr-1" />
                  Ready to Sign
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <X className="h-3 w-3 mr-1" />
                  Cannot Sign
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!status.canSign && status.supported && (
              <Button 
                onClick={createPasskey} 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="h-4 w-4" />
                )}
                Create Passkey
              </Button>
            )}
            
            {status.canSign && (
              <Button 
                onClick={testSigning} 
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Key className="h-4 w-4" />
                )}
                Test Signing
              </Button>
            )}
            
            <Button 
              onClick={initializeServices} 
              disabled={isLoading}
              variant="ghost"
              size="sm"
            >
              Refresh Status
            </Button>
          </div>

          {/* Status Messages */}
          {error && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          {!status.supported && (
            <Alert>
              <AlertDescription>
                <strong>WebAuthn not supported.</strong> Please use a modern browser with HTTPS or try Key Credentials instead.
              </AlertDescription>
            </Alert>
          )}
          
          {status.supported && !status.platformAuthenticator && (
            <Alert>
              <AlertDescription>
                <strong>No platform authenticator detected.</strong> You can still use external security keys or create Key Credentials.
              </AlertDescription>
            </Alert>
          )}
          
          {!status.canSign && (
            <Alert>
              <AlertDescription>
                <strong>User Action Signing not available.</strong> Create a passkey or key credential to enable sensitive DFNS operations like wallet creation.
              </AlertDescription>
            </Alert>
          )}

          {/* Existing Credentials */}
          {status.credentials.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Existing Credentials:</h4>
              <div className="space-y-1">
                {status.credentials.map((credential) => (
                  <div key={credential.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="h-4 w-4" />
                      <span className="text-sm font-mono">{credential.id.slice(0, 20)}...</span>
                    </div>
                    <Badge variant={credential.isActive ? "default" : "secondary"}>
                      {credential.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Usage example in your wallet creation component:
export function CreateWalletWithSigning() {
  const [isCreating, setIsCreating] = useState(false);
  const [webauthnService, setWebauthnService] = useState<DfnsWebAuthnService | null>(null);

  useEffect(() => {
    const initService = async () => {
      const dfnsService = await initializeDfnsService();
      const credentialService = dfnsService.getCredentialService();
      const userActionService = dfnsService.getUserActionSigningService();
      const webauthn = new DfnsWebAuthnService(credentialService, userActionService);
      setWebauthnService(webauthn);
    };
    initService();
  }, []);

  const createWalletWithSigning = async () => {
    if (!webauthnService) return;
    
    setIsCreating(true);
    
    try {
      const walletData: DfnsCreateWalletRequest = {
        name: 'My New Wallet',
        network: 'Ethereum' as DfnsNetwork
      };

      // Step 1: Sign the User Action (will prompt for biometric)
      const userActionToken = await webauthnService.signUserActionWithPasskey(
        JSON.stringify(walletData),
        'POST',
        '/wallets'
      );

      // Step 2: Create the wallet with signed token
      const dfnsService = await initializeDfnsService();
      const workingClient = dfnsService.getWorkingClient();
      const wallet = await workingClient.createWallet(walletData, userActionToken);

      console.log('✅ Wallet created successfully!', wallet);
      
    } catch (error) {
      console.error('❌ Failed to create wallet:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Wallet (with User Action Signing)</CardTitle>
        <CardDescription>
          This demonstrates creating a wallet with WebAuthn User Action Signing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={createWalletWithSigning} 
          disabled={isCreating || !webauthnService}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating Wallet...
            </>
          ) : (
            'Create Wallet'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
