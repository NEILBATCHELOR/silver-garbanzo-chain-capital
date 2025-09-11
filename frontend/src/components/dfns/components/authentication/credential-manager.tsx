import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  Shield, 
  Calendar,
  Smartphone,
  Monitor,
  Key,
  Fingerprint,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { DfnsCredential } from '@/types/dfns';

interface CredentialManagerProps {
  credentials: DfnsCredential[];
  onCredentialUpdated: () => void;
}

export function CredentialManager({ credentials, onCredentialUpdated }: CredentialManagerProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCredentialAction = async (action: string, credentialId: string) => {
    try {
      setLoading(true);
      
      const dfnsService = await initializeDfnsService();
      const credentialService = dfnsService.getCredentialManagementService();
      
      switch (action) {
        case 'delete':
          await credentialService.deactivateCredential(credentialId);
          break;
        case 'view':
          // TODO: Implement credential details view
          console.log('View credential:', credentialId);
          break;
        case 'create':
          // TODO: Implement credential creation flow
          console.log('Create credential action triggered');
          break;
        default:
          console.log(`${action} credential:`, credentialId);
      }
      
      toast({
        title: "Success",
        description: `Credential ${action} completed successfully`,
      });
      
      onCredentialUpdated();
    } catch (error: any) {
      console.error(`Error ${action} credential:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} credential: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCredentialIcon = (kind: string) => {
    switch (kind?.toLowerCase()) {
      case 'passkey':
        return <Fingerprint className="h-4 w-4 text-blue-600" />;
      case 'securitykey':
        return <Key className="h-4 w-4 text-green-600" />;
      case 'platform':
        return <Monitor className="h-4 w-4 text-purple-600" />;
      case 'cross-platform':
        return <Smartphone className="h-4 w-4 text-orange-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCredentialStatus = (credential: DfnsCredential) => {
    if (credential.status === 'Inactive') return { status: 'Inactive', variant: 'destructive' as const };
    if (credential.status === 'Active') return { status: 'Active', variant: 'default' as const };
    return { status: 'Unknown', variant: 'secondary' as const };
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getCredentialTypeName = (kind: string) => {
    switch (kind?.toLowerCase()) {
      case 'passkey':
        return 'Passkey';
      case 'securitykey':
        return 'Security Key';
      case 'platform':
        return 'Platform Authenticator';
      case 'cross-platform':
        return 'Cross-Platform Key';
      default:
        return kind || 'Unknown';
    }
  };

  if (credentials.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No credentials found</h3>
        <p className="text-muted-foreground mb-4">
          Add WebAuthn credentials for secure authentication
        </p>
        <Button 
          className="gap-2"
          onClick={() => handleCredentialAction('create', '')}
        >
          <Plus className="h-4 w-4" />
          Add Credential
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">WebAuthn Credentials</h3>
          <p className="text-sm text-muted-foreground">
            {credentials.length} credential{credentials.length !== 1 ? 's' : ''} for secure authentication
          </p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => handleCredentialAction('create', '')}
        >
          <Plus className="h-4 w-4" />
          Add Credential
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Credential</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credentials.map((credential) => {
              const { status, variant } = getCredentialStatus(credential);
              
              return (
                <TableRow key={credential.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-md bg-blue-100">
                        {getCredentialIcon(credential.kind)}
                      </div>
                      <div>
                        <div className="font-medium">{credential.name || 'Unnamed Credential'}</div>
                        <div className="text-sm text-muted-foreground">
                          {credential.credential_id || credential.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {getCredentialTypeName(credential.kind)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant}>{status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(credential.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(credential.lastUsed)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => navigator.clipboard.writeText(credential.id)}
                        >
                          Copy credential ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleCredentialAction('view', credential.id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleCredentialAction('delete', credential.id)}
                          className="gap-2 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove credential
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">About WebAuthn Credentials</h4>
            <p className="text-sm text-blue-700 mt-1">
              WebAuthn credentials provide secure, passwordless authentication using biometrics, 
              security keys, or platform authenticators. These credentials are tied to your device 
              and cannot be phished or stolen like traditional passwords.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
