/**
 * Contract Role Inline Editor
 * Allows editing contract roles for a specific blockchain address
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Save, 
  X, 
  Shield, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  CONTRACT_ROLE_CATEGORIES,
  CONTRACT_ROLE_DESCRIPTIONS,
  ContractRoleType 
} from '@/services/user/contractRoles';
import type { RoleAddress } from '@/services/wallet/multiSig/RoleAddressService';
import { roleAddressService } from '@/services/wallet/multiSig/RoleAddressService';
import { cn } from '@/utils/utils';

interface ContractRoleInlineEditorProps {
  address: RoleAddress;
  inheritedRoles: ContractRoleType[]; // Roles from role_contracts table
  onSave: (updatedAddress: RoleAddress) => void;
  onCancel: () => void;
}

export function ContractRoleInlineEditor({
  address,
  inheritedRoles,
  onSave,
  onCancel
}: ContractRoleInlineEditorProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Mode: 'inherit' or 'explicit'
  const [mode, setMode] = useState<'inherit' | 'explicit'>(
    address.contractRoles && address.contractRoles.length > 0 ? 'explicit' : 'inherit'
  );
  
  // Selected roles (only used in explicit mode)
  const [selectedRoles, setSelectedRoles] = useState<ContractRoleType[]>(
    (address.contractRoles || []) as ContractRoleType[]
  );

  useEffect(() => {
    // Update selected roles if address changes
    if (address.contractRoles && address.contractRoles.length > 0) {
      // Cast string[] to ContractRoleType[]
      setSelectedRoles(address.contractRoles as ContractRoleType[]);
      setMode('explicit');
    } else {
      setSelectedRoles([]);
      setMode('inherit');
    }
  }, [address]);

  const toggleRole = (role: ContractRoleType) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If inherit mode, save empty array (inherits all)
      // If explicit mode, save selected roles
      const rolesToSave = mode === 'inherit' ? [] : selectedRoles;

      // Update via service - use address ID, not roleId and blockchain
      await roleAddressService.updateRoleAddress(
        address.id, // Use address ID directly
        {
          contractRoles: rolesToSave
        }
      );

      toast({
        title: 'Permissions updated',
        description: mode === 'inherit' 
          ? `Address now inherits all ${inheritedRoles.length} role(s)`
          : `Address has ${selectedRoles.length} explicit permission(s)`,
      });

      // Notify parent with updated address
      onSave({
        ...address,
        contractRoles: rolesToSave
      });

    } catch (error: any) {
      console.error('Failed to update permissions:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update permissions',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const displayRoles = mode === 'inherit' ? inheritedRoles : selectedRoles;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Edit Contract Permissions</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || (mode === 'explicit' && selectedRoles.length === 0)}
          >
            <Save className="mr-1 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Permission Mode</Label>
        
        <div className="space-y-2">
          {/* Inherit Mode */}
          <div 
            className={cn(
              'flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all',
              mode === 'inherit' 
                ? 'border-green-500 bg-green-50/50' 
                : 'border-border hover:border-green-300'
            )}
            onClick={() => setMode('inherit')}
          >
            <Checkbox
              checked={mode === 'inherit'}
              onCheckedChange={() => setMode('inherit')}
              className="mt-0.5"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <Label className="font-medium cursor-pointer">
                  Inherit All Permissions
                </Label>
                <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Recommended
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This address will automatically have all permissions defined in the role ({inheritedRoles.length} total).
                Changes to the role's permissions will automatically apply to this address.
              </p>
              {mode === 'inherit' && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {inheritedRoles.map(role => (
                    <Badge key={role} variant="secondary" className="text-xs bg-green-100 text-green-700">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Explicit Mode */}
          <div 
            className={cn(
              'flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all',
              mode === 'explicit' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => setMode('explicit')}
          >
            <Checkbox
              checked={mode === 'explicit'}
              onCheckedChange={() => setMode('explicit')}
              className="mt-0.5"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <Label className="font-medium cursor-pointer">
                  Select Specific Permissions
                </Label>
                <Badge variant="outline" className="text-xs">
                  Advanced
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Choose exactly which permissions this address should have. This address will NOT automatically
                inherit changes to the role's permissions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Selection (only in explicit mode) */}
      {mode === 'explicit' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Select Permissions</Label>
            <Badge variant="outline" className="text-xs">
              {selectedRoles.length} selected
            </Badge>
          </div>

          {selectedRoles.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                You must select at least one permission for explicit mode
              </AlertDescription>
            </Alert>
          )}

          <Accordion type="multiple" className="w-full">
            {Object.entries(CONTRACT_ROLE_CATEGORIES).map(([category, roles]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="text-sm font-medium">
                  {category}
                  {selectedRoles.some(r => roles.includes(r)) && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedRoles.filter(r => roles.includes(r)).length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-2">
                    {roles.map((role) => {
                      const isInherited = inheritedRoles.includes(role);
                      return (
                        <div key={role} className="flex items-start space-x-2">
                          <Checkbox
                            id={`role-${role}`}
                            checked={selectedRoles.includes(role)}
                            onCheckedChange={() => toggleRole(role)}
                          />
                          <div className="grid gap-1 leading-none flex-1">
                            <label
                              htmlFor={`role-${role}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                            >
                              {role}
                              {isInherited && (
                                <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                                  Inherited
                                </Badge>
                              )}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {CONTRACT_ROLE_DESCRIPTIONS[role]}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Preview */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p className="text-xs font-medium">Preview:</p>
          <p className="text-xs text-muted-foreground">
            This address will be able to execute:
          </p>
          <div className="flex flex-wrap gap-1">
            {displayRoles.map(role => (
              <Badge 
                key={role} 
                variant={mode === 'inherit' ? 'secondary' : 'default'}
                className={cn(
                  'text-xs',
                  mode === 'inherit' && 'bg-green-100 text-green-700 border border-green-200'
                )}
              >
                {role}
              </Badge>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
