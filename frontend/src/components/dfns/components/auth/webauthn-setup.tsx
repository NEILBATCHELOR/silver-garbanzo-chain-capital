/**
 * WebAuthn Credential Setup Component (DFNS API + Local Storage)
 * 
 * Creates WebAuthn credentials via DFNS API for User Action Signing
 * Stores credential metadata in local webauthn_credentials table for wallet association
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, 
  AlertCircle, 
  Fingerprint, 
  Key, 
  Shield, 
  Loader2,
  Info,
  Plus,
  Star,
  Trash2,
  Laptop,
  Smartphone,
  Monitor
} from 'lucide-react';
import { webAuthnService, WebAuthnService } from '@/services/dfns/webAuthnService';
import type { 
  WebAuthnCredential, 
  WebAuthnCredentialSummary,
  WalletCredentialSummary 
} from '@/types/dfns/webauthn';

interface WebAuthnSetupProps {
  wallet_id?: string; // Optional wallet ID - if not provided, shows all wallets
  onCredentialCreated?: (credential: WebAuthnCredential) => void;
  onCredentialDeleted?: (credential_id: string) => void;
  className?: string;
}

export function WebAuthnSetup({ 
  wallet_id, 
  onCredentialCreated, 
  onCredentialDeleted,
  className 
}: WebAuthnSetupProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredentialSummary[]>([]);
  const [walletSummary, setWalletSummary] = useState<WalletCredentialSummary[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallet_id || '');
  const [credentialName, setCredentialName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check WebAuthn support and load existing credentials
  useEffect(() => {
    const initializeSetup = async () => {
      try {
        setIsInitializing(true);
        
        // Check WebAuthn support
        const supported = WebAuthnService.isSupported();
        setIsSupported(supported);
        
        if (!supported) {
          setError('WebAuthn is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.');
          return;
        }

        // Load credentials and wallet summary
        await loadCredentials();
        
        // Set default credential name
        setCredentialName(`${WebAuthnService.detectDeviceName()} ${new Date().toLocaleDateString()}`);
        
      } catch (error) {
        console.error('Failed to initialize WebAuthn setup:', error);
        setError(`Failed to initialize: ${error}`);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSetup();
  }, [wallet_id]);

  /**
   * Load credentials for display
   */
  const loadCredentials = async () => {
    try {
      if (wallet_id) {
        // Load credentials for specific wallet
        const credentialSummary = await webAuthnService.getCredentialSummary(wallet_id);
        setCredentials(credentialSummary);
      } else {
        // Load wallet summary for all wallets
        const summary = await webAuthnService.getWalletCredentialSummary();
        setWalletSummary(summary);
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  /**
   * Handle credential creation
   */
  const handleCreateCredential = async () => {
    if (!isSupported) {
      setError('WebAuthn is not supported in this browser');
      return;
    }

    const targetWalletId = wallet_id || selectedWalletId;
    if (!targetWalletId) {
      setError('Please select a wallet for the credential');
      return;
    }

    if (!credentialName.trim()) {
      setError('Please enter a credential name');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create WebAuthn credential
      console.log('🔐 Creating WebAuthn credential for wallet:', targetWalletId);
      
      const newCredential = await webAuthnService.createCredential({
        wallet_id: targetWalletId,
        device_name: credentialName.trim(),
        is_primary: credentials.length === 0, // Make primary if it's the first credential
      }, {
        validateWallet: true,
        checkExistingCredentials: true,
        syncToDatabase: true,
      });

      // Reload credentials
      await loadCredentials();

      // Success feedback
      setSuccess(`✅ DFNS WebAuthn credential "${credentialName}" created successfully for User Action Signing!`);
      setCredentialName(`${WebAuthnService.detectDeviceName()} ${new Date().toLocaleDateString()}`);
      
      // Notify parent component
      if (onCredentialCreated) {
        onCredentialCreated(newCredential);
      }

      console.log('🎉 WebAuthn credential setup completed:', newCredential);

    } catch (error) {
      console.error('❌ Failed to create WebAuthn credential:', error);
      
      // Provide specific error messages
      let errorMessage = `Failed to create credential: ${error}`;
      
      if (error instanceof Error) {
        if (error.message.includes('User cancelled') || error.message.includes('cancelled')) {
          errorMessage = 'WebAuthn registration was cancelled. Please try again and approve the credential creation.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'WebAuthn registration timed out. Please try again and respond to the prompt quickly.';
        } else if (error.message.includes('not supported')) {
          errorMessage = 'WebAuthn is not supported or enabled on this device. Please use a compatible browser and device.';
        } else if (error.message.includes('wallet')) {
          errorMessage = 'Wallet not found. Please ensure the wallet exists and try again.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle credential deletion
   */
  const handleDeleteCredential = async (credential: WebAuthnCredentialSummary) => {
    if (!confirm(`Are you sure you want to delete credential "${credential.device_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await webAuthnService.deleteCredential(credential.id);
      
      // Reload credentials
      await loadCredentials();
      
      setSuccess(`Credential "${credential.device_name}" deleted successfully.`);
      
      // Notify parent component
      if (onCredentialDeleted) {
        onCredentialDeleted(credential.id);
      }
    } catch (error) {
      setError(`Failed to delete credential: ${error}`);
    }
  };

  /**
   * Handle setting credential as primary
   */
  const handleSetPrimary = async (credential: WebAuthnCredentialSummary) => {
    try {
      await webAuthnService.setPrimaryCredential(credential.id);
      
      // Reload credentials
      await loadCredentials();
      
      setSuccess(`Credential "${credential.device_name}" set as primary.`);
    } catch (error) {
      setError(`Failed to set primary credential: ${error}`);
    }
  };

  /**
   * Get device icon based on platform
   */
  const getDeviceIcon = (platform?: string) => {
    switch (platform) {
      case 'ios':
      case 'android':
        return <Smartphone className="h-4 w-4" />;
      case 'macos':
      case 'windows':
      case 'linux':
        return <Laptop className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (isInitializing) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Initializing WebAuthn setup...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* WebAuthn Support Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>WebAuthn Credential Setup</span>
          </CardTitle>
          <CardDescription>
            Set up DFNS WebAuthn credentials for User Action Signing. Credentials are created via DFNS API and associated with specific wallets for enhanced security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            {isSupported ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-700">WebAuthn is supported in this browser</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-700">WebAuthn is not supported in this browser</span>
              </>
            )}
          </div>

          {!isSupported && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>WebAuthn Not Supported</AlertTitle>
              <AlertDescription>
                Please use a modern browser (Chrome, Firefox, Safari, or Edge) with WebAuthn support.
                WebAuthn may also need to be enabled in your browser settings.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Wallet Summary (if no specific wallet) */}
      {!wallet_id && walletSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Wallet Credentials Overview</span>
            </CardTitle>
            <CardDescription>
              DFNS WebAuthn credentials across all your wallets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {walletSummary.map((wallet) => (
                <div key={wallet.wallet_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Fingerprint className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium">Wallet {wallet.wallet_id.slice(0, 8)}...</div>
                      <div className="text-sm text-muted-foreground">
                        {wallet.credential_count} credential{wallet.credential_count !== 1 ? 's' : ''}
                        {wallet.primary_credential && (
                          <> • Primary: {wallet.primary_credential.device_name}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {wallet.credential_count} credential{wallet.credential_count !== 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Credentials (for specific wallet) */}
      {wallet_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Wallet Credentials</span>
              <Badge variant="secondary">{credentials.length}</Badge>
            </CardTitle>
            <CardDescription>
              DFNS WebAuthn credentials for this wallet (for User Action Signing)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {credentials.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Fingerprint className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No WebAuthn credentials registered for this wallet</p>
                <p className="text-sm">Create your first credential below to enable secure operations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {credentials.map((credential) => (
                  <div key={credential.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getDeviceIcon(credential.platform)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{credential.device_name || 'Unnamed Credential'}</span>
                          {credential.is_primary && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {credential.platform} • Created {new Date(credential.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {credential.is_primary ? (
                        <Badge variant="default">Primary</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(credential)}
                        >
                          Set Primary
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCredential(credential)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create New Credential */}
      {isSupported && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New Credential</span>
            </CardTitle>
            <CardDescription>
              Register a new DFNS WebAuthn credential for User Action Signing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wallet Selection (if no specific wallet) */}
            {!wallet_id && walletSummary.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="walletSelect">Wallet</Label>
                <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a wallet for this credential" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletSummary.map((wallet) => (
                      <SelectItem key={wallet.wallet_id} value={wallet.wallet_id}>
                        Wallet {wallet.wallet_id.slice(0, 8)}... ({wallet.credential_count} credential{wallet.credential_count !== 1 ? 's' : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="credentialName">Credential Name</Label>
              <Input
                id="credentialName"
                value={credentialName}
                onChange={(e) => setCredentialName(e.target.value)}
                placeholder="e.g., My MacBook Touch ID"
                disabled={isLoading}
              />
            </div>

            <Button
              onClick={handleCreateCredential}
              disabled={!isSupported || isLoading || !credentialName.trim() || (!wallet_id && !selectedWalletId)}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Credential...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Create DFNS WebAuthn Credential
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Success</AlertTitle>
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use DFNS WebAuthn Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p><strong>1. Select Wallet:</strong> Choose which wallet the DFNS credential should protect</p>
            <p><strong>2. Create Credential:</strong> Click "Create DFNS WebAuthn Credential" and follow the browser prompts</p>
            <p><strong>3. User Action Signing:</strong> Use credentials for DFNS User Action Signing on sensitive operations</p>
            <p><strong>4. Primary Credential:</strong> Set one credential as primary for default wallet authentication</p>
          </div>
          
          <Separator />
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Note:</strong> These are DFNS WebAuthn credentials created via DFNS API for User Action Signing. Each wallet can have multiple credentials for different devices. The credentials are stored in DFNS and metadata is cached locally for quick wallet association.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WebAuthnSetup;