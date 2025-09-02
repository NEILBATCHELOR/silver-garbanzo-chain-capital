/**
 * Identity Management Component
 * 
 * Handles linking and unlinking user identities from different providers
 */

import React, { useState, useEffect } from 'react';
import { Link2, Unlink, Plus, Trash2, Shield, AlertTriangle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

import { authService } from '../services/authWrapper';
import { useAuth } from '@/infrastructure/auth/AuthProvider';
import { formatAuthError } from '../utils/authUtils';

interface UserIdentity {
  id: string;
  provider: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  identity_data: Record<string, any>;
}

interface IdentityManagementProps {
  showAddButton?: boolean;
}

const providerIcons: Record<string, React.ElementType> = {
  google: () => <div className="w-4 h-4 bg-red-500 rounded"></div>,
  github: () => <div className="w-4 h-4 bg-gray-900 rounded"></div>,
  facebook: () => <div className="w-4 h-4 bg-blue-600 rounded"></div>,
  apple: () => <div className="w-4 h-4 bg-black rounded"></div>,
  email: () => <div className="w-4 h-4 bg-green-600 rounded"></div>,
};

export const IdentityManagement: React.FC<IdentityManagementProps> = ({
  showAddButton = true,
}) => {
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadIdentities();
    }
  }, [user]);

  const loadIdentities = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.getUserIdentities();
      
      if (response.success && response.data) {
        setIdentities(response.data);
      } else {
        setError(response.error?.message || 'Failed to load identities');
      }
    } catch (err: any) {
      setError(formatAuthError(err.message || 'Failed to load identities'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkIdentity = async (identityId: string, provider: string) => {
    setUnlinkingId(identityId);
    
    try {
      const response = await authService.unlinkIdentity({ identityId });
      
      if (response.success) {
        await loadIdentities(); // Reload identities
        toast({
          title: "Identity unlinked",
          description: `Successfully unlinked your ${provider} account.`,
        });
      } else {
        toast({
          title: "Failed to unlink identity",
          description: response.error?.message || "There was an error unlinking the identity.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to unlink identity",
        description: formatAuthError(err.message || "There was an error unlinking the identity."),
        variant: "destructive",
      });
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleLinkNewIdentity = async (provider: string) => {
    try {
      const redirectURL = `${window.location.origin}/auth/callback?link=true`;
      
      const response = await authService.linkIdentity({
        provider: provider as any,
        options: {
          redirectTo: redirectURL,
        },
      });
      
      if (response.error) {
        toast({
          title: "Failed to link identity",
          description: response.error.message,
          variant: "destructive",
        });
      }
      // If successful, the redirect will happen automatically
    } catch (err: any) {
      toast({
        title: "Failed to link identity",
        description: formatAuthError(err.message || "There was an error linking the identity."),
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProviderDisplayName = (provider: string): string => {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  const canUnlink = (identity: UserIdentity): boolean => {
    // Don't allow unlinking if it's the only way to sign in
    const emailIdentities = identities.filter(i => i.provider === 'email');
    const oauthIdentities = identities.filter(i => i.provider !== 'email');
    
    if (identity.provider === 'email') {
      // Can unlink email if there are OAuth providers
      return oauthIdentities.length > 0;
    } else {
      // Can unlink OAuth if there's email or other OAuth providers
      return emailIdentities.length > 0 || oauthIdentities.length > 1;
    }
  };

  const renderIdentityCard = (identity: UserIdentity) => {
    const IconComponent = providerIcons[identity.provider] || providerIcons.email;
    const canUnlinkThis = canUnlink(identity);
    
    return (
      <Card key={identity.id} className="relative">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <IconComponent />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">
                    {getProviderDisplayName(identity.provider)}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Linked
                  </Badge>
                </div>
                {identity.email && (
                  <p className="text-sm text-muted-foreground">
                    {identity.email}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Linked on {formatDate(identity.created_at)}
                </p>
                {identity.last_sign_in_at && (
                  <p className="text-xs text-muted-foreground">
                    Last used: {formatDate(identity.last_sign_in_at)}
                  </p>
                )}
              </div>
            </div>

            {canUnlinkThis && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={unlinkingId === identity.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {unlinkingId === identity.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unlink className="w-4 h-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlink {getProviderDisplayName(identity.provider)}</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to unlink your {getProviderDisplayName(identity.provider)} account? 
                      You will no longer be able to sign in using this provider.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleUnlinkIdentity(identity.id, identity.provider)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Unlink
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">
              Loading your linked accounts...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Link2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Linked Accounts</CardTitle>
              <CardDescription>
                Manage your linked social accounts and sign-in methods
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Identities List */}
      {identities.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Your Linked Accounts</h3>
          
          <div className="space-y-3">
            {identities.map(renderIdentityCard)}
          </div>
        </div>
      )}

      {/* Add New Identity */}
      {showAddButton && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h4 className="font-medium">Link Additional Accounts</h4>
              <p className="text-sm text-muted-foreground">
                Add more sign-in methods to your account for convenience and security.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleLinkNewIdentity('google')}
                  className="justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Link Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleLinkNewIdentity('github')}
                  className="justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Link GitHub
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleLinkNewIdentity('facebook')}
                  className="justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Link Facebook
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleLinkNewIdentity('apple')}
                  className="justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Link Apple
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium">Security Notice</h4>
              <p className="text-sm text-muted-foreground">
                Linking multiple accounts provides backup sign-in methods and enhanced security. 
                Make sure to keep at least one sign-in method active at all times.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IdentityManagement;
