import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  ChevronDown,
  Wallet, 
  Users, 
  Key, 
  ArrowRightLeft,
  Settings,
  Shield
} from 'lucide-react';

// Import dialog components
import { WalletCreationWizard } from './wallet-creation-wizard';
import { UserInvitationDialog } from './user-invitation-dialog';
import { PermissionAssignmentDialog } from './permission-assignment-dialog';
import { TransactionBroadcastDialog } from './transaction-broadcast-dialog';

interface QuickActionsDropdownProps {
  onActionCompleted?: (action: string) => void;
}

/**
 * Quick Actions Dropdown
 * Provides quick access to common DFNS operations
 */
export function QuickActionsDropdown({ onActionCompleted }: QuickActionsDropdownProps) {
  const handleActionComplete = (action: string) => {
    if (onActionCompleted) {
      onActionCompleted(action);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Quick Create
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Wallet Creation */}
        <WalletCreationWizard onWalletCreated={() => handleActionComplete('wallet-created')}>
          <DropdownMenuItem className="cursor-pointer gap-2" onSelect={(e) => e.preventDefault()}>
            <Wallet className="h-4 w-4" />
            <span>Create Wallet</span>
          </DropdownMenuItem>
        </WalletCreationWizard>

        {/* User Invitation */}
        <UserInvitationDialog onUserInvited={() => handleActionComplete('user-invited')}>
          <DropdownMenuItem className="cursor-pointer gap-2" onSelect={(e) => e.preventDefault()}>
            <Users className="h-4 w-4" />
            <span>Add Organization User</span>
          </DropdownMenuItem>
        </UserInvitationDialog>

        <DropdownMenuSeparator />

        {/* Permission Assignment */}
        <PermissionAssignmentDialog onPermissionAssigned={() => handleActionComplete('permission-assigned')}>
          <DropdownMenuItem className="cursor-pointer gap-2" onSelect={(e) => e.preventDefault()}>
            <Key className="h-4 w-4" />
            <span>Assign Permissions</span>
          </DropdownMenuItem>
        </PermissionAssignmentDialog>

        {/* Transaction Broadcast */}
        <TransactionBroadcastDialog onTransactionBroadcast={() => handleActionComplete('transaction-broadcast')}>
          <DropdownMenuItem className="cursor-pointer gap-2" onSelect={(e) => e.preventDefault()}>
            <ArrowRightLeft className="h-4 w-4" />
            <span>Broadcast Transaction</span>
          </DropdownMenuItem>
        </TransactionBroadcastDialog>

        <DropdownMenuSeparator />
        
        {/* Additional Actions */}
        <DropdownMenuItem className="gap-2">
          <Shield className="h-4 w-4" />
          <span>Create Policy</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="gap-2">
          <Settings className="h-4 w-4" />
          <span>Configure Webhook</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
