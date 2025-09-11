import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  MoreHorizontal, 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  Calendar,
  Eye,
  EyeOff,
  Copy,
  Shield
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
import type { DfnsPersonalAccessToken } from '@/types/dfns';

interface PersonalTokenListProps {
  tokens: DfnsPersonalAccessToken[];
  onTokenUpdated: () => void;
}

export function PersonalTokenList({ tokens, onTokenUpdated }: PersonalTokenListProps) {
  const [loading, setLoading] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleTokenAction = async (action: string, tokenId: string) => {
    try {
      setLoading(true);
      
      const dfnsService = await initializeDfnsService();
      const tokenService = dfnsService.getPersonalAccessTokenManagementService();
      
      switch (action) {
        case 'activate':
          await tokenService.activatePersonalAccessToken(tokenId);
          break;
        case 'deactivate':
          await tokenService.deactivatePersonalAccessToken(tokenId);
          break;
        case 'archive':
          await tokenService.archivePersonalAccessToken(tokenId);
          break;
        case 'update':
          // TODO: Implement update dialog
          console.log('Update token:', tokenId);
          break;
        default:
          console.log(`${action} token:`, tokenId);
      }
      
      toast({
        title: "Success",
        description: `Token ${action} completed successfully`,
      });
      
      onTokenUpdated();
    } catch (error: any) {
      console.error(`Error ${action} token:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} token: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTokenVisibility = (tokenId: string) => {
    const newVisible = new Set(visibleTokens);
    if (newVisible.has(tokenId)) {
      newVisible.delete(tokenId);
    } else {
      newVisible.add(tokenId);
    }
    setVisibleTokens(newVisible);
  };

  const copyTokenValue = (tokenValue: string) => {
    navigator.clipboard.writeText(tokenValue);
    toast({
      title: "Copied",
      description: "Token value copied to clipboard",
    });
  };

  const getTokenStatus = (token: DfnsPersonalAccessToken) => {
    if (token.isActive === false) return { status: 'Inactive', variant: 'destructive' as const };
    if (token.isActive) return { status: 'Active', variant: 'default' as const };
    return { status: 'Unknown', variant: 'secondary' as const };
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const maskToken = (token: string) => {
    if (token.length <= 8) return '••••••••';
    return token.slice(0, 4) + '••••' + token.slice(-4);
  };

  if (tokens.length === 0) {
    return (
      <div className="text-center py-8">
        <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No personal access tokens found</h3>
        <p className="text-muted-foreground mb-4">
          Create personal access tokens for API access and integrations
        </p>
        <Button 
          className="gap-2"
          onClick={() => handleTokenAction('create', '')}
        >
          <Plus className="h-4 w-4" />
          Create Token
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Personal Access Tokens</h3>
          <p className="text-sm text-muted-foreground">
            {tokens.length} token{tokens.length !== 1 ? 's' : ''} for API access
          </p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => handleTokenAction('create', '')}
        >
          <Plus className="h-4 w-4" />
          Create Token
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => {
              const { status, variant } = getTokenStatus(token);
              const isVisible = visibleTokens.has(token.tokenId);
              
              return (
                <TableRow key={token.tokenId}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-md bg-purple-100">
                        <Key className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">{token.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {token.externalId || 'No external ID'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {isVisible ? token.tokenId || 'Hidden' : maskToken(token.tokenId || '')}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTokenVisibility(token.tokenId)}
                        className="h-6 w-6 p-0"
                      >
                        {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      {isVisible && token.tokenId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyTokenValue(token.tokenId)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant}>{status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(token.dateCreated)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      N/A
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
                          onClick={() => navigator.clipboard.writeText(token.tokenId)}
                        >
                          Copy token ID
                        </DropdownMenuItem>
                        {token.tokenId && (
                          <DropdownMenuItem
                            onClick={() => copyTokenValue(token.tokenId)}
                            className="gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copy token value
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleTokenAction('update', token.tokenId)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit token
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleTokenAction('permissions', token.tokenId)}
                          className="gap-2"
                        >
                          <Shield className="h-4 w-4" />
                          Manage permissions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {token.isActive ? (
                          <DropdownMenuItem
                            onClick={() => handleTokenAction('deactivate', token.tokenId)}
                            className="gap-2 text-orange-600"
                          >
                            <EyeOff className="h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleTokenAction('activate', token.tokenId)}
                            className="gap-2 text-green-600"
                          >
                            <Eye className="h-4 w-4" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleTokenAction('archive', token.tokenId)}
                          className="gap-2 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Archive
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
    </div>
  );
}
