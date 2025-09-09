import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield,
  Key,
  Loader2,
  AlertCircle,
  CheckCircle,
  Fingerprint,
  Lock,
  Zap,
  Info,
  Clock
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";

interface UserActionData {
  actionType: string;
  actionPayload: any;
  title?: string;
  description?: string;
  risk?: 'low' | 'medium' | 'high';
}

interface UserActionSigningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionData: UserActionData | null;
  onComplete?: (userActionToken: string) => void;
  onCancel?: () => void;
}

/**
 * User Action Signing Dialog
 * Generic dialog for prompting User Action Signing for sensitive operations
 */
export function UserActionSigning({ 
  open, 
  onOpenChange, 
  actionData, 
  onComplete, 
  onCancel 
}: UserActionSigningProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [stage, setStage] = useState<'prompt' | 'signing' | 'verifying' | 'complete'>('prompt');
  const [timeoutCounter, setTimeoutCounter] = useState(60);

  // DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Reset dialog state when opened/closed
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
      setStage('prompt');
      setTimeoutCounter(60);
    }
  }, [open]);

  // Countdown timer for WebAuthn timeout
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (stage === 'signing' && timeoutCounter > 0) {
      timer = setTimeout(() => {
        setTimeoutCounter(prev => prev - 1);
      }, 1000);
    } else if (stage === 'signing' && timeoutCounter === 0) {
      setError('Authentication timed out. Please try again.');
      setStage('prompt');
      setTimeoutCounter(60);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [stage, timeoutCounter]);

  const handleStartSigning = async () => {
    if (!dfnsService || !actionData) return;

    try {
      setLoading(true);
      setError(null);
      setStage('signing');

      const userActionService = dfnsService.getUserActionService();

      // Complete the User Action Signing flow
      const userActionToken = await userActionService.signUserAction(
        actionData.actionType,
        actionData.actionPayload,
        { persistToDb: true }
      );

      setStage('complete');
      setSuccess(true);

      // Call completion callback
      if (onComplete) {
        onComplete(userActionToken);
      }

      // Auto-close after brief delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      console.error('User Action Signing failed:', error);
      setError(`Authentication failed: ${error}`);
      setStage('prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  const getActionTitle = (): string => {
    if (actionData?.title) return actionData.title;
    
    switch (actionData?.actionType) {
      case 'CreateWallet': return 'Create Wallet';
      case 'DeleteWallet': return 'Delete Wallet';
      case 'Transfer': return 'Asset Transfer';
      case 'CreatePermission': return 'Create Permission';
      case 'AssignPermission': return 'Assign Permission';
      case 'CreateCredential': return 'Create Credential';
      case 'DeactivateCredential': return 'Deactivate Credential';
      case 'CreatePersonalAccessToken': return 'Create Access Token';
      case 'DelegateKey': return 'Delegate Key';
      default: return 'Secure Operation';
    }
  };

  const getActionDescription = (): string => {
    if (actionData?.description) return actionData.description;
    
    switch (actionData?.actionType) {
      case 'CreateWallet': 
        return 'Creating a new wallet requires cryptographic verification to ensure security.';
      case 'DeleteWallet': 
        return 'Deleting a wallet permanently removes access. This action cannot be undone.';
      case 'Transfer': 
        return 'Asset transfers require verification to prevent unauthorized transactions.';
      case 'CreatePermission': 
        return 'Creating permissions affects system access controls.';
      case 'AssignPermission': 
        return 'Permission assignments grant access to sensitive operations.';
      default: 
        return 'This operation requires cryptographic verification for security.';
    }
  };

  const getRiskLevel = (): 'low' | 'medium' | 'high' => {
    if (actionData?.risk) return actionData.risk;
    
    switch (actionData?.actionType) {
      case 'CreateWallet':
      case 'CreateCredential':
      case 'CreatePermission':
        return 'medium';
      case 'DeleteWallet':
      case 'Transfer':
      case 'DelegateKey':
        return 'high';
      default:
        return 'low';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const formatActionPayload = (payload: any): string => {
    try {
      // Remove sensitive fields
      const sanitized = { ...payload };
      delete sanitized.privateKey;
      delete sanitized.signature;
      delete sanitized.credentials;
      
      return JSON.stringify(sanitized, null, 2);
    } catch {
      return 'Unable to display payload';
    }
  };

  const renderStageContent = () => {
    switch (stage) {
      case 'prompt':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">{getActionTitle()}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {getActionDescription()}
              </p>
            </div>

            <div className={cn(
              "p-3 rounded-lg border",
              getRiskColor(getRiskLevel())
            )}>
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Security Level: {getRiskLevel().toUpperCase()}</span>
              </div>
              <p className="text-sm">
                This operation requires User Action Signing with your security key or biometric authentication.
              </p>
            </div>

            {actionData?.actionPayload && (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  View operation details
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <pre className="text-xs overflow-auto max-h-32">
                    {formatActionPayload(actionData.actionPayload)}
                  </pre>
                </div>
              </details>
            )}

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Your security key will prompt for authentication</span>
            </div>
          </div>
        );

      case 'signing':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Fingerprint className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Authenticate with your security key</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Please follow the prompts on your security device
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Time remaining: {timeoutCounter}s</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">
                Touch your security key or use biometric authentication
              </p>
            </div>
          </div>
        );

      case 'verifying':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Key className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Verifying signature...</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Processing your authentication
              </p>
            </div>
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-600">Authentication Successful</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your operation has been authorized and is being processed
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!actionData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>User Action Signing</span>
          </DialogTitle>
          <DialogDescription>
            Secure authentication required for sensitive operations
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="py-4">
          {renderStageContent()}
        </div>

        {stage === 'prompt' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleStartSigning} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Authenticate
                </>
              )}
            </Button>
          </DialogFooter>
        )}

        {stage === 'signing' && (
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button disabled>
              <Fingerprint className="h-4 w-4 mr-2" />
              Authenticating...
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
