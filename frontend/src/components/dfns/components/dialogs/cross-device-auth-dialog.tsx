import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  QrCode, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
  Timer
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DfnsCrossDeviceWebAuthnService, CrossDeviceSession, CrossDeviceAuthResult } from '@/services/dfns/crossDeviceWebAuthnService';
import { UserActionSigningRequest } from '@/services/dfns/userActionSigningService';
import { initializeDfnsService } from '@/services/dfns';

interface CrossDeviceAuthDialogProps {
  open: boolean;
  onClose: () => void;
  userActionRequest: UserActionSigningRequest;
  onAuthComplete: (userActionToken: string) => void;
  onError: (error: string) => void;
}

/**
 * Cross-Device WebAuthn QR Authentication Dialog
 * 
 * Shows QR code for mobile authentication without database storage.
 * Uses in-memory session management and DFNS API state.
 */
export function CrossDeviceAuthDialog({
  open,
  onClose,
  userActionRequest,
  onAuthComplete,
  onError
}: CrossDeviceAuthDialogProps) {
  const [crossDeviceService, setCrossDeviceService] = useState<DfnsCrossDeviceWebAuthnService | null>(null);
  
  const [session, setSession] = useState<CrossDeviceSession | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [status, setStatus] = useState<'initializing' | 'generating' | 'waiting' | 'success' | 'error' | 'timeout'>('initializing');
  const [error, setError] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes
  const { toast } = useToast();

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

    if (open) {
      initService();
    }
  }, [open]);

  // Generate QR code and start waiting for mobile auth
  useEffect(() => {
    if (!open || !crossDeviceService) return;

    let cleanup: () => void;

    const initializeCrossDeviceAuth = async () => {
      try {
        setStatus('generating');
        setError('');
        
        // Step 1: Generate cross-device session (no database)
        const newSession = await crossDeviceService.generateCrossDeviceAuth(userActionRequest);
        setSession(newSession);

        // Step 2: Generate QR code
        const qrUrl = await crossDeviceService.generateQRCodeDataUrl(newSession.mobileUrl);
        setQrCodeUrl(qrUrl);

        // Step 3: Start waiting for mobile authentication
        setStatus('waiting');
        
        // Start countdown timer
        const startTime = Date.now();
        const timerInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 300 - Math.floor(elapsed / 1000));
          setTimeLeft(remaining);
          
          if (remaining === 0) {
            clearInterval(timerInterval);
            setStatus('timeout');
          }
        }, 1000);

        // Wait for authentication result (in-memory promise)
        const result = await crossDeviceService.waitForMobileAuth(newSession.challengeId);
        
        clearInterval(timerInterval);
        
        if (result.success && result.userActionToken) {
          setStatus('success');
          toast({
            title: "Authentication Successful",
            description: "Mobile device authenticated successfully",
          });
          onAuthComplete(result.userActionToken);
        } else {
          setStatus('error');
          setError(result.error || 'Authentication failed');
          onError(result.error || 'Authentication failed');
        }

        cleanup = () => {
          clearInterval(timerInterval);
        };

      } catch (err: any) {
        setStatus('error');
        setError(err.message);
        onError(err.message);
        toast({
          title: "QR Generation Failed",
          description: err.message,
          variant: "destructive"
        });
      }
    };

    initializeCrossDeviceAuth();

    return () => {
      cleanup?.();
    };
  }, [open, crossDeviceService, userActionRequest]);

  // Copy mobile URL to clipboard
  const copyMobileUrl = async () => {
    if (!session) return;
    
    try {
      await navigator.clipboard.writeText(session.mobileUrl);
      toast({
        title: "URL Copied",
        description: "Mobile authentication URL copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed", 
        description: "Please copy the URL manually",
        variant: "destructive"
      });
    }
  };

  // Open mobile URL in new tab
  const openMobileUrl = () => {
    if (!session) return;
    window.open(session.mobileUrl, '_blank');
  };

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    if (!crossDeviceService) {
      return (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            Initializing cross-device authentication service...
          </AlertDescription>
        </Alert>
      );
    }

    switch (status) {
      case 'initializing':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Initializing authentication...</p>
          </div>
        );

      case 'generating':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Generating QR code...</p>
          </div>
        );

      case 'waiting':
        return (
          <div className="space-y-6">
            {/* QR Code Display */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code for Mobile Authentication" 
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Scan with your mobile device</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>Open your mobile browser and scan the QR code</li>
                <li>Authenticate using Touch ID, Face ID, or PIN</li>
                <li>Return to this window to continue</li>
              </ol>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Timer className="h-4 w-4 text-orange-500" />
              <span className="text-orange-600">Expires in {formatTime(timeLeft)}</span>
            </div>

            {/* Alternative Options */}
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Can't scan? Try these alternatives:
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyMobileUrl}
                  className="flex-1"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openMobileUrl}
                  className="flex-1"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open
                </Button>
              </div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <div className="text-center">
              <h3 className="font-medium text-green-900">Authentication Successful!</h3>
              <p className="text-sm text-green-700 mt-1">
                Your mobile device has been authenticated successfully.
              </p>
            </div>
          </div>
        );

      case 'error':
      case 'timeout':
        return (
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {status === 'timeout' 
                  ? 'Authentication timed out. Please try again.' 
                  : error || 'Authentication failed'
                }
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setStatus('initializing');
                  setError('');
                  setSession(null);
                  // Service is already initialized, just trigger re-initialization
                }}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            <span>Mobile Authentication</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {renderContent()}
        </div>

        {status !== 'generating' && status !== 'waiting' && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
