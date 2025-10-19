/**
 * Bulk Address Operations Component
 * Allows selecting multiple addresses and performing batch operations
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Trash2, 
  Download,
  Copy,
  CheckSquare,
  Square,
  MoreVertical,
  AlertCircle,
  Loader2,
  Shield
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ContractRoleType } from '@/services/user/contractRoles';
import type { RoleAddress } from '@/services/wallet/multiSig/RoleAddressService';
import { roleAddressService } from '@/services/wallet/multiSig/RoleAddressService';
import { AddressCardEnhanced } from './AddressCardEnhanced';

interface BulkAddressOperationsProps {
  addresses: RoleAddress[];
  inheritedRoles: ContractRoleType[];
  onDelete?: (addresses: RoleAddress[]) => void;
  onEditRoles?: (addresses: RoleAddress[], roles: ContractRoleType[]) => void;
  onViewContracts?: (address: RoleAddress) => void;
  onRefresh?: () => void;
  className?: string;
}

export function BulkAddressOperations({
  addresses,
  inheritedRoles,
  onDelete,
  onEditRoles,
  onViewContracts,
  onRefresh,
  className
}: BulkAddressOperationsProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get selected addresses
  const selectedAddresses = useMemo(() => {
    return addresses.filter(a => selectedIds.has(a.id));
  }, [addresses, selectedIds]);

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === addresses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(addresses.map(a => a.id)));
    }
  };

  // Toggle individual address
  const toggleAddress = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Copy selected addresses
  const handleCopyAddresses = async () => {
    const addressList = selectedAddresses
      .map(a => `${a.blockchain}: ${a.address}`)
      .join('\n');
    
    await navigator.clipboard.writeText(addressList);
    toast({
      title: 'Copied!',
      description: `${selectedAddresses.length} addresses copied to clipboard`,
    });
  };

  // Export selected addresses
  const handleExportAddresses = () => {
    const data = selectedAddresses.map(a => ({
      blockchain: a.blockchain,
      address: a.address,
      signingMethod: a.signingMethod,
      contractRoles: a.contractRoles || [],
      createdAt: a.createdAt.toISOString()
    }));

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `addresses-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported!',
      description: `${selectedAddresses.length} addresses exported`,
    });
  };

  // Delete selected addresses
  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      // Delete via service
      for (const address of selectedAddresses) {
        await roleAddressService.deleteRoleAddress(address.id);
      }

      toast({
        title: 'Addresses deleted',
        description: `${selectedAddresses.length} addresses deleted successfully`,
      });

      // Clear selection
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);

      // Notify parent
      onDelete?.(selectedAddresses);
      onRefresh?.();

    } catch (error: any) {
      console.error('Failed to delete addresses:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete addresses',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const inheriting = selectedAddresses.filter(
      a => !a.contractRoles || a.contractRoles.length === 0
    ).length;
    const explicit = selectedAddresses.length - inheriting;

    return { inheriting, explicit };
  }, [selectedAddresses]);

  return (
    <>
      <div className={className}>
        {/* Bulk Actions Header */}
        <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedIds.size === addresses.length && addresses.length > 0}
              onCheckedChange={toggleSelectAll}
              className="h-5 w-5"
            />
            <Label className="text-sm font-medium cursor-pointer" onClick={toggleSelectAll}>
              {selectedIds.size === addresses.length && addresses.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </Label>
            {selectedIds.size > 0 && (
              <>
                <div className="h-4 w-px bg-border" />
                <Badge variant="secondary" className="font-semibold">
                  {selectedIds.size} Selected
                </Badge>
                {stats.inheriting > 0 && (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                    {stats.inheriting} Inheriting
                  </Badge>
                )}
                {stats.explicit > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {stats.explicit} Explicit
                  </Badge>
                )}
              </>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAddresses}
              >
                <Copy className="mr-1 h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAddresses}
              >
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toast({ title: 'Coming soon' })}>
                    <Shield className="mr-2 h-4 w-4" />
                    Apply Permissions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Address List with Selection */}
        <div className="space-y-3">
          {addresses.map(address => (
            <div key={address.id} className="relative">
              {/* Selection Checkbox Overlay */}
              <div className="absolute top-3 left-3 z-10">
                <Checkbox
                  checked={selectedIds.has(address.id)}
                  onCheckedChange={() => toggleAddress(address.id)}
                  className="h-5 w-5 bg-background border-2"
                />
              </div>

              {/* Address Card */}
              <div className={selectedIds.has(address.id) ? 'ring-2 ring-primary rounded-lg' : ''}>
                <AddressCardEnhanced
                  address={address}
                  inheritedRoles={inheritedRoles}
                  onDelete={onDelete ? (addr) => onDelete([addr]) : undefined}
                  onViewContracts={onViewContracts}
                  className="ml-10"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {addresses.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No addresses to display
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedAddresses.length} Addresses?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete {selectedAddresses.length} blockchain address{selectedAddresses.length !== 1 ? 'es' : ''}?
              </p>
              
              <div className="max-h-[200px] overflow-y-auto space-y-1 p-2 bg-muted/50 rounded">
                {selectedAddresses.map(addr => (
                  <code key={addr.id} className="text-xs block">
                    {addr.blockchain}: {addr.address}
                  </code>
                ))}
              </div>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Warning:</strong> This action cannot be undone. All addresses and their private keys will be permanently deleted from the KeyVault.
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedAddresses.length} Address{selectedAddresses.length !== 1 ? 'es' : ''}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
