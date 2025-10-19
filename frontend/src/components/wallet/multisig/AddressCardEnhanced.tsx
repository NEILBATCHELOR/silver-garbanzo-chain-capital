/**
 * Enhanced Address Card Component
 * Visually improved display of blockchain addresses with role permissions
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Copy, 
  Trash2, 
  Edit, 
  Check, 
  X,
  ExternalLink,
  Shield,
  Key,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ContractRoleType } from '@/services/user/contractRoles';
import type { RoleAddress } from '@/services/wallet/multiSig/RoleAddressService';
import { cn } from '@/utils/utils';

interface AddressCardEnhancedProps {
  address: RoleAddress;
  inheritedRoles: ContractRoleType[]; // Roles from role_contracts table
  onDelete?: (address: RoleAddress) => void;
  onEditRoles?: (address: RoleAddress, roles: ContractRoleType[]) => void;
  onViewContracts?: (address: RoleAddress) => void;
  className?: string;
}

export function AddressCardEnhanced({
  address,
  inheritedRoles,
  onDelete,
  onEditRoles,
  onViewContracts,
  className
}: AddressCardEnhancedProps) {
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Determine if this address has explicit roles or inherits all
  const hasExplicitRoles = address.contractRoles && address.contractRoles.length > 0;
  const displayRoles = hasExplicitRoles ? address.contractRoles : inheritedRoles;
  const isInheriting = !hasExplicitRoles;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address.address);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Address copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getBlockchainColor = (blockchain: string): string => {
    const colors: Record<string, string> = {
      ethereum: 'bg-blue-500',
      holesky: 'bg-purple-500',
      polygon: 'bg-violet-500',
      arbitrum: 'bg-cyan-500',
      optimism: 'bg-red-500',
      base: 'bg-blue-600',
    };
    return colors[blockchain.toLowerCase()] || 'bg-gray-500';
  };

  return (
    <Card className={cn('group hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Left: Blockchain & Address */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Blockchain Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="outline" 
                className={cn(
                  'font-semibold text-white border-none',
                  getBlockchainColor(address.blockchain)
                )}
              >
                <Key className="mr-1 h-3 w-3" />
                {address.blockchain.toUpperCase()}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {address.signingMethod === 'private_key' ? 'Software Key' : address.signingMethod}
              </Badge>
              {isInheriting && (
                <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Inherits All ({inheritedRoles.length})
                </Badge>
              )}
            </div>

            {/* Address Display */}
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-primary truncate flex-1 bg-muted/30 px-2 py-1 rounded">
                {address.address}
              </code>
            </div>

            {/* Created Date */}
            <p className="text-xs text-muted-foreground">
              Created {address.createdAt.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-start gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0"
              title="Copy address"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            
            {onEditRoles && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="h-8 w-8 p-0"
                title="Edit permissions"
              >
                {isEditMode ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Edit className="h-4 w-4" />
                )}
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(address)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Delete address"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Contract Roles Section */}
        <div className="space-y-3 pt-3 border-t">
          {/* Roles Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {isInheriting ? 'Inherited Permissions' : 'Explicit Permissions'}
              </span>
              <Badge variant="outline" className="text-xs">
                {displayRoles.length}
              </Badge>
            </div>
            
            {isInheriting && (
              <span className="text-xs text-muted-foreground">
                From role definition
              </span>
            )}
          </div>

          {/* Roles Display */}
          {displayRoles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {displayRoles.map((role) => (
                <Badge
                  key={role}
                  variant={isInheriting ? 'secondary' : 'default'}
                  className={cn(
                    'text-xs font-medium',
                    isInheriting && 'bg-green-50 text-green-700 border border-green-200'
                  )}
                >
                  {role}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              No contract permissions assigned
            </div>
          )}

          {/* Edit Mode Info */}
          {isEditMode && (
            <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-2">
              <p className="text-xs font-medium">Edit Mode:</p>
              <p className="text-xs text-muted-foreground">
                Click "Edit Permissions" below to modify which contract roles this specific address can execute.
                Leave empty to inherit all roles from the main role definition.
              </p>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        {onViewContracts && (
          <div className="pt-3 mt-3 border-t">
            <Button
              variant="link"
              size="sm"
              onClick={() => onViewContracts(address)}
              className="h-auto p-0 text-xs"
            >
              <ExternalLink className="mr-1.5 h-3 w-3" />
              View Assigned Smart Contracts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
