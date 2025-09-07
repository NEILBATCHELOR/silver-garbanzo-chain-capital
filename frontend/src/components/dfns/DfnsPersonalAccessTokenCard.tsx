/**
 * DFNS Personal Access Token Card Component
 * 
 * Displays detailed information about a Personal Access Token
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Key,
  Calendar,
  User,
  Building,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Power,
  PowerOff,
  Edit,
  Trash2,
  Copy
} from 'lucide-react';
import type {
  PersonalAccessTokenResponse
} from '@/types/dfns/personal-access-token';
import { PatActionType } from '@/types/dfns/personal-access-token';

export interface DfnsPersonalAccessTokenCardProps {
  token: PersonalAccessTokenResponse;
  onAction: (action: PatActionType, tokenId: string) => void;
}

/**
 * Detailed Personal Access Token information card
 */
export default function DfnsPersonalAccessTokenCard({
  token,
  onAction
}: DfnsPersonalAccessTokenCardProps) {
  const [copied, setCopied] = useState(false);

  // ===== Helper Functions =====
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusInfo = () => {
    if (token.isActive) {
      return {
        badge: (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        ),
        description: 'This token is active and can be used for API authentication'
      };
    } else {
      return {
        badge: (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        ),
        description: 'This token is inactive and cannot be used for authentication'
      };
    }
  };

  const copyTokenId = async () => {
    try {
      await navigator.clipboard.writeText(token.tokenId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy token ID:', error);
    }
  };

  const handleAction = (action: PatActionType) => {
    onAction(action, token.tokenId);
  };

  const statusInfo = getStatusInfo();

  // ===== Render =====
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{token.name}</h2>
            {statusInfo.badge}
          </div>
          <p className="text-muted-foreground">{statusInfo.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction(PatActionType.Update)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          
          {token.isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction(PatActionType.Deactivate)}
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <PowerOff className="w-4 h-4 mr-2" />
              Deactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction(PatActionType.Activate)}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Power className="w-4 h-4 mr-2" />
              Activate
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Archive
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive Personal Access Token</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to archive "{token.name}"? This action cannot be undone and 
                  the token will no longer be usable for API authentication.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleAction(PatActionType.Archive)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Archive Token
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      {/* Token Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="w-5 h-5" />
              Token Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Token ID</div>
              <div className="flex items-center justify-between">
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {token.tokenId}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyTokenId}
                  className="h-6 w-6 p-0"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Credential ID</div>
              <code className="text-sm bg-muted px-2 py-1 rounded font-mono block">
                {token.credId}
              </code>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Kind</div>
              <Badge variant="outline">{token.kind}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div className="text-sm">{formatDate(token.dateCreated)}</div>
            </div>

            {/* Additional timestamps could be added here if available */}
          </CardContent>
        </Card>

        {/* Associated Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Associated Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Linked User</div>
              <code className="text-sm bg-muted px-2 py-1 rounded font-mono block">
                {token.linkedUserId}
              </code>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Linked Application</div>
              <code className="text-sm bg-muted px-2 py-1 rounded font-mono block">
                {token.linkedAppId}
              </code>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Organization</div>
              <code className="text-sm bg-muted px-2 py-1 rounded font-mono block">
                {token.orgId}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {token.permissionAssignments && token.permissionAssignments.length > 0 ? (
              <div className="space-y-3">
                {token.permissionAssignments.map((permission, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Permission #{index + 1}</div>
                      <Badge variant="outline" className="text-xs">
                        {permission.identityKind}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: <code>{permission.permissionId}</code>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Assigned: {formatDate(permission.assignedAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No permissions assigned</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Public Key Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="w-5 h-5" />
            Public Key
          </CardTitle>
          <CardDescription>
            The public key associated with this token for cryptographic verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Public Key</div>
            <textarea
              value={token.publicKey}
              readOnly
              className="w-full h-32 p-3 text-xs font-mono bg-muted border rounded-md resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
