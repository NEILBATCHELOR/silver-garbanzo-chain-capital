/**
 * DFNS Personal Access Token List Component
 * 
 * Displays a table of Personal Access Tokens with actions
 */

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal,
  Eye,
  Edit,
  Power,
  PowerOff,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Key,
  Plus
} from 'lucide-react';
import type {
  PersonalAccessTokenResponse
} from '@/types/dfns/personal-access-token';
import { PatActionType } from '@/types/dfns/personal-access-token';

export interface DfnsPersonalAccessTokenListProps {
  tokens: PersonalAccessTokenResponse[];
  loading: boolean;
  onTokenAction: (action: PatActionType, tokenId?: string) => void;
  refreshKey?: number;
}

/**
 * Personal Access Token List with actions
 */
export default function DfnsPersonalAccessTokenList({
  tokens,
  loading,
  onTokenAction,
  refreshKey
}: DfnsPersonalAccessTokenListProps) {

  // ===== Computed Values =====
  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      // Sort by creation date, newest first
      return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
    });
  }, [tokens, refreshKey]);

  // ===== Helper Functions =====
  const getStatusBadge = (token: PersonalAccessTokenResponse) => {
    if (token.isActive) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Inactive
        </Badge>
      );
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getPermissionCount = (token: PersonalAccessTokenResponse) => {
    return token.permissionAssignments?.length || 0;
  };

  // ===== Action Handlers =====
  const handleAction = (action: PatActionType, tokenId: string) => {
    onTokenAction(action, tokenId);
  };

  // ===== Loading State =====
  if (loading && tokens.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading tokens...</p>
        </div>
      </div>
    );
  }

  // ===== Empty State =====
  if (tokens.length === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <Key className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No Personal Access Tokens</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            You haven't created any Personal Access Tokens yet. 
            Create your first token to start using the DFNS API.
          </p>
        </div>
        <Button 
          onClick={() => onTokenAction(PatActionType.Create)}
          className="mt-4"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Your First Token
        </Button>
      </div>
    );
  }

  // ===== Table Render =====
  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTokens.map((token) => (
              <TableRow key={token.tokenId}>
                {/* Name */}
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <div className="font-medium">{token.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {token.tokenId.substring(0, 8)}...
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  {getStatusBadge(token)}
                </TableCell>

                {/* Created Date */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm">{formatDate(token.dateCreated)}</div>
                    {token.linkedUserId && (
                      <div className="text-xs text-muted-foreground">
                        User: {token.linkedUserId.substring(0, 8)}...
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Permissions */}
                <TableCell>
                  <Badge variant="outline">
                    {getPermissionCount(token)} permission{getPermissionCount(token) !== 1 ? 's' : ''}
                  </Badge>
                </TableCell>

                {/* Organization */}
                <TableCell>
                  <div className="text-sm text-muted-foreground font-mono">
                    {token.orgId.substring(0, 8)}...
                  </div>
                </TableCell>

                {/* Actions */}
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
                        onClick={() => handleAction(PatActionType.View, token.tokenId)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={() => handleAction(PatActionType.Update, token.tokenId)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      {token.isActive ? (
                        <DropdownMenuItem
                          onClick={() => handleAction(PatActionType.Deactivate, token.tokenId)}
                          className="text-orange-600"
                        >
                          <PowerOff className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleAction(PatActionType.Activate, token.tokenId)}
                          className="text-green-600"
                        >
                          <Power className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem
                        onClick={() => handleAction(PatActionType.Archive, token.tokenId)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {tokens.length} token{tokens.length !== 1 ? 's' : ''}
        </div>
        {loading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Refreshing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
